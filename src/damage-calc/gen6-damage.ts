// Adapted from gen7-damage-modern.ts for Gen 6 (ORAS/XY) Battle Maison use.
// Key Gen 6 differences vs Gen 7:
//   - No Z-moves
//   - No Aurora Veil
//   - No Battery ability
//   - Parental Bond second hit = 50% (not 25%)
//   - No Psychic Terrain (only Electric, Grassy, Misty)
//   - Paralysis speed = /4 in computeGen6Speed (not /2)
//   - Slush Rush / Surge Surfer are Gen 7+ abilities (removed from speed calc)

// --- Gen 6 constants ---
const gen = 6
const AT = "at", DF = "df", SA = "sa", SD = "sd", SP = "sp"
const STRIKE_TEXT = "strike"
const ATTACK_TEXT = "attack"

// --- Module-level mutable state (mirrors damage_modern.js module globals) ---
let moveType: string
let moveCategory: string
let makesContact: boolean
let isCritical: boolean
let attackerGrounded: boolean
let defenderGrounded: boolean
let originalSABoost = 0
let isFirstHit = true

// --- Interfaces ---

export interface ModernPokemon {
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
  nature: string
  ability: string
  curAbility: string
  isAbilityActivated: boolean | "indeterminate"
  item: string
  status: string
  weight: number
  moves: ModernMove[]
  isDynamax: boolean
  isTerastal: boolean
  hasType: (type: string) => boolean
  resetCurAbility: () => void
}

export interface ModernMove {
  name: string
  bp: number
  type: string
  category: "Physical" | "Special"
  isZ?: boolean
  isMax?: boolean
  isSpread?: boolean
  isBullet?: boolean
  isSound?: boolean
  isPunch?: boolean
  isPulse?: boolean
  isBite?: boolean
  isSlicing?: boolean
  isWind?: boolean
  hasSecondaryEffect?: boolean
  makesContact?: boolean
  isCrit?: boolean
  hits?: number
  hasRecoil?: number | "crash"
  hasPriority?: boolean
  bypassesProtect?: boolean
  negateAbility?: boolean
  dealsPhysicalDamage?: boolean
  ignoresDefenseBoosts?: boolean
  percentHealed?: number
  usesHighestAttackStat?: boolean
}

export interface ModernSide {
  format: string
  weather: string
  terrain: string
  isGravity: boolean
  isProtect: boolean
  isReflect: boolean
  isLightScreen: boolean
  isHelpingHand: boolean
  isCharge: boolean
  isFriendGuard: boolean
  isBattery: boolean
  isAuraFairy: boolean
  isAuraDark: boolean
  isAuraBreak: boolean
  isMinimized: boolean
  isPowerSpot: boolean
  isSteelySpirit: boolean
  faintedCount: number
  isRuinTablets: boolean
  isRuinVessel: boolean
  isRuinSword: boolean
  isRuinBeads: boolean
}

// --- Type chart (TYPE_CHART_XY — same as Gen 7) ---
const typeChart: Record<string, Record<string, number>> = {
  "Normal":   { Normal:1, Grass:1, Fire:1, Water:1, Electric:1, Ice:1, Flying:1, Bug:1, Poison:1, Ground:1, Rock:0.5, Fighting:1, Psychic:1, Ghost:0, Dragon:1, Dark:1, Steel:0.5, Fairy:1 },
  "Grass":    { Normal:1, Grass:0.5, Fire:0.5, Water:2, Electric:1, Ice:1, Flying:0.5, Bug:0.5, Poison:0.5, Ground:2, Rock:2, Fighting:1, Psychic:1, Ghost:1, Dragon:0.5, Dark:1, Steel:0.5, Fairy:1 },
  "Fire":     { Normal:1, Grass:2, Fire:0.5, Water:0.5, Electric:1, Ice:2, Flying:1, Bug:2, Poison:1, Ground:1, Rock:0.5, Fighting:1, Psychic:1, Ghost:1, Dragon:0.5, Dark:1, Steel:2, Fairy:1 },
  "Water":    { Normal:1, Grass:0.5, Fire:2, Water:0.5, Electric:1, Ice:1, Flying:1, Bug:1, Poison:1, Ground:2, Rock:2, Fighting:1, Psychic:1, Ghost:1, Dragon:0.5, Dark:1, Steel:1, Fairy:1 },
  "Electric": { Normal:1, Grass:0.5, Fire:1, Water:2, Electric:0.5, Ice:1, Flying:2, Bug:1, Poison:1, Ground:0, Rock:1, Fighting:1, Psychic:1, Ghost:1, Dragon:0.5, Dark:1, Steel:1, Fairy:1 },
  "Ice":      { Normal:1, Grass:2, Fire:0.5, Water:0.5, Electric:1, Ice:0.5, Flying:2, Bug:1, Poison:1, Ground:2, Rock:1, Fighting:1, Psychic:1, Ghost:1, Dragon:2, Dark:1, Steel:0.5, Fairy:1 },
  "Flying":   { Normal:1, Grass:2, Fire:1, Water:1, Electric:0.5, Ice:1, Flying:1, Bug:2, Poison:1, Ground:1, Rock:0.5, Fighting:2, Psychic:1, Ghost:1, Dragon:1, Dark:1, Steel:0.5, Fairy:1 },
  "Bug":      { Normal:1, Grass:2, Fire:0.5, Water:1, Electric:1, Ice:1, Flying:0.5, Bug:1, Poison:0.5, Ground:1, Rock:1, Fighting:0.5, Psychic:2, Ghost:0.5, Dragon:1, Dark:2, Steel:0.5, Fairy:0.5 },
  "Poison":   { Normal:1, Grass:2, Fire:1, Water:1, Electric:1, Ice:1, Flying:1, Bug:1, Poison:0.5, Ground:0.5, Rock:0.5, Fighting:1, Psychic:1, Ghost:0.5, Dragon:1, Dark:1, Steel:0, Fairy:2 },
  "Ground":   { Normal:1, Grass:0.5, Fire:2, Water:1, Electric:2, Ice:1, Flying:0, Bug:0.5, Poison:2, Ground:1, Rock:2, Fighting:1, Psychic:1, Ghost:1, Dragon:1, Dark:1, Steel:2, Fairy:1 },
  "Rock":     { Normal:1, Grass:1, Fire:2, Water:1, Electric:1, Ice:2, Flying:2, Bug:2, Poison:1, Ground:0.5, Rock:1, Fighting:0.5, Psychic:1, Ghost:1, Dragon:1, Dark:1, Steel:0.5, Fairy:1 },
  "Fighting": { Normal:2, Grass:1, Fire:1, Water:1, Electric:1, Ice:2, Flying:0.5, Bug:0.5, Poison:0.5, Ground:1, Rock:2, Fighting:1, Psychic:0.5, Ghost:0, Dragon:1, Dark:2, Steel:2, Fairy:0.5 },
  "Psychic":  { Normal:1, Grass:1, Fire:1, Water:1, Electric:1, Ice:1, Flying:1, Bug:1, Poison:2, Ground:1, Rock:1, Fighting:2, Psychic:0.5, Ghost:1, Dragon:1, Dark:0, Steel:0.5, Fairy:1 },
  "Ghost":    { Normal:0, Grass:1, Fire:1, Water:1, Electric:1, Ice:1, Flying:1, Bug:1, Poison:1, Ground:1, Rock:1, Fighting:1, Psychic:2, Ghost:2, Dragon:1, Dark:0.5, Steel:1, Fairy:1 },
  "Dragon":   { Normal:1, Grass:1, Fire:1, Water:1, Electric:1, Ice:1, Flying:1, Bug:1, Poison:1, Ground:1, Rock:1, Fighting:1, Psychic:1, Ghost:1, Dragon:2, Dark:1, Steel:0.5, Fairy:0 },
  "Dark":     { Normal:1, Grass:1, Fire:1, Water:1, Electric:1, Ice:1, Flying:1, Bug:1, Poison:1, Ground:1, Rock:1, Fighting:0.5, Psychic:2, Ghost:2, Dragon:1, Dark:0.5, Steel:0.5, Fairy:0.5 },
  "Steel":    { Normal:1, Grass:1, Fire:0.5, Water:0.5, Electric:0.5, Ice:2, Flying:1, Bug:1, Poison:1, Ground:1, Rock:2, Fighting:1, Psychic:1, Ghost:1, Dragon:1, Dark:1, Steel:0.5, Fairy:2 },
  "Fairy":    { Normal:1, Grass:1, Fire:0.5, Water:1, Electric:1, Ice:1, Flying:1, Bug:1, Poison:0.5, Ground:1, Rock:1, Fighting:2, Psychic:1, Ghost:1, Dragon:2, Dark:2, Steel:0.5, Fairy:1 },
}

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

// --- Exclusive Z-move names (from game_data/move_data.js) ---
const EXCLUSIVE_ZMOVES: Record<string, true> = {
  "10,000,000 Volt Thunderbolt": true, "Catastropika": true, "Clangorous Soulblaze": true,
  "Genesis Supernova": true, "Guardian of Alola": true, "Let's Snuggle Forever": true,
  "Light That Burns the Sky": true, "Malicious Moonsault": true, "Menacing Moonraze Maelstrom": true,
  "Never-Ending Nightmare": true, "Oceanic Operetta": true, "Pulverizing Pancake": true,
  "Savage Spin-Out": true, "Searing Sunraze Smash": true, "Shattered Psyche": true,
  "Sinister Arrow Raid": true, "Soul-Stealing 7-Star Strike": true, "Splintered Stormshards": true,
  "Stoked Sparksurfer": true, "Supersonic Skystrike": true, "Tectonic Rage": true,
  "Acid Downpour": true, "All-Out Pummeling": true, "Black Hole Eclipse": true,
  "Bloom Doom": true, "Breakneck Blitz": true, "Continental Crush": true,
  "Corkscrew Crash": true, "Devastating Drake": true, "Gigavolt Havoc": true,
  "Hydro Vortex": true, "Inferno Overdrive": true, "Subzero Slammer": true,
  "Twinkle Tackle": true,
}

// --- Item helpers (from game_data/item_data.js) ---

function getItemBoostType(item: string): string {
  switch (item) {
  case "Draco Plate": case "Dragon Fang": return "Dragon"
  case "Dread Plate": case "Black Glasses": return "Dark"
  case "Earth Plate": case "Soft Sand": return "Ground"
  case "Fist Plate": case "Black Belt": return "Fighting"
  case "Flame Plate": case "Charcoal": return "Fire"
  case "Icicle Plate": case "Never-Melt Ice": return "Ice"
  case "Insect Plate": case "Silver Powder": return "Bug"
  case "Iron Plate": case "Metal Coat": return "Steel"
  case "Meadow Plate": case "Rose Incense": case "Miracle Seed": return "Grass"
  case "Mind Plate": case "Odd Incense": case "Twisted Spoon": return "Psychic"
  case "Pixie Plate": case "Fairy Feather": return "Fairy"
  case "Sky Plate": case "Sharp Beak": return "Flying"
  case "Splash Plate": case "Sea Incense": case "Wave Incense": case "Mystic Water": return "Water"
  case "Spooky Plate": case "Spell Tag": return "Ghost"
  case "Stone Plate": case "Rock Incense": case "Hard Stone": return "Rock"
  case "Toxic Plate": case "Poison Barb": return "Poison"
  case "Zap Plate": case "Magnet": return "Electric"
  case "Silk Scarf": case "Pink Bow": case "Polkadot Bow": return "Normal"
  default: return ""
  }
}

function getBerryResistType(berry: string): string {
  switch (berry) {
  case "Chilan Berry": return "Normal"
  case "Occa Berry": return "Fire"
  case "Passho Berry": return "Water"
  case "Wacan Berry": return "Electric"
  case "Rindo Berry": return "Grass"
  case "Yache Berry": return "Ice"
  case "Chople Berry": return "Fighting"
  case "Kebia Berry": return "Poison"
  case "Shuca Berry": return "Ground"
  case "Coba Berry": return "Flying"
  case "Payapa Berry": return "Psychic"
  case "Tanga Berry": return "Bug"
  case "Charti Berry": return "Rock"
  case "Kasib Berry": return "Ghost"
  case "Haban Berry": return "Dragon"
  case "Colbur Berry": return "Dark"
  case "Babiri Berry": return "Steel"
  case "Roseli Berry": return "Fairy"
  default: return ""
  }
}

function getFlingPower(item: string): number {
  if (item.includes("Plate")) return 90
  switch (item) {
  case "Iron Ball": case "Big Nugget": return 130
  case "Hard Stone": return 100
  case "Deep Sea Tooth": case "Grip Claw": case "Thick Club": return 90
  case "Assault Vest": case "Quick Claw": case "Razor Claw": case "Sticky Barb": return 80
  case "Dragon Fang": case "Poison Barb": return 70
  case "Adamant Orb": case "Damp Rock": case "Griseous Orb": case "Heat Rock":
  case "Leek": case "Lustrous Orb": case "Macho Brace": case "Rocky Helmet": return 60
  case "Toxic Orb": case "Flame Orb": case "Light Ball": case "King's Rock": case "Razor Fang": return 30
  default: return 10
  }
}

const NATURAL_GIFT_STATS: Record<string, { t: string; p: number }> = {
  "Apicot Berry": {t:"Ground",p:100}, "Aspear Berry": {t:"Ice",p:80}, "Babiri Berry": {t:"Steel",p:80},
  "Belue Berry": {t:"Electric",p:100}, "Charti Berry": {t:"Rock",p:80}, "Cheri Berry": {t:"Fire",p:80},
  "Chesto Berry": {t:"Water",p:80}, "Chilan Berry": {t:"Normal",p:80}, "Chople Berry": {t:"Fighting",p:80},
  "Coba Berry": {t:"Flying",p:80}, "Colbur Berry": {t:"Dark",p:80}, "Custap Berry": {t:"Ghost",p:100},
  "Durin Berry": {t:"Water",p:100}, "Enigma Berry": {t:"Bug",p:100}, "Ganlon Berry": {t:"Ice",p:100},
  "Haban Berry": {t:"Dragon",p:80}, "Jaboca Berry": {t:"Dragon",p:100}, "Kasib Berry": {t:"Ghost",p:80},
  "Kebia Berry": {t:"Poison",p:80}, "Kee Berry": {t:"Fairy",p:100}, "Lansat Berry": {t:"Flying",p:100},
  "Leppa Berry": {t:"Fighting",p:80}, "Liechi Berry": {t:"Grass",p:100}, "Lum Berry": {t:"Flying",p:80},
  "Maranga Berry": {t:"Dark",p:100}, "Micle Berry": {t:"Rock",p:100}, "Occa Berry": {t:"Fire",p:80},
  "Oran Berry": {t:"Poison",p:80}, "Passho Berry": {t:"Water",p:80}, "Payapa Berry": {t:"Psychic",p:80},
  "Pecha Berry": {t:"Electric",p:80}, "Persim Berry": {t:"Ground",p:80}, "Petaya Berry": {t:"Poison",p:100},
  "Rawst Berry": {t:"Grass",p:80}, "Rindo Berry": {t:"Grass",p:80}, "Roseli Berry": {t:"Fairy",p:80},
  "Rowap Berry": {t:"Dark",p:100}, "Salac Berry": {t:"Fighting",p:100}, "Shuca Berry": {t:"Ground",p:80},
  "Sitrus Berry": {t:"Psychic",p:80}, "Starf Berry": {t:"Psychic",p:100}, "Tanga Berry": {t:"Bug",p:80},
  "Wacan Berry": {t:"Electric",p:80}, "Watmel Berry": {t:"Fire",p:100}, "Yache Berry": {t:"Ice",p:80},
}

function getNaturalGift(item: string): { t: string; p: number } {
  const gift = NATURAL_GIFT_STATS[item]
  if (gift) return { t: gift.t, p: gift.p } // gen 7: no power reduction
  return { t: "Normal", p: 1 }
}

function getTechnoBlast(item: string): string {
  switch (item) {
  case "Burn Drive": return "Fire"
  case "Chill Drive": return "Ice"
  case "Douse Drive": return "Water"
  case "Shock Drive": return "Electric"
  default: return "Normal"
  }
}

// --- Field helpers (from shared_calc.js) ---

function getWeatherBall(weather: string, attackerItem: string): string {
  if (weather.includes("Sun") && attackerItem !== "Utility Umbrella") return "Fire"
  if (weather.includes("Rain") && attackerItem !== "Utility Umbrella") return "Water"
  if (weather === "Sand") return "Rock"
  if (weather === "Hail" || weather === "Snow") return "Ice"
  return "Normal"
}

function getTerrainType(terrain: string): string {
  switch (terrain) {
  case "Electric": return "Electric"
  case "Grassy": return "Grass"
  case "Misty": return "Fairy"
  case "Psychic": return "Psychic"
  default: return "Normal"
  }
}

// --- Pure math helpers (from damage_modern.js) ---

function chainMods(mods: number[]): number {
  let result = 0x1000
  for (const mod of mods) {
    result = pokeRound(result * mod / 0x1000)
  }
  return result
}

function pokeRound(num: number): number {
  return num % 1 > 0.5 ? Math.ceil(num) : Math.floor(num)
}

function countBoosts(boosts: Record<string, number>): number {
  let sum = 0
  for (const stat of [AT, DF, SA, SD, SP]) {
    if (boosts[stat] > 0) sum += boosts[stat]
  }
  return sum
}

export function getModifiedStat(stat: number, mod: number): number {
  const boostTable = [1, 1.5, 2, 2.5, 3, 3.5, 4]
  if (mod >= 0) return Math.floor(stat * boostTable[mod])
  return Math.floor(stat / boostTable[-mod])
}

function getModdedWeight(pokemon: ModernPokemon): number {
  let weight = pokemon.weight
  if (pokemon.curAbility === "Heavy Metal") weight *= 2
  else if (pokemon.curAbility === "Light Metal") weight = Math.floor(weight * 5) / 10
  if (pokemon.item === "Float Stone") weight = Math.floor(weight * 5) / 10
  return Math.max(weight, 0.1)
}

function isGrounded(pokemon: ModernPokemon, field: ModernSide): boolean {
  if (field.isGravity || pokemon.item === "Iron Ball") return true
  return !(pokemon.hasType("Flying") || pokemon.item === "Air Balloon" || pokemon.curAbility === "Levitate")
}

function getSeedStat(item: string, terrain: string): string {
  if ((item === "Psychic Seed" && terrain === "Psychic") || (item === "Misty Seed" && terrain === "Misty")) return SD
  if ((item === "Electric Seed" && terrain === "Electric") || (item === "Grassy Seed" && terrain === "Grassy")) return DF
  return ""
}

function getEffectiveItem(source: ModernPokemon, terrain: string): string {
  if (getSeedStat(source.item, terrain)) return ""
  return source.item
}

// --- Description helpers (from damage_modern.js) ---

function appendIfSet(str: string, toAppend: string | undefined): string {
  if (toAppend) return str + toAppend + " "
  return str
}

function toSmogonStat(stat: string): string {
  return stat === AT ? "Atk" : stat === DF ? "Def" : stat === SA ? "SpA" : stat === SD ? "SpD" : stat === SP ? "Spe" : stat
}

function getFirstHitText(hitText: string, moveHits: number | undefined): string {
  if (!moveHits || moveHits <= 1) return ""
  return ` (first ${hitText} only)`
}

function getDescriptionPokemonName(pokemon: ModernPokemon): string {
  return pokemon.setName || pokemon.name
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildDescription(description: Record<string, any>): string {
  let output = ""
  if (description.attackBoost) {
    if (description.attackBoost > 0) output += "+"
    output += description.attackBoost + " "
  }
  output = appendIfSet(output, description.attackEVs)
  output = appendIfSet(output, description.attackerItem)
  output = appendIfSet(output, description.attackerItemFirstHit)
  output = appendIfSet(output, description.attackerAbility)
  if (description.isBurned) output += "burned "
  if (description.attackerLevel) output += "Lv. " + description.attackerLevel + " "
  output += description.attackerName + " "
  if (description.isHelpingHand) output += "Helping Hand "
  if (description.isCharge) output += "Charge "
  if (description.isBattery) output += "Battery "
  output = appendIfSet(output, description.aura)
  output += description.moveName + " "
  if (description.moveBP && description.moveType) {
    output += "(" + description.moveBP + " BP " + description.moveType + ") "
  } else if (description.moveBP) {
    output += "(" + description.moveBP + " BP) "
  } else if (description.moveType) {
    output += "(" + description.moveType + ") "
  }
  if (description.hits && description.hits > 1) output += "(" + description.hits + " hits) "
  if (description.isSpread) output += "(spread) "
  output += "vs. "
  if (description.defenseBoost) {
    if (description.defenseBoost > 0) output += "+"
    output += description.defenseBoost + " "
  }
  output = appendIfSet(output, description.HPEVs)
  if (description.defenseEVs) output += "/ " + description.defenseEVs + " "
  output = appendIfSet(output, description.defenderItem)
  output = appendIfSet(output, description.defenderItemFirstHit)
  output = appendIfSet(output, description.defenderAbility)
  output = appendIfSet(output, description.defenderAbilityFirstHit)
  if (description.defenderLevel) output += "Lv. " + description.defenderLevel + " "
  output += description.defenderName
  if (description.weather || description.terrain || description.gravity) {
    output += " in "
    const fieldEffects: string[] = []
    if (description.weather) fieldEffects.push(description.weather)
    if (description.terrain) fieldEffects.push(description.terrain + " Terrain")
    if (description.gravity) fieldEffects.push("Gravity")
    output += fieldEffects.join(" and ")
  }
  if (description.isDoublesScreen) {
    output += " through Doubles " + (description.isReflect ? "Reflect" : "Light Screen")
  } else if (description.isReflect) {
    output += " through Reflect"
  } else if (description.isLightScreen) {
    output += " through Light Screen"
  }
  if (description.isCritical) output += " on a critical hit"
  if (description.isFriendGuard) output += " with Friend Guard"
  if (description.isQuarteredByProtect) output += " through Protect"
  return output
}

// --- Move effectiveness (from damage_modern.js) ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMoveEffectiveness(move: ModernMove, mType: string, defType: string, isGhostRevealed: boolean, _field: ModernSide, isStrongWinds: boolean, description: Record<string, any>): number {
  if (defType === "Normal" && mType === "Ghost" && !isGhostRevealed) return 0
  if (defType === "Ghost" && mType === "Normal" && !isGhostRevealed) return 0
  if (defType === "Ghost" && mType === "Fighting" && !isGhostRevealed) return 0
  if (isGhostRevealed && defType === "Ghost" && ["Normal","Fighting"].includes(mType)) return 1
  if (defType === "Flying" && mType === "Ground" && (defenderGrounded || move.name === "Thousand Arrows")) return 1
  if (isStrongWinds && defType === "Flying" && ["Electric","Ice","Rock"].includes(mType)) {
    description.weather = "Strong Winds"
    return 1
  }
  if (move.name === "Freeze-Dry" && defType === "Water") return 2
  if (move.name === "Flying Press") return (typeChart["Fighting"]?.[defType] ?? 1) * (typeChart["Flying"]?.[defType] ?? 1)
  return typeChart[mType]?.[defType] ?? 1
}

// --- Misc helpers ---

function hasPriority(move: ModernMove, attacker: ModernPokemon, field: ModernSide): boolean {
  return !!(move.hasPriority ||
    (attacker.curAbility === "Triage" && move.percentHealed) ||
    (move.name === "Grassy Glide" && field.terrain === "Grassy" && attackerGrounded))
}

function killsShedinja(attacker: ModernPokemon, defender: ModernPokemon, move: ModernMove, field: ModernSide): boolean {
  if (!(defender.ability === "Wonder Guard" && defender.curHP === 1)) return false
  const afflictable = defender.status === "Healthy" && !(field.terrain === "Misty" && isGrounded(defender, field))
  const poisonable = afflictable && !["Poison","Steel"].some(t => defender.hasType(t))
  const burnable = afflictable && !defender.hasType("Fire")
  const poison = (["Toxic","Poison Gas","Toxic Thread"].includes(move.name) ||
    (move.name === "Poison Powder" && !defender.hasType("Grass"))) &&
    (poisonable || (afflictable && attacker.curAbility === "Corrosion"))
  const burn = move.name === "Will-O-Wisp" && burnable
  const confusion = ["Confuse Ray","Flatter","Supersonic","Swagger","Sweet Kiss","Teeter Dance"].includes(move.name)
  const otherPassive = (move.name === "Leech Seed" && !defender.hasType("Grass")) || (move.name === "Curse" && attacker.hasType("Ghost"))
  return poison || burn || confusion || otherPassive
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSingletonDamage(attacker: ModernPokemon, defender: ModernPokemon, move: ModernMove, field: ModernSide, description: Record<string, any>): number | undefined {
  let val: number | undefined
  switch (move.name) {
  case "Seismic Toss": case "Night Shade": val = attacker.level; break
  case "Psywave": val = Math.floor(attacker.level * 150 / 100); break
  case "Sonic Boom": val = 20; break
  case "Dragon Rage": val = 40; break
  }
  if (val !== undefined && attacker.curAbility === "Parental Bond") {
    description.attackerAbility = attacker.curAbility
    return val * 2
  }
  if (val !== undefined) return val
  switch (move.name) {
  case "Super Fang": case "Nature's Madness": case "Ruination":
    val = Math.max(Math.floor(defender.curHP / 2), 1); break
  case "Guardian of Alola":
    val = Math.max(Math.floor(defender.curHP * 3 / 4), 1)
    if (field.isProtect) {
      val = Math.max(Math.floor(val / 4), 1)
      description.isQuarteredByProtect = true
    }
    break
  }
  if (val !== undefined && attacker.curAbility === "Parental Bond") {
    description.attackerAbility = attacker.curAbility
    val += Math.max(Math.floor((defender.curHP - val) / 2), 1)
    return val
  }
  if (val !== undefined) return val
  if (move.name === "Final Gambit") return attacker.curHP
  return undefined
}

function activateResistBerry(attacker: ModernPokemon, defenderItem: string, typeEffectiveness: number): boolean {
  return getBerryResistType(defenderItem) === moveType &&
    (typeEffectiveness > 1 || moveType === "Normal") &&
    attacker.curAbility !== "Unnerve"
}

function isTeraShell(defender: ModernPokemon, typeEffectiveness: number): boolean {
  return defender.curAbility === "Tera Shell" && typeEffectiveness >= 1 && defender.curHP === defender.maxHP
}

function isShellSideArmPhysical(attacker: ModernPokemon, defender: ModernPokemon, move: ModernMove): boolean {
  if (move.name !== "Shell Side Arm") return false
  const scaler = (Math.floor(2 * attacker.level / 5) + 2) * move.bp
  return Math.floor(scaler * attacker.stats[AT] / defender.stats[DF]) >
    Math.floor(scaler * attacker.stats[SA] / defender.stats[SD])
}

function canKnockOffItem(_attacker: ModernPokemon, defender: ModernPokemon, terrain: string): boolean {
  return !(getEffectiveItem(defender, terrain) === "" ||
    (defender.item === "Griseous Orb" && gen <= 8 && defender.name === "Giratina-O") ||
    defender.item.endsWith("Plate") && defender.name.startsWith("Arceus") ||
    defender.item.endsWith(" Z"))
}

function applyKnockOffBoost(attacker: ModernPokemon, defender: ModernPokemon, move: ModernMove, terrain: string): boolean {
  return gen >= 6 && move.name === "Knock Off" && canKnockOffItem(attacker, defender, terrain)
}

function moveRemovesItem(attacker: ModernPokemon, defender: ModernPokemon, move: ModernMove, terrain: string): boolean {
  return canKnockOffItem(attacker, defender, terrain) &&
    (move.name === "Knock Off" || (["Thief","Covet"].includes(move.name) && attacker.item === ""))
}

function applyGem(attacker: ModernPokemon, move: ModernMove): boolean {
  return attacker.item === moveType + " Gem" && !move.name.includes("Pledge")
}


// --- Calc functions (from damage_modern.js) ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calcBP(attacker: ModernPokemon, defender: ModernPokemon, move: ModernMove, field: ModernSide, description: Record<string, any>, ateizeBoost: boolean): number {
  let basePower = move.bp
  const turnOrder = attacker.stats[SP] > defender.stats[SP] ? "FIRST" : "LAST"
  const attackerWeight = getModdedWeight(attacker)
  const defenderWeight = getModdedWeight(defender)

  switch (move.name) {
  case "Payback":
    basePower *= turnOrder === "LAST" ? 2 : 1
    description.moveBP = basePower; break
  case "Electro Ball": {
    const r = Math.floor(attacker.stats[SP] / defender.stats[SP])
    basePower = r >= 4 ? 150 : r >= 3 ? 120 : r >= 2 ? 80 : 60
    description.moveBP = basePower; break
  }
  case "Gyro Ball":
    basePower = attacker.stats[SP] === 0 ? 1 : Math.min(150, Math.floor(25 * defender.stats[SP] / attacker.stats[SP]) + 1)
    description.moveBP = basePower; break
  case "Punishment":
    basePower = Math.min(200, basePower + 20 * countBoosts(defender.boosts))
    description.moveBP = basePower; break
  case "Low Kick": case "Grass Knot":
    basePower = defenderWeight >= 200 ? 120 : defenderWeight >= 100 ? 100 : defenderWeight >= 50 ? 80 : defenderWeight >= 25 ? 60 : defenderWeight >= 10 ? 40 : 20
    description.moveBP = basePower; break
  case "Crush Grip": case "Wring Out":
    basePower = Math.max(1, Math.floor(pokeRound((120 * 100 * Math.floor(defender.curHP * 4096 / defender.maxHP)) / 4096) / 100))
    description.moveBP = basePower; break
  case "Hex": case "Infernal Parade":
    basePower *= defender.status !== "Healthy" ? 2 : 1
    description.moveBP = basePower; break
  case "Heavy Slam": case "Heat Crash": {
    const wr = attackerWeight / defenderWeight
    basePower = wr >= 5 ? 120 : wr >= 4 ? 100 : wr >= 3 ? 80 : wr >= 2 ? 60 : 40
    description.moveBP = basePower; break
  }
  case "Stored Power": case "Power Trip":
    basePower += 20 * countBoosts(attacker.boosts)
    description.moveBP = basePower; break
  case "Acrobatics": {
    const effectiveItem = getEffectiveItem(attacker, field.terrain)
    basePower *= (effectiveItem === "Flying Gem" || effectiveItem === "") ? 2 : 1
    description.moveBP = basePower; break
  }
  case "Wake-Up Slap":
    basePower *= defender.status === "Asleep" ? 2 : 1
    description.moveBP = basePower; break
  case "Weather Ball":
    basePower *= field.weather !== "" ? 2 : 1
    description.moveBP = basePower; break
  case "Terrain Pulse":
    basePower *= (field.terrain !== "" && attackerGrounded) ? 2 : 1
    description.moveBP = basePower; break
  case "Fling":
    basePower = getFlingPower(attacker.item)
    description.moveBP = basePower; description.attackerItem = attacker.item; break
  case "Eruption": case "Dragon Energy": case "Water Spout":
    basePower = Math.max(1, Math.floor(150 * attacker.curHP / attacker.maxHP))
    description.moveBP = basePower; break
  case "Flail": case "Reversal": {
    const p = Math.floor(48 * attacker.curHP / attacker.maxHP)
    basePower = p <= 1 ? 200 : p <= 4 ? 150 : p <= 9 ? 100 : p <= 16 ? 80 : p <= 32 ? 40 : 20
    description.moveBP = basePower; break
  }
  case "Nature Power":
    basePower = field.terrain === "Electric" || field.terrain === "Grassy" || field.terrain === "Psychic" ? 90 : field.terrain === "Misty" ? 95 : move.bp
    description.moveBP = basePower; break
  case "Water Shuriken":
    basePower = attacker.name === "Ash-Greninja" && attacker.ability === "Battle Bond" ? 20 : move.bp
    description.moveBP = basePower; break
  case "Grav Apple":
    if (field.isGravity) { basePower *= 2; description.moveBP = basePower; description.gravity = true }
    break
  case "Triple Kick": case "Triple Axel":
    basePower = move.bp
    description.moveBP = basePower
    for (let i = 2; i <= (move.hits ?? 1); i++) description.moveBP += ", " + (basePower * i)
    break
  case "Magnitude": case "Rage Fist":
    description.moveBP = basePower; break
  }

  if (move.isZ && !(move.name in EXCLUSIVE_ZMOVES)) description.moveBP = basePower

  const bpMods: number[] = []

  if (field.isSteelySpirit && moveType === "Steel") { bpMods.push(0x1800); description.isSteelySpirit = true }

  const isAuraActive = (field.isAuraFairy && moveType === "Fairy") || (field.isAuraDark && moveType === "Dark")
  let auraActive = isAuraActive
  if (isAuraActive && field.isAuraBreak) {
    bpMods.push(0x0C00); description.aura = "Aura Break"; auraActive = false
  }

  if (attacker.curAbility === "Rivalry" && attacker.isAbilityActivated) {
    if (attacker.isAbilityActivated === true) { bpMods.push(0x1400); description.attackerAbility = attacker.curAbility + " (increasing)" }
    else if (attacker.isAbilityActivated === "indeterminate") { bpMods.push(0x0C00); description.attackerAbility = attacker.curAbility + " (decreasing)" }
  }

  if ((attacker.curAbility === "Reckless" && (typeof move.hasRecoil === "number" || move.hasRecoil === "crash")) ||
    (attacker.curAbility === "Iron Fist" && move.isPunch) ||
    (gen >= 7 && !move.isZ && ateizeBoost)) {
    bpMods.push(0x1333); description.attackerAbility = attacker.curAbility
  }

  if (field.isBattery && moveCategory === "Special") { bpMods.push(0x14CD); description.isBattery = true }
  if (field.isPowerSpot) { bpMods.push(0x14CD); description.isPowerSpot = true }

  if (attacker.curAbility === "Sheer Force" && move.hasSecondaryEffect ||
    attacker.curAbility === "Analytic" && attacker.isAbilityActivated ||
    attacker.curAbility === "Tough Claws" && makesContact ||
    attacker.curAbility === "Punk Rock" && move.isSound) {
    bpMods.push(0x14CD); description.attackerAbility = attacker.curAbility
  } else if (attacker.curAbility === "Sand Force" && field.weather === "Sand" && ["Rock","Ground","Steel"].includes(moveType)) {
    bpMods.push(0x14CD); description.attackerAbility = attacker.curAbility; description.weather = field.weather
  }

  if (auraActive) { bpMods.push(0x1548); description.aura = moveType + " Aura" }

  if (gen <= 7 && attacker.curAbility === "Technician" && basePower <= 60 ||
    attacker.curAbility === "Flare Boost" && attacker.status === "Burned" && moveCategory === "Special" ||
    attacker.curAbility === "Toxic Boost" && (attacker.status === "Poisoned" || attacker.status === "Badly Poisoned") && moveCategory === "Physical" ||
    attacker.curAbility === "Strong Jaw" && move.isBite ||
    attacker.curAbility === "Mega Launcher" && move.isPulse ||
    attacker.curAbility === "Sharpness" && move.isSlicing) {
    bpMods.push(0x1800); description.attackerAbility = attacker.curAbility
  }

  if (defender.curAbility === "Heatproof" && moveType === "Fire" && gen <= 8) { bpMods.push(0x800); description.defenderAbility = defender.curAbility }
  else if (defender.curAbility === "Dry Skin" && moveType === "Fire") { bpMods.push(0x1400); description.defenderAbility = defender.curAbility }

  if (attacker.item === "Muscle Band" && moveCategory === "Physical" ||
    attacker.item === "Wise Glasses" && moveCategory === "Special") {
    bpMods.push(0x1199); description.attackerItem = attacker.item
  } else if (getItemBoostType(attacker.item) === moveType ||
    attacker.item === "Soul Dew" && gen >= 7 && (attacker.name === "Latios" || attacker.name === "Latias")) {
    bpMods.push(0x1333); description.attackerItem = attacker.item
  } else if (isFirstHit && applyGem(attacker, move)) {
    bpMods.push(0x14CD); description.attackerItem = attacker.item
    description.attackerItemFirstHit = getFirstHitText(ATTACK_TEXT, move.hits)
  }

  if (["Solar Beam","SolarBeam","Solar Blade"].includes(move.name) &&
    (["Sand","Hail","Snow"].includes(field.weather) || field.weather.endsWith("Rain"))) {
    bpMods.push(0x800); description.moveBP = move.bp / 2; description.weather = field.weather
  }

  if (isFirstHit && applyKnockOffBoost(attacker, defender, move, field.terrain)) {
    bpMods.push(0x1800); description.moveBP = Math.floor(move.bp * 1.5)
  }

  if (field.isHelpingHand) { bpMods.push(0x1800); description.isHelpingHand = true }

  if (moveType === "Electric" && field.isCharge) { bpMods.push(0x2000); description.isCharge = true }

  if (move.name === "Facade" && ["Burned","Paralyzed","Poisoned","Badly Poisoned"].includes(attacker.status) ||
    move.name === "Brine" && defender.curHP <= defender.maxHP / 2 ||
    move.name === "Venoshock" && (defender.status === "Poisoned" || defender.status === "Badly Poisoned") ||
    move.name === "Smelling Salts" && defender.status === "Paralyzed") {
    bpMods.push(0x2000); description.moveBP = move.bp * 2
  }

  if (defenderGrounded && (
    field.terrain === "Misty" && moveType === "Dragon" ||
    field.terrain === "Grassy" && ["Bulldoze","Earthquake","Magnitude"].includes(move.name))) {
    bpMods.push(0x800); description.terrain = field.terrain
  }

  if (attackerGrounded && (
    field.terrain === "Electric" && moveType === "Electric" ||
    field.terrain === "Grassy" && moveType === "Grass")) { // Gen 6: no Psychic Terrain boost
    bpMods.push(0x1800) // gen 7 uses 0x1800
    description.terrain = field.terrain
  }

  return Math.max(1, pokeRound(basePower * chainMods(bpMods) / 4096))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calcAtk(attacker: ModernPokemon, defender: ModernPokemon, move: ModernMove, field: ModernSide, description: Record<string, any>): number {
  let attack: number
  const attackSource = move.name === "Foul Play" ? defender : attacker
  if (move.name === "Body Press") {
    moveCategory = "Physical"
  }
  const attackStat = move.name === "Body Press" ? DF : (moveCategory === "Physical" ? AT : SA)
  const nat = NATURES[attacker.nature] ?? ["",""]
  description.attackEVs = attacker.evs[attackStat] +
    (nat[0] === attackStat ? "+" : nat[1] === attackStat ? "-" : "") + " " + toSmogonStat(attackStat)

  if (attackSource.boosts[attackStat] === 0 || (isCritical && attackSource.boosts[attackStat] < 0)) {
    attack = attackSource.rawStats[attackStat]
  } else if (defender.curAbility === "Unaware") {
    attack = attackSource.rawStats[attackStat]; description.defenderAbility = defender.curAbility
  } else {
    attack = attackSource.stats[attackStat]; description.attackBoost = attackSource.boosts[attackStat]
  }

  if (move.name === "Meteor Beam" || move.name === "Electro Shot") {
    attacker.boosts[SA] = originalSABoost
    attacker.stats[SA] = getModifiedStat(attacker.rawStats[SA], attacker.boosts[SA])
  }

  if (attacker.curAbility === "Hustle" && moveCategory === "Physical") {
    attack = pokeRound(attack * 3 / 2); description.attackerAbility = attacker.curAbility
  }

  const atMods: number[] = []
  if (attacker.curAbility === "Defeatist" && (attacker.curHP <= attacker.maxHP / 2 || attacker.isAbilityActivated) ||
    attacker.curAbility === "Slow Start" && moveCategory === "Physical" && attacker.isAbilityActivated) {
    atMods.push(0x800); description.attackerAbility = attacker.curAbility
  }

  if (attacker.curAbility === "Flower Gift" && field.weather.endsWith("Sun") && moveCategory === "Physical" ||
    attacker.curAbility === "Solar Power" && field.weather.endsWith("Sun") && moveCategory === "Special") {
    atMods.push(0x1800); description.attackerAbility = attacker.curAbility; description.weather = field.weather
  } else if (attacker.curAbility === "Guts" && moveCategory === "Physical" && (attacker.status !== "Healthy" || attacker.isAbilityActivated) ||
    (attacker.curAbility === "Overgrow" && moveType === "Grass" ||
    attacker.curAbility === "Blaze" && moveType === "Fire" ||
    attacker.curAbility === "Torrent" && moveType === "Water" ||
    attacker.curAbility === "Swarm" && moveType === "Bug") && (attacker.curHP <= attacker.maxHP / 3 || attacker.isAbilityActivated) ||
    attacker.curAbility === "Steelworker" && moveType === "Steel" ||
    attacker.curAbility === "Transistor" && gen <= 8 && moveType === "Electric" ||
    attacker.curAbility === "Dragon's Maw" && moveType === "Dragon" ||
    attacker.curAbility === "Rocky Payload" && moveType === "Rock") {
    atMods.push(0x1800); description.attackerAbility = attacker.curAbility
  } else if (attacker.curAbility === "Flash Fire" && attacker.isAbilityActivated && moveType === "Fire" ||
    (moveCategory === "Special" && (attacker.ability === "Plus" || attacker.ability === "Minus") && attacker.isAbilityActivated)) {
    atMods.push(0x1800); description.attackerAbility = attacker.ability
  } else if (attacker.curAbility === "Water Bubble" && moveType === "Water" ||
    (attacker.curAbility === "Huge Power" || attacker.curAbility === "Pure Power") && moveCategory === "Physical") {
    atMods.push(0x2000); description.attackerAbility = attacker.curAbility
  }

  if (defender.curAbility === "Thick Fat" && (moveType === "Fire" || moveType === "Ice") ||
    defender.curAbility === "Water Bubble" && moveType === "Fire") {
    atMods.push(0x800); description.defenderAbility = defender.curAbility
  }

  if (attacker.item === "Choice Band" && moveCategory === "Physical" && !move.isZ && !attacker.isDynamax ||
    attacker.item === "Choice Specs" && moveCategory === "Special" && !move.isZ && !attacker.isDynamax) {
    atMods.push(0x1800); description.attackerItem = attacker.item
  } else if (attacker.item === "Thick Club" && (attacker.name === "Cubone" || attacker.name === "Marowak" || attacker.name === "Marowak-Alola") && moveCategory === "Physical" ||
    attacker.item === "Deep Sea Tooth" && attacker.name === "Clamperl" && moveCategory === "Special" ||
    attacker.item === "Light Ball" && attacker.name === "Pikachu" && !move.isZ) {
    atMods.push(0x2000); description.attackerItem = attacker.item
  }

  return Math.max(1, pokeRound(attack * chainMods(atMods) / 0x1000))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calcDef(attacker: ModernPokemon, defender: ModernPokemon, move: ModernMove, field: ModernSide, description: Record<string, any>): number {
  const hitsPhysical = moveCategory === "Physical" || move.dealsPhysicalDamage
  const defenseStat = hitsPhysical ? DF : SD
  const nat = NATURES[defender.nature] ?? ["",""]
  description.defenseEVs = defender.evs[defenseStat] +
    (nat[0] === defenseStat ? "+" : nat[1] === defenseStat ? "-" : "") + " " + toSmogonStat(defenseStat)

  let defense: number
  if (defender.boosts[defenseStat] === 0 || (isCritical && defender.boosts[defenseStat] > 0) || move.ignoresDefenseBoosts) {
    defense = defender.rawStats[defenseStat]
  } else if (attacker.curAbility === "Unaware") {
    defense = defender.rawStats[defenseStat]; description.attackerAbility = attacker.curAbility
  } else {
    defense = defender.stats[defenseStat]; description.defenseBoost = defender.boosts[defenseStat]
  }

  if (field.weather === "Sand" && defender.hasType("Rock") && !hitsPhysical ||
    field.weather === "Snow" && defender.hasType("Ice") && hitsPhysical) {
    defense = pokeRound(defense * 3 / 2); description.weather = field.weather
  }

  const dfMods: number[] = []
  if (defender.curAbility === "Flower Gift" && field.weather.includes("Sun") && !hitsPhysical) {
    dfMods.push(0x1800); description.defenderAbility = defender.curAbility; description.weather = field.weather
  }
  if (defender.curAbility === "Marvel Scale" && (defender.status !== "Healthy" || defender.isAbilityActivated) && hitsPhysical ||
    defender.curAbility === "Grass Pelt" && field.terrain === "Grassy" && hitsPhysical) {
    dfMods.push(0x1800); description.defenderAbility = defender.curAbility
  }
  if (defender.curAbility === "Fur Coat" && hitsPhysical) {
    dfMods.push(0x2000); description.defenderAbility = defender.curAbility
  }

  if (defender.item === "Assault Vest" && !hitsPhysical || defender.item === "Eviolite") {
    dfMods.push(0x1800); description.defenderItem = defender.item
  }
  if (defender.item === "Deep Sea Scale" && defender.name === "Clamperl" && !hitsPhysical ||
    defender.item === "Metal Powder" && defender.name === "Ditto" && hitsPhysical) {
    dfMods.push(0x2000); description.defenderItem = defender.item
  }

  return Math.max(1, pokeRound(defense * chainMods(dfMods) / 0x1000))
}

function calcBaseDamage(moddedBasePower: number, attack: number, defense: number, attackerLevel: number): number {
  return Math.floor(Math.floor(Math.floor(2 * attackerLevel / 5 + 2) * moddedBasePower * attack / defense) / 50 + 2)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function modBaseDamage(baseDamage: number, attacker: ModernPokemon, _defender: ModernPokemon, move: ModernMove, field: ModernSide, description: Record<string, any>): number {
  if (field.format === "doubles" && (move.isSpread)) {
    baseDamage = pokeRound(baseDamage * 0xC00 / 0x1000); description.isSpread = true
  }
  if (!isFirstHit && attacker.curAbility === "Parental Bond") {
    baseDamage = pokeRound(baseDamage * 0x800 / 0x1000) // Gen 6: 50% (Gen 7+ uses 25%)
  }

  let weatherMod = 0x1000
  if (field.weather.includes("Sun") && moveType === "Fire" ||
    field.weather.includes("Rain") && moveType === "Water") {
    weatherMod = 0x1800; description.weather = field.weather
  } else if (field.weather === "Sun" && moveType === "Water" ||
    field.weather === "Rain" && moveType === "Fire") {
    weatherMod = 0x800; description.weather = field.weather
  }
  baseDamage = pokeRound(baseDamage * weatherMod / 0x1000)

  if (isCritical) {
    baseDamage = Math.floor(baseDamage * 3 / 2) // gen 6+: 1.5x
    description.isCritical = isCritical
  }
  return baseDamage
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calcSTABMod(attacker: ModernPokemon, move: ModernMove, description: Record<string, any>): number {
  if (["Protean","Libero"].includes(attacker.curAbility)) {
    if (!attacker.hasType(moveType)) description.attackerAbility = attacker.curAbility
    return 0x1800
  }
  let stabMod = 0x1000
  if (attacker.hasType(moveType) || move.name.includes("Pledge Boosted")) stabMod += 0x800
  if (attacker.curAbility === "Adaptability" && attacker.hasType(moveType)) {
    stabMod += stabMod >= 0x2000 ? 0x400 : 0x800; description.attackerAbility = attacker.curAbility
  }
  return stabMod
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calcFinalMods(attacker: ModernPokemon, defender: ModernPokemon, move: ModernMove, field: ModernSide, description: Record<string, any>, typeEffectiveness: number, bypassProtect: boolean): number {
  const finalMods: number[] = []
  if (!(isCritical || ["Brick Break","Psychic Fangs"].includes(move.name) || attacker.curAbility === "Infiltrator")) {
    description.isReflect = field.isReflect && moveCategory === "Physical"
    description.isLightScreen = field.isLightScreen && moveCategory === "Special"
    if (description.isReflect || description.isLightScreen) {
      finalMods.push(field.format === "singles" ? 0x800 : 0xA8F)
      if (field.format !== "singles") description.isDoublesScreen = true
    }
  }
  if (attacker.curAbility === "Neuroforce" && typeEffectiveness > 1) { finalMods.push(0x1400); description.attackerAbility = attacker.curAbility }
  if (attacker.curAbility === "Sniper" && isCritical) { finalMods.push(0x1800); description.attackerAbility = attacker.curAbility }
  if (attacker.curAbility === "Tinted Lens" && typeEffectiveness < 1) { finalMods.push(0x2000); description.attackerAbility = attacker.curAbility }

  if ((isFirstHit && defender.curAbility === "Multiscale" && defender.curHP === defender.maxHP) ||
    defender.curAbility === "Fluffy" && makesContact ||
    defender.curAbility === "Punk Rock" && move.isSound ||
    defender.curAbility === "Ice Scales" && moveCategory === "Special") {
    finalMods.push(0x800); description.defenderAbility = defender.curAbility
    description.defenderAbilityFirstHit = getFirstHitText(STRIKE_TEXT, move.hits)
  }
  if (field.isFriendGuard) { finalMods.push(0xC00); description.isFriendGuard = true }
  if ((defender.curAbility === "Solid Rock" || defender.curAbility === "Filter" || defender.curAbility === "Prism Armor") && typeEffectiveness > 1) {
    finalMods.push(0xC00); description.defenderAbility = defender.curAbility
  }
  if (defender.curAbility === "Fluffy" && moveType === "Fire") { finalMods.push(0x2000); description.defenderAbility = defender.curAbility }

  if (attacker.item === "Expert Belt" && typeEffectiveness > 1 && !move.isZ) { finalMods.push(0x1333); description.attackerItem = attacker.item }
  else if (attacker.item === "Life Orb" && !move.isZ) { finalMods.push(0x14CC); description.attackerItem = attacker.item }

  if (isFirstHit && activateResistBerry(attacker, defender.item, typeEffectiveness)) {
    finalMods.push(defender.curAbility === "Ripen" ? 0x400 : 0x800)
    description.defenderItem = defender.item
    description.defenderItemFirstHit = getFirstHitText(STRIKE_TEXT, move.hits)
  }
  if (field.isMinimized && ["Astonish","Body Slam","Dragon Rush","Extrasensory","Flying Press","Heat Crash","Heavy Slam","Needle Arm","Phantom Force","Shadow Force","Steamroller","Stomp"].includes(move.name)) {
    finalMods.push(0x2000); description.isMinimized = true
  }

  let finalMod = chainMods(finalMods)
  if (field.isProtect && !bypassProtect) {
    finalMod = pokeRound(finalMod * 0x400 / 0x1000); description.isQuarteredByProtect = true
  }
  return finalMod
}

function calcDamageRange(baseDamage: number, stabMod: number, typeEffectiveness: number, applyBurn: boolean, finalMod: number): number[] {
  const damage = new Array(16)
  for (let i = 0; i < 16; i++) {
    damage[i] = Math.floor(baseDamage * (85 + i) / 100)
    damage[i] = pokeRound(damage[i] * stabMod / 0x1000)
    damage[i] = Math.floor(damage[i] * typeEffectiveness)
    if (applyBurn) damage[i] = Math.floor(damage[i] / 2)
    damage[i] = Math.max(1, pokeRound(damage[i] * finalMod / 0x1000) % 65536)
  }
  return damage
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function recalcOtherHits(attacker: ModernPokemon, defender: ModernPokemon, move: ModernMove, field: ModernSide, description: Record<string, any>, result: Record<string, any>,
  typeEffectiveness: number, finalBasePower: number, attack: number, defense: number, baseDamage: number, stabMod: number, finalMod: number, applyBurn: boolean,
  otherHitsTypeEffectiveness: number, ateizeBoost: boolean, bypassProtect: boolean): number[] | undefined {
  const originalATBoost = attacker.boosts[AT]
  const originalATStat = attacker.stats[AT]
  const isParentalBond = attacker.curAbility === "Parental Bond" && move.hits === 1 && (field.format === "singles" || !move.isSpread)
  if (isParentalBond) { isFirstHit = false; description.attackerAbility = attacker.curAbility }

  const isTeraShellActivated = isTeraShell(defender, otherHitsTypeEffectiveness)
  let recalcFinalMod = false
  if (isTeraShellActivated) { isFirstHit = false; recalcFinalMod = true }

  const isGemApplied = applyGem(attacker, move)
  if (isGemApplied) result.gemFirstAttack = true
  if (isGemApplied || applyKnockOffBoost(attacker, defender, move, field.terrain)) {
    isFirstHit = false
    finalBasePower = calcBP(attacker, defender, move, field, {}, ateizeBoost)
  }

  if (move.name === "Power-Up Punch" && isParentalBond) {
    attacker.boosts[AT] = Math.min(6, attacker.boosts[AT] + 1)
    attacker.stats[AT] = getModifiedStat(attacker.rawStats[AT], attacker.boosts[AT])
    attack = calcAtk(attacker, defender, move, field, {})
  }

  const isItemRemoved = moveRemovesItem(attacker, defender, move, field.terrain) && description.defenderItem
  const originalDefenderItem = defender.item
  if (isItemRemoved) {
    isFirstHit = false; defender.item = ""
    if (description.defenderItem) description.defenderItemFirstHit = getFirstHitText(STRIKE_TEXT, move.hits)
    defense = calcDef(attacker, defender, move, field, {})
  }

  if (!isFirstHit) {
    baseDamage = modBaseDamage(calcBaseDamage(finalBasePower, attack, defense, attacker.level), attacker, defender, move, field, {})
  }

  if (isFirstHit) { return undefined }

  let recalcDamage = calcDamageRange(baseDamage, stabMod, otherHitsTypeEffectiveness, applyBurn, finalMod)
  if (recalcFinalMod || activateResistBerry(attacker, originalDefenderItem, typeEffectiveness) ||
    defender.curAbility === "Multiscale" && defender.curHP === defender.maxHP) {
    finalMod = calcFinalMods(attacker, defender, move, field, {}, otherHitsTypeEffectiveness, bypassProtect)
    recalcDamage = calcDamageRange(baseDamage, stabMod, otherHitsTypeEffectiveness, applyBurn, finalMod)
  }

  isFirstHit = true
  if (isItemRemoved) defender.item = originalDefenderItem

  if (isParentalBond) {
    result.childDamage = recalcDamage
    attacker.boosts[AT] = originalATBoost; attacker.stats[AT] = originalATStat
    move.hits = 2
    return undefined
  }

  return recalcDamage
}

// --- Main export ---

export interface DamageResultModern {
  damage: number[]
  description: string
}

export function getDamageResult(attacker: ModernPokemon, defender: ModernPokemon, move: ModernMove, field: ModernSide): DamageResultModern {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const description: Record<string, any> = {
    attackerName: getDescriptionPokemonName(attacker),
    moveName: move.name,
    defenderName: getDescriptionPokemonName(defender),
    isDynamax: defender.isDynamax,
  }

  if (defender.item !== "Ability Shield" && (["Mold Breaker","Teravolt","Turboblaze"].includes(attacker.curAbility) || move.negateAbility)) {
    defender.curAbility = ""
  }

  if (killsShedinja(attacker, defender, move, field)) {
    return { damage: [1], description: buildDescription(description) }
  }
  if (move.bp === 0) {
    return { damage: [0], description: buildDescription(description) }
  }

  moveType = move.type
  attackerGrounded = isGrounded(attacker, field)
  defenderGrounded = isGrounded(defender, field)

  // Move type changes
  switch (move.name) {
  case "Weather Ball":
    moveType = getWeatherBall(field.weather, attacker.item)
    if (moveType !== "Normal") description.weather = field.weather
    break
  case "Terrain Pulse":
    if (field.terrain && attackerGrounded) moveType = getTerrainType(field.terrain)
    break
  case "Judgment":
    if (attacker.item.includes("Plate")) moveType = getItemBoostType(attacker.item)
    break
  case "Multi-Attack":
    if (attacker.name.startsWith("Silvally-")) moveType = attacker.name.substring(attacker.name.indexOf("-") + 1)
    break
  case "Techno Blast":
    if (attacker.item.includes("Drive")) moveType = getTechnoBlast(attacker.item)
    break
  case "Natural Gift":
    if (attacker.item.includes("Berry")) {
      const gift = getNaturalGift(attacker.item)
      moveType = gift.t; move.bp = gift.p
      description.attackerItem = attacker.item; description.moveBP = move.bp
    }
    description.moveType = moveType
    break
  case "Nature Power":
    moveType = getTerrainType(field.terrain)
    break
  case "Revelation Dance":
    moveType = attacker.type1
    description.moveType = moveType
    break
  }

  // -ate abilities
  let ateizeBoost = false
  const applicableNormalMove = moveType === "Normal" && move.name !== "Revelation Dance"
  if (applicableNormalMove && attacker.curAbility === "Aerilate") { moveType = "Flying"; ateizeBoost = true }
  else if (applicableNormalMove && attacker.curAbility === "Pixilate") { moveType = "Fairy"; ateizeBoost = true }
  else if (applicableNormalMove && attacker.curAbility === "Refrigerate") { moveType = "Ice"; ateizeBoost = true }
  else if (applicableNormalMove && attacker.curAbility === "Galvanize") { moveType = "Electric"; ateizeBoost = true }
  else if (attacker.curAbility === "Normalize" && !["Hidden Power","Weather Ball","Natural Gift","Judgment","Techno Blast","Revelation Dance","Multi-Attack","Terrain Pulse"].includes(move.name)) {
    moveType = "Normal"; description.attackerAbility = attacker.curAbility; ateizeBoost = true // gen 7
  } else if (attacker.curAbility === "Liquid Voice" && move.isSound) {
    moveType = "Water"; description.attackerAbility = attacker.curAbility
  }

  moveCategory = move.category
  makesContact = !!move.makesContact
  if (isShellSideArmPhysical(attacker, defender, move)) { moveCategory = "Physical"; makesContact = true }
  if (attacker.curAbility === "Long Reach") makesContact = false

  const scrappy = ["Scrappy","Mind's Eye"].includes(attacker.curAbility)
  let typeEffect1 = getMoveEffectiveness(move, moveType, defender.type1, scrappy, field, false, description)
  let typeEffect2 = defender.type2 ? getMoveEffectiveness(move, moveType, defender.type2, scrappy, field, false, description) : 1
  let typeEffectiveness = typeEffect1 * typeEffect2

  if (moveType === "Ground" && defender.hasType("Flying") && (defenderGrounded || move.name === "Thousand Arrows")) {
    if (field.isGravity) { description.gravity = true }
    else if (move.name === "Thousand Arrows") { typeEffectiveness = 1 }
    else if (defender.item === "Iron Ball") { description.defenderItem = defender.item; typeEffectiveness = 1 }
  }
  if (defender.item === "Ring Target" && typeEffectiveness === 0) {
    description.defenderItem = defender.item
    if (typeChart[moveType]?.[defender.type1] === 0) typeEffectiveness = typeEffect2
    else if (typeChart[moveType]?.[defender.type2] === 0) typeEffectiveness = typeEffect1
  }

  const otherHitsTypeEffectiveness = typeEffectiveness
  if (isTeraShell(defender, typeEffectiveness)) {
    typeEffectiveness = 0.5; description.defenderAbility = defender.curAbility
  }

  if (typeEffectiveness === 0) {
    return { damage: [0], description: buildDescription(description) }
  }
  if (defender.curAbility === "Wonder Guard" && typeEffectiveness <= 1 && move.name !== "Struggle" ||
    moveType === "Grass" && defender.curAbility === "Sap Sipper" ||
    moveType === "Fire" && ["Flash Fire","Well-Baked Body"].includes(defender.curAbility) ||
    moveType === "Water" && ["Dry Skin","Storm Drain","Water Absorb"].includes(defender.curAbility) ||
    moveType === "Electric" && ["Lightning Rod","Lightningrod","Motor Drive","Volt Absorb"].includes(defender.curAbility) ||
    moveType === "Ground" && move.name !== "Thousand Arrows" && defender.curAbility === "Levitate" && !defenderGrounded ||
    move.isBullet && defender.curAbility === "Bulletproof" ||
    move.isSound && defender.curAbility === "Soundproof" ||
    move.isWind && defender.curAbility === "Wind Rider") {
    description.defenderAbility = defender.curAbility
    return { damage: [0], description: buildDescription(description) }
  }
  if (moveType === "Ground" && move.name !== "Thousand Arrows" && defender.item === "Air Balloon" && !defenderGrounded) {
    description.defenderItem = defender.item
    return { damage: [0], description: buildDescription(description) }
  }

  if (move.name === "Synchronoise" && !attacker.hasType(defender.type1) && !attacker.hasType(defender.type2)) {
    return { damage: [0], description: buildDescription(description) }
  }
  if (hasPriority(move, attacker, field)) {
    // Psychic Terrain priority blocking is Gen 7+ only (not in Gen 6)
    if (["Dazzling","Queenly Majesty","Armor Tail"].includes(defender.curAbility)) {
      description.defenderAbility = defender.curAbility
      return { damage: [0], description: buildDescription(description) }
    }
  }

  const bypassProtect = !!(move.bypassesProtect || (attacker.curAbility === "Unseen Fist" && makesContact))
  if (field.isProtect && !move.isZ && !move.isMax && !bypassProtect) {
    description.defenderAbility = "Protecting"
    return { damage: [0], description: buildDescription(description) }
  }

  description.HPEVs = defender.HPEVs + " HP"
  if (attacker.level !== defender.level || (attacker.level !== 50 && attacker.level !== 100)) {
    description.attackerLevel = attacker.level; description.defenderLevel = defender.level
  }

  const singletonDamageValue = getSingletonDamage(attacker, defender, move, field, description)
  if (singletonDamageValue !== undefined) {
    return { damage: [singletonDamageValue], description: buildDescription(description) }
  }

  description.hits = move.hits

  isCritical = !!(move.isCrit && !["Battle Armor","Shell Armor"].includes(defender.curAbility))

  const finalBasePower = calcBP(attacker, defender, move, field, description, ateizeBoost)
  const attack = calcAtk(attacker, defender, move, field, description)
  const defense = calcDef(attacker, defender, move, field, description)
  const baseDamage = modBaseDamage(calcBaseDamage(finalBasePower, attack, defense, attacker.level), attacker, defender, move, field, description)
  const stabMod = calcSTABMod(attacker, move, description)
  const finalMod = calcFinalMods(attacker, defender, move, field, description, typeEffectiveness, bypassProtect)
  const applyBurn = attacker.status === "Burned" && moveCategory === "Physical" && attacker.curAbility !== "Guts" && move.name !== "Facade"
  description.isBurned = applyBurn

  let damage = calcDamageRange(baseDamage, stabMod, typeEffectiveness, applyBurn, finalMod)

  const result: Record<string, unknown> = { damage }
  const recalcDamage = recalcOtherHits(attacker, defender, move, field, description, result,
    typeEffectiveness, finalBasePower, attack, defense, baseDamage, stabMod, finalMod, applyBurn,
    otherHitsTypeEffectiveness, ateizeBoost, bypassProtect)
  if (recalcDamage) {
    result.firstHitDamage = damage
    damage = recalcDamage
  }

  return { damage, description: buildDescription(description) }
}

// --- Speed calculation for Gen 6 (ORAS/XY) ---

export function computeGen6Speed(pokemon: ModernPokemon, weather: string, _terrain: string): number {
  let speed = getModifiedStat(pokemon.rawStats[SP], pokemon.boosts[SP])
  if (pokemon.item === "Choice Scarf") speed = Math.floor(speed * 1.5)
  else if (pokemon.item === "Macho Brace" || pokemon.item === "Iron Ball") speed = Math.floor(speed / 2)
  if (pokemon.status === "Paralyzed" && pokemon.curAbility !== "Quick Feet") speed = Math.floor(speed / 4) // Gen 6: /4 (Gen 7+ uses /2)
  if (pokemon.curAbility === "Chlorophyll" && weather.includes("Sun") ||
    pokemon.curAbility === "Sand Rush" && weather === "Sand" ||
    pokemon.curAbility === "Swift Swim" && weather.includes("Rain")) {
    speed *= 2
  } else if (pokemon.curAbility === "Quick Feet" && (pokemon.status !== "Healthy" || pokemon.isAbilityActivated)) {
    speed = Math.floor(speed * 1.5)
  } else if (pokemon.curAbility === "Slow Start" && pokemon.isAbilityActivated) {
    speed = Math.floor(speed * 0.5)
  }
  return speed
}
