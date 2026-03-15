// Gen 4 (Pt/HGSS) battle facility calculator.
// This file is responsible for:
//   - TypeScript interfaces and Pokemon/FieldSide construction
//   - Pre-calc helpers (checkAirLock, checkKlutz)
//   - Bridging to getDamageResultPtHGSS from src/damage-calc/gen4-damage.ts

import movesData from '../data/battle-facilities/pthgss/moves_pthgss.json'
import pokedexData from '../data/battle-facilities/pthgss/pokedex_pthgss.json'
import setdexData from '../data/battle-facilities/pthgss/setdex_pthgss.json'
import {
  getDamageResultPtHGSS,
  getModifiedStat,
  computeGen4Speed,
  checkAirLock,
  checkKlutz,
  type Gen4Pokemon,
  type Gen4Move,
  type Gen4Side,
} from '../damage-calc/gen4-damage'

export { computeGen4Speed }

export const MOVES_DPP = movesData as unknown as Record<string, { bp: number; type: string; category?: string; isSpread?: boolean; isSound?: boolean; isPunch?: boolean; hasSecondaryEffect?: boolean; acc?: number; makesContact?: boolean; hasRecoil?: number | string; hits?: number; isMLG?: boolean }>
export const POKEDEX_DPP = pokedexData as Record<string, PokedexEntry>
export const SETDEX_PTHGSS = setdexData as Record<string, Record<string, SetdexEntry>>

// --- Natures (for stat calculation) ---
const NATURES: Record<string, [string, string]> = {
  "Adamant": ["at","sa"], "Bashful": ["",""], "Bold": ["df","at"],
  "Brave": ["at","sp"], "Calm": ["sd","at"], "Careful": ["sd","sa"],
  "Docile": ["",""], "Gentle": ["sd","df"], "Hardy": ["",""],
  "Hasty": ["sp","df"], "Impish": ["df","sa"], "Jolly": ["sp","sa"],
  "Lax": ["df","sd"], "Lonely": ["at","df"], "Mild": ["sa","df"],
  "Modest": ["sa","at"], "Naive": ["sp","sd"], "Naughty": ["at","sd"],
  "Quiet": ["sa","sp"], "Quirky": ["",""], "Rash": ["sa","sd"],
  "Relaxed": ["df","sp"], "Sassy": ["sd","sp"], "Serious": ["",""],
  "Timid": ["sp","at"],
}

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

// --- Pokemon interface (compatible with Gen4Pokemon) ---
export interface Pokemon extends Gen4Pokemon {
  ivs: Record<string, number>
  moves: MoveData[]
}

// --- Move data ---
export interface MoveData extends Gen4Move {
  name: string
  bp: number
  type: string
  category: "Physical" | "Special"
  isCrit?: boolean
  hits?: number
}

// --- Field / Side (UI input shape) ---
// Gen 4 has no terrain, no Aurora Veil, no Battery, no Z-moves, no Friend Guard.
export interface FieldSide {
  format: string
  weather: string
  isProtect: boolean
  isReflect: boolean
  isLightScreen: boolean
  isHelpingHand: boolean
  isTailwind: boolean
  isCharge: boolean
  isGravity: boolean
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

// --- Stat calculation ---
function calcHP(base: number, iv: number, ev: number, level: number): number {
  if (base === 1) return 1 // Shedinja
  return Math.floor((base * 2 + iv + Math.floor(ev / 4)) * level / 100) + level + 10
}

function calcStat(base: number, iv: number, ev: number, level: number, nature: string, statName: string): number {
  const natureMods = NATURES[nature] ?? ["",""]
  const natureMult = natureMods[0] === statName ? 1.1 : natureMods[1] === statName ? 0.9 : 1
  return Math.floor((Math.floor((base * 2 + iv + Math.floor(ev / 4)) * level / 100) + 5) * natureMult)
}

// --- Build a Pokemon from pokedex + setdex data ---
export function buildPokemon(
  speciesName: string,
  dexEntry: PokedexEntry,
  set: SetdexEntry,
  setLabel: string,
  level = 50,
  ivs = 31,
): Pokemon {
  const bs = dexEntry.bs
  const evs: Record<string, number> = {
    hp: set.evs.hp || 0, at: set.evs.at || 0, df: set.evs.df || 0,
    sa: set.evs.sa || 0, sd: set.evs.sd || 0, sp: set.evs.sp || 0,
  }
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
    if (!moveName) return { name: '(No Move)', bp: 0, type: 'Normal', category: 'Physical', hits: 1 } satisfies MoveData
    const md = MOVES_DPP[moveName] || { bp: 0, type: "Normal" }
    return {
      name: moveName,
      bp: md.bp,
      type: md.type,
      category: (md.category as MoveData['category']) ?? "Physical",
      isSpread: md.isSpread,
      isSound: md.isSound,
      isPunch: md.isPunch,
      hasSecondaryEffect: md.hasSecondaryEffect,
      makesContact: md.makesContact,
      hasRecoil: md.hasRecoil as MoveData['hasRecoil'],
      hits: md.hits ?? 1,
      isMLG: md.isMLG,
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

// --- Build FieldSide ---
export function makeFieldSide(overrides: Partial<FieldSide> = {}, format = "singles", weather = ""): FieldSide {
  return {
    format, weather,
    isProtect: false, isReflect: false, isLightScreen: false,
    isHelpingHand: false, isTailwind: false, isCharge: false,
    isGravity: false,
    ...overrides,
  }
}

// --- Wrap result into DamageResult ---
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

// --- Build the mixed side getDamageResultPtHGSS expects ---
// Attacker's offensive conditions (helpingHand, charge) + defender's defensive conditions
// (protect, reflect, lightScreen). Gravity and weather are global field state.
function buildAttackSide(attackerSide: FieldSide, defenderSide: FieldSide, weather: string): Gen4Side {
  return {
    format: attackerSide.format,
    weather,
    isGravity: attackerSide.isGravity,
    isHelpingHand: attackerSide.isHelpingHand,
    isCharge: attackerSide.isCharge,
    isProtect: defenderSide.isProtect,
    isReflect: defenderSide.isReflect,
    isLightScreen: defenderSide.isLightScreen,
  }
}

// --- Main calculation ---
export function calculateAllMovesGen4(
  p1: Pokemon,
  p2: Pokemon,
  p1Side: FieldSide,
  p2Side: FieldSide,
): [DamageResult[], DamageResult[]] {
  const fieldState = {
    weather: p1Side.weather,
    clearWeather() { this.weather = "" },
  }

  checkAirLock(p1, fieldState)
  checkAirLock(p2, fieldState)
  checkKlutz(p1)
  checkKlutz(p2)

  const weather = fieldState.weather

  // Compute modified stats (mirrors CALCULATE_ALL_MOVES_PTHGSS stat setup)
  for (const stat of ["df","sd","at","sa"] as const) {
    p1.stats[stat] = getModifiedStat(p1.rawStats[stat], p1.boosts[stat])
    p2.stats[stat] = getModifiedStat(p2.rawStats[stat], p2.boosts[stat])
  }
  p1.stats["sp"] = computeGen4Speed(p1, weather) * (p1Side.isTailwind ? 2 : 1)
  p2.stats["sp"] = computeGen4Speed(p2, weather) * (p2Side.isTailwind ? 2 : 1)

  const side1 = buildAttackSide(p1Side, p2Side, weather)
  const side2 = buildAttackSide(p2Side, p1Side, weather)

  const results1: DamageResult[] = p1.moves.map(move => {
    const raw = getDamageResultPtHGSS(p1, p2, move as Gen4Move, side1)
    p2.resetCurAbility()
    return enrichResult(raw, move, p2.maxHP)
  })

  const results2: DamageResult[] = p2.moves.map(move => {
    const raw = getDamageResultPtHGSS(p2, p1, move as Gen4Move, side2)
    p1.resetCurAbility()
    return enrichResult(raw, move, p1.maxHP)
  })

  return [results1, results2]
}

// --- Helper: find species + set from a set label ---
export function findSetByLabel(label: string): { species: string; set: SetdexEntry } | null {
  for (const [species, sets] of Object.entries(SETDEX_PTHGSS)) {
    if (label in sets) return { species, set: sets[label] }
  }
  return null
}

// --- Resolve species name for pokedex lookup ---
export function resolveSpeciesName(name: string): string {
  if (POKEDEX_DPP[name]) return name
  // Gen 4 has no Mega/Primal, but handle forme suffixes gracefully
  return name
}
