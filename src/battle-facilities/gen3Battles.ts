import {
  buildPokemon,
  makeFieldSide,
  calculateAllMovesGen3,
  findSetByLabel,
  POKEDEX_ADV,
  type SetdexEntry,
} from './gen3calc'
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
} from './battleCalculator'
import type { StoredSet } from './pokepaste'
import { battleRangeMatches } from './battleUtils'
import teamData from '../data/battle-facilities/emerald/setteam_em.json'
import battleTrainers from '../data/battle-facilities/emerald/battle_trainers_em.json'
import trainerPokemon from '../data/battle-facilities/emerald/trainer_pokemon_em.json'

const TEAM_EM = teamData as Record<string, Record<string, SetdexEntry>>

const TEAM_EM_BY_LABEL: Record<string, { species: string; set: SetdexEntry }> = {}
for (const [species, sets] of Object.entries(TEAM_EM)) {
  for (const [label, set] of Object.entries(sets)) {
    TEAM_EM_BY_LABEL[label] = { species, set }
  }
}

const EMERALD_MODES: FacilityMode[] = [
  {
    id: 'lvl50-singles',
    label: 'Lvl 50 Singles',
    defaultLevel: 50,
    format: 'singles',
    maxLevel: 50,
    teamUrl: 'https://pokepast.es/9f353ea337d86f51',
    teamName: "Venty's Latios / Metagross / Suicune",
    pokemon: ['Latios (Singles)', 'Metagross (Singles)', 'Suicune (Singles)'],
    ribbon: { name: 'Winning Ribbon', description: 'Win a full 7-set from battle 50-56 onwards. The Battle Tower awards the Winning Ribbon.', warning: 'We recommend getting this ribbon in R/S Battle Tower.', icon: '/images/ribbons/winning-ribbon.png' },
  },
  {
    id: 'open-singles',
    label: 'Open Singles',
    defaultLevel: 60,
    format: 'singles',
    teamUrl: 'https://pokepast.es/9f353ea337d86f51',
    teamName: "Venty's Latios / Metagross / Suicune",
    pokemon: ['Latios (Singles)', 'Metagross (Singles)', 'Suicune (Singles)'],
    ribbon: { name: 'Victory Ribbon', description: 'Win a full 7-set from battle 50-56 onwards. The Battle Tower awards the Victory Ribbon.', warning: 'We recommend getting this ribbon in R/S Battle Tower.', icon: '/images/ribbons/victory-ribbon.png' },
  },
  {
    id: 'lvl50-doubles',
    label: 'Lvl 50 Doubles',
    defaultLevel: 50,
    format: 'doubles',
    maxLevel: 50,
    teamUrl: 'https://pokepast.es/773249e264806f40',
    teamName: "Venty's Explosive doubles team",
    pokemon: ['Latios (Doubles)', 'Metagross (Doubles)', 'Snorlax (Doubles)', 'Gengar (Doubles)'],
    ribbon: { name: 'Winning Ribbon', description: 'Win a full 7-set from battle 50-56 onwards. The Battle Tower awards the Winning Ribbon.', warning: 'We recommend getting this ribbon in R/S Battle Tower.', icon: '/images/ribbons/winning-ribbon.png' },
  },
  {
    id: 'open-doubles',
    label: 'Open Doubles',
    defaultLevel: 60,
    format: 'doubles',
    teamUrl: 'https://pokepast.es/773249e264806f40',
    teamName: "Venty's Explosive doubles team",
    pokemon: ['Latios (Doubles)', 'Metagross (Doubles)', 'Snorlax (Doubles)', 'Gengar (Doubles)'],
    ribbon: { name: 'Victory Ribbon', description: 'Win a full 7-set from battle 50-56 onwards. The Battle Tower awards the Victory Ribbon.', warning: 'We recommend getting this ribbon in R/S Battle Tower.', icon: '/images/ribbons/victory-ribbon.png' },
  },
]

const BATTLE_RANGES = ['1-7', '8-14', '15-21', '22-28', '29-35', '36-42', '43-49', '50+'] as const

function getBattleRange(battleNum: number): string {
  if (battleNum >= 50) return '50+'
  const index = Math.floor((battleNum - 1) / 7)
  return BATTLE_RANGES[index] || '1-7'
}

function getIVsForTrainer(trainer: Trainer | null): number {
  if (!trainer) return 3
  if (trainer.name === 'Anabel (Silver)') return 24
  if (trainer.name === 'Anabel (Gold)') return 31

  const n = trainer.number
  if (n <= 100) return 3
  if (n <= 120) return 6
  if (n <= 140) return 9
  if (n <= 160) return 12
  if (n <= 180) return 15
  if (n <= 200) return 18
  if (n <= 220) return 21
  if (n <= 300) return 31
  return 31
}

function getTrainersForBattle(battleNum: number): Trainer[] {
  return (battleTrainers as Trainer[]).filter(t =>
    t.battleRanges.some(r => battleRangeMatches(battleNum, r))
  )
}

function getPokemonForTrainer(trainerName: string): string[] {
  const all = (trainerPokemon as Record<string, string[]>)[trainerName] || []
  return all.filter(label => findSetByLabel(label) !== null)
}

function buildP1Options(ribbonMaster: StoredSet | null, pokemonSets: StoredSet[], modeLabels: string[]): P1Option[] {
  const options: P1Option[] = []

  if (ribbonMaster) {
    options.push({ label: ribbonMaster.label, species: ribbonMaster.species, set: ribbonMaster.set })
  }

  for (const label of modeLabels) {
    const entry = TEAM_EM_BY_LABEL[label]
    if (!entry) continue
    options.push({ label, species: entry.species, set: entry.set })
  }

  for (const cs of pokemonSets) {
    options.push({ label: cs.label, species: cs.species, set: cs.set })
  }

  return options
}

function defaultSideState(): SideState {
  return {
    isProtect: false,
    isReflect: false,
    isLightScreen: false,
    isHelpingHand: false,
    isCharge: false,
    itemUsed: false,
    boosts: { at: 0, df: 0, sa: 0, sd: 0, sp: 0 },
    curHP: 0,
    maxHP: 0,
    status: 'Healthy',
  }
}

const EMERALD_SIDE_STATE_FIELDS: SideStateFieldDef[] = [
  { type: 'checkbox', key: 'itemUsed', label: 'Used/Lost Item', row: 0 },
  { type: 'checkbox', key: 'isProtect', label: 'Protect', row: 1 },
  { type: 'checkbox', key: 'isReflect', label: 'Reflect', row: 1 },
  { type: 'checkbox', key: 'isLightScreen', label: 'Light Screen', row: 1 },
  { type: 'checkbox', key: 'isHelpingHand', label: 'Helping Hand', row: 2 },
  { type: 'checkbox', key: 'isCharge', label: 'Charge', row: 2 },
]

const STAT_NAMES = ['at', 'df', 'sa', 'sd', 'sp'] as const

function getModifiedStat(stat: number, mod: number): number {
  if (mod > 0) return Math.floor(stat * (2 + mod) / 2)
  if (mod < 0) return Math.floor(stat * 2 / (2 - mod))
  return stat
}

function calcCurrentSpeed(pokemon: any, weather: string): number {
  let speed = pokemon.stats.sp
  speed = getModifiedStat(speed, pokemon.boosts.sp)
  if (pokemon.status === 'Paralyzed') {
    speed = Math.floor(speed / 4)
  }
  if (pokemon.item === 'Macho Brace') {
    speed = Math.floor(speed / 2)
  }
  if (weather === 'Sun' && pokemon.curAbility === 'Chlorophyll') {
    speed *= 2
  } else if (weather === 'Rain' && pokemon.curAbility === 'Swift Swim') {
    speed *= 2
  }
  return speed
}

function runCalc(params: CalcParams): CalcResult | null {
  const { p1, p2Label, p1Level, p2Level, p2Ivs, p2Ability, weather, p1Side, p2Side, format } = params

  const p1Dex = POKEDEX_ADV[p1.species]
  if (!p1Dex) return null
  const p1Poke = buildPokemon(p1.species, p1Dex, p1.set, p1.label, p1Level)

  const p2Match = findSetByLabel(p2Label)
  if (!p2Match) return null
  const p2Dex = POKEDEX_ADV[p2Match.species]
  if (!p2Dex) return null
  const p2Poke = buildPokemon(p2Match.species, p2Dex, p2Match.set, p2Label, p2Level, p2Ivs)

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

  const p1FieldSide = makeFieldSide({
    isProtect: p1Side.isProtect,
    isReflect: p1Side.isReflect, isLightScreen: p1Side.isLightScreen,
    isHelpingHand: p1Side.isHelpingHand, isCharge: p1Side.isCharge,
  }, format, weather)
  const p2FieldSide = makeFieldSide({
    isProtect: p2Side.isProtect,
    isReflect: p2Side.isReflect, isLightScreen: p2Side.isLightScreen,
    isHelpingHand: p2Side.isHelpingHand, isCharge: p2Side.isCharge,
  }, format, weather)

  const [p1Results, p2Results] = calculateAllMovesGen3(p1Poke, p2Poke, p1FieldSide, p2FieldSide)

  const p1Summary: PokeSummary = {
    evs: p1Poke.evs, nature: p1Poke.nature, ability: p1Poke.ability,
    abilities: [p1Poke.ability], item: p1Poke.item,
    speed: calcCurrentSpeed(p1Poke, weather),
    stats: { atk: p1Poke.rawStats.at, def: p1Poke.rawStats.df, spa: p1Poke.rawStats.sa, spd: p1Poke.rawStats.sd, spe: p1Poke.rawStats.sp },
    modifiedStats: { atk: p1Poke.stats.at, def: p1Poke.stats.df, spa: p1Poke.stats.sa, spd: p1Poke.stats.sd, spe: p1Poke.stats.sp },
  }
  const p2Summary: PokeSummary = {
    evs: p2Poke.evs, nature: p2Poke.nature, ability: p2Poke.ability,
    abilities: p2Dex.abilities, item: p2Poke.item,
    speed: calcCurrentSpeed(p2Poke, weather),
    stats: { atk: p2Poke.rawStats.at, def: p2Poke.rawStats.df, spa: p2Poke.rawStats.sa, spd: p2Poke.rawStats.sd, spe: p2Poke.rawStats.sp },
    modifiedStats: { atk: p2Poke.stats.at, def: p2Poke.stats.df, spa: p2Poke.stats.sa, spd: p2Poke.stats.sd, spe: p2Poke.stats.sp },
  }

  return { p1Results, p2Results, p1MaxHP: p1Poke.maxHP, p2MaxHP: p2Poke.maxHP, p1Summary, p2Summary }
}

export const emeraldConfig: GameConfig = {
  title: 'Emerald - Battle Frontier Tower',
  modes: EMERALD_MODES,
  defaultSideState,
  sideStateFields: EMERALD_SIDE_STATE_FIELDS,
  weatherOptions: ['', 'Sun', 'Rain', 'Sand', 'Hail'],
  weatherLabels: { '': 'None', Sun: 'Sun', Rain: 'Rain', Sand: 'Sand', Hail: 'Hail' },
  getTrainersForBattle,
  getPokemonForTrainer,
  getIVsForTrainer,
  getBattleRange,
  buildP1Options,
  runCalc,
  calcCurrentSpeed,
  isValidSpecies: (species: string) => !!POKEDEX_ADV[species],
}
