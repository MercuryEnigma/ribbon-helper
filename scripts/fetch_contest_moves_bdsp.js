import fs from 'fs';
import https from 'https';
import path from 'path';
import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_URL = 'https://bulbapedia.bulbagarden.net/wiki/Super_Contest_Show#Move_Effects';

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
    .replace(/’/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function findMoveEffectsTable(document) {
  const headline = document.querySelector('#Move_Effects');
  if (!headline) {
    throw new Error('Could not find Move Effects headline');
  }

  let node = headline.closest('h4')?.nextElementSibling;
  while (node && node.tagName !== 'TABLE') {
    node = node.nextElementSibling;
  }

  if (!node || node.tagName !== 'TABLE') {
    throw new Error('Could not find Move Effects table');
  }

  return node;
}

async function buildContestMoveData() {
  const html = await fetchHtml(SOURCE_URL);
  const dom = new JSDOM(html);
  const table = findMoveEffectsTable(dom.window.document);

  // Skip the two header rows
  const dataRows = Array.from(table.querySelectorAll('tr')).slice(2);

  const contestMoves = {};
  const contestEffects = {};
  let effectId = 0;

  for (const row of dataRows) {
    const cells = Array.from(row.querySelectorAll('td'));
    if (cells.length === 0) continue;

    if (cells.length === 1 && cells[0].colSpan === 4) {
      continue; // separator row
    }

    const description = cleanText(cells[0].textContent || '');
    if (!description) continue;

    const currentEffectId = effectId++;
    contestEffects[currentEffectId] = {
      id: currentEffectId,
      effect_description: description,
      flavor_text: description
    };

    const moveCells = cells.slice(1);
    for (let i = 0; i < moveCells.length; i++) {
      const cell = moveCells[i];
      const hype = moveCells.length === 1 && cell.colSpan === 3 ? 0 : i + 1;
      const anchors = Array.from(cell.querySelectorAll('a[title]'));

      for (const anchor of anchors) {
        const moveName = normalizeMoveName(anchor.textContent || '');
        if (!moveName) continue;

        const existing = contestMoves[moveName];
        if (existing && (existing.effect !== currentEffectId || existing.hype !== hype)) {
          console.warn(
            `Move "${moveName}" already mapped to effect ${existing.effect}/hype ${existing.hype},` +
              ` new mapping ${currentEffectId}/${hype}`
          );
        }

        contestMoves[moveName] = { effect: currentEffectId, hype };
      }
    }
  }

  const dataDir = path.join(__dirname, '..', 'src', 'data');
  fs.writeFileSync(
    path.join(dataDir, 'contest_moves_bdsp.json'),
    JSON.stringify(contestMoves, null, 2)
  );
  fs.writeFileSync(
    path.join(dataDir, 'contest_effects_bdsp.json'),
    JSON.stringify(contestEffects, null, 2)
  );

  console.log(`Wrote ${Object.keys(contestMoves).length} moves and ${effectId} effects.`);
}

buildContestMoveData().catch((error) => {
  console.error(error);
  process.exit(1);
});
