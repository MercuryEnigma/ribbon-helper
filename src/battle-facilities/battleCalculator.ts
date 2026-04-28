/**
 * battleCalculator.ts — Shared types and game config interface
 *
 * Game-specific implementations live in gen3Battles.ts, gen6Battles.ts, gen7Battles.ts.
 * This file re-exports everything the UI needs from one place.
 */

import type { SetdexEntry, DamageResult } from './gen3calc'
import type { StoredSet } from './pokepaste'

// ──────────────────────────────────────────────
// Shared types (used by both GameConfig and UI)
// ──────────────────────────────────────────────

export interface FacilityTeam {
  name: string
  url: string
  description: string
  pokemon: string[]
}

export interface FacilityMode {
  id: string
  label: string
  defaultLevel: number
  format: 'singles' | 'doubles'
  maxBattle?: number
  maxLevel?: number
  teams: FacilityTeam[]
  ribbon: { name: string; description: string; warning?: string; icon: string }
}

export interface Trainer {
  number?: number
  class: string
  name: string
  battleRanges?: string[]
  modes?: string[]
  boss?: string
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
  stats: { atk: number; def: number; spa: number; spd: number; spe: number }
  modifiedStats: { atk: number; def: number; spa: number; spd: number; spe: number }
}

export type SideStateFieldDef =
  | { type: 'checkbox'; key: string; label: string; row?: number; className?: string; disabled?: boolean }
  | { type: 'select'; key: string; label: string; options: { value: number; label: string }[]; row?: number; disabled?: boolean }

export interface CalcParams {
  p1: P1Option
  p2Label: string
  p1Level: number
  p2Level: number
  p2Ivs: number
  p2Ability: string
  weather: string
  terrain?: string
  gravity?: boolean
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

  // Terrain (optional — Gen 7+ only)
  terrainOptions?: readonly string[]
  terrainLabels?: Record<string, string>

  // Gravity (optional — Gen 7+ only)
  hasGravity?: boolean

  // Trainer / opponent
  getTrainersForBattle: (battleNum: number, modeId?: string) => Trainer[]
  getPokemonForTrainer: (trainerName: string, modeId?: string, battleNum?: number) => string[]
  getIVsForTrainer: (trainer: Trainer | null) => number
  getBattleRange: (battleNum: number, modeId?: string) => string

  // Team
  buildP1Options: (ribbonMaster: StoredSet | null, pokemonSets: StoredSet[], modeLabels: string[]) => P1Option[]

  // Calc
  runCalc: (params: CalcParams) => CalcResult | null

  // Speed
  calcCurrentSpeed: (pokemon: any, weather: string, terrain?: string) => number

  // Pokepaste validation
  isValidSpecies: (species: string) => boolean
}

// ──────────────────────────────────────────────
// Game configs (re-exported from gen-specific files)
// ──────────────────────────────────────────────

export { emeraldConfig } from './gen3Battles'
export { sunMoonConfig } from './gen7Battles'
export { orasConfig } from './gen6Battles'
export { gen4Config } from './gen4Battles'
export { bdspConfig } from './bdspBattles'

// Re-export DamageResult for the UI
export type { DamageResult } from './gen3calc'
