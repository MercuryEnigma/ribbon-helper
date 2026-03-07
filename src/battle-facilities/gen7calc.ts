// Self-contained Gen 7 (Sun/Moon) damage calculator
// Ported from gen3calc.ts with Gen 7 mechanics:
//   - Physical/Special split per-move
//   - Fairy type, updated type chart
//   - Mega Evolution support
//   - Gen 7 ability/item mechanics

import movesData from '../data/battle-facilities/moves_sm.json'
import pokedexData from '../data/battle-facilities/pokedex_sm.json'
import setdexData from '../data/battle-facilities/setdex_sm.json'

export const MOVES_SM = movesData as Record<string, { bp: number; type: string; category?: string; isSpread?: boolean; isBullet?: boolean; isSound?: boolean; hasSecondaryEffect?: boolean; acc?: number; makesContact?: boolean; hasRecoil?: number | string; hits?: number; hasPriority?: boolean; zp?: number }>
export const POKEDEX_SM = pokedexData as Record<string, PokedexEntry>
export const SETDEX_SM = setdexData as Record<string, Record<string, SetdexEntry>>

// --- Natures ---
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

// --- Gen 7 Type Chart ---
// Physical/Special is per-move in Gen 7, so no category in chart
// Changes from Gen 3: Fairy type added, Steel no longer resists Dark/Ghost
const TYPE_CHART: Record<string, Record<string, number>> = {
  "Normal":   { Normal: 1, Grass: 1, Fire: 1, Water: 1, Electric: 1, Ice: 1, Flying: 1, Bug: 1, Poison: 1, Ground: 1, Rock: 0.5, Fighting: 1, Psychic: 1, Ghost: 0, Dragon: 1, Dark: 1, Steel: 0.5, Fairy: 1 },
  "Grass":    { Normal: 1, Grass: 0.5, Fire: 0.5, Water: 2, Electric: 1, Ice: 1, Flying: 0.5, Bug: 0.5, Poison: 0.5, Ground: 2, Rock: 2, Fighting: 1, Psychic: 1, Ghost: 1, Dragon: 0.5, Dark: 1, Steel: 0.5, Fairy: 1 },
  "Fire":     { Normal: 1, Grass: 2, Fire: 0.5, Water: 0.5, Electric: 1, Ice: 2, Flying: 1, Bug: 2, Poison: 1, Ground: 1, Rock: 0.5, Fighting: 1, Psychic: 1, Ghost: 1, Dragon: 0.5, Dark: 1, Steel: 2, Fairy: 1 },
  "Water":    { Normal: 1, Grass: 0.5, Fire: 2, Water: 0.5, Electric: 1, Ice: 1, Flying: 1, Bug: 1, Poison: 1, Ground: 2, Rock: 2, Fighting: 1, Psychic: 1, Ghost: 1, Dragon: 0.5, Dark: 1, Steel: 1, Fairy: 1 },
  "Electric": { Normal: 1, Grass: 0.5, Fire: 1, Water: 2, Electric: 0.5, Ice: 1, Flying: 2, Bug: 1, Poison: 1, Ground: 0, Rock: 1, Fighting: 1, Psychic: 1, Ghost: 1, Dragon: 0.5, Dark: 1, Steel: 1, Fairy: 1 },
  "Ice":      { Normal: 1, Grass: 2, Fire: 0.5, Water: 0.5, Electric: 1, Ice: 0.5, Flying: 2, Bug: 1, Poison: 1, Ground: 2, Rock: 1, Fighting: 1, Psychic: 1, Ghost: 1, Dragon: 2, Dark: 1, Steel: 0.5, Fairy: 1 },
  "Flying":   { Normal: 1, Grass: 2, Fire: 1, Water: 1, Electric: 0.5, Ice: 1, Flying: 1, Bug: 2, Poison: 1, Ground: 1, Rock: 0.5, Fighting: 2, Psychic: 1, Ghost: 1, Dragon: 1, Dark: 1, Steel: 0.5, Fairy: 1 },
  "Bug":      { Normal: 1, Grass: 2, Fire: 0.5, Water: 1, Electric: 1, Ice: 1, Flying: 0.5, Bug: 1, Poison: 0.5, Ground: 1, Rock: 1, Fighting: 0.5, Psychic: 2, Ghost: 0.5, Dragon: 1, Dark: 2, Steel: 0.5, Fairy: 0.5 },
  "Poison":   { Normal: 1, Grass: 2, Fire: 1, Water: 1, Electric: 1, Ice: 1, Flying: 1, Bug: 1, Poison: 0.5, Ground: 0.5, Rock: 0.5, Fighting: 1, Psychic: 1, Ghost: 0.5, Dragon: 1, Dark: 1, Steel: 0, Fairy: 2 },
  "Ground":   { Normal: 1, Grass: 0.5, Fire: 2, Water: 1, Electric: 2, Ice: 1, Flying: 0, Bug: 0.5, Poison: 2, Ground: 1, Rock: 2, Fighting: 1, Psychic: 1, Ghost: 1, Dragon: 1, Dark: 1, Steel: 2, Fairy: 1 },
  "Rock":     { Normal: 1, Grass: 1, Fire: 2, Water: 1, Electric: 1, Ice: 2, Flying: 2, Bug: 2, Poison: 1, Ground: 0.5, Rock: 1, Fighting: 0.5, Psychic: 1, Ghost: 1, Dragon: 1, Dark: 1, Steel: 0.5, Fairy: 1 },
  "Fighting": { Normal: 2, Grass: 1, Fire: 1, Water: 1, Electric: 1, Ice: 2, Flying: 0.5, Bug: 0.5, Poison: 0.5, Ground: 1, Rock: 2, Fighting: 1, Psychic: 0.5, Ghost: 0, Dragon: 1, Dark: 2, Steel: 2, Fairy: 0.5 },
  "Psychic":  { Normal: 1, Grass: 1, Fire: 1, Water: 1, Electric: 1, Ice: 1, Flying: 1, Bug: 1, Poison: 2, Ground: 1, Rock: 1, Fighting: 2, Psychic: 0.5, Ghost: 1, Dragon: 1, Dark: 0, Steel: 0.5, Fairy: 1 },
  "Ghost":    { Normal: 0, Grass: 1, Fire: 1, Water: 1, Electric: 1, Ice: 1, Flying: 1, Bug: 1, Poison: 1, Ground: 1, Rock: 1, Fighting: 1, Psychic: 2, Ghost: 2, Dragon: 1, Dark: 0.5, Steel: 1, Fairy: 1 },
  "Dragon":   { Normal: 1, Grass: 1, Fire: 1, Water: 1, Electric: 1, Ice: 1, Flying: 1, Bug: 1, Poison: 1, Ground: 1, Rock: 1, Fighting: 1, Psychic: 1, Ghost: 1, Dragon: 2, Dark: 1, Steel: 0.5, Fairy: 0 },
  "Dark":     { Normal: 1, Grass: 1, Fire: 1, Water: 1, Electric: 1, Ice: 1, Flying: 1, Bug: 1, Poison: 1, Ground: 1, Rock: 1, Fighting: 0.5, Psychic: 2, Ghost: 2, Dragon: 1, Dark: 0.5, Steel: 0.5, Fairy: 0.5 },
  "Steel":    { Normal: 1, Grass: 1, Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Flying: 1, Bug: 1, Poison: 1, Ground: 1, Rock: 2, Fighting: 1, Psychic: 1, Ghost: 1, Dragon: 1, Dark: 1, Steel: 0.5, Fairy: 2 },
  "Fairy":    { Normal: 1, Grass: 1, Fire: 0.5, Water: 1, Electric: 1, Ice: 1, Flying: 1, Bug: 1, Poison: 0.5, Ground: 1, Rock: 1, Fighting: 2, Psychic: 1, Ghost: 1, Dragon: 2, Dark: 2, Steel: 0.5, Fairy: 1 },
}

// --- Move data ---
export interface MoveData {
  name: string
  bp: number
  type: string
  category?: "Physical" | "Special"
  isSpread?: boolean
  isBullet?: boolean
  isSound?: boolean
  hasSecondaryEffect?: boolean
  acc?: number
  isCrit?: boolean
  hits?: number
  hasRecoil?: number | "crash"
  makesContact?: boolean
  hasPriority?: boolean
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
  tier?: string
}

// --- Pokemon object ---
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
  terrain: string
  isProtect: boolean
  isReflect: boolean
  isLightScreen: boolean
  isAuroraVeil: boolean
  isHelpingHand: boolean
  isTailwind: boolean
  isCharge: boolean
  isLeechSeed: boolean
  isGravity: boolean
  isVictoryStar: boolean
  isFriendGuard: boolean
  isBattery: boolean
  isZMove: boolean
  spikes: number
  stealthRock: boolean
  toxicSpikes: number
}

// --- Stat calculation (same formula Gen 3+) ---
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

// --- Mega Stone → Mega forme name mapping ---
const MEGA_STONES: Record<string, string> = {}
// Build from pokedex: find entries with hasBaseForme and map their items
for (const [name, entry] of Object.entries(POKEDEX_SM)) {
  if (name.startsWith('Mega ') && entry.hasBaseForme) {
    // Map "Mega X" -> base forme so we can look up by Mega Stone
    // We'll also need the reverse: base+stone -> mega name
  }
}

// Build a map: baseForme + megaStone item → mega pokedex key
// Mega stones follow patterns like "Salamencite", "Charizardite X", etc.
function findMegaForme(baseName: string, item: string): string | null {
  if (!item || !item.endsWith('ite') && !item.endsWith('ite X') && !item.endsWith('ite Y')) return null
  // Search for "Mega BaseName" or "Mega BaseName X/Y"
  const candidates = [`Mega ${baseName}`, `Mega ${baseName} X`, `Mega ${baseName} Y`]
  for (const c of candidates) {
    if (POKEDEX_SM[c]) {
      // Verify it's actually a mega of this base
      if (POKEDEX_SM[c].hasBaseForme === baseName) return c
    }
  }
  return null
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
  // Check for Mega Evolution: if holding a mega stone, use mega stats
  let effectiveDex = dexEntry
  let effectiveName = speciesName
  const megaName = findMegaForme(speciesName, set.item)
  if (megaName && POKEDEX_SM[megaName]) {
    effectiveDex = POKEDEX_SM[megaName]
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

  // HP uses base forme's HP stat (Mega doesn't change HP base)
  const maxHP = calcHP(dexEntry.bs.hp, ivsMap.hp, evs.hp, level)
  const rawStats: Record<string, number> = {
    at: calcStat(bs.at, ivsMap.at, evs.at, level, set.nature, "at"),
    df: calcStat(bs.df, ivsMap.df, evs.df, level, set.nature, "df"),
    sa: calcStat(bs.sa, ivsMap.sa, evs.sa, level, set.nature, "sa"),
    sd: calcStat(bs.sd, ivsMap.sd, evs.sd, level, set.nature, "sd"),
    sp: calcStat(bs.sp, ivsMap.sp, evs.sp, level, set.nature, "sp"),
  }

  const moves = set.moves.map(moveName => {
    if (!moveName) return { name: '(No Move)', bp: 0, type: 'Normal', hits: 1 } satisfies MoveData
    const moveData = MOVES_SM[moveName] || { bp: 0, type: "Normal" }
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
    hasType(type: string) { return this.type1 === type || this.type2 === type },
    resetCurAbility() { this.curAbility = this.ability },
  }

  return poke
}

// --- Build Field Side ---
export function makeFieldSide(overrides: Partial<FieldSide> = {}, format = "singles", weather = "", terrain = ""): FieldSide {
  return {
    format,
    weather,
    terrain,
    isProtect: false,
    isReflect: false,
    isLightScreen: false,
    isAuroraVeil: false,
    isHelpingHand: false,
    isTailwind: false,
    isCharge: false,
    isLeechSeed: false,
    isGravity: false,
    isVictoryStar: false,
    isFriendGuard: false,
    isBattery: false,
    isZMove: false,
    spikes: 0,
    stealthRock: false,
    toxicSpikes: 0,
    ...overrides,
  }
}

// --- Type effectiveness ---
function getMoveEffectiveness(moveType: string, defType: string): number {
  const chart = TYPE_CHART[moveType]
  if (!chart) return 1
  return chart[defType] ?? 1
}

// --- -ate abilities: convert Normal moves to another type ---
const ATE_ABILITIES: Record<string, string> = {
  "Aerilate": "Flying",
  "Pixilate": "Fairy",
  "Refrigerate": "Ice",
  "Galvanize": "Electric",
}

// --- Gen 7 type-boosting items (1.2x in Gen 7) ---
const ITEM_TYPE_BOOSTS: Record<string, string> = {
  "Charcoal": "Fire", "Mystic Water": "Water", "Miracle Seed": "Grass",
  "Magnet": "Electric", "Sharp Beak": "Flying", "Poison Barb": "Poison",
  "Never-Melt Ice": "Ice", "Spell Tag": "Ghost", "Soft Sand": "Ground",
  "Hard Stone": "Rock", "Silver Powder": "Bug", "Dragon Fang": "Dragon",
  "Black Belt": "Fighting", "Silk Scarf": "Normal", "Twisted Spoon": "Psychic",
  "Metal Coat": "Steel", "BlackGlasses": "Dark",
  // Gen 4+ items
  "Odd Incense": "Psychic", "Rock Incense": "Rock", "Rose Incense": "Grass",
  "Sea Incense": "Water", "Wave Incense": "Water",
  // Type plates
  "Draco Plate": "Dragon", "Dread Plate": "Dark", "Earth Plate": "Ground",
  "Fist Plate": "Fighting", "Flame Plate": "Fire", "Icicle Plate": "Ice",
  "Insect Plate": "Bug", "Iron Plate": "Steel", "Meadow Plate": "Grass",
  "Mind Plate": "Psychic", "Pixie Plate": "Fairy", "Sky Plate": "Flying",
  "Splash Plate": "Water", "Spooky Plate": "Ghost", "Stone Plate": "Rock",
  "Toxic Plate": "Poison", "Zap Plate": "Electric",
}

// --- Damage Result ---
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

// --- Gen 7 Damage Calculation ---
export function getDamageResultGen7(
  attacker: Pokemon,
  defender: Pokemon,
  move: MoveData,
  field: FieldSide,
  attackerSide?: FieldSide,
): DamageResult {
  const result: DamageResult = { damage: [0], description: "", move, minDamage: 0, maxDamage: 0, minPercent: 0, maxPercent: 0, defenderMaxHP: defender.maxHP }

  if (move.bp === 0) {
    result.description = `${attacker.name} ${move.name} vs. ${defender.name}`
    return result
  }

  const isZMove = !!attackerSide?.isZMove
  const zPower = isZMove ? (MOVES_SM[move.name]?.zp ?? 0) : 0

  // Protect blocks all damage (Z-Moves deal 25% through Protect)
  if (field.isProtect && !isZMove) {
    result.description = `${attacker.name} ${move.name} vs. ${defender.name} (Protected)`
    return result
  }

  // Determine move type (may be modified by -ate abilities)
  let moveType = move.type
  let atePowerBoost = false
  const ateType = ATE_ABILITIES[attacker.curAbility]
  if (ateType && moveType === "Normal") {
    moveType = ateType
    atePowerBoost = true
  }

  // Physical/Special determined per-move in Gen 7
  const isPhysical = move.category === "Physical" || (!move.category && move.bp > 0)
  const attackStat = isPhysical ? "at" : "sa"
  const defenseStat = isPhysical ? "df" : "sd"

  // Type effectiveness (Gravity removes Flying-type Ground immunity)
  let typeEffect1 = getMoveEffectiveness(moveType, defender.type1)
  let typeEffect2 = defender.type2 ? getMoveEffectiveness(moveType, defender.type2) : 1
  if (field.isGravity && moveType === "Ground") {
    if (defender.type1 === "Flying") typeEffect1 = 1
    if (defender.type2 === "Flying") typeEffect2 = 1
  }
  const typeEffectiveness = typeEffect1 * typeEffect2

  if (typeEffectiveness === 0) {
    result.description = `${attacker.name} ${move.name} vs. ${defender.name}`
    return result
  }

  // Gravity removes Flying-type Ground immunity and Levitate Ground immunity
  const gravityActive = field.isGravity
  // Ability immunities
  if ((defender.curAbility === "Flash Fire" && moveType === "Fire") ||
      (defender.curAbility === "Levitate" && moveType === "Ground" && !gravityActive) ||
      (defender.curAbility === "Volt Absorb" && moveType === "Electric") ||
      (defender.curAbility === "Water Absorb" && moveType === "Water") ||
      (defender.curAbility === "Lightning Rod" && moveType === "Electric") ||
      (defender.curAbility === "Storm Drain" && moveType === "Water") ||
      (defender.curAbility === "Motor Drive" && moveType === "Electric") ||
      (defender.curAbility === "Sap Sipper" && moveType === "Grass") ||
      (defender.curAbility === "Dry Skin" && moveType === "Water") ||
      (defender.curAbility === "Wonder Guard" && typeEffectiveness <= 1) ||
      (defender.curAbility === "Soundproof" && move.isSound) ||
      (defender.curAbility === "Bulletproof" && move.isBullet)) {
    result.description = `${attacker.name} ${move.name} vs. ${defender.name} (${defender.curAbility})`
    return result
  }

  let basePower = (isZMove && zPower > 0) ? zPower : move.bp

  // -ate ability power boost (1.2x in Gen 7)
  if (atePowerBoost) {
    basePower = Math.floor(basePower * 1.2)
  }

  // Stance Change: Aegislash switches to Blade forme when attacking
  // We handle this by using Blade stats if the attacker is Aegislash
  let at = attacker.rawStats[attackStat]
  let df = defender.rawStats[defenseStat]

  // Aegislash Stance Change: use Blade forme offensive stats when attacking
  if (attacker.curAbility === "Stance Change" && attacker.name === "Aegislash") {
    const bladeDex = POKEDEX_SM["Aegislash-Blade"]
    if (bladeDex) {
      const bs = bladeDex.bs
      const statName = attackStat
      at = calcStat(bs[statName as keyof BaseStats], attacker.ivs[statName], attacker.evs[statName], attacker.level, attacker.nature, statName)
    }
  }
  // Aegislash defending: use Shield stats (already default)

  // Attack modifiers
  if (isPhysical && (attacker.curAbility === "Huge Power" || attacker.curAbility === "Pure Power")) {
    at *= 2
  }
  if (isPhysical && attacker.curAbility === "Hustle") {
    at = Math.floor(at * 1.5)
  }
  if (isPhysical && attacker.curAbility === "Guts" && attacker.status !== "Healthy") {
    at = Math.floor(at * 1.5)
  }

  // Item modifiers on attack stat
  if (isPhysical && attacker.item === "Choice Band") {
    at = Math.floor(at * 1.5)
  } else if (!isPhysical && attacker.item === "Choice Specs") {
    at = Math.floor(at * 1.5)
  }

  // Type-boosting items (1.2x in Gen 7)
  const itemBoostType = ITEM_TYPE_BOOSTS[attacker.item]
  if (itemBoostType === moveType) {
    basePower = Math.floor(basePower * 1.2)
  }

  // Defense modifiers
  if (!isPhysical && defender.item === "Assault Vest") {
    df = Math.floor(df * 1.5)
  }

  // Thick Fat
  if (defender.curAbility === "Thick Fat" && (moveType === "Fire" || moveType === "Ice")) {
    at = Math.floor(at / 2)
  }

  // Fur Coat (doubles defense)
  if (isPhysical && defender.curAbility === "Fur Coat") {
    df *= 2
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

  // Base damage formula (same as Gen 3+)
  let baseDamage = Math.floor(Math.floor(Math.floor(2 * attacker.level / 5 + 2) * at * basePower / df) / 50) + 2

  // Burn (Gen 7: halves physical damage unless Guts)
  if (attacker.status === "Burned" && isPhysical && attacker.curAbility !== "Guts") {
    baseDamage = Math.floor(baseDamage / 2)
  }

  // Screens (Z-Moves bypass screens)
  if (!move.isCrit && !isZMove) {
    const hasScreen = (isPhysical && field.isReflect) || (!isPhysical && field.isLightScreen) || field.isAuroraVeil
    if (hasScreen) {
      if (field.format === "singles") {
        baseDamage = Math.floor(baseDamage / 2)
      } else {
        baseDamage = Math.floor(baseDamage * 2 / 3)
      }
    }
  }

  // Doubles spread move penalty (0.75x in Gen 7)
  if (field.format === "doubles" && move.isSpread) {
    baseDamage = Math.floor(baseDamage * 0.75)
  }

  // Weather
  if ((field.weather === "Sun" && moveType === "Fire") || (field.weather === "Rain" && moveType === "Water")) {
    baseDamage = Math.floor(baseDamage * 1.5)
  } else if ((field.weather === "Sun" && moveType === "Water") || (field.weather === "Rain" && moveType === "Fire")) {
    baseDamage = Math.floor(baseDamage / 2)
  }

  // Terrain (Gravity grounds all Pokemon, making terrain apply to Flying/Levitate users)
  const attackerGrounded = gravityActive || (!attacker.hasType("Flying") && attacker.curAbility !== "Levitate")
  const defenderGrounded = gravityActive || (!defender.hasType("Flying") && defender.curAbility !== "Levitate")
  if (field.terrain === "Electric" && moveType === "Electric" && attackerGrounded) {
    baseDamage = Math.floor(baseDamage * 1.5)
  } else if (field.terrain === "Grassy" && moveType === "Grass" && attackerGrounded) {
    baseDamage = Math.floor(baseDamage * 1.5)
  } else if (field.terrain === "Psychic" && moveType === "Psychic" && attackerGrounded) {
    baseDamage = Math.floor(baseDamage * 1.5)
  } else if (field.terrain === "Misty" && moveType === "Dragon" && defenderGrounded) {
    baseDamage = Math.floor(baseDamage / 2)
  }

  // Flash Fire
  if (attacker.curAbility === "Flash Fire" && attacker.isAbilityActivated && moveType === "Fire") {
    baseDamage = Math.floor(baseDamage * 1.5)
  }

  // Critical hit (1.5x in Gen 6+)
  if (move.isCrit) {
    baseDamage = Math.floor(baseDamage * 1.5)
  }

  // Charge (doubles Electric-type damage for the attacker)
  if (attackerSide?.isCharge && moveType === "Electric") {
    baseDamage = Math.floor(baseDamage * 2)
  }

  // Helping Hand (on attacker's side)
  if (attackerSide?.isHelpingHand || field.isHelpingHand) {
    baseDamage = Math.floor(baseDamage * 1.5)
  }

  // Life Orb (1.3x)
  if (attacker.item === "Life Orb") {
    baseDamage = Math.floor(baseDamage * 5324 / 4096)
  }

  // Expert Belt (1.2x on super effective)
  if (attacker.item === "Expert Belt" && typeEffectiveness > 1) {
    baseDamage = Math.floor(baseDamage * 1.2)
  }

  // STAB
  if (attacker.hasType(moveType)) {
    if (attacker.curAbility === "Adaptability") {
      baseDamage = Math.floor(baseDamage * 2)
    } else {
      baseDamage = Math.floor(baseDamage * 1.5)
    }
  }

  // Type effectiveness (applied multiplicatively)
  baseDamage = Math.floor(baseDamage * typeEffect1)
  baseDamage = Math.floor(baseDamage * typeEffect2)

  // Filter ability (halves damage of super-effective moves)
  if (defender.curAbility === "Filter" || defender.curAbility === "Solid Rock" || defender.curAbility === "Prism Armor") {
    if (typeEffectiveness > 1) {
      baseDamage = Math.floor(baseDamage * 0.75)
    }
  }

  // Battery (ally's ability boosts special moves by 30%)
  if (attackerSide?.isBattery && !isPhysical) {
    baseDamage = Math.floor(baseDamage * 1.3)
  }

  // Friend Guard (ally's ability reduces damage by 25%)
  if (field.isFriendGuard) {
    baseDamage = Math.floor(baseDamage * 0.75)
  }

  // Damage roll (85% to 100%)
  const damage: number[] = []
  for (let i = 85; i <= 100; i++) {
    damage[i - 85] = Math.max(1, Math.floor(baseDamage * i / 100))
  }

  // Z-Moves deal 25% damage through Protect
  if (field.isProtect && isZMove) {
    for (let i = 0; i < damage.length; i++) {
      damage[i] = Math.max(1, Math.floor(damage[i] / 4))
    }
  }

  // Parental Bond: add second hit at 25% power (Z-Moves don't trigger second hit)
  if (attacker.curAbility === "Parental Bond" && move.bp > 0 && !move.isSpread && !isZMove) {
    for (let i = 0; i < 16; i++) {
      damage[i] += Math.max(1, Math.floor(damage[i] * 0.25))
    }
  }

  // Description
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
export function calculateAllMovesGen7(
  p1: Pokemon,
  p2: Pokemon,
  p1Side: FieldSide,
  p2Side: FieldSide,
): [DamageResult[], DamageResult[]] {
  const results1 = p1.moves.map(move => getDamageResultGen7(p1, p2, move, p2Side, p1Side))
  const results2 = p2.moves.map(move => getDamageResultGen7(p2, p1, move, p1Side, p2Side))
  return [results1, results2]
}

// --- Helper: find species + set from a set label ---
export function findSetByLabel(label: string): { species: string; set: SetdexEntry } | null {
  for (const [species, sets] of Object.entries(SETDEX_SM)) {
    if (label in sets) {
      return { species, set: sets[label] }
    }
  }
  return null
}

// --- Resolve species name for pokedex lookup ---
// Handles "Salamence-Mega" → "Mega Salamence", "Raichu-Alola" → "Raichu-Alola"
export function resolveSpeciesName(name: string): string {
  if (POKEDEX_SM[name]) return name
  // Try "Species-Mega" → "Mega Species"
  if (name.endsWith('-Mega')) {
    const base = name.slice(0, -5)
    const megaName = `Mega ${base}`
    if (POKEDEX_SM[megaName]) return megaName
  }
  if (name.endsWith('-Mega-X') || name.endsWith('-Mega X')) {
    const base = name.replace(/-Mega[ -]X$/, '')
    const megaName = `Mega ${base} X`
    if (POKEDEX_SM[megaName]) return megaName
  }
  if (name.endsWith('-Mega-Y') || name.endsWith('-Mega Y')) {
    const base = name.replace(/-Mega[ -]Y$/, '')
    const megaName = `Mega ${base} Y`
    if (POKEDEX_SM[megaName]) return megaName
  }
  return name
}
