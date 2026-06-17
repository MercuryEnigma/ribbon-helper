import {
  buildPokemonSwSh,
  makeFieldSideSwSh,
  calculateAllMovesSwSh,
  findSetByLabelSwSh,
  resolveSpeciesNameSwSh,
  POKEDEX_SWSH,
  type SetdexEntry as SetdexEntrySwSh,
  type ModernSetdex,
} from './swshCalc'
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
  OpponentPokemonParams,
} from './battleCalculator'
import type { StoredSet } from './pokepaste'
import teamData from '../data/battle-facilities/swsh/setteam_swsh.json'
import battleTrainersRaw from '../data/battle-facilities/swsh/battle_trainers_swsh.json'
import trainerPokemonRaw from '../data/battle-facilities/swsh/trainer_pokemon_swsh.json'

const TEAM_SWSH = teamData as ModernSetdex
const TEAM_SWSH_BY_LABEL: Record<string, { species: string; set: SetdexEntrySwSh }> = {}
for (const [species, sets] of Object.entries(TEAM_SWSH)) {
  for (const [label, set] of Object.entries(sets)) {
    TEAM_SWSH_BY_LABEL[label] = { species, set }
  }
}

const SINGLES_RAIN_TEAM = {
  name: 'Barraskewda / Ludicolo / Pelipper',
  url: 'https://pokepast.es/88b227ec32852609',
  description: 'Recommended SwSh team:',
  pokemon: ['Barraskewda (Psychic J Rain)', 'Ludicolo (Psychic J Rain)', 'Pelipper (Psychic J Rain)'],
}

const SINGLES_DRACOVISH_TEAM = {
  name: 'Dracovish / Zacian',
  url: 'https://pokepast.es/38879e9b5717be76',
  description: 'Easy singles team:',
  pokemon: ['Dracovish (SwSh Singles)', 'Zacian (SwSh Singles)'],
}

const DOUBLES_TEAM = {
  name: 'Calyrex-Shadow / Tapu Lele',
  url: 'https://pokepast.es/e36a6fa770adac28',
  description: 'Recommended doubles team:',
  pokemon: [
    'Calyrex-Shadow (SwSh Doubles)',
    'Tapu Lele (SwSh Doubles)',
    'Kyurem-White (SwSh Doubles)',
    'Zeraora (SwSh Doubles)',
  ],
}

const SWSH_MODES: FacilityMode[] = [
  {
    id: 'singles',
    label: 'Singles',
    defaultLevel: 50,
    format: 'singles',
    maxLevel: 50,
    teams: [SINGLES_RAIN_TEAM, SINGLES_DRACOVISH_TEAM],
    ribbon: {
      name: 'Tower Master Ribbon',
      description: 'Defeat Leon at Max Rank in the Battle Tower for the Tower Master Ribbon.',
      icon: '/images/ribbons/tower-master-ribbon.png',
    },
  },
  {
    id: 'doubles',
    label: 'Doubles',
    defaultLevel: 50,
    format: 'doubles',
    maxLevel: 50,
    teams: [DOUBLES_TEAM, SINGLES_RAIN_TEAM],
    ribbon: {
      name: 'Tower Master Ribbon',
      description: 'Defeat Leon at Max Rank in the Battle Tower for the Tower Master Ribbon.',
      icon: '/images/ribbons/tower-master-ribbon.png',
    },
  },
]

interface TrainerSwSh extends Trainer {
  minRank?: number | 'MAX'
  maxRank?: number | 'MAX'
  dynamaxBand?: boolean
  sourceRoster?: number
}

type SwShRank = number | 'MAX'

const SWSH_TRAINERS = battleTrainersRaw as TrainerSwSh[]
const SWSH_TRAINER_POKEMON = trainerPokemonRaw as Record<string, string[] | Record<string, string[]>>

function rankForBattle(battleNum: number): SwShRank {
  if (battleNum >= 34) return 'MAX'
  if (battleNum >= 28) return 10
  if (battleNum >= 27) return 9
  if (battleNum >= 21) return 8
  if (battleNum >= 16) return 7
  if (battleNum >= 15) return 6
  if (battleNum >= 11) return 5
  if (battleNum >= 7) return 4
  if (battleNum >= 6) return 3
  if (battleNum >= 3) return 2
  return 1
}

function leonRosterKeyForBattle(battleNum: number): string | null {
  if (battleNum === 6) return 'rank-3'
  if (battleNum === 15) return 'rank-6'
  if (battleNum === 27) return 'rank-9'
  if (battleNum === 33) return 'rank-10'
  if (battleNum >= 43 && (battleNum - 43) % 10 === 0) return 'max'
  return null
}

function isLeonBattle(battleNum: number): boolean {
  return leonRosterKeyForBattle(battleNum) !== null
}

function rankMatchesTrainer(rank: SwShRank, trainer: TrainerSwSh): boolean {
  if (trainer.boss) return false
  if (rank === 'MAX') return trainer.minRank === 'MAX' && trainer.maxRank === 'MAX'
  if (trainer.minRank === 'MAX' || trainer.maxRank === 'MAX') return false
  return typeof trainer.minRank === 'number' && typeof trainer.maxRank === 'number' &&
    trainer.minRank <= rank && rank <= trainer.maxRank
}

function swshGetTrainersForBattle(battleNum: number): Trainer[] {
  if (isLeonBattle(battleNum)) {
    return SWSH_TRAINERS.filter(trainer => trainer.boss === 'leon')
  }

  const rank = rankForBattle(battleNum)
  return SWSH_TRAINERS.filter(trainer => rankMatchesTrainer(rank, trainer))
}

function swshGetPokemonForTrainer(trainerName: string, _modeId?: string, battleNum?: number): string[] {
  const data = SWSH_TRAINER_POKEMON[trainerName]
  if (!data) return []
  if (Array.isArray(data)) return data

  const leonKey = leonRosterKeyForBattle(battleNum ?? 1) ?? 'max'
  return data[leonKey] ?? []
}

function swshGetIVsForTrainer(): number {
  return 31
}

function ivsForLabel(label: string): number {
  const match = findSetByLabelSwSh(label)
  return match?.set.ivs?.hp ?? 31
}

function swshGetIVsForPokemon(params: OpponentPokemonParams): number {
  return ivsForLabel(params.pokemonLabel)
}

function swshGetOpponentIvsLabel(params: OpponentPokemonParams): string {
  return `${ivsForLabel(params.pokemonLabel)} IVs`
}

function swshGetBattleRange(battleNum: number): string {
  const rank = rankForBattle(battleNum)
  const rankLabel = rank === 'MAX' ? 'Max Rank' : `Rank ${rank}`
  return isLeonBattle(battleNum) ? `${rankLabel} - Leon` : rankLabel
}

function swshDefaultSideState(): SideState {
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
    boosts: { at: 0, df: 0, sa: 0, sd: 0, sp: 0 },
    curHP: 0,
    maxHP: 0,
    status: 'Healthy',
  }
}

const SWSH_SIDE_STATE_FIELDS: SideStateFieldDef[] = [
  { type: 'checkbox', key: 'itemUsed', label: 'Used/Lost Item', row: 0 },
  { type: 'checkbox', key: 'isProtect', label: 'Protect', row: 1 },
  { type: 'checkbox', key: 'isReflect', label: 'Reflect', row: 1 },
  { type: 'checkbox', key: 'isLightScreen', label: 'Light Screen', row: 1 },
  { type: 'checkbox', key: 'isAuroraVeil', label: 'Aurora Veil', row: 1 },
  { type: 'checkbox', key: 'isHelpingHand', label: 'Helping Hand', row: 2 },
  { type: 'checkbox', key: 'isTailwind', label: 'Tailwind', row: 2 },
  { type: 'checkbox', key: 'isCharge', label: 'Charge', row: 2 },
  { type: 'checkbox', key: 'isFriendGuard', label: 'Friend Guard', row: 2 },
]

const STAT_NAMES = ['at', 'df', 'sa', 'sd', 'sp'] as const

function swshCalcCurrentSpeed(pokemon: any, weather: string, terrain?: string): number {
  let speed = pokemon.stats.sp
  const mod = pokemon.boosts?.sp ?? 0
  if (mod > 0) speed = Math.floor(speed * (2 + mod) / 2)
  else if (mod < 0) speed = Math.floor(speed * 2 / (2 - mod))
  if (pokemon.status === 'Paralyzed') speed = Math.floor(speed / 2)
  if (pokemon.item === 'Choice Scarf') speed = Math.floor(speed * 1.5)
  if (pokemon.item === 'Macho Brace' || pokemon.item === 'Iron Ball') speed = Math.floor(speed / 2)
  if (weather === 'Sun' && pokemon.curAbility === 'Chlorophyll') speed *= 2
  else if (weather === 'Rain' && pokemon.curAbility === 'Swift Swim') speed *= 2
  else if (weather === 'Sand' && pokemon.curAbility === 'Sand Rush') speed *= 2
  else if (weather === 'Hail' && pokemon.curAbility === 'Slush Rush') speed *= 2
  if (terrain === 'Electric' && pokemon.curAbility === 'Surge Surfer') speed *= 2
  return speed
}

function swshBuildP1Options(ribbonMaster: StoredSet | null, pokemonSets: StoredSet[], modeLabels: string[]): P1Option[] {
  const options: P1Option[] = []
  if (ribbonMaster) {
    options.push({ label: ribbonMaster.label, species: ribbonMaster.species, set: ribbonMaster.set })
  }
  for (const label of modeLabels) {
    const entry = TEAM_SWSH_BY_LABEL[label]
    if (!entry) continue
    options.push({ label, species: entry.species, set: entry.set as any })
  }
  for (const cs of pokemonSets) {
    options.push({ label: cs.label, species: cs.species, set: cs.set })
  }
  return options
}

function swshRunCalc(params: CalcParams): CalcResult | null {
  const { p1, p2Label, p1Level, p2Level, p2Ivs, p2Ability, weather, terrain, gravity, p1Side, p2Side, format } = params

  const p1SpeciesKey = resolveSpeciesNameSwSh(p1.species)
  const p1Dex = POKEDEX_SWSH[p1SpeciesKey]
  if (!p1Dex) return null
  const p1Set = p1.set as SetdexEntrySwSh
  const effectiveP1Level = p1Set.level ?? p1Level
  const p1Poke = buildPokemonSwSh(p1SpeciesKey, p1Dex, p1Set, p1.label, effectiveP1Level)

  const p2Match = findSetByLabelSwSh(p2Label)
  if (!p2Match) return null
  const p2Dex = POKEDEX_SWSH[p2Match.species]
  if (!p2Dex) return null
  const p2Poke = buildPokemonSwSh(p2Match.species, p2Dex, p2Match.set, p2Label, p2Level, p2Ivs)

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
  const p1FieldSide = makeFieldSideSwSh({
    isProtect: p1Side.isProtect,
    isReflect: p1Side.isReflect, isLightScreen: p1Side.isLightScreen,
    isAuroraVeil: p1Side.isAuroraVeil, isHelpingHand: p1Side.isHelpingHand,
    isTailwind: p1Side.isTailwind, isCharge: p1Side.isCharge,
    isGravity: g, isFriendGuard: p1Side.isFriendGuard,
  }, format, weather, t)
  const p2FieldSide = makeFieldSideSwSh({
    isProtect: p2Side.isProtect,
    isReflect: p2Side.isReflect, isLightScreen: p2Side.isLightScreen,
    isAuroraVeil: p2Side.isAuroraVeil, isHelpingHand: p2Side.isHelpingHand,
    isTailwind: p2Side.isTailwind, isCharge: p2Side.isCharge,
    isGravity: g, isFriendGuard: p2Side.isFriendGuard,
  }, format, weather, t)

  const [p1Results, p2Results] = calculateAllMovesSwSh(p1Poke, p2Poke, p1FieldSide, p2FieldSide)

  const p1Summary: PokeSummary = {
    evs: p1Poke.evs, nature: p1Poke.nature, ability: p1Poke.ability,
    abilities: [p1Poke.ability], item: p1Poke.item,
    speed: swshCalcCurrentSpeed(p1Poke, weather, t) * (p1Side.isTailwind ? 2 : 1),
    stats: { atk: p1Poke.rawStats.at, def: p1Poke.rawStats.df, spa: p1Poke.rawStats.sa, spd: p1Poke.rawStats.sd, spe: p1Poke.rawStats.sp },
    modifiedStats: { atk: p1Poke.stats.at, def: p1Poke.stats.df, spa: p1Poke.stats.sa, spd: p1Poke.stats.sd, spe: p1Poke.stats.sp },
  }
  const p2Summary: PokeSummary = {
    evs: p2Poke.evs, nature: p2Poke.nature, ability: p2Poke.ability,
    abilities: p2Dex.abilities, item: p2Poke.item,
    speed: swshCalcCurrentSpeed(p2Poke, weather, t) * (p2Side.isTailwind ? 2 : 1),
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

export const swshConfig: GameConfig = {
  title: 'Sword / Shield - Battle Tower',
  modes: SWSH_MODES,
  defaultSideState: swshDefaultSideState,
  sideStateFields: SWSH_SIDE_STATE_FIELDS,
  weatherOptions: ['', 'Sun', 'Rain', 'Sand', 'Hail'],
  weatherLabels: { '': 'None', Sun: 'Sun', Rain: 'Rain', Sand: 'Sand', Hail: 'Hail' },
  terrainOptions: ['', 'Electric', 'Grassy', 'Misty', 'Psychic'],
  terrainLabels: { '': 'None', Electric: 'Electric', Grassy: 'Grassy', Misty: 'Misty', Psychic: 'Psychic' },
  hasGravity: true,
  getTrainersForBattle: swshGetTrainersForBattle,
  getPokemonForTrainer: swshGetPokemonForTrainer,
  getIVsForTrainer: swshGetIVsForTrainer,
  getIVsForPokemon: swshGetIVsForPokemon,
  getOpponentIvsLabel: swshGetOpponentIvsLabel,
  getBattleRange: swshGetBattleRange,
  buildP1Options: swshBuildP1Options,
  runCalc: swshRunCalc,
  calcCurrentSpeed: swshCalcCurrentSpeed,
  isValidSpecies: (species: string) => !!POKEDEX_SWSH[species] || !!POKEDEX_SWSH[resolveSpeciesNameSwSh(species)],
}
