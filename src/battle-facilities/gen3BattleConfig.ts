import {
  buildPokemon,
  makeFieldSide,
  calculateAllMovesGen3,
  findSetByLabel,
  MOVES_ADV,
  POKEDEX_ADV,
  type Gen3MoveDex,
  type Gen3Setdex,
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

interface Gen3GameConfigOptions {
  title: string
  modes: FacilityMode[]
  teamData: Gen3Setdex
  getTrainersForBattle: (battleNum: number, modeId?: string) => Trainer[]
  getIVsForTrainer: (trainer: Trainer | null) => number
  getBattleRange: (battleNum: number, modeId?: string) => string
  setdexForMode: (modeId: string) => Gen3Setdex
  trainerPokemonForMode: (modeId: string) => Record<string, string[]>
  moveData?: Gen3MoveDex
  opponentNatureOptions?: readonly string[]
  fixedOpponentAbilities?: boolean
  opponentIvsLabel?: string
}

const GEN3_SIDE_STATE_FIELDS: SideStateFieldDef[] = [
  { type: 'checkbox', key: 'itemUsed', label: 'Used/Lost Item', row: 0 },
  { type: 'checkbox', key: 'isProtect', label: 'Protect', row: 1 },
  { type: 'checkbox', key: 'isReflect', label: 'Reflect', row: 1 },
  { type: 'checkbox', key: 'isLightScreen', label: 'Light Screen', row: 1 },
  { type: 'checkbox', key: 'isHelpingHand', label: 'Helping Hand', row: 2 },
  { type: 'checkbox', key: 'isCharge', label: 'Charge', row: 2 },
]

const STAT_NAMES = ['at', 'df', 'sa', 'sd', 'sp'] as const

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

export function createGen3GameConfig(options: Gen3GameConfigOptions): GameConfig {
  const teamByLabel: Record<string, { species: string; set: SetdexEntry }> = {}
  for (const [species, sets] of Object.entries(options.teamData)) {
    for (const [label, set] of Object.entries(sets)) {
      teamByLabel[label] = { species, set }
    }
  }

  function getPokemonForTrainer(trainerName: string, modeId = options.modes[0].id): string[] {
    const setdex = options.setdexForMode(modeId)
    const all = options.trainerPokemonForMode(modeId)[trainerName] || []
    return all.filter(label => findSetByLabel(label, setdex) !== null)
  }

  function buildP1Options(ribbonMaster: StoredSet | null, pokemonSets: StoredSet[], modeLabels: string[]): P1Option[] {
    const result: P1Option[] = []

    if (ribbonMaster) {
      result.push({ label: ribbonMaster.label, species: ribbonMaster.species, set: ribbonMaster.set })
    }

    for (const label of modeLabels) {
      const entry = teamByLabel[label]
      if (entry) result.push({ label, species: entry.species, set: entry.set })
    }

    for (const set of pokemonSets) {
      result.push({ label: set.label, species: set.species, set: set.set })
    }

    return result
  }

  function runCalc(params: CalcParams): CalcResult | null {
    const {
      modeId,
      p1,
      p2Label,
      p1Level,
      p2Level,
      p2Ivs,
      p2Ability,
      p2Nature,
      weather,
      p1Side,
      p2Side,
      format,
    } = params
    const setdex = options.setdexForMode(modeId)
    const moveData = options.moveData ?? MOVES_ADV

    const p1Dex = POKEDEX_ADV[p1.species]
    if (!p1Dex) return null
    const p1Poke = buildPokemon(p1.species, p1Dex, p1.set, p1.label, p1Level, 31, moveData)

    const p2Match = findSetByLabel(p2Label, setdex)
    if (!p2Match) return null
    const p2Dex = POKEDEX_ADV[p2Match.species]
    if (!p2Dex) return null
    const effectiveP2Set = p2Nature && options.opponentNatureOptions?.includes(p2Nature)
      ? { ...p2Match.set, nature: p2Nature }
      : p2Match.set
    const p2Poke = buildPokemon(p2Match.species, p2Dex, effectiveP2Set, p2Label, p2Level, p2Ivs, moveData)

    if (!options.fixedOpponentAbilities && p2Ability && p2Dex.abilities.includes(p2Ability)) {
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
      isReflect: p1Side.isReflect,
      isLightScreen: p1Side.isLightScreen,
      isHelpingHand: p1Side.isHelpingHand,
      isCharge: p1Side.isCharge,
    }, format, weather)
    const p2FieldSide = makeFieldSide({
      isProtect: p2Side.isProtect,
      isReflect: p2Side.isReflect,
      isLightScreen: p2Side.isLightScreen,
      isHelpingHand: p2Side.isHelpingHand,
      isCharge: p2Side.isCharge,
    }, format, weather)

    const [p1Results, p2Results] = calculateAllMovesGen3(p1Poke, p2Poke, p1FieldSide, p2FieldSide)

    const p1Summary: PokeSummary = {
      evs: p1Poke.evs,
      nature: p1Poke.nature,
      ability: p1Poke.ability,
      abilities: [p1Poke.ability],
      item: p1Poke.item,
      speed: calcCurrentSpeed(p1Poke, weather),
      stats: { atk: p1Poke.rawStats.at, def: p1Poke.rawStats.df, spa: p1Poke.rawStats.sa, spd: p1Poke.rawStats.sd, spe: p1Poke.rawStats.sp },
      modifiedStats: { atk: p1Poke.stats.at, def: p1Poke.stats.df, spa: p1Poke.stats.sa, spd: p1Poke.stats.sd, spe: p1Poke.stats.sp },
    }
    const p2Summary: PokeSummary = {
      evs: p2Poke.evs,
      nature: p2Poke.nature,
      ability: p2Poke.ability,
      abilities: options.fixedOpponentAbilities ? [p2Poke.ability] : p2Dex.abilities,
      item: p2Poke.item,
      speed: calcCurrentSpeed(p2Poke, weather),
      stats: { atk: p2Poke.rawStats.at, def: p2Poke.rawStats.df, spa: p2Poke.rawStats.sa, spd: p2Poke.rawStats.sd, spe: p2Poke.rawStats.sp },
      modifiedStats: { atk: p2Poke.stats.at, def: p2Poke.stats.df, spa: p2Poke.stats.sa, spd: p2Poke.stats.sd, spe: p2Poke.stats.sp },
    }

    return { p1Results, p2Results, p1MaxHP: p1Poke.maxHP, p2MaxHP: p2Poke.maxHP, p1Summary, p2Summary }
  }

  return {
    title: options.title,
    modes: options.modes,
    defaultSideState,
    sideStateFields: GEN3_SIDE_STATE_FIELDS,
    weatherOptions: ['', 'Sun', 'Rain', 'Sand', 'Hail'],
    weatherLabels: { '': 'None', Sun: 'Sun', Rain: 'Rain', Sand: 'Sand', Hail: 'Hail' },
    opponentNatureOptions: options.opponentNatureOptions,
    opponentIvsLabel: options.opponentIvsLabel,
    getTrainersForBattle: options.getTrainersForBattle,
    getPokemonForTrainer,
    getIVsForTrainer: options.getIVsForTrainer,
    getBattleRange: options.getBattleRange,
    buildP1Options,
    runCalc,
    calcCurrentSpeed,
    isValidSpecies: (species: string) => !!POKEDEX_ADV[species],
  }
}
