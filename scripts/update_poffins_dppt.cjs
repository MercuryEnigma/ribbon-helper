const fs = require("fs");
const path = require("path");

const poffinsPath = path.join(__dirname, "../src/data/poffins.json");
const berriesPath = path.join(__dirname, "../src/data/berries_dppt.json");
const outputPath = path.join(__dirname, "../src/data/poffins_dppt.json");

const poffins = JSON.parse(fs.readFileSync(poffinsPath, "utf-8"));
const berries = JSON.parse(fs.readFileSync(berriesPath, "utf-8"));

const TIME = 60;
const MISTAKES = 0;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

const result = {};

for (const [key, poffin] of Object.entries(poffins)) {
  if (poffin.platinum || poffin.mild) {
    result[key] = poffin;
    continue;
  }

  const berryNames = poffin.berries.split(", ");

  let spicy = 0, dry = 0, sweet = 0, bitter = 0, sour = 0, smoothness = 0;
  let event = false, pdr = false, frontier = false, damage = true;

  for (const name of berryNames) {
    const berry = berries[name];
    if (!berry) {
      console.error(`Berry "${name}" not found (poffin: ${key}), keeping unchanged`);
      result[key] = poffin;
      continue;
    }
    spicy += berry.spicy;
    dry += berry.dry;
    sweet += berry.sweet;
    bitter += berry.bitter;
    sour += berry.sour;
    smoothness += berry.smoothness;
    if (berry.event) event = true;
    if (berry.br) pdr = true;
    if (berry.frontier) frontier = true;
    if (berry.damage) damage = true;
  }

  const numNegatives = [spicy, dry, sweet, bitter, sour].filter(v => v < 0).length;
  const feel = Math.floor(smoothness / berryNames.length) - berryNames.length;

  result[key] = {
    ...poffin,
    spicy: clamp(Math.round((spicy - numNegatives - MISTAKES) * 60 / TIME), 0, 99),
    dry: clamp(Math.round((dry - numNegatives - MISTAKES) * 60 / TIME), 0, 99),
    sweet: clamp(Math.round((sweet - numNegatives - MISTAKES) * 60 / TIME), 0, 99),
    bitter: clamp(Math.round((bitter - numNegatives - MISTAKES) * 60 / TIME), 0, 99),
    sour: clamp(Math.round((sour - numNegatives - MISTAKES) * 60 / TIME), 0, 99),
    feel,
    players: berryNames.length,
    platinum: false,
    mild: false,
    damage,
    pdr,
    frontier,
    event,
  };
}

fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + "\n");
console.log(`Wrote ${Object.keys(result).length} poffins to ${outputPath}`);
