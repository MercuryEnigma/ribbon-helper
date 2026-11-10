import { readFile, writeFile } from 'node:fs/promises';

const pokemon = JSON.parse(await readFile(new URL('../src/data/pokemon.json', import.meta.url), 'utf8'));
const ribbons = JSON.parse(await readFile(new URL('../src/data/ribbons.json', import.meta.url), 'utf8'));
const lines = ['# Contest answer IDs', '', 'Generated from the site datasets. Names and keys are accepted; use keys to disambiguate repeated names. Multiple ribbon names or IDs are comma-separated.', '', '## Pokémon', '', '| Key | Pokémon |', '| --- | --- |'];
for (const [key, value] of Object.entries(pokemon)) {
  const base = pokemon[value['data-source']];
  lines.push(`| ${key} | ${value.names?.en ?? base?.names?.en ?? key}${value.forms?.en ? ` (${value.forms.en})` : ''} |`);
}
lines.push('', '## Ribbons and marks', '', '| Key | Name |', '| --- | --- |');
for (const [key, value] of Object.entries(ribbons)) lines.push(`| ${key} | ${value.names.en} |`);
await writeFile(new URL('../docs/ribbon-contest-ids.md', import.meta.url), lines.join('\n') + '\n');
