import { createGen4GameConfig } from './gen4BattleConfig'
import { GEN4_NATURES, type Gen4MoveDex, type Gen4Setdex } from './gen4calc'
import { PTHGSS_MODES, PTHGSS_TEAM_DATA } from './gen4Battles'
import { battleRangeMatches } from './battleUtils'
import type { FacilityMode, Trainer } from './battleCalculator'
import dpBattleTrainers from '../data/battle-facilities/dp/battle_trainers_dp.json'
import dpMoves from '../data/battle-facilities/dp/moves_dp.json'
import dpSetdex from '../data/battle-facilities/dp/setdex_dp.json'
import dpPartnerTeamData from '../data/battle-facilities/dp/setteam_dp_partners.json'
import dpTrainerPokemon from '../data/battle-facilities/dp/trainer_pokemon_dp.json'

const DP_PARTNER_TEAM_DATA = dpPartnerTeamData as Gen4Setdex
const DP_MIRA_LABELS = Object.values(DP_PARTNER_TEAM_DATA).flatMap(sets => Object.keys(sets))

const DP_TEAM_DATA: Gen4Setdex = {}
for (const source of [PTHGSS_TEAM_DATA, DP_PARTNER_TEAM_DATA]) {
  for (const [species, sets] of Object.entries(source)) {
    DP_TEAM_DATA[species] = { ...DP_TEAM_DATA[species], ...sets }
  }
}

export const DP_MODES: FacilityMode[] = PTHGSS_MODES.map(mode => ({
  ...mode,
  teams: mode.teams.map(team =>
    mode.id === 'multi-npc' && team.name === "Mira's Team"
      ? { ...team, pokemon: DP_MIRA_LABELS }
      : { ...team, pokemon: [...team.pokemon] },
  ),
  ribbon: { ...mode.ribbon },
}))

const DP_TRAINERS = dpBattleTrainers as Trainer[]
const DP_TRAINER_POKEMON = dpTrainerPokemon as Record<string, string[]>

function dpGetBattleRange(battleNum: number): string {
  if (battleNum >= 50) return '50+'
  if (battleNum === 49) return '49'
  if (battleNum >= 43) return '43-48'
  if (battleNum === 42) return '42'
  if (battleNum >= 36) return '36-41'
  if (battleNum === 35) return '35'
  if (battleNum >= 29) return '29-34'
  if (battleNum === 28) return '28'
  if (battleNum >= 22) return '22-27'
  if (battleNum === 21) return '21'
  if (battleNum >= 15) return '15-20'
  if (battleNum === 14) return '14'
  if (battleNum >= 8) return '8-13'
  if (battleNum === 7) return '7'
  return '1-6'
}

function dpGetTrainersForBattle(battleNum: number, modeId?: string): Trainer[] {
  const matches = DP_TRAINERS.filter(trainer =>
    trainer.battleRanges?.some(range => battleRangeMatches(battleNum, range)) &&
    (!trainer.boss || trainer.boss === modeId)
  )
  const bosses = matches.filter(trainer => trainer.boss)
  return bosses.length > 0 ? bosses : matches
}

function dpGetIVsForTrainer(trainer: Trainer | null): number {
  return trainer?.ivs ?? 3
}

export const dpConfig = createGen4GameConfig({
  title: 'Diamond / Pearl - Battle Tower',
  modes: DP_MODES,
  teamData: DP_TEAM_DATA,
  setdex: dpSetdex as Gen4Setdex,
  trainerPokemon: DP_TRAINER_POKEMON,
  moveData: dpMoves as Gen4MoveDex,
  opponentNatureOptions: GEN4_NATURES,
  getTrainersForBattle: dpGetTrainersForBattle,
  getIVsForTrainer: dpGetIVsForTrainer,
  getBattleRange: dpGetBattleRange,
})
