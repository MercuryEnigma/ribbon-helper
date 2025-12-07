import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAvailableMovesForPokemon, filterAvailableMoves } from '../src/contest-moves/moveUtils.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/pokemon_moves_rse.json'), 'utf8'));

console.log('Testing Bulbasaur...\n');

const availableMoves = getAvailableMovesForPokemon('bulbasaur', data);
console.log('Available moves by method:');
Object.entries(availableMoves).forEach(([method, moves]) => {
  console.log(`  ${method}: ${Object.keys(moves).length} moves`);
});

const allEnabled = {
  'level-up': true,
  'machine': true,
  'tutor': true,
  'egg': true,
  'purify': true,
  'other': true
};

const filtered = filterAvailableMoves(availableMoves, allEnabled);
console.log(`\nFiltered moves: ${Object.keys(filtered).length} total`);
console.log('First 10 moves:', Object.keys(filtered).slice(0, 10));

// Now we need to import and test getRseContestMoves
// But we can't easily do that from Node, so let's just verify the data structure is correct
console.log('\nSample filtered moves structure:');
console.log(Object.entries(filtered).slice(0, 5).map(([name, value]) => `  ${name}: ${value}`).join('\n'));
