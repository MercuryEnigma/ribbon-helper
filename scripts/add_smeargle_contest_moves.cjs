const fs = require('fs');
const path = require('path');

const targets = [
  {
    name: 'rse',
    contestPath: path.join(__dirname, '..', 'src', 'data', 'contest_moves_rse.json'),
    pokemonPath: path.join(__dirname, '..', 'src', 'data', 'pokemon_moves_rse.json'),
    version: 'coefrlgrsxd',
  },
  {
    name: 'dppt',
    contestPath: path.join(__dirname, '..', 'src', 'data', 'contest_moves_dppt.json'),
    pokemonPath: path.join(__dirname, '..', 'src', 'data', 'pokemon_moves_dppt.json'),
    version: 'dphgsspt',
  },
  {
    name: 'oras',
    contestPath: path.join(__dirname, '..', 'src', 'data', 'contest_moves_oras.json'),
    pokemonPath: path.join(__dirname, '..', 'src', 'data', 'pokemon_moves_oras.json'),
    version: 'orasxy',
  },
  {
    name: 'bdsp',
    contestPath: path.join(__dirname, '..', 'src', 'data', 'contest_moves_bdsp.json'),
    pokemonPath: path.join(__dirname, '..', 'src', 'data', 'pokemon_moves_bdsp.json'),
    version: 'bdsp',
  },
];

const buildSketchMoves = (contestPath) => {
  const contestMoves = Object.keys(JSON.parse(fs.readFileSync(contestPath, 'utf8')));
  return contestMoves.reduce((acc, move) => {
    acc[move] = 'sketch';
    return acc;
  }, {});
};

const updateFile = ({ name, contestPath, pokemonPath, version }) => {
  const pokemonMoves = JSON.parse(fs.readFileSync(pokemonPath, 'utf8'));
  const sketchKey = `sketch-${version}`;
  const smeargle = pokemonMoves.smeargle || {};

  smeargle[sketchKey] = {
    version,
    moves: buildSketchMoves(contestPath),
  };

  pokemonMoves.smeargle = smeargle;
  fs.writeFileSync(pokemonPath, `${JSON.stringify(pokemonMoves, null, 2)}\n`);
  console.log(`Updated ${name} (${sketchKey}) with ${Object.keys(smeargle[sketchKey].moves).length} moves`);
};

targets.forEach(updateFile);
