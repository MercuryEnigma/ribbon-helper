import type { FacilityMode, Trainer } from './battleCalculator'
import { createGen3GameConfig } from './gen3BattleConfig'
import { SETDEX_EM, type Gen3Setdex } from './gen3calc'
import { battleRangeMatches } from './battleUtils'
import teamData from '../data/battle-facilities/emerald/setteam_em.json'
import battleTrainers from '../data/battle-facilities/emerald/battle_trainers_em.json'
import trainerPokemon from '../data/battle-facilities/emerald/trainer_pokemon_em.json'

const EMERALD_MODES: FacilityMode[] = [
  {
    id: 'lvl50-singles',
    label: 'Lvl 50 Singles',
    defaultLevel: 50,
    format: 'singles',
    maxLevel: 50,
    teams: [
      { name: "Venty's Latios / Metagross / Suicune", url: 'https://pokepast.es/9f353ea337d86f51', description: 'Recommended team:', pokemon: ['Latios (Singles)', 'Metagross (Singles)', 'Suicune (Singles)'] },
      { name: "Jellal's Starmie / Forretress / Flygon", url: 'https://pokepast.es/1e1e0a14ff63af52', description: 'Emerald-only recommended team:', pokemon: ['Starmie (Emerald Singles)', 'Forretress (Emerald Singles)', 'Flygon (Emerald Singles)'] },
    ],
    ribbon: { name: 'Winning Ribbon', description: 'Win a full 7-set from battle 50-56 onwards. The Battle Tower awards the Winning Ribbon.', warning: 'We recommend getting this ribbon in R/S Battle Tower.', icon: '/images/ribbons/winning-ribbon.png' },
  },
  {
    id: 'open-singles',
    label: 'Open Singles',
    defaultLevel: 60,
    format: 'singles',
    teams: [
      { name: "Venty's Latios / Metagross / Suicune", url: 'https://pokepast.es/9f353ea337d86f51', description: 'Recommended team:', pokemon: ['Latios (Singles)', 'Metagross (Singles)', 'Suicune (Singles)'] },
      { name: "Jellal's Starmie / Forretress / Flygon", url: 'https://pokepast.es/1e1e0a14ff63af52', description: 'Emerald-only recommended team:', pokemon: ['Starmie (Emerald Singles)', 'Forretress (Emerald Singles)', 'Flygon (Emerald Singles)'] },
    ],
    ribbon: { name: 'Victory Ribbon', description: 'Win a full 7-set from battle 50-56 onwards. The Battle Tower awards the Victory Ribbon.', warning: 'We recommend getting this ribbon in R/S Battle Tower.', icon: '/images/ribbons/victory-ribbon.png' },
  },
  {
    id: 'lvl50-doubles',
    label: 'Lvl 50 Doubles',
    defaultLevel: 50,
    format: 'doubles',
    maxLevel: 50,
    teams: [{ name: "Venty's Explosive doubles team", url: 'https://pokepast.es/773249e264806f40', description: 'Recommended team:', pokemon: ['Latios (Doubles)', 'Metagross (Doubles)', 'Snorlax (Doubles)', 'Gengar (Doubles)'] }],
    ribbon: { name: 'Winning Ribbon', description: 'Win a full 7-set from battle 50-56 onwards. The Battle Tower awards the Winning Ribbon.', warning: 'We recommend getting this ribbon in R/S Battle Tower.', icon: '/images/ribbons/winning-ribbon.png' },
  },
  {
    id: 'open-doubles',
    label: 'Open Doubles',
    defaultLevel: 60,
    format: 'doubles',
    teams: [{ name: "Venty's Explosive doubles team", url: 'https://pokepast.es/773249e264806f40', description: 'Recommended team:', pokemon: ['Latios (Doubles)', 'Metagross (Doubles)', 'Snorlax (Doubles)', 'Gengar (Doubles)'] }],
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

  const number = trainer.number ?? 0
  if (number <= 100) return 3
  if (number <= 120) return 6
  if (number <= 140) return 9
  if (number <= 160) return 12
  if (number <= 180) return 15
  if (number <= 200) return 18
  if (number <= 220) return 21
  return 31
}

function getTrainersForBattle(battleNum: number): Trainer[] {
  return (battleTrainers as Trainer[]).filter(trainer =>
    trainer.battleRanges?.some(range => battleRangeMatches(battleNum, range))
  )
}

export const emeraldConfig = createGen3GameConfig({
  title: 'Emerald - Battle Frontier Tower',
  modes: EMERALD_MODES,
  teamData: teamData as Gen3Setdex,
  getTrainersForBattle,
  getIVsForTrainer,
  getBattleRange,
  setdexForMode: () => SETDEX_EM,
  trainerPokemonForMode: () => trainerPokemon as Record<string, string[]>,
})
