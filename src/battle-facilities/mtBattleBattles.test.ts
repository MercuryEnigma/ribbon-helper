import { describe, expect, it } from 'vitest'
import { mtBattleConfig } from './mtBattleBattles'
import type { Gen3MoveDex, Gen3Setdex } from './gen3calc'
import battleTrainers from '../data/battle-facilities/mt-battle/battle_trainers_mt_battle.json'
import moves from '../data/battle-facilities/mt-battle/moves_mt_battle.json'
import setdex from '../data/battle-facilities/mt-battle/setdex_mt_battle.json'
import trainerPokemon from '../data/battle-facilities/mt-battle/trainer_pokemon_mt_battle.json'

const MODE_IDS = [
  'colosseum-story',
  'colosseum-battle-singles',
  'colosseum-battle-doubles',
  'xd',
] as const

const EXPECTED_SET_COUNTS = {
  'colosseum-story': 336,
  'colosseum-battle-singles': 600,
  'colosseum-battle-doubles': 600,
  xd: 321,
}

const SETDEX_BY_MODE = setdex as Record<string, Gen3Setdex>
const ROSTERS_BY_MODE = trainerPokemon as Record<string, Record<string, string[]>>

function countSets(data: Gen3Setdex): number {
  return Object.values(data).reduce((total, sets) => total + Object.keys(sets).length, 0)
}

describe('Mt. Battle config', () => {
  it('has exactly the four requested modes and formats', () => {
    expect(mtBattleConfig.title).toBe('Gamecube - Mt. Battle')
    expect(mtBattleConfig.modes.map(mode => mode.id)).toEqual(MODE_IDS)
    expect(mtBattleConfig.modes.map(mode => mode.defaultLevel)).toEqual([15, 50, 50, 9])
    expect(mtBattleConfig.modes.map(mode => mode.format)).toEqual(['doubles', 'singles', 'doubles', 'doubles'])
    expect(mtBattleConfig.modes.every(mode => mode.maxBattle === 100)).toBe(true)
    expect(mtBattleConfig.modes.map(mode => mode.ribbon.name)).toEqual([
      'Earth Ribbon',
      '',
      '',
      'Earth Ribbon',
    ])
    expect(mtBattleConfig.modes.slice(1, 3).every(mode =>
      mode.ribbon.description.includes('receive Ho-oh') && mode.ribbon.icon === ''
    )).toBe(true)
  })

  it.each(MODE_IDS)('maps every %s battle number to exactly one opponent', modeId => {
    for (let battle = 1; battle <= 100; battle += 1) {
      const trainers = mtBattleConfig.getTrainersForBattle(battle, modeId)
      expect(trainers).toHaveLength(1)
      expect(trainers[0].number).toBe(battle)
    }
    expect(mtBattleConfig.getTrainersForBattle(0, modeId)).toEqual([])
    expect(mtBattleConfig.getTrainersForBattle(101, modeId)).toEqual([])
  })

  it('uses fixed Story/XD levels and open-level Battle Mode scaling', () => {
    const storyTrainer = mtBattleConfig.getTrainersForBattle(1, 'colosseum-story')[0]
    const storyLabel = mtBattleConfig.getPokemonForTrainer(storyTrainer.name, 'colosseum-story', 1)[0]
    expect(mtBattleConfig.getOpponentLevel?.({
      modeId: 'colosseum-story',
      battleNum: 1,
      trainer: storyTrainer,
      pokemonLabel: storyLabel,
      p1Level: 100,
    })).toBe(16)

    const xdTrainer = mtBattleConfig.getTrainersForBattle(1, 'xd')[0]
    const xdLabel = mtBattleConfig.getPokemonForTrainer(xdTrainer.name, 'xd', 1)[0]
    expect(mtBattleConfig.getOpponentLevel?.({
      modeId: 'xd',
      battleNum: 1,
      trainer: xdTrainer,
      pokemonLabel: xdLabel,
      p1Level: 100,
    })).toBe(9)

    expect(mtBattleConfig.getOpponentLevel?.({
      modeId: 'colosseum-battle-singles',
      battleNum: 1,
      trainer: null,
      pokemonLabel: '',
      p1Level: 42,
    })).toBe(50)
    expect(mtBattleConfig.getOpponentLevel?.({
      modeId: 'colosseum-battle-doubles',
      battleNum: 1,
      trainer: null,
      pokemonLabel: '',
      p1Level: 75,
    })).toBe(75)
  })

  it('uses listed fixed abilities and reproduces Story Mode stats', () => {
    const p1 = mtBattleConfig.buildP1Options(null, [], ['Latios (Doubles)'])[0]
    const side = mtBattleConfig.defaultSideState()
    const result = mtBattleConfig.runCalc({
      modeId: 'colosseum-story',
      p1,
      p2Label: 'Taillow (Battle 1-1)',
      p1Level: 50,
      p2Level: 16,
      p2Ivs: 0,
      p2Ability: 'Guts',
      weather: '',
      p1Side: side,
      p2Side: side,
      format: 'doubles',
    })

    expect(result?.p2Summary).toMatchObject({
      nature: 'Naive',
      ability: 'Guts',
      abilities: ['Guts'],
      stats: { atk: 22, def: 14, spa: 14, spd: 12, spe: 35 },
      speed: 35,
    })
  })

  it('does not allow a fixed source ability to be overridden', () => {
    const p1 = mtBattleConfig.buildP1Options(null, [], ['Latios (Doubles)'])[0]
    const side = mtBattleConfig.defaultSideState()
    const result = mtBattleConfig.runCalc({
      modeId: 'colosseum-story',
      p1,
      p2Label: 'Hariyama (Battle 80-1)',
      p1Level: 50,
      p2Level: 52,
      p2Ivs: 0,
      p2Ability: 'Thick Fat',
      weather: '',
      p1Side: side,
      p2Side: side,
      format: 'doubles',
    })

    expect(result?.p2Summary.ability).toBe('Guts')
    expect(result?.p2Summary.abilities).toEqual(['Guts'])
  })

  it('contains complete trainer, roster, set, and move data', () => {
    const trainersByMode = battleTrainers as Record<string, { name: string }[]>
    const moveDex = moves as Gen3MoveDex

    for (const modeId of MODE_IDS) {
      const modeSetdex = SETDEX_BY_MODE[modeId]
      const rosters = ROSTERS_BY_MODE[modeId]
      const labels = new Set(Object.values(modeSetdex).flatMap(sets => Object.keys(sets)))

      expect(trainersByMode[modeId]).toHaveLength(100)
      expect(Object.keys(rosters)).toHaveLength(100)
      expect(countSets(modeSetdex)).toBe(EXPECTED_SET_COUNTS[modeId])

      for (const trainer of trainersByMode[modeId]) {
        expect(rosters[trainer.name]?.length).toBeGreaterThan(0)
      }
      for (const roster of Object.values(rosters)) {
        for (const label of roster) expect(labels.has(label)).toBe(true)
      }
      for (const sets of Object.values(modeSetdex)) {
        for (const set of Object.values(sets)) {
          for (const move of set.moves) expect(moveDex[move]).toBeDefined()
        }
      }
    }
  })
})
