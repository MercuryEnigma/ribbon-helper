/**
 * battleCalculator.ts — Game-agnostic interface + Emerald implementation
 *
 * Each game/generation provides a GameConfig that the UI consumes.
 * This keeps all gen-specific logic (damage formulas, field effects,
 * trainer data, IV tiers) separated from the shared React UI.
 */

import {
  buildPokemon,
  makeFieldSide,
  calculateAllMovesGen3,
  findSetByLabel,
  POKEDEX_ADV,
  type SetdexEntry,
  type DamageResult,
} from './gen3calc'
import type { StoredSet } from './pokepaste'
import teamData from '../data/battle-facilities/setteam_em.json'
import battleTrainers from '../data/battle-facilities/battle_trainers_em.json'
import trainerPokemon from '../data/battle-facilities/trainer_pokemon_em.json'

// ──────────────────────────────────────────────
// Shared types (used by both GameConfig and UI)
// ──────────────────────────────────────────────

export interface FacilityMode {
  id: string
  label: string
  defaultLevel: number
  format: 'singles' | 'doubles'
  teamUrl: string
  teamName: string
  pokemon: string[] // set labels to show in the P1 selector
  ribbon: { name: string; description: string; warning?: string; icon: string }
}

export interface Trainer {
  number: number
  class: string
  name: string
  battleRanges: string[]
}

export interface P1Option {
  label: string
  species: string
  set: SetdexEntry
}

export interface PokeSummary {
  evs: Partial<Record<string, number>>
  nature: string
  ability: string
  abilities: string[]
  item: string
  speed: number
}

export type SideStateFieldDef =
  | { type: 'checkbox'; key: string; label: string; row?: number }
  | { type: 'select'; key: string; label: string; options: { value: number; label: string }[]; row?: number }

export interface CalcParams {
  p1: P1Option
  p2Label: string
  p1Level: number
  p2Level: number
  p2Ivs: number
  p2Ability: string
  weather: string
  p1Side: SideState
  p2Side: SideState
  format: 'singles' | 'doubles'
}

export interface CalcResult {
  p1Results: DamageResult[]
  p2Results: DamageResult[]
  p1MaxHP: number
  p2MaxHP: number
  p1Summary: PokeSummary
  p2Summary: PokeSummary
}

// SideState uses Record<string, any> so each gen can add its own fields
export type SideState = Record<string, any>

// ──────────────────────────────────────────────
// GameConfig interface
// ──────────────────────────────────────────────

export interface GameConfig {
  title: string
  modes: FacilityMode[]

  // Side state
  defaultSideState: () => SideState
  sideStateFields: SideStateFieldDef[]

  // Weather
  weatherOptions: readonly string[]
  weatherLabels: Record<string, string>

  // Trainer / opponent
  getTrainersForBattle: (battleNum: number) => Trainer[]
  getPokemonForTrainer: (trainerName: string) => string[]
  getIVsForTrainer: (trainer: Trainer | null) => number
  getBattleRange: (battleNum: number) => string

  // Team
  buildP1Options: (ribbonMaster: StoredSet | null, pokemonSets: StoredSet[], modeLabels: string[]) => P1Option[]

  // Calc
  runCalc: (params: CalcParams) => CalcResult | null

  // Speed
  calcCurrentSpeed: (pokemon: any, weather: string) => number

  // Pokepaste validation
  isValidSpecies: (species: string) => boolean
}

// ──────────────────────────────────────────────
// Emerald implementation
// ──────────────────────────────────────────────

const TEAM_EM = teamData as Record<string, Record<string, SetdexEntry>>

const TEAM_EM_BY_LABEL: Record<string, { species: string; set: SetdexEntry }> = {}
for (const [species, sets] of Object.entries(TEAM_EM)) {
  for (const [label, set] of Object.entries(sets)) {
    TEAM_EM_BY_LABEL[label] = { species, set }
  }
}

const EMERALD_MODES: FacilityMode[] = [
  {
    id: 'lvl50-singles',
    label: 'Lvl 50 Singles',
    defaultLevel: 50,
    format: 'singles',
    teamUrl: 'https://pokepast.es/9f353ea337d86f51',
    teamName: "Venty's Latios / Metagross / Suicune",
    pokemon: ['Latios (Singles)', 'Metagross (Singles)', 'Suicune (Singles)'],
    ribbon: { name: 'Winning Ribbon', description: 'Win a full 7-set from battle 50-56 onwards. The Battle Tower awards the Winning Ribbon.', warning: 'We recommend getting this ribbon in R/S Battle Tower.', icon: '/images/ribbons/winning-ribbon.png' },
  },
  {
    id: 'open-singles',
    label: 'Open Singles',
    defaultLevel: 60,
    format: 'singles',
    teamUrl: 'https://pokepast.es/9f353ea337d86f51',
    teamName: "Venty's Latios / Metagross / Suicune",
    pokemon: ['Latios (Singles)', 'Metagross (Singles)', 'Suicune (Singles)'],
    ribbon: { name: 'Victory Ribbon', description: 'Win a full 7-set from battle 50-56 onwards. The Battle Tower awards the Victory Ribbon.', warning: 'We recommend getting this ribbon in R/S Battle Tower.', icon: '/images/ribbons/victory-ribbon.png' },
  },
  {
    id: 'lvl50-doubles',
    label: 'Lvl 50 Doubles',
    defaultLevel: 50,
    format: 'doubles',
    teamUrl: 'https://pokepast.es/773249e264806f40',
    teamName: "Venty's Explosive doubles team",
    pokemon: ['Latios (Doubles)', 'Metagross (Doubles)', 'Snorlax (Doubles)', 'Gengar (Doubles)'],
    ribbon: { name: 'Winning Ribbon', description: 'Win a full 7-set from battle 50-56 onwards. The Battle Tower awards the Winning Ribbon.', warning: 'We recommend getting this ribbon in R/S Battle Tower.', icon: '/images/ribbons/winning-ribbon.png' },
  },
  {
    id: 'open-doubles',
    label: 'Open Doubles',
    defaultLevel: 60,
    format: 'doubles',
    teamUrl: 'https://pokepast.es/773249e264806f40',
    teamName: "Venty's Explosive doubles team",
    pokemon: ['Latios (Doubles)', 'Metagross (Doubles)', 'Snorlax (Doubles)', 'Gengar (Doubles)'],
    ribbon: { name: 'Victory Ribbon', description: 'Win a full 7-set from battle 50-56 onwards. The Battle Tower awards the Victory Ribbon.', warning: 'We recommend getting this ribbon in R/S Battle Tower.', icon: '/images/ribbons/victory-ribbon.png' },
  },
]

const BATTLE_RANGES = ['1-7', '8-14', '15-21', '22-28', '29-35', '36-42', '43-49', '50+'] as const

function battleRangeMatches(battleNum: number, range: string): boolean {
  if (range.endsWith('+')) {
    const start = parseInt(range.slice(0, -1), 10)
    return Number.isFinite(start) && battleNum >= start
  }
  if (range.includes('-')) {
    const [a, b] = range.split('-').map(v => parseInt(v, 10))
    return Number.isFinite(a) && Number.isFinite(b) && battleNum >= a && battleNum <= b
  }
  const exact = parseInt(range, 10)
  return Number.isFinite(exact) && battleNum === exact
}

function getBattleRange(battleNum: number): string {
  if (battleNum >= 50) return '50+'
  const index = Math.floor((battleNum - 1) / 7)
  return BATTLE_RANGES[index] || '1-7'
}

function getIVsForTrainer(trainer: Trainer | null): number {
  if (!trainer) return 3
  if (trainer.name === 'Anabel (Silver)') return 24
  if (trainer.name === 'Anabel (Gold)') return 31

  const n = trainer.number
  if (n <= 100) return 3
  if (n <= 120) return 6
  if (n <= 140) return 9
  if (n <= 160) return 12
  if (n <= 180) return 15
  if (n <= 200) return 18
  if (n <= 220) return 21
  if (n <= 300) return 31
  return 31
}

function getTrainersForBattle(battleNum: number): Trainer[] {
  return (battleTrainers as Trainer[]).filter(t =>
    t.battleRanges.some(r => battleRangeMatches(battleNum, r))
  )
}

function getPokemonForTrainer(trainerName: string): string[] {
  return (trainerPokemon as Record<string, string[]>)[trainerName] || []
}

function buildP1Options(ribbonMaster: StoredSet | null, pokemonSets: StoredSet[], modeLabels: string[]): P1Option[] {
  const options: P1Option[] = []

  if (ribbonMaster) {
    options.push({ label: ribbonMaster.label, species: ribbonMaster.species, set: ribbonMaster.set })
  }

  for (const label of modeLabels) {
    const entry = TEAM_EM_BY_LABEL[label]
    if (!entry) continue
    options.push({ label, species: entry.species, set: entry.set })
  }

  for (const cs of pokemonSets) {
    options.push({ label: cs.label, species: cs.species, set: cs.set })
  }

  return options
}

function defaultSideState(): SideState {
  return {
    isReflect: false,
    isLightScreen: false,
    isHelpingHand: false,
    isCharge: false,
    isSeeded: false,
    spikes: 0,
    boosts: { at: 0, df: 0, sa: 0, sd: 0, sp: 0 },
    curHP: 0,
    maxHP: 0,
    status: 'Healthy',
  }
}

const EMERALD_SIDE_STATE_FIELDS: SideStateFieldDef[] = [
  { type: 'checkbox', key: 'isReflect', label: 'Reflect', row: 1 },
  { type: 'checkbox', key: 'isLightScreen', label: 'Light Screen', row: 1 },
  { type: 'checkbox', key: 'isHelpingHand', label: 'Helping Hand', row: 2 },
  { type: 'checkbox', key: 'isCharge', label: 'Charge', row: 2 },
  { type: 'checkbox', key: 'isSeeded', label: 'Leech Seed', row: 2 },
  { type: 'select', key: 'spikes', label: 'Spikes', options: [
    { value: 0, label: '0' }, { value: 1, label: '1' },
    { value: 2, label: '2' }, { value: 3, label: '3' },
  ]},
]

const STAT_NAMES = ['at', 'df', 'sa', 'sd', 'sp'] as const

function getModifiedStat(stat: number, mod: number): number {
  if (mod > 0) return Math.floor(stat * (2 + mod) / 2)
  if (mod < 0) return Math.floor(stat * 2 / (2 - mod))
  return stat
}

function calcCurrentSpeed(pokemon: any, weather: string): number {
  let speed = pokemon.stats.sp
  speed = getModifiedStat(speed, pokemon.boosts.sp)
  if (pokemon.status === 'Paralyzed') {
    speed = Math.floor(speed / 4)
  }
  if (pokemon.item === 'Macho Brace') {
    speed = Math.floor(speed / 2)
  }
  if (weather === 'Sun' && pokemon.curAbility === 'Chlorophyll') {
    speed *= 2
  } else if (weather === 'Rain' && pokemon.curAbility === 'Swift Swim') {
    speed *= 2
  }
  return speed
}

function runCalc(params: CalcParams): CalcResult | null {
  const { p1, p2Label, p1Level, p2Level, p2Ivs, p2Ability, weather, p1Side, p2Side, format } = params

  const p1Dex = POKEDEX_ADV[p1.species]
  if (!p1Dex) return null
  const p1Poke = buildPokemon(p1.species, p1Dex, p1.set, p1.label, p1Level)

  const p2Match = findSetByLabel(p2Label)
  if (!p2Match) return null
  const p2Dex = POKEDEX_ADV[p2Match.species]
  if (!p2Dex) return null
  const p2Poke = buildPokemon(p2Match.species, p2Dex, p2Match.set, p2Label, p2Level, p2Ivs)

  // Apply selected opponent ability
  if (p2Ability && p2Dex.abilities.includes(p2Ability)) {
    p2Poke.ability = p2Ability
    p2Poke.curAbility = p2Ability
  }

  // Apply boosts
  for (const stat of STAT_NAMES) {
    p1Poke.boosts[stat] = p1Side.boosts[stat]
    p2Poke.boosts[stat] = p2Side.boosts[stat]
  }

  // Apply current HP and status
  if (p1Side.curHP > 0) p1Poke.curHP = p1Side.curHP
  if (p2Side.curHP > 0) p2Poke.curHP = p2Side.curHP
  p1Poke.status = p1Side.status
  p2Poke.status = p2Side.status

  const p1FieldSide = makeFieldSide({
    isReflect: p1Side.isReflect, isLightScreen: p1Side.isLightScreen,
    isHelpingHand: p1Side.isHelpingHand, isCharge: p1Side.isCharge,
    isSeeded: p1Side.isSeeded, spikes: p1Side.spikes,
  }, format, weather)
  const p2FieldSide = makeFieldSide({
    isReflect: p2Side.isReflect, isLightScreen: p2Side.isLightScreen,
    isHelpingHand: p2Side.isHelpingHand, isCharge: p2Side.isCharge,
    isSeeded: p2Side.isSeeded, spikes: p2Side.spikes,
  }, format, weather)

  const [p1Results, p2Results] = calculateAllMovesGen3(p1Poke, p2Poke, p1FieldSide, p2FieldSide)

  const p1Summary: PokeSummary = {
    evs: p1Poke.evs, nature: p1Poke.nature, ability: p1Poke.ability,
    abilities: [p1Poke.ability], item: p1Poke.item,
    speed: calcCurrentSpeed(p1Poke, weather),
  }
  const p2Summary: PokeSummary = {
    evs: p2Poke.evs, nature: p2Poke.nature, ability: p2Poke.ability,
    abilities: p2Dex.abilities, item: p2Poke.item,
    speed: calcCurrentSpeed(p2Poke, weather),
  }

  return { p1Results, p2Results, p1MaxHP: p1Poke.maxHP, p2MaxHP: p2Poke.maxHP, p1Summary, p2Summary }
}

// ──────────────────────────────────────────────
// Export the Emerald config
// ──────────────────────────────────────────────

export const emeraldConfig: GameConfig = {
  title: 'Emerald - Battle Frontier Tower',
  modes: EMERALD_MODES,
  defaultSideState,
  sideStateFields: EMERALD_SIDE_STATE_FIELDS,
  weatherOptions: ['', 'Sun', 'Rain', 'Sand', 'Hail'],
  weatherLabels: { '': 'None', Sun: 'Sun', Rain: 'Rain', Sand: 'Sand', Hail: 'Hail' },
  getTrainersForBattle,
  getPokemonForTrainer,
  getIVsForTrainer,
  getBattleRange,
  buildP1Options,
  runCalc,
  calcCurrentSpeed,
  isValidSpecies: (species: string) => !!POKEDEX_ADV[species],
}

// Re-export DamageResult for the UI
export type { DamageResult } from './gen3calc'
