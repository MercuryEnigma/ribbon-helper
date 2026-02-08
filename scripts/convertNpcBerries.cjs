const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '../src/data/npc_berries_rse.csv');
const jsonPath = path.join(__dirname, '../src/data/npc_berries_rse.json');

const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.trim().split('\n');

// Skip header row
const dataLines = lines.slice(1);

const result = {};

for (const line of dataLines) {
  const columns = line.split(',');
  const berry = columns[0].trim();
  const npc_1 = columns[1]?.trim() || '';
  const npc_2 = columns[2]?.trim() || '';
  const npc_3 = columns[3]?.trim() || '';
  const blend_master = columns[4]?.trim() || '';

  result[berry] = {
    npc_1,
    npc_2,
    npc_3,
    blend_master
  };
}

fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
console.log(`Converted ${Object.keys(result).length} berries to ${jsonPath}`);
