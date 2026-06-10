import { describe, expect, it } from 'vitest'
import { dpConfig } from './dpBattles'
import { gen4Config } from './gen4Battles'
import type { Gen4MoveDex, Gen4Setdex } from './gen4calc'
import battleTrainers from '../data/battle-facilities/dp/battle_trainers_dp.json'
import moves from '../data/battle-facilities/dp/moves_dp.json'
import setdex from '../data/battle-facilities/dp/setdex_dp.json'
import partnerTeams from '../data/battle-facilities/dp/setteam_dp_partners.json'
import trainerPokemon from '../data/battle-facilities/dp/trainer_pokemon_dp.json'

const DP_SETDEX = setdex as Gen4Setdex

function countSets(data: Gen4Setdex): number {
  return Object.values(data).reduce((total, sets) => total + Object.keys(sets).length, 0)
}

describe('Diamond/Pearl Battle Tower config', () => {
  it('has the four requested level 50 modes', () => {
    expect(dpConfig.modes.map(mode => mode.id)).toEqual(['singles', 'doubles', 'multi-npc', 'pair'])
    expect(dpConfig.modes.map(mode => mode.defaultLevel)).toEqual([50, 50, 50, 50])
    expect(dpConfig.modes.map(mode => mode.maxLevel)).toEqual([50, 50, 50, 50])
    expect(dpConfig.modes.map(mode => mode.format)).toEqual(['singles', 'doubles', 'doubles', 'doubles'])
  })

  it('reuses player recommendations and supplies Diamond/Pearl Mira sets', () => {
    expect(dpConfig.modes[0].teams).toEqual(gen4Config.modes[0].teams)

    const miraTeam = dpConfig.modes
      .find(mode => mode.id === 'multi-npc')
      ?.teams.find(team => team.name === "Mira's Team")
    const partnerCount = countSets(partnerTeams as Gen4Setdex)

    expect(partnerCount).toBe(56)
    expect(miraTeam?.pokemon).toHaveLength(56)
    expect(miraTeam?.pokemon.every(label => label.endsWith(' (Mira DP)'))).toBe(true)
    expect(dpConfig.buildP1Options(null, [], miraTeam?.pokemon ?? [])).toHaveLength(56)
  })

  it('uses exact Diamond/Pearl progression and Singles-only Palmer battles', () => {
    expect(dpConfig.getBattleRange(1)).toBe('1-6')
    expect(dpConfig.getBattleRange(7)).toBe('7')
    expect(dpConfig.getBattleRange(21)).toBe('21')
    expect(dpConfig.getBattleRange(49)).toBe('49')
    expect(dpConfig.getBattleRange(50)).toBe('50+')

    expect(dpConfig.getTrainersForBattle(1, 'singles')).toHaveLength(100)
    expect(dpConfig.getTrainersForBattle(7, 'singles')).toHaveLength(20)
    expect(dpConfig.getTrainersForBattle(21, 'singles').map(trainer => trainer.name))
      .toEqual(['Palmer (Silver)'])
    expect(dpConfig.getTrainersForBattle(21, 'doubles')).toHaveLength(20)
    expect(dpConfig.getTrainersForBattle(49, 'singles').map(trainer => trainer.name))
      .toEqual(['Palmer (Gold)'])
    expect(dpConfig.getTrainersForBattle(49, 'pair')).toHaveLength(80)
    expect(dpConfig.getTrainersForBattle(50, 'multi-npc')).toHaveLength(100)
  })

  it('uses the code-backed trainer IV tiers', () => {
    const byNumber = new Map(battleTrainers.map(trainer => [trainer.number, trainer]))
    for (const [number, ivs] of [
      [1, 3], [101, 6], [121, 9], [141, 12],
      [161, 15], [181, 18], [201, 21], [221, 31], [9001, 31],
    ]) {
      expect(dpConfig.getIVsForTrainer(byNumber.get(number) ?? null)).toBe(ivs)
    }
  })

  it('contains complete set, roster, and move data', () => {
    const moveDex = moves as Gen4MoveDex
    const labels = new Set(Object.values(DP_SETDEX).flatMap(sets => Object.keys(sets)))
    const ordinaryLabels = [...labels].filter(label => !label.includes('(Palmer '))

    expect(ordinaryLabels).toHaveLength(950)
    expect(countSets(DP_SETDEX)).toBe(956)
    expect(battleTrainers).toHaveLength(302)
    expect(Object.keys(trainerPokemon)).toHaveLength(302)
    expect(labels).toContain('Sceptile-4')
    expect(labels).toContain('Bulbasaur')

    for (const roster of Object.values(trainerPokemon)) {
      for (const label of roster) expect(labels.has(label)).toBe(true)
    }

    for (const sets of Object.values(DP_SETDEX)) {
      for (const set of Object.values(sets)) {
        for (const move of set.moves.filter(Boolean)) expect(moveDex[move]).toBeDefined()
      }
    }
  })

  it('recalculates stats, speed, and damage with a selected opponent nature', () => {
    const p1 = dpConfig.buildP1Options(null, [], ['Garchomp (Singles)'])[0]
    const p1Side = dpConfig.defaultSideState()
    const p2Side = dpConfig.defaultSideState()
    const common = {
      modeId: 'singles',
      p1,
      p2Label: 'Sceptile-4',
      p1Level: 50,
      p2Level: 50,
      p2Ivs: 31,
      p2Ability: '',
      weather: '',
      p1Side,
      p2Side,
      format: 'singles' as const,
    }

    const listed = dpConfig.runCalc(common)
    const adamant = dpConfig.runCalc({ ...common, p2Nature: 'Adamant' })

    expect(listed?.p2Summary.nature).toBe('Jolly')
    expect(adamant?.p2Summary.nature).toBe('Adamant')
    expect(adamant?.p2Summary.stats.atk).toBeGreaterThan(listed?.p2Summary.stats.atk ?? 0)
    expect(adamant?.p2Summary.speed).toBeLessThan(listed?.p2Summary.speed ?? 0)
    expect(adamant?.p2Results[0].maxDamage).toBeGreaterThan(listed?.p2Results[0].maxDamage ?? 0)
  })

  it('supports selecting either Gen 4 ability', () => {
    const p1 = dpConfig.buildP1Options(null, [], ['Garchomp (Singles)'])[0]
    const side = dpConfig.defaultSideState()
    const result = dpConfig.runCalc({
      modeId: 'singles',
      p1,
      p2Label: 'Happiny',
      p1Level: 50,
      p2Level: 50,
      p2Ivs: 31,
      p2Ability: 'Serene Grace',
      weather: '',
      p1Side: side,
      p2Side: side,
      format: 'singles',
    })

    expect(result?.p2Summary.abilities).toEqual(['Natural Cure', 'Serene Grace'])
    expect(result?.p2Summary.ability).toBe('Serene Grace')
  })

  it('preserves the existing Platinum/HGSS configuration', () => {
    expect(gen4Config.title).toBe('Platinum / HGSS - Battle Tower')
    expect(gen4Config.opponentNatureOptions).toBeUndefined()
    expect(gen4Config.getTrainersForBattle(21, 'singles').map(trainer => trainer.name))
      .toEqual(['Palmer (Silver)'])
  })
})
