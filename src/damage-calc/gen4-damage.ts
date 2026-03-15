// Gen 4 (Pt/HGSS) damage calculator.
// Ported from damage_gen4.js (getDamageResultPtHGSS).
//
// Key Gen 4 differences vs Gen 6:
//   - No Fairy type
//   - No Z-moves, no Mega Evolution, no Dynamax/Terastal
//   - No Aurora Veil, no Battery, no Friend Guard
//   - No terrain
//   - Critical hits = ×2 (not ×1.5)
//   - Paralysis speed = ÷4 (same as Gen 6, not Gen 7's ÷2)
//   - Simple ability: doubles effective boost stage
//   - Rivalry ability: gender-based ±25% BP
//   - No Air Balloon (Gen 5+); isGrounded uses Iron Ball + Gravity only

// --- Module-level mutable state ---
let isFirstHit = true

// --- Interfaces ---

export interface Gen4Pokemon {
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
  moves: Gen4Move[]
  hasType: (type: string) => boolean
  resetCurAbility: () => void
}

export interface Gen4Move {
  name: string
  bp: number
  type: string
  category: "Physical" | "Special"
  isCrit?: boolean
  hits?: number
  isSpread?: boolean
  isSound?: boolean
  isMLG?: boolean
  isPunch?: boolean
  hasRecoil?: number | "crash"
  hasSecondaryEffect?: boolean
  makesContact?: boolean
  acc?: number
}

// Mixed side passed to getDamageResultPtHGSS:
// - format, weather, isHelpingHand, isCharge come from the attacker's side
// - isProtect, isReflect, isLightScreen come from the defender's side
// - isGravity is global
export interface Gen4Side {
  format: string
  weather: string
  isGravity: boolean
  isProtect: boolean
  isReflect: boolean
  isLightScreen: boolean
  isHelpingHand: boolean
  isCharge: boolean
}

// --- Type chart (Gen 4: no Fairy; effectiveness only, no category field) ---
const typeChart: Record<string, Record<string, number>> = {
  "Normal":   { Normal:1, Grass:1, Fire:1, Water:1, Electric:1, Ice:1, Flying:1, Bug:1, Poison:1, Ground:1, Rock:0.5, Fighting:1, Psychic:1, Ghost:0, Dragon:1, Dark:1, Steel:0.5 },
  "Grass":    { Normal:1, Grass:0.5, Fire:0.5, Water:2, Electric:1, Ice:1, Flying:0.5, Bug:0.5, Poison:0.5, Ground:2, Rock:2, Fighting:1, Psychic:1, Ghost:1, Dragon:0.5, Dark:1, Steel:0.5 },
  "Fire":     { Normal:1, Grass:2, Fire:0.5, Water:0.5, Electric:1, Ice:2, Flying:1, Bug:2, Poison:1, Ground:1, Rock:0.5, Fighting:1, Psychic:1, Ghost:1, Dragon:0.5, Dark:1, Steel:2 },
  "Water":    { Normal:1, Grass:0.5, Fire:2, Water:0.5, Electric:1, Ice:1, Flying:1, Bug:1, Poison:1, Ground:2, Rock:2, Fighting:1, Psychic:1, Ghost:1, Dragon:0.5, Dark:1, Steel:1 },
  "Electric": { Normal:1, Grass:0.5, Fire:1, Water:2, Electric:0.5, Ice:1, Flying:2, Bug:1, Poison:1, Ground:0, Rock:1, Fighting:1, Psychic:1, Ghost:1, Dragon:0.5, Dark:1, Steel:1 },
  "Ice":      { Normal:1, Grass:2, Fire:0.5, Water:0.5, Electric:1, Ice:0.5, Flying:2, Bug:1, Poison:1, Ground:2, Rock:1, Fighting:1, Psychic:1, Ghost:1, Dragon:2, Dark:1, Steel:0.5 },
  "Flying":   { Normal:1, Grass:2, Fire:1, Water:1, Electric:0.5, Ice:1, Flying:1, Bug:2, Poison:1, Ground:1, Rock:0.5, Fighting:2, Psychic:1, Ghost:1, Dragon:1, Dark:1, Steel:0.5 },
  "Bug":      { Normal:1, Grass:2, Fire:0.5, Water:1, Electric:1, Ice:1, Flying:0.5, Bug:1, Poison:0.5, Ground:1, Rock:1, Fighting:0.5, Psychic:2, Ghost:0.5, Dragon:1, Dark:2, Steel:0.5 },
  "Poison":   { Normal:1, Grass:2, Fire:1, Water:1, Electric:1, Ice:1, Flying:1, Bug:1, Poison:0.5, Ground:0.5, Rock:0.5, Fighting:1, Psychic:1, Ghost:0.5, Dragon:1, Dark:1, Steel:0 },
  "Ground":   { Normal:1, Grass:0.5, Fire:2, Water:1, Electric:2, Ice:1, Flying:0, Bug:0.5, Poison:2, Ground:1, Rock:2, Fighting:1, Psychic:1, Ghost:1, Dragon:1, Dark:1, Steel:2 },
  "Rock":     { Normal:1, Grass:1, Fire:2, Water:1, Electric:1, Ice:2, Flying:2, Bug:2, Poison:1, Ground:0.5, Rock:1, Fighting:0.5, Psychic:1, Ghost:1, Dragon:1, Dark:1, Steel:0.5 },
  "Fighting": { Normal:2, Grass:1, Fire:1, Water:1, Electric:1, Ice:2, Flying:0.5, Bug:0.5, Poison:0.5, Ground:1, Rock:2, Fighting:1, Psychic:0.5, Ghost:0, Dragon:1, Dark:2, Steel:2 },
  "Psychic":  { Normal:1, Grass:1, Fire:1, Water:1, Electric:1, Ice:1, Flying:1, Bug:1, Poison:2, Ground:1, Rock:1, Fighting:2, Psychic:0.5, Ghost:1, Dragon:1, Dark:0, Steel:0.5 },
  "Ghost":    { Normal:0, Grass:1, Fire:1, Water:1, Electric:1, Ice:1, Flying:1, Bug:1, Poison:1, Ground:1, Rock:1, Fighting:1, Psychic:2, Ghost:2, Dragon:1, Dark:0.5, Steel:0.5 },
  "Dragon":   { Normal:1, Grass:1, Fire:1, Water:1, Electric:1, Ice:1, Flying:1, Bug:1, Poison:1, Ground:1, Rock:1, Fighting:1, Psychic:1, Ghost:1, Dragon:2, Dark:1, Steel:0.5 },
  "Dark":     { Normal:1, Grass:1, Fire:1, Water:1, Electric:1, Ice:1, Flying:1, Bug:1, Poison:1, Ground:1, Rock:1, Fighting:0.5, Psychic:2, Ghost:2, Dragon:1, Dark:0.5, Steel:0.5 },
  "Steel":    { Normal:1, Grass:1, Fire:0.5, Water:0.5, Electric:0.5, Ice:2, Flying:1, Bug:1, Poison:1, Ground:1, Rock:2, Fighting:1, Psychic:1, Ghost:1, Dragon:1, Dark:1, Steel:0.5 },
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

// --- Helper functions ---

export function getModifiedStat(stat: number, mod: number): number {
  const boostTable = [1, 1.5, 2, 2.5, 3, 3.5, 4]
  if (mod >= 0) return Math.floor(stat * boostTable[mod])
  return Math.floor(stat / boostTable[-mod])
}

function getSimpleModifiedStat(stat: number, mod: number): number {
  const simpleMod = Math.min(6, Math.max(-6, mod * 2))
  return simpleMod > 0 ? Math.floor(stat * (2 + simpleMod) / 2)
    : simpleMod < 0 ? Math.floor(stat * 2 / (2 - simpleMod))
    : stat
}

function toSmogonStat(stat: string): string {
  return stat === "at" ? "Atk" : stat === "df" ? "Def" : stat === "sa" ? "SpA" : stat === "sd" ? "SpD" : stat === "sp" ? "Spe" : stat
}

function appendIfSet(str: string, toAppend: string | undefined): string {
  if (toAppend) return str + toAppend + " "
  return str
}

function getDescriptionPokemonName(pokemon: Gen4Pokemon): string {
  const m = / \(.+\)$/.exec(pokemon.setName)
  const display = m ? pokemon.setName.substring(0, m.index) : pokemon.setName
  const suffix = display.substring(display.lastIndexOf("-"))
  return suffix.length > 5 ? pokemon.name : display
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildDescription(desc: Record<string, any>): string {
  let out = ""
  if (desc.attackBoost) {
    if (desc.attackBoost > 0) out += "+"
    out += desc.attackBoost + " "
  }
  out = appendIfSet(out, desc.attackEVs)
  out = appendIfSet(out, desc.attackerItem)
  out = appendIfSet(out, desc.attackerAbility)
  if (desc.isBurned) out += "burned "
  if (desc.attackerLevel) out += "Lv. " + desc.attackerLevel + " "
  out += desc.attackerName + " "
  if (desc.isHelpingHand) out += "Helping Hand "
  if (desc.isCharge) out += "Charge "
  out += desc.moveName + " "
  if (desc.moveBP && desc.moveType) out += "(" + desc.moveBP + " BP " + desc.moveType + ") "
  else if (desc.moveBP) out += "(" + desc.moveBP + " BP) "
  else if (desc.moveType) out += "(" + desc.moveType + ") "
  if (desc.hits && desc.hits > 1) out += "(" + desc.hits + " hits) "
  if (desc.isSpread) out += "(spread) "
  out += "vs. "
  if (desc.defenseBoost) {
    if (desc.defenseBoost > 0) out += "+"
    out += desc.defenseBoost + " "
  }
  out = appendIfSet(out, desc.HPEVs)
  if (desc.defenseEVs) out += "/ " + desc.defenseEVs + " "
  out = appendIfSet(out, desc.defenderItem)
  out = appendIfSet(out, desc.defenderAbility)
  if (desc.defenderLevel) out += "Lv. " + desc.defenderLevel + " "
  out += desc.defenderName
  if (desc.weather) out += " in " + desc.weather
  if (desc.gravity) out += (desc.weather ? " and" : " in") + " Gravity"
  if (desc.isDoublesScreen) {
    out += " through Doubles " + (desc.isReflect ? "Reflect" : "Light Screen")
  } else if (desc.isReflect) {
    out += " through Reflect"
  } else if (desc.isLightScreen) {
    out += " through Light Screen"
  }
  if (desc.isCritical) out += " on a critical hit"
  return out
}

// --- Item helpers ---

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
  default: return ""
  }
}

function getFlingPower(item: string): number {
  if (item.includes("Plate")) return 90
  switch (item) {
  case "Iron Ball": return 130
  case "Hard Stone": return 100
  case "Deep Sea Tooth": case "Thick Club": return 90
  case "Quick Claw": case "Razor Claw": return 80
  case "Dragon Fang": case "Poison Barb": return 70
  case "Adamant Orb": case "Damp Rock": case "Griseous Orb": case "Heat Rock":
  case "Lustrous Orb": case "Macho Brace": return 60
  case "Toxic Orb": case "Flame Orb": case "Light Ball": case "King's Rock": case "Razor Fang": return 30
  default: return 10
  }
}

const NATURAL_GIFT_STATS_G4: Record<string, { t: string; p: number }> = {
  // Gen 4 Natural Gift values (60 BP for most berries, some at 70 or 80)
  "Cheri Berry": {t:"Fire",p:60}, "Chesto Berry": {t:"Water",p:60}, "Pecha Berry": {t:"Electric",p:60},
  "Rawst Berry": {t:"Grass",p:60}, "Aspear Berry": {t:"Ice",p:60}, "Leppa Berry": {t:"Fighting",p:60},
  "Oran Berry": {t:"Poison",p:60}, "Persim Berry": {t:"Ground",p:60}, "Lum Berry": {t:"Flying",p:60},
  "Sitrus Berry": {t:"Psychic",p:60}, "Figy Berry": {t:"Fire",p:70}, "Wiki Berry": {t:"Water",p:70},
  "Mago Berry": {t:"Grass",p:70}, "Aguav Berry": {t:"Dragon",p:70}, "Iapapa Berry": {t:"Dark",p:70},
  "Razz Berry": {t:"Rock",p:60}, "Bluk Berry": {t:"Fire",p:60}, "Nanab Berry": {t:"Water",p:60},
  "Wepear Berry": {t:"Electric",p:60}, "Pinap Berry": {t:"Grass",p:60},
  "Pomeg Berry": {t:"Ice",p:60}, "Kelpsy Berry": {t:"Fighting",p:60},
  "Qualot Berry": {t:"Poison",p:60}, "Hondew Berry": {t:"Ground",p:60},
  "Grepa Berry": {t:"Flying",p:60}, "Tamato Berry": {t:"Psychic",p:60},
  "Cornn Berry": {t:"Bug",p:60}, "Magost Berry": {t:"Rock",p:60},
  "Rabuta Berry": {t:"Ghost",p:60}, "Nomel Berry": {t:"Dragon",p:60},
  "Spelon Berry": {t:"Dark",p:70}, "Pamtre Berry": {t:"Steel",p:70},
  "Watmel Berry": {t:"Fire",p:80}, "Durin Berry": {t:"Water",p:80},
  "Belue Berry": {t:"Electric",p:80}, "Occa Berry": {t:"Fire",p:60},
  "Passho Berry": {t:"Water",p:60}, "Wacan Berry": {t:"Electric",p:60},
  "Rindo Berry": {t:"Grass",p:60}, "Yache Berry": {t:"Ice",p:60},
  "Chople Berry": {t:"Fighting",p:60}, "Kebia Berry": {t:"Poison",p:60},
  "Shuca Berry": {t:"Ground",p:60}, "Coba Berry": {t:"Flying",p:60},
  "Payapa Berry": {t:"Psychic",p:60}, "Tanga Berry": {t:"Bug",p:60},
  "Charti Berry": {t:"Rock",p:60}, "Kasib Berry": {t:"Ghost",p:60},
  "Haban Berry": {t:"Dragon",p:60}, "Colbur Berry": {t:"Dark",p:60},
  "Babiri Berry": {t:"Steel",p:60}, "Chilan Berry": {t:"Normal",p:60},
  "Liechi Berry": {t:"Grass",p:80}, "Ganlon Berry": {t:"Ice",p:80},
  "Salac Berry": {t:"Fighting",p:80}, "Petaya Berry": {t:"Poison",p:80},
  "Apicot Berry": {t:"Ground",p:80}, "Lansat Berry": {t:"Flying",p:80},
  "Starf Berry": {t:"Psychic",p:80}, "Enigma Berry": {t:"Bug",p:80},
  "Micle Berry": {t:"Rock",p:80}, "Custap Berry": {t:"Ghost",p:80},
  "Jaboca Berry": {t:"Dragon",p:80}, "Rowap Berry": {t:"Dark",p:80},
}

function getNaturalGift(item: string): { t: string; p: number } {
  return NATURAL_GIFT_STATS_G4[item] ?? { t: "Normal", p: 1 }
}

function getWeatherBall(weather: string): string {
  if (weather.includes("Sun")) return "Fire"
  if (weather.includes("Rain")) return "Water"
  if (weather === "Sand") return "Rock"
  if (weather === "Hail") return "Ice"
  return "Normal"
}

// In Gen 4: grounded if Iron Ball or Gravity; not grounded if Flying-type or Levitate.
// (No Air Balloon until Gen 5)
function isGrounded(pokemon: Gen4Pokemon, field: Gen4Side): boolean {
  if (field.isGravity || pokemon.item === "Iron Ball") return true
  return !(pokemon.hasType("Flying") || pokemon.curAbility === "Levitate")
}

function getMoveEffectiveness(moveType: string, defType: string, isGroundedFlying: boolean): number {
  if (moveType === "Ground" && defType === "Flying" && isGroundedFlying) return 1
  return typeChart[moveType]?.[defType] ?? 1
}

function killsShedinja(attacker: Gen4Pokemon, defender: Gen4Pokemon, move: Gen4Move): boolean {
  if (!(defender.ability === "Wonder Guard" && defender.curHP === 1)) return false
  const afflictable = defender.status === "Healthy"
  const poisonable = afflictable && !["Poison","Steel"].some(t => defender.hasType(t))
  const burnable = afflictable && !defender.hasType("Fire")
  const poison = ["Toxic","Poison Gas","Poison Powder"].includes(move.name) && poisonable
  const burn = move.name === "Will-O-Wisp" && burnable
  const confusion = ["Confuse Ray","Supersonic","Sweet Kiss","Teeter Dance","Flatter","Swagger"].includes(move.name)
  const otherPassive = (move.name === "Leech Seed" && !defender.hasType("Grass")) ||
                       (move.name === "Curse" && attacker.hasType("Ghost"))
  return poison || burn || confusion || otherPassive
}

function getSingletonDamage(attacker: Gen4Pokemon, defender: Gen4Pokemon, move: Gen4Move): number | undefined {
  switch (move.name) {
  case "Seismic Toss": case "Night Shade": return attacker.level
  case "Psywave": return Math.floor(attacker.level * 1.5)
  case "Sonic Boom": return 20
  case "Dragon Rage": return 40
  case "Super Fang": return Math.max(Math.floor(defender.curHP / 2), 1)
  case "Final Gambit": return attacker.curHP
  }
  return undefined
}

function getTripleKickDamage(attacker: Gen4Pokemon, defender: Gen4Pokemon, move: Gen4Move, field: Gen4Side): number[][] | undefined {
  if (!isFirstHit || move.name !== "Triple Kick") return undefined
  const damageArrays: number[][] = []
  const startingBP = move.bp
  isFirstHit = false
  for (let hitNum = 1; hitNum <= (move.hits ?? 1); hitNum++) {
    move.bp = startingBP * hitNum
    damageArrays.push(getDamageResultPtHGSS(attacker, defender, move, field).damage)
  }
  isFirstHit = true
  move.bp = startingBP
  return damageArrays
}

export function checkAirLock(pokemon: Gen4Pokemon, fieldState: { weather: string; clearWeather(): void }): void {
  if (pokemon.curAbility === "Air Lock" || pokemon.curAbility === "Cloud Nine") {
    fieldState.clearWeather()
  }
}

export function checkKlutz(pokemon: Gen4Pokemon): void {
  if (pokemon.curAbility === "Klutz" && pokemon.item) {
    pokemon.item = "Klutz"
  }
}

export function computeGen4Speed(pokemon: Gen4Pokemon, weather: string): number {
  let speed = getModifiedStat(pokemon.rawStats["sp"], pokemon.boosts["sp"])
  if (pokemon.status === "Paralyzed" && pokemon.curAbility !== "Quick Feet") {
    speed = Math.floor(speed / 4)
  }
  if (pokemon.item === "Choice Scarf") speed = Math.floor(speed * 1.5)
  else if (pokemon.item === "Macho Brace" || pokemon.item === "Iron Ball") speed = Math.floor(speed / 2)
  if (pokemon.curAbility === "Chlorophyll" && weather.includes("Sun")) speed *= 2
  else if (pokemon.curAbility === "Swift Swim" && weather.includes("Rain")) speed *= 2
  else if (pokemon.curAbility === "Sand Rush" && weather === "Sand") speed *= 2
  else if (pokemon.curAbility === "Quick Feet" &&
    (pokemon.status !== "Healthy" || pokemon.isAbilityActivated)) {
    speed = Math.floor(speed * 1.5)
  } else if (pokemon.curAbility === "Slow Start" && pokemon.isAbilityActivated) {
    speed = Math.floor(speed * 0.5)
  }
  return speed
}

// --- Main calculation ---

export function getDamageResultPtHGSS(
  attacker: Gen4Pokemon,
  defender: Gen4Pokemon,
  move: Gen4Move,
  field: Gen4Side,
): { damage: number[]; description: string; tripleAxelDamage?: number[][] } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const desc: Record<string, any> = {
    attackerName: getDescriptionPokemonName(attacker),
    moveName: move.name,
    defenderName: getDescriptionPokemonName(defender),
  }

  if (killsShedinja(attacker, defender, move)) {
    return { damage: [1], description: buildDescription(desc) }
  }
  if (move.bp === 0) {
    return { damage: [0], description: buildDescription(desc) }
  }
  if (field.isProtect) {
    return { damage: [0], description: buildDescription(desc) }
  }

  if (attacker.ability === "Mold Breaker") {
    defender.curAbility = ""
  }

  let moveType = move.type
  const isCritical = !!move.isCrit && !["Battle Armor","Shell Armor"].includes(defender.curAbility)
  let basePower = move.bp

  // Move type overrides
  if (move.name === "Weather Ball") {
    moveType = getWeatherBall(field.weather)
    if (moveType !== "Normal") desc.weather = field.weather
  } else if (move.name === "Judgment" && attacker.item.includes("Plate")) {
    moveType = getItemBoostType(attacker.item)
  } else if (move.name === "Natural Gift" && attacker.item.includes("Berry")) {
    const gift = getNaturalGift(attacker.item)
    moveType = gift.t
    basePower = gift.p
    desc.attackerItem = attacker.item
    desc.moveBP = basePower
  }

  if (move.type !== moveType) desc.moveType = moveType

  if (attacker.ability === "Normalize") {
    moveType = "Normal"
    desc.attackerAbility = attacker.ability
  }

  const attackerGrounded = isGrounded(attacker, field)
  const defenderGrounded = isGrounded(defender, field)

  const typeEffect1 = getMoveEffectiveness(moveType, defender.type1, defenderGrounded)
  const typeEffect2 = defender.type2 ? getMoveEffectiveness(moveType, defender.type2, defenderGrounded) : 1
  const typeEffectiveness = typeEffect1 * typeEffect2

  // Gravity/Iron Ball note for grounded Flying types
  if (moveType === "Ground" && defender.hasType("Flying") && defenderGrounded) {
    if (field.isGravity) desc.gravity = true
    else if (defender.item === "Iron Ball") desc.defenderItem = defender.item
  }

  if (typeEffectiveness === 0) {
    return { damage: [0], description: buildDescription(desc) }
  }

  if ((defender.curAbility === "Wonder Guard" && typeEffectiveness <= 1 &&
      !["Struggle","Beat Up","Future Sight","Doom Desire","Fire Fang"].includes(move.name)) ||
      (moveType === "Fire" && defender.curAbility === "Flash Fire") ||
      (moveType === "Water" && ["Dry Skin","Water Absorb"].includes(defender.curAbility)) ||
      (moveType === "Electric" && ["Motor Drive","Volt Absorb"].includes(defender.curAbility)) ||
      (moveType === "Ground" && defender.curAbility === "Levitate" && !defenderGrounded) ||
      (move.isSound && defender.curAbility === "Soundproof") ||
      (move.isMLG && defender.curAbility === "Sturdy")) {
    desc.defenderAbility = defender.curAbility
    return { damage: [0], description: buildDescription(desc) }
  }

  desc.HPEVs = defender.HPEVs + " HP"
  if (attacker.level !== defender.level || (attacker.level !== 50 && attacker.level !== 100)) {
    desc.attackerLevel = attacker.level
    desc.defenderLevel = defender.level
  }

  const singletonDmg = getSingletonDamage(attacker, defender, move)
  if (singletonDmg !== undefined) {
    return { damage: [singletonDmg], description: buildDescription(desc) }
  }

  if ((move.hits ?? 1) > 1) desc.hits = move.hits

  ////////////////////////////////
  ////////// BASE POWER //////////
  ////////////////////////////////
  const turnOrder = attacker.stats["sp"] > defender.stats["sp"] ? "FIRST" : "LAST"

  switch (move.name) {
  case "Brine":
    if (defender.curHP <= Math.floor(defender.maxHP / 2)) { basePower *= 2; desc.moveBP = basePower }
    break
  case "Eruption": case "Water Spout":
    basePower = Math.max(1, Math.floor(basePower * attacker.curHP / attacker.maxHP))
    desc.moveBP = basePower; break
  case "Facade":
    if (["Paralyzed","Poisoned","Badly Poisoned","Burned"].includes(attacker.status)) {
      basePower *= 2; desc.moveBP = basePower
    }
    break
  case "Flail": case "Reversal": {
    const p = Math.floor(64 * attacker.curHP / attacker.maxHP)
    basePower = p <= 1 ? 200 : p <= 5 ? 150 : p <= 12 ? 100 : p <= 21 ? 80 : p <= 42 ? 40 : 20
    desc.moveBP = basePower; break
  }
  case "Fling":
    basePower = getFlingPower(attacker.item)
    desc.moveBP = basePower; desc.attackerItem = attacker.item; break
  case "Grass Knot": case "Low Kick": {
    const w = defender.weight
    basePower = w >= 200 ? 120 : w >= 100 ? 100 : w >= 50 ? 80 : w >= 25 ? 60 : w >= 10 ? 40 : 20
    desc.moveBP = basePower; break
  }
  case "Gyro Ball":
    basePower = attacker.stats["sp"] === 0 ? 1 :
      Math.min(150, Math.floor(25 * defender.stats["sp"] / attacker.stats["sp"]) + 1)
    desc.moveBP = basePower; break
  case "Magnitude":
    desc.moveBP = basePower; break
  case "Payback":
    if (turnOrder !== "FIRST") { basePower *= 2; desc.moveBP = basePower }
    break
  case "Punishment": {
    let boostCount = 0
    for (const b of Object.values(defender.boosts)) { if ((b as number) > 0) boostCount += (b as number) }
    if (boostCount > 0) { basePower = Math.min(200, basePower + 20 * boostCount); desc.moveBP = basePower }
    break
  }
  case "Smelling Salts":
    if (defender.status === "Paralyzed") { basePower *= 2; desc.moveBP = basePower }
    break
  case "Triple Kick":
    desc.moveBP = String(basePower)
    for (let i = 2; i <= (move.hits ?? 1); i++) desc.moveBP += ", " + (basePower * i)
    break
  case "Wake-Up Slap":
    if (defender.status === "Asleep") { basePower *= 2; desc.moveBP = basePower }
    break
  case "Weather Ball":
    basePower *= field.weather !== "" ? 2 : 1; desc.moveBP = basePower; break
  case "Wring Out": case "Crush Grip":
    basePower = Math.floor(defender.curHP * 120 / defender.maxHP) + 1
    desc.moveBP = basePower; break
  }

  if (field.isHelpingHand) { basePower = Math.floor(basePower * 1.5); desc.isHelpingHand = true }

  const isPhysical = move.category === "Physical"

  // Muscle Band / Wise Glasses
  if ((attacker.item === "Muscle Band" && isPhysical) ||
      (attacker.item === "Wise Glasses" && !isPhysical)) {
    basePower = Math.floor(basePower * 1.1); desc.attackerItem = attacker.item
  } else if (getItemBoostType(attacker.item) === moveType ||
    ((attacker.item === "Adamant Orb" && attacker.name === "Dialga") ||
     (attacker.item === "Lustrous Orb" && attacker.name === "Palkia") ||
     (attacker.item === "Griseous Orb" && attacker.name.startsWith("Giratina"))) &&
    attacker.hasType(moveType)) {
    basePower = Math.floor(basePower * 1.2); desc.attackerItem = attacker.item
  }

  if (field.isCharge && moveType === "Electric") { basePower *= 2; desc.isCharge = true }

  // Rivalry
  if (attacker.curAbility === "Rivalry" && attacker.isAbilityActivated) {
    if (attacker.isAbilityActivated === true) {
      basePower = Math.floor(basePower * 1.25)
      desc.attackerAbility = attacker.curAbility + " (increasing)"
    } else if (attacker.isAbilityActivated === "indeterminate") {
      basePower = Math.floor(basePower * 0.75)
      desc.attackerAbility = attacker.curAbility + " (decreasing)"
    }
  }

  // Reckless / Iron Fist / pinch abilities / Technician
  if ((attacker.ability === "Reckless" && move.hasRecoil) ||
      (attacker.ability === "Iron Fist" && move.isPunch)) {
    basePower = Math.floor(basePower * 1.2); desc.attackerAbility = attacker.ability
  } else if ((
    (attacker.curAbility === "Overgrow" && moveType === "Grass") ||
    (attacker.curAbility === "Blaze" && moveType === "Fire") ||
    (attacker.curAbility === "Torrent" && moveType === "Water") ||
    (attacker.curAbility === "Swarm" && moveType === "Bug")) &&
    (attacker.curHP <= attacker.maxHP / 3 || attacker.isAbilityActivated)) {
    basePower = Math.floor(basePower * 1.5); desc.attackerAbility = attacker.curAbility
  } else if (attacker.ability === "Technician" && basePower <= 60 && move.name !== "Struggle") {
    basePower = Math.floor(basePower * 1.5); desc.attackerAbility = attacker.ability
  }

  // Thick Fat / Heatproof / Dry Skin (defender)
  if ((defender.curAbility === "Thick Fat" && (moveType === "Fire" || moveType === "Ice")) ||
      (defender.curAbility === "Heatproof" && moveType === "Fire")) {
    basePower = Math.floor(basePower * 0.5); desc.defenderAbility = defender.curAbility
  } else if (defender.curAbility === "Dry Skin" && moveType === "Fire") {
    basePower = Math.floor(basePower * 1.25); desc.defenderAbility = defender.curAbility
  }

  ////////////////////////////////
  ////////// (SP)ATTACK //////////
  ////////////////////////////////
  const attackStat = isPhysical ? "at" : "sa"
  const defenseStat = isPhysical ? "df" : "sd"

  desc.attackEVs = attacker.evs[attackStat] +
    (NATURES[attacker.nature]?.[0] === attackStat ? "+" : NATURES[attacker.nature]?.[1] === attackStat ? "-" : "") +
    " " + toSmogonStat(attackStat)
  desc.defenseEVs = defender.evs[defenseStat] +
    (NATURES[defender.nature]?.[0] === defenseStat ? "+" : NATURES[defender.nature]?.[1] === defenseStat ? "-" : "") +
    " " + toSmogonStat(defenseStat)

  const rawAttack = attacker.rawStats[attackStat]
  const attackBoost = attacker.boosts[attackStat]
  let attack: number
  if (attackBoost === 0 || (isCritical && attackBoost < 0)) {
    attack = rawAttack
  } else if (defender.curAbility === "Unaware") {
    attack = rawAttack; desc.defenderAbility = defender.curAbility
  } else if (attacker.ability === "Simple") {
    attack = getSimpleModifiedStat(rawAttack, attackBoost)
    desc.attackerAbility = attacker.ability; desc.attackBoost = attackBoost
  } else {
    attack = getModifiedStat(rawAttack, attackBoost); desc.attackBoost = attackBoost
  }

  // Attack ability modifiers
  if (isPhysical && (attacker.ability === "Pure Power" || attacker.ability === "Huge Power")) {
    attack *= 2; desc.attackerAbility = attacker.ability
  } else if (field.weather === "Sun" && (isPhysical ? attacker.ability === "Flower Gift" : attacker.ability === "Solar Power")) {
    attack = Math.floor(attack * 1.5); desc.attackerAbility = attacker.ability; desc.weather = field.weather
  } else if (isPhysical && (attacker.ability === "Hustle" ||
    (attacker.ability === "Guts" && (attacker.status !== "Healthy" || attacker.isAbilityActivated)))) {
    attack = Math.floor(attack * 1.5); desc.attackerAbility = attacker.ability
  } else if (!isPhysical && (attacker.ability === "Plus" || attacker.ability === "Minus") &&
    attacker.isAbilityActivated) {
    attack = Math.floor(attack * 1.5); desc.attackerAbility = attacker.ability
  } else if (isPhysical && attacker.ability === "Slow Start" && attacker.isAbilityActivated) {
    attack = Math.floor(attack * 0.5); desc.attackerAbility = attacker.ability
  }

  // Attack item modifiers
  if ((isPhysical ? attacker.item === "Choice Band" : attacker.item === "Choice Specs") ||
    (!isPhysical && attacker.item === "Soul Dew" &&
      (attacker.name === "Latios" || attacker.name === "Latias"))) {
    attack = Math.floor(attack * 1.5); desc.attackerItem = attacker.item
  } else if ((attacker.item === "Light Ball" && attacker.name === "Pikachu") ||
    (isPhysical && attacker.item === "Thick Club" &&
      (attacker.name === "Cubone" || attacker.name === "Marowak")) ||
    (!isPhysical && attacker.item === "Deep Sea Tooth" && attacker.name === "Clamperl")) {
    attack *= 2; desc.attackerItem = attacker.item
  }

  ////////////////////////////////
  ///////// (SP)DEFENSE //////////
  ////////////////////////////////
  const rawDefense = defender.rawStats[defenseStat]
  const defenseBoost = defender.boosts[defenseStat]
  let defense: number
  if (defenseBoost === 0 || (isCritical && defenseBoost > 0)) {
    defense = rawDefense
  } else if (attacker.ability === "Unaware") {
    defense = rawDefense; desc.attackerAbility = attacker.ability
  } else if (defender.curAbility === "Simple") {
    defense = getSimpleModifiedStat(rawDefense, defenseBoost)
    desc.defenderAbility = defender.curAbility; desc.defenseBoost = defenseBoost
  } else {
    defense = getModifiedStat(rawDefense, defenseBoost); desc.defenseBoost = defenseBoost
  }

  // Defense ability modifiers
  if (defender.curAbility === "Marvel Scale" &&
    (defender.status !== "Healthy" || defender.isAbilityActivated) && isPhysical) {
    defense = Math.floor(defense * 1.5); desc.defenderAbility = defender.curAbility
  } else if (defender.curAbility === "Flower Gift" && field.weather === "Sun" && !isPhysical) {
    defense = Math.floor(defense * 1.5); desc.defenderAbility = defender.curAbility; desc.weather = field.weather
  }

  // Defense item modifiers
  if (!isPhysical && defender.item === "Soul Dew" &&
    (defender.name === "Latios" || defender.name === "Latias")) {
    defense = Math.floor(defense * 1.5); desc.defenderItem = defender.item
  } else if ((!isPhysical && defender.item === "Deep Sea Scale" && defender.name === "Clamperl") ||
    (isPhysical && defender.item === "Metal Powder" && defender.name === "Ditto")) {
    defense *= 2; desc.defenderItem = defender.item
  }

  // Sand boosts Rock special defense
  if (field.weather === "Sand" && defender.hasType("Rock") && !isPhysical) {
    defense = Math.floor(defense * 1.5); desc.weather = field.weather
  }

  // Explosion / Self-Destruct halve defense
  if (move.name === "Explosion" || move.name === "Self-Destruct") {
    defense = Math.floor(defense / 2)
  }

  if (defense < 1) defense = 1

  ////////////////////////////////
  //////////// DAMAGE ////////////
  ////////////////////////////////
  let baseDamage = Math.floor(
    Math.floor(Math.floor(2 * attacker.level / 5 + 2) * basePower * attack / 50) / defense
  )

  if (attacker.status === "Burned" && isPhysical && attacker.ability !== "Guts") {
    baseDamage = Math.floor(baseDamage * 0.5); desc.isBurned = true
  }

  if (!(isCritical || move.name === "Brick Break")) {
    desc.isReflect = field.isReflect && isPhysical
    desc.isLightScreen = field.isLightScreen && !isPhysical
    if (desc.isReflect || desc.isLightScreen) {
      if (field.format === "singles") {
        baseDamage = Math.floor(baseDamage / 2)
      } else {
        baseDamage = Math.floor(baseDamage * 2 / 3)
        desc.isDoublesScreen = true
      }
    }
  }

  if (field.format === "doubles" && move.isSpread) {
    baseDamage = Math.floor(baseDamage * 3 / 4); desc.isSpread = true
  }

  if ((field.weather === "Sun" && moveType === "Fire") ||
      (field.weather === "Rain" && moveType === "Water")) {
    baseDamage = Math.floor(baseDamage * 1.5); desc.weather = field.weather
  } else if ((field.weather === "Sun" && moveType === "Water") ||
    (field.weather === "Rain" && moveType === "Fire") ||
    (["Rain","Sand","Hail"].includes(field.weather) && move.name === "Solar Beam")) {
    baseDamage = Math.floor(baseDamage * 0.5); desc.weather = field.weather
  }

  if (attacker.ability === "Flash Fire" && attacker.isAbilityActivated && moveType === "Fire") {
    baseDamage = Math.floor(baseDamage * 1.5); desc.attackerAbility = attacker.ability
  }

  baseDamage += 2

  if (isCritical) {
    if (attacker.ability === "Sniper") {
      baseDamage *= 3; desc.attackerAbility = attacker.ability
    } else {
      baseDamage *= 2
    }
    desc.isCritical = true
  }

  if (attacker.item === "Life Orb") {
    baseDamage = Math.floor(baseDamage * 1.3); desc.attackerItem = attacker.item
  }

  // Random rolls + STAB + type + mods
  const stabMod = attacker.hasType(moveType) ? (attacker.ability === "Adaptability" ? 2 : 1.5) : 1
  if (attacker.ability === "Adaptability" && attacker.hasType(moveType)) {
    desc.attackerAbility = attacker.ability
  }

  const filterMod = (defender.curAbility === "Filter" || defender.curAbility === "Solid Rock") &&
    typeEffectiveness > 1 ? 0.75 : 1
  if (filterMod !== 1) desc.defenderAbility = defender.curAbility

  const ebeltMod = attacker.item === "Expert Belt" && typeEffectiveness > 1 ? 1.2 : 1
  if (ebeltMod !== 1) desc.attackerItem = attacker.item

  const tintedMod = attacker.ability === "Tinted Lens" && typeEffectiveness < 1 ? 2 : 1
  if (tintedMod !== 1) desc.attackerAbility = attacker.ability

  const berryResistType = getBerryResistType(defender.item)
  const berryMod = isFirstHit && berryResistType === moveType &&
    (typeEffectiveness > 1 || moveType === "Normal") &&
    attacker.ability !== "Unnerve" ? 0.5 : 1
  if (berryMod !== 1) desc.defenderItem = defender.item + (move.hits && move.hits > 1 ? " (first hit only)" : "")

  const damage: number[] = []
  for (let i = 0; i < 16; i++) {
    let d = Math.floor(baseDamage * (85 + i) / 100)
    d = Math.floor(d * stabMod)
    d = Math.floor(d * typeEffect1)
    d = Math.floor(d * typeEffect2)
    d = Math.floor(d * filterMod)
    d = Math.floor(d * ebeltMod)
    d = Math.floor(d * tintedMod)
    d = Math.floor(d * berryMod)
    damage[i] = Math.max(1, d)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: { damage: number[]; description: string; firstHitDamage?: number[]; tripleAxelDamage?: number[][] } = {
    damage,
    description: buildDescription(desc),
  }

  const tripleKickDamage = getTripleKickDamage(attacker, defender, move, field)
  if (tripleKickDamage) result.tripleAxelDamage = tripleKickDamage

  if (isFirstHit && berryMod !== 1) {
    result.firstHitDamage = damage
    isFirstHit = false
    result.damage = getDamageResultPtHGSS(attacker, defender, move, field).damage
    isFirstHit = true
  }

  return result
}
