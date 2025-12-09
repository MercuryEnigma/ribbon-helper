import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '..', 'src', 'data');

const GENERATION_CONFIG = {
  3: {
    movesFile: 'pokemon_moves_rse.json',
    outputFile: 'contest_moves_rse.json',
    comboType: 'normal',
    effectKey: 'contest_effect'
  },
  4: {
    movesFile: 'pokemon_moves_dppt.json',
    outputFile: 'contest_moves_dppt.json',
    comboType: 'super',
    effectKey: 'super_contest_effect'
  }
};

async function fetchMoveData(moveName) {
  return new Promise((resolve, reject) => {
    const url = `https://pokeapi.co/api/v2/move/${moveName}`;

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

function processMoveData(moveData, generationConfig) {
  // Get contest type
  const contestType = moveData.contest_type ? moveData.contest_type.name : null;

  // Get contest/super contest effect ID
  let effectId = null;
  const effectData = moveData[generationConfig.effectKey];
  if (effectData && effectData.url) {
    const urlParts = effectData.url.split('/');
    effectId = parseInt(urlParts[urlParts.length - 2]);
  }

  // Get contest combos
  const combos = {
    before: [],
    after: []
  };

  const comboSource = moveData.contest_combos?.[generationConfig.comboType];
  if (comboSource) {
    if (comboSource.use_before) {
      combos.before = comboSource.use_before.map(m => m.name);
    }
    if (comboSource.use_after) {
      combos.after = comboSource.use_after.map(m => m.name);
    }
  }

  return {
    type: contestType,
    effect: effectId,
    combos: combos
  };
}

async function fetchAllContestMoves() {
  const generation = Number(process.argv[2] || 3);
  const generationConfig = GENERATION_CONFIG[generation];
  if (!generationConfig) {
    throw new Error('Please provide a supported generation number (3 or 4)');
  }

  // Load pokemon moves file to get all unique moves
  const movesDataPath = path.join(DATA_DIR, generationConfig.movesFile);
  const pokemonMovesData = JSON.parse(fs.readFileSync(movesDataPath, 'utf8'));

  // Extract all unique move names
  const allMoves = new Set();

  for (const pokemon in pokemonMovesData) {
    if (pokemonMovesData[pokemon] === null) continue;

    for (const methodKey in pokemonMovesData[pokemon]) {
      const methodData = pokemonMovesData[pokemon][methodKey];
      const moves = methodData.moves;

      if (Array.isArray(moves)) {
        // For arrays (tutor, machine, egg)
        moves.forEach(move => allMoves.add(move));
      } else if (typeof moves === 'object') {
        // For objects (level-up)
        Object.keys(moves).forEach(move => allMoves.add(move));
      }
    }
  }

  const movesList = Array.from(allMoves).sort();
  console.log(`Found ${movesList.length} unique moves to fetch`);

  const contestMovesData = {};

  for (let i = 0; i < movesList.length; i++) {
    const moveName = movesList[i];

    try {
      console.log(`[${i + 1}/${movesList.length}] Fetching data for ${moveName}...`);
      const moveData = await fetchMoveData(moveName);
      const processedData = processMoveData(moveData, generationConfig);

      contestMovesData[moveName] = processedData;

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error fetching ${moveName}:`, error.message);
      // Set to null if move doesn't exist
      contestMovesData[moveName] = null;
    }
  }

  // Write to JSON file
  const outputPath = path.join(DATA_DIR, generationConfig.outputFile);
  fs.writeFileSync(outputPath, JSON.stringify(contestMovesData, null, 2));

  console.log(`\nSuccessfully saved data for ${Object.keys(contestMovesData).length} moves to ${outputPath}`);
}

fetchAllContestMoves().catch(console.error);
