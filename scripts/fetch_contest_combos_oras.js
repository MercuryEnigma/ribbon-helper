import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchBulbapediaPage() {
  return new Promise((resolve, reject) => {
    const url = 'https://bulbapedia.bulbagarden.net/wiki/Contest_combination';

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve(data);
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

function normalizeMoveName(name) {
  // Convert move name to lowercase and replace spaces with hyphens
  return name.toLowerCase().trim().replace(/\s+/g, '-');
}

function parseContestSpectacularsCombos(html) {
  // Find the Contest Spectaculars section
  // Look for the heading and then find the content after it
  // It's an h3 heading, not h2
  const spectacularsMatch = html.match(/Contest[_\s]Spectaculars<\/span><\/h3>([\s\S]*?)(?=<h[23]|$)/);

  if (!spectacularsMatch) {
    throw new Error('Could not find Contest Spectaculars section');
  }

  const spectacularsSection = spectacularsMatch[1];

  // Find all tables in the Contest Spectaculars section
  const tableRegex = /<table[^>]*class="[^"]*roundy[^"]*"[^>]*>([\s\S]*?)<\/table>/g;
  const tables = [];
  let match;

  while ((match = tableRegex.exec(spectacularsSection)) !== null) {
    tables.push(match[1]);
  }

  console.log(`Found ${tables.length} combo tables in Contest Spectaculars section`);

  const combos = {};

  // Parse each table
  for (const tableContent of tables) {
    // Extract rows
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    const rows = [];
    let rowMatch;

    while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
      rows.push(rowMatch[1]);
    }

    // Skip header row (first row)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      // Extract cells
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
      const cells = [];
      let cellMatch;

      while ((cellMatch = cellRegex.exec(row)) !== null) {
        cells.push(cellMatch[1]);
      }

      if (cells.length < 2) continue;

      // First cell contains the first move
      // Second cell contains the second move
      // Extract move names from links like <a href="/wiki/Move_name" title="Move name">Move name</a>
      const moveLinkRegex = /<a href="\/wiki\/([^"]+)"[^>]*>([^<]+)<\/a>/g;

      const firstMoveLinks = [];
      let firstMoveMatch;
      while ((firstMoveMatch = moveLinkRegex.exec(cells[0])) !== null) {
        firstMoveLinks.push(firstMoveMatch[2]);
      }

      // Reset regex
      moveLinkRegex.lastIndex = 0;
      const secondMoveLinks = [];
      let secondMoveMatch;
      while ((secondMoveMatch = moveLinkRegex.exec(cells[1])) !== null) {
        secondMoveLinks.push(secondMoveMatch[2]);
      }

      // Process all combinations
      for (const firstMove of firstMoveLinks) {
        const firstMoveNormalized = normalizeMoveName(firstMove);

        if (!combos[firstMoveNormalized]) {
          combos[firstMoveNormalized] = {
            before: new Set(),
            after: new Set()
          };
        }

        for (const secondMove of secondMoveLinks) {
          const secondMoveNormalized = normalizeMoveName(secondMove);

          // First move comes BEFORE second move in the combo
          // So firstMove.combos.before should include secondMove
          combos[firstMoveNormalized].before.add(secondMoveNormalized);

          // And secondMove.combos.after should include firstMove
          if (!combos[secondMoveNormalized]) {
            combos[secondMoveNormalized] = {
              before: new Set(),
              after: new Set()
            };
          }
          combos[secondMoveNormalized].after.add(firstMoveNormalized);
        }
      }
    }
  }

  // Convert Sets to Arrays
  const result = {};
  for (const [move, data] of Object.entries(combos)) {
    result[move] = {
      before: Array.from(data.before).sort(),
      after: Array.from(data.after).sort()
    };
  }

  return result;
}

async function updateContestMovesWithCombos() {
  console.log('Fetching Bulbapedia page...');
  const html = await fetchBulbapediaPage();

  console.log('Parsing Contest Spectaculars combos...');
  const combos = parseContestSpectacularsCombos(html);

  console.log(`Found combos for ${Object.keys(combos).length} moves`);

  // Load existing contest moves data
  const dataDir = path.resolve(__dirname, '..', 'src', 'data');
  const contestMovesPath = path.join(dataDir, 'contest_moves_oras.json');
  const contestMoves = JSON.parse(fs.readFileSync(contestMovesPath, 'utf8'));

  // Update moves with combo data
  let updatedCount = 0;
  let notFoundCount = 0;
  const notFoundMoves = [];

  for (const [moveName, comboData] of Object.entries(combos)) {
    if (contestMoves[moveName]) {
      // Only add combos if there are any
      const combosToAdd = {};
      if (comboData.before.length > 0) {
        combosToAdd.before = comboData.before;
      }
      if (comboData.after.length > 0) {
        combosToAdd.after = comboData.after;
      }

      if (Object.keys(combosToAdd).length > 0) {
        contestMoves[moveName].combos = combosToAdd;
        updatedCount++;
      }
    } else {
      notFoundCount++;
      notFoundMoves.push(moveName);
    }
  }

  // Write updated data
  fs.writeFileSync(contestMovesPath, JSON.stringify(contestMoves, null, 2));

  console.log(`\n✅ Updated ${updatedCount} moves with combo data`);
  console.log(`⚠️  ${notFoundCount} moves from combos not found in contest_moves_oras.json`);

  if (notFoundMoves.length > 0 && notFoundMoves.length <= 20) {
    console.log('Not found moves:', notFoundMoves.join(', '));
  }

  // Print some examples
  console.log('\nExample combos added:');
  const exampleMoves = ['rest', 'yawn', 'belly-drum', 'charm'].filter(m => contestMoves[m]?.combos);
  for (const move of exampleMoves.slice(0, 3)) {
    console.log(`\n${move}:`, JSON.stringify(contestMoves[move].combos, null, 2));
  }
}

updateContestMovesWithCombos().catch(console.error);
