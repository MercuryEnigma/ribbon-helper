#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const filePath = path.resolve('src/data/pokeblocks.json');

const specialBerries = {
  mirage: ['liechi'],
  gamecube: ['ganlon', 'salac', 'petaya', 'apicot'],
  ereader: ['nutpea', 'chilan', 'drash', 'pumkin', 'strib', 'eggant'],
  japanese: ['topo', 'touga', 'yago', 'ginema', 'niniku'],
};

function includesAny(haystack, needles) {
  return needles.some((needle) => haystack.includes(needle));
}

function fixPokeblocks() {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);

  for (const [name, block] of Object.entries(data)) {
    const berry = (block.berry || '').toLowerCase();

    // Mirage for Liechi berries
    if (includesAny(berry, specialBerries.mirage)) {
      block.mirage = true;
    }

    // GameCube exclusives
    if (includesAny(berry, specialBerries.gamecube)) {
      block.gamecube = true;
    }

    // If players > 1, NPC should be 0
    if (block.players > 1) {
      block.npc = 0;
    }

    // Blend Master variants
    if (name.endsWith(' M')) {
      block['blend-master'] = true;
    }

    // E-Reader sets
    if (includesAny(berry, specialBerries.ereader)) {
      block['e-reader'] = true;
    }

    // Japanese E-Reader sets
    if (includesAny(berry, specialBerries.japanese)) {
      block['japanese-e-reader'] = true;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log('pokeblocks.json updated');
}

fixPokeblocks();
