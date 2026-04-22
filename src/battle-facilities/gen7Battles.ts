import {
  buildPokemon as buildPokemonGen7,
  makeFieldSide as makeFieldSideGen7,
  calculateAllMovesGen7,
  findSetByLabel as findSetByLabelGen7,
  resolveSpeciesName,
  POKEDEX_SM,
  type SetdexEntry as SetdexEntryGen7,
} from './gen7calc'
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
import smTeamData from '../data/battle-facilities/sunmoon/setteam_sm.json'
import smBattleTrainers from '../data/battle-facilities/sunmoon/battle_trainers_sm.json'
import smTrainerPokemon from '../data/battle-facilities/sunmoon/trainer_pokemon_sm.json'

const TEAM_SM = smTeamData as Record<string, Record<string, SetdexEntryGen7>>

const TEAM_SM_BY_LABEL: Record<string, { species: string; set: SetdexEntryGen7 }> = {}
for (const [species, sets] of Object.entries(TEAM_SM)) {
  for (const [label, set] of Object.entries(sets)) {
    TEAM_SM_BY_LABEL[label] = { species, set }
  }
}

const SM_MODES: FacilityMode[] = [
  {
    id: 'regular-singles',
    label: 'Regular Singles',
    defaultLevel: 50,
    format: 'singles',
    maxBattle: 20,
    teams: [{ name: "Venty's Ventysteela Super Singles Super Star", url: 'https://pokepast.es/282d7548ba34edd5', description: 'Recommended team:', pokemon: ['Pheromosa (Sectonia)', 'Celesteela (Ventysteela)', 'Tapu Lele (Wendy Koopa)'] }],
    ribbon: {
      name: 'Battle Tree Great Ribbon',
      description: 'Win the 20th battle against Trainer Red in Regular Singles to earn the Battle Tree Great Ribbon. We recommend getting this ribbon in Ultra Sun / Ultra Moon for the unlimited level cap.',
      icon: '/images/ribbons/battle-tree-great-ribbon.png',
    },
  },
  {
    id: 'regular-doubles',
    label: 'Regular Doubles',
    defaultLevel: 50,
    format: 'doubles',
    maxBattle: 20,
    teams: [
      { name: "Regiultima's Pheromosa Lele Super Doubles", url: 'https://pokepast.es/219b988b78930fea', description: 'Recommended team:', pokemon: ['Pheromosa (Doubles)', 'Tapu Lele (Doubles)', 'Salamence (Doubles)', 'Salamence-Mega (Doubles)', 'Aegislash (Doubles)'] },
      { name: 'Budget TR Lv1 Endeavor Doubles', url: 'https://pokepast.es/dc57c6c05f6d2758', description: 'Easiest to build (requires Ultra Sun or Ultra Moon):', pokemon: ['Aron (Budget Doubles)', 'Jellicent (Budget Doubles)', 'Kommo-o (Budget Doubles)', 'Mawile-Mega (Budget Doubles)'] },
    ],
    ribbon: {
      name: 'Battle Tree Great Ribbon',
      description: 'Win the 20th battle against Trainer Blue in Regular Doubles to earn the Battle Tree Great Ribbon. We recommend getting this ribbon in Ultra Sun / Ultra Moon for the unlimited level cap.',
      icon: '/images/ribbons/battle-tree-great-ribbon.png',
    },
  },
  {
    id: 'super-singles',
    label: 'Super Singles',
    defaultLevel: 50,
    format: 'singles',
    maxLevel: 50,
    teams: [{ name: "Venty's Ventysteela Super Singles Super Star", url: 'https://pokepast.es/282d7548ba34edd5', description: 'Recommended team:', pokemon: ['Pheromosa (Sectonia)', 'Celesteela (Ventysteela)', 'Tapu Lele (Wendy Koopa)'] }],
    ribbon: {
      name: 'Battle Tree Master Ribbon',
      description: 'Win the 50th battle against Trainer Red in Super Singles to earn the Battle Tree Master Ribbon. After 51 consecutive wins, you need to restart the streak to earn the ribbon.',
      warning: 'We recommend getting this ribbon in Super Doubles for greater consistency.',
      icon: '/images/ribbons/battle-tree-master-ribbon.png',
    },
  },
  {
    id: 'super-doubles',
    label: 'Super Doubles',
    defaultLevel: 50,
    format: 'doubles',
    maxLevel: 50,
    teams: [
      { name: "Regiultima's Pheromosa Lele Super Doubles", url: 'https://pokepast.es/219b988b78930fea', description: 'Recommended team:', pokemon: ['Pheromosa (Doubles)', 'Tapu Lele (Doubles)', 'Salamence (Doubles)', 'Salamence-Mega (Doubles)', 'Aegislash (Doubles)'] },
      { name: 'Budget TR Lv1 Endeavor Doubles', url: 'https://pokepast.es/dc57c6c05f6d2758', description: 'Easiest to build (requires Ultra Sun or Ultra Moon):', pokemon: ['Aron (Budget Doubles)', 'Jellicent (Budget Doubles)', 'Kommo-o (Budget Doubles)', 'Mawile-Mega (Budget Doubles)'] },
    ],
    ribbon: { name: 'Battle Tree Master Ribbon', description: 'Win the 50th battle against Trainer Blue in Super Doubles to earn the Battle Tree Master Ribbon. After 51 consecutive wins, you need to restart the streak to earn the ribbon.', icon: '/images/ribbons/battle-tree-master-ribbon.png' },
  },
]

function smGetBattleRange(battleNum: number): string {
  if (battleNum % 10 === 0) return `Boss`
  if (battleNum >= 51) return '51+'
  return ''
}

function smGetIVsForTrainer(trainer: Trainer | null): number {
  if (!trainer) return 19
  const n = trainer.number
  if (n >= 191) return 31 // Special trainers
  if (n >= 91) return 31
  if (n >= 71) return 27
  if (n >= 51) return 23
  return 19
}

function smGetTrainersForBattle(battleNum: number, modeId?: string): Trainer[] {
  const matched = (smBattleTrainers as Trainer[]).filter(t =>
    t.battleRanges.some(r => battleRangeMatches(battleNum, r))
  )

  const boss = matched.find(t => t.boss && t.boss === modeId)
  if (boss) return [boss]

  if (battleNum % 10 === 0) {
    return matched.filter(t => t.number >= 191 && !t.boss)
  }

  return matched.filter(t => t.number < 191)
}

function smGetPokemonForTrainer(trainerName: string): string[] {
  const all = (smTrainerPokemon as Record<string, string[]>)[trainerName] || []
  return all.filter(label => findSetByLabelGen7(label) !== null)
}

function smBuildP1Options(ribbonMaster: StoredSet | null, pokemonSets: StoredSet[], modeLabels: string[]): P1Option[] {
  const options: P1Option[] = []

  if (ribbonMaster) {
    options.push({ label: ribbonMaster.label, species: ribbonMaster.species, set: ribbonMaster.set })
  }

  for (const label of modeLabels) {
    const entry = TEAM_SM_BY_LABEL[label]
    if (!entry) continue
    options.push({ label, species: entry.species, set: entry.set as any })
  }

  for (const cs of pokemonSets) {
    options.push({ label: cs.label, species: cs.species, set: cs.set })
  }

  return options
}

function smDefaultSideState(): SideState {
  return {
    itemUsed: false,
    isProtect: false,
    isReflect: false,
    isLightScreen: false,
    isAuroraVeil: false,
    isHelpingHand: false,
    isTailwind: false,
    isCharge: false,
    isFriendGuard: false,
    isBattery: false,
    boosts: { at: 0, df: 0, sa: 0, sd: 0, sp: 0 },
    curHP: 0,
    maxHP: 0,
    status: 'Healthy',
  }
}

const SM_SIDE_STATE_FIELDS: SideStateFieldDef[] = [
  { type: 'checkbox', key: 'itemUsed', label: 'Used/Lost Item', row: 0 },
  { type: 'checkbox', key: 'isProtect', label: 'Protect', row: 1 },
  { type: 'checkbox', key: 'isReflect', label: 'Reflect', row: 1 },
  { type: 'checkbox', key: 'isLightScreen', label: 'Light Screen', row: 1 },
  { type: 'checkbox', key: 'isAuroraVeil', label: 'Aurora Veil', row: 1 },
  { type: 'checkbox', key: 'isHelpingHand', label: 'Helping Hand', row: 2 },
  { type: 'checkbox', key: 'isTailwind', label: 'Tailwind', row: 2 },
  { type: 'checkbox', key: 'isCharge', label: 'Charge', row: 2 },
  { type: 'checkbox', key: 'isFriendGuard', label: 'Friend Guard', row: 2 },
  { type: 'checkbox', key: 'isBattery', label: 'Battery', row: 2 },
]

const STAT_NAMES = ['at', 'df', 'sa', 'sd', 'sp'] as const

function smGetModifiedStat(stat: number, mod: number): number {
  if (mod > 0) return Math.floor(stat * (2 + mod) / 2)
  if (mod < 0) return Math.floor(stat * 2 / (2 - mod))
  return stat
}

function smCalcCurrentSpeed(pokemon: any, weather: string, terrain?: string): number {
  let speed = pokemon.stats.sp
  speed = smGetModifiedStat(speed, pokemon.boosts.sp)
  if (pokemon.status === 'Paralyzed') {
    speed = Math.floor(speed / 2) // Gen 7: paralysis = 50% speed (not 25%)
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
  } else if (weather === 'Hail' && pokemon.curAbility === 'Slush Rush') {
    speed *= 2
  }
  if (terrain === 'Electric' && pokemon.curAbility === 'Surge Surfer') {
    speed *= 2
  }
  return speed
}

function smRunCalc(params: CalcParams): CalcResult | null {
  const { p1, p2Label, p1Level, p2Level, p2Ivs, p2Ability, weather, terrain, gravity, p1Side, p2Side, format } = params

  const p1SpeciesKey = resolveSpeciesName(p1.species)
  const p1Dex = POKEDEX_SM[p1SpeciesKey]
  if (!p1Dex) return null
  const p1Poke = buildPokemonGen7(p1SpeciesKey, p1Dex, p1.set as SetdexEntryGen7, p1.label, p1Level)

  const p2Match = findSetByLabelGen7(p2Label)
  if (!p2Match) return null
  const p2Dex = POKEDEX_SM[p2Match.species]
  if (!p2Dex) return null
  const p2Poke = buildPokemonGen7(p2Match.species, p2Dex, p2Match.set, p2Label, p2Level, p2Ivs)

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
  const p1FieldSide = makeFieldSideGen7({
    isProtect: p1Side.isProtect,
    isReflect: p1Side.isReflect, isLightScreen: p1Side.isLightScreen,
    isAuroraVeil: p1Side.isAuroraVeil, isHelpingHand: p1Side.isHelpingHand,
    isTailwind: p1Side.isTailwind, isCharge: p1Side.isCharge,
    isGravity: g,
    isFriendGuard: p1Side.isFriendGuard, isBattery: p1Side.isBattery,
  }, format, weather, t)
  const p2FieldSide = makeFieldSideGen7({
    isProtect: p2Side.isProtect,
    isReflect: p2Side.isReflect, isLightScreen: p2Side.isLightScreen,
    isAuroraVeil: p2Side.isAuroraVeil, isHelpingHand: p2Side.isHelpingHand,
    isTailwind: p2Side.isTailwind, isCharge: p2Side.isCharge,
    isGravity: g,
    isFriendGuard: p2Side.isFriendGuard, isBattery: p2Side.isBattery,
  }, format, weather, t)

  const [p1Results, p2Results] = calculateAllMovesGen7(p1Poke, p2Poke, p1FieldSide, p2FieldSide)

  const p1Summary: PokeSummary = {
    evs: p1Poke.evs, nature: p1Poke.nature, ability: p1Poke.ability,
    abilities: [p1Poke.ability], item: p1Poke.item,
    speed: smCalcCurrentSpeed(p1Poke, weather, t) * (p1Side.isTailwind ? 2 : 1),
    stats: { atk: p1Poke.rawStats.at, def: p1Poke.rawStats.df, spa: p1Poke.rawStats.sa, spd: p1Poke.rawStats.sd, spe: p1Poke.rawStats.sp },
    modifiedStats: { atk: p1Poke.stats.at, def: p1Poke.stats.df, spa: p1Poke.stats.sa, spd: p1Poke.stats.sd, spe: p1Poke.stats.sp },
  }
  const p2Summary: PokeSummary = {
    evs: p2Poke.evs, nature: p2Poke.nature, ability: p2Poke.ability,
    abilities: p2Dex.abilities, item: p2Poke.item,
    speed: smCalcCurrentSpeed(p2Poke, weather, t) * (p2Side.isTailwind ? 2 : 1),
    stats: { atk: p2Poke.rawStats.at, def: p2Poke.rawStats.df, spa: p2Poke.rawStats.sa, spd: p2Poke.rawStats.sd, spe: p2Poke.rawStats.sp },
    modifiedStats: { atk: p2Poke.stats.at, def: p2Poke.stats.df, spa: p2Poke.stats.sa, spd: p2Poke.stats.sd, spe: p2Poke.stats.sp },
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

export const sunMoonConfig: GameConfig = {
  title: 'Ultra Sun / Ulra Moon - Battle Tree',
  modes: SM_MODES,
  defaultSideState: smDefaultSideState,
  sideStateFields: SM_SIDE_STATE_FIELDS,
  weatherOptions: ['', 'Sun', 'Rain', 'Sand', 'Hail'],
  weatherLabels: { '': 'None', Sun: 'Sun', Rain: 'Rain', Sand: 'Sand', Hail: 'Hail' },
  terrainOptions: ['', 'Electric', 'Grassy', 'Misty', 'Psychic'],
  terrainLabels: { '': 'None', Electric: 'Electric', Grassy: 'Grassy', Misty: 'Misty', Psychic: 'Psychic' },
  hasGravity: true,
  getTrainersForBattle: smGetTrainersForBattle,
  getPokemonForTrainer: smGetPokemonForTrainer,
  getIVsForTrainer: smGetIVsForTrainer,
  getBattleRange: smGetBattleRange,
  buildP1Options: smBuildP1Options,
  runCalc: smRunCalc,
  calcCurrentSpeed: smCalcCurrentSpeed,
  isValidSpecies: (species: string) => !!POKEDEX_SM[species] || !!POKEDEX_SM[resolveSpeciesName(species)],
}
