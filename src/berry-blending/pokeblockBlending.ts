import berriesData from '../data/berries_rse.json';
import premadeCombosData from '../data/premade_combos_rse.json';

interface Berry {
  name: string;
  spicy: number;
  dry: number;
  sweet: number;
  bitter: number;
  sour: number;
  smoothness: number;
  mirage?: boolean;
  e_reader?: boolean;
  jpn_e_reader?: boolean;
}

const berries = berriesData as Record<string, Berry>;

export interface Pokeblock {
  description: string;
  berries: string[];
  spicy: number;
  dry: number;
  sweet: number;
  bitter: number;
  sour: number;
  feel: number;
  efficiency: number;
  rpm: number;
  players: number;
  npc: number;
  gamecube: boolean;
  mirage: boolean;
  "blend-master": boolean;
  finishing: boolean;
  "e-reader": boolean;
  "japanese-e-reader": boolean;
}

export interface BlendedPokeblock {
  berries: string;
  spicy: number;
  dry: number;
  sweet: number;
  bitter: number;
  sour: number;
  feel: number;
  efficiency: number;
  rpm: number;
}

export type FlavorStat = "spicy" | "dry" | "sweet" | "bitter" | "sour";

export interface Nature {
  likes?: FlavorStat;
  dislikes?: FlavorStat;
}

/**
 * Filter options for pokeblocks
 */
export interface PokeblockFilters {
  num_players?: number;
  pinch_berries?: boolean;
  mirage_island?: boolean;
  blend_master?: boolean;
  e_reader?: boolean;
  jpn_e_reader?: boolean;
}

/**
 * Represents current Pokemon stats for optimization
 */
export interface PokemonStats {
  spicy: number;
  dry: number;
  sweet: number;
  bitter: number;
  sour: number;
  feel: number;
}

/**
 * Assumed RPM values for different blending configurations
 */
const ASSUMED_RPM = {
  blend_master: 150.0,
  npc: 96.57,
  players: 89.91,
} as const;

const MAX_FEEL = 255;

const MAX_STAT = 255;

/**
 * Adjusts a pokeblock's quality based on nature preferences.
 *
 * @param pokeblock - The base pokeblock to adjust
 * @param nature - The Pokemon's nature (likes/dislikes flavors)
 * @returns A new adjusted pokeblock
 */
function adjustWithNature(
  pokeblock: Pokeblock,
  nature: Nature
): Pokeblock {
  // Create a copy of the pokeblock
  const adjusted = { ...pokeblock };


  // Step 1: Apply nature adjustment
  if (!nature.likes || !nature.dislikes)
    return adjusted

  const likedValue = adjusted[nature.likes];
  const dislikedValue = adjusted[nature.dislikes];

  if (likedValue > dislikedValue) {
    // Multiply the liked stat by 1.1
    adjusted[nature.likes] = Math.round(adjusted[nature.likes] * 1.1);
  } else if (dislikedValue > likedValue) {
    // Multiply the disliked stat by 0.9
    adjusted[nature.dislikes] = Math.round(adjusted[nature.dislikes] * 0.9);
  }

  // Step 2: Recalculate efficiency (sum of 5 flavors / feel)
  const totalFlavors =
    adjusted.spicy + adjusted.dry + adjusted.sweet + adjusted.bitter + adjusted.sour;
  adjusted.efficiency = adjusted.feel > 0 ? totalFlavors / adjusted.feel : 0;

  return adjusted;
}

/**
 * Scores a pokeblock by considering improvement and balance.
 * Uses a priority stat weight to favor blocks that help specific stats.
 * Penalizes blocks that give 0 to the current minimum stat.
 *
 * @param currentStats - Current Pokemon stats
 * @param pokeblock - Pokeblock to evaluate
 * @param priorityWeights - Optional weights for each stat (higher = prefer this stat)
 * @returns Score (higher = better)
 */
function scorePokeblockForState(
  currentStats: PokemonStats,
  pokeblock: Pokeblock,
  priorityWeights: number[] = [1, 1, 1, 1, 1]
): number {
  const currentFlavors = [currentStats.spicy, currentStats.dry, currentStats.sweet, currentStats.bitter, currentStats.sour];
  const pokeblockFlavors = [pokeblock.spicy, pokeblock.dry, pokeblock.sweet, pokeblock.bitter, pokeblock.sour];

  // Calculate new stats after adding this block (capped at MAX_STAT)
  const newFlavors = currentFlavors.map((curr, i) =>
    Math.min(curr + pokeblockFlavors[i], MAX_STAT)
  );

  // Find current minimum stat
  const currentMin = Math.min(...currentFlavors);
  const minIndices = currentFlavors.map((v, i) => v === currentMin ? i : -1).filter(i => i >= 0);

  // Check if this block gives 0 to any minimum stat
  const neglectsMin = minIndices.some(i => pokeblockFlavors[i] === 0);

  // How imbalanced are we?
  const currentMax = Math.max(...currentFlavors);
  const imbalance = currentMax - currentMin;

  // Weighted improvement based on priority weights
  let weightedImprovement = 0;
  for (let i = 0; i < 5; i++) {
    const improvement = newFlavors[i] - currentFlavors[i];
    // Also add dynamic weight based on how far behind this stat is
    const deficitWeight = (MAX_STAT - currentFlavors[i]) / MAX_STAT;
    weightedImprovement += improvement * priorityWeights[i] * (1 + deficitWeight * 0.5);
  }

  // Base efficiency
  let score = weightedImprovement / pokeblock.feel;

  // Penalty for neglecting the minimum stat (scales with imbalance)
  if (neglectsMin && imbalance > 15) {
    score *= 0.75;
  }

  return score;
}

/**
 * Helper: run greedy with a specific feel budget and priority weights
 */
function getOptimalPokeblocksWithBudget(
  availablePokeblocks: Pokeblock[],
  feelBudget: number,
  priorityWeights: number[] = [1, 1, 1, 1, 1]
): { pokeblocks: Pokeblock[]; finalStats: PokemonStats } {
  const selected: Pokeblock[] = [];
  const currentStats: PokemonStats = {
    spicy: 0, dry: 0, sweet: 0, bitter: 0, sour: 0, feel: 0,
  };

  while (true) {
    let bestPokeblock: Pokeblock | null = null;
    let bestScore = -Infinity;

    for (const pokeblock of availablePokeblocks) {
      if (currentStats.feel >= feelBudget) continue;

      const score = scorePokeblockForState(currentStats, pokeblock, priorityWeights);
      if (score > bestScore) {
        bestScore = score;
        bestPokeblock = pokeblock;
      }
    }

    if (!bestPokeblock || bestScore <= 0) break;

    selected.push(bestPokeblock);
    currentStats.spicy = Math.min(currentStats.spicy + bestPokeblock.spicy, MAX_STAT);
    currentStats.dry = Math.min(currentStats.dry + bestPokeblock.dry, MAX_STAT);
    currentStats.sweet = Math.min(currentStats.sweet + bestPokeblock.sweet, MAX_STAT);
    currentStats.bitter = Math.min(currentStats.bitter + bestPokeblock.bitter, MAX_STAT);
    currentStats.sour = Math.min(currentStats.sour + bestPokeblock.sour, MAX_STAT);
    currentStats.feel += bestPokeblock.feel;
  }

  currentStats.feel = Math.min(currentStats.feel, MAX_FEEL);

  return { pokeblocks: selected, finalStats: currentStats };
}

/**
 * Calculates pokeblock stats from berries and RPM.
 *
 * @param berryNames - Array of 1-4 berry names
 * @param rpm - Revolutions per minute during blending
 * @returns Pokeblock stats (spicy, dry, sweet, bitter, sour, feel)
 */
export function calculatePokeblockFromBerries(
  berryNames: string[],
  rpm: number
): BlendedPokeblock {
  if (berryNames.length < 1 || berryNames.length > 4) {
    throw new Error('Impossible combination of berries');
  }

  // Step 1 & 2: Lookup berries and sum their flavors
  let spicy = 0;
  let dry = 0;
  let sweet = 0;
  let bitter = 0;
  let sour = 0;
  let feel = 0;

  for (const berryName of berryNames) {
    const berry = berries[berryName];
    if (!berry) {
      throw new Error(`Berry "${berryName}" not found in berries_rse.json`);
    }
    spicy += berry.spicy;
    dry += berry.dry;
    sweet += berry.sweet;
    bitter += berry.bitter;
    sour += berry.sour;
    feel += berry.smoothness;
  }

  // Step 3: Calculate feel - average smoothness minus number of berries
  feel = Math.floor(feel / berryNames.length) - berryNames.length;

  // Step 4: Count negative flavor values and subtract from all, floor at 0
  const negativeCount = [spicy, dry, sweet, bitter, sour].filter((v) => v < 0).length;

  const adjusted_spicy = Math.max(0, spicy - negativeCount);
  const adjusted_dry = Math.max(0, dry - negativeCount);
  const adjusted_sweet = Math.max(0, sweet - negativeCount);
  const adjusted_bitter = Math.max(0, bitter - negativeCount);
  const adjusted_sour = Math.max(0, sour - negativeCount);

  // Step 5: Apply RPM modifier (truncate to 2 decimal places)
  const rpm_modifier = Math.trunc(((rpm / 333.0) + 1.0) * 100) / 100;

  const final_spicy = Math.round(adjusted_spicy * rpm_modifier);
  const final_dry = Math.round(adjusted_dry * rpm_modifier);
  const final_sweet = Math.round(adjusted_sweet * rpm_modifier);
  const final_bitter = Math.round(adjusted_bitter * rpm_modifier);
  const final_sour = Math.round(adjusted_sour * rpm_modifier);
  const final_feel = feel;
  const final_efficiency = (final_spicy + final_dry + final_sweet + final_bitter + final_sour) / final_feel;

  // Calculate feel (smoothness - number of berries * 5, minimum 0)
    const blendedPokeblock: BlendedPokeblock = {
      berries: berryNames.join(', '),
      spicy: final_spicy,
      dry: final_dry,
      sweet: final_sweet,
      bitter: final_bitter,
      sour: final_sour,
      feel: final_feel,
      efficiency: final_efficiency,
      rpm: rpm
  };

  return blendedPokeblock;
}

/**
 * Calculates the final stats for a specific list of pokeblocks.
 * Useful for testing and verifying calculations against reference data.
 *
 * @param pokeblocks - Array of pokeblocks to calculate stats for
 * @param nature - The Pokemon's nature (affects stat adjustments)
 * @returns Final Pokemon stats after consuming all pokeblocks
 */
export function calculateFinalStats(
  pokeblocks: Pokeblock[],
  nature: Nature
): PokemonStats {
  // Adjust pokeblocks with nature
  const adjustedPokeblocks = pokeblocks.map((pokeblock) => {
    // Apply adjustments and return
    return adjustWithNature(pokeblock, nature);
  });

  // Sum up all stats
  const finalStats: PokemonStats = {
    spicy: 0,
    dry: 0,
    sweet: 0,
    bitter: 0,
    sour: 0,
    feel: 0,
  };

  for (const pokeblock of adjustedPokeblocks) {
    finalStats.spicy = Math.min(finalStats.spicy + pokeblock.spicy, MAX_STAT);
    finalStats.dry = Math.min(finalStats.dry + pokeblock.dry, MAX_STAT);
    finalStats.sweet = Math.min(finalStats.sweet + pokeblock.sweet, MAX_STAT);
    finalStats.bitter = Math.min(finalStats.bitter + pokeblock.bitter, MAX_STAT);
    finalStats.sour = Math.min(finalStats.sour + pokeblock.sour, MAX_STAT);
    finalStats.feel += pokeblock.feel;
  }

  return finalStats;
}

/**
 * Filters pokeblocks based on availability criteria.
 *
 * @param availablePokeblocks - Array of pokeblocks to filter
 * @param filters - Filter criteria (all optional)
 * @returns Filtered array of pokeblocks
 */
export function filterPokeblocks(
  availablePokeblocks: Pokeblock[],
  filters: PokeblockFilters
): Pokeblock[] {
  return availablePokeblocks.filter((pokeblock) => {
    // Filter by number of players: exclude if pokeblock requires more players
    if (filters.num_players !== undefined && pokeblock.players > filters.num_players) {
      return false;
    }

    // Filter by pinch berries (maps to gamecube field)
    if (filters.pinch_berries === false && pokeblock.gamecube === true) {
      return false;
    }

    // Filter by mirage island access
    if (filters.mirage_island === false && pokeblock.mirage === true) {
      return false;
    }

    // Filter by blend master access
    if (filters.blend_master === false && pokeblock["blend-master"] === true) {
      return false;
    }

    // Filter by e-reader access
    if (filters.e_reader === false && pokeblock["e-reader"] === true) {
      return false;
    }

    // Filter by Japanese e-reader access
    if (filters.jpn_e_reader === false && pokeblock["japanese-e-reader"] === true) {
      return false;
    }

    return true;
  });
}

/**
 * Calculates the optimal pokeblock selection for a Pokemon.
 * Combines adjustment (nature + RPM) and optimization steps.
 *
 * @param availablePokeblocks - Array of filtered pokeblocks to choose from
 * @param nature - The Pokemon's nature (affects stat adjustments)
 * @returns Object containing the ordered array of optimal pokeblocks and final Pokemon stats
 */
function calculateOptimalPokeblocksGreedy(
  availablePokeblocks: Pokeblock[],
  nature: Nature
): { pokeblocks: Pokeblock[]; finalStats: PokemonStats } {
  // Step 1: Adjust pokeblocks with nature
  const adjustedPokeblocks = availablePokeblocks.map(pb => {
    return adjustWithNature(pb, nature);
  });

  const nonFinishingPokeblocks = adjustedPokeblocks.filter(pb => !pb.finishing);
  const finishingPokeblocks = adjustedPokeblocks.filter(pb => pb.finishing);

  // Try different feel budgets and priority weight configurations
  let bestResult: { pokeblocks: Pokeblock[]; finalStats: PokemonStats } | null = null;
  let bestScore = -1;

  // Helper to calculate combined score (total stats + min stat bonus)
  const calcScore = (stats: PokemonStats): number => {
    const flavors = [stats.spicy, stats.dry, stats.sweet, stats.bitter, stats.sour];
    const total = flavors.reduce((a, b) => a + b, 0);
    const min = Math.min(...flavors);
    // Prioritize total stats, with stronger bonus for min stat
    return total + min * 0.8;
  };

  // Different priority weight configurations to try
  // Each emphasizes different stat combinations
  const weightConfigs = [
    [1, 1, 1, 1, 1],       // Balanced
    [1.2, 1, 1, 1, 1],     // Slightly favor spicy
    [1.5, 1, 1, 1, 1],     // Favor spicy
    [1, 1.2, 1, 1, 1],     // Slightly favor dry
    [1, 1.5, 1, 1, 1],     // Favor dry
    [1, 1, 1.2, 1, 1],     // Slightly favor sweet
    [1, 1, 1.5, 1, 1],     // Favor sweet
    [1, 1, 1, 1.2, 1],     // Slightly favor bitter
    [1, 1, 1, 1.5, 1],     // Favor bitter
    [1, 1, 1, 1, 1.2],     // Slightly favor sour
    [1, 1, 1, 1, 1.5],     // Favor sour
    [1.3, 1.3, 1, 1, 1],   // Favor spicy+dry
    [1, 1, 1.3, 1.3, 1],   // Favor sweet+bitter
    [1, 1, 1, 1.3, 1.3],   // Favor bitter+sour
    [1.3, 1, 1, 1, 1.3]    // Favor sour+spicy
  ];

  // Try budgets and weight configurations
  for (const weights of weightConfigs) {
    for (let budget = 180; budget <= MAX_FEEL; budget += 1) {
      // Get non-finishing blocks for this budget
      const result = getOptimalPokeblocksWithBudget(nonFinishingPokeblocks, budget, weights);

      // Try adding each finishing block (if room)
      if (result.finalStats.feel < MAX_FEEL) {
        for (const finisher of finishingPokeblocks) {
          const finalStats = {
            spicy: Math.min(result.finalStats.spicy + finisher.spicy, MAX_STAT),
            dry: Math.min(result.finalStats.dry + finisher.dry, MAX_STAT),
            sweet: Math.min(result.finalStats.sweet + finisher.sweet, MAX_STAT),
            bitter: Math.min(result.finalStats.bitter + finisher.bitter, MAX_STAT),
            sour: Math.min(result.finalStats.sour + finisher.sour, MAX_STAT),
            feel: Math.min(result.finalStats.feel + finisher.feel, MAX_FEEL),
          };
          const score = calcScore(finalStats);

          if (score > bestScore) {
            bestScore = score;
            bestResult = {
              pokeblocks: [...result.pokeblocks, finisher],
              finalStats,
            };
          }
        }
      }

      // Also consider without finisher
      const score = calcScore(result.finalStats);
      if (score > bestScore) {
        bestScore = score;
        bestResult = result;
      }
    }
  }

  return bestResult || { pokeblocks: [], finalStats: { spicy: 0, dry: 0, sweet: 0, bitter: 0, sour: 0, feel: 0 } };
}

/**
 * Calculates the minimum contest score across all 5 flavors.
 * flavorScore[i] = flavor[i] + 0.5 * flavor[left] + 0.5 * flavor[right]
 * Flavor order (circular): spicy, dry, sweet, bitter, sour
 * Returns min(flavorScore[:])
 */
function minContestScore(spicy: number, dry: number, sweet: number, bitter: number, sour: number): number {
  const flavors = [spicy, dry, sweet, bitter, sour];
  let min = Infinity;
  for (let i = 0; i < 5; i++) {
    const score = flavors[i] + 0.5 * flavors[(i - 1 + 5) % 5] + 0.5 * flavors[(i + 1) % 5];
    if (score < min) min = score;
  }
  return min;
}

/**
 * Calculates the optimal pokeblock selection using dynamic programming.
 * Uses an unbounded knapsack approach over feel values 0-254,
 * then finishes with one final pokeblock to fill remaining feel.
 * Optimizes for the highest minimum stat across all 5 flavors.
 *
 * @param availablePokeblocks - Array of filtered pokeblocks to choose from
 * @param nature - The Pokemon's nature (affects stat adjustments)
 * @returns Object containing the ordered array of optimal pokeblocks and final Pokemon stats
 */
function calculateOptimalPokeblocksDP(
  availablePokeblocks: Pokeblock[],
  nature: Nature
): { pokeblocks: Pokeblock[]; finalStats: PokemonStats } {
  // Step 1: Adjust all pokeblocks with nature
  const adjustedPokeblocks = availablePokeblocks.map(pb => adjustWithNature(pb, nature));

  const nonFinishingPokeblocks = adjustedPokeblocks.filter(pb => !pb.finishing);

  // DP table: dp[f][slot] = candidate combination at exactly feel f
  // Slots 0-4: max flavorScore[i] while flavorScore[i] = min(flavorScores)
  // Slot 5: max average(flavors)
  // Slot 6: max minContestScore
  // flavorScore[i] = flavor[i] + 0.5 * flavor[left] + 0.5 * flavor[right]
  const SLOT_COUNT = 7;

  interface DPEntry {
    spicy: number;
    dry: number;
    sweet: number;
    bitter: number;
    sour: number;
    pokeblocks: Pokeblock[];
  }

  function getFlavors(e: DPEntry): number[] {
    return [e.spicy, e.dry, e.sweet, e.bitter, e.sour];
  }

  function getFlavorScores(flavors: number[]): number[] {
    return flavors.map((v, i) =>
      v + 0.5 * flavors[(i - 1 + 5) % 5] + 0.5 * flavors[(i + 1) % 5]
    );
  }

  const dp: (DPEntry | null)[][] = Array.from({ length: MAX_FEEL }, () =>
    new Array(SLOT_COUNT).fill(null)
  );
  const emptyEntry: DPEntry = { spicy: 0, dry: 0, sweet: 0, bitter: 0, sour: 0, pokeblocks: [] };
  for (let s = 0; s < SLOT_COUNT; s++) {
    dp[0][s] = emptyEntry;
  }

  // Fill DP table for feel 1 to 254 (MAX_FEEL - 1) using nonFinishing pokeblocks
  for (let f = 1; f < MAX_FEEL; f++) {
    for (const pb of nonFinishingPokeblocks) {
      const prevFeel = f - pb.feel;
      if (prevFeel < 0) continue;

      for (let s = 0; s < SLOT_COUNT; s++) {
        const prev = dp[prevFeel][s];
        if (!prev) continue;

        const newEntry: DPEntry = {
          spicy: Math.min(prev.spicy + pb.spicy, MAX_STAT),
          dry: Math.min(prev.dry + pb.dry, MAX_STAT),
          sweet: Math.min(prev.sweet + pb.sweet, MAX_STAT),
          bitter: Math.min(prev.bitter + pb.bitter, MAX_STAT),
          sour: Math.min(prev.sour + pb.sour, MAX_STAT),
          pokeblocks: [...prev.pokeblocks, pb],
        };
        const newFlavors = getFlavors(newEntry);
        const newFlavorScores = getFlavorScores(newFlavors);
        const newMinFS = Math.min(...newFlavorScores);

        // Slots 0-4: max flavorScore[i] while flavorScore[i] is the bottleneck
        for (let i = 0; i < 5; i++) {
          if (newFlavorScores[i] !== newMinFS) continue;
          const current = dp[f][i];
          if (!current) {
            dp[f][i] = newEntry;
          } else {
            const curFlavors = getFlavors(current);
            const curFS = getFlavorScores(curFlavors);
            if (newFlavorScores[i] > curFS[i]) {
              dp[f][i] = newEntry;
            }
          }
        }

        // Slot 5: max average(flavors)
        const newTotal = newFlavors.reduce((a, b) => a + b, 0);
        const cur5 = dp[f][5];
        if (!cur5 || newTotal > getFlavors(cur5).reduce((a, b) => a + b, 0)) {
          dp[f][5] = newEntry;
        }

        // Slot 6: max minContestScore
        const newDS = minContestScore(newEntry.spicy, newEntry.dry, newEntry.sweet, newEntry.bitter, newEntry.sour);
        const cur6 = dp[f][6];
        if (!cur6 || newDS > minContestScore(cur6.spicy, cur6.dry, cur6.sweet, cur6.bitter, cur6.sour)) {
          dp[f][6] = newEntry;
        }
      }
    }
  }

  // Final step: try adding any pokeblock (finishing or nonFinishing) to fill remaining feel
  // Choose the combination with the highest minContestScore
  let bestScore = -1;
  let bestPokeblocks: Pokeblock[] = [];
  let bestFinalStats: PokemonStats | null = null;

  for (const pb of adjustedPokeblocks) {
    const lowerBound = Math.max(0, MAX_FEEL - pb.feel);
    for (let f = lowerBound; f < MAX_FEEL; f++) {
      for (let s = 0; s < SLOT_COUNT; s++) {
        const entry = dp[f][s];
        if (!entry) continue;

        const finalSpicy = Math.min(entry.spicy + pb.spicy, MAX_STAT);
        const finalDry = Math.min(entry.dry + pb.dry, MAX_STAT);
        const finalSweet = Math.min(entry.sweet + pb.sweet, MAX_STAT);
        const finalBitter = Math.min(entry.bitter + pb.bitter, MAX_STAT);
        const finalSour = Math.min(entry.sour + pb.sour, MAX_STAT);
        const score = minContestScore(finalSpicy, finalDry, finalSweet, finalBitter, finalSour);

        if (score > bestScore) {
          bestScore = score;
          bestPokeblocks = [...entry.pokeblocks, pb];
          bestFinalStats = {
            spicy: finalSpicy,
            dry: finalDry,
            sweet: finalSweet,
            bitter: finalBitter,
            sour: finalSour,
            feel: f + pb.feel,
          };
        }
      }
    }
  }

  if (!bestFinalStats) {
    return { pokeblocks: [], finalStats: { spicy: 0, dry: 0, sweet: 0, bitter: 0, sour: 0, feel: 0 } };
  }

  return { pokeblocks: bestPokeblocks, finalStats: bestFinalStats };
}

const premadeCombos = premadeCombosData as string[][];

/**
 * Evaluates premade pokeblock combinations and returns the one with the highest minContestScore.
 * Filters out any combo containing a pokeblock not in availablePokeblocks.
 *
 * @param availablePokeblocks - Array of filtered pokeblocks to choose from
 * @param nature - The Pokemon's nature (affects stat adjustments)
 * @returns Object containing the ordered array of optimal pokeblocks and final Pokemon stats
 */
function calculateOptimalPokeblocksPremade(
  availablePokeblocks: Pokeblock[],
  nature: Nature
): { pokeblocks: Pokeblock[]; finalStats: PokemonStats } {
  // Build a map from description to nature-adjusted pokeblock
  const adjustedMap = new Map<string, Pokeblock>();
  for (const pb of availablePokeblocks) {
    adjustedMap.set(pb.description, adjustWithNature(pb, nature));
  }

  let bestScore = -1;
  let bestPokeblocks: Pokeblock[] = [];
  let bestFinalStats: PokemonStats = { spicy: 0, dry: 0, sweet: 0, bitter: 0, sour: 0, feel: 0 };

  for (const combo of premadeCombos) {
    // Filter out combos with missing pokeblocks
    const resolved: Pokeblock[] = [];
    let valid = true;
    for (const desc of combo) {
      const pb = adjustedMap.get(desc);
      if (!pb) { valid = false; break; }
      resolved.push(pb);
    }
    if (!valid) continue;

    // Calculate final stats
    const finalStats: PokemonStats = { spicy: 0, dry: 0, sweet: 0, bitter: 0, sour: 0, feel: 0 };
    for (const pb of resolved) {
      finalStats.spicy = Math.min(finalStats.spicy + pb.spicy, MAX_STAT);
      finalStats.dry = Math.min(finalStats.dry + pb.dry, MAX_STAT);
      finalStats.sweet = Math.min(finalStats.sweet + pb.sweet, MAX_STAT);
      finalStats.bitter = Math.min(finalStats.bitter + pb.bitter, MAX_STAT);
      finalStats.sour = Math.min(finalStats.sour + pb.sour, MAX_STAT);
      finalStats.feel += pb.feel;
    }

    const score = minContestScore(finalStats.spicy, finalStats.dry, finalStats.sweet, finalStats.bitter, finalStats.sour);
    if (score > bestScore) {
      bestScore = score;
      bestPokeblocks = resolved;
      bestFinalStats = finalStats;
    }
  }

  return { pokeblocks: bestPokeblocks, finalStats: bestFinalStats };
}

/**
 * Calculates the optimal pokeblock selection by running greedy, DP, and premade
 * approaches and returning whichever has the higher minContestScore.
 *
 * @param availablePokeblocks - Array of filtered pokeblocks to choose from
 * @param nature - The Pokemon's nature (affects stat adjustments)
 * @returns Object containing the ordered array of optimal pokeblocks and final Pokemon stats
 */
export function calculateOptimalPokeblockCombo(
  availablePokeblocks: Pokeblock[],
  nature: Nature
): { pokeblocks: Pokeblock[]; finalStats: PokemonStats } {
  const resultOptions: { pokeblocks: Pokeblock[]; finalStats: PokemonStats }[] = [];
  resultOptions.push(calculateOptimalPokeblocksGreedy(availablePokeblocks, nature));
  resultOptions.push(calculateOptimalPokeblocksDP(availablePokeblocks, nature));
  resultOptions.push(calculateOptimalPokeblocksPremade(availablePokeblocks, nature));
  const bestOption = resultOptions.reduce((best, option) => {
    const bestScore = minContestScore(
      best.finalStats.spicy, best.finalStats.dry, best.finalStats.sweet,
      best.finalStats.bitter, best.finalStats.sour
    );

    const optionScore = minContestScore(
      option.finalStats.spicy, option.finalStats.dry, option.finalStats.sweet,
      option.finalStats.bitter, option.finalStats.sour
    );

    return optionScore > bestScore ? option : best;
  });
  bestOption.finalStats.feel = Math.min(bestOption.finalStats.feel, MAX_FEEL);
  return bestOption;
}
