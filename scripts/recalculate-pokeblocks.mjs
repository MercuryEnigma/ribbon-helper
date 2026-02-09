/**
 * Recalculate all pokeblocks in src/data/pokeblocks.json using the
 * same logic as calculatePokeblockFromBerries and ASSUMED_RPM.
 *
 * - RPM is derived from ASSUMED_RPM based on blend-master / npc / players.
 * - Flavor stats, feel, efficiency, and rpm are updated in-place.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { buildSync } from 'esbuild';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pokeblocksPath = path.resolve(__dirname, '../src/data/pokeblocks.json');
const pokeblockSource = path.resolve(__dirname, '../src/berry-blending/pokeblockBlending.ts');

// Bundle the TS source to a temporary CJS module so we can import in Node.
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokeblock-recalc-'));
const bundledPath = path.join(tempDir, 'pokeblockBlending.cjs');

buildSync({
  entryPoints: [pokeblockSource],
  outfile: bundledPath,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  bundle: true,
  sourcemap: false,
  logLevel: 'silent',
});

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { calculatePokeblockFromBerries, ASSUMED_RPM } = require(bundledPath);

const pokeblocks = JSON.parse(fs.readFileSync(pokeblocksPath, 'utf8'));

let updated = 0;

for (const block of Object.values(pokeblocks)) {
  // Determine RPM based on flags.
  let rpm;
  if (block['blend-master']) {
    rpm = ASSUMED_RPM.blend_master;
  } else if (block.npc > 0) {
    rpm = ASSUMED_RPM.npc;
  } else {
    rpm = ASSUMED_RPM.players;
  }

  const stats = calculatePokeblockFromBerries(block.berries, rpm);

  block.spicy = stats.spicy;
  block.dry = stats.dry;
  block.sweet = stats.sweet;
  block.bitter = stats.bitter;
  block.sour = stats.sour;
  block.feel = stats.feel;
  block.efficiency = stats.efficiency;
  block.rpm = rpm;

  updated += 1;
}

fs.writeFileSync(pokeblocksPath, JSON.stringify(pokeblocks, null, 2) + '\n', 'utf8');
console.log(`Recalculated ${updated} pokeblocks and saved to pokeblocks.json`);
