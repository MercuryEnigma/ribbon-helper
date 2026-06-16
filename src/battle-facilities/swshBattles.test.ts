import { describe, expect, it } from 'vitest'
import { swshConfig } from './swshBattles'
import type { ModernMoveDex, ModernSetdex } from './swshCalc'
import battleTrainers from '../data/battle-facilities/swsh/battle_trainers_swsh.json'
import moves from '../data/battle-facilities/swsh/moves_swsh.json'
import setdex from '../data/battle-facilities/swsh/setdex_swsh.json'
import teamData from '../data/battle-facilities/swsh/setteam_swsh.json'
import trainerPokemon from '../data/battle-facilities/swsh/trainer_pokemon_swsh.json'

const SWSH_SETDEX = setdex as ModernSetdex

function countSets(data: ModernSetdex): number {
  return Object.values(data).reduce((total, sets) => total + Object.keys(sets).length, 0)
}

function ivsFor(label: string): number {
  return swshConfig.getIVsForPokemon?.({
    modeId: 'singles',
    battleNum: 1,
    trainer: null,
    pokemonLabel: label,
  }) ?? 0
}

describe('Sword/Shield Battle Tower config', () => {
  it('has exactly the two requested level 50 modes', () => {
    expect(swshConfig.title).toBe('Sword / Shield - Battle Tower')
    expect(swshConfig.modes.map(mode => mode.id)).toEqual(['singles', 'doubles'])
    expect(swshConfig.modes.map(mode => mode.defaultLevel)).toEqual([50, 50])
    expect(swshConfig.modes.map(mode => mode.maxLevel)).toEqual([50, 50])
    expect(swshConfig.modes.map(mode => mode.format)).toEqual(['singles', 'doubles'])
  })

  it('includes the requested player-side recommended teams', () => {
    expect(countSets(teamData as ModernSetdex)).toBe(9)
    expect(swshConfig.modes[0].teams.map(team => team.name))
      .toEqual(['Barraskewda / Ludicolo / Pelipper', 'Dracovish / Zacian'])
    expect(swshConfig.modes[1].teams.map(team => team.name))
      .toEqual(['Calyrex-Shadow / Tapu Lele'])

    expect(swshConfig.buildP1Options(null, [], swshConfig.modes[0].teams[0].pokemon).map(option => option.label))
      .toEqual(['Barraskewda (SwSh Singles)', 'Ludicolo (SwSh Singles)', 'Pelipper (SwSh Singles)'])
    expect(swshConfig.buildP1Options(null, [], swshConfig.modes[0].teams[1].pokemon).map(option => option.label))
      .toEqual(['Dracovish (SwSh Singles 2)', 'Zacian (SwSh Singles 2)'])
  })

  it('derives ranks and Leon battles from battle number', () => {
    expect(swshConfig.getBattleRange(1, 'singles')).toBe('Rank 1')
    expect(swshConfig.getTrainersForBattle(1, 'singles')).toHaveLength(24)

    expect(swshConfig.getBattleRange(6, 'singles')).toBe('Rank 3 - Leon')
    expect(swshConfig.getTrainersForBattle(6, 'singles').map(trainer => trainer.name)).toEqual(['Leon'])
    expect(swshConfig.getPokemonForTrainer('Leon', 'singles', 6)).toContain('Charizard-3')

    expect(swshConfig.getBattleRange(7, 'singles')).toBe('Rank 4')
    expect(swshConfig.getTrainersForBattle(7, 'singles')).toHaveLength(26)
    expect(swshConfig.getBattleRange(15, 'singles')).toBe('Rank 6 - Leon')
    expect(swshConfig.getBattleRange(27, 'singles')).toBe('Rank 9 - Leon')
    expect(swshConfig.getBattleRange(33, 'singles')).toBe('Rank 10 - Leon')

    expect(swshConfig.getBattleRange(34, 'singles')).toBe('Max Rank')
    expect(swshConfig.getTrainersForBattle(34, 'singles')).toHaveLength(82)
    expect(swshConfig.getBattleRange(43, 'singles')).toBe('Max Rank - Leon')
    expect(swshConfig.getPokemonForTrainer('Leon', 'singles', 43)).toContain('Charizard-7')
    expect(swshConfig.getBattleRange(53, 'doubles')).toBe('Max Rank - Leon')
  })

  it('uses set-specific IVs from the source groups', () => {
    expect(ivsFor('Rillaboom-1')).toBe(16)
    expect(ivsFor('Rillaboom-2')).toBe(19)
    expect(ivsFor('Rillaboom-3')).toBe(23)
    expect(ivsFor('Rillaboom-4')).toBe(27)
    expect(ivsFor('Charizard-6')).toBe(31)
    expect(ivsFor('Ditto-5')).toBe(12)
    expect(swshConfig.getOpponentIvsLabel?.({
      modeId: 'singles',
      battleNum: 1,
      trainer: null,
      pokemonLabel: 'Ditto-5',
    })).toBe('12 IVs')
  })

  it('contains complete set, roster, form, and move data', () => {
    const moveDex = moves as ModernMoveDex
    const labels = new Set(Object.values(SWSH_SETDEX).flatMap(sets => Object.keys(sets)))

    expect(countSets(SWSH_SETDEX)).toBe(922)
    expect(battleTrainers).toHaveLength(173)
    expect(battleTrainers.filter(trainer => !trainer.boss)).toHaveLength(172)
    expect(Object.keys(trainerPokemon)).toHaveLength(173)
    expect(labels).toContain('Rillaboom-1')
    expect(labels).toContain('Charizard-7')
    expect(SWSH_SETDEX['Stunfisk-Galar']['Stunfisk-1']).toBeDefined()
    expect(SWSH_SETDEX['Indeedee-M']['Indeedee-1']).toBeDefined()
    expect(SWSH_SETDEX['Indeedee-F']['Indeedee-2']).toBeDefined()
    expect(SWSH_SETDEX['Rotom-Fan']['Rotom-Fan-1']).toBeDefined()

    for (const roster of Object.values(trainerPokemon)) {
      const rosters = Array.isArray(roster) ? [roster] : Object.values(roster)
      for (const labelsForRoster of rosters) {
        for (const label of labelsForRoster) expect(labels.has(label)).toBe(true)
      }
    }

    for (const sets of Object.values(SWSH_SETDEX)) {
      for (const set of Object.values(sets)) {
        for (const move of set.moves.filter(Boolean)) expect(moveDex[move]).toBeDefined()
      }
    }
    for (const sets of Object.values(teamData as ModernSetdex)) {
      for (const set of Object.values(sets)) {
        for (const move of set.moves.filter(Boolean)) expect(moveDex[move]).toBeDefined()
      }
    }
  })

  it('supports selecting alternate Gen 8 abilities', () => {
    const p1 = swshConfig.buildP1Options(null, [], ['Barraskewda (SwSh Singles)'])[0]
    const side = swshConfig.defaultSideState()
    const result = swshConfig.runCalc({
      modeId: 'singles',
      p1,
      p2Label: 'Rillaboom-1',
      p1Level: 50,
      p2Level: 50,
      p2Ivs: ivsFor('Rillaboom-1'),
      p2Ability: 'Grassy Surge',
      weather: '',
      terrain: '',
      p1Side: side,
      p2Side: side,
      format: 'singles',
    })

    expect(result?.p2Summary.abilities).toEqual(['Overgrow', 'Grassy Surge'])
    expect(result?.p2Summary.ability).toBe('Grassy Surge')
  })

  it('preserves Dynamax metadata but calculates regular non-Dynamax HP', () => {
    const p1 = swshConfig.buildP1Options(null, [], ['Barraskewda (SwSh Singles)'])[0]
    const side = swshConfig.defaultSideState()
    const result = swshConfig.runCalc({
      modeId: 'singles',
      p1,
      p2Label: 'Charizard-6',
      p1Level: 50,
      p2Level: 50,
      p2Ivs: ivsFor('Charizard-6'),
      p2Ability: '',
      weather: '',
      terrain: '',
      p1Side: side,
      p2Side: side,
      format: 'singles',
    })

    expect(SWSH_SETDEX.Charizard['Charizard-6'].gigantamax).toBe(true)
    expect(result?.p2MaxHP).toBe(153)
    expect(result?.p2Results.every(move => !move.move.isMax)).toBe(true)
  })
})
