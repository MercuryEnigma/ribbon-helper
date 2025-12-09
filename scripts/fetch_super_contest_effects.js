import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', 'src', 'data');

async function fetchSuperContestEffect(id) {
  return new Promise((resolve, reject) => {
    const url = `https://pokeapi.co/api/v2/super-contest-effect/${id}`;

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);

          const effectEntry = parsed.flavor_text_entries.find(e => e.language.name === 'en');

          resolve({
            id: parsed.id,
            appeal: parsed.appeal,
            effect_description: effectEntry ? effectEntry.flavor_text : ''
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

async function fetchAllSuperContestEffects() {
  const contestEffects = {};

  console.log('Fetching super contest effects from PokeAPI...');

  const total = 23;
  for (let id = 1; id <= total; id++) {
    try {
      console.log(`Fetching super contest effect ${id}/${total}...`);
      const effect = await fetchSuperContestEffect(id);
      contestEffects[id] = effect;

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error fetching super contest effect ${id}:`, error.message);
    }
  }

  // Write to JSON file
  const outputPath = path.join(DATA_DIR, 'super_contest_effects_dppt.json');
  fs.writeFileSync(outputPath, JSON.stringify(contestEffects, null, 2));

  console.log(`\nSuccessfully saved ${Object.keys(contestEffects).length} super contest effects to ${outputPath}`);
}

fetchAllSuperContestEffects().catch(console.error);
