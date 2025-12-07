import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Gen 3 version groups we care about
const GEN3_VERSION_GROUPS = {
  'ruby-sapphire': 'rs',
  'emerald': 'e',
  'firered-leafgreen': 'frlg',
  'colosseum': 'co',
  'xd': 'xd'
};

async function fetchPokemonData(pokemonName) {
  return new Promise((resolve, reject) => {
    const url = `https://pokeapi.co/api/v2/pokemon/${pokemonName}`;

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

function processPokemonMoves(pokemonData) {
  // First, group moves by method and the exact set of versions they appear in
  const movesByMethodAndVersions = {};

  // Process each move
  for (const moveEntry of pokemonData.moves) {
    const moveName = moveEntry.move.name;

    // Filter for Gen 3 version groups
    const gen3Details = moveEntry.version_group_details.filter(detail =>
      detail.version_group.name in GEN3_VERSION_GROUPS
    );

    if (gen3Details.length === 0) continue;

    // Group by learn method
    const methodGroups = {};
    for (const detail of gen3Details) {
      const method = detail.move_learn_method.name;
      const versionShort = GEN3_VERSION_GROUPS[detail.version_group.name];
      const level = detail.level_learned_at;

      if (!methodGroups[method]) {
        methodGroups[method] = [];
      }
      methodGroups[method].push({ version: versionShort, level });
    }

    // For each method, create a version key
    for (const [method, versionData] of Object.entries(methodGroups)) {
      const versions = versionData.map(v => v.version);
      const versionKey = [...new Set(versions)].sort().join('');

      if (!movesByMethodAndVersions[method]) {
        movesByMethodAndVersions[method] = {};
      }

      if (!movesByMethodAndVersions[method][versionKey]) {
        movesByMethodAndVersions[method][versionKey] = {
          version: versionKey,
          moves: method === 'level-up' ? {} : []
        };
      }

      // For level-up moves, store as object with level as value
      if (method === 'level-up') {
        // Use the first level found (they should be the same across versions)
        const level = versionData[0].level;
        movesByMethodAndVersions[method][versionKey].moves[moveName] = level;
      } else {
        // For other methods, store as array
        movesByMethodAndVersions[method][versionKey].moves.push(moveName);
      }
    }
  }

  // Flatten into the final structure with keys like "tutor-e" or "tutor-efrlgxd"
  const result = {};
  for (const [method, versionGroups] of Object.entries(movesByMethodAndVersions)) {
    for (const [versionKey, data] of Object.entries(versionGroups)) {
      const key = `${method}-${versionKey}`;
      result[key] = data;
    }
  }

  return result;
}

function buildTargetPokemonList(pokemonData, singleTarget) {
  if (!singleTarget) {
    return Object.entries(pokemonData)
      .filter(([, info]) => info.natdex <= 385)
      .map(([name]) => name);
  }

  if (singleTarget === 'deoxys') {
    // PokeAPI exposes each forme separately
    return ['deoxys-normal', 'deoxys-attack', 'deoxys-defense', 'deoxys-speed'];
  }

  return [singleTarget];
}

async function fetchAllPokemonMoves() {
  const pokemonDataPath = path.join(__dirname, 'src', 'data', 'pokemon.json');
  const pokemonData = JSON.parse(fs.readFileSync(pokemonDataPath, 'utf8'));

  const singleTarget = process.argv[2] ? process.argv[2].toLowerCase() : null;
  const targetPokemon = buildTargetPokemonList(pokemonData, singleTarget);
  const isSingleFetch = !!singleTarget;

  console.log(`Found ${targetPokemon.length} Pokemon to process`);

  const outputPath = path.join(__dirname, 'src', 'data', 'pokemon_moves_rse.json');
  const allPokemonMoves = isSingleFetch && fs.existsSync(outputPath)
    ? JSON.parse(fs.readFileSync(outputPath, 'utf8'))
    : {};

  for (let i = 0; i < targetPokemon.length; i++) {
    const pokemonName = targetPokemon[i];

    try {
      console.log(`[${i + 1}/${targetPokemon.length}] Fetching moves for ${pokemonName}...`);
      const data = await fetchPokemonData(pokemonName);

      const moves = processPokemonMoves(data);

      // Only add if there are moves
      if (Object.keys(moves).length > 0) {
        allPokemonMoves[pokemonName] = moves;
      } else {
        // No Gen 3 moves found
        allPokemonMoves[pokemonName] = null;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 150));
    } catch (error) {
      console.error(`Error fetching ${pokemonName}:`, error.message);
      // Set to null if Pokemon doesn't exist in API
      allPokemonMoves[pokemonName] = null;
    }
  }

  // Write to JSON file
  fs.writeFileSync(outputPath, JSON.stringify(allPokemonMoves, null, 2));

  console.log(`\nSuccessfully saved moves for ${Object.keys(allPokemonMoves).length} Pokemon to ${outputPath}`);
}

fetchAllPokemonMoves().catch(console.error);
