#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read pokemon.json
const pokemonData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'src/data/pokemon.json'), 'utf8')
);

const pokemonKeys = Object.keys(pokemonData);
const imageMapping = {};
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Normalize pokemon key to match PokeAPI naming
function normalizeKeyForPokeAPI(key) {
  // PokeAPI uses hyphens, our keys already use hyphens
  // But we need to handle special cases
  return key
    .replace('mr-mime', 'mr-mime')
    .replace('farfetchd', 'farfetchd')
    .replace('nidoran-f', 'nidoran-f')
    .replace('nidoran-m', 'nidoran-m');
}

// Extract base species name from key
function getBaseSpeciesName(key) {
  // For forms like "pikachu-alola-cap", base is "pikachu"
  // For regional forms like "diglett-alola", base is "diglett"
  const parts = key.split('-');

  // Special cases
  if (key.startsWith('mr-mime')) return 'mr-mime';
  if (key === 'farfetchd' || key.startsWith('farfetchd-')) return 'farfetchd';
  if (key.startsWith('nidoran-f')) return 'nidoran-f';
  if (key.startsWith('nidoran-m')) return 'nidoran-m';

  return parts[0];
}

// Check if this is a base pokemon or a form
function isBaseForm(key) {
  return !key.includes('-');
}

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
      // Rate limited or server error, wait and retry
      await delay(2000 * (i + 1));
    } catch (error) {
      if (i === retries - 1) throw error;
      await delay(2000 * (i + 1));
    }
  }
  return null;
}

// Find variety in species data
function findVarietyInSpecies(speciesData, pokemonKey) {
  if (!speciesData || !speciesData.varieties) return null;

  const normalizedKey = normalizeKeyForPokeAPI(pokemonKey);

  // Try exact match first
  for (const variety of speciesData.varieties) {
    if (variety.pokemon.name === normalizedKey) {
      return variety.pokemon.url;
    }
  }

  // Try fuzzy match
  for (const variety of speciesData.varieties) {
    const varietyName = variety.pokemon.name;

    // Handle cases like "pikachu-alola-cap" -> variety might be "pikachu-original-cap"
    if (varietyName.includes(normalizedKey) || normalizedKey.includes(varietyName)) {
      return variety.pokemon.url;
    }

    // Try matching key parts
    const keyParts = normalizedKey.split('-');
    const nameParts = varietyName.split('-');

    // If all parts of our key are in the variety name
    if (keyParts.every(part => nameParts.includes(part))) {
      return variety.pokemon.url;
    }
  }

  return null;
}

// Get sprite URL for a pokemon
async function getSpriteUrl(pokemonKey) {
  try {
    console.log(`Fetching ${pokemonKey}...`);

    if (isBaseForm(pokemonKey)) {
      // Direct lookup for base forms
      const normalizedKey = normalizeKeyForPokeAPI(pokemonKey);
      const pokemonData = await fetchWithRetry(`https://pokeapi.co/api/v2/pokemon/${normalizedKey}`);

      if (pokemonData && pokemonData.sprites?.other?.home?.front_default) {
        return pokemonData.sprites.other.home.front_default;
      }
    } else {
      // For forms, use species API
      const baseSpecies = getBaseSpeciesName(pokemonKey);
      const speciesData = await fetchWithRetry(`https://pokeapi.co/api/v2/pokemon-species/${baseSpecies}`);

      if (!speciesData) {
        console.log(`  ⚠️  Species not found for ${pokemonKey}`);
        return null;
      }

      // Find the right variety
      const varietyUrl = findVarietyInSpecies(speciesData, pokemonKey);

      if (!varietyUrl) {
        console.log(`  ⚠️  Variety not found for ${pokemonKey}`);
        return null;
      }

      // Fetch the pokemon data from the variety URL
      const pokemonData = await fetchWithRetry(varietyUrl);

      if (pokemonData && pokemonData.sprites?.other?.home?.front_default) {
        return pokemonData.sprites.other.home.front_default;
      }
    }

    console.log(`  ⚠️  No sprite found for ${pokemonKey}`);
    return null;

  } catch (error) {
    console.error(`  ❌ Error fetching ${pokemonKey}:`, error.message);
    return null;
  }
}

// Main function
async function main() {
  console.log(`Starting fetch for ${pokemonKeys.length} pokemon...`);

  let processed = 0;
  const total = pokemonKeys.length;

  for (const key of pokemonKeys) {
    const spriteUrl = await getSpriteUrl(key);
    imageMapping[key] = spriteUrl;

    processed++;
    if (processed % 10 === 0) {
      console.log(`Progress: ${processed}/${total} (${Math.round(processed/total*100)}%)`);
      // Save progress periodically
      fs.writeFileSync(
        path.join(__dirname, 'src/data/pokemon_images.json'),
        JSON.stringify(imageMapping, null, 2)
      );
    }

    // Rate limiting - wait between requests
    await delay(100);
  }

  // Final save
  fs.writeFileSync(
    path.join(__dirname, 'src/data/pokemon_images.json'),
    JSON.stringify(imageMapping, null, 2)
  );

  const successCount = Object.values(imageMapping).filter(url => url !== null).length;
  const failCount = total - successCount;

  console.log('\n✅ Done!');
  console.log(`Successfully fetched: ${successCount}/${total}`);
  console.log(`Failed: ${failCount}/${total}`);

  if (failCount > 0) {
    console.log('\nFailed pokemon:');
    Object.entries(imageMapping)
      .filter(([_, url]) => url === null)
      .forEach(([key, _]) => console.log(`  - ${key}`));
  }
}

main().catch(console.error);
