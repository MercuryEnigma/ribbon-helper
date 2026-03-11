// Gen 3 (Emerald) battle facility calculator.
// This file is responsible for:
//   - TypeScript interfaces and Pokemon/FieldSide construction
//   - Pre-calc helpers (checkAirLock)
//   - Bridging to getDamageResultADV from src/damage-calc/gen3-damage-adv.ts

import movesData from '../data/battle-facilities/emerald/moves_em.json'
import pokedexData from '../data/battle-facilities/emerald/pokedex_em.json'
import setdexData from '../data/battle-facilities/emerald/setdex_em.json'
import {
  getDamageResultADV,
  getModifiedStat,
  computeGen3Speed,
  checkAirLock,
  NATURES,
  type Gen3Pokemon,
  type Gen3Move,
  type Gen3Side,
} from '../damage-calc/gen3-damage-adv'

export const MOVES_ADV = movesData as Record<string, { bp: number; type: string; category?: string; isSpread?: boolean; isBullet?: boolean; isSound?: boolean; isMLG?: boolean; hasSecondaryEffect?: boolean; acc?: number; makesContact?: boolean; hasRecoil?: number | string; hits?: number }>
export const POKEDEX_ADV = pokedexData as Record<string, PokedexEntry>
export const SETDEX_EM = setdexData as Record<string, Record<string, SetdexEntry>>

// --- Pokedex data ---
export interface BaseStats {
  hp: number; at: number; df: number; sa: number; sd: number; sp: number
}

export interface PokedexEntry {
  t1: string
  t2?: string
  bs: BaseStats
  w: number
  abilities: string[]
}

// --- Setdex data ---
export interface SetdexEntry {
  evs: Partial<BaseStats>
  ivs?: Partial<BaseStats>
  moves: string[]
  nature: string
  item: string
  tier?: string
}

// --- Move data ---
export interface MoveData extends Gen3Move {
  category?: "Physical" | "Special"
  isBullet?: boolean
  hasSecondaryEffect?: boolean
  acc?: number
  hasRecoil?: number | "crash"
  makesContact?: boolean
}

// --- Pokemon object ---
export interface Pokemon extends Gen3Pokemon {
  ivs: Record<string, number>
  moves: MoveData[]
  resetCurAbility: () => void
}

// --- Field / Side (UI input shape) ---
export interface FieldSide {
  format: string
  weather: string
  isProtect: boolean
  isReflect: boolean
  isLightScreen: boolean
  isHelpingHand: boolean
  isCharge: boolean
}

// --- Damage result ---
export interface DamageResult {
  damage: number[]
  description: string
  move: MoveData
  minDamage: number
  maxDamage: number
  minPercent: number
  maxPercent: number
  defenderMaxHP: number
}

// --- Stat calculation (Gen 3 formulas) ---
function calcHP(base: number, iv: number, ev: number, level: number): number {
  if (base === 1) return 1 // Shedinja
  return Math.floor((base * 2 + iv + Math.floor(ev / 4)) * level / 100) + level + 10
}

function calcStat(base: number, iv: number, ev: number, level: number, nature: string, statName: string): number {
  const natureMods = NATURES[nature] || ["", ""]
  const natureMult = natureMods[0] === statName ? 1.1 : natureMods[1] === statName ? 0.9 : 1
  return Math.floor((Math.floor((base * 2 + iv + Math.floor(ev / 4)) * level / 100) + 5) * natureMult)
}

// --- Build a Pokemon from pokedex + setdex data ---
export function buildPokemon(
  speciesName: string,
  dexEntry: PokedexEntry,
  set: SetdexEntry,
  setLabel: string,
  level: number = 50,
  ivs: number = 31,
): Pokemon {
  const bs = dexEntry.bs
  const evs: Record<string, number> = {
    hp: set.evs.hp || 0, at: set.evs.at || 0, df: set.evs.df || 0,
    sa: set.evs.sa || 0, sd: set.evs.sd || 0, sp: set.evs.sp || 0,
  }
  // Per-set IVs (e.g. Anabel Silver = 24) override the battle-range default
  const ivsMap: Record<string, number> = set.ivs
    ? { hp: set.ivs.hp ?? ivs, at: set.ivs.at ?? ivs, df: set.ivs.df ?? ivs, sa: set.ivs.sa ?? ivs, sd: set.ivs.sd ?? ivs, sp: set.ivs.sp ?? ivs }
    : { hp: ivs, at: ivs, df: ivs, sa: ivs, sd: ivs, sp: ivs }

  const maxHP = calcHP(bs.hp, ivsMap.hp, evs.hp, level)
  const rawStats: Record<string, number> = {
    at: calcStat(bs.at, ivsMap.at, evs.at, level, set.nature, "at"),
    df: calcStat(bs.df, ivsMap.df, evs.df, level, set.nature, "df"),
    sa: calcStat(bs.sa, ivsMap.sa, evs.sa, level, set.nature, "sa"),
    sd: calcStat(bs.sd, ivsMap.sd, evs.sd, level, set.nature, "sd"),
    sp: calcStat(bs.sp, ivsMap.sp, evs.sp, level, set.nature, "sp"),
  }

  const moves: MoveData[] = set.moves.map(moveName => {
    if (!moveName) return { name: '(No Move)', bp: 0, type: 'Normal', hits: 1 } satisfies MoveData
    const md = MOVES_ADV[moveName] || { bp: 0, type: "Normal" }
    return {
      name: moveName,
      bp: md.bp,
      type: md.type,
      category: md.category as MoveData['category'],
      isSpread: md.isSpread,
      isBullet: md.isBullet,
      isSound: md.isSound,
      isMLG: md.isMLG,
      hasSecondaryEffect: md.hasSecondaryEffect,
      makesContact: md.makesContact,
      hasRecoil: md.hasRecoil as MoveData['hasRecoil'],
      hits: md.hits ?? 1,
      isCrit: false,
    } satisfies MoveData
  })

  const poke: Pokemon = {
    name: speciesName,
    setName: setLabel,
    type1: dexEntry.t1,
    type2: dexEntry.t2 || "",
    level,
    maxHP,
    curHP: maxHP,
    HPEVs: evs.hp,
    rawStats,
    boosts: { at: 0, df: 0, sa: 0, sd: 0, sp: 0 },
    stats: { ...rawStats },
    evs,
    ivs: ivsMap,
    nature: set.nature,
    ability: dexEntry.abilities[0],
    curAbility: dexEntry.abilities[0],
    isAbilityActivated: false,
    item: set.item,
    status: "Healthy",
    weight: dexEntry.w,
    moves,
    hasType(type: string) { return this.type1 === type || this.type2 === type },
    resetCurAbility() { this.curAbility = this.ability },
  }

  return poke
}

// --- Build a minimal FieldSide ---
export function makeFieldSide(overrides: Partial<FieldSide> = {}, format = "singles", weather = ""): FieldSide {
  return {
    format,
    weather,
    isProtect: false,
    isReflect: false,
    isLightScreen: false,
    isHelpingHand: false,
    isCharge: false,
    ...overrides,
  }
}

// --- Build the mixed side getDamageResultADV expects ---
// Mirrors gen7calc.ts's buildAttackSide convention:
// attacker's offensive conditions (helpingHand, charge) + defender's defensive conditions (reflect, lightScreen, protect).
function buildAttackSide(attackerSide: FieldSide, defenderSide: FieldSide, weather: string): Gen3Side {
  return {
    format: attackerSide.format,
    weather,
    // Defender's defensive conditions
    isProtect: defenderSide.isProtect,
    isReflect: defenderSide.isReflect,
    isLightScreen: defenderSide.isLightScreen,
    // Attacker's offensive conditions
    isHelpingHand: attackerSide.isHelpingHand,
    isCharge: attackerSide.isCharge,
  }
}

// --- Wrap getDamageResultADV output into our DamageResult interface ---
function enrichResult(
  raw: { damage: number[]; description: string },
  move: MoveData,
  defenderMaxHP: number,
): DamageResult {
  const damage = raw.damage
  const minDamage = damage[0]
  const maxDamage = damage[damage.length - 1]
  return {
    damage,
    description: raw.description,
    move,
    minDamage,
    maxDamage,
    minPercent: Math.round(minDamage * 1000 / defenderMaxHP) / 10,
    maxPercent: Math.round(maxDamage * 1000 / defenderMaxHP) / 10,
    defenderMaxHP,
  }
}

// --- Calculate all moves for both sides ---
export function calculateAllMovesGen3(
  p1: Pokemon,
  p2: Pokemon,
  p1Side: FieldSide,
  p2Side: FieldSide,
): [DamageResult[], DamageResult[]] {
  // Mutable weather state (Air Lock can suppress weather)
  const fieldState = {
    weather: p1Side.weather,
    clearWeather() { this.weather = "" },
  }

  checkAirLock(p1, fieldState)
  checkAirLock(p2, fieldState)

  const weather = fieldState.weather

  // Compute modified stats
  for (const stat of ["df","sd","at","sa"] as const) {
    p1.stats[stat] = getModifiedStat(p1.rawStats[stat], p1.boosts[stat])
    p2.stats[stat] = getModifiedStat(p2.rawStats[stat], p2.boosts[stat])
  }
  p1.stats["sp"] = computeGen3Speed(p1, weather)
  p2.stats["sp"] = computeGen3Speed(p2, weather)

  // Build mixed sides: attacker's offensive conditions + defender's defensive conditions.
  const side1 = buildAttackSide(p1Side, p2Side, weather) // p1 attacks p2
  const side2 = buildAttackSide(p2Side, p1Side, weather) // p2 attacks p1

  const results1: DamageResult[] = p1.moves.map(move => {
    const raw = getDamageResultADV(p1, p2, move as Gen3Move, side1)
    return enrichResult(raw, move, p2.maxHP)
  })

  const results2: DamageResult[] = p2.moves.map(move => {
    const raw = getDamageResultADV(p2, p1, move as Gen3Move, side2)
    return enrichResult(raw, move, p1.maxHP)
  })

  return [results1, results2]
}

// --- Helper: build a flat list of all set labels from the setdex ---
export function getAllSetLabels(): string[] {
  const labels: string[] = []
  for (const species of Object.keys(SETDEX_EM)) {
    for (const setLabel of Object.keys(SETDEX_EM[species])) {
      labels.push(setLabel)
    }
  }
  return labels
}

// --- Helper: find species name and set data from a set label ---
export function findSetByLabel(label: string): { species: string; set: SetdexEntry } | null {
  for (const [species, sets] of Object.entries(SETDEX_EM)) {
    if (label in sets) {
      return { species, set: sets[label] }
    }
  }
  return null
}
