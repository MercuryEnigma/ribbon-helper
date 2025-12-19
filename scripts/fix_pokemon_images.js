#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read current pokemon_images.json
const imageMapping = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'src/data/pokemon_images.json'), 'utf8')
);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch with retry
async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
      if (response.status === 404) {
        return null;
      }
      await delay(2000 * (i + 1));
    } catch (error) {
      if (i === retries - 1) throw error;
      await delay(2000 * (i + 1));
    }
  }
  return null;
}

// Manual mappings for special cases
const manualFixes = {
  // Pokemon with hyphens in base name
  'ho-oh': 'ho-oh',
  'jangmo-o': 'jangmo-o',
  'hakamo-o': 'hakamo-o',
  'kommo-o': 'kommo-o',
  'tapu-koko': 'tapu-koko',
  'tapu-lele': 'tapu-lele',
  'tapu-bulu': 'tapu-bulu',
  'tapu-fini': 'tapu-fini',
  'type-null': 'type-null',
  'mr-rime': 'mr-rime',

  // Forms that should use base form
  'pikachu-cosplay': 'pikachu-rock-star', // Use rock-star as default cosplay
  'deoxys': 'deoxys-normal',
  'wormadam': 'wormadam-plant',
  'mime-jr': 'mime-jr',
  'giratina': 'giratina-altered',
  'shaymin': 'shaymin-land',
  'basculin': 'basculin-red-striped',
  'darmanitan': 'darmanitan-standard',
  'tornadus': 'tornadus-incarnate',
  'thundurus': 'thundurus-incarnate',
  'landorus': 'landorus-incarnate',
  'keldeo': 'keldeo-ordinary',
  'meloetta': 'meloetta-aria',
  'meowstic': 'meowstic-male',
  'aegislash': 'aegislash-shield',
  'pumpkaboo': 'pumpkaboo-average',
  'gourgeist': 'gourgeist-average',
  'zygarde': 'zygarde-50',
  'oricorio': 'oricorio-baile',
  'lycanroc': 'lycanroc-midday',
  'wishiwashi': 'wishiwashi-solo',
  'minior': 'minior-red-meteor',
  'mimikyu': 'mimikyu-disguised',
  'toxtricity': 'toxtricity-amped',
  'eiscue': 'eiscue-ice',
  'indeedee': 'indeedee-male',
  'morpeko': 'morpeko-full-belly',
  'urshifu': 'urshifu-single-strike',
  'basculegion': 'basculegion-male',
  'enamorus': 'enamorus-incarnate',
  'oinkologne': 'oinkologne-male',
  'maushold': 'maushold-family-of-four',
  'squawkabilly': 'squawkabilly-green-plumage',
  'palafin': 'palafin-zero',
  'tatsugiri': 'tatsugiri-curly',
  'dudunsparce': 'dudunsparce-two-segment',

  // Paradox Pokemon - use official API names
  'great-tusk': 'great-tusk',
  'scream-tail': 'scream-tail',
  'brute-bonnet': 'brute-bonnet',
  'flutter-mane': 'flutter-mane',
  'slither-wing': 'slither-wing',
  'sandy-shocks': 'sandy-shocks',
  'iron-treads': 'iron-treads',
  'iron-bundle': 'iron-bundle',
  'iron-hands': 'iron-hands',
  'iron-jugulis': 'iron-jugulis',
  'iron-moth': 'iron-moth',
  'iron-thorns': 'iron-thorns',
  'wo-chien': 'wo-chien',
  'chien-pao': 'chien-pao',
  'ting-lu': 'ting-lu',
  'chi-yu': 'chi-yu',
  'roaring-moon': 'roaring-moon',
  'iron-valiant': 'iron-valiant',
  'walking-wake': 'walking-wake',
  'iron-leaves': 'iron-leaves',
  'gouging-fire': 'gouging-fire',
  'raging-bolt': 'raging-bolt',
  'iron-boulder': 'iron-boulder',
  'iron-crown': 'iron-crown',
  'floette-eternal': null, // This form doesn't have a public sprite
};

async function fixPokemon(key) {
  if (imageMapping[key] !== null) {
    return; // Already has a value
  }

  const fixedName = manualFixes[key];

  if (fixedName === null) {
    console.log(`⚠️  ${key}: Permanently set to null (no sprite available)`);
    return;
  }

  if (!fixedName) {
    console.log(`⚠️  ${key}: No manual fix defined, skipping`);
    return;
  }

  try {
    console.log(`Fixing ${key} -> ${fixedName}...`);
    const pokemonData = await fetchWithRetry(`https://pokeapi.co/api/v2/pokemon/${fixedName}`);

    if (pokemonData && pokemonData.sprites?.other?.home?.front_default) {
      imageMapping[key] = pokemonData.sprites.other.home.front_default;
      console.log(`  ✅ Success!`);
    } else {
      console.log(`  ⚠️  No home sprite found`);
    }
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
  }

  await delay(100);
}

async function main() {
  const failedPokemon = Object.entries(imageMapping)
    .filter(([_, url]) => url === null)
    .map(([key, _]) => key);

  console.log(`Fixing ${failedPokemon.length} failed Pokemon...\n`);

  for (const key of failedPokemon) {
    await fixPokemon(key);
  }

  // Save results
  fs.writeFileSync(
    path.join(__dirname, 'src/data/pokemon_images.json'),
    JSON.stringify(imageMapping, null, 2)
  );

  const stillFailed = Object.values(imageMapping).filter(url => url === null).length;
  console.log(`\n✅ Done! Still failed: ${stillFailed}`);
}

main().catch(console.error);
