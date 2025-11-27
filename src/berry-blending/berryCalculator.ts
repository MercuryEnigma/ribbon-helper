import pokeblocks from '../data/pokeblocks.json';
import natures from '../data/natures.json';

export interface Pokeblock {
  berry: string;
  spicy: number;
  dry: number;
  sweet: number;
  bitter: number;
  sour: number;
  feel: number;
  players: number;
  npc: number;
  gamecube: boolean;
  mirage: boolean;
  'blend-master': boolean;
  finishing: boolean;
  'e-reader': boolean;
  'japanese-e-reader': boolean;
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

export interface BerryKit {
  blocks: Array<{ name: string; berry: string; count: number }>;
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

    // If liked flavor > disliked flavor, multiply liked by 1.1
    // If disliked flavor > liked flavor, multiply disliked by 0.9
    if (stats[likedStat] > stats[dislikedStat]) {
      adjusted[likedStat] = Math.min(STAT_LIMIT, Math.floor(stats[likedStat] * 1.1));
    } else if (stats[dislikedStat] > stats[likedStat]) {
      adjusted[dislikedStat] = Math.floor(stats[dislikedStat] * 0.9);
    }
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
 * Filter pokeblocks based on user selections
 */
function getAvailablePokeblocks(
  playerCount: 1 | 2 | 3 | 4,
  withGamecube: boolean,
  withMirageIsland: boolean,
  withBerryMaster: boolean,
  withEReader: boolean,
  withJapaneseEReader: boolean
): { regular: Record<string, Pokeblock>; finishing: Record<string, Pokeblock> } {
  const regular: Record<string, Pokeblock> = {};
  const finishing: Record<string, Pokeblock> = {};

  for (const [name, block] of Object.entries(pokeblocks as Record<string, Pokeblock>)) {
    // Filter by player count - can use blocks with same or fewer players
    // 2-player can only use 1-player blocks, 3-player can use 1 and 3, etc.
    if (block.players > playerCount) continue;

    // Check requirements - block needs items we have
    if (block.gamecube && !withGamecube) continue;
    if (block.mirage && !withMirageIsland) continue;
    if (block['blend-master'] && !withBerryMaster) continue;
    if (block['e-reader'] && !withEReader) continue;
    if (block['japanese-e-reader'] && !withJapaneseEReader) continue;

    // Separate finishing blocks
    if (block.finishing) {
      finishing[name] = block;
    } else {
      regular[name] = block;
    }
  }

  return { regular, finishing };
}

/**
 * Calculate efficiency score for a block by focusing on improving the lowest stat
 */
function calculateBlockScore(
  block: Pokeblock,
  currentStats: Flavors,
  nature: string | null
): number {
  // Apply nature modifiers to current stats to find the true lowest stat
  // const currentAdjusted = applyNatureModifiers(currentStats, nature);
  const lowestFlavor = lowestFlavorKey(currentStats);
  const lowestFlavorValue = currentStats[lowestFlavor];

  // // Find the current lowest stat value  
  // const currentLowest = Math.min(
  //   currentAdjusted.spicy,
  //   currentAdjusted.dry,
  //   currentAdjusted.sweet,
  //   currentAdjusted.bitter,
  //   currentAdjusted.sour
  // );

  // Calculate what stats would be AFTER adding this block (capped at 255 per stat)
  const adjustedBlock = applyNatureModifiers(
    {spicy: block.spicy,
      dry: block.dry,
      sweet: block.sweet,
      bitter: block.bitter,
      sour: block.sour
    },
      nature);
  const newStats = {
    spicy: Math.min(STAT_LIMIT, currentStats.spicy + adjustedBlock.spicy),
    dry: Math.min(STAT_LIMIT, currentStats.dry + adjustedBlock.dry),
    sweet: Math.min(STAT_LIMIT, currentStats.sweet + adjustedBlock.sweet),
    bitter: Math.min(STAT_LIMIT, currentStats.bitter + adjustedBlock.bitter),
    sour: Math.min(STAT_LIMIT, currentStats.sour + adjustedBlock.sour)
  };
  const newFlavorValue = newStats[lowestFlavor];

  // Apply nature modifiers to new stats
  // const newAdjusted = applyNatureModifiers(newStats, nature);

  // // Find the new lowest stat value
  // const newLowest = Math.min(
  //   newAdjusted.spicy,
  //   newAdjusted.dry,
  //   newAdjusted.sweet,
  //   newAdjusted.bitter,
  //   newAdjusted.sour
  // );

  // Efficiency: improvement to lowest stat per feel point
  const improvement = newFlavorValue - lowestFlavorValue;
  return improvement / block.feel;
}

/**
 * Greedy algorithm to find optimal berry kit
 */
export function calculateOptimalBerryKit(
  playerCount: 1 | 2 | 3 | 4,
  withGamecube: boolean,
  withMirageIsland: boolean,
  withBerryMaster: boolean,
  nature: string | null = null,
  withEReader: boolean = false,
  withJapaneseEReader: boolean = false
): BerryKit | null {
  const { regular, finishing } = getAvailablePokeblocks(
    playerCount,
    withGamecube,
    withMirageIsland,
    withBerryMaster,
    withEReader,
    withJapaneseEReader
  );

  if (Object.keys(regular).length === 0) {
    return null;
  }

  // Current state
  const stats = { spicy: 0, dry: 0, sweet: 0, bitter: 0, sour: 0 };
  let totalFeel = 0;
  const kit: Array<{ name: string; berry: string; count: number }> = [];

  // Greedy approach: repeatedly add the most efficient block
  while (totalFeel < FEEL_LIMIT) {
    let bestBlock: { name: string; block: Pokeblock; score: number } | null = null;

    // Find the best regular block to add
    for (const [name, block] of Object.entries(regular)) {
      // Can we fit this block?
      if (totalFeel + block.feel > FEEL_LIMIT) continue;

      const score = calculateBlockScore(block, stats, nature);

      if (!bestBlock || score > bestBlock.score) {
        bestBlock = { name, block, score };
      }
    }

    // If no regular block fits or is beneficial, break
    if (!bestBlock || bestBlock.score <= 0) {
      break;
    }

    // Add the best block
    const adjustedBestBlock = applyNatureModifiers({
      spicy: bestBlock.block.spicy,
      dry: bestBlock.block.dry,
      sweet: bestBlock.block.sweet,
      bitter: bestBlock.block.bitter,
      sour: bestBlock.block.bitter,
      }, nature);
    stats.spicy = Math.min(STAT_LIMIT, stats.spicy + adjustedBestBlock.spicy);
    stats.dry = Math.min(STAT_LIMIT, stats.dry + adjustedBestBlock.dry);
    stats.sweet = Math.min(STAT_LIMIT, stats.sweet + adjustedBestBlock.sweet);
    stats.bitter = Math.min(STAT_LIMIT, stats.bitter + adjustedBestBlock.bitter);
    stats.sour = Math.min(STAT_LIMIT, stats.sour + adjustedBestBlock.sour);
    totalFeel += bestBlock.block.feel;

    const existing = kit.find(b => b.name === bestBlock!.name);
    if (existing) {
      existing.count++;
    } else {
      kit.push({ name: bestBlock.name, berry: bestBlock.block.berry, count: 1 });
    }
  }

  // Try to add one more block if we have room (can exceed feel limit on last block)
  // Consider ALL blocks (both regular and finishing) for the last position
  if (totalFeel < FEEL_LIMIT) {
    let bestLast: { name: string; block: Pokeblock; score: number } | null = null;

    // Consider all regular blocks
    for (const [name, block] of Object.entries(regular)) {
      const score = calculateBlockScore(block, stats, nature);

      if (!bestLast || score > bestLast.score) {
        bestLast = { name, block, score };
      }
    }

    // Also consider all finishing blocks (they can only be used last)
    for (const [name, block] of Object.entries(finishing)) {
      const score = calculateBlockScore(block, stats, nature);

      if (!bestLast || score > bestLast.score) {
        bestLast = { name, block, score };
      }
    }

    if (bestLast && bestLast.score > 0) {
      const adjustedBestLast = applyNatureModifiers({
        spicy: bestLast.block.spicy,
        dry: bestLast.block.dry,
        sweet: bestLast.block.sweet,
        bitter: bestLast.block.bitter,
        sour: bestLast.block.bitter,
        }, nature);
      stats.spicy = Math.min(STAT_LIMIT, stats.spicy + adjustedBestLast.spicy);
      stats.dry = Math.min(STAT_LIMIT, stats.dry + adjustedBestLast.dry);
      stats.sweet = Math.min(STAT_LIMIT, stats.sweet + adjustedBestLast.sweet);
      stats.bitter = Math.min(STAT_LIMIT, stats.bitter + adjustedBestLast.bitter);
      stats.sour = Math.min(STAT_LIMIT, stats.sour + adjustedBestLast.sour);
      totalFeel += bestLast.block.feel;

      kit.push({ name: bestLast.name, berry: bestLast.block.berry, count: 1 });
    }
  }

  // Calculate adjusted stats with nature
  // const adjustedStats = applyNatureModifiers(stats, nature);
  const averageStat = (stats.spicy + stats.dry + stats.sweet +
                       stats.bitter + stats.sour) / 5;

  return {
    blocks: kit,
    totalStats: stats,
    totalFeel,
    averageStat
  };
}
