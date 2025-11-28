import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tsvPath = path.join(__dirname, '../src/data/bdsp poffins.tsv');
const jsonPath = path.join(__dirname, '../src/data/bdsp_poffins.json');

const tsvContent = fs.readFileSync(tsvPath, 'utf-8');
const lines = tsvContent.split('\n').filter(line => line.trim());

const poffins = {};

// Track count within each set
const setCounts = {};

lines.forEach((line, index) => {
  // Skip header
  if (index === 0) return;

  const parts = line.split('\t');

  const berries = parts[0].trim();
  // Parse flavors - empty string means 0, numbers are actual values
  const spicy = parts[1] && parts[1].trim() !== '' ? parseInt(parts[1]) : 0;
  const dry = parts[2] && parts[2].trim() !== '' ? parseInt(parts[2]) : 0;
  const sweet = parts[3] && parts[3].trim() !== '' ? parseInt(parts[3]) : 0;
  const bitter = parts[4] && parts[4].trim() !== '' ? parseInt(parts[4]) : 0;
  const sour = parts[5] && parts[5].trim() !== '' ? parseInt(parts[5]) : 0;
  const sheen = parseInt(parts[6]) || 0;
  const sheen_friendship = parseInt(parts[7]) || 0;
  const set = parts[8].trim();
  const common = parts[9] && parts[9].trim() === 'TRUE';

  // Track the count for this set
  if (!setCounts[set]) {
    setCounts[set] = 0;
  }
  setCounts[set]++;

  // Generate poffin name: "Set X-N"
  const poffinName = `Set ${set}-${setCounts[set]}`;

  poffins[poffinName] = {
    berries,
    spicy,
    dry,
    sweet,
    bitter,
    sour,
    sheen,
    sheen_friendship,
    set,
    common
  };
});

fs.writeFileSync(jsonPath, JSON.stringify(poffins, null, 2));
console.log(`Converted ${Object.keys(poffins).length} BDSP poffins to ${jsonPath}`);
