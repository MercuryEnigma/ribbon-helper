import { createGen4GameConfig } from './gen4BattleConfig'
import type { Gen4Setdex } from './gen4calc'
import type { FacilityMode, Trainer } from './battleCalculator'
import { battleRangeMatches } from './battleUtils'
import pthgssTeamData from '../data/battle-facilities/pthgss/setteam_pthgss.json'
import pthgssSetdex from '../data/battle-facilities/pthgss/setdex_pthgss.json'
import pthgssBattleTrainers from '../data/battle-facilities/pthgss/battle_trainers_pthgss.json'
import pthgssTrainerPokemon from '../data/battle-facilities/pthgss/trainer_pokemon_pthgss.json'

export const PTHGSS_TEAM_DATA = pthgssTeamData as Gen4Setdex

export const PTHGSS_MODES: FacilityMode[] = [
  {
    id: 'singles',
    label: 'Singles',
    defaultLevel: 50,
    format: 'singles',
    maxLevel: 50,
    teams: [
      { name: "Venty's Singles Team", url: 'https://pokepast.es/be7d1a59be75bbc9', description: 'Recommended team (requires Suicune):', pokemon: ['Garchomp (Singles)', 'Suicune (Singles)', 'Metagross (Singles)'] },
      { name: "K1K1-333's Singles Team", url: 'https://pokepast.es/9e2d1f7fc6bdc320', description: 'More consistent (requires Latias and Suicune):', pokemon: ['Garchomp (K1K1 Singles)', 'Latias (K1K1 Singles)', 'Suicune (K1K1 Singles)'] },
      { name: "K1K1-333's Budget Garchomp / Umbreon / Dusknoir Singles Team", url: 'https://pokepast.es/a4109b0d40e58651', description: 'Easiest to build:', pokemon: ['Garchomp (Budget Singles)', 'Umbreon (Budget Singles)', 'Dusknoir (Budget Singles)'] },
      { name: "Drapion Singles Team", url: 'https://pokepast.es/f0bceecb9e3613c9', description: 'Alternative team (requires Mesprit):', pokemon: ['Mesprit (Drapion Singles)', 'Drapion (Drapion Singles)', 'Garchomp (Drapion Singles)'] },
    ],
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
    teams: [
      { name: "SirToastyToes's Trick Room Doubles", url: 'https://pokepast.es/f47d3272d04f9f92', description: 'Recommended team:', pokemon: ['Bronzong (Doubles)', 'Togekiss (Doubles)', 'Machamp (Doubles)', 'Slowbro (Doubles)'] },
      { name: "kstie's Doubles Team", url: 'https://pokepast.es/87d0d311b00b771c', description: 'Most consistent (requires Latios and Zapdos):', pokemon: ['Hitmonlee (Doubles)', 'Latios (Doubles)', 'Zapdos (Doubles)', 'Metagross (Doubles)'] },
      { name: "Psychic J's Doubles Team", url: 'https://pokepast.es/963a8c3be0383783', description: 'Alternative team (requires Zapdos):', pokemon: ['Garchomp (Doubles Alt)', 'Gengar (Doubles Alt)', 'Zapdos (Doubles Alt)', 'Suicune (Doubles Alt)', 'Metagross (Doubles Alt)'] },
    ],
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
    teams: [
      { name: "Venty's MetaChomp Duo", url: 'https://pokepast.es/d7c808ac7ba1e426', description: 'Recommended team:', pokemon: [
        'Metagross (Multi Duo)', 'Garchomp (Multi Duo)',
      ] },
      { name: "Staraptor / Metagross Multi Team", url: 'https://pokepast.es/7f5f1e7155a95caa', description: 'Alternative team:', pokemon: ['Staraptor (Multi Alt)', 'Metagross (Multi Alt)'] },
      { name: "Mira's Team", url: '', description: '', pokemon: [
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
      ] },
    ],
    ribbon: {
      name: 'Multi Ability Ribbon',
      description: 'Win battle 50 or greater in Multi (with NPC) to earn the Multi Ability Ribbon. We recommend only selecting Mira for the last couple of sets, and make sure both of her pokemon are Moltres, Zapdos, Latios, or Latias. You do not need to win the entire set, and you do not need to reset.',
      icon: '/images/ribbons/multi-ability-ribbon.png',
    },
  },
  {
    id: 'pair',
    label: 'Pair (2-Player)',
    defaultLevel: 50,
    format: 'doubles',
    maxLevel: 50,
    teams: [
      { name: "SirToastyToes's Trick Room Doubles", url: 'https://pokepast.es/f47d3272d04f9f92', description: 'Recommended team:', pokemon: ['Bronzong (Doubles)', 'Togekiss (Doubles)', 'Machamp (Doubles)', 'Slowbro (Doubles)'] },
      { name: "kstie's Doubles Team", url: 'https://pokepast.es/87d0d311b00b771c', description: 'Most consistent (requires Latios and Zapdos):', pokemon: ['Hitmonlee (Doubles)', 'Latios (Doubles)', 'Zapdos (Doubles)', 'Metagross (Doubles)'] },
      { name: "Psychic J's Doubles Team", url: 'https://pokepast.es/963a8c3be0383783', description: 'Alternative team (requires Zapdos):', pokemon: ['Garchomp (Doubles Alt)', 'Gengar (Doubles Alt)', 'Zapdos (Doubles Alt)', 'Suicune (Doubles Alt)', 'Metagross (Doubles Alt)'] },
    ],
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

export const gen4Config = createGen4GameConfig({
  title: 'Platinum / HGSS - Battle Tower',
  modes: PTHGSS_MODES,
  teamData: PTHGSS_TEAM_DATA,
  setdex: pthgssSetdex as Gen4Setdex,
  trainerPokemon: PTHGSS_TP,
  getTrainersForBattle: pthgssGetTrainersForBattle,
  getIVsForTrainer: pthgssGetIVsForTrainer,
  getBattleRange: pthgssGetBattleRange,
})
