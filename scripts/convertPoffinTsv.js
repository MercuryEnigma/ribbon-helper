import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tsvPath = path.join(__dirname, '../src/data/Gen 4 Poffin list.tsv');
const jsonPath = path.join(__dirname, '../src/data/poffins.json');

const tsvContent = fs.readFileSync(tsvPath, 'utf-8');
const lines = tsvContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));

const poffins = {};

lines.forEach(line => {
  const parts = line.split('\t');

  const players = parseInt(parts[0]);
  const berries = parts[1].trim();
  const spicy = parseInt(parts[2]) || 0;
  const dry = parseInt(parts[3]) || 0;
  const sweet = parseInt(parts[4]) || 0;
  const bitter = parseInt(parts[5]) || 0;
  const sour = parseInt(parts[6]) || 0;
  const feel = parseInt(parts[7]) || 0;
  const platinum = parts[8] === 'TRUE';
  const pdr = parts[9] === 'TRUE';
  const frontier = parts[10] === 'TRUE';
  const event = parts[11] === 'TRUE';
  const mild = parts[12] === 'TRUE';
  const finishing = parts[13] === 'TRUE';

  let nickname;

  // Special case: Mild gift
  if (mild) {
    nickname = 'Mild gift';
  }
  // Special case: Platinum poffins (they use the berries field directly)
  else if (platinum && players === 1 && berries.includes('-')) {
    nickname = berries;
  }
  // Regular cases
  else {
    const berryList = berries.split(', ');

    if (berryList.length === 1) {
      nickname = `${berryList[0]} ${players}P`;
    } else {
      const firstBerry = berryList[0];
      const additionalBerries = berryList.slice(1).map(b => b.substring(0, 2)).join('');
      nickname = `${firstBerry}-${additionalBerries} ${players}P`;
    }
  }

  poffins[nickname] = {
    berries: berries,
    spicy,
    dry,
    sweet,
    bitter,
    sour,
    feel,
    players,
    platinum,
    mild,
    pdr,
    frontier,
    event,
    finishing
  };
});

fs.writeFileSync(jsonPath, JSON.stringify(poffins, null, 2));
console.log(`Converted ${Object.keys(poffins).length} poffins to ${jsonPath}`);
