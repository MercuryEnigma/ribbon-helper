import fs from 'fs';
import https from 'https';
import path from 'path';
import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTEST_TYPES = {
  'Cool': 'https://bulbapedia.bulbagarden.net/wiki/Cool_(condition)',
  'Beautiful': 'https://bulbapedia.bulbagarden.net/wiki/Beautiful_(condition)',
  'Cute': 'https://bulbapedia.bulbagarden.net/wiki/Cute_(condition)',
  'Clever': 'https://bulbapedia.bulbagarden.net/wiki/Clever_(condition)',
  'Tough': 'https://bulbapedia.bulbagarden.net/wiki/Tough_(condition)'
};

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ribbon-helper/1.0)',
            'Accept-Encoding': 'identity'
          }
        },
        (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => resolve(data));
        }
      )
      .on('error', (error) => reject(error));
  });
}

function normalizeMoveName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cleanText(text) {
  return text
    .replace(/[–—−]/g, '-')
    .replace(/'/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function findHoennSpectacularTable(document) {
  // Find the "Hoenn Contest Spectaculars" headline
  const headings = Array.from(document.querySelectorAll('h3, h4'));
  const hoennHeading = headings.find(h =>
    h.textContent.includes('Hoenn Contest Spectaculars')
  );

  if (!hoennHeading) {
    throw new Error('Could not find "Hoenn Contest Spectaculars" heading');
  }

  // Find the next table after this heading
  let node = hoennHeading.nextElementSibling;
  while (node && node.tagName !== 'TABLE') {
    node = node.nextElementSibling;
  }

  if (!node || node.tagName !== 'TABLE') {
    throw new Error('Could not find Hoenn Contest Spectaculars table');
  }

  return node;
}

function getOrCreateEffect(description, appeal, jam, contestEffects) {
  // Check if we've already seen this effect (only check flavor_text)
  for (const [id, effect] of Object.entries(contestEffects)) {
    if (effect.flavor_text === description) {
      // If we found it but appeal/jam differ, log a warning
      if (effect.appeal !== appeal || effect.jam !== jam) {
        console.warn(`Effect "${description}" found with different stats. Using first occurrence (Appeal: ${effect.appeal}, Jam: ${effect.jam}) instead of (Appeal: ${appeal}, Jam: ${jam})`);
      }
      return parseInt(id);
    }
  }

  // Create a new effect
  const newId = Object.keys(contestEffects).length + 1;
  contestEffects[newId] = {
    id: newId,
    appeal: appeal,
    jam: jam,
    flavor_text: description
  };

  console.log(`Created new effect ${newId}: "${description}" (Appeal: ${appeal}, Jam: ${jam})`);
  return newId;
}

async function fetchContestMovesForType(typeName, typeUrl, contestEffects) {
  console.log(`Fetching ${typeName} moves from ${typeUrl}...`);

  const html = await fetchHtml(typeUrl);
  const dom = new JSDOM(html);
  const table = findHoennSpectacularTable(dom.window.document);

  const moves = {};

  // The table structure has rows with 10 cells containing:
  // [0-3]: Appeal info, [4-7]: Jam info, [8]: Description, [9]: Moves list
  const rows = Array.from(table.querySelectorAll('tr'));

  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll('td'));

    // We need rows with 10 cells that contain the full data
    if (cells.length !== 10) continue;

    // Parse appeal and jam from first cells
    const appealText = cleanText(cells[0].textContent || '');
    const jamText = cleanText(cells[4].textContent || '');
    const description = cleanText(cells[8].textContent || '');
    const movesText = cleanText(cells[9].textContent || '');

    const appeal = parseInt(appealText) || 0;
    const jam = parseInt(jamText) || 0;

    if (!description || !movesText) continue;

    // Get or create effect ID
    const effectId = getOrCreateEffect(description, appeal, jam, contestEffects);

    // Parse the moves list - extract move links from the cell
    const moveLinks = Array.from(cells[9].querySelectorAll('a[title]'));

    for (const moveLink of moveLinks) {
      const moveName = normalizeMoveName(moveLink.textContent || '');
      if (!moveName) continue;

      if (moves[moveName] && moves[moveName].effect !== effectId) {
        console.warn(
          `Move "${moveName}" already exists with effect ${moves[moveName].effect}, ` +
          `found again with effect ${effectId}`
        );
      }

      moves[moveName] = {
        type: typeName.toLowerCase(),
        effect: effectId
      };
    }
  }

  console.log(`Found ${Object.keys(moves).length} ${typeName} moves`);
  return moves;
}

async function buildOrasContestMoveData() {
  const dataDir = path.join(__dirname, '..', 'src', 'data');

  // Start with empty contest effects
  const contestEffects = {};
  const allMoves = {};

  // Fetch moves for each contest type
  for (const [typeName, typeUrl] of Object.entries(CONTEST_TYPES)) {
    const typeMoves = await fetchContestMovesForType(typeName, typeUrl, contestEffects);

    // Merge into allMoves, checking for conflicts
    for (const [moveName, moveData] of Object.entries(typeMoves)) {
      if (allMoves[moveName]) {
        console.warn(
          `Move "${moveName}" already exists with type ${allMoves[moveName].type}, ` +
          `found again as ${moveData.type}`
        );
      }
      allMoves[moveName] = moveData;
    }

    // Add a small delay to be nice to Bulbapedia's servers
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Save contest effects
  const effectsPath = path.join(dataDir, 'contest_effects_oras.json');
  fs.writeFileSync(effectsPath, JSON.stringify(contestEffects, null, 2));
  console.log(`\nSaved ${Object.keys(contestEffects).length} contest effects to ${effectsPath}`);

  // Save contest moves
  const movesPath = path.join(dataDir, 'contest_moves_oras.json');
  fs.writeFileSync(movesPath, JSON.stringify(allMoves, null, 2));
  console.log(`Saved ${Object.keys(allMoves).length} contest moves to ${movesPath}`);
}

buildOrasContestMoveData().catch((error) => {
  console.error(error);
  process.exit(1);
});
