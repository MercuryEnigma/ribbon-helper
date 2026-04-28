// BDSP (Brilliant Diamond / Shining Pearl) battle facility calculator.
// Uses gen7-damage-modern.ts as the damage engine (1.5x crits, Fairy type, Gen 6+ type chart).
// No Z-moves, no Mega Evolution, no Battery (none exist in BDSP).

import movesData from '../data/battle-facilities/bdsp/moves_bdsp.json'
import pokedexData from '../data/battle-facilities/bdsp/pokedex_bdsp.json'
import setdexData from '../data/battle-facilities/bdsp/setdex_bdsp.json'
import {
  getDamageResult,
  getModifiedStat,
  computeGen7Speed,
  type ModernPokemon,
  type ModernMove,
  type ModernSide,
} from '../damage-calc/gen7-damage-modern'

export { computeGen7Speed as computeBDSPSpeed }

export const MOVES_BDSP = movesData as unknown as Record<string, { bp: number; type: string; category?: string; isSpread?: boolean; isBullet?: boolean; isSound?: boolean; isPunch?: boolean; isPulse?: boolean; isBite?: boolean; isSlicing?: boolean; hasSecondaryEffect?: boolean; acc?: number; makesContact?: boolean; hasRecoil?: number | string; hits?: number; hasPriority?: boolean; bypassesProtect?: boolean }>
export const POKEDEX_BDSP = pokedexData as Record<string, PokedexEntry>
export const SETDEX_BDSP = setdexData as Record<string, Record<string, SetdexEntry>>

// --- Natures ---
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
  ability?: string // BDSP setdex includes per-set ability
  tier?: string
}

// --- Pokemon interface ---
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
// BDSP has terrain, Aurora Veil, Friend Guard but no Battery.
export interface FieldSide {
  format: string
  weather: string
  terrain: string
  isProtect: boolean
  isReflect: boolean
  isLightScreen: boolean
  isAuroraVeil: boolean
  isHelpingHand: boolean
  isTailwind: boolean
  isCharge: boolean
  isGravity: boolean
  isFriendGuard: boolean
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
    const md = MOVES_BDSP[moveName] || { bp: 0, type: "Normal" }
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

  const ability = set.ability ?? dexEntry.abilities[0]

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
    ability,
    curAbility: ability,
    isAbilityActivated: false,
    item: set.item,
    status: "Healthy",
    weight: dexEntry.w,
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
    isProtect: false, isReflect: false, isLightScreen: false, isAuroraVeil: false,
    isHelpingHand: false, isTailwind: false, isCharge: false,
    isGravity: false, isFriendGuard: false,
    ...overrides,
  }
}

// --- Pre-calc helpers ---

export function checkAirLock(pokemon: Pokemon, fieldState: { weather: string; clearWeather(): void }): void {
  if (pokemon.curAbility === "Air Lock" || pokemon.curAbility === "Cloud Nine") {
    fieldState.clearWeather()
  }
}

export function checkKlutz(pokemon: Pokemon): void {
  if (pokemon.curAbility === "Klutz" && pokemon.item) {
    pokemon.item = "Klutz"
  }
}

// --- Build the mixed side getDamageResult expects ---
// Aurora Veil collapses to isReflect + isLightScreen on the defender's side.
// Battery is always false in BDSP (no Pokemon have it).
function buildAttackSide(attackerSide: FieldSide, defenderSide: FieldSide, weather: string): ModernSide {
  return {
    format: attackerSide.format,
    weather,
    terrain: attackerSide.terrain,
    isGravity: attackerSide.isGravity,
    isHelpingHand: attackerSide.isHelpingHand,
    isCharge: attackerSide.isCharge,
    isBattery: false,
    isProtect: defenderSide.isProtect,
    isReflect: defenderSide.isReflect || defenderSide.isAuroraVeil,
    isLightScreen: defenderSide.isLightScreen || defenderSide.isAuroraVeil,
    isFriendGuard: defenderSide.isFriendGuard,
    isAuraFairy: false, isAuraDark: false, isAuraBreak: false,
    isMinimized: false, isPowerSpot: false, isSteelySpirit: false,
    faintedCount: 0,
    isRuinTablets: false, isRuinVessel: false, isRuinSword: false, isRuinBeads: false,
  }
}

// --- Wrap result ---
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
export function calculateAllMovesBDSP(
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
  const terrain = p1Side.terrain

  for (const stat of ["df","sd","at","sa"] as const) {
    p1.stats[stat] = getModifiedStat(p1.rawStats[stat], p1.boosts[stat])
    p2.stats[stat] = getModifiedStat(p2.rawStats[stat], p2.boosts[stat])
  }
  p1.stats["sp"] = computeGen7Speed(p1, weather, terrain) * (p1Side.isTailwind ? 2 : 1)
  p2.stats["sp"] = computeGen7Speed(p2, weather, terrain) * (p2Side.isTailwind ? 2 : 1)

  const side1 = buildAttackSide(p1Side, p2Side, weather)
  const side2 = buildAttackSide(p2Side, p1Side, weather)

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
  for (const [species, sets] of Object.entries(SETDEX_BDSP)) {
    if (label in sets) return { species, set: sets[label] }
  }
  return null
}

// --- Resolve species name for pokedex lookup ---
export function resolveSpeciesName(name: string): string {
  return POKEDEX_BDSP[name] ? name : name
}
