import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchContestEffect(id) {
  return new Promise((resolve, reject) => {
    const url = `https://pokeapi.co/api/v2/contest-effect/${id}`;

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);

          // Find English effect description and flavor text
          const effectEntry = parsed.effect_entries.find(e => e.language.name === 'en');
          const flavorEntry = parsed.flavor_text_entries.find(f => f.language.name === 'en');

          resolve({
            id: parsed.id,
            appeal: parsed.appeal,
            jam: parsed.jam,
            effect_description: effectEntry ? effectEntry.effect : '',
            flavor_text: flavorEntry ? flavorEntry.flavor_text : ''
          });
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

async function fetchAllContestEffects() {
  const contestEffects = {};

  console.log('Fetching contest effects from PokeAPI...');

  for (let id = 1; id <= 33; id++) {
    try {
      console.log(`Fetching contest effect ${id}/33...`);
      const effect = await fetchContestEffect(id);
      contestEffects[id] = effect;

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error fetching contest effect ${id}:`, error.message);
    }
  }

  // Write to JSON file
  const outputPath = path.join(__dirname, 'src', 'data', 'contest_effects_rse.json');
  fs.writeFileSync(outputPath, JSON.stringify(contestEffects, null, 2));

  console.log(`\nSuccessfully saved ${Object.keys(contestEffects).length} contest effects to ${outputPath}`);
}

fetchAllContestEffects().catch(console.error);
