import fs from 'fs';
import path from 'path';
import https from 'https';

const POFFIN_IMAGES = {
  'spicy-dry': 'https://archives.bulbagarden.net/media/upload/4/4d/Spicy-Dry_Poffin.png',
  'spicy-sweet': 'https://archives.bulbagarden.net/media/upload/9/91/Spicy-Sweet_Poffin.png',
  'spicy-bitter': 'https://archives.bulbagarden.net/media/upload/e/ee/Spicy-Bitter_Poffin.png',
  'spicy-sour': 'https://archives.bulbagarden.net/media/upload/1/1d/Spicy-Sour_Poffin.png',
  'dry-sweet': 'https://archives.bulbagarden.net/media/upload/a/ad/Dry-Sweet_Poffin.png',
  'dry-bitter': 'https://archives.bulbagarden.net/media/upload/5/51/Dry-Bitter_Poffin.png',
  'dry-sour': 'https://archives.bulbagarden.net/media/upload/9/94/Dry-Sour_Poffin.png',
  'sweet-bitter': 'https://archives.bulbagarden.net/media/upload/5/56/Sweet-Bitter_Poffin.png',
  'sweet-sour': 'https://archives.bulbagarden.net/media/upload/3/3c/Sweet-Sour_Poffin.png',
  'bitter-sour': 'https://archives.bulbagarden.net/media/upload/b/bb/Bitter-Sour_Poffin.png',
  'mild': 'https://archives.bulbagarden.net/media/upload/f/f9/Mild_Poffin.png'
};

const OUT_DIR = path.join('public', 'images', 'poffins');

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

const downloadImage = (url, dest) =>
  new Promise((resolve, reject) => {
    ensureDir(path.dirname(dest));

    const headers = {
      'User-Agent': 'Mozilla/5.0',
      Referer: 'https://bulbapedia.bulbagarden.net/'
    };

    const request = https.get(url, { headers }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirects from Bulbagarden
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        request.destroy();
        return resolve(downloadImage(next, dest));
      }

      if (res.statusCode !== 200) {
        request.destroy();
        return reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
      }

      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', (err) => {
        file.close();
        reject(err);
      });
    });

    request.on('error', reject);
  });

const downloadAll = async () => {
  ensureDir(OUT_DIR);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const [slug, url] of Object.entries(POFFIN_IMAGES)) {
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
      await downloadImage(url, dest);
      downloaded += 1;
      console.log(`Downloaded ${slug}`);
    } catch (err) {
      failed += 1;
      console.error(`Failed ${slug}: ${err.message}`);
    }
  }

  console.log(`Poffins downloaded ${downloaded}, skipped ${skipped}, failed ${failed}, total ${Object.keys(POFFIN_IMAGES).length}`);
};

downloadAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
