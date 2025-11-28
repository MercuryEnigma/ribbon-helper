import bdspPoffins from '../data/bdsp_poffins.json';
import natures from '../data/natures.json';

export interface BDSPPoffin {
  berries: string;
  spicy: number;
  dry: number;
  sweet: number;
  bitter: number;
  sour: number;
  sheen: number;
  sheen_friendship: number;
  set: string;
  common: boolean;
}

export interface Nature {
  likes: string;
  dislikes: string;
}

export interface Flavors {
  spicy: number;
  dry: number;
  sweet: number;
  bitter: number;
  sour: number;
}

export interface BDSPPoffinKit {
  set: string;
  poffins: Array<{ name: string; berries: string }>;
  totalStats: Flavors;
  totalSheen: number;
  averageStat: number;
}

type StatKey = 'spicy' | 'dry' | 'sweet' | 'bitter' | 'sour';

const SHEEN_LIMIT = 255;
const STAT_LIMIT = 255;

/**
 * Apply nature modifiers to stats (BDSP uses same mechanics as DPPt)
 */
function applyNatureModifiers(
  stats: Flavors,
  nature: string | null
): Flavors {
  if (!nature || !natures[nature as keyof typeof natures]) {
    return { ...stats };
  }

  const natureData = natures[nature as keyof typeof natures];
  const liked = natureData.likes;
  const disliked = natureData.dislikes;

  const adjusted = { ...stats };

  if (liked && disliked) {
    const likedStat = liked as StatKey;
    const dislikedStat = disliked as StatKey;

    // If liked flavor > disliked flavor, multiply all flavors by 1.1
    // If disliked flavor > liked flavor, multiply all flavors by 0.9
    let multiplier = 1.0;
    if (stats[likedStat] > stats[dislikedStat]) {
      multiplier = 1.1;
    } else if (stats[dislikedStat] > stats[likedStat]) {
      multiplier = 0.9;
    }
    adjusted.spicy = Math.min(STAT_LIMIT, Math.floor(stats.spicy * multiplier));
    adjusted.dry = Math.min(STAT_LIMIT, Math.floor(stats.dry * multiplier));
    adjusted.sweet = Math.min(STAT_LIMIT, Math.floor(stats.sweet * multiplier));
    adjusted.bitter = Math.min(STAT_LIMIT, Math.floor(stats.bitter * multiplier));
    adjusted.sour = Math.min(STAT_LIMIT, Math.floor(stats.sour * multiplier));
  }

  return adjusted;
}

/**
 * Group poffins by set
 */
function groupPoffinsBySet(
  onlyCommon: boolean
): Map<string, Array<{ name: string; poffin: BDSPPoffin }>> {
  const sets = new Map<string, Array<{ name: string; poffin: BDSPPoffin }>>();

  for (const [name, poffin] of Object.entries(bdspPoffins as Record<string, BDSPPoffin>)) {
    // Filter by common flag if requested
    if (onlyCommon && !poffin.common) continue;

    if (!sets.has(poffin.set)) {
      sets.set(poffin.set, []);
    }
    sets.get(poffin.set)!.push({ name, poffin });
  }

  return sets;
}

/**
 * Calculate total stats for a complete set of poffins
 * Cycles through the set repeatedly until max sheen or all stats maxed
 */
function calculateSetStats(
  poffins: Array<{ name: string; poffin: BDSPPoffin }>,
  nature: string | null,
  maxFriendship: boolean
): { stats: Flavors; sheen: number; usedPoffins: Array<{ name: string; berries: string }> } {
  const stats = { spicy: 0, dry: 0, sweet: 0, bitter: 0, sour: 0 };
  let totalSheen = 0;
  const usedPoffins: Array<{ name: string; berries: string }> = [];

  // Keep cycling through the poffin set until we hit limits
  let index = 0;
  while (true) {
    // Check if all stats are maxed
    const allStatsMaxed = stats.spicy === STAT_LIMIT &&
                         stats.dry === STAT_LIMIT &&
                         stats.sweet === STAT_LIMIT &&
                         stats.bitter === STAT_LIMIT &&
                         stats.sour === STAT_LIMIT;

    if (allStatsMaxed) {
      break;
    }

    // Check if current sheen has reached limit (before adding next poffin)
    if (totalSheen >= SHEEN_LIMIT) {
      break;
    }

    // Get the next poffin in the set (cycle back to start if needed)
    const { name, poffin } = poffins[index % poffins.length];

    // Calculate sheen for this poffin
    const poffinSheen = maxFriendship ? poffin.sheen_friendship : poffin.sheen;

    // Apply nature modifiers to this poffin
    const adjustedPoffin = applyNatureModifiers(
      {
        spicy: poffin.spicy,
        dry: poffin.dry,
        sweet: poffin.sweet,
        bitter: poffin.bitter,
        sour: poffin.sour
      },
      nature
    );

    // Add the poffin
    stats.spicy = Math.min(STAT_LIMIT, stats.spicy + adjustedPoffin.spicy);
    stats.dry = Math.min(STAT_LIMIT, stats.dry + adjustedPoffin.dry);
    stats.sweet = Math.min(STAT_LIMIT, stats.sweet + adjustedPoffin.sweet);
    stats.bitter = Math.min(STAT_LIMIT, stats.bitter + adjustedPoffin.bitter);
    stats.sour = Math.min(STAT_LIMIT, stats.sour + adjustedPoffin.sour);
    totalSheen = Math.min(SHEEN_LIMIT, totalSheen + poffinSheen);

    usedPoffins.push({ name, berries: poffin.berries });
    index++;
  }

  return { stats, sheen: totalSheen, usedPoffins };
}

/**
 * Find the best BDSP poffin set
 */
export function calculateOptimalBDSPPoffinKit(
  onlyCommon: boolean,
  maxFriendship: boolean,
  nature: string | null = null
): BDSPPoffinKit | null {
  const sets = groupPoffinsBySet(onlyCommon);

  if (sets.size === 0) {
    return null;
  }

  let bestSet: {
    setName: string;
    usedPoffins: Array<{ name: string; berries: string }>;
    stats: Flavors;
    sheen: number;
    averageStat: number;
  } | null = null;

  // Evaluate each set
  for (const [setName, poffins] of sets.entries()) {
    const { stats, sheen, usedPoffins } = calculateSetStats(poffins, nature, maxFriendship);
    const averageStat = (stats.spicy + stats.dry + stats.sweet +
                        stats.bitter + stats.sour) / 5;

    // Choose the set with the highest average stat
    if (!bestSet || averageStat > bestSet.averageStat) {
      bestSet = {
        setName,
        usedPoffins,
        stats,
        sheen,
        averageStat
      };
    }
  }

  if (!bestSet) {
    return null;
  }

  return {
    set: bestSet.setName,
    poffins: bestSet.usedPoffins,
    totalStats: bestSet.stats,
    totalSheen: bestSet.sheen,
    averageStat: bestSet.averageStat
  };
}
