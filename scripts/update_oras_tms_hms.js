import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// TM and HM mappings for ORAS
const TM_MAPPING = {
  'hone-claws': 'tm-01',
  'dragon-claw': 'tm-02',
  'psyshock': 'tm-03',
  'calm-mind': 'tm-04',
  'roar': 'tm-05',
  'toxic': 'tm-06',
  'hail': 'tm-07',
  'bulk-up': 'tm-08',
  'venoshock': 'tm-09',
  'hidden-power': 'tm-10',
  'sunny-day': 'tm-11',
  'taunt': 'tm-12',
  'ice-beam': 'tm-13',
  'blizzard': 'tm-14',
  'hyper-beam': 'tm-15',
  'light-screen': 'tm-16',
  'protect': 'tm-17',
  'rain-dance': 'tm-18',
  'roost': 'tm-19',
  'safeguard': 'tm-20',
  'frustration': 'tm-21',
  'solar-beam': 'tm-22',
  'smack-down': 'tm-23',
  'thunderbolt': 'tm-24',
  'thunder': 'tm-25',
  'earthquake': 'tm-26',
  'return': 'tm-27',
  'dig': 'tm-28',
  'psychic': 'tm-29',
  'shadow-ball': 'tm-30',
  'brick-break': 'tm-31',
  'double-team': 'tm-32',
  'reflect': 'tm-33',
  'sludge-wave': 'tm-34',
  'flamethrower': 'tm-35',
  'sludge-bomb': 'tm-36',
  'sandstorm': 'tm-37',
  'fire-blast': 'tm-38',
  'rock-tomb': 'tm-39',
  'aerial-ace': 'tm-40',
  'torment': 'tm-41',
  'facade': 'tm-42',
  'flame-charge': 'tm-43',
  'rest': 'tm-44',
  'attract': 'tm-45',
  'thief': 'tm-46',
  'low-sweep': 'tm-47',
  'round': 'tm-48',
  'echoed-voice': 'tm-49',
  'overheat': 'tm-50',
  'steel-wing': 'tm-51',
  'focus-blast': 'tm-52',
  'energy-ball': 'tm-53',
  'false-swipe': 'tm-54',
  'scald': 'tm-55',
  'fling': 'tm-56',
  'charge-beam': 'tm-57',
  'sky-drop': 'tm-58',
  'incinerate': 'tm-59',
  'quash': 'tm-60',
  'will-o-wisp': 'tm-61',
  'acrobatics': 'tm-62',
  'embargo': 'tm-63',
  'explosion': 'tm-64',
  'shadow-claw': 'tm-65',
  'payback': 'tm-66',
  'retaliate': 'tm-67',
  'giga-impact': 'tm-68',
  'rock-polish': 'tm-69',
  'flash': 'tm-70',
  'stone-edge': 'tm-71',
  'volt-switch': 'tm-72',
  'thunder-wave': 'tm-73',
  'gyro-ball': 'tm-74',
  'swords-dance': 'tm-75',
  'struggle-bug': 'tm-76',
  'psych-up': 'tm-77',
  'bulldoze': 'tm-78',
  'frost-breath': 'tm-79',
  'rock-slide': 'tm-80',
  'x-scissor': 'tm-81',
  'dragon-tail': 'tm-82',
  'infestation': 'tm-83',
  'poison-jab': 'tm-84',
  'dream-eater': 'tm-85',
  'grass-knot': 'tm-86',
  'swagger': 'tm-87',
  'sleep-talk': 'tm-88',
  'u-turn': 'tm-89',
  'substitute': 'tm-90',
  'flash-cannon': 'tm-91',
  'trick-room': 'tm-92',
  'wild-charge': 'tm-93',
  'secret-power': 'tm-94',
  'snarl': 'tm-95',
  'nature-power': 'tm-96',
  'dark-pulse': 'tm-97',
  'power-up-punch': 'tm-98',
  'dazzling-gleam': 'tm-99',
  'confide': 'tm-100'
};

const HM_MAPPING = {
  'cut': 'hm-01',
  'fly': 'hm-02',
  'surf': 'hm-03',
  'strength': 'hm-04',
  'waterfall': 'hm-05',
  'rock-smash': 'hm-06',
  'dive': 'hm-07'
};

// Combine both mappings, with HMs taking precedence for moves that appear in both
const MACHINE_MAPPING = { ...TM_MAPPING, ...HM_MAPPING };

// Special case: rock-smash can be both TM94 and HM06 depending on context
// According to the user, both rock-smash and secret-power are TM94
// But based on ORAS data, rock-smash is HM06 and secret-power is TM94
// We'll use HM06 for rock-smash as that's the standard ORAS mapping

function updatePokemonMovesWithTMHM() {
  const dataDir = path.resolve(__dirname, '..', 'src', 'data');
  const pokemonMovesPath = path.join(dataDir, 'pokemon_moves_oras.json');
  const pokemonMoves = JSON.parse(fs.readFileSync(pokemonMovesPath, 'utf8'));

  let updatedCount = 0;
  let skippedCount = 0;
  const notFoundMoves = new Set();

  // Iterate through each Pokemon
  for (const [pokemonName, moveData] of Object.entries(pokemonMoves)) {
    if (!moveData || typeof moveData !== 'object') continue;

    // Look for machine-* entries
    for (const [methodKey, methodData] of Object.entries(moveData)) {
      if (!methodKey.startsWith('machine-')) continue;
      if (!methodData || !methodData.moves) continue;

      // Update moves in this method
      for (const [moveName, value] of Object.entries(methodData.moves)) {
        // Only update if the value is currently "machine"
        if (value === 'machine') {
          const tmhm = MACHINE_MAPPING[moveName];
          if (tmhm) {
            methodData.moves[moveName] = tmhm;
            updatedCount++;
          } else {
            notFoundMoves.add(moveName);
            skippedCount++;
          }
        }
      }
    }
  }

  // Write updated data
  fs.writeFileSync(pokemonMovesPath, JSON.stringify(pokemonMoves, null, 2));

  console.log(`\n✅ Updated ${updatedCount} move entries with TM/HM numbers`);
  console.log(`⚠️  Skipped ${skippedCount} moves without TM/HM mappings`);

  if (notFoundMoves.size > 0) {
    console.log('\n❓ Moves without TM/HM mappings:');
    Array.from(notFoundMoves).sort().forEach(move => console.log(`  - ${move}`));
  }

  // Show some examples
  console.log('\n📝 Example updates:');
  const examplePokemon = ['pikachu', 'charizard', 'mewtwo'];
  for (const pokemon of examplePokemon) {
    if (pokemonMoves[pokemon]) {
      const machineMethod = Object.keys(pokemonMoves[pokemon]).find(k => k.startsWith('machine-'));
      if (machineMethod && pokemonMoves[pokemon][machineMethod]?.moves) {
        const moves = pokemonMoves[pokemon][machineMethod].moves;
        const sampleMoves = Object.entries(moves).slice(0, 3);
        console.log(`\n${pokemon} (${machineMethod}):`);
        sampleMoves.forEach(([move, tm]) => console.log(`  ${move}: ${tm}`));
      }
      break;
    }
  }
}

updatePokemonMovesWithTMHM();
