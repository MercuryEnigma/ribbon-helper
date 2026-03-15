import {
  buildPokemon as buildPokemonGen6,
  makeFieldSide as makeFieldSideGen6,
  calculateAllMovesGen6,
  findSetByLabel as findSetByLabelGen6,
  resolveSpeciesName as resolveSpeciesNameGen6,
  POKEDEX_ORAS,
  type SetdexEntry as SetdexEntryGen6,
} from './gen6calc'
import type {
  FacilityMode,
  Trainer,
  P1Option,
  PokeSummary,
  SideStateFieldDef,
  CalcParams,
  CalcResult,
  SideState,
  GameConfig,
  DamageResult,
} from './battleCalculator'
import type { StoredSet } from './pokepaste'
import { battleRangeMatches } from './battleUtils'
import orasTeamData from '../data/battle-facilities/oras/setteam_oras.json'
import orasBattleTrainersNormal from '../data/battle-facilities/oras/battle_trainers_normal_oras.json'
import orasBattleTrainersSuper from '../data/battle-facilities/oras/battle_trainers_super_oras.json'
import orasTrainerPokemonNormal from '../data/battle-facilities/oras/trainer_pokemon_normal_oras.json'
import orasTrainerPokemonSuper from '../data/battle-facilities/oras/trainer_pokemon_super_oras.json'

const TEAM_ORAS = orasTeamData as Record<string, Record<string, SetdexEntryGen6>>

const TEAM_ORAS_BY_LABEL: Record<string, { species: string; set: SetdexEntryGen6 }> = {}
for (const [species, sets] of Object.entries(TEAM_ORAS)) {
  for (const [label, set] of Object.entries(sets)) {
    TEAM_ORAS_BY_LABEL[label] = { species, set }
  }
}

const ORAS_MODES: FacilityMode[] = [
  {
    id: 'normal-singles',
    label: 'Normal Singles',
    defaultLevel: 50,
    format: 'singles',
    maxLevel: 50,
    maxBattle: 20,
    teamUrl: 'https://pokepast.es/c431d238fc4a3e43',
    teamName: 'nq8r\'s Durant/Cloyster Singles Team',
    pokemon: ['Durant (Singles)', 'Cloyster (Singles)', 'Gliscor (Singles)'],
    ribbon: {
      name: 'Skillful Battler Ribbon',
      description: 'Win the 20th battle against Chatelaine Nita in Regular Singles to earn the Skillful Battler Ribbon.',
      icon: '/images/ribbons/skillful-battler-ribbon.png',
    },
  },
  {
    id: 'normal-doubles',
    label: 'Normal Doubles',
    defaultLevel: 50,
    format: 'doubles',
    maxLevel: 50,
    maxBattle: 20,
    teamUrl: 'https://pokepast.es/ec414befed89b451',
    teamName: "nq8r's Aron / Aromatisse TR Doubles Team",
    pokemon: ['Aromatisse (Doubles)', 'Aron (Doubles)', 'Talonflame (Doubles)', 'Gliscor (Doubles)'],
    ribbon: {
      name: 'Skillful Battler Ribbon',
      description: 'Win the 20th battle against Chatelaine Evelyn in Regular Singles to earn the Skillful Battler Ribbon.',
      icon: '/images/ribbons/skillful-battler-ribbon.png',
    },
  },
  {
    id: 'super-singles',
    label: 'Super Singles',
    defaultLevel: 50,
    format: 'singles',
    maxLevel: 50,
    teamUrl: 'https://pokepast.es/c431d238fc4a3e43',
    teamName: 'nq8r\'s Durant/Cloyster Singles Team',
    pokemon: ['Durant (Singles)', 'Cloyster (Singles)', 'Gliscor (Singles)'],
    ribbon: {
      name: 'Expert Battler Ribbon',
      description: 'Win the 50th battle against Chatelaine Nita in Super Singles to earn the Expert Battler Ribbon. After 51 consecutive wins, you need to restart the streak to earn the ribbon.',
      icon: '/images/ribbons/expert-battler-ribbon.png',
    },
  },
  {
    id: 'super-doubles',
    label: 'Super Doubles',
    defaultLevel: 50,
    format: 'doubles',
    maxLevel: 50,
    teamUrl: 'https://pokepast.es/ec414befed89b451',
    teamName: "nq8r's Aron / Aromatisse TR Doubles Team",
    pokemon: ['Aromatisse (Doubles)', 'Aron (Doubles)', 'Talonflame (Doubles)', 'Gliscor (Doubles)'],
    ribbon: {
      name: 'Expert Battler Ribbon',
      description: 'Win the 50th battle against Chatelaine Evelyn in Super Singles to earn the Expert Battler Ribbon. After 51 consecutive wins, you need to restart the streak to earn the ribbon.',
      icon: '/images/ribbons/expert-battler-ribbon.png',
    },
  },
]

function orasGetBattleRange(battleNum: number): string {
  if (battleNum === 20 || battleNum === 50) return 'Boss'
  if (battleNum >= 51) return '51+'
  if (battleNum >= 41) return '41-49'
  if (battleNum >= 31) return '31-40'
  if (battleNum >= 21) return '21-30'
  if (battleNum >= 11) return '11-20'
  if (battleNum >= 6)  return '6-10'
  return '1-5'
}

// IV tiers for Battle Maison:
// Normal course (trainers 1-110):  3/7/11/15 IVs by trainer number
// Super course (trainers 111-300+): 19/23/27/31 IVs by trainer number
function orasGetIVsForTrainer(trainer: Trainer | null): number {
  if (!trainer) return 3
  const n = trainer.number
  if (n > 300) return 31
  if (n >= 201) return 31
  if (n >= 181) return 27
  if (n >= 161) return 23
  if (n >= 111) return 19
  if (n >= 91) return 15
  if (n >= 71) return 11
  if (n >= 51) return 7
  return 3
}

const ORAS_NORMAL_TRAINERS = orasBattleTrainersNormal as Trainer[]
const ORAS_SUPER_TRAINERS  = orasBattleTrainersSuper as Trainer[]
const ORAS_TP_NORMAL = orasTrainerPokemonNormal as Record<string, string[]>
const ORAS_TP_SUPER  = orasTrainerPokemonSuper as Record<string, string[]>

function orasGetTrainersForBattle(battleNum: number, modeId?: string): Trainer[] {
  const isSuper = modeId?.startsWith('super')
  const list = isSuper ? ORAS_SUPER_TRAINERS : ORAS_NORMAL_TRAINERS
  return list.filter(t =>
    t.battleRanges.some(r => battleRangeMatches(battleNum, r)) &&
    (!t.boss || t.boss === modeId)
  )
}

function orasGetPokemonForTrainer(trainerName: string): string[] {
  return ORAS_TP_NORMAL[trainerName] ?? ORAS_TP_SUPER[trainerName] ?? []
}

function orasBuildP1Options(ribbonMaster: StoredSet | null, pokemonSets: StoredSet[], modeLabels: string[]): P1Option[] {
  const options: P1Option[] = []

  if (ribbonMaster) {
    options.push({ label: ribbonMaster.label, species: ribbonMaster.species, set: ribbonMaster.set })
  }

  for (const label of modeLabels) {
    const entry = TEAM_ORAS_BY_LABEL[label]
    if (!entry) continue
    options.push({ label, species: entry.species, set: entry.set as any })
  }

  for (const cs of pokemonSets) {
    options.push({ label: cs.label, species: cs.species, set: cs.set })
  }

  return options
}

function orasDefaultSideState(): SideState {
  return {
    itemUsed: false,
    isProtect: false,
    isReflect: false,
    isLightScreen: false,
    isHelpingHand: false,
    isTailwind: false,
    isCharge: false,
    isFriendGuard: false,
    boosts: { at: 0, df: 0, sa: 0, sd: 0, sp: 0 },
    curHP: 0,
    maxHP: 0,
    status: 'Healthy',
  }
}

const ORAS_SIDE_STATE_FIELDS: SideStateFieldDef[] = [
  { type: 'checkbox', key: 'itemUsed', label: 'Used/Lost Item', row: 0 },
  { type: 'checkbox', key: 'isProtect', label: 'Protect', row: 1 },
  { type: 'checkbox', key: 'isReflect', label: 'Reflect', row: 1 },
  { type: 'checkbox', key: 'isLightScreen', label: 'Light Screen', row: 1 },
  { type: 'checkbox', key: 'isHelpingHand', label: 'Helping Hand', row: 2 },
  { type: 'checkbox', key: 'isTailwind', label: 'Tailwind', row: 2 },
  { type: 'checkbox', key: 'isCharge', label: 'Charge', row: 2 },
  { type: 'checkbox', key: 'isFriendGuard', label: 'Friend Guard', row: 2 },
]

const STAT_NAMES = ['at', 'df', 'sa', 'sd', 'sp'] as const

function orasGetModifiedStat(stat: number, mod: number): number {
  if (mod > 0) return Math.floor(stat * (2 + mod) / 2)
  if (mod < 0) return Math.floor(stat * 2 / (2 - mod))
  return stat
}

function orasCalcCurrentSpeed(pokemon: any, weather: string, _terrain?: string): number {
  let speed = pokemon.stats.sp
  speed = orasGetModifiedStat(speed, pokemon.boosts.sp)
  if (pokemon.status === 'Paralyzed') {
    speed = Math.floor(speed / 4) // Gen 6: paralysis = 25% speed (not 50%)
  }
  if (pokemon.item === 'Choice Scarf') {
    speed = Math.floor(speed * 1.5)
  }
  if (pokemon.item === 'Macho Brace' || pokemon.item === 'Iron Ball') {
    speed = Math.floor(speed / 2)
  }
  if (weather === 'Sun' && pokemon.curAbility === 'Chlorophyll') {
    speed *= 2
  } else if (weather === 'Rain' && pokemon.curAbility === 'Swift Swim') {
    speed *= 2
  } else if (weather === 'Sand' && pokemon.curAbility === 'Sand Rush') {
    speed *= 2
  }
  return speed
}

function orasRunCalc(params: CalcParams): CalcResult | null {
  const { p1, p2Label, p1Level, p2Level, p2Ivs, p2Ability, weather, terrain, gravity, p1Side, p2Side, format } = params

  const p1SpeciesKey = resolveSpeciesNameGen6(p1.species)
  const p1Dex = POKEDEX_ORAS[p1SpeciesKey]
  if (!p1Dex) return null
  const p1SetGen6 = p1.set as SetdexEntryGen6
  const effectiveP1Level = p1SetGen6.level ?? p1Level
  const p1Poke = buildPokemonGen6(p1SpeciesKey, p1Dex, p1SetGen6, p1.label, effectiveP1Level)

  const p2Match = findSetByLabelGen6(p2Label)
  if (!p2Match) return null
  const p2Dex = POKEDEX_ORAS[p2Match.species]
  if (!p2Dex) return null
  const p2Poke = buildPokemonGen6(p2Match.species, p2Dex, p2Match.set, p2Label, p2Level, p2Ivs)

  if (p2Ability && p2Dex.abilities.includes(p2Ability)) {
    p2Poke.ability = p2Ability
    p2Poke.curAbility = p2Ability
  }

  for (const stat of STAT_NAMES) {
    p1Poke.boosts[stat] = p1Side.boosts[stat]
    p2Poke.boosts[stat] = p2Side.boosts[stat]
  }

  if (p1Side.curHP > 0) p1Poke.curHP = p1Side.curHP
  if (p2Side.curHP > 0) p2Poke.curHP = p2Side.curHP
  p1Poke.status = p1Side.status
  p2Poke.status = p2Side.status

  if (p1Side.itemUsed) p1Poke.item = ''
  if (p2Side.itemUsed) p2Poke.item = ''

  const t = terrain || ''
  const g = !!gravity
  const p1FieldSide = makeFieldSideGen6({
    isProtect: p1Side.isProtect,
    isReflect: p1Side.isReflect, isLightScreen: p1Side.isLightScreen,
    isHelpingHand: p1Side.isHelpingHand, isTailwind: p1Side.isTailwind,
    isCharge: p1Side.isCharge, isGravity: g,
    isFriendGuard: p1Side.isFriendGuard,
  }, format, weather, t)
  const p2FieldSide = makeFieldSideGen6({
    isProtect: p2Side.isProtect,
    isReflect: p2Side.isReflect, isLightScreen: p2Side.isLightScreen,
    isHelpingHand: p2Side.isHelpingHand, isTailwind: p2Side.isTailwind,
    isCharge: p2Side.isCharge, isGravity: g,
    isFriendGuard: p2Side.isFriendGuard,
  }, format, weather, t)

  const [p1Results, p2Results] = calculateAllMovesGen6(p1Poke, p2Poke, p1FieldSide, p2FieldSide)

  const p1Summary: PokeSummary = {
    evs: p1Poke.evs, nature: p1Poke.nature, ability: p1Poke.ability,
    abilities: [p1Poke.ability], item: p1Poke.item,
    speed: orasCalcCurrentSpeed(p1Poke, weather, t) * (p1Side.isTailwind ? 2 : 1),
  }
  const p2Summary: PokeSummary = {
    evs: p2Poke.evs, nature: p2Poke.nature, ability: p2Poke.ability,
    abilities: p2Dex.abilities, item: p2Poke.item,
    speed: orasCalcCurrentSpeed(p2Poke, weather, t) * (p2Side.isTailwind ? 2 : 1),
  }

  return {
    p1Results: p1Results as DamageResult[],
    p2Results: p2Results as DamageResult[],
    p1MaxHP: p1Poke.maxHP,
    p2MaxHP: p2Poke.maxHP,
    p1Summary,
    p2Summary,
  }
}

export const orasConfig: GameConfig = {
  title: 'ORAS - Battle Maison',
  modes: ORAS_MODES,
  defaultSideState: orasDefaultSideState,
  sideStateFields: ORAS_SIDE_STATE_FIELDS,
  weatherOptions: ['', 'Sun', 'Rain', 'Sand', 'Hail'],
  weatherLabels: { '': 'None', Sun: 'Sun', Rain: 'Rain', Sand: 'Sand', Hail: 'Hail' },
  terrainOptions: ['', 'Electric', 'Grassy', 'Misty'],
  terrainLabels: { '': 'None', Electric: 'Electric', Grassy: 'Grassy', Misty: 'Misty' },
  hasGravity: true,
  getTrainersForBattle: orasGetTrainersForBattle,
  getPokemonForTrainer: orasGetPokemonForTrainer,
  getIVsForTrainer: orasGetIVsForTrainer,
  getBattleRange: orasGetBattleRange,
  buildP1Options: orasBuildP1Options,
  runCalc: orasRunCalc,
  calcCurrentSpeed: orasCalcCurrentSpeed,
  isValidSpecies: (species: string) => !!POKEDEX_ORAS[species] || !!POKEDEX_ORAS[resolveSpeciesNameGen6(species)],
}
