import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEN3_VERSION_GROUPS = {
  'ruby-sapphire': 'rs',
  'emerald': 'e',
  'firered-leafgreen': 'frlg',
  'colosseum': 'co',
  'xd': 'xd'
};

const GEN4_VERSION_GROUPS = {
  'diamond-pearl': 'dp',
  'platinum': 'pt',
  'heartgold-soulsilver': 'hgss',
};

const GEN8_VERSION_GROUPS = {
  'brilliant-diamond-and-shining-pearl': 'bdsp',
};

const GENERATION_MAX_NATDEX = {
  3: 386,
  4: 493,
  8: 493,
};

const VERSION_GROUPS_BY_GEN = {
  3: GEN3_VERSION_GROUPS,
  4: GEN4_VERSION_GROUPS,
  8: GEN8_VERSION_GROUPS,
};

const FORM_GROUPS = {
  deoxys: ['deoxys-normal', 'deoxys-attack', 'deoxys-defense', 'deoxys-speed'],
  wormadam: ['wormadam-plant', 'wormadam-sandy', 'wormadam-trash'],
  rotom: ['rotom', 'rotom-wash', 'rotom-heat', 'rotom-mow', 'rotom-fan', 'rotom-frost'],
  giratina: ['giratina-altered', 'giratina-origin'],
  shaymin: ['shaymin-land', 'shaymin-sky']
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

function processPokemonMoves(pokemonData, versionGroups) {
  // First, group moves by method and the exact set of versions they appear in
  const movesByMethodAndVersions = {};

  // Process each move
  for (const moveEntry of pokemonData.moves) {
    const moveName = moveEntry.move.name;

    // Filter for version groups relevant to the selected generation
    const generationDetails = moveEntry.version_group_details.filter(detail =>
      detail.version_group.name in versionGroups
    );

    if (generationDetails.length === 0) continue;

    // Group by learn method
    const methodGroups = {};
    for (const detail of generationDetails) {
      const method = detail.move_learn_method.name;
      const versionShort = versionGroups[detail.version_group.name];
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
          moves: {}
        };
      }

      // For level-up moves, store as object with level as value
      if (method === 'level-up') {
        // Use the first level found (they should be the same across versions)
        const level = versionData[0].level;
        movesByMethodAndVersions[method][versionKey].moves[moveName] = level;
      } else {
        // For other methods, store as array
        movesByMethodAndVersions[method][versionKey].moves[moveName] = method;
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

function combineFormData(formDatas) {
  const moveMap = new Map();

  for (const data of formDatas) {
    for (const moveEntry of data.moves || []) {
      const moveName = moveEntry.move.name;
      if (!moveMap.has(moveName)) {
        moveMap.set(moveName, []);
      }

      const existingDetails = moveMap.get(moveName);
      for (const detail of moveEntry.version_group_details || []) {
        const detailKey = `${detail.move_learn_method.name}-${detail.version_group.name}-${detail.level_learned_at}`;
        const alreadyIncluded = existingDetails.some(
          d => `${d.move_learn_method.name}-${d.version_group.name}-${d.level_learned_at}` === detailKey
        );
        if (!alreadyIncluded) {
          existingDetails.push({
            move_learn_method: { name: detail.move_learn_method.name },
            version_group: { name: detail.version_group.name },
            level_learned_at: detail.level_learned_at
          });
        }
      }
    }
  }

  const combinedMoves = [];
  for (const [name, details] of moveMap.entries()) {
    combinedMoves.push({
      move: { name },
      version_group_details: details
    });
  }

  return { moves: combinedMoves };
}

function buildTargetPokemonList(pokemonData, generation, targetNames) {
  if (!targetNames || targetNames.length === 0) {
    return Object.entries(pokemonData)
      .filter(([, info]) => info.natdex <= GENERATION_MAX_NATDEX[generation])
      .map(([name]) => name);
  }

  return targetNames;
}

function getOutputPath(generation, dataDir) {
  if (generation === 3) {
    return path.join(dataDir, 'pokemon_moves_rse.json');
  }

  if (generation === 4) {
    return path.join(dataDir, 'pokemon_moves_dppt.json');
  }

  if (generation === 8) {
    return path.join(dataDir, 'pokemon_moves_bdsp.json');
  }

  return path.join(dataDir, `pokemon_moves_gen${generation}.json`);
}

async function fetchAllPokemonMoves() {
  const dataDir = path.resolve(__dirname, '..', 'src', 'data');
  const pokemonDataPath = path.join(dataDir, 'pokemon.json');
  const pokemonData = JSON.parse(fs.readFileSync(pokemonDataPath, 'utf8'));

  const generation = Number(process.argv[2]);
  if (!Number.isInteger(generation) || !(generation in VERSION_GROUPS_BY_GEN)) {
    throw new Error('Please provide a supported generation number (e.g., 3, 4, or 8)');
  }

  const targetNames = process.argv.slice(3).map(arg => arg.toLowerCase());
  const versionGroups = VERSION_GROUPS_BY_GEN[generation];

  const targetPokemon = buildTargetPokemonList(pokemonData, generation, targetNames);
  const isSingleFetch = targetNames.length > 0;

  console.log(`Found ${targetPokemon.length} Pokemon to process for gen ${generation}`);

  const outputPath = getOutputPath(generation, dataDir);
  const allPokemonMoves = isSingleFetch && fs.existsSync(outputPath)
    ? JSON.parse(fs.readFileSync(outputPath, 'utf8'))
    : {};

  for (let i = 0; i < targetPokemon.length; i++) {
    const pokemonName = targetPokemon[i];

    try {
      console.log(`[${i + 1}/${targetPokemon.length}] Fetching moves for ${pokemonName}...`);
      const formNames = FORM_GROUPS[pokemonName] || [pokemonName];
      const formData = [];

      for (const formName of formNames) {
        const data = await fetchPokemonData(formName);
        formData.push(data);
      }

      const combinedData = formData.length > 1 ? combineFormData(formData) : formData[0];

      const moves = processPokemonMoves(combinedData, versionGroups);

      // Only add if there are moves
      if (Object.keys(moves).length > 0) {
        allPokemonMoves[pokemonName] = moves;
      } else {
        // No moves for this generation found
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
