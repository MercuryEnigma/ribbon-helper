import pokemonData from '../data/pokemon.json';
import ribbonData from '../data/ribbons.json';
import type { PokemonDatabase } from '../switch-compatibility/types';

const database = pokemonData as PokemonDatabase;
export const POKEMON_OPTIONS = Object.entries(database).map(([key, data]) => {
  const base = data['data-source'] ? database[data['data-source']] : data;
  return {
    key,
    name: `${data.names?.en ?? base?.names?.en ?? key}${data.forms?.en ? ` (${data.forms.en})` : ''}`,
    dex: data.natdex ?? base?.natdex ?? 0,
  };
}).sort((a, b) => a.dex - b.dex || a.name.localeCompare(b.name));

export const RIBBON_OPTIONS = Object.entries(ribbonData).map(([key, value]) => ({
  key, name: value.names.en,
})).sort((a, b) => a.name.localeCompare(b.name) || a.key.localeCompare(b.key));

export const pokemonName = (key: string) => POKEMON_OPTIONS.find(option => option.key === key)?.name ?? key;
export const ribbonName = (key: string) => RIBBON_OPTIONS.find(option => option.key === key)?.name ?? key;
