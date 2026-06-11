import type {
  PokemonData,
  PokemonDatabase,
} from '../switch-compatibility/types';
import { normalizeOcrText } from './originParser';

const POKEMON_TYPES = [
  'Normal',
  'Fire',
  'Water',
  'Electric',
  'Grass',
  'Ice',
  'Fighting',
  'Poison',
  'Ground',
  'Flying',
  'Psychic',
  'Bug',
  'Rock',
  'Ghost',
  'Dragon',
  'Dark',
  'Steel',
  'Fairy',
] as const;

export interface PokemonIdentityCandidate {
  pokemonKey: string;
  baseKey: string;
  displayName: string;
  dexNumber: number;
  score: number;
}

export interface PokemonIdentityMatch {
  dexNumber: number | null;
  recognizedName: string | null;
  displayedTypes: string[];
  recognizedLevel: number | null;
  candidates: PokemonIdentityCandidate[];
}

function effectiveData(
  key: string,
  data: PokemonData,
  pokemonDb: PokemonDatabase,
): PokemonData {
  const source = data['data-source'] ? pokemonDb[data['data-source']] : undefined;
  return source ? { ...source, ...data } : data;
}

function editDistance(first: string, second: string): number {
  const previous = Array.from({ length: second.length + 1 }, (_, index) => index);

  for (let firstIndex = 1; firstIndex <= first.length; firstIndex++) {
    let diagonal = previous[0];
    previous[0] = firstIndex;

    for (let secondIndex = 1; secondIndex <= second.length; secondIndex++) {
      const above = previous[secondIndex];
      previous[secondIndex] = Math.min(
        previous[secondIndex] + 1,
        previous[secondIndex - 1] + 1,
        diagonal + (first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }

  return previous[second.length];
}

function extractDexNumber(text: string): number | null {
  const match = text.match(/\bno\s*[.:]?\s*0*(\d{1,4})\b/i);
  if (!match) return null;
  const dexNumber = Number(match[1]);
  return dexNumber >= 1 && dexNumber <= 2000 ? dexNumber : null;
}

function extractLevel(text: string): number | null {
  const match = text.match(/\blv\.?\s*(\d{1,3})\b/i);
  if (!match) return null;
  const level = Number(match[1]);
  return level >= 1 && level <= 100 ? level : null;
}

function extractDisplayedTypes(text: string): string[] {
  const normalized = normalizeOcrText(text);
  return POKEMON_TYPES.filter(type => (
    new RegExp(`\\b${type.toLowerCase()}\\b`).test(normalized)
  ));
}

function displayName(
  data: PokemonData,
  source: PokemonData | undefined,
): string {
  const name = data.names?.en ?? source?.names?.en ?? 'Unknown';
  return data.forms?.en ? `${name} (${data.forms.en})` : name;
}

export function matchPokemonIdentity(
  text: string,
  pokemonDb: PokemonDatabase,
): PokemonIdentityMatch {
  const normalized = normalizeOcrText(text);
  const dexNumber = extractDexNumber(text);
  const displayedTypes = extractDisplayedTypes(text);
  const recognizedLevel = extractLevel(text);
  const candidates: PokemonIdentityCandidate[] = [];

  for (const [pokemonKey, data] of Object.entries(pokemonDb)) {
    const effective = effectiveData(pokemonKey, data, pokemonDb);
    const name = effective.names?.en;
    const candidateDex = effective.natdex;
    if (!name || !candidateDex) continue;
    if (dexNumber !== null && candidateDex !== dexNumber) continue;

    const normalizedName = normalizeOcrText(name);
    const exactName = normalized.includes(normalizedName);
    const words = normalized.split(' ');
    const closestDistance = Math.min(
      ...words.map(word => editDistance(word, normalizedName)),
    );
    const similarity = Math.max(
      0,
      1 - closestDistance / Math.max(1, normalizedName.length),
    );
    const nameScore = exactName ? 1 : similarity;
    const dexScore = dexNumber === candidateDex ? 1 : 0;
    const score = dexScore * 0.7 + nameScore * 0.3;

    if (dexNumber === null && nameScore < 0.7) continue;

    candidates.push({
      pokemonKey,
      baseKey: data['data-source'] ?? pokemonKey,
      displayName: displayName(data, pokemonDb[data['data-source'] ?? '']),
      dexNumber: candidateDex,
      score,
    });
  }

  candidates.sort((a, b) => (
    b.score - a.score
    || Number(a.pokemonKey !== a.baseKey) - Number(b.pokemonKey !== b.baseKey)
    || a.displayName.localeCompare(b.displayName)
  ));

  const baseName = candidates[0]
    ? pokemonDb[candidates[0].baseKey]?.names?.en ?? null
    : null;

  return {
    dexNumber,
    recognizedName: baseName,
    displayedTypes,
    recognizedLevel,
    candidates,
  };
}

export function getFormOptions(
  baseKey: string,
  pokemonDb: PokemonDatabase,
): PokemonIdentityCandidate[] {
  const baseData = pokemonDb[baseKey];
  if (!baseData) return [];

  const options: PokemonIdentityCandidate[] = [];
  for (const [pokemonKey, data] of Object.entries(pokemonDb)) {
    if (pokemonKey !== baseKey && data['data-source'] !== baseKey) continue;
    const effective = effectiveData(pokemonKey, data, pokemonDb);
    if (!effective.natdex) continue;

    options.push({
      pokemonKey,
      baseKey,
      displayName: displayName(data, baseData),
      dexNumber: effective.natdex,
      score: pokemonKey === baseKey ? 1 : 0,
    });
  }

  return options.sort((a, b) => (
    Number(a.pokemonKey !== baseKey) - Number(b.pokemonKey !== baseKey)
    || (pokemonDb[a.pokemonKey]?.sort ?? 9999)
      - (pokemonDb[b.pokemonKey]?.sort ?? 9999)
    || a.displayName.localeCompare(b.displayName)
  ));
}
