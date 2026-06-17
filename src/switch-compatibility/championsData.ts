import championsJson from '../data/pokemon_champions.json';

export const REGULATION_MA_POKEMON = new Set(championsJson['regulation-m-a']);
export const REGULATION_MB_POKEMON = new Set(championsJson['regulation-m-b']);

export function isChampionsPokemon(key: string): boolean {
  return REGULATION_MA_POKEMON.has(key) || REGULATION_MB_POKEMON.has(key);
}
