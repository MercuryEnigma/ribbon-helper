/**
 * Utility functions for processing Pokémon move data from pokemon_moves_rse.json
 */

/** Learn method categories */
export type LearnMethod = 'level-up' | 'machine' | 'tutor' | 'egg' | 'purify' | 'other';

/** Map of moves with their learn method values (e.g., level number, TM number, etc.) */
export type MovesMap = Record<string, string>;

/** Map of learn methods to their moves */
export type AvailableMovesByMethod = Partial<Record<LearnMethod, MovesMap>>;

/**
 * Priority order for learn methods when a move can be learned multiple ways.
 * Higher number = higher priority.
 */
const LEARN_METHOD_PRIORITY: Record<LearnMethod, number> = {
  'tutor': 1,
  'machine': 2,
  'level-up': 3,
  'egg': 4,
  'other': 5,
  'purify': 6,
};

/**
 * Maps a method key (e.g., "level-up-coefrlgrsxd") to its category (e.g., "level-up")
 */
function categorizeMethodKey(methodKey: string): LearnMethod | null {
  if (methodKey.startsWith('level-up-')) return 'level-up';
  if (methodKey.startsWith('machine-')) return 'machine';
  if (methodKey.startsWith('tutor-')) return 'tutor';
  if (methodKey.startsWith('egg-')) return 'egg';
  if (methodKey.startsWith('purification')) return 'purify';
  if (methodKey.startsWith('light-ball-egg-')) return 'other';
  return null;
}

/**
 * Extracts all available moves for a Pokémon, organized by learn method.
 * Flattens version-specific data (e.g., "machine-coefrlgrsxd") into general categories.
 *
 * @param pokemonKey The Pokémon identifier (e.g., "vulpix-alola")
 * @param pokemonMoves The pokemon_moves_rse.json data
 * @returns Map of learn methods to their moves with values
 *
 * @example
 * // Returns: {
 * //   "level-up": { "slam": "15", "tail-whip": "6" },
 * //   "machine": { "surf": "hm-03" }
 * // }
 * getAvailableMovesForPokemon("vulpix-alola", pokemonMovesRse)
 */
export function getAvailableMovesForPokemon(
  pokemonKey: string,
  pokemonMoves: Record<string, any>
): AvailableMovesByMethod {
  const pokemonData = pokemonMoves[pokemonKey];
  if (!pokemonData) return {};

  const result: AvailableMovesByMethod = {};

  // Process each version-specific method entry
  for (const [methodKey, entry] of Object.entries<any>(pokemonData)) {
    const category = categorizeMethodKey(methodKey);
    if (!category) continue;

    const moves = entry?.moves;
    if (!moves || typeof moves !== 'object') continue;

    // Initialize category if needed
    if (!result[category]) {
      result[category] = {};
    }

    // Merge moves into the category, preferring existing values to avoid overwriting
    // (earlier version entries take precedence)
    for (const [moveName, value] of Object.entries<string>(moves)) {
      if (!result[category]![moveName]) {
        result[category]![moveName] = value;
      }
    }
  }

  return result;
}

/**
 * Filters available moves based on which learn methods are enabled.
 * When a move appears in multiple methods, prioritizes based on LEARN_METHOD_PRIORITY.
 *
 * @param availableMoves Map of learn methods to their moves
 * @param enabledMethods Map of learn methods to whether they're enabled
 * @returns Flat map of move names to their values from the highest priority enabled method
 *
 * @example
 * // If machine = false:
 * // Returns: { "slam": "15", "tail-whip": "6" }
 * filterAvailableMoves(
 *   { "level-up": { "slam": "15" }, "machine": { "surf": "hm-03" } },
 *   { "level-up": true, "machine": false, ... }
 * )
 *
 * @example
 * // If all enabled and "tackle" appears in both level-up ("5") and egg ("egg"):
 * // Returns: { ..., "tackle": "egg" } (egg has higher priority)
 * filterAvailableMoves(
 *   { "level-up": { "tackle": "5" }, "egg": { "tackle": "egg" } },
 *   { "level-up": true, "egg": true, ... }
 * )
 */
export function filterAvailableMoves(
  availableMoves: AvailableMovesByMethod,
  enabledMethods: Record<LearnMethod, boolean>
): MovesMap {
  const result: MovesMap = {};

  // Track which methods each move appears in with their values
  const movesByPriority: Record<string, Array<{ method: LearnMethod; value: string }>> = {};

  // Collect all moves from enabled methods
  for (const method of Object.keys(availableMoves) as LearnMethod[]) {
    if (!enabledMethods[method]) continue;

    const moves = availableMoves[method];
    if (!moves) continue;

    for (const [moveName, value] of Object.entries(moves)) {
      if (!movesByPriority[moveName]) {
        movesByPriority[moveName] = [];
      }
      movesByPriority[moveName].push({ method, value });
    }
  }

  // For each move, select the value from the highest priority method
  for (const [moveName, entries] of Object.entries(movesByPriority)) {
    // Sort by priority (higher priority first)
    entries.sort((a, b) => {
      const aPriority = LEARN_METHOD_PRIORITY[a.method];
      const bPriority = LEARN_METHOD_PRIORITY[b.method];
      return bPriority - aPriority;
    });

    result[moveName] = entries[0].value;
  }

  return result;
}
