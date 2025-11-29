import poffins from '../data/poffins.json';
import natures from '../data/natures.json';

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

export interface PoffinKit {
  poffins: Array<{ name: string; berries: string; players: number; platinum: boolean; mild: boolean }>;
  totalStats: Flavors;
  totalFeel: number;
  averageStat: number;
}

type StatKey = 'spicy' | 'dry' | 'sweet' | 'bitter' | 'sour';

const FEEL_LIMIT = 255;
const STAT_LIMIT = 255;

/**
 * Apply nature modifiers to stats
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

function lowestFlavorKey(obj: Flavors): keyof Flavors {
  const keys = Object.keys(obj) as (keyof Flavors)[];
  let minKey = keys[0];

  for (const key of keys) {
    if (obj[key] < obj[minKey]) {
      minKey = key;
    }
  }

  return minKey;
}

/**
 * Filter poffins based on user selections
 */
function getAvailablePoffins(
  playerCount: 1 | 2 | 3 | 4,
  withPlatinum: boolean,
  withMild: boolean,
  withPDR: boolean,
  withFrontier: boolean,
  withEvent: boolean
): { regular: Record<string, Poffin>; finishing: Record<string, Poffin> } {
  const regular: Record<string, Poffin> = {};
  const finishing: Record<string, Poffin> = {};

  for (const [name, poffin] of Object.entries(poffins as Record<string, Poffin>)) {
    // Filter by player count - can use poffins with same or fewer players
    if (poffin.players > playerCount) continue;

    // Filter platinum poffins
    if (poffin.platinum && !withPlatinum) continue;

    // Filter mild poffin
    if (poffin.mild && !withMild) continue;

    // Filter PBR poffins
    if (poffin.pdr && !withPDR) continue;

    // Filter Battle Frontier poffins
    if (poffin.frontier && !withFrontier) continue;

    // Filter event-only berries
    if (poffin.event && !withEvent) continue;

    // Separate finishing poffins
    if (poffin.finishing) {
      finishing[name] = poffin;
    } else {
      regular[name] = poffin;
    }
  }

  return { regular, finishing };
}

/**
 * Calculate efficiency score for a poffin based on weighted stat improvements
 */
function calculatePoffinScore(
  poffin: Poffin,
  currentStats: Flavors,
  nature: string | null
): number {
  // Apply nature modifiers to the poffin stats
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

  // Calculate weighted efficiency score
  // Lower stats get higher weight - we weight by percentage improvement
  let weightedScore = 0;
  const stats: Array<keyof Flavors> = ['spicy', 'dry', 'sweet', 'bitter', 'sour'];

  for (const stat of stats) {
    const currentValue = currentStats[stat];
    const poffinValue = adjustedPoffin[stat];

    if (poffinValue > 0) {
      // Weight is higher when current stat is lower
      // Use 1 + (255 - current) to give more weight to improving low stats
      const weight = 1 + (STAT_LIMIT - currentValue);
      weightedScore += poffinValue * weight;
    }
  }

  // Return efficiency: weighted score per feel point
  return weightedScore / poffin.feel;
}

/**
 * Greedy algorithm to find optimal poffin kit
 */
export function calculateOptimalPoffinKit(
  playerCount: 1 | 2 | 3 | 4,
  withPlatinum: boolean,
  withMild: boolean,
  withPDR: boolean,
  withFrontier: boolean,
  withEvent: boolean,
  nature: string | null = null
): PoffinKit | null {
  const { regular, finishing } = getAvailablePoffins(
    playerCount,
    withPlatinum,
    withMild,
    withPDR,
    withFrontier,
    withEvent
  );

  if (Object.keys(regular).length === 0) {
    return null;
  }

  // Current state
  const stats = { spicy: 0, dry: 0, sweet: 0, bitter: 0, sour: 0 };
  let totalFeel = 0;
  const kit: Array<{ name: string; berries: string; players: number; platinum: boolean; mild: boolean }> = [];

  // Greedy approach: repeatedly add the most efficient poffin
  while (totalFeel < FEEL_LIMIT) {
    let bestPoffin: { name: string; poffin: Poffin; score: number } | null = null;

    // Find the best regular poffin to add
    for (const [name, poffin] of Object.entries(regular)) {
      // Can we fit this poffin?
      if (totalFeel + poffin.feel > FEEL_LIMIT) continue;

      const score = calculatePoffinScore(poffin, stats, nature);

      if (!bestPoffin || score > bestPoffin.score) {
        bestPoffin = { name, poffin, score };
      }
    }

    // If no regular poffin fits or is beneficial, break
    if (!bestPoffin || bestPoffin.score <= 0) {
      break;
    }

    // Add the best poffin
    const adjustedBestPoffin = applyNatureModifiers(
      {
        spicy: bestPoffin.poffin.spicy,
        dry: bestPoffin.poffin.dry,
        sweet: bestPoffin.poffin.sweet,
        bitter: bestPoffin.poffin.bitter,
        sour: bestPoffin.poffin.sour,
      },
      nature
    );
    stats.spicy = Math.min(STAT_LIMIT, stats.spicy + adjustedBestPoffin.spicy);
    stats.dry = Math.min(STAT_LIMIT, stats.dry + adjustedBestPoffin.dry);
    stats.sweet = Math.min(STAT_LIMIT, stats.sweet + adjustedBestPoffin.sweet);
    stats.bitter = Math.min(STAT_LIMIT, stats.bitter + adjustedBestPoffin.bitter);
    stats.sour = Math.min(STAT_LIMIT, stats.sour + adjustedBestPoffin.sour);
    totalFeel += bestPoffin.poffin.feel;

    kit.push({
      name: bestPoffin.name,
      berries: bestPoffin.poffin.berries,
      players: bestPoffin.poffin.players,
      platinum: bestPoffin.poffin.platinum,
      mild: bestPoffin.poffin.mild
    });
  }

  // Try to add one more poffin if we have room (can exceed feel limit on last poffin)
  // Consider ALL poffins (both regular and finishing) for the last position
  if (totalFeel < FEEL_LIMIT) {
    let bestLast: { name: string; poffin: Poffin; score: number } | null = null;
    const candidatePool = { ...regular, ...finishing };

    for (const [name, poffin] of Object.entries(candidatePool)) {
      const score = calculatePoffinScore(poffin, stats, nature);

      if (!bestLast || score > bestLast.score) {
        bestLast = { name, poffin, score };
      }
    }

    if (bestLast && bestLast.score > 0) {
      const adjustedBestLast = applyNatureModifiers(
        {
          spicy: bestLast.poffin.spicy,
          dry: bestLast.poffin.dry,
          sweet: bestLast.poffin.sweet,
          bitter: bestLast.poffin.bitter,
          sour: bestLast.poffin.sour,
        },
        nature
      );
      stats.spicy = Math.min(STAT_LIMIT, stats.spicy + adjustedBestLast.spicy);
      stats.dry = Math.min(STAT_LIMIT, stats.dry + adjustedBestLast.dry);
      stats.sweet = Math.min(STAT_LIMIT, stats.sweet + adjustedBestLast.sweet);
      stats.bitter = Math.min(STAT_LIMIT, stats.bitter + adjustedBestLast.bitter);
      stats.sour = Math.min(STAT_LIMIT, stats.sour + adjustedBestLast.sour);
      totalFeel += bestLast.poffin.feel;

      kit.push({
        name: bestLast.name,
        berries: bestLast.poffin.berries,
        players: bestLast.poffin.players,
        platinum: bestLast.poffin.platinum,
        mild: bestLast.poffin.mild
      });
    }
  }

  const averageStat = (stats.spicy + stats.dry + stats.sweet +
                       stats.bitter + stats.sour) / 5;

  return {
    poffins: kit,
    totalStats: stats,
    totalFeel,
    averageStat
  };
}
