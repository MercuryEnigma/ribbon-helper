// Gen 6 (ORAS/XY) battle facility calculator.
// This file is responsible for:
//   - TypeScript interfaces and Pokemon/FieldSide construction
//   - Pre-calc helpers (checkAirLock, checkKlutz)
//   - Bridging to getDamageResult from src/damage-calc/gen6-damage.ts

import movesData from '../data/battle-facilities/oras/moves_oras.json'
import pokedexData from '../data/battle-facilities/oras/pokedex_oras.json'
import setdexData from '../data/battle-facilities/oras/setdex_oras.json'
import {
  getDamageResult,
  getModifiedStat,
  computeGen6Speed,
  type ModernPokemon,
  type ModernMove,
  type ModernSide,
} from '../damage-calc/gen6-damage'

export { computeGen6Speed }

export const MOVES_ORAS = movesData as unknown as Record<string, { bp: number; type: string; category?: string; isSpread?: boolean; isBullet?: boolean; isSound?: boolean; isPunch?: boolean; isPulse?: boolean; isBite?: boolean; isSlicing?: boolean; hasSecondaryEffect?: boolean; acc?: number; makesContact?: boolean; hasRecoil?: number | string; hits?: number; hasPriority?: boolean; bypassesProtect?: boolean }>
export const POKEDEX_ORAS = pokedexData as Record<string, PokedexEntry>
export const SETDEX_ORAS = setdexData as Record<string, Record<string, SetdexEntry>>

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
  formes?: string[]
  hasBaseForme?: string
}

// --- Setdex data ---
export interface SetdexEntry {
  evs: Partial<BaseStats>
  ivs?: Partial<BaseStats>
  moves: string[]
  nature: string
  item: string
  level?: number
  tier?: string
}

// --- Pokemon interface (compatible with ModernPokemon) ---
export interface Pokemon extends ModernPokemon {
  ivs: Record<string, number>
  moves: MoveData[]
}

// --- Move data ---
export interface MoveData extends ModernMove {
  name: string
  bp: number
  type: string
  category: "Physical" | "Special"
  isCrit?: boolean
  hits?: number
}

// --- Field / Side (UI input shape) ---
// Gen 6 has no Aurora Veil, Battery, Z-moves. Terrain exists (Electric/Grassy/Misty only).
export interface FieldSide {
  format: string
  weather: string
  terrain: string
  isProtect: boolean
  isReflect: boolean
  isLightScreen: boolean
  isHelpingHand: boolean
  isTailwind: boolean
  isCharge: boolean
  isGravity: boolean
  isFriendGuard: boolean
}

// --- Damage result (wraps getDamageResult output with extra fields) ---
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

// --- Mega Evolution ---
function findMegaForme(baseName: string, item: string): string | null {
  if (!item || (!item.endsWith('ite') && !item.endsWith('ite X') && !item.endsWith('ite Y'))) return null
  for (const c of [`Mega ${baseName}`, `Mega ${baseName} X`, `Mega ${baseName} Y`]) {
    if (POKEDEX_ORAS[c]?.hasBaseForme === baseName) return c
  }
  return null
}

// --- Primal forms (Kyogre, Groudon) ---
function findPrimalForme(baseName: string, item: string): string | null {
  if (baseName === 'Kyogre' && item === 'Blue Orb') return 'Primal Kyogre'
  if (baseName === 'Groudon' && item === 'Red Orb') return 'Primal Groudon'
  return null
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
  let effectiveDex = dexEntry
  let effectiveName = speciesName
  const primalName = findPrimalForme(speciesName, set.item)
  const megaName = !primalName ? findMegaForme(speciesName, set.item) : null
  if (primalName && POKEDEX_ORAS[primalName]) {
    effectiveDex = POKEDEX_ORAS[primalName]
    effectiveName = primalName
  } else if (megaName && POKEDEX_ORAS[megaName]) {
    effectiveDex = POKEDEX_ORAS[megaName]
    effectiveName = megaName
  }

  const bs = effectiveDex.bs
  const evs: Record<string, number> = {
    hp: set.evs.hp || 0, at: set.evs.at || 0, df: set.evs.df || 0,
    sa: set.evs.sa || 0, sd: set.evs.sd || 0, sp: set.evs.sp || 0,
  }
  const ivsMap: Record<string, number> = set.ivs
    ? { hp: set.ivs.hp ?? ivs, at: set.ivs.at ?? ivs, df: set.ivs.df ?? ivs, sa: set.ivs.sa ?? ivs, sd: set.ivs.sd ?? ivs, sp: set.ivs.sp ?? ivs }
    : { hp: ivs, at: ivs, df: ivs, sa: ivs, sd: ivs, sp: ivs }

  const maxHP = calcHP(dexEntry.bs.hp, ivsMap.hp, evs.hp, level)
  const rawStats: Record<string, number> = {
    at: calcStat(bs.at, ivsMap.at, evs.at, level, set.nature, "at"),
    df: calcStat(bs.df, ivsMap.df, evs.df, level, set.nature, "df"),
    sa: calcStat(bs.sa, ivsMap.sa, evs.sa, level, set.nature, "sa"),
    sd: calcStat(bs.sd, ivsMap.sd, evs.sd, level, set.nature, "sd"),
    sp: calcStat(bs.sp, ivsMap.sp, evs.sp, level, set.nature, "sp"),
  }

  const moves: MoveData[] = set.moves.map(moveName => {
    if (!moveName) return { name: '(No Move)', bp: 0, type: 'Normal', category: 'Physical', hits: 1 } satisfies MoveData
    const md = MOVES_ORAS[moveName] || { bp: 0, type: "Normal" }
    return {
      name: moveName,
      bp: md.bp,
      type: md.type,
      category: (md.category as MoveData['category']) ?? "Physical",
      isSpread: md.isSpread,
      isBullet: md.isBullet,
      isSound: md.isSound,
      isPunch: md.isPunch,
      isPulse: md.isPulse,
      isBite: md.isBite,
      isSlicing: md.isSlicing,
      hasSecondaryEffect: md.hasSecondaryEffect,
      makesContact: md.makesContact,
      hasRecoil: md.hasRecoil as MoveData['hasRecoil'],
      hasPriority: md.hasPriority,
      bypassesProtect: md.bypassesProtect,
      hits: md.hits ?? 1,
      isCrit: false,
      isZ: false,
      isMax: false,
    } satisfies MoveData
  })

  const poke: Pokemon = {
    name: effectiveName,
    setName: setLabel,
    type1: effectiveDex.t1,
    type2: effectiveDex.t2 || "",
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
    ability: effectiveDex.abilities[0],
    curAbility: effectiveDex.abilities[0],
    isAbilityActivated: false,
    item: set.item,
    status: "Healthy",
    weight: effectiveDex.w,
    moves,
    isDynamax: false,
    isTerastal: false,
    hasType(type: string) { return this.type1 === type || this.type2 === type },
    resetCurAbility() { this.curAbility = this.ability },
  }

  return poke
}

// --- Build FieldSide ---
export function makeFieldSide(overrides: Partial<FieldSide> = {}, format = "singles", weather = "", terrain = ""): FieldSide {
  return {
    format, weather, terrain,
    isProtect: false, isReflect: false, isLightScreen: false,
    isHelpingHand: false, isTailwind: false, isCharge: false,
    isGravity: false, isFriendGuard: false,
    ...overrides,
  }
}

// --- Pre-calc helpers ---

/** Suppress weather if a Pokemon has Air Lock or Cloud Nine. */
export function checkAirLock(pokemon: Pokemon, fieldState: { weather: string; clearWeather(): void }): void {
  if (pokemon.curAbility === "Air Lock" || pokemon.curAbility === "Cloud Nine") {
    fieldState.clearWeather()
  }
}

/** Blank a Klutz Pokemon's item so it doesn't affect damage. */
export function checkKlutz(pokemon: Pokemon): void {
  if (pokemon.curAbility === "Klutz" && pokemon.item) {
    pokemon.item = "Klutz"
  }
}

// --- Build the mixed side getDamageResult expects ---
function buildAttackSide(attackerSide: FieldSide, defenderSide: FieldSide, weather: string): ModernSide {
  return {
    format: attackerSide.format,
    weather,
    terrain: attackerSide.terrain,
    isGravity: attackerSide.isGravity,
    // Attacker's offensive conditions
    isHelpingHand: attackerSide.isHelpingHand,
    isCharge: attackerSide.isCharge,
    isBattery: false, // Gen 6: no Battery ability
    // Defender's defensive conditions
    isProtect: defenderSide.isProtect,
    isReflect: defenderSide.isReflect,
    isLightScreen: defenderSide.isLightScreen,
    isFriendGuard: defenderSide.isFriendGuard,
    // Gen 8/9 fields — not applicable
    isAuraFairy: false, isAuraDark: false, isAuraBreak: false,
    isMinimized: false, isPowerSpot: false, isSteelySpirit: false,
    faintedCount: 0,
    isRuinTablets: false, isRuinVessel: false, isRuinSword: false, isRuinBeads: false,
  }
}

// --- Wrap getDamageResult output into our DamageResult interface ---
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

// --- Main calculation ---
export function calculateAllMovesGen6(
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
  checkKlutz(p1)
  checkKlutz(p2)

  const weather = fieldState.weather
  const terrain = p1Side.terrain

  // Compute modified stats
  for (const stat of ["df","sd","at","sa"] as const) {
    p1.stats[stat] = getModifiedStat(p1.rawStats[stat], p1.boosts[stat])
    p2.stats[stat] = getModifiedStat(p2.rawStats[stat], p2.boosts[stat])
  }
  p1.stats["sp"] = computeGen6Speed(p1, weather, terrain) * (p1Side.isTailwind ? 2 : 1)
  p2.stats["sp"] = computeGen6Speed(p2, weather, terrain) * (p2Side.isTailwind ? 2 : 1)

  const side1 = buildAttackSide(p1Side, p2Side, weather) // p1 attacks p2
  const side2 = buildAttackSide(p2Side, p1Side, weather) // p2 attacks p1

  const results1: DamageResult[] = p1.moves.map(move => {
    const raw = getDamageResult(p1, p2, move as ModernMove, side1)
    p2.resetCurAbility()
    return enrichResult(raw, move, p2.maxHP)
  })

  const results2: DamageResult[] = p2.moves.map(move => {
    const raw = getDamageResult(p2, p1, move as ModernMove, side2)
    p1.resetCurAbility()
    return enrichResult(raw, move, p1.maxHP)
  })

  return [results1, results2]
}

// --- Helper: find species + set from a set label ---
export function findSetByLabel(label: string): { species: string; set: SetdexEntry } | null {
  for (const [species, sets] of Object.entries(SETDEX_ORAS)) {
    if (label in sets) return { species, set: sets[label] }
  }
  return null
}

// --- Resolve species name for pokedex lookup ---
export function resolveSpeciesName(name: string): string {
  if (POKEDEX_ORAS[name]) return name
  if (name.endsWith('-Mega')) {
    const megaName = `Mega ${name.slice(0, -5)}`
    if (POKEDEX_ORAS[megaName]) return megaName
  }
  if (name.endsWith('-Mega-X') || name.endsWith('-Mega X')) {
    const megaName = `Mega ${name.replace(/-Mega[ -]X$/, '')} X`
    if (POKEDEX_ORAS[megaName]) return megaName
  }
  if (name.endsWith('-Mega-Y') || name.endsWith('-Mega Y')) {
    const megaName = `Mega ${name.replace(/-Mega[ -]Y$/, '')} Y`
    if (POKEDEX_ORAS[megaName]) return megaName
  }
  if (name === 'Kyogre-Primal' || name === 'Primal-Kyogre') return 'Primal Kyogre'
  if (name === 'Groudon-Primal' || name === 'Primal-Groudon') return 'Primal Groudon'
  return name
}
