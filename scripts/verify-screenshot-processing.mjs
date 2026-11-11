// Focused real-fixture/browser verification. Start Vite first. No Form submits.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

let playwright;
try { playwright = await import('playwright'); }
catch {
  for (const entry of await readdir(join(homedir(), '.npm/_npx')).catch(() => [])) {
    const candidate = join(homedir(), '.npm/_npx', entry, 'node_modules/playwright/index.mjs');
    if (existsSync(candidate)) { playwright = await import(pathToFileURL(candidate).href); break; }
  }
}
if (!playwright) throw new Error('Install Playwright, or run npx playwright --version to make it available in the npm cache.');
const executablePath = process.env.SCREENSHOT_BROWSER_PATH || (existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined);
const browser = await playwright.chromium.launch({ headless: true, executablePath });
const page = await browser.newPage();
page.setDefaultTimeout(120000);
const output = join(tmpdir(), 'ribbon-screenshot-verification');
await mkdir(output, { recursive: true });
const inspect = process.argv.includes('--inspect');
const uiOnly = process.argv.includes('--ui-only');
const site = process.env.SCREENSHOT_SITE_URL || 'http://127.0.0.1:5173';
try {
  await page.goto(new URL('/guides/ribbon-checker', site).href);
  const groups = [
    // The Switch examples show nicknames. OCR should leave species unselected.
    { folder: 'swsh-images', game: 'swsh', species: undefined },
    { folder: 'bdsp-images', game: 'bdsp', species: undefined },
    { folder: 'sv-images', game: 'sv', species: undefined },
    { folder: 'ribbondol', game: 'home', species: 'claydol' },
  ].filter(group => !uiOnly && (!process.argv.some(arg => arg.startsWith('--game=')) || process.argv.includes(`--game=${group.game}`)));
  const reports = [];
  for (const group of groups) {
    const files = (await readdir(resolve('home-images', group.folder))).filter(name => /\.(png|jpe?g)$/i.test(name)).sort().map(name => `/home-images/${group.folder}/${name}`);
    const batches = inspect ? [files] : [...files.map(file => [file]), files];
    if (group.game === 'home') batches.splice(0, batches.length, files, ['/home-images/ribbondol-home.PNG']);
    for (const [index, paths] of batches.entries()) {
      const report = await page.evaluate(async paths => {
        const { screenshotProcessor } = await import('/src/screenshot-processor/ScreenshotProcessor.ts');
        const files = await Promise.all(paths.map(async path => {
          const response = await fetch(path);
          return new File([await response.blob()], path.split('/').pop(), { type: /\.png$/i.test(path) ? 'image/png' : 'image/jpeg' });
        }));
        const { canvas, analysis } = await screenshotProcessor.process(files);
        return { game: analysis.game, species: analysis.identity.candidates[0]?.pokemonKey, confirmed: analysis.identityConfirmed, ribbons: analysis.detectedRibbonIds,
          uncertain: analysis.ribbonMatches.filter(match => !match.accepted).map(match => ({ best: match.best.ribbonId, confidence: match.confidence, margin: match.margin })),
          warnings: analysis.warnings, size: [canvas.width, canvas.height], image: canvas.toDataURL('image/png').split(',')[1] };
      }, paths);
      const { image, ...summary } = report;
      await writeFile(join(output, `${group.game}-${index + 1}.png`), Buffer.from(image, 'base64'));
      reports.push({ paths, ...summary });
      console.log(`${group.game}, ${paths.length} image(s): ${report.ribbons.length} ribbons, ${report.uncertain.length} uncertain, species ${report.species ?? '(manual selection)'}`);
      if (inspect && report.uncertain.length) console.log(JSON.stringify(report.uncertain));
      if (!inspect) {
        assert.equal(report.game, group.game);
        assert.equal(report.species, group.species);
        assert.equal(report.confirmed, group.game === 'home');
        assert.ok(report.ribbons.length > 0);
      }
    }
  }
  if (reports.length) await writeFile(join(output, 'results.json'), JSON.stringify(reports, null, 2));
  if (!inspect && (groups.length === 4 || uiOnly)) {
    if (!uiOnly) {
      const baseline = reports.find(report => report.game === 'home').ribbons;
      // Manually checked collection differences in these supplied fixtures.
      const expected = {
        swsh: baseline.filter(id => id !== 'twinkling-star-ribbon'),
        bdsp: baseline,
        sv: [...baseline, 'paldea-champion-ribbon', 'hisui-ribbon', 'itemfinder-mark', 'partner-mark', 'gourmand-mark'],
      };
      for (const game of Object.keys(expected)) {
        const report = reports.find(report => report.game === game && report.paths.length > 1);
        assert.deepEqual(new Set(report.ribbons), new Set(expected[game]), `${game}: consolidated ribbon collection`);
      }
    }
    const sampleName = (await readdir('home-images/swsh-images')).sort()[0];
    const sample = resolve('home-images/swsh-images', sampleName);
    const svName = (await readdir('home-images/sv-images')).sort()[0];
    const mixError = await page.evaluate(async paths => {
      const { screenshotProcessor } = await import('/src/screenshot-processor/ScreenshotProcessor.ts');
      const files = await Promise.all(paths.map(async path => new File([await (await fetch(path)).blob()], path, { type: 'image/jpeg' })));
      try { await screenshotProcessor.process(files); return ''; } catch (error) { return error.message; }
    }, [`/home-images/swsh-images/${sampleName}`, `/home-images/sv-images/${svName}`]);
    assert.match(mixError, /different games/);

    // Check both real upload widgets and manual species selection. The Sheet
    // fixture is intercepted locally so no live contest needs to be open.
    console.log('Verifying Ribbon Checker upload and manual selection');
    await page.goto(new URL('/guides/ribbon-checker', site).href);
    await page.getByLabel('Upload screenshots').setInputFiles(sample);
    await page.getByRole('button', { name: 'Check ribbons', exact: true }).click();
    await page.getByRole('heading', { name: 'Ribbon analysis', exact: true }).waitFor();
    assert.equal(await page.getByLabel('Pokémon', { exact: true }).inputValue(), '');
    await page.getByLabel('Pokémon', { exact: true }).selectOption('claydol');
    assert.equal(await page.getByLabel('Pokémon', { exact: true }).inputValue(), 'claydol');

    console.log('Verifying answer-first Ribbon Puzzles flow and Form prefill');
    await page.route('https://docs.google.com/spreadsheets/**', route => route.fulfill({ contentType: 'text/csv', body: 'contest number,title,puzzle text,opening time,closing time,reveal time,answer Pokémon,answer Ribbons\n1,Local verification,Fixture puzzle,2020-01-01,2099-01-01,2099-02-01,Claydol,Tower Master Ribbon' }));
    await page.goto(new URL('/guides/ribbon-puzzles', site).href);
    await page.getByRole('heading', { name: 'Check your answer', exact: true }).waitFor();
    assert.equal(await page.locator('.home-merger__step-number').count(), 3);
    assert.equal(await page.getByLabel('Upload screenshots').count(), 0);
    assert.equal(await page.getByTitle('Ribbon Puzzles submission form').count(), 0);
    await page.getByRole('button', { name: 'Check', exact: true }).click();
    await page.getByText('Select the Pokémon species.', { exact: true }).waitFor();
    await page.getByLabel('Pokémon', { exact: true }).selectOption('bulbasaur');
    const requiredRibbon = page.getByRole('checkbox', { name: /^Tower Master Ribbon/ });
    await requiredRibbon.check();
    await page.getByRole('button', { name: 'Check', exact: true }).click();
    await page.getByText('Not quite. That Pokémon does not solve the puzzle. Check the puzzle and try again.').waitFor();
    assert.equal(await page.getByLabel('Upload screenshots').count(), 0);
    await page.getByLabel('Pokémon', { exact: true }).selectOption('claydol');
    assert.equal(await page.getByLabel('Upload screenshots').count(), 0);
    await page.getByRole('button', { name: 'Check', exact: true }).click();
    await page.getByText('Correct! Your Pokémon solved the puzzle! Upload your screenshots below.').waitFor();
    assert.equal(await page.getByTitle('Ribbon Puzzles submission form').count(), 0);
    await page.getByLabel('Upload screenshots').setInputFiles(sample);
    await page.getByAltText('Your uploaded ribbon screenshot').waitFor();
    await page.getByTitle('Ribbon Puzzles submission form').waitFor();
    const url = new URL(await page.getByTitle('Ribbon Puzzles submission form').getAttribute('src'));
    assert.equal(url.searchParams.get('entry.911552280'), 'claydol');
    assert.equal(url.searchParams.get('entry.2097695600'), 'tower-master-ribbon', 'Form uses the manually checked ribbons, not screenshot detections');
    assert.equal(await page.getByLabel('Pokémon', { exact: true }).inputValue(), 'claydol');
    assert.ok(await page.getByRole('link', { name: 'Download combined image', exact: true }).isVisible());
    await requiredRibbon.uncheck();
    assert.equal(await page.getByTitle('Ribbon Puzzles submission form').count(), 0);
    assert.equal(await page.getByLabel('Upload screenshots').count(), 0);
    await page.getByRole('checkbox', { name: /^Effort Ribbon/ }).check();
    await page.getByRole('button', { name: 'Check', exact: true }).click();
    await page.getByText('Not quite. That Pokémon does not solve the puzzle. Check the puzzle and try again.').waitFor();
    await requiredRibbon.check();
    await page.getByRole('button', { name: 'Check', exact: true }).click();
    await page.getByLabel('Upload screenshots').waitFor();
    assert.equal(await page.getByTitle('Ribbon Puzzles submission form').count(), 0, 'Edited answers require a new upload');
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Contest uploader fits a phone viewport');
    await page.getByLabel('Pokémon', { exact: true }).selectOption('bulbasaur');
    assert.equal(await page.getByTitle('Ribbon Puzzles submission form').count(), 0);
    console.log('Both upload flows, answer-first contest gating, manual-answer preservation, and Form prefilling verified. No Form responses submitted.');
  }
  console.log(`Consolidated PNGs and report: ${output}`);
} finally { await browser.close(); }
