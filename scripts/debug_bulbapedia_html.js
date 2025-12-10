import https from 'https';
import fs from 'fs';

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

async function debug() {
  const html = await fetchBulbapediaPage();

  // Look for "Contest Spectaculars" in the HTML
  const searchTerm = 'Contest Spectaculars';
  const index = html.indexOf(searchTerm);

  if (index !== -1) {
    // Get 500 characters before and after
    const start = Math.max(0, index - 200);
    const end = Math.min(html.length, index + 500);
    const snippet = html.substring(start, end);

    console.log('Found "Contest Spectaculars" at index:', index);
    console.log('\nSnippet around it:');
    console.log('=' .repeat(80));
    console.log(snippet);
    console.log('=' .repeat(80));
  } else {
    console.log('Did not find "Contest Spectaculars" in the HTML');
  }

  // Also save the full HTML to a file for inspection
  fs.writeFileSync('/tmp/bulbapedia_contest.html', html);
  console.log('\nFull HTML saved to /tmp/bulbapedia_contest.html');
}

debug().catch(console.error);
