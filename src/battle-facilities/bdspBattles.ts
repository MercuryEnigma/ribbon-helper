import {
  buildPokemon as buildPokemonBDSP,
  makeFieldSide as makeFieldSideBDSP,
  calculateAllMovesBDSP,
  findSetByLabel as findSetByLabelBDSP,
  resolveSpeciesName as resolveSpeciesNameBDSP,
  computeBDSPSpeed,
  POKEDEX_BDSP,
  type SetdexEntry as SetdexEntryBDSP,
} from './bdspCalc'
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
import bdspTeamData from '../data/battle-facilities/bdsp/setteam_bdsp.json'
import bdspBattleTrainersRaw from '../data/battle-facilities/bdsp/battle_trainers_bdsp.json'
import bdspTrainerPokemonRaw from '../data/battle-facilities/bdsp/trainer_pokemon_bdsp.json'

const TEAM_BDSP = bdspTeamData as Record<string, Record<string, SetdexEntryBDSP>>

const TEAM_BDSP_BY_LABEL: Record<string, { species: string; set: SetdexEntryBDSP }> = {}
for (const [species, sets] of Object.entries(TEAM_BDSP)) {
  for (const [label, set] of Object.entries(sets)) {
    TEAM_BDSP_BY_LABEL[label] = { species, set }
  }
}

const SINGLES_TEAM = {
  name: "Psychic J's Singles",
  url: 'https://pokepast.es/540c7e0bf2ebb5f1',
  description: 'Recommended singles team:',
  pokemon: ['Garchomp (Singles)', 'Suicune (Singles)', 'Scizor (Singles)'],
}

const DOUBLES_TEAM = {
  name: 'Dusknoir / Aron TR Doubles',
  url: 'https://pokepast.es/18350f05d966bfb9',
  description: 'Recommended doubles team:',
  pokemon: ['Dusknoir (Doubles)', 'Aron (Doubles)', 'Hariyama (Doubles)', 'Torkoal (Doubles)'],
}

const BDSP_MODES: FacilityMode[] = [
  {
    id: 'regular-singles',
    label: 'Regular Singles',
    defaultLevel: 50,
    format: 'singles',
    maxLevel: 50,
    teams: [SINGLES_TEAM],
    ribbon: { name: "", icon: "", description: 'Win battle 49 against Tycoon Palmer to unlock Master Class.' },
  },
  {
    id: 'regular-doubles',
    label: 'Regular Doubles',
    defaultLevel: 50,
    format: 'doubles',
    maxLevel: 50,
    teams: [DOUBLES_TEAM],
    ribbon: { name: "", icon: "",  description: 'Win battle 49 against Tycoon Palmer to unlock Master Class.' },
  },
  {
    id: 'master-singles',
    label: 'Master Singles',
    defaultLevel: 50,
    format: 'singles',
    maxLevel: 50,
    teams: [SINGLES_TEAM],
    ribbon: {
      name: 'Tower Master Ribbon',
      description: 'Win against the Rank 10 boss Palmer for the Tower Master Ribbon.',
      icon: '/images/ribbons/tower-master-ribbon.png',
    },
  },
  {
    id: 'master-doubles',
    label: 'Master Doubles',
    defaultLevel: 50,
    format: 'doubles',
    maxLevel: 50,
    teams: [DOUBLES_TEAM],
    ribbon: {
      name: 'Tower Master Ribbon',
      description: 'Win against the Rank 10 boss Palmer and Barry for the Tower Master Ribbon.',
      icon: '/images/ribbons/tower-master-ribbon.png',
    },
  },
]

// ── Trainer data ─────────────────────────────────────────────────────────────

interface TrainerBDSP extends Trainer {
  sets?: Record<string, number[] | true>
  rank?: number
  battleNum?: number
}

const BDSP_TRAINERS = bdspBattleTrainersRaw as TrainerBDSP[]
const BDSP_TP = bdspTrainerPokemonRaw as Record<string, Record<string, string[]>>

// ── Battle range helpers ──────────────────────────────────────────────────────

// For regular mode: set N = battles (N-1)*7+1 to N*7.
// For master mode: battles 7, 14, 21, ... are boss battles (rank = battle/7).
//                  All other battles can have any master-class trainer.

// Regular mode loops every 49 battles (battle 50 = battle 1, battle 98 = battle 49, etc.)
function regularEffectiveBattle(battleNum: number): number {
  return ((battleNum - 1) % 49) + 1
}

function setNumForBattle(battleNum: number): number {
  return Math.ceil(battleNum / 7)
}

function isRegularPalmerBattle(battleNum: number): boolean {
  return battleNum === 21 || battleNum === 49
}

function isMasterBossBattle(battleNum: number): boolean {
  return battleNum > 0 && battleNum % 7 === 0
}

function masterRankForBattle(battleNum: number): number {
  return battleNum / 7
}

// ── Trainer / pokemon lookup ──────────────────────────────────────────────────

function bdspGetTrainersForBattle(battleNum: number, modeId?: string): Trainer[] {
  const isRegular = modeId === 'regular-singles' || modeId === 'regular-doubles'
  const isMaster  = modeId === 'master-singles'  || modeId === 'master-doubles'

  if (isRegular) {
    const effectiveBattle = regularEffectiveBattle(battleNum)
    // Palmer is the sole opponent at battles 21 and 49
    if (isRegularPalmerBattle(effectiveBattle)) {
      return BDSP_TRAINERS.filter(t => t.name === 'Palmer' && t.boss === 'regular' && t.battleNum === effectiveBattle)
    }
    // Regular trainers: find which set the battle belongs to
    const setNum = setNumForBattle(effectiveBattle)
    return BDSP_TRAINERS.filter(t => {
      if (t.boss) return false
      if (!t.sets || !modeId) return false
      const modeSets = t.sets[modeId]
      return Array.isArray(modeSets) && modeSets.includes(setNum)
    })
  }

  if (isMaster) {
    // Boss at every 7th battle
    if (isMasterBossBattle(battleNum)) {
      const rank = masterRankForBattle(battleNum)
      return BDSP_TRAINERS.filter(t => t.boss === modeId && t.rank === rank)
    }
    // Any master-class normal trainer or pair
    return BDSP_TRAINERS.filter(t => {
      if (t.boss) return false
      if (!t.sets || !modeId) return false
      return t.sets[modeId] === true
    })
  }

  return []
}

function bdspGetPokemonForTrainer(trainerName: string, modeId?: string, battleNum?: number): string[] {
  // For "X and Y" boss pairs whose pokemon are stored under the last name (e.g., "Barry and Palmer" → "Palmer")
  const data = BDSP_TP[trainerName] ?? (
    trainerName.includes(' and ') ? BDSP_TP[trainerName.split(' and ').pop()!] : undefined
  )
  if (!data) return []
  if (!modeId) {
    // Return all possible pokemon (union across all keys)
    return [...new Set(Object.values(data).flat())]
  }

  const isRegular = modeId === 'regular-singles' || modeId === 'regular-doubles'
  const effectiveBattle = (isRegular && battleNum != null) ? regularEffectiveBattle(battleNum) : battleNum

  // Boss pokemon: keyed as "{modeId}-{battleNum}"
  const trainer = BDSP_TRAINERS.find(t => t.name === trainerName && t.boss)
  if (trainer && effectiveBattle != null) {
    const bossKey = `${modeId}-${effectiveBattle}`
    if (data[bossKey]) return data[bossKey]
    // Palmer regular: same pokemon for both battle 21 and 49, any regular mode
    if (trainer.boss === 'regular') {
      const fallbackKey = `${modeId}-${trainer.battleNum}`
      if (data[fallbackKey]) return data[fallbackKey]
    }
  }

  // Master mode individual/pair: keyed as "{modeId}"
  if ((modeId === 'master-singles' || modeId === 'master-doubles') && data[modeId]) {
    return data[modeId]
  }

  // Regular mode: keyed as "{modeId}-{setNum}"
  if (effectiveBattle != null) {
    const setNum = setNumForBattle(effectiveBattle)
    const key = `${modeId}-${setNum}`
    if (data[key]) return data[key]
  }

  return Object.values(data).flat()
}

function bdspGetIVsForTrainer(trainer: Trainer | null): number {
  const t = trainer as TrainerBDSP | null
  if (!t) return 3
  if (t.boss) return 31
  if (t.sets && (t.sets['master-singles'] === true || t.sets['master-doubles'] === true)) return 31
  const maxSet = Math.max(
    ...Object.values(t.sets ?? {})
      .filter(v => Array.isArray(v))
      .flatMap(v => v as number[]),
    0
  )
  if (maxSet >= 7) return 21
  if (maxSet >= 5) return 15
  if (maxSet >= 3) return 9
  return 3
}

function bdspGetBattleRange(battleNum: number, modeId?: string): string {
  const isRegular = modeId === 'regular-singles' || modeId === 'regular-doubles'
  const effective = isRegular ? regularEffectiveBattle(battleNum) : battleNum
  const set = setNumForBattle(effective)
  return `${(set - 1) * 7 + 1}-${set * 7}`
}

// ── Side state ────────────────────────────────────────────────────────────────

function bdspDefaultSideState(): SideState {
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

const BDSP_SIDE_STATE_FIELDS: SideStateFieldDef[] = [
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

// ── Speed calculation ─────────────────────────────────────────────────────────

const STAT_NAMES = ['at', 'df', 'sa', 'sd', 'sp'] as const

function bdspCalcCurrentSpeed(pokemon: any, weather: string, terrain?: string): number {
  let speed = pokemon.stats.sp
  const mod = pokemon.boosts?.sp ?? 0
  if (mod > 0) speed = Math.floor(speed * (2 + mod) / 2)
  else if (mod < 0) speed = Math.floor(speed * 2 / (2 - mod))
  if (pokemon.status === 'Paralyzed') speed = Math.floor(speed / 2)
  if (pokemon.item === 'Choice Scarf') speed = Math.floor(speed * 1.5)
  if (pokemon.item === 'Macho Brace' || pokemon.item === 'Iron Ball') speed = Math.floor(speed / 2)
  if (weather === 'Sun'  && pokemon.curAbility === 'Chlorophyll') speed *= 2
  else if (weather === 'Rain' && pokemon.curAbility === 'Swift Swim') speed *= 2
  else if (weather === 'Sand' && pokemon.curAbility === 'Sand Rush')  speed *= 2
  else if (weather === 'Hail' && pokemon.curAbility === 'Slush Rush') speed *= 2
  if (terrain === 'Electric' && pokemon.curAbility === 'Surge Surfer') speed *= 2
  return speed
}

// ── P1 options ────────────────────────────────────────────────────────────────

function bdspBuildP1Options(ribbonMaster: StoredSet | null, pokemonSets: StoredSet[], modeLabels: string[]): P1Option[] {
  const options: P1Option[] = []
  if (ribbonMaster) {
    options.push({ label: ribbonMaster.label, species: ribbonMaster.species, set: ribbonMaster.set })
  }
  for (const label of modeLabels) {
    const entry = TEAM_BDSP_BY_LABEL[label]
    if (!entry) continue
    options.push({ label, species: entry.species, set: entry.set as any })
  }
  for (const cs of pokemonSets) {
    options.push({ label: cs.label, species: cs.species, set: cs.set })
  }
  return options
}

// ── Calc ──────────────────────────────────────────────────────────────────────

function bdspRunCalc(params: CalcParams): CalcResult | null {
  const { p1, p2Label, p1Level, p2Level, p2Ivs, p2Ability, weather, terrain, gravity, p1Side, p2Side, format } = params

  const p1SpeciesKey = resolveSpeciesNameBDSP(p1.species)
  const p1Dex = POKEDEX_BDSP[p1SpeciesKey]
  if (!p1Dex) return null
  const p1SetBDSP = p1.set as SetdexEntryBDSP
  const effectiveP1Level = (p1SetBDSP as any).level ?? p1Level
  const p1Poke = buildPokemonBDSP(p1SpeciesKey, p1Dex, p1SetBDSP, p1.label, effectiveP1Level)

  const p2Match = findSetByLabelBDSP(p2Label)
  if (!p2Match) return null
  const p2Dex = POKEDEX_BDSP[p2Match.species]
  if (!p2Dex) return null
  const p2Poke = buildPokemonBDSP(p2Match.species, p2Dex, p2Match.set, p2Label, p2Level, p2Ivs)

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
  const p1FieldSide = makeFieldSideBDSP({
    isProtect: p1Side.isProtect,
    isReflect: p1Side.isReflect, isLightScreen: p1Side.isLightScreen,
    isAuroraVeil: p1Side.isAuroraVeil, isHelpingHand: p1Side.isHelpingHand,
    isTailwind: p1Side.isTailwind, isCharge: p1Side.isCharge,
    isGravity: g, isFriendGuard: p1Side.isFriendGuard,
  }, format, weather, t)
  const p2FieldSide = makeFieldSideBDSP({
    isProtect: p2Side.isProtect,
    isReflect: p2Side.isReflect, isLightScreen: p2Side.isLightScreen,
    isAuroraVeil: p2Side.isAuroraVeil, isHelpingHand: p2Side.isHelpingHand,
    isTailwind: p2Side.isTailwind, isCharge: p2Side.isCharge,
    isGravity: g, isFriendGuard: p2Side.isFriendGuard,
  }, format, weather, t)

  const [p1Results, p2Results] = calculateAllMovesBDSP(p1Poke, p2Poke, p1FieldSide, p2FieldSide)

  const p1Summary: PokeSummary = {
    evs: p1Poke.evs, nature: p1Poke.nature, ability: p1Poke.ability,
    abilities: [p1Poke.ability], item: p1Poke.item,
    speed: bdspCalcCurrentSpeed(p1Poke, weather, t) * (p1Side.isTailwind ? 2 : 1),
    stats: { atk: p1Poke.rawStats.at, def: p1Poke.rawStats.df, spa: p1Poke.rawStats.sa, spd: p1Poke.rawStats.sd, spe: p1Poke.rawStats.sp },
    modifiedStats: { atk: p1Poke.stats.at, def: p1Poke.stats.df, spa: p1Poke.stats.sa, spd: p1Poke.stats.sd, spe: p1Poke.stats.sp },
  }
  const p2Summary: PokeSummary = {
    evs: p2Poke.evs, nature: p2Poke.nature, ability: p2Poke.ability,
    abilities: p2Dex.abilities, item: p2Poke.item,
    speed: bdspCalcCurrentSpeed(p2Poke, weather, t) * (p2Side.isTailwind ? 2 : 1),
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

// ── Config export ─────────────────────────────────────────────────────────────

export const bdspConfig: GameConfig = {
  title: 'Brilliant Diamond / Shining Pearl - Battle Tower',
  modes: BDSP_MODES,
  defaultSideState: bdspDefaultSideState,
  sideStateFields: BDSP_SIDE_STATE_FIELDS,
  weatherOptions: ['', 'Sun', 'Rain', 'Sand', 'Hail'],
  weatherLabels: { '': 'None', Sun: 'Sun', Rain: 'Rain', Sand: 'Sand', Hail: 'Hail' },
  terrainOptions: ['', 'Electric', 'Grassy', 'Misty', 'Psychic'],
  terrainLabels: { '': 'None', Electric: 'Electric', Grassy: 'Grassy', Misty: 'Misty', Psychic: 'Psychic' },
  hasGravity: true,
  getTrainersForBattle: bdspGetTrainersForBattle,
  getPokemonForTrainer: bdspGetPokemonForTrainer,
  getIVsForTrainer: bdspGetIVsForTrainer,
  getBattleRange: bdspGetBattleRange,
  buildP1Options: bdspBuildP1Options,
  runCalc: bdspRunCalc,
  calcCurrentSpeed: bdspCalcCurrentSpeed,
  isValidSpecies: (species: string) => !!POKEDEX_BDSP[species] || !!POKEDEX_BDSP[resolveSpeciesNameBDSP(species)],
}
