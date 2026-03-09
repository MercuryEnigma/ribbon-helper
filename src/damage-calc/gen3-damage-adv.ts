// Extracted from damage_gen3.js for Gen 3 (Emerald) use.
// All calculation logic is adapted directly from damage_gen3.js.

// --- Module-level mutable state ---
let isFirstHit = true

// --- Natures ---
export const NATURES: Record<string, [string, string]> = {
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

// --- Interfaces ---

export interface Gen3Pokemon {
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
  isAbilityActivated: boolean
  item: string
  status: string
  weight: number
  hasType: (type: string) => boolean
}

export interface Gen3Move {
  name: string
  bp: number
  type: string
  isCrit?: boolean
  hits?: number
  isSpread?: boolean
  isSound?: boolean
  isMLG?: boolean
}

// Mixed side passed to getDamageResultADV:
// - format, weather, isHelpingHand, isCharge come from the attacker's side
// - isProtect, isReflect, isLightScreen come from the defender's side
export interface Gen3Side {
  format: string
  weather: string
  isProtect: boolean
  isReflect: boolean
  isLightScreen: boolean
  isHelpingHand: boolean
  isCharge: boolean
}

// --- Type chart (Gen 3: physical/special split by type) ---
const typeChart: Record<string, { category: "Physical" | "Special" } & Record<string, number>> = {
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

// --- Helper functions ---

function appendIfSet(str: string, toAppend: string | undefined): string {
  if (toAppend) return str + toAppend + " "
  return str
}

function toSmogonStat(stat: string): string {
  return stat === "at" ? "Atk" : stat === "df" ? "Def" : stat === "sa" ? "SpA" : stat === "sd" ? "SpD" : stat === "sp" ? "Spe" : stat
}

function getDescriptionPokemonName(pokemon: Gen3Pokemon): string {
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

export function getModifiedStat(stat: number, mod: number): number {
  const boostTable = [1, 1.5, 2, 2.5, 3, 3.5, 4]
  if (mod >= 0) return Math.floor(stat * boostTable[mod])
  return Math.floor(stat / boostTable[-mod])
}

export function computeGen3Speed(pokemon: Gen3Pokemon, weather: string): number {
  let speed = getModifiedStat(pokemon.rawStats["sp"], pokemon.boosts["sp"])
  if (pokemon.item === "Macho Brace") speed = Math.floor(speed / 2)
  if (pokemon.status === "Paralyzed") speed = Math.floor(speed / 4)
  if (pokemon.curAbility === "Chlorophyll" && weather.includes("Sun")) speed *= 2
  if (pokemon.curAbility === "Swift Swim" && weather.includes("Rain")) speed *= 2
  return speed
}

function getMoveEffectiveness(moveType: string, defType: string): number {
  return (typeChart[moveType]?.[defType] as number) ?? 1
}

function getItemBoostType(item: string): string {
  switch (item) {
    case "Dragon Fang": return "Dragon"
    case "Black Glasses": case "BlackGlasses": return "Dark"
    case "Soft Sand": return "Ground"
    case "Black Belt": return "Fighting"
    case "Charcoal": return "Fire"
    case "Never-Melt Ice": return "Ice"
    case "Silver Powder": return "Bug"
    case "Metal Coat": return "Steel"
    case "Miracle Seed": return "Grass"
    case "Twisted Spoon": return "Psychic"
    case "Sharp Beak": return "Flying"
    case "Mystic Water": return "Water"
    case "Spell Tag": return "Ghost"
    case "Hard Stone": return "Rock"
    case "Poison Barb": return "Poison"
    case "Magnet": return "Electric"
    case "Silk Scarf": return "Normal"
    default: return ""
  }
}

function getWeatherBall(weather: string): string {
  if (weather.includes("Sun")) return "Fire"
  if (weather.includes("Rain")) return "Water"
  if (weather === "Sand") return "Rock"
  if (weather === "Hail") return "Ice"
  return "Normal"
}

function killsShedinja(attacker: Gen3Pokemon, defender: Gen3Pokemon, move: Gen3Move): boolean {
  if (!(defender.ability === "Wonder Guard" && defender.curHP === 1)) return false
  const afflictable = defender.status === "Healthy"
  const poisonable = afflictable && !["Poison", "Steel"].some(t => defender.hasType(t))
  const burnable = afflictable && !defender.hasType("Fire")
  const weather = (move.name === "Sandstorm" && !["Rock","Steel","Ground"].some(t => defender.hasType(t))) ||
                  (move.name === "Hail" && !defender.hasType("Ice"))
  const poison = ["Toxic", "Poison Gas", "Poison Powder"].includes(move.name) && poisonable
  const burn = move.name === "Will-O-Wisp" && burnable
  const confusion = ["Confuse Ray", "Supersonic", "Sweet Kiss", "Teeter Dance"].includes(move.name)
  const otherPassive = (move.name === "Leech Seed" && !defender.hasType("Grass")) ||
                       (move.name === "Curse" && attacker.hasType("Ghost"))
  return weather || poison || burn || confusion || otherPassive
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSingletonDamage(attacker: Gen3Pokemon, defender: Gen3Pokemon, move: Gen3Move): number | undefined {
  switch (move.name) {
    case "Seismic Toss": case "Night Shade": return attacker.level
    case "Psywave": return Math.floor(attacker.level * 1.5)
    case "Sonic Boom": return 20
    case "Dragon Rage": return 40
    case "Super Fang": return Math.max(Math.floor(defender.curHP / 2), 1)
  }
  return undefined
}

function getTripleKickDamage(attacker: Gen3Pokemon, defender: Gen3Pokemon, move: Gen3Move, field: Gen3Side): number[][] | undefined {
  if (!isFirstHit || move.name !== "Triple Kick") return undefined
  const damageArrays: number[][] = []
  const startingBP = move.bp
  isFirstHit = false
  for (let hitNum = 1; hitNum <= (move.hits ?? 1); hitNum++) {
    move.bp = startingBP * hitNum
    damageArrays.push(getDamageResultADV(attacker, defender, move, field).damage)
  }
  isFirstHit = true
  move.bp = startingBP
  return damageArrays
}

export function checkAirLock(pokemon: Gen3Pokemon, fieldState: { weather: string; clearWeather(): void }): void {
  if (pokemon.curAbility === "Air Lock" || pokemon.curAbility === "Cloud Nine") {
    fieldState.clearWeather()
  }
}

// --- Main calculation ---

export function getDamageResultADV(
  attacker: Gen3Pokemon,
  defender: Gen3Pokemon,
  move: Gen3Move,
  field: Gen3Side,
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

  let moveType = move.type
  const isCritical = !!move.isCrit && !["Battle Armor", "Shell Armor"].includes(defender.ability)

  if (move.name === "Weather Ball") {
    moveType = getWeatherBall(field.weather)
    if (moveType !== "Normal") desc.weather = field.weather
    desc.moveBP = move.bp
  }

  if (move.type !== moveType) desc.moveType = moveType

  const typeEffect1 = getMoveEffectiveness(moveType, defender.type1)
  const typeEffect2 = defender.type2 ? getMoveEffectiveness(moveType, defender.type2) : 1
  const typeEffectiveness = typeEffect1 * typeEffect2

  if (typeEffectiveness === 0) {
    return { damage: [0], description: buildDescription(desc) }
  }

  if ((defender.ability === "Flash Fire" && moveType === "Fire") ||
      (defender.ability === "Levitate" && moveType === "Ground") ||
      (defender.ability === "Volt Absorb" && moveType === "Electric") ||
      (defender.ability === "Water Absorb" && moveType === "Water") ||
      (defender.ability === "Wonder Guard" && typeEffectiveness <= 1 &&
        !["Struggle","Beat Up","Future Sight","Doom Desire"].includes(move.name)) ||
      (defender.ability === "Soundproof" && move.isSound) ||
      (defender.ability === "Sturdy" && move.isMLG)) {
    desc.defenderAbility = defender.ability
    return { damage: [0], description: buildDescription(desc) }
  }

  if (attacker.level !== defender.level || (attacker.level !== 50 && attacker.level !== 100)) {
    desc.attackerLevel = attacker.level
    desc.defenderLevel = defender.level
  }

  desc.HPEVs = defender.HPEVs + " HP"

  const singletonDmg = getSingletonDamage(attacker, defender, move)
  if (singletonDmg !== undefined) {
    return { damage: [singletonDmg], description: buildDescription(desc) }
  }

  if ((move.hits ?? 1) > 1) desc.hits = move.hits

  // Base power switch
  let basePower: number
  switch (move.name) {
    case "Flail": case "Reversal": {
      const p = Math.floor(48 * attacker.curHP / attacker.maxHP)
      basePower = p <= 1 ? 200 : p <= 4 ? 150 : p <= 9 ? 100 : p <= 16 ? 80 : p <= 32 ? 40 : 20
      desc.moveBP = basePower; break
    }
    case "Eruption": case "Water Spout":
      basePower = Math.max(1, Math.floor(150 * attacker.curHP / attacker.maxHP))
      desc.moveBP = basePower; break
    case "Facade":
      basePower = move.bp
      if (["Paralyzed","Poisoned","Badly Poisoned","Burned"].includes(attacker.status)) {
        basePower *= 2; desc.moveBP = basePower
      }
      break
    case "Low Kick": {
      const w = defender.weight
      basePower = w >= 200 ? 120 : w >= 100 ? 100 : w >= 50 ? 80 : w >= 25 ? 60 : w >= 10 ? 40 : 20
      desc.moveBP = basePower; break
    }
    case "Smelling Salts":
      basePower = move.bp
      if (defender.status === "Paralyzed") { basePower *= 2; desc.moveBP = basePower }
      break
    case "Triple Kick":
      basePower = move.bp
      desc.moveBP = basePower
      for (let i = 2; i <= (move.hits ?? 1); i++) desc.moveBP += ", " + (basePower * i)
      break
    case "Magnitude":
      basePower = move.bp; desc.moveBP = basePower; break
    default:
      basePower = move.bp
  }

  const isPhysical = moveType === "None" || (typeChart[moveType]?.category ?? "Physical") === "Physical"
  const attackStat = isPhysical ? "at" : "sa"
  const defenseStat = isPhysical ? "df" : "sd"

  desc.attackEVs = attacker.evs[attackStat] +
    (NATURES[attacker.nature]?.[0] === attackStat ? "+" : NATURES[attacker.nature]?.[1] === attackStat ? "-" : "") +
    " " + toSmogonStat(attackStat)
  desc.defenseEVs = defender.evs[defenseStat] +
    (NATURES[defender.nature]?.[0] === defenseStat ? "+" : NATURES[defender.nature]?.[1] === defenseStat ? "-" : "") +
    " " + toSmogonStat(defenseStat)

  let at = attacker.rawStats[attackStat]
  let df = defender.rawStats[defenseStat]

  if (isPhysical && (attacker.ability === "Huge Power" || attacker.ability === "Pure Power")) {
    at *= 2; desc.attackerAbility = attacker.ability
  }

  if (attacker.item !== "Sea Incense" && getItemBoostType(attacker.item) === moveType) {
    at = Math.floor(at * 1.1); desc.attackerItem = attacker.item
  } else if (attacker.item === "Sea Incense" && moveType === "Water") {
    at = Math.floor(at * 1.05); desc.attackerItem = attacker.item
  } else if ((isPhysical && attacker.item === "Choice Band") ||
    (!isPhysical && attacker.item === "Soul Dew" && (attacker.name === "Latios" || attacker.name === "Latias"))) {
    at = Math.floor(at * 1.5); desc.attackerItem = attacker.item
  } else if ((!isPhysical && attacker.item === "Deep Sea Tooth" && attacker.name === "Clamperl") ||
    (!isPhysical && attacker.item === "Light Ball" && attacker.name === "Pikachu") ||
    (isPhysical && attacker.item === "Thick Club" && (attacker.name === "Cubone" || attacker.name === "Marowak"))) {
    at *= 2; desc.attackerItem = attacker.item
  }

  if (!isPhysical && defender.item === "Soul Dew" && (defender.name === "Latios" || defender.name === "Latias")) {
    df = Math.floor(df * 1.5); desc.defenderItem = defender.item
  } else if ((!isPhysical && defender.item === "Deep Sea Scale" && defender.name === "Clamperl") ||
    (isPhysical && defender.item === "Metal Powder" && defender.name === "Ditto")) {
    df *= 2; desc.defenderItem = defender.item
  }

  if (defender.ability === "Thick Fat" && (moveType === "Fire" || moveType === "Ice")) {
    at = Math.floor(at / 2); desc.defenderAbility = defender.ability
  } else if (isPhysical && defender.ability === "Marvel Scale" &&
    (defender.status !== "Healthy" || defender.isAbilityActivated)) {
    df = Math.floor(df * 1.5); desc.defenderAbility = defender.ability
  }

  if (isPhysical && (attacker.ability === "Hustle" ||
    (attacker.ability === "Guts" && (attacker.status !== "Healthy" || attacker.isAbilityActivated)))) {
    at = Math.floor(at * 1.5); desc.attackerAbility = attacker.ability
  } else if (!isPhysical && (attacker.ability === "Plus" || attacker.ability === "Minus") &&
    attacker.isAbilityActivated) {
    at = Math.floor(at * 1.5); desc.attackerAbility = attacker.ability
  } else if ((attacker.curAbility === "Overgrow" && moveType === "Grass" ||
    attacker.curAbility === "Blaze" && moveType === "Fire" ||
    attacker.curAbility === "Torrent" && moveType === "Water" ||
    attacker.curAbility === "Swarm" && moveType === "Bug") &&
    (attacker.curHP <= attacker.maxHP / 3 || attacker.isAbilityActivated)) {
    basePower = Math.floor(basePower * 1.5); desc.attackerAbility = attacker.ability
  }

  if (move.name === "Explosion" || move.name === "Self-Destruct") {
    df = Math.floor(df / 2)
  }

  const attackBoost = attacker.boosts[attackStat]
  const defenseBoost = defender.boosts[defenseStat]
  if (attackBoost > 0 || (!isCritical && attackBoost < 0)) {
    at = getModifiedStat(at, attackBoost); desc.attackBoost = attackBoost
  }
  if (defenseBoost < 0 || (!isCritical && defenseBoost > 0)) {
    df = getModifiedStat(df, defenseBoost); desc.defenseBoost = defenseBoost
  }

  let baseDamage = Math.floor(Math.floor(Math.floor(2 * attacker.level / 5 + 2) * at * basePower / df) / 50)

  if (attacker.status === "Burned" && isPhysical && attacker.ability !== "Guts") {
    baseDamage = Math.floor(baseDamage / 2); desc.isBurned = true
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

  if (field.format === "doubles" && move.isSpread &&
    !["Explosion","Self-Destruct","Earthquake","Magnitude"].includes(move.name)) {
    baseDamage = Math.floor(baseDamage / 2); desc.isSpread = true
  }

  if ((field.weather === "Sun" && moveType === "Fire") || (field.weather === "Rain" && moveType === "Water")) {
    baseDamage = Math.floor(baseDamage * 1.5); desc.weather = field.weather
  } else if ((field.weather === "Sun" && moveType === "Water") || (field.weather === "Rain" && moveType === "Fire") ||
    (move.name === "Solar Beam" && ["Rain","Sand","Hail"].includes(field.weather))) {
    baseDamage = Math.floor(baseDamage / 2); desc.weather = field.weather
  }

  if (attacker.ability === "Flash Fire" && attacker.isAbilityActivated && moveType === "Fire") {
    baseDamage = Math.floor(baseDamage * 1.5); desc.attackerAbility = attacker.ability
  }

  baseDamage = Math.max(1, baseDamage) + 2

  if (isCritical) {
    baseDamage *= 2; desc.isCritical = true
  }

  if (move.name === "Weather Ball" && field.weather !== "") {
    baseDamage *= 2
  }

  if (field.isCharge && moveType === "Electric") {
    baseDamage *= 2; desc.isCharge = true
  }

  if (field.isHelpingHand) {
    baseDamage = Math.floor(baseDamage * 1.5); desc.isHelpingHand = true
  }

  if (attacker.hasType(moveType) || move.name.includes("Pledge Boosted")) {
    baseDamage = Math.floor(baseDamage * 1.5)
  }

  baseDamage = Math.floor(baseDamage * typeEffect1)
  baseDamage = Math.floor(baseDamage * typeEffect2)

  const damage: number[] = []
  for (let i = 85; i <= 100; i++) {
    damage[i - 85] = Math.max(1, Math.floor(baseDamage * i / 100))
  }

  const result: { damage: number[]; description: string; tripleAxelDamage?: number[][] } = {
    damage,
    description: buildDescription(desc),
  }

  const tripleAxelDamage = getTripleKickDamage(attacker, defender, move, field)
  if (tripleAxelDamage) result.tripleAxelDamage = tripleAxelDamage

  return result
}
