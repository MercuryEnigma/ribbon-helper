import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function processMoveData(moveData) {
  // Get contest type
  const contestType = moveData.contest_type ? moveData.contest_type.name : null;

  // Get contest effect ID
  let effectId = null;
  if (moveData.contest_effect && moveData.contest_effect.url) {
    const urlParts = moveData.contest_effect.url.split('/');
    effectId = parseInt(urlParts[urlParts.length - 2]);
  }

  // Get contest combos
  const combos = {
    before: [],
    after: []
  };

  if (moveData.contest_combos && moveData.contest_combos.normal) {
    // Use normal contest combos (RSE uses normal contests)
    if (moveData.contest_combos.normal.use_before) {
      combos.before = moveData.contest_combos.normal.use_before.map(m => m.name);
    }
    if (moveData.contest_combos.normal.use_after) {
      combos.after = moveData.contest_combos.normal.use_after.map(m => m.name);
    }
  }

  return {
    type: contestType,
    effect: effectId,
    combos: combos
  };
}

async function fetchAllContestMoves() {
  // Load pokemon_moves_rse.json to get all unique moves
  const movesDataPath = path.join(__dirname, 'src', 'data', 'pokemon_moves_rse.json');
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
      const processedData = processMoveData(moveData);

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
  const outputPath = path.join(__dirname, 'src', 'data', 'contest_moves_rse.json');
  fs.writeFileSync(outputPath, JSON.stringify(contestMovesData, null, 2));

  console.log(`\nSuccessfully saved data for ${Object.keys(contestMovesData).length} moves to ${outputPath}`);
}

fetchAllContestMoves().catch(console.error);
