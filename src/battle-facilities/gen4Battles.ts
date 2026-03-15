import {
  buildPokemon as buildPokemonGen4,
  makeFieldSide as makeFieldSideGen4,
  calculateAllMovesGen4,
  findSetByLabel as findSetByLabelGen4,
  resolveSpeciesName as resolveSpeciesNameGen4,
  computeGen4Speed,
  POKEDEX_DPP,
  type SetdexEntry as SetdexEntryGen4,
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
import { battleRangeMatches } from './battleUtils'
import pthgssTeamData from '../data/battle-facilities/pthgss/setteam_pthgss.json'
import pthgssBattleTrainers from '../data/battle-facilities/pthgss/battle_trainers_pthgss.json'
import pthgssTrainerPokemon from '../data/battle-facilities/pthgss/trainer_pokemon_pthgss.json'

const TEAM_PTHGSS = pthgssTeamData as Record<string, Record<string, SetdexEntryGen4>>

const TEAM_PTHGSS_BY_LABEL: Record<string, { species: string; set: SetdexEntryGen4 }> = {}
for (const [species, sets] of Object.entries(TEAM_PTHGSS)) {
  for (const [label, set] of Object.entries(sets)) {
    TEAM_PTHGSS_BY_LABEL[label] = { species, set }
  }
}

const PTHGSS_MODES: FacilityMode[] = [
  {
    id: 'singles',
    label: 'Singles',
    defaultLevel: 50,
    format: 'singles',
    maxLevel: 50,
    teamUrl: 'https://pokepast.es/be7d1a59be75bbc9',
    teamName: "Venty's Garchomp / CroCune / Metagross Singles Team",
    pokemon: ['Garchomp (Singles)', 'Suicune (Singles)', 'Metagross (Singles)'],
    ribbon: {
      name: 'Ability Ribbon',
      description: 'Win the 21st battle against Palmer in Singles to earn the Ability Ribbon. Win the 49th battle against Palmer in Singles to earn the Great Ability Ribbon. After 49 consecutive wins, you need to restart the streak to earn the ribbons again.',
      icon: '/images/ribbons/ability-ribbon.png',
    },
  },
  {
    id: 'doubles',
    label: 'Doubles',
    defaultLevel: 50,
    format: 'doubles',
    maxLevel: 50,
    teamUrl: 'https://pokepast.es/f47d3272d04f9f92',
    teamName: "SirToastyToes's Trick Room Doubles",
    pokemon: ['Bronzong (Doubles)', 'Togekiss (Doubles)', 'Machamp (Doubles)', 'Slowbro (Doubles)'],
    ribbon: {
      name: 'Double Ability Ribbon',
      description: 'Win battle 50 or greater in Doubles to earn the Double Ability Ribbon. You do not need to win the entire set, and you do not need to reset.',
      icon: '/images/ribbons/double-ability-ribbon.png',
    },
  },
  {
    id: 'multi-npc',
    label: 'Multi (NPC)',
    defaultLevel: 50,
    format: 'doubles',
    maxLevel: 50,
    teamUrl: 'https://pokepast.es/d7c808ac7ba1e426',
    teamName: "Venty's MetaChomp Duo",
    pokemon: [
      'Metagross (Multi Duo)', 'Garchomp (Multi Duo)',
      'Alakazam 1 (Mira)', 'Alakazam 2 (Mira)', 'Alakazam 3 (Mira)', 'Alakazam 4 (Mira)',
      'Gengar 1 (Mira)', 'Gengar 2 (Mira)', 'Gengar 3 (Mira)', 'Gengar 4 (Mira)',
      'Exeggutor 1 (Mira)', 'Exeggutor 2 (Mira)', 'Exeggutor 3 (Mira)',
      'Zapdos 1 (Mira)', 'Zapdos 2 (Mira)',
      'Moltres 1 (Mira)', 'Moltres 2 (Mira)', 'Moltres 3 (Mira)',
      'Espeon 1 (Mira)', 'Espeon 2 (Mira)', 'Espeon 3 (Mira)', 'Espeon 4 (Mira)',
      'Gardevoir 1 (Mira)', 'Gardevoir 2 (Mira)', 'Gardevoir 3 (Mira)', 'Gardevoir 4 (Mira)',
      'Latias 1 (Mira)', 'Latias 2 (Mira)', 'Latias 3 (Mira)', 'Latias 4 (Mira)',
      'Latios 1 (Mira)', 'Latios 2 (Mira)', 'Latios 3 (Mira)', 'Latios 4 (Mira)',
      'Empoleon 1 (Mira)', 'Empoleon 2 (Mira)',
      'Roserade 1 (Mira)', 'Roserade 2 (Mira)', 'Roserade 3 (Mira)', 'Roserade 4 (Mira)',
      'Magnezone 1 (Mira)', 'Magnezone 2 (Mira)',
    ],
    ribbon: {
      name: 'Multi Ability Ribbon',
      description: 'Win battle 50 or greater in Multi (with NPC) to earn the Multi Ability Ribbon. You do not need to win the entire set, and you do not need to reset.',
      icon: '/images/ribbons/multi-ability-ribbon.png',
    },
  },
  {
    id: 'pair',
    label: 'Pair (2-Player)',
    defaultLevel: 50,
    format: 'doubles',
    maxLevel: 50,
    teamUrl: 'https://pokepast.es/f47d3272d04f9f92',
    teamName: "SirToastyToes's Trick Room Doubles",
    pokemon: ['Bronzong (Doubles)', 'Togekiss (Doubles)', 'Machamp (Doubles)', 'Slowbro (Doubles)'],
    ribbon: {
      name: 'Pair Ability Ribbon',
      description: 'Win battle 50 or greater in Multi with friends (2-player) to earn the Pair Ability Ribbon. You do not need to win the entire set, and you do not need to reset.',
      icon: '/images/ribbons/pair-ability-ribbon.png',
    },
  },
]

// Gen 4 Battle Tower runs in 7-battle sets.
// Silver Print: win 21 consecutive battles (sets 1-3)
// Gold Print: win 49 consecutive battles (sets 1-7)
const BATTLE_RANGES = ['1-7', '8-14', '15-21', '22-28', '29-35', '36-42', '43-49', '50+'] as const

function pthgssGetBattleRange(battleNum: number): string {
  if (battleNum >= 50) return '50+'
  const index = Math.floor((battleNum - 1) / 7)
  return BATTLE_RANGES[index] ?? '1-7'
}

// IV tiers for Gen 4 Battle Tower (trainer number-based)
// Trainer numbers 001-100:  3 IVs
// 101-120:  6 IVs
// 121-140:  9 IVs
// 141-160: 12 IVs
// 161-180: 15 IVs
// 181-200: 18 IVs
// 201-220: 21 IVs
// 221+:    31 IVs (Palmer and high-tier trainers)
function pthgssGetIVsForTrainer(trainer: Trainer | null): number {
  if (!trainer) return 3
  if (trainer.name.startsWith('Palmer')) return 31
  const n = trainer.number
  if (n > 220) return 31
  if (n >= 201) return 21
  if (n >= 181) return 18
  if (n >= 161) return 15
  if (n >= 141) return 12
  if (n >= 121) return 9
  if (n >= 101) return 6
  return 3
}

const PTHGSS_TRAINERS = pthgssBattleTrainers as Trainer[]
const PTHGSS_TP = pthgssTrainerPokemon as Record<string, string[]>

function pthgssGetTrainersForBattle(battleNum: number, modeId?: string): Trainer[] {
  const matches = PTHGSS_TRAINERS.filter(t =>
    t.battleRanges.some(r => battleRangeMatches(battleNum, r)) &&
    (!t.boss || t.boss === modeId)
  )
  const bosses = matches.filter(t => t.boss)
  return bosses.length > 0 ? bosses : matches
}

function pthgssGetPokemonForTrainer(trainerName: string): string[] {
  return PTHGSS_TP[trainerName] ?? []
}

function pthgssBuildP1Options(ribbonMaster: StoredSet | null, pokemonSets: StoredSet[], modeLabels: string[]): P1Option[] {
  const options: P1Option[] = []

  if (ribbonMaster) {
    options.push({ label: ribbonMaster.label, species: ribbonMaster.species, set: ribbonMaster.set })
  }

  for (const label of modeLabels) {
    const entry = TEAM_PTHGSS_BY_LABEL[label]
    if (!entry) continue
    options.push({ label, species: entry.species, set: entry.set as any })
  }

  for (const cs of pokemonSets) {
    options.push({ label: cs.label, species: cs.species, set: cs.set })
  }

  return options
}

function pthgssDefaultSideState(): SideState {
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

const PTHGSS_SIDE_STATE_FIELDS: SideStateFieldDef[] = [
  { type: 'checkbox', key: 'itemUsed', label: 'Used/Lost Item', row: 0 },
  { type: 'checkbox', key: 'isProtect', label: 'Protect', row: 1 },
  { type: 'checkbox', key: 'isReflect', label: 'Reflect', row: 1 },
  { type: 'checkbox', key: 'isLightScreen', label: 'Light Screen', row: 1 },
  { type: 'checkbox', key: 'isHelpingHand', label: 'Helping Hand', row: 2 },
  { type: 'checkbox', key: 'isTailwind', label: 'Tailwind', row: 2 },
  { type: 'checkbox', key: 'isCharge', label: 'Charge', row: 2 },
]

const STAT_NAMES = ['at', 'df', 'sa', 'sd', 'sp'] as const


function pthgssRunCalc(params: CalcParams): CalcResult | null {
  const { p1, p2Label, p1Level, p2Level, p2Ivs, p2Ability, weather, gravity, p1Side, p2Side, format } = params

  const p1SpeciesKey = resolveSpeciesNameGen4(p1.species)
  const p1Dex = POKEDEX_DPP[p1SpeciesKey]
  if (!p1Dex) return null
  const p1SetGen4 = p1.set as SetdexEntryGen4
  const effectiveP1Level = (p1SetGen4 as any).level ?? p1Level
  const p1Poke = buildPokemonGen4(p1SpeciesKey, p1Dex, p1SetGen4, p1.label, effectiveP1Level)

  const p2Match = findSetByLabelGen4(p2Label)
  if (!p2Match) return null
  const p2Dex = POKEDEX_DPP[p2Match.species]
  if (!p2Dex) return null
  const p2Poke = buildPokemonGen4(p2Match.species, p2Dex, p2Match.set, p2Label, p2Level, p2Ivs)

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

  const g = !!gravity
  const p1FieldSide = makeFieldSideGen4({
    isProtect: p1Side.isProtect,
    isReflect: p1Side.isReflect, isLightScreen: p1Side.isLightScreen,
    isHelpingHand: p1Side.isHelpingHand, isTailwind: p1Side.isTailwind,
    isCharge: p1Side.isCharge, isGravity: g,
  }, format, weather)
  const p2FieldSide = makeFieldSideGen4({
    isProtect: p2Side.isProtect,
    isReflect: p2Side.isReflect, isLightScreen: p2Side.isLightScreen,
    isHelpingHand: p2Side.isHelpingHand, isTailwind: p2Side.isTailwind,
    isCharge: p2Side.isCharge, isGravity: g,
  }, format, weather)

  const [p1Results, p2Results] = calculateAllMovesGen4(p1Poke, p2Poke, p1FieldSide, p2FieldSide)

  const p1Summary: PokeSummary = {
    evs: p1Poke.evs, nature: p1Poke.nature, ability: p1Poke.ability,
    abilities: [p1Poke.ability], item: p1Poke.item,
    speed: computeGen4Speed(p1Poke, weather) * (p1Side.isTailwind ? 2 : 1),
  }
  const p2Summary: PokeSummary = {
    evs: p2Poke.evs, nature: p2Poke.nature, ability: p2Poke.ability,
    abilities: p2Dex.abilities, item: p2Poke.item,
    speed: computeGen4Speed(p2Poke, weather) * (p2Side.isTailwind ? 2 : 1),
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

function pthgssCalcCurrentSpeed(pokemon: any, weather: string): number {
  return computeGen4Speed(pokemon, weather)
}

export const gen4Config: GameConfig = {
  title: 'Platinum / HGSS - Battle Tower',
  modes: PTHGSS_MODES,
  defaultSideState: pthgssDefaultSideState,
  sideStateFields: PTHGSS_SIDE_STATE_FIELDS,
  weatherOptions: ['', 'Sun', 'Rain', 'Sand', 'Hail'],
  weatherLabels: { '': 'None', Sun: 'Sun', Rain: 'Rain', Sand: 'Sand', Hail: 'Hail' },
  hasGravity: true,
  getTrainersForBattle: pthgssGetTrainersForBattle,
  getPokemonForTrainer: pthgssGetPokemonForTrainer,
  getIVsForTrainer: pthgssGetIVsForTrainer,
  getBattleRange: pthgssGetBattleRange,
  buildP1Options: pthgssBuildP1Options,
  runCalc: pthgssRunCalc,
  calcCurrentSpeed: pthgssCalcCurrentSpeed,
  isValidSpecies: (species: string) => !!POKEDEX_DPP[species] || !!POKEDEX_DPP[resolveSpeciesNameGen4(species)],
}
