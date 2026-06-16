import movesData from '../data/battle-facilities/swsh/moves_swsh.json'
import pokedexData from '../data/battle-facilities/swsh/pokedex_swsh.json'
import setdexData from '../data/battle-facilities/swsh/setdex_swsh.json'
import {
  createModernBattleCalc,
  computeModernSpeed,
  type ModernMoveDex,
  type ModernPokedex,
  type ModernSetdex,
  type SetdexEntry,
} from './modernBattleCalc'

export type { SetdexEntry, ModernMoveDex, ModernPokedex, ModernSetdex }
export { computeModernSpeed as computeSwShSpeed }

export const MOVES_SWSH = movesData as unknown as ModernMoveDex
export const POKEDEX_SWSH = pokedexData as ModernPokedex
export const SETDEX_SWSH = setdexData as ModernSetdex

const swshCalc = createModernBattleCalc({
  moves: MOVES_SWSH,
  pokedex: POKEDEX_SWSH,
  setdex: SETDEX_SWSH,
})

export const buildPokemonSwSh = swshCalc.buildPokemon
export const makeFieldSideSwSh = swshCalc.makeFieldSide
export const calculateAllMovesSwSh = swshCalc.calculateAllMoves
export const findSetByLabelSwSh = swshCalc.findSetByLabel
export const resolveSpeciesNameSwSh = swshCalc.resolveSpeciesName
