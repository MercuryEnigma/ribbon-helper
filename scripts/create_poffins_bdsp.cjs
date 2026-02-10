const fs = require("fs");
const path = require("path");

const bdsppoffinsPath = path.join(__dirname, "../src/data/bdsp_poffins.json");
const berriesPath = path.join(__dirname, "../src/data/berries_dppt.json");
const outputPath = path.join(__dirname, "../src/data/poffins_bdsp.json");

const bdsppoffins = JSON.parse(fs.readFileSync(bdsppoffinsPath, "utf-8"));
const berries = JSON.parse(fs.readFileSync(berriesPath, "utf-8"));

// First pass: collect entries and detect name collisions
const entries = [];
const baseNameCount = {};

for (const [key, poffin] of Object.entries(bdsppoffins)) {
  const berryNames = poffin.berries.split(", ");
  const baseName = berryNames[0] + " " + berryNames[berryNames.length - 1];

  let damage = false;
  let pinch = false;

  for (const name of berryNames) {
    const berry = berries[name];
    if (!berry) {
      console.error(`Berry "${name}" not found (poffin: ${key})`);
      continue;
    }
    if (berry.damage) damage = true;
    if (berry.br) pinch = true;
  }

  const { set, common, ...rest } = poffin;
  entries.push({ baseName, berryNames, data: { ...rest, damage, pinch } });
  baseNameCount[baseName] = (baseNameCount[baseName] || 0) + 1;
}

// Second pass: resolve collisions and build result
const result = {};

for (const entry of entries) {
  let name = entry.baseName;
  if (baseNameCount[name] > 1) {
    const middle = entry.berryNames.slice(1, -1).map(n => n.slice(0, 2)).join("");
    name = name + " " + middle;
  }
  result[name] = entry.data;
}

fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + "\n");
console.log(`Wrote ${Object.keys(result).length} poffins to ${outputPath}`);
