import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read the JSON files
const pokemonPath = path.join(__dirname, 'src/data/pokemon.json');
const formIconsPath = path.join(__dirname, 'src/data/form_icons.json');

const pokemon = JSON.parse(fs.readFileSync(pokemonPath, 'utf8'));
const formIcons = JSON.parse(fs.readFileSync(formIconsPath, 'utf8'));

// Find all Pokemon forms with data-source field
const formsWithDataSource = [];
for (const [key, value] of Object.entries(pokemon)) {
  if (value['data-source']) {
    formsWithDataSource.push(key);
  }
}

console.log(`Found ${formsWithDataSource.length} Pokemon forms with data-source field`);

// Check which forms are missing from form_icons.json
const missingForms = [];
for (const form of formsWithDataSource) {
  if (!(form in formIcons)) {
    missingForms.push(form);
  }
}

console.log(`Found ${missingForms.length} forms missing from form_icons.json:`);
missingForms.forEach(form => console.log(`  - ${form}`));

// Add missing forms with null value
if (missingForms.length > 0) {
  for (const form of missingForms) {
    formIcons[form] = null;
  }

  // Sort the keys alphabetically for better organization
  const sortedFormIcons = {};
  Object.keys(formIcons).sort().forEach(key => {
    sortedFormIcons[key] = formIcons[key];
  });

  // Write the updated form_icons.json
  fs.writeFileSync(
    formIconsPath,
    JSON.stringify(sortedFormIcons, null, 2) + '\n',
    'utf8'
  );

  console.log(`\nSuccessfully updated form_icons.json with ${missingForms.length} new entries`);
} else {
  console.log('\nNo missing forms found. form_icons.json is up to date!');
}
