import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { JSDOM } from 'jsdom';

const STICKERS_URL = 'https://bulbapedia.bulbagarden.net/wiki/Sticker#List_of_Stickers_in_Generation_VIII';
const ACCESSORIES_URL = 'https://bulbapedia.bulbagarden.net/wiki/Accessory#List_of_Accessories';

const slugify = (str) =>
  str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

const clientFor = (url) => (url.startsWith('https') ? https : http);

const fetchText = (url) =>
  new Promise((resolve, reject) => {
    clientFor(url).get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        return resolve(fetchText(next));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });

const normalizeImageUrl = (src) => {
  const url = new URL(src, 'https://archives.bulbagarden.net');
  const parts = url.pathname.split('/');
  const idx = parts.indexOf('thumb');
  if (idx !== -1) {
    // Remove "thumb" segment and the size/variant segment at the end
    parts.splice(idx, 1);
    parts.pop();
    url.pathname = parts.join('/');
  }
  return url.toString();
};

const fetchBinary = (url, dest) =>
  new Promise((resolve, reject) => {
    ensureDir(path.dirname(dest));
    const file = fs.createWriteStream(dest);
    const headers = { 'User-Agent': 'Mozilla/5.0', Referer: 'https://bulbapedia.bulbagarden.net/' };
    clientFor(url)
      .get(url, { headers }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          const next = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).href;
          return resolve(fetchBinary(next, dest));
        }
        if (res.statusCode !== 200) {
          file.close();
          return reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      })
      .on('error', (err) => {
        file.close();
        reject(err);
      });
  });

const parseStickers = (html) => {
  const doc = new JSDOM(html).window.document;
  const table = doc.querySelector('#List_of_Stickers_in_Generation_VIII')?.closest('h3')?.nextElementSibling;
  const rows = [...(table?.querySelectorAll('tr') || [])].slice(1);
  let type = '';
  let letter = '';
  const entries = [];

  for (const tr of rows) {
    for (const th of tr.querySelectorAll('th')) {
      const txt = th.textContent.trim();
      if (/Stickers?$/i.test(txt) || /Sticker$/i.test(txt)) {
        type = txt;
        letter = '';
      } else if (/^[A-Z]$/i.test(txt)) {
        letter = txt;
      }
    }

    const tds = [...tr.querySelectorAll('td')];
    if (!tds.length) continue;
    const img = tds[0].querySelector('img');
    if (!img) continue;

    const typeSingular = type.replace(/ Stickers$/i, ' Sticker');
    const base = slugify(typeSingular);
    const slug = letter ? `${base}-${letter.toLowerCase()}` : base;
    entries.push({ slug, url: normalizeImageUrl(img.getAttribute('src')) });
  }

  return entries;
};

const parseAccessories = (html) => {
  const doc = new JSDOM(html).window.document;
  const table = doc.querySelector('#List_of_Accessories')?.closest('h2')?.nextElementSibling?.nextElementSibling;
  const rows = [...(table?.querySelectorAll('tr') || [])].slice(2);
  const entries = [];

  for (const tr of rows) {
    const tds = [...tr.querySelectorAll('td')];
    if (tds.length < 3) continue;
    const img = tds[1]?.querySelector('img');
    const name = tds[2].textContent.trim();
    if (!img) continue;
    entries.push({ slug: slugify(name), url: normalizeImageUrl(img.getAttribute('src')) });
  }

  return entries;
};

const downloadAll = async (label, entries, outDir) => {
  ensureDir(outDir);
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const { slug, url } of entries) {
    const dest = path.join(outDir, `${slug}.png`);
    if (fs.existsSync(dest)) {
      skipped += 1;
      continue;
    }
    try {
      await fetchBinary(url, dest);
      downloaded += 1;
    } catch (err) {
      failed += 1;
      console.error(`[${label}] Failed ${slug}: ${err.message}`);
    }
  }

  console.log(`[${label}] downloaded ${downloaded}, skipped ${skipped}, failed ${failed}, total ${entries.length}`);
};

const main = async () => {
  console.log('Fetching sticker and accessory pages from Bulbapedia...');
  const [stickersHtml, accessoriesHtml] = await Promise.all([
    fetchText(STICKERS_URL),
    fetchText(ACCESSORIES_URL),
  ]);

  const stickerEntries = parseStickers(stickersHtml);
  const accessoryEntries = parseAccessories(accessoriesHtml);

  console.log(`Parsed ${stickerEntries.length} stickers, ${accessoryEntries.length} accessories`);

  await downloadAll('stickers', stickerEntries, path.join('public', 'images', 'stickers'));
  await downloadAll('accessories', accessoryEntries, path.join('public', 'images', 'accessories'));
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
