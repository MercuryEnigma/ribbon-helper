import { describe, expect, it } from 'vitest'
import { rsConfig } from './rsBattles'
import type { Gen3MoveDex, Gen3Setdex } from './gen3calc'
import battleTrainers from '../data/battle-facilities/rs/battle_trainers_rs.json'
import moves from '../data/battle-facilities/rs/moves_rs.json'
import setdexLvl50 from '../data/battle-facilities/rs/setdex_lvl50_rs.json'
import setdexLvl100 from '../data/battle-facilities/rs/setdex_lvl100_rs.json'
import trainerPokemonLvl50 from '../data/battle-facilities/rs/trainer_pokemon_lvl50_rs.json'
import trainerPokemonLvl100 from '../data/battle-facilities/rs/trainer_pokemon_lvl100_rs.json'

const SETDEX_BY_MODE = {
  lvl50: setdexLvl50 as Gen3Setdex,
  lvl100: setdexLvl100 as Gen3Setdex,
}

const ROSTERS_BY_MODE = {
  lvl50: trainerPokemonLvl50 as Record<string, string[]>,
  lvl100: trainerPokemonLvl100 as Record<string, string[]>,
}

function countSets(setdex: Gen3Setdex): number {
  return Object.values(setdex).reduce((total, sets) => total + Object.keys(sets).length, 0)
}

describe('Ruby/Sapphire Battle Tower config', () => {
  it('has exactly the two Singles modes', () => {
    expect(rsConfig.modes.map(mode => mode.id)).toEqual(['lvl50', 'lvl100'])
    expect(rsConfig.modes.map(mode => mode.defaultLevel)).toEqual([50, 100])
    expect(rsConfig.modes.every(mode => mode.format === 'singles')).toBe(true)
  })

  it('uses the R/S trainer progression and listed IVs', () => {
    expect(rsConfig.getBattleRange(1)).toBe('1-6')
    expect(rsConfig.getBattleRange(7)).toBe('7')
    expect(rsConfig.getBattleRange(42)).toBe('42')
    expect(rsConfig.getBattleRange(49)).toBe('49+')

    expect(rsConfig.getTrainersForBattle(1).map(trainer => trainer.number)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    )
    expect(rsConfig.getTrainersForBattle(7).map(trainer => trainer.number)).toEqual(
      Array.from({ length: 10 }, (_, index) => index + 21),
    )
    expect(rsConfig.getTrainersForBattle(42).map(trainer => trainer.number)).toEqual(
      Array.from({ length: 10 }, (_, index) => index + 71),
    )
    expect(rsConfig.getTrainersForBattle(49)).toHaveLength(30)

    expect(rsConfig.getIVsForTrainer(battleTrainers[0])).toBe(6)
    expect(rsConfig.getIVsForTrainer(battleTrainers[20])).toBe(9)
    expect(rsConfig.getIVsForTrainer(battleTrainers[70])).toBe(31)
  })

  it('keeps set labels scoped to their mode and preserves listed natures', () => {
    const p1 = rsConfig.buildP1Options(null, [], ['Latios (RS Singles)'])[0]
    const side = rsConfig.defaultSideState()

    const lvl50 = rsConfig.runCalc({
      modeId: 'lvl50',
      p1,
      p2Label: 'Sceptile-1',
      p1Level: 50,
      p2Level: 50,
      p2Ivs: 31,
      p2Ability: '',
      weather: '',
      p1Side: side,
      p2Side: side,
      format: 'singles',
    })
    const lvl100 = rsConfig.runCalc({
      modeId: 'lvl100',
      p1,
      p2Label: 'Sceptile-1',
      p1Level: 100,
      p2Level: 100,
      p2Ivs: 31,
      p2Ability: '',
      weather: '',
      p1Side: side,
      p2Side: side,
      format: 'singles',
    })

    expect(lvl50?.p2Summary.nature).toBe('Docile')
    expect(lvl100?.p2Summary.nature).toBe('Relaxed')
  })

  it('recalculates with a selected opponent nature', () => {
    const p1 = rsConfig.buildP1Options(null, [], ['Latios (RS Singles)'])[0]
    const side = rsConfig.defaultSideState()
    const result = rsConfig.runCalc({
      modeId: 'lvl50',
      p1,
      p2Label: 'Sceptile-1',
      p1Level: 50,
      p2Level: 50,
      p2Ivs: 31,
      p2Ability: '',
      p2Nature: 'Timid',
      weather: '',
      p1Side: side,
      p2Side: side,
      format: 'singles',
    })

    expect(result?.p2Summary.nature).toBe('Timid')
  })

  it.each(['lvl50', 'lvl100'] as const)('has complete %s set and roster data', modeId => {
    const setdex = SETDEX_BY_MODE[modeId]
    const rosters = ROSTERS_BY_MODE[modeId]
    const moveDex = moves as Gen3MoveDex
    const labels = new Set(Object.values(setdex).flatMap(sets => Object.keys(sets)))

    expect(countSets(setdex)).toBe(300)
    expect(Object.keys(rosters)).toHaveLength(100)

    for (const roster of Object.values(rosters)) {
      for (const label of roster) expect(labels.has(label)).toBe(true)
    }

    for (const sets of Object.values(setdex)) {
      for (const set of Object.values(sets)) {
        for (const move of set.moves.filter(Boolean)) expect(moveDex[move]).toBeDefined()
      }
    }
  })
})
