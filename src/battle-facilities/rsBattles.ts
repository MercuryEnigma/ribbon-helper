import type { FacilityMode, Trainer } from './battleCalculator'
import { createGen3GameConfig } from './gen3BattleConfig'
import { GEN3_NATURES, type Gen3MoveDex, type Gen3Setdex } from './gen3calc'
import { battleRangeMatches } from './battleUtils'
import teamData from '../data/battle-facilities/rs/setteam_rs.json'
import battleTrainers from '../data/battle-facilities/rs/battle_trainers_rs.json'
import moves from '../data/battle-facilities/rs/moves_rs.json'
import setdexLvl50 from '../data/battle-facilities/rs/setdex_lvl50_rs.json'
import setdexLvl100 from '../data/battle-facilities/rs/setdex_lvl100_rs.json'
import trainerPokemonLvl50 from '../data/battle-facilities/rs/trainer_pokemon_lvl50_rs.json'
import trainerPokemonLvl100 from '../data/battle-facilities/rs/trainer_pokemon_lvl100_rs.json'

const RS_MODES: FacilityMode[] = [
  {
    id: 'lvl50',
    label: 'Lvl 50',
    defaultLevel: 50,
    maxLevel: 50,
    format: 'singles',
    teams: [
      { name: "Psychic J's Salamence / Registeel / Latios", url: 'https://pokepast.es/8569c37ec0f62507', description: 'Recommended team:', pokemon: ['Salamence (Psychic J RS Singles)', 'Registeel (Psychic J RS Singles)', 'Latios (Psychic J RS Singles)'] },
      { name: "Venty's Latios / Metagross / Suicune", url: 'https://pokepast.es/9f353ea337d86f51', description: 'Emerald team:', pokemon: ['Latios (RS Singles)', 'Metagross (RS Singles)', 'Suicune (RS Singles)'] },
    ],
    ribbon: { name: 'Winning Ribbon', description: 'Win a full 7-set from battle 50-56 onwards. The Battle Tower awards the Winning Ribbon.', icon: '/images/ribbons/winning-ribbon.png' },
  },
  {
    id: 'lvl100',
    label: 'Lvl 100',
    defaultLevel: 100,
    maxLevel: 100,
    format: 'singles',
    teams: [
      { name: "Psychic J's Salamence / Registeel / Latios", url: 'https://pokepast.es/8569c37ec0f62507', description: 'Recommended team:', pokemon: ['Salamence (Psychic J RS Singles)', 'Registeel (Psychic J RS Singles)', 'Latios (Psychic J RS Singles)'] },
      { name: "Venty's Latios / Metagross / Suicune", url: 'https://pokepast.es/9f353ea337d86f51', description: 'Emerald team:', pokemon: ['Latios (RS Singles)', 'Metagross (RS Singles)', 'Suicune (RS Singles)'] },
    ],
    ribbon: { name: 'Victory Ribbon', description: 'Win a full 7-set from battle 50-56 onwards. The Battle Tower awards the Victory Ribbon.', icon: '/images/ribbons/victory-ribbon.png' },
  },
]

const SETDEX_BY_MODE: Record<string, Gen3Setdex> = {
  lvl50: setdexLvl50 as Gen3Setdex,
  lvl100: setdexLvl100 as Gen3Setdex,
}

const TRAINER_POKEMON_BY_MODE: Record<string, Record<string, string[]>> = {
  lvl50: trainerPokemonLvl50 as Record<string, string[]>,
  lvl100: trainerPokemonLvl100 as Record<string, string[]>,
}

function getBattleRange(battleNum: number): string {
  if (battleNum >= 49) return '49+'
  const groupStart = Math.floor((battleNum - 1) / 7) * 7 + 1
  if (battleNum === groupStart + 6) return String(battleNum)
  return `${groupStart}-${groupStart + 5}`
}

function getTrainersForBattle(battleNum: number): Trainer[] {
  return (battleTrainers as Trainer[]).filter(trainer =>
    trainer.battleRanges?.some(range => battleRangeMatches(battleNum, range))
  )
}

function getIVsForTrainer(trainer: Trainer | null): number {
  return trainer?.ivs ?? 6
}

export const rsConfig = createGen3GameConfig({
  title: 'Ruby/Sapphire - Battle Tower',
  modes: RS_MODES,
  teamData: teamData as Gen3Setdex,
  moveData: moves as Gen3MoveDex,
  opponentNatureOptions: GEN3_NATURES,
  getTrainersForBattle,
  getIVsForTrainer,
  getBattleRange,
  setdexForMode: modeId => SETDEX_BY_MODE[modeId] ?? SETDEX_BY_MODE.lvl50,
  trainerPokemonForMode: modeId => TRAINER_POKEMON_BY_MODE[modeId] ?? TRAINER_POKEMON_BY_MODE.lvl50,
})
