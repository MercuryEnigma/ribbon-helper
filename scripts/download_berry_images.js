import fs from 'fs';
import path from 'path';
import https from 'https';

const BERRIES_JSON = path.join('src', 'data', 'berries_dppt.json');
const OUT_DIR = path.join('public', 'images', 'berries');
const BASE_URL =
  'https://raw.githubusercontent.com/msikma/pokesprite/master/icons/berry';

const slugify = (str) =>
  str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

const downloadBinary = (url, dest) =>
  new Promise((resolve, reject) => {
    ensureDir(path.dirname(dest));
    const file = fs.createWriteStream(dest);

    const headers = { 'User-Agent': 'Mozilla/5.0' };
    const req = https.get(url, { headers }, (res) => {
      if (
        res.statusCode &&
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        file.close();
        return resolve(downloadBinary(next, dest));
      }

      if (res.statusCode !== 200) {
        file.close();
        return reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
      }

      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', (err) => {
        file.close();
        reject(err);
      });
    });

    req.on('error', (err) => {
      file.close();
      reject(err);
    });
  });

const loadBerryNames = () => {
  const data = JSON.parse(fs.readFileSync(BERRIES_JSON, 'utf8'));
  return Object.keys(data);
};

const downloadAll = async () => {
  const berries = loadBerryNames();
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const name of berries) {
    const slug = slugify(name);
    const url = `${BASE_URL}/${slug}.png`;
    const dest = path.join(OUT_DIR, `${slug}.png`);

    if (fs.existsSync(dest)) {
      try {
        const { size } = fs.statSync(dest);
        if (size > 0) {
          skipped += 1;
          continue;
        }
        fs.rmSync(dest, { force: true });
      } catch {
        // fallthrough to download
      }
    }

    try {
      await downloadBinary(url, dest);
      downloaded += 1;
      console.log(`Downloaded ${slug}`);
    } catch (err) {
      failed += 1;
      console.error(`Failed ${slug}: ${err.message}`);
    }
  }

  console.log(
    `Berries downloaded ${downloaded}, skipped ${skipped}, failed ${failed}, total ${berries.length}`
  );
};

downloadAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
