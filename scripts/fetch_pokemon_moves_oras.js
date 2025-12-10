import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Gen 6 version groups for ORAS
const GEN6_VERSION_GROUPS = {
  'x-y': 'xy',
  'omega-ruby-alpha-sapphire': 'oras'
};

// Mapping from pokemon.json keys to PokeAPI keys
// Use this when the key in our data doesn't match PokeAPI's naming convention
const POKEAPI_KEY_MAPPING = {
  'keldeo': 'keldeo-ordinary',
  'pikachu-cosplay-belle': 'pikachu-belle',
  'pikachu-cosplay-libre': 'pikachu-libre',
  'pikachu-cosplay-phd': 'pikachu-phd',
  'pikachu-cosplay-popstar': 'pikachu-pop-star',
  'pikachu-cosplay-rockstar': 'pikachu-rock-star',
  'basculin': 'basculin-red-striped',
  'darmanitan': 'darmanitan-standard',
  'tornadus': 'tornadus-incarnate',
  'thundurus': 'thundurus-incarnate',
  'landorus': 'landorus-incarnate',
  'meloetta': 'meloetta-aria',
  'zygarde': 'zygarde-50'
};

// Pokemon with multiple forms that should be combined
// This includes forms that have different moves across different forms
const FORM_GROUPS = {
  deoxys: ['deoxys-normal', 'deoxys-attack', 'deoxys-defense', 'deoxys-speed'],
  wormadam: ['wormadam-plant', 'wormadam-sandy', 'wormadam-trash'],
  rotom: ['rotom', 'rotom-wash', 'rotom-heat', 'rotom-mow', 'rotom-fan', 'rotom-frost'],
  giratina: ['giratina-altered', 'giratina-origin'],
  shaymin: ['shaymin-land', 'shaymin-sky'],
  // Gen 6 forms
  meowstic: ['meowstic-male', 'meowstic-female'],
  aegislash: ['aegislash-shield', 'aegislash-blade'],
  pumpkaboo: ['pumpkaboo-average', 'pumpkaboo-small', 'pumpkaboo-large', 'pumpkaboo-super'],
  gourgeist: ['gourgeist-average', 'gourgeist-small', 'gourgeist-large', 'gourgeist-super'],
  // Megas and Primals are cosmetic for move purposes, but include if they exist
  // Vivillon, Flabébé, Floette, Florges, Furfrou have cosmetic forms only
};

// Maximum national dex number for Gen 6 (through Volcanion)
const GEN6_MAX_NATDEX = 721;

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

    // Filter for version groups relevant to Gen 6 (X/Y or ORAS)
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

  // Flatten into the final structure with keys like "tutor-xy" or "tutor-oras"
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

function buildTargetPokemonList(pokemonData, targetNames) {
  if (targetNames && targetNames.length > 0) {
    return targetNames;
  }

  // Get all Pokemon that appear in X, Y, OR, or AS
  const orasGames = ['x', 'y', 'or', 'as'];

  return Object.entries(pokemonData)
    .filter(([, info]) => {
      // Check if natdex is within Gen 6 range
      if (info.natdex > GEN6_MAX_NATDEX) return false;

      // Check if the Pokemon appears in any ORAS game
      const games = info.games || [];
      return games.some(game => orasGames.includes(game));
    })
    .map(([name]) => name);
}

async function fetchAllPokemonMoves() {
  const dataDir = path.resolve(__dirname, '..', 'src', 'data');
  const pokemonDataPath = path.join(dataDir, 'pokemon.json');
  const pokemonData = JSON.parse(fs.readFileSync(pokemonDataPath, 'utf8'));

  const targetNames = process.argv.slice(2).map(arg => arg.toLowerCase());
  const versionGroups = GEN6_VERSION_GROUPS;

  const targetPokemon = buildTargetPokemonList(pokemonData, targetNames);
  const isSingleFetch = targetNames.length > 0;

  console.log(`Found ${targetPokemon.length} Pokemon to process for ORAS`);

  const outputPath = path.join(dataDir, 'pokemon_moves_oras.json');
  const allPokemonMoves = isSingleFetch && fs.existsSync(outputPath)
    ? JSON.parse(fs.readFileSync(outputPath, 'utf8'))
    : {};

  for (let i = 0; i < targetPokemon.length; i++) {
    const pokemonName = targetPokemon[i];

    try {
      console.log(`[${i + 1}/${targetPokemon.length}] Fetching moves for ${pokemonName}...`);

      // Check if this Pokemon has multiple forms that need to be combined
      const formNames = FORM_GROUPS[pokemonName] || [pokemonName];
      const formData = [];

      for (const formName of formNames) {
        try {
          // Apply PokeAPI key mapping if it exists
          const apiKey = POKEAPI_KEY_MAPPING[formName] || formName;
          const data = await fetchPokemonData(apiKey);
          formData.push(data);
        } catch (error) {
          // If a specific form doesn't exist, try without it
          console.warn(`  Warning: Could not fetch ${formName} (API key: ${POKEAPI_KEY_MAPPING[formName] || formName}): ${error.message}`);
        }
      }

      if (formData.length === 0) {
        console.warn(`  No data found for ${pokemonName}`);
        allPokemonMoves[pokemonName] = null;
        continue;
      }

      // Combine form data if multiple forms exist
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

  const successCount = Object.values(allPokemonMoves).filter(v => v !== null).length;
  console.log(`\nSuccessfully saved moves for ${successCount} Pokemon to ${outputPath}`);
  console.log(`Total entries (including nulls): ${Object.keys(allPokemonMoves).length}`);
}

fetchAllPokemonMoves().catch(console.error);
