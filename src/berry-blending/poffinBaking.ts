export interface Poffin {
  berries: string;
  spicy: number;
  dry: number;
  sweet: number;
  bitter: number;
  sour: number;
  feel: number;
  players: number;
  platinum: boolean;
  mild: boolean;
  pdr: boolean;
  frontier: boolean;
  event: boolean;
  finishing: boolean;
  time?: number;
}

export type FlavorStat = "spicy" | "dry" | "sweet" | "bitter" | "sour";

export interface Nature {
  likes?: FlavorStat;
  dislikes?: FlavorStat;
}

/**
 * Filter options for poffins
 */
export interface PoffinFilters {
  num_players?: number;
  platinum?: boolean;
  mild?: boolean;
  pdr?: boolean;
  frontier?: boolean;
  event?: boolean;
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

const MAX_FEEL = 255;

const MAX_STAT = 255;

/**
 * Adjusts a poffin's stats based on nature preferences.
 * In Gen 4, if liked flavor > disliked: all stats * 1.1
 * If disliked > liked: all stats * 0.9
 *
 * @param poffin - The base poffin to adjust
 * @param nature - The Pokemon's nature (likes/dislikes flavors)
 * @returns A new adjusted poffin
 */
function adjustWithNature(
  poffin: Poffin,
  nature: Nature
): Poffin {
  const adjusted = { ...poffin };

  if (!nature.likes || !nature.dislikes)
    return adjusted;

  const likedValue = adjusted[nature.likes];
  const dislikedValue = adjusted[nature.dislikes];

  if (likedValue > dislikedValue) {
    adjusted.spicy = Math.round(adjusted.spicy * 1.1);
    adjusted.dry = Math.round(adjusted.dry * 1.1);
    adjusted.sweet = Math.round(adjusted.sweet * 1.1);
    adjusted.bitter = Math.round(adjusted.bitter * 1.1);
    adjusted.sour = Math.round(adjusted.sour * 1.1);
  } else if (dislikedValue > likedValue) {
    adjusted.spicy = Math.round(adjusted.spicy * 0.9);
    adjusted.dry = Math.round(adjusted.dry * 0.9);
    adjusted.sweet = Math.round(adjusted.sweet * 0.9);
    adjusted.bitter = Math.round(adjusted.bitter * 0.9);
    adjusted.sour = Math.round(adjusted.sour * 0.9);
  }

  return adjusted;
}

/**
 * Scores a poffin by considering improvement and balance.
 * Uses a priority stat weight to favor poffins that help specific stats.
 * Penalizes poffins that give 0 to the current minimum stat.
 *
 * @param currentStats - Current Pokemon stats
 * @param poffin - Poffin to evaluate
 * @param priorityWeights - Optional weights for each stat (higher = prefer this stat)
 * @returns Score (higher = better)
 */
function scorePoffinForState(
  currentStats: PokemonStats,
  poffin: Poffin,
  priorityWeights: number[] = [1, 1, 1, 1, 1]
): number {
  const currentFlavors = [currentStats.spicy, currentStats.dry, currentStats.sweet, currentStats.bitter, currentStats.sour];
  const poffinFlavors = [poffin.spicy, poffin.dry, poffin.sweet, poffin.bitter, poffin.sour];

  // Calculate new stats after adding this poffin (capped at MAX_STAT)
  const newFlavors = currentFlavors.map((curr, i) =>
    Math.min(curr + poffinFlavors[i], MAX_STAT)
  );

  // Find current minimum stat
  const currentMin = Math.min(...currentFlavors);
  const minIndices = currentFlavors.map((v, i) => v === currentMin ? i : -1).filter(i => i >= 0);

  // Check if this poffin gives 0 to any minimum stat
  const neglectsMin = minIndices.some(i => poffinFlavors[i] === 0);

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
  let score = weightedImprovement / poffin.feel;

  // Penalty for neglecting the minimum stat (scales with imbalance)
  if (neglectsMin && imbalance > 15) {
    score *= 0.75;
  }

  return score;
}

/**
 * Helper: run greedy with a specific feel budget and priority weights
 */
function getOptimalPoffinsWithBudget(
  availablePoffins: Poffin[],
  feelBudget: number,
  priorityWeights: number[] = [1, 1, 1, 1, 1]
): { poffins: Poffin[]; finalStats: PokemonStats } {
  const selected: Poffin[] = [];
  const currentStats: PokemonStats = {
    spicy: 0, dry: 0, sweet: 0, bitter: 0, sour: 0, feel: 0,
  };

  while (true) {
    let bestPoffin: Poffin | null = null;
    let bestScore = -Infinity;

    for (const poffin of availablePoffins) {
      if (currentStats.feel >= feelBudget) continue;

      const score = scorePoffinForState(currentStats, poffin, priorityWeights);
      if (score > bestScore) {
        bestScore = score;
        bestPoffin = poffin;
      }
    }

    if (!bestPoffin || bestScore <= 0) break;

    selected.push(bestPoffin);
    currentStats.spicy = Math.min(currentStats.spicy + bestPoffin.spicy, MAX_STAT);
    currentStats.dry = Math.min(currentStats.dry + bestPoffin.dry, MAX_STAT);
    currentStats.sweet = Math.min(currentStats.sweet + bestPoffin.sweet, MAX_STAT);
    currentStats.bitter = Math.min(currentStats.bitter + bestPoffin.bitter, MAX_STAT);
    currentStats.sour = Math.min(currentStats.sour + bestPoffin.sour, MAX_STAT);
    currentStats.feel += bestPoffin.feel;
  }

  currentStats.feel = Math.min(currentStats.feel, MAX_FEEL);

  return { poffins: selected, finalStats: currentStats };
}

/**
 * Filters poffins based on availability criteria.
 *
 * @param availablePoffins - Array of poffins to filter
 * @param filters - Filter criteria (all optional)
 * @returns Filtered array of poffins
 */
export function filterPoffins(
  availablePoffins: Poffin[],
  filters: PoffinFilters
): Poffin[] {
  return availablePoffins.filter((poffin) => {
    // Filter by number of players: exclude if poffin requires more players
    if (filters.num_players !== undefined && poffin.players > filters.num_players) {
      return false;
    }

    // Filter by platinum availability
    if (filters.platinum === false && poffin.platinum === true) {
      return false;
    }

    // Filter by mild poffin
    if (filters.mild === false && poffin.mild === true) {
      return false;
    }

    // Filter by Pokemon Battle Revolution
    if (filters.pdr === false && poffin.pdr === true) {
      return false;
    }

    // Filter by Battle Frontier
    if (filters.frontier === false && poffin.frontier === true) {
      return false;
    }

    // Filter by event-only berries
    if (filters.event === false && poffin.event === true) {
      return false;
    }

    return true;
  });
}

/**
 * Calculates the optimal poffin selection using greedy approach.
 * Tries multiple weight configurations and feel budgets.
 *
 * @param availablePoffins - Array of filtered poffins to choose from
 * @param nature - The Pokemon's nature (affects stat adjustments)
 * @returns Object containing the ordered array of optimal poffins and final Pokemon stats
 */
function calculateOptimalPoffinsGreedy(
  availablePoffins: Poffin[],
  nature: Nature
): { poffins: Poffin[]; finalStats: PokemonStats } {
  // Step 1: Adjust poffins with nature
  const adjustedPoffins = availablePoffins.map(p => {
    return adjustWithNature(p, nature);
  });

  const nonFinishingPoffins = adjustedPoffins.filter(p => !p.finishing);
  const finishingPoffins = adjustedPoffins.filter(p => p.finishing);

  // Try different feel budgets and priority weight configurations
  let bestResult: { poffins: Poffin[]; finalStats: PokemonStats } | null = null;
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
      // Get non-finishing poffins for this budget
      const result = getOptimalPoffinsWithBudget(nonFinishingPoffins, budget, weights);

      // Try adding each finishing poffin (if room)
      if (result.finalStats.feel < MAX_FEEL) {
        for (const finisher of finishingPoffins) {
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
              poffins: [...result.poffins, finisher],
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

  return bestResult || { poffins: [], finalStats: { spicy: 0, dry: 0, sweet: 0, bitter: 0, sour: 0, feel: 0 } };
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
 * Calculates the optimal poffin selection using dynamic programming.
 * Uses an unbounded knapsack approach over feel values 0-254,
 * then finishes with one final poffin to fill remaining feel.
 * Optimizes for the highest minimum stat across all 5 flavors.
 *
 * @param availablePoffins - Array of filtered poffins to choose from
 * @param nature - The Pokemon's nature (affects stat adjustments)
 * @returns Object containing the ordered array of optimal poffins and final Pokemon stats
 */
function calculateOptimalPoffinsDP(
  availablePoffins: Poffin[],
  nature: Nature
): { poffins: Poffin[]; finalStats: PokemonStats } {
  // Step 1: Adjust all poffins with nature
  const adjustedPoffins = availablePoffins.map(p => adjustWithNature(p, nature));

  const nonFinishingPoffins = adjustedPoffins.filter(p => !p.finishing);

  // DP table: dp[f][slot] = candidate combination at exactly feel f
  // Slots 0-4: max flavorScore[i] while flavorScore[i] = min(flavorScores)
  // Slot 5: max average(flavors)
  // Slot 6: max minContestScore
  const SLOT_COUNT = 7;

  interface DPEntry {
    spicy: number;
    dry: number;
    sweet: number;
    bitter: number;
    sour: number;
    poffins: Poffin[];
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
  const emptyEntry: DPEntry = { spicy: 0, dry: 0, sweet: 0, bitter: 0, sour: 0, poffins: [] };
  for (let s = 0; s < SLOT_COUNT; s++) {
    dp[0][s] = emptyEntry;
  }

  // Fill DP table for feel 1 to 254 (MAX_FEEL - 1) using nonFinishing poffins
  for (let f = 1; f < MAX_FEEL; f++) {
    for (const p of nonFinishingPoffins) {
      const prevFeel = f - p.feel;
      if (prevFeel < 0) continue;

      for (let s = 0; s < SLOT_COUNT; s++) {
        const prev = dp[prevFeel][s];
        if (!prev) continue;

        const newEntry: DPEntry = {
          spicy: Math.min(prev.spicy + p.spicy, MAX_STAT),
          dry: Math.min(prev.dry + p.dry, MAX_STAT),
          sweet: Math.min(prev.sweet + p.sweet, MAX_STAT),
          bitter: Math.min(prev.bitter + p.bitter, MAX_STAT),
          sour: Math.min(prev.sour + p.sour, MAX_STAT),
          poffins: [...prev.poffins, p],
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

  // Final step: try adding any poffin (finishing or nonFinishing) to fill remaining feel
  // Choose the combination with the highest minContestScore
  let bestScore = -1;
  let bestPoffins: Poffin[] = [];
  let bestFinalStats: PokemonStats | null = null;

  for (const p of adjustedPoffins) {
    const lowerBound = Math.max(0, MAX_FEEL - p.feel);
    for (let f = lowerBound; f < MAX_FEEL; f++) {
      for (let s = 0; s < SLOT_COUNT; s++) {
        const entry = dp[f][s];
        if (!entry) continue;

        const finalSpicy = Math.min(entry.spicy + p.spicy, MAX_STAT);
        const finalDry = Math.min(entry.dry + p.dry, MAX_STAT);
        const finalSweet = Math.min(entry.sweet + p.sweet, MAX_STAT);
        const finalBitter = Math.min(entry.bitter + p.bitter, MAX_STAT);
        const finalSour = Math.min(entry.sour + p.sour, MAX_STAT);
        const score = minContestScore(finalSpicy, finalDry, finalSweet, finalBitter, finalSour);

        if (score > bestScore) {
          bestScore = score;
          bestPoffins = [...entry.poffins, p];
          bestFinalStats = {
            spicy: finalSpicy,
            dry: finalDry,
            sweet: finalSweet,
            bitter: finalBitter,
            sour: finalSour,
            feel: f + p.feel,
          };
        }
      }
    }
  }

  if (!bestFinalStats) {
    return { poffins: [], finalStats: { spicy: 0, dry: 0, sweet: 0, bitter: 0, sour: 0, feel: 0 } };
  }

  return { poffins: bestPoffins, finalStats: bestFinalStats };
}

/**
 * Calculates the optimal poffin selection by running greedy and DP
 * approaches and returning whichever has the higher minContestScore.
 *
 * @param availablePoffins - Array of filtered poffins to choose from
 * @param nature - The Pokemon's nature (affects stat adjustments)
 * @returns Object containing the ordered array of optimal poffins and final Pokemon stats
 */
export function calculateOptimalPoffinBakingCombo(
  availablePoffins: Poffin[],
  nature: Nature
): { poffins: Poffin[]; finalStats: PokemonStats } {
  const resultOptions: { poffins: Poffin[]; finalStats: PokemonStats }[] = [];
  resultOptions.push(calculateOptimalPoffinsGreedy(availablePoffins, nature));
  resultOptions.push(calculateOptimalPoffinsDP(availablePoffins, nature));
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

  // Set time = 60 for each poffin that is not mild or platinum
  for (const p of bestOption.poffins) {
    if (!p.mild && !p.platinum) {
      p.time = 60;
    }
  }

  return bestOption;
}
