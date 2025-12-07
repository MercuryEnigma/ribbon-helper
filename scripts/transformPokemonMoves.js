import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// TM and HM mapping
const TM_HM_MAP = {
  'focus-punch': 'tm-01',
  'dragon-claw': 'tm-02',
  'water-pulse': 'tm-03',
  'calm-mind': 'tm-04',
  'roar': 'tm-05',
  'toxic': 'tm-06',
  'hail': 'tm-07',
  'bulk-up': 'tm-08',
  'bullet-seed': 'tm-09',
  'hidden-power': 'tm-10',
  'sunny-day': 'tm-11',
  'taunt': 'tm-12',
  'ice-beam': 'tm-13',
  'blizzard': 'tm-14',
  'hyper-beam': 'tm-15',
  'light-screen': 'tm-16',
  'protect': 'tm-17',
  'rain-dance': 'tm-18',
  'giga-drain': 'tm-19',
  'safeguard': 'tm-20',
  'frustration': 'tm-21',
  'solar-beam': 'tm-22',
  'iron-tail': 'tm-23',
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
  'shock-wave': 'tm-34',
  'flamethrower': 'tm-35',
  'sludge-bomb': 'tm-36',
  'sandstorm': 'tm-37',
  'fire-blast': 'tm-38',
  'rock-tomb': 'tm-39',
  'aerial-ace': 'tm-40',
  'torment': 'tm-41',
  'facade': 'tm-42',
  'secret-power': 'tm-43',
  'rest': 'tm-44',
  'attract': 'tm-45',
  'thief': 'tm-46',
  'steel-wing': 'tm-47',
  'skill-swap': 'tm-48',
  'snatch': 'tm-49',
  'overheat': 'tm-50',
  'cut': 'hm-01',
  'fly': 'hm-02',
  'surf': 'hm-03',
  'strength': 'hm-04',
  'flash': 'hm-05',
  'rock-smash': 'hm-06',
  'waterfall': 'hm-07',
  'dive': 'hm-08',
};

function transformPokemonMoves(inputPath, outputPath) {
  console.log('Reading pokemon_moves_rse.json...');
  const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

  const transformedData = {};

  for (const [pokemonKey, pokemonData] of Object.entries(data)) {
    transformedData[pokemonKey] = {};

    for (const [methodKey, methodData] of Object.entries(pokemonData)) {
      const version = methodData.version;
      const moves = methodData.moves;

      // Determine the learn method type
      const isLevelUp = methodKey.startsWith('level-up-');
      const isMachine = methodKey.startsWith('machine-');
      const isTutor = methodKey.startsWith('tutor-');
      const isEgg = methodKey.startsWith('egg-');
      const isPurification = methodKey.startsWith('purification');
      const isLightBallEgg = methodKey.startsWith('light-ball-egg-');

      if (isLevelUp) {
        // Convert level-up moves: numbers to strings
        const transformedMoves = {};
        for (const [moveName, level] of Object.entries(moves)) {
          transformedMoves[moveName] = String(level);
        }
        transformedData[pokemonKey][methodKey] = {
          version,
          moves: transformedMoves,
        };
      } else if (isMachine) {
        // Convert machine moves: arrays to objects with TM/HM numbers
        const transformedMoves = {};
        for (const moveName of moves) {
          const tmHmValue = TM_HM_MAP[moveName];
          if (tmHmValue) {
            transformedMoves[moveName] = tmHmValue;
          } else {
            console.warn(`Warning: No TM/HM mapping found for move "${moveName}" in ${pokemonKey}`);
            transformedMoves[moveName] = 'unknown';
          }
        }
        transformedData[pokemonKey][methodKey] = {
          version,
          moves: transformedMoves,
        };
      } else if (isTutor || isEgg || isPurification || isLightBallEgg) {
        // Convert tutor/egg/purification/light-ball-egg moves: arrays to objects with method name
        const transformedMoves = {};
        let methodName;

        if (isTutor) methodName = 'tutor';
        else if (isEgg) methodName = 'egg';
        else if (isPurification) methodName = 'purification';
        else if (isLightBallEgg) methodName = 'light-ball-egg';

        for (const moveName of moves) {
          transformedMoves[moveName] = methodName;
        }
        transformedData[pokemonKey][methodKey] = {
          version,
          moves: transformedMoves,
        };
      } else {
        // Keep any other method as-is
        console.warn(`Warning: Unknown method key "${methodKey}" for ${pokemonKey}`);
        transformedData[pokemonKey][methodKey] = methodData;
      }
    }
  }

  console.log('Writing transformed data...');
  fs.writeFileSync(outputPath, JSON.stringify(transformedData, null, 2), 'utf8');
  console.log('Done! Transformed file written to:', outputPath);
}

// Run the transformation
const inputPath = path.join(__dirname, '../src/data/pokemon_moves_rse.json');
const outputPath = path.join(__dirname, '../src/data/pokemon_moves_rse.json');

transformPokemonMoves(inputPath, outputPath);
