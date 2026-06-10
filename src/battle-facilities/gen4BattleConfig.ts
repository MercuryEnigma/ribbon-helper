import {
  buildPokemon,
  makeFieldSide,
  calculateAllMovesGen4,
  findSetByLabel,
  resolveSpeciesName,
  computeGen4Speed,
  MOVES_DPP,
  POKEDEX_DPP,
  type Gen4MoveDex,
  type Gen4Setdex,
  type SetdexEntry,
} from './gen4calc'
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

interface Gen4GameConfigOptions {
  title: string
  modes: FacilityMode[]
  teamData: Gen4Setdex
  setdex: Gen4Setdex
  trainerPokemon: Record<string, string[]>
  getTrainersForBattle: (battleNum: number, modeId?: string) => Trainer[]
  getIVsForTrainer: (trainer: Trainer | null) => number
  getBattleRange: (battleNum: number, modeId?: string) => string
  moveData?: Gen4MoveDex
  opponentNatureOptions?: readonly string[]
}

const GEN4_SIDE_STATE_FIELDS: SideStateFieldDef[] = [
  { type: 'checkbox', key: 'itemUsed', label: 'Used/Lost Item', row: 0 },
  { type: 'checkbox', key: 'isProtect', label: 'Protect', row: 1 },
  { type: 'checkbox', key: 'isReflect', label: 'Reflect', row: 1 },
  { type: 'checkbox', key: 'isLightScreen', label: 'Light Screen', row: 1 },
  { type: 'checkbox', key: 'isHelpingHand', label: 'Helping Hand', row: 2 },
  { type: 'checkbox', key: 'isTailwind', label: 'Tailwind', row: 2 },
  { type: 'checkbox', key: 'isCharge', label: 'Charge', row: 2 },
]

const STAT_NAMES = ['at', 'df', 'sa', 'sd', 'sp'] as const

function defaultSideState(): SideState {
  return {
    itemUsed: false,
    isProtect: false,
    isReflect: false,
    isLightScreen: false,
    isHelpingHand: false,
    isTailwind: false,
    isCharge: false,
    boosts: { at: 0, df: 0, sa: 0, sd: 0, sp: 0 },
    curHP: 0,
    maxHP: 0,
    status: 'Healthy',
  }
}

export function createGen4GameConfig(options: Gen4GameConfigOptions): GameConfig {
  const teamByLabel: Record<string, { species: string; set: SetdexEntry }> = {}
  for (const [species, sets] of Object.entries(options.teamData)) {
    for (const [label, set] of Object.entries(sets)) {
      teamByLabel[label] = { species, set }
    }
  }

  function getPokemonForTrainer(trainerName: string): string[] {
    return (options.trainerPokemon[trainerName] ?? [])
      .filter(label => findSetByLabel(label, options.setdex) !== null)
  }

  function buildP1Options(ribbonMaster: StoredSet | null, pokemonSets: StoredSet[], modeLabels: string[]): P1Option[] {
    const result: P1Option[] = []

    if (ribbonMaster) {
      result.push({ label: ribbonMaster.label, species: ribbonMaster.species, set: ribbonMaster.set })
    }

    for (const label of modeLabels) {
      const entry = teamByLabel[label]
      if (entry) result.push({ label, species: entry.species, set: entry.set as any })
    }

    for (const set of pokemonSets) {
      result.push({ label: set.label, species: set.species, set: set.set })
    }

    return result
  }

  function runCalc(params: CalcParams): CalcResult | null {
    const {
      p1,
      p2Label,
      p1Level,
      p2Level,
      p2Ivs,
      p2Ability,
      p2Nature,
      weather,
      gravity,
      p1Side,
      p2Side,
      format,
    } = params
    const moveData = options.moveData ?? MOVES_DPP

    const p1SpeciesKey = resolveSpeciesName(p1.species)
    const p1Dex = POKEDEX_DPP[p1SpeciesKey]
    if (!p1Dex) return null
    const p1Set = p1.set as SetdexEntry
    const effectiveP1Level = (p1Set as any).level ?? p1Level
    const p1Poke = buildPokemon(p1SpeciesKey, p1Dex, p1Set, p1.label, effectiveP1Level, 31, moveData)

    const p2Match = findSetByLabel(p2Label, options.setdex)
    if (!p2Match) return null
    const p2Dex = POKEDEX_DPP[p2Match.species]
    if (!p2Dex) return null
    const effectiveP2Set = p2Nature && options.opponentNatureOptions?.includes(p2Nature)
      ? { ...p2Match.set, nature: p2Nature }
      : p2Match.set
    const p2Poke = buildPokemon(p2Match.species, p2Dex, effectiveP2Set, p2Label, p2Level, p2Ivs, moveData)

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

    const isGravity = !!gravity
    const p1FieldSide = makeFieldSide({
      isProtect: p1Side.isProtect,
      isReflect: p1Side.isReflect,
      isLightScreen: p1Side.isLightScreen,
      isHelpingHand: p1Side.isHelpingHand,
      isTailwind: p1Side.isTailwind,
      isCharge: p1Side.isCharge,
      isGravity,
    }, format, weather)
    const p2FieldSide = makeFieldSide({
      isProtect: p2Side.isProtect,
      isReflect: p2Side.isReflect,
      isLightScreen: p2Side.isLightScreen,
      isHelpingHand: p2Side.isHelpingHand,
      isTailwind: p2Side.isTailwind,
      isCharge: p2Side.isCharge,
      isGravity,
    }, format, weather)

    const [p1Results, p2Results] = calculateAllMovesGen4(p1Poke, p2Poke, p1FieldSide, p2FieldSide)

    const p1Summary: PokeSummary = {
      evs: p1Poke.evs,
      nature: p1Poke.nature,
      ability: p1Poke.ability,
      abilities: [p1Poke.ability],
      item: p1Poke.item,
      speed: computeGen4Speed(p1Poke, weather) * (p1Side.isTailwind ? 2 : 1),
      stats: { atk: p1Poke.rawStats.at, def: p1Poke.rawStats.df, spa: p1Poke.rawStats.sa, spd: p1Poke.rawStats.sd, spe: p1Poke.rawStats.sp },
      modifiedStats: { atk: p1Poke.stats.at, def: p1Poke.stats.df, spa: p1Poke.stats.sa, spd: p1Poke.stats.sd, spe: p1Poke.stats.sp },
    }
    const p2Summary: PokeSummary = {
      evs: p2Poke.evs,
      nature: p2Poke.nature,
      ability: p2Poke.ability,
      abilities: p2Dex.abilities,
      item: p2Poke.item,
      speed: computeGen4Speed(p2Poke, weather) * (p2Side.isTailwind ? 2 : 1),
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

  return {
    title: options.title,
    modes: options.modes,
    defaultSideState,
    sideStateFields: GEN4_SIDE_STATE_FIELDS,
    weatherOptions: ['', 'Sun', 'Rain', 'Sand', 'Hail'],
    weatherLabels: { '': 'None', Sun: 'Sun', Rain: 'Rain', Sand: 'Sand', Hail: 'Hail' },
    opponentNatureOptions: options.opponentNatureOptions,
    hasGravity: true,
    getTrainersForBattle: options.getTrainersForBattle,
    getPokemonForTrainer,
    getIVsForTrainer: options.getIVsForTrainer,
    getBattleRange: options.getBattleRange,
    buildP1Options,
    runCalc,
    calcCurrentSpeed: computeGen4Speed,
    isValidSpecies: (species: string) => !!POKEDEX_DPP[species] || !!POKEDEX_DPP[resolveSpeciesName(species)],
  }
}
