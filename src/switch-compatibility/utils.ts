import type { PokemonDatabase, PokemonData, SwitchGame, SwitchGameInfo } from './types';

export const SWITCH_GAMES: SwitchGameInfo[] = [
  { id: 'lgp', name: "Let's Go Pikachu / Eevee" },
  { id: 'lge', name: "Let's Go Pikachu / Eevee" },
  { id: 'sw', name: 'Sword / Shield' },
  { id: 'sh', name: 'Sword / Shield' },
  { id: 'bd', name: 'Brilliant Diamond / Shining Pearl' },
  { id: 'sp', name: 'Brilliant Diamond / Shining Pearl' },
  { id: 'pla', name: 'Legends: Arceus' },
  { id: 'scar', name: 'Scarlet / Violet' },
  { id: 'vio', name: 'Scarlet / Violet' },
];

// Unique game groups for user selection
export const GAME_GROUPS = [
  { ids: ['lgp', 'lge'], name: "Let's Go Pikachu / Eevee" },
  { ids: ['sw', 'sh'], name: 'Sword / Shield' },
  { ids: ['bd', 'sp'], name: 'Brilliant Diamond / Shining Pearl' },
  { ids: ['pla'], name: 'Legends: Arceus' },
  { ids: ['scar', 'vio'], name: 'Scarlet / Violet' },
];

/**
 * Get the display name for a Pokemon (handling both regular and form variants)
 */
export function getPokemonDisplayName(key: string, data: PokemonData): string {
  const baseName = data.names?.en || '';

  // Check for forms.en (e.g., "Alola Cap", "Hoenn Cap")
  const formsEnName = data.forms?.en || '';
  if (formsEnName) {
    return `${baseName} (${formsEnName})`;
  }

  // Check for form-source (e.g., "alola", "galar", "hisui")
  const formSource = data['form-source'];
  if (formSource) {
    // Capitalize first letter
    const capitalizedForm = formSource.charAt(0).toUpperCase() + formSource.slice(1);
    return `${baseName} (${capitalizedForm})`;
  }

  return baseName;
}

/**
 * Filter Pokemon that are available in ALL selected game IDs
 */
export function filterPokemonByGames(
  pokemonDb: PokemonDatabase,
  selectedGameIds: string[]
): Array<{ key: string; name: string; data: PokemonData }> {
  if (!pokemonDb || typeof pokemonDb !== 'object') {
    console.error('Invalid pokemonDb provided to filterPokemonByGames');
    return [];
  }

  if (selectedGameIds.length === 0) {
    return [];
  }

  const results: Array<{ key: string; name: string; data: PokemonData }> = [];

  try {
    for (const [key, data] of Object.entries(pokemonDb)) {
      if (!data || !Array.isArray(data.games)) {
        console.warn(`Pokemon ${key} has invalid games data`);
        continue;
      }

      // Check if this Pokemon is available in ALL selected games
      const availableInAll = selectedGameIds.every(gameId =>
        data.games.includes(gameId)
      );

      if (availableInAll) {
        // Get the display name (handles data-source for forms)
        let displayName = '';
        if (data['data-source']) {
          // This is a form variant, get base name
          const baseData = pokemonDb[data['data-source']];
          displayName = getPokemonDisplayName(key, {
            ...data,
            names: baseData?.names,
          });
        } else {
          displayName = getPokemonDisplayName(key, data);
        }

        results.push({ key, name: displayName, data });
      }
    }

    // Sort by national dex number (if available), then by form order
    results.sort((a, b) => {
      // Get natdex - if form, look up base Pokemon's natdex
      let aNatdex = a.data.natdex;
      if (!aNatdex && a.data['data-source']) {
        aNatdex = pokemonDb[a.data['data-source']]?.natdex;
      }
      aNatdex = aNatdex || 9999;

      let bNatdex = b.data.natdex;
      if (!bNatdex && b.data['data-source']) {
        bNatdex = pokemonDb[b.data['data-source']]?.natdex;
      }
      bNatdex = bNatdex || 9999;

      // Sort by natdex first
      if (aNatdex !== bNatdex) {
        return aNatdex - bNatdex;
      }

      // Same natdex - base form comes first, then forms by sort field
      const aIsBase = !a.data['data-source'];
      const bIsBase = !b.data['data-source'];

      if (aIsBase && !bIsBase) return -1;  // Base before forms
      if (!aIsBase && bIsBase) return 1;   // Forms after base

      // Both are forms - sort by sort field, then by key
      if (a.data.sort !== undefined && b.data.sort !== undefined) {
        return a.data.sort - b.data.sort;
      }

      return a.key.localeCompare(b.key);
    });

    // Post-process: Remove form names if only one form of a species exists in results
    // BUT only if that one form is the base form (not a regional variant)
    const speciesCounts = new Map<number, number>();

    // Count how many entries exist for each natdex
    for (const result of results) {
      let natdex = result.data.natdex;
      if (!natdex && result.data['data-source']) {
        natdex = pokemonDb[result.data['data-source']]?.natdex;
      }
      if (natdex) {
        speciesCounts.set(natdex, (speciesCounts.get(natdex) || 0) + 1);
      }
    }

    // Update display names - remove form suffix if only one form AND it's the base form
    for (const result of results) {
      let natdex = result.data.natdex;
      if (!natdex && result.data['data-source']) {
        natdex = pokemonDb[result.data['data-source']]?.natdex;
      }

      if (natdex && speciesCounts.get(natdex) === 1) {
        // Only one form exists in results
        // Only remove form name if this IS the base form (no data-source)
        // Keep form name if this is a regional variant (has data-source)
        if (!result.data['data-source']) {
          // This is the base form - use base name without form suffix
          result.name = result.data.names?.en || result.name;
        }
        // If it has data-source, keep the form name (e.g., "Typhlosion (Hisui)")
      }
    }
  } catch (error) {
    console.error('Error filtering Pokemon by games:', error);
    return [];
  }

  return results;
}

/**
 * Get which Switch games a specific Pokemon is available in
 */
export function getGamesForPokemon(
  pokemonDb: PokemonDatabase,
  pokemonKey: string
): string[] {
  if (!pokemonDb || !pokemonKey) {
    return [];
  }

  const data = pokemonDb[pokemonKey];
  if (!data || !Array.isArray(data.games)) {
    return [];
  }

  try {
    // Filter to only Switch games
    const switchGameIds = SWITCH_GAMES.map(g => g.id);
    return data.games.filter(game => switchGameIds.includes(game as SwitchGame));
  } catch (error) {
    console.error(`Error getting games for Pokemon ${pokemonKey}:`, error);
    return [];
  }
}

/**
 * Get unique game group names from game IDs
 */
export function getGameGroupNames(gameIds: string[]): string[] {
  const groupNames = new Set<string>();

  for (const gameId of gameIds) {
    const group = GAME_GROUPS.find(g => g.ids.includes(gameId));
    if (group) {
      groupNames.add(group.name);
    }
  }

  return Array.from(groupNames).sort();
}

/**
 * Search Pokemon by name (for autocomplete)
 */
export function searchPokemonByName(
  pokemonDb: PokemonDatabase,
  searchTerm: string
): Array<{ key: string; name: string }> {
  if (!pokemonDb || !searchTerm) {
    return [];
  }

  try {
    const lowerSearch = searchTerm.toLowerCase();
    const results: Array<{ key: string; name: string }> = [];

    for (const [key, data] of Object.entries(pokemonDb)) {
      if (!data) continue;

      let displayName = '';
      if (data['data-source']) {
        const baseData = pokemonDb[data['data-source']];
        displayName = getPokemonDisplayName(key, {
          ...data,
          names: baseData?.names,
        });
      } else {
        displayName = getPokemonDisplayName(key, data);
      }

      if (displayName && displayName.toLowerCase().includes(lowerSearch)) {
        results.push({ key, name: displayName });
      }
    }

    // Sort by natdex, then base form before variants
    results.sort((a, b) => {
      const aData = pokemonDb[a.key];
      const bData = pokemonDb[b.key];

      // Get natdex - if form, look up base Pokemon's natdex
      let aNatdex = aData?.natdex;
      if (!aNatdex && aData?.['data-source']) {
        aNatdex = pokemonDb[aData['data-source']]?.natdex;
      }
      aNatdex = aNatdex || 9999;

      let bNatdex = bData?.natdex;
      if (!bNatdex && bData?.['data-source']) {
        bNatdex = pokemonDb[bData['data-source']]?.natdex;
      }
      bNatdex = bNatdex || 9999;

      // Sort by natdex first
      if (aNatdex !== bNatdex) {
        return aNatdex - bNatdex;
      }

      // Same natdex - base form comes first, then forms by sort field
      const aIsBase = !aData?.['data-source'];
      const bIsBase = !bData?.['data-source'];

      if (aIsBase && !bIsBase) return -1;  // Base before forms
      if (!aIsBase && bIsBase) return 1;   // Forms after base

      // Both are forms - sort by sort field, then by key
      if (aData?.sort !== undefined && bData?.sort !== undefined) {
        return aData.sort - bData.sort;
      }

      return a.key.localeCompare(b.key);
    });

    return results;
  } catch (error) {
    console.error('Error searching Pokemon by name:', error);
    return [];
  }
}
