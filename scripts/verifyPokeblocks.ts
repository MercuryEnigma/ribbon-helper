import allPokeblocksData from '../src/data/pokeblocks.json';
import { calculateFinalStats, type Pokeblock, type Nature } from '../src/berry-blending/pokeblockBlending';

// Type declarations for Node.js globals when running as CLI
declare const process: { argv: string[] } | undefined;

const allPokeblocks = allPokeblocksData as Record<string, Pokeblock>;

/**
 * Parses a text string of pokeblock quantities into an array of pokeblocks.
 *
 * Format: "4x Pomeg 4, 4x Kelpsy 4, 2x Qualot 4, 1x Grepa 4, Watmel 4"
 * - "4x Pomeg 4" means 4 of the pokeblock named "Pomeg 4"
 * - "Watmel 4" means 1 of the pokeblock named "Watmel 4"
 *
 * @param input - Comma-separated list of pokeblocks with optional quantities
 * @returns Array of pokeblocks
 */
export function parsePokeblockList(input: string): Pokeblock[] {
  const result: Pokeblock[] = [];

  // Split by comma and process each part
  const parts = input.split(',').map(s => s.trim());

  for (const part of parts) {
    if (!part) continue;

    // Match patterns like "4x Pomeg 4" or "Pomeg 4"
    const matchWithCount = part.match(/^(\d+)x\s+(.+)$/);

    let count = 1;
    let name = part;

    if (matchWithCount) {
      count = parseInt(matchWithCount[1], 10);
      name = matchWithCount[2];
    }

    // Look up the pokeblock
    const pokeblock = allPokeblocks[name];

    if (!pokeblock) {
      console.warn(`Pokeblock "${name}" not found in pokeblocks_v2.json`);
      console.warn(`Available names include:`, Object.keys(allPokeblocks).slice(0, 10).join(', '), '...');
      continue;
    }

    // Add it the specified number of times
    for (let i = 0; i < count; i++) {
      result.push(pokeblock);
    }
  }

  return result;
}

/**
 * Verifies a pokeblock kit against expected stats.
 *
 * @param input - Text description of pokeblocks
 * @param nature - Pokemon nature (optional)
 * @returns Final stats after consuming all pokeblocks
 */
export function verifyPokeblockKit(
  input: string,
  nature: Nature = {}
) {
  const pokeblocks = parsePokeblockList(input);

  console.log('=== Pokeblock Kit ===');
  console.log(`Total pokeblocks: ${pokeblocks.length}`);

  // Group by description for display
  const grouped = pokeblocks.reduce((acc, pb) => {
    const key = pb.description;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\nPokeblocks:');
  Object.entries(grouped).forEach(([description, count]) => {
    console.log(`  ${count}x ${description}`);
  });

  const finalStats = calculateFinalStats(pokeblocks, nature);

  console.log('\n=== Final Stats ===');
  console.log(`Spicy:  ${finalStats.spicy}`);
  console.log(`Dry:    ${finalStats.dry}`);
  console.log(`Sweet:  ${finalStats.sweet}`);
  console.log(`Bitter: ${finalStats.bitter}`);
  console.log(`Sour:   ${finalStats.sour}`);
  console.log(`Feel:   ${finalStats.feel}`);
  console.log(`Total:  ${finalStats.spicy + finalStats.dry + finalStats.sweet + finalStats.bitter + finalStats.sour}`);
  console.log(`Avg:    ${((finalStats.spicy + finalStats.dry + finalStats.sweet + finalStats.bitter + finalStats.sour) / 5).toFixed(1)}`);

  return finalStats;
}

// Map nature names to Nature interface
const natureMap: Record<string, Nature> = {
  // +Atk natures
  adamant: { likes: 'spicy', dislikes: 'dry' },
  lonely: { likes: 'spicy', dislikes: 'sour' },
  brave: { likes: 'spicy', dislikes: 'sweet' },
  naughty: { likes: 'spicy', dislikes: 'bitter' },
  // +Def natures
  bold: { likes: 'sour', dislikes: 'spicy' },
  relaxed: { likes: 'sour', dislikes: 'sweet' },
  impish: { likes: 'sour', dislikes: 'dry' },
  lax: { likes: 'sour', dislikes: 'bitter' },
  // +SpA natures
  modest: { likes: 'dry', dislikes: 'spicy' },
  mild: { likes: 'dry', dislikes: 'sour' },
  quiet: { likes: 'dry', dislikes: 'sweet' },
  rash: { likes: 'dry', dislikes: 'bitter' },
  // +SpD natures
  calm: { likes: 'bitter', dislikes: 'spicy' },
  gentle: { likes: 'bitter', dislikes: 'sour' },
  sassy: { likes: 'bitter', dislikes: 'sweet' },
  careful: { likes: 'bitter', dislikes: 'dry' },
  // +Spe natures
  timid: { likes: 'sweet', dislikes: 'spicy' },
  hasty: { likes: 'sweet', dislikes: 'sour' },
  jolly: { likes: 'sweet', dislikes: 'dry' },
  naive: { likes: 'sweet', dislikes: 'bitter' },
};

// CLI entry point
export function main() {
  const args = typeof process !== 'undefined' ? process.argv.slice(2) : [];

  if (args.length === 0) {
    console.log('Usage: npx tsx scripts/verifyPokeblocks.ts "4x Pomeg 4, 2x Kelpsy 4, ..." [natureType]');
    console.log('\nExamples:');
    console.log('  npx tsx scripts/verifyPokeblocks.ts "4x Pomeg 4, 4x Kelpsy 4, 2x Qualot 4"');
    console.log('  npx tsx scripts/verifyPokeblocks.ts "4x Pomeg 4, 4x Kelpsy 4" adamant');
    console.log('\nNature types: adamant, modest, jolly, timid, etc. (or omit for neutral)');
    return;
  }

  const input = args[0];
  const natureName = args[1]?.toLowerCase();

  const nature = natureName ? (natureMap[natureName] || {}) : {};

  if (natureName && !natureMap[natureName]) {
    console.warn(`\nWarning: Unknown nature "${natureName}", using neutral nature\n`);
  }

  verifyPokeblockKit(input, nature);
}

// Auto-run if executed directly
if (typeof process !== 'undefined' && typeof process.argv !== 'undefined') {
  main();
}
