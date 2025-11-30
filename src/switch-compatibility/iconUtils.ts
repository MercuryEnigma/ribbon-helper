import type { PokemonData, PokemonDatabase } from './types';
import formIconMapping from '../data/form_icons.json';

const ICON_BASE_URL = 'https://raw.githubusercontent.com/nileplumb/PkmnShuffleMap/master/UICONS/pokemon';

// Type the imported JSON
const FORM_ICONS: Record<string, string> = formIconMapping;

/**
 * Get the icon URL for a Pokemon
 *
 * For base forms: uses natdex number (e.g., "37.png" for Vulpix)
 * For alternate forms: uses form_icons.json mapping when available,
 * otherwise falls back to heuristic guessing based on form-source
 *
 * Form mapping is loaded from form_icons.json which was generated from
 * the PkmnShuffleMap icon_index.html file.
 */
export function getPokemonIconUrl(
  key: string,
  data: PokemonData,
  pokemonDb: PokemonDatabase
): string {
  // Get natdex - from this Pokemon or base Pokemon
  let natdex: number | undefined = data.natdex;

  if (!natdex && data['data-source']) {
    natdex = pokemonDb[data['data-source']]?.natdex;
  }

  if (!natdex) {
    // Fallback to a default icon
    return `${ICON_BASE_URL}/0.png`;
  }

  // Use natdex as-is (no padding) - files are named like "10.png", not "010.png"
  const natdexStr = String(natdex);

  // Special case: Unown base should use the "A" form icon
  if (key === 'unown' && FORM_ICONS['unown']) {
    return `${ICON_BASE_URL}/${FORM_ICONS['unown']}`;
  }

  // Special case: Gimmighoul base should use the "chest" form icon
  if (key === 'gimmighoul' && FORM_ICONS['gimmighoul-chest']) {
    return `${ICON_BASE_URL}/${FORM_ICONS['gimmighoul-chest']}`;
  }

  // If this is a base form (no data-source), use base icon
  if (!data['data-source']) {
    return `${ICON_BASE_URL}/${natdexStr}.png`;
  }

  // This is an alternate form - check if we have an explicit mapping
  if (FORM_ICONS[key]) {
    return `${ICON_BASE_URL}/${FORM_ICONS[key]}`;
  }

  // No explicit mapping found - try fallback heuristics
  const formSource = data['form-source'];

  if (formSource) {
    // Regional forms (heuristic - may not work for all)
    if (formSource === 'galar') {
      // Try common Galar form patterns
      return `${ICON_BASE_URL}/${natdexStr}_f2.png`;
    } else if (formSource === 'hisui') {
      // Try common Hisui form patterns
      return `${ICON_BASE_URL}/${natdexStr}_f3.png`;
    } else if (formSource === 'paldea') {
      // Try common Paldea form patterns
      return `${ICON_BASE_URL}/${natdexStr}_f4.png`;
    }
  }

  // For special forms, try using sort field
  if (data.sort !== undefined && data.sort > 0) {
    return `${ICON_BASE_URL}/${natdexStr}_f${data.sort}.png`;
  }

  // Fallback to base form icon
  return `${ICON_BASE_URL}/${natdexStr}.png`;
}

/**
 * Get icon URL with error fallback
 * Returns an object with url and onError handler
 */
export function getPokemonIconProps(
  key: string,
  data: PokemonData,
  pokemonDb: PokemonDatabase
): { src: string; onError: (e: React.SyntheticEvent<HTMLImageElement>) => void } {
  const iconUrl = getPokemonIconUrl(key, data, pokemonDb);

  // Get base natdex for fallback
  let natdex: number | undefined = data.natdex;
  if (!natdex && data['data-source']) {
    natdex = pokemonDb[data['data-source']]?.natdex;
  }
  const natdexStr = natdex ? String(natdex) : '0';
  const fallbackUrl = `${ICON_BASE_URL}/${natdexStr}.png`;

  return {
    src: iconUrl,
    onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
      // If icon fails to load, fallback to base form icon
      const img = e.currentTarget;
      if (img.src !== fallbackUrl) {
        img.src = fallbackUrl;
      } else {
        // If even base form fails, use a default
        img.src = `${ICON_BASE_URL}/0.png`;
      }
    }
  };
}
