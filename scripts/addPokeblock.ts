import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ASSUMED_RPM, calculatePokeblockFromBerries } from '../src/berry-blending/pokeblockBlending.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pokeblocksPath = path.join(__dirname, '../src/data/pokeblocks.json');

function parseBerryInput(input: string): string[] {
  // Handle slash-separated: "Liechi/Salac/Belue"
  if (input.includes('/')) {
    return input.split('/').map(b => b.trim()).filter(b => b.length > 0);
  }
  // Handle comma-separated: "Liechi, Salac, Belue"
  return input.split(',').map(b => b.trim()).filter(b => b.length > 0);
}

function createNickname(berries: string[]): string {
  const [first, ...rest] = berries;
  return first + rest.map(b => b.slice(0, 2)).join('');
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: npx tsx scripts/addPokeblock.ts <berries> [<berries> ...]');
  console.error('  Each argument is a berry list (comma or slash separated).');
  console.error('  Examples:');
  console.error('    npx tsx scripts/addPokeblock.ts "Liechi/Salac/Belue"');
  console.error('    npx tsx scripts/addPokeblock.ts "Apicot, Ganlon, Belue, Pamtre"');
  console.error('    npx tsx scripts/addPokeblock.ts "Liechi/Salac" "Apicot/Ganlon/Durin"');
  process.exit(1);
}

const pokeblocks = JSON.parse(fs.readFileSync(pokeblocksPath, 'utf-8'));

for (const arg of args) {
  const berries = parseBerryInput(arg);
  const nickname = createNickname(berries);

  if (pokeblocks[nickname]) {
    console.log(`Skipping "${nickname}" — already exists in pokeblocks.json`);
    continue;
  }

  const result = calculatePokeblockFromBerries(berries, ASSUMED_RPM.players);

  pokeblocks[nickname] = {
    description: nickname,
    berries,
    spicy: result.spicy,
    dry: result.dry,
    sweet: result.sweet,
    bitter: result.bitter,
    sour: result.sour,
    feel: result.feel,
    efficiency: result.efficiency,
    rpm: result.rpm,
    players: berries.length,
    npc: 0,
    gamecube: false,
    mirage: false,
    "blend-master": false,
    finishing: false,
    "e-reader": false,
    "japanese-e-reader": false,
  };

  console.log(`Added "${nickname}": ${berries.join(', ')} → spicy=${result.spicy} dry=${result.dry} sweet=${result.sweet} bitter=${result.bitter} sour=${result.sour} feel=${result.feel}`);
}

fs.writeFileSync(pokeblocksPath, JSON.stringify(pokeblocks, null, 2) + '\n');
console.log(`Wrote pokeblocks.json`);
