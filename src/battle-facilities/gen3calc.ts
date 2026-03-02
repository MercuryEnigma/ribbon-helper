// Self-contained Gen 3 (Emerald) damage calculator
// Ported from damage-calc/_scripts/damage_gen3.js without jQuery/DOM dependencies

import movesData from '../data/battle-facilities/moves_em.json'
import pokedexData from '../data/battle-facilities/pokedex_em.json'
import setdexData from '../data/battle-facilities/setdex_em.json'

export const MOVES_ADV = movesData as Record<string, { bp: number; type: string; category?: string; isSpread?: boolean; isBullet?: boolean; isSound?: boolean; isMLG?: boolean; hasSecondaryEffect?: boolean; acc?: number; makesContact?: boolean; hasRecoil?: number | string; hits?: number; isTwoHit?: boolean; isThreeHit?: boolean; maxMultiHits?: number; alwaysCrit?: boolean; percentHealed?: number }>
export const POKEDEX_ADV = pokedexData as Record<string, PokedexEntry>
export const SETDEX_EM = setdexData as Record<string, Record<string, SetdexEntry>>

// --- Natures: [boosted stat, reduced stat] ---
const NATURES: Record<string, [string, string]> = {
  "Adamant": ["at", "sa"], "Bashful": ["", ""], "Bold": ["df", "at"],
  "Brave": ["at", "sp"], "Calm": ["sd", "at"], "Careful": ["sd", "sa"],
  "Docile": ["", ""], "Gentle": ["sd", "df"], "Hardy": ["", ""],
  "Hasty": ["sp", "df"], "Impish": ["df", "sa"], "Jolly": ["sp", "sa"],
  "Lax": ["df", "sd"], "Lonely": ["at", "df"], "Mild": ["sa", "df"],
  "Modest": ["sa", "at"], "Naive": ["sp", "sd"], "Naughty": ["at", "sd"],
  "Quiet": ["sa", "sp"], "Quirky": ["", ""], "Rash": ["sa", "sd"],
  "Relaxed": ["df", "sp"], "Sassy": ["sd", "sp"], "Serious": ["", ""],
  "Timid": ["sp", "at"],
}

// --- Gen 3 Type Chart (RBY + Dark/Steel additions) ---
const TYPE_CHART: Record<string, Record<string, number | string>> = {
  "Normal":   { category: "Physical", Normal: 1, Grass: 1, Fire: 1, Water: 1, Electric: 1, Ice: 1, Flying: 1, Bug: 1, Poison: 1, Ground: 1, Rock: 0.5, Fighting: 1, Psychic: 1, Ghost: 0, Dragon: 1, Dark: 1, Steel: 0.5 },
  "Grass":    { category: "Special",  Normal: 1, Grass: 0.5, Fire: 0.5, Water: 2, Electric: 1, Ice: 1, Flying: 0.5, Bug: 0.5, Poison: 0.5, Ground: 2, Rock: 2, Fighting: 1, Psychic: 1, Ghost: 1, Dragon: 0.5, Dark: 1, Steel: 0.5 },
  "Fire":     { category: "Special",  Normal: 1, Grass: 2, Fire: 0.5, Water: 0.5, Electric: 1, Ice: 2, Flying: 1, Bug: 2, Poison: 1, Ground: 1, Rock: 0.5, Fighting: 1, Psychic: 1, Ghost: 1, Dragon: 0.5, Dark: 1, Steel: 2 },
  "Water":    { category: "Special",  Normal: 1, Grass: 0.5, Fire: 2, Water: 0.5, Electric: 1, Ice: 1, Flying: 1, Bug: 1, Poison: 1, Ground: 2, Rock: 2, Fighting: 1, Psychic: 1, Ghost: 1, Dragon: 0.5, Dark: 1, Steel: 1 },
  "Electric": { category: "Special",  Normal: 1, Grass: 0.5, Fire: 1, Water: 2, Electric: 0.5, Ice: 1, Flying: 2, Bug: 1, Poison: 1, Ground: 0, Rock: 1, Fighting: 1, Psychic: 1, Ghost: 1, Dragon: 0.5, Dark: 1, Steel: 1 },
  "Ice":      { category: "Special",  Normal: 1, Grass: 2, Fire: 0.5, Water: 0.5, Electric: 1, Ice: 0.5, Flying: 2, Bug: 1, Poison: 1, Ground: 2, Rock: 1, Fighting: 1, Psychic: 1, Ghost: 1, Dragon: 2, Dark: 1, Steel: 0.5 },
  "Flying":   { category: "Physical", Normal: 1, Grass: 2, Fire: 1, Water: 1, Electric: 0.5, Ice: 1, Flying: 1, Bug: 2, Poison: 1, Ground: 1, Rock: 0.5, Fighting: 2, Psychic: 1, Ghost: 1, Dragon: 1, Dark: 1, Steel: 0.5 },
  "Bug":      { category: "Physical", Normal: 1, Grass: 2, Fire: 0.5, Water: 1, Electric: 1, Ice: 1, Flying: 0.5, Bug: 1, Poison: 0.5, Ground: 1, Rock: 1, Fighting: 0.5, Psychic: 2, Ghost: 0.5, Dragon: 1, Dark: 2, Steel: 0.5 },
  "Poison":   { category: "Physical", Normal: 1, Grass: 2, Fire: 1, Water: 1, Electric: 1, Ice: 1, Flying: 1, Bug: 1, Poison: 0.5, Ground: 0.5, Rock: 0.5, Fighting: 1, Psychic: 1, Ghost: 0.5, Dragon: 1, Dark: 1, Steel: 0 },
  "Ground":   { category: "Physical", Normal: 1, Grass: 0.5, Fire: 2, Water: 1, Electric: 2, Ice: 1, Flying: 0, Bug: 0.5, Poison: 2, Ground: 1, Rock: 2, Fighting: 1, Psychic: 1, Ghost: 1, Dragon: 1, Dark: 1, Steel: 2 },
  "Rock":     { category: "Physical", Normal: 1, Grass: 1, Fire: 2, Water: 1, Electric: 1, Ice: 2, Flying: 2, Bug: 2, Poison: 1, Ground: 0.5, Rock: 1, Fighting: 0.5, Psychic: 1, Ghost: 1, Dragon: 1, Dark: 1, Steel: 0.5 },
  "Fighting": { category: "Physical", Normal: 2, Grass: 1, Fire: 1, Water: 1, Electric: 1, Ice: 2, Flying: 0.5, Bug: 0.5, Poison: 0.5, Ground: 1, Rock: 2, Fighting: 1, Psychic: 0.5, Ghost: 0, Dragon: 1, Dark: 2, Steel: 2 },
  "Psychic":  { category: "Special",  Normal: 1, Grass: 1, Fire: 1, Water: 1, Electric: 1, Ice: 1, Flying: 1, Bug: 1, Poison: 2, Ground: 1, Rock: 1, Fighting: 2, Psychic: 0.5, Ghost: 1, Dragon: 1, Dark: 0, Steel: 0.5 },
  "Ghost":    { category: "Physical", Normal: 0, Grass: 1, Fire: 1, Water: 1, Electric: 1, Ice: 1, Flying: 1, Bug: 1, Poison: 1, Ground: 1, Rock: 1, Fighting: 1, Psychic: 2, Ghost: 2, Dragon: 1, Dark: 0.5, Steel: 0.5 },
  "Dragon":   { category: "Special",  Normal: 1, Grass: 1, Fire: 1, Water: 1, Electric: 1, Ice: 1, Flying: 1, Bug: 1, Poison: 1, Ground: 1, Rock: 1, Fighting: 1, Psychic: 1, Ghost: 1, Dragon: 2, Dark: 1, Steel: 0.5 },
  "Dark":     { category: "Special",  Normal: 1, Grass: 1, Fire: 1, Water: 1, Electric: 1, Ice: 1, Flying: 1, Bug: 1, Poison: 1, Ground: 1, Rock: 1, Fighting: 0.5, Psychic: 2, Ghost: 2, Dragon: 1, Dark: 0.5, Steel: 0.5 },
  "Steel":    { category: "Physical", Normal: 1, Grass: 1, Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Flying: 1, Bug: 1, Poison: 1, Ground: 1, Rock: 2, Fighting: 1, Psychic: 1, Ghost: 1, Dragon: 1, Dark: 1, Steel: 0.5 },
}

// --- Move data for Gen 3 ---
export interface MoveData {
  name: string
  bp: number
  type: string
  category?: "Physical" | "Special"
  isSpread?: boolean
  isBullet?: boolean
  isSound?: boolean
  isMLG?: boolean
  hasSecondaryEffect?: boolean
  acc?: number
  isCrit?: boolean
  hits?: number
  hasRecoil?: number | "crash"
  makesContact?: boolean
}

// --- Pokedex data ---
export interface BaseStats {
  hp: number
  at: number
  df: number
  sa: number
  sd: number
  sp: number
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

// --- Pokemon object (matches the structure expected by the damage calc) ---
export interface Pokemon {
  name: string
  setName: string
  type1: string
  type2: string
  level: number
  maxHP: number
  curHP: number
  HPEVs: number
  rawStats: Record<string, number>
  boosts: Record<string, number>
  stats: Record<string, number>
  evs: Record<string, number>
  ivs: Record<string, number>
  nature: string
  ability: string
  curAbility: string
  isAbilityActivated: boolean
  item: string
  status: string
  weight: number
  moves: MoveData[]
  hasType: (type: string) => boolean
  resetCurAbility: () => void
}

// --- Field / Side ---
export interface FieldSide {
  format: string
  weather: string
  isReflect: boolean
  isLightScreen: boolean
  isHelpingHand: boolean
  isCharge: boolean
  isSeeded: boolean
  spikes: number
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

function getModifiedStat(stat: number, mod: number): number {
  if (mod > 0) return Math.floor(stat * (2 + mod) / 2)
  if (mod < 0) return Math.floor(stat * 2 / (2 - mod))
  return stat
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

  const moves = set.moves.map(moveName => {
    const moveData = MOVES_ADV[moveName] || { bp: 0, type: "Normal" }
    return {
      ...moveData,
      name: moveName,
      category: moveData.category as MoveData['category'],
      hasRecoil: moveData.hasRecoil as MoveData['hasRecoil'],
      isCrit: false,
      hits: 1,
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

// --- Build a minimal Field ---
export function makeFieldSide(overrides: Partial<FieldSide> = {}, format = "singles", weather = ""): FieldSide {
  return {
    format,
    weather,
    isReflect: false,
    isLightScreen: false,
    isHelpingHand: false,
    isCharge: false,
    isSeeded: false,
    spikes: 0,
    ...overrides,
  }
}

export function buildField(format: string = "singles", weather: string = ""): {
  getWeather: () => string
  getSide: (i: number) => FieldSide
} {
  return {
    getWeather: () => weather,
    getSide: () => makeFieldSide({}, format, weather),
  }
}

// --- Type effectiveness ---
function getMoveEffectiveness(moveType: string, defType: string): number {
  const chart = TYPE_CHART[moveType]
  if (!chart) return 1
  const eff = chart[defType]
  return typeof eff === "number" ? eff : 1
}

// --- Item boost type helper ---
const ITEM_TYPE_BOOSTS: Record<string, string> = {
  "Charcoal": "Fire", "Mystic Water": "Water", "Miracle Seed": "Grass",
  "Magnet": "Electric", "Sharp Beak": "Flying", "Poison Barb": "Poison",
  "Never-Melt Ice": "Ice", "Spell Tag": "Ghost", "Soft Sand": "Ground",
  "Hard Stone": "Rock", "Silver Powder": "Bug", "Dragon Fang": "Dragon",
  "Black Belt": "Fighting", "Silk Scarf": "Normal", "Twisted Spoon": "Psychic",
  "Metal Coat": "Steel", "BlackGlasses": "Dark",
}

// --- Gen 3 damage calculation (ported from damage_gen3.js getDamageResultADV) ---
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

export function getDamageResultGen3(
  attacker: Pokemon,
  defender: Pokemon,
  move: MoveData,
  field: FieldSide,
): DamageResult {
  const result = { damage: [0], description: "", move, minDamage: 0, maxDamage: 0, minPercent: 0, maxPercent: 0, defenderMaxHP: defender.maxHP }

  if (move.bp === 0) {
    result.description = `${attacker.name} ${move.name} vs. ${defender.name}`
    return result
  }

  const moveType = move.type

  // Type effectiveness
  const typeEffect1 = getMoveEffectiveness(moveType, defender.type1)
  const typeEffect2 = defender.type2 ? getMoveEffectiveness(moveType, defender.type2) : 1
  const typeEffectiveness = typeEffect1 * typeEffect2

  if (typeEffectiveness === 0) {
    result.description = `${attacker.name} ${move.name} vs. ${defender.name}`
    return result
  }

  // Ability immunities
  if ((defender.curAbility === "Flash Fire" && moveType === "Fire") ||
      (defender.curAbility === "Levitate" && moveType === "Ground") ||
      (defender.curAbility === "Volt Absorb" && moveType === "Electric") ||
      (defender.curAbility === "Water Absorb" && moveType === "Water") ||
      (defender.curAbility === "Wonder Guard" && typeEffectiveness <= 1) ||
      (defender.curAbility === "Soundproof" && move.isSound)) {
    result.description = `${attacker.name} ${move.name} vs. ${defender.name} (${defender.curAbility})`
    return result
  }

  // Physical/Special split (Gen 3: determined by type)
  const isPhysical = moveType === "None" || TYPE_CHART[moveType]?.category === "Physical"
  const attackStat = isPhysical ? "at" : "sa"
  const defenseStat = isPhysical ? "df" : "sd"

  let at = attacker.rawStats[attackStat]
  let df = defender.rawStats[defenseStat]
  const basePower = move.bp

  // Attack modifiers
  if (isPhysical && (attacker.ability === "Huge Power" || attacker.ability === "Pure Power")) {
    at *= 2
  }

  const itemBoostType = ITEM_TYPE_BOOSTS[attacker.item]
  if (attacker.item !== "Sea Incense" && itemBoostType === moveType) {
    at = Math.floor(at * 1.1)
  } else if (attacker.item === "Sea Incense" && moveType === "Water") {
    at = Math.floor(at * 1.05)
  } else if (isPhysical && attacker.item === "Choice Band") {
    at = Math.floor(at * 1.5)
  } else if (!isPhysical && attacker.item === "Deep Sea Tooth" && attacker.name === "Clamperl") {
    at *= 2
  } else if (isPhysical && attacker.item === "Thick Club" && (attacker.name === "Cubone" || attacker.name === "Marowak")) {
    at *= 2
  }

  // Defense modifiers
  if (!isPhysical && defender.item === "Deep Sea Scale" && defender.name === "Clamperl") {
    df *= 2
  }

  // Ability defense modifiers
  if (defender.curAbility === "Thick Fat" && (moveType === "Fire" || moveType === "Ice")) {
    at = Math.floor(at / 2)
  }

  if (isPhysical && (attacker.ability === "Hustle" || (attacker.ability === "Guts" && attacker.status !== "Healthy"))) {
    at = Math.floor(at * 1.5)
  }

  // Explosion/Self-Destruct halves defense
  if (move.name === "Explosion" || move.name === "Self-Destruct") {
    df = Math.floor(df / 2)
  }

  // Stat boosts
  const attackBoost = attacker.boosts[attackStat]
  const defenseBoost = defender.boosts[defenseStat]
  if (attackBoost > 0 || (!move.isCrit && attackBoost < 0)) {
    at = getModifiedStat(at, attackBoost)
  }
  if (defenseBoost < 0 || (!move.isCrit && defenseBoost > 0)) {
    df = getModifiedStat(df, defenseBoost)
  }

  // Base damage formula
  let baseDamage = Math.floor(Math.floor(Math.floor(2 * attacker.level / 5 + 2) * at * basePower / df) / 50)

  // Burn
  if (attacker.status === "Burned" && isPhysical && attacker.ability !== "Guts") {
    baseDamage = Math.floor(baseDamage / 2)
  }

  // Screens
  if (!move.isCrit) {
    if ((field.isReflect && isPhysical) || (field.isLightScreen && !isPhysical)) {
      if (field.format === "singles") {
        baseDamage = Math.floor(baseDamage / 2)
      } else {
        baseDamage = Math.floor(baseDamage * 2 / 3)
      }
    }
  }

  // Doubles spread (Gen 3 specific exceptions)
  if (field.format === "doubles" && move.isSpread &&
      !["Explosion", "Self-Destruct", "Earthquake", "Magnitude"].includes(move.name)) {
    baseDamage = Math.floor(baseDamage / 2)
  }

  // Weather
  if ((field.weather === "Sun" && moveType === "Fire") || (field.weather === "Rain" && moveType === "Water")) {
    baseDamage = Math.floor(baseDamage * 1.5)
  } else if ((field.weather === "Sun" && moveType === "Water") || (field.weather === "Rain" && moveType === "Fire")) {
    baseDamage = Math.floor(baseDamage / 2)
  }

  // Flash Fire
  if (attacker.ability === "Flash Fire" && attacker.isAbilityActivated && moveType === "Fire") {
    baseDamage = Math.floor(baseDamage * 1.5)
  }

  baseDamage = Math.max(1, baseDamage) + 2

  // Critical hit
  if (move.isCrit) {
    baseDamage *= 2
  }

  // Charge
  if (field.isCharge && moveType === "Electric") {
    baseDamage *= 2
  }

  // Helping Hand
  if (field.isHelpingHand) {
    baseDamage = Math.floor(baseDamage * 1.5)
  }

  // STAB
  if (attacker.hasType(moveType)) {
    baseDamage = Math.floor(baseDamage * 1.5)
  }

  // Type effectiveness
  baseDamage = Math.floor(baseDamage * typeEffect1)
  baseDamage = Math.floor(baseDamage * typeEffect2)

  // Damage roll (85% to 100%)
  const damage: number[] = []
  for (let i = 85; i <= 100; i++) {
    damage[i - 85] = Math.max(1, Math.floor(baseDamage * i / 100))
  }

  // Build EV description
  const atkNatureMod = NATURES[attacker.nature]
  const defNatureMod = NATURES[defender.nature]
  const atkEVLabel = attacker.evs[attackStat] +
    (atkNatureMod?.[0] === attackStat ? "+" : atkNatureMod?.[1] === attackStat ? "-" : "") +
    " " + statLabel(attackStat)
  const defEVLabel = defender.evs[defenseStat] +
    (defNatureMod?.[0] === defenseStat ? "+" : defNatureMod?.[1] === defenseStat ? "-" : "") +
    " " + statLabel(defenseStat)

  const description = `${atkEVLabel} ${attacker.name} ${move.name} vs. ${defender.HPEVs} HP / ${defEVLabel} ${defender.name}`

  const minDamage = damage[0]
  const maxDamage = damage[damage.length - 1]

  return {
    damage,
    description,
    move,
    minDamage,
    maxDamage,
    minPercent: Math.round(minDamage * 1000 / defender.maxHP) / 10,
    maxPercent: Math.round(maxDamage * 1000 / defender.maxHP) / 10,
    defenderMaxHP: defender.maxHP,
  }
}

function statLabel(stat: string): string {
  switch (stat) {
    case "at": return "Atk"
    case "df": return "Def"
    case "sa": return "SpA"
    case "sd": return "SpD"
    case "sp": return "Spe"
    default: return stat
  }
}

// --- Calculate all moves for both sides ---
export function calculateAllMovesGen3(
  p1: Pokemon,
  p2: Pokemon,
  p1Side: FieldSide,
  p2Side: FieldSide,
): [DamageResult[], DamageResult[]] {
  // p1 attacks into p2's side (p2Side has screens etc that defend p2)
  const results1 = p1.moves.map(move => getDamageResultGen3(p1, p2, move, p2Side))
  // p2 attacks into p1's side (p1Side has screens etc that defend p1)
  const results2 = p2.moves.map(move => getDamageResultGen3(p2, p1, move, p1Side))
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
