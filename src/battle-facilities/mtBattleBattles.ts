import type { FacilityMode, OpponentLevelParams, Trainer } from './battleCalculator'
import { createGen3GameConfig } from './gen3BattleConfig'
import { findSetByLabel, type Gen3MoveDex, type Gen3Setdex } from './gen3calc'
import teamData from '../data/battle-facilities/emerald/setteam_em.json'
import battleTrainers from '../data/battle-facilities/mt-battle/battle_trainers_mt_battle.json'
import moves from '../data/battle-facilities/mt-battle/moves_mt_battle.json'
import setdex from '../data/battle-facilities/mt-battle/setdex_mt_battle.json'
import trainerPokemon from '../data/battle-facilities/mt-battle/trainer_pokemon_mt_battle.json'

const SINGLES_TEAM = {
  name: "Venty's Latios / Metagross / Suicune",
  url: 'https://pokepast.es/9f353ea337d86f51',
  description: 'Gen 3 Singles team:',
  pokemon: ['Latios (Singles)', 'Metagross (Singles)', 'Suicune (Singles)'],
}

const DOUBLES_TEAM = {
  name: "Venty's Explosive doubles team",
  url: 'https://pokepast.es/773249e264806f40',
  description: 'Gen 3 Doubles team:',
  pokemon: ['Latios (Doubles)', 'Metagross (Doubles)', 'Snorlax (Doubles)', 'Gengar (Doubles)'],
}

const EARTH_RIBBON = {
  name: 'Earth Ribbon',
  description: 'Defeat all 100 Trainers in one continuous challenge with the same party to award the Earth Ribbon to each eligible party member.',
  icon: '/images/ribbons/earth-ribbon.png',
}

const HO_OH_PRIZE = {
  name: '',
  description: 'Defeat all 100 Trainers in one challenge to receive Ho-oh. Does not reward a ribbon.',
  icon: '',
}

export const MT_BATTLE_MODES: FacilityMode[] = [
  {
    id: 'colosseum-story',
    label: 'Colosseum Story Mode',
    defaultLevel: 15,
    format: 'doubles',
    maxBattle: 100,
    teams: [DOUBLES_TEAM],
    ribbon: EARTH_RIBBON,
  },
  {
    id: 'colosseum-battle-singles',
    label: 'Colosseum Battle Mode Singles',
    defaultLevel: 50,
    format: 'singles',
    maxBattle: 100,
    teams: [SINGLES_TEAM],
    ribbon: HO_OH_PRIZE,
  },
  {
    id: 'colosseum-battle-doubles',
    label: 'Colosseum Battle Mode Doubles',
    defaultLevel: 50,
    format: 'doubles',
    maxBattle: 100,
    teams: [DOUBLES_TEAM],
    ribbon: HO_OH_PRIZE,
  },
  {
    id: 'xd',
    label: 'XD: Gale of Darkness',
    defaultLevel: 9,
    format: 'doubles',
    maxBattle: 100,
    teams: [DOUBLES_TEAM],
    ribbon: EARTH_RIBBON,
  },
]

const TRAINERS_BY_MODE = battleTrainers as Record<string, Trainer[]>
const SETDEX_BY_MODE = setdex as Record<string, Gen3Setdex>
const TRAINER_POKEMON_BY_MODE = trainerPokemon as Record<string, Record<string, string[]>>

function getTrainersForBattle(battleNum: number, modeId = MT_BATTLE_MODES[0].id): Trainer[] {
  const trainer = TRAINERS_BY_MODE[modeId]?.find(entry => entry.number === battleNum)
  return trainer ? [trainer] : []
}

function getBattleRange(battleNum: number): string {
  const area = Math.ceil(battleNum / 10)
  const start = (area - 1) * 10 + 1
  return `Area ${area} (${start}-${start + 9})`
}

function getOpponentLevel({ modeId, pokemonLabel, p1Level }: OpponentLevelParams): number | undefined {
  if (modeId === 'colosseum-battle-singles' || modeId === 'colosseum-battle-doubles') {
    return Math.max(50, p1Level)
  }
  return findSetByLabel(pokemonLabel, SETDEX_BY_MODE[modeId])?.set.level
}

const baseConfig = createGen3GameConfig({
  title: 'Gamecube - Mt. Battle',
  modes: MT_BATTLE_MODES,
  teamData: teamData as Gen3Setdex,
  moveData: moves as Gen3MoveDex,
  fixedOpponentAbilities: true,
  opponentIvsLabel: 'Set IVs / EVs',
  getTrainersForBattle,
  getIVsForTrainer: trainer => trainer?.ivs ?? 0,
  getBattleRange,
  setdexForMode: modeId => SETDEX_BY_MODE[modeId] ?? SETDEX_BY_MODE['colosseum-story'],
  trainerPokemonForMode: modeId => TRAINER_POKEMON_BY_MODE[modeId] ?? TRAINER_POKEMON_BY_MODE['colosseum-story'],
})

export const mtBattleConfig = {
  ...baseConfig,
  getOpponentLevel,
}
