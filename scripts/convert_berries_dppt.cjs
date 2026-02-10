const fs = require("fs");
const path = require("path");

const csvPath = path.join(__dirname, "../src/data/berries_dppt.csv");
const jsonPath = path.join(__dirname, "../src/data/berries_dppt.json");

const csv = fs.readFileSync(csvPath, "utf-8").trim();
const lines = csv.split("\n");
const result = {};

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].replace(/\r$/, "").split(",");
  const name = cols[0];
  result[name] = {
    name,
    spicy: Number(cols[1]),
    dry: Number(cols[2]),
    sweet: Number(cols[3]),
    bitter: Number(cols[4]),
    sour: Number(cols[5]),
    smoothness: Number(cols[6]),
    event: cols[7] === "TRUE",
    br: cols[8] === "TRUE",
    frontier: cols[9] === "TRUE",
    damage: cols[10] === "TRUE",
  };
}

fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2) + "\n");
console.log(`Wrote ${Object.keys(result).length} berries to ${jsonPath}`);
