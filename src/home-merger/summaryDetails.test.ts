import { describe, expect, it } from 'vitest';
import pokemonData from '../data/pokemon.json';
import type { PokemonDatabase } from '../switch-compatibility/types';
import {
  parseHomeLanguage,
  parseNature,
  parseNickname,
  parseTrainerId,
  parseTrainerName,
  resolvePokemonGender,
  sanitizeForFilename,
} from './summaryDetails';

const POKEMON_DB = pokemonData as PokemonDatabase;

const CAPTURED_RIBBONDOL_OCR = {
  nickname: 'Ribbondol\n',
  language: 'ENG\n',
  trainerName: 'Gale\n',
  trainerId: '07071\n',
  trainerNotes: [
    'Gale',
    '07071',
    'Trainer notes',
    'Nature: Bashful',
    'Seems to have had a fateful encounter in',
    'a distant land on 05/18/2020.',
  ].join('\n'),
};

const CAPTURED_ODYX_OCR = {
  nickname: 'Odys @\n',
  language: 'ENG\n',
  trainerName: 'Cole\n',
  trainerId: '41641\n',
  trainerNotes: [
    'Cole',
    '41641',
    'Trainer notes',
    'Nature: Jolly',
    'Seems to have been first met',
    'in a distant land on 05/08/2026.',
  ].join('\n'),
};

describe('captured HOME OCR parsing', () => {
  it('parses the Ribbondol fixture values', () => {
    expect(parseNickname(CAPTURED_RIBBONDOL_OCR.nickname)).toBe('Ribbondol');
    expect(parseHomeLanguage(CAPTURED_RIBBONDOL_OCR.language)).toBe('ENG');
    expect(parseTrainerName(CAPTURED_RIBBONDOL_OCR.trainerName)).toBe('Gale');
    expect(parseTrainerId(CAPTURED_RIBBONDOL_OCR.trainerId)).toBe('07071');
    expect(parseNature(CAPTURED_RIBBONDOL_OCR.trainerNotes)).toBe('bashful');
  });

  it('parses the Odyx fixture and removes its gender OCR artifact', () => {
    expect(parseNickname(CAPTURED_ODYX_OCR.nickname)).toBe('Odys');
    expect(parseHomeLanguage(CAPTURED_ODYX_OCR.language)).toBe('ENG');
    expect(parseTrainerName(CAPTURED_ODYX_OCR.trainerName)).toBe('Cole');
    expect(parseTrainerId(CAPTURED_ODYX_OCR.trainerId)).toBe('41641');
    expect(parseNature(CAPTURED_ODYX_OCR.trainerNotes)).toBe('jolly');
  });

  it('tolerates a one-character language OCR error', () => {
    expect(parseHomeLanguage('EN6')).toBe('ENG');
    expect(parseHomeLanguage('')).toBeNull();
  });

  it('preserves leading zeroes and normalizes common numeric OCR errors', () => {
    expect(parseTrainerId('O7O71')).toBe('07071');
    expect(parseTrainerId('ID unavailable')).toBeNull();
  });
});

describe('species-derived gender', () => {
  it('uses genderless and fixed-gender species data before visual detection', () => {
    expect(resolvePokemonGender('claydol', POKEMON_DB, 'female')).toBe('unknown');
    expect(resolvePokemonGender('nidoran-f', POKEMON_DB, 'male')).toBe('female');
  });

  it('uses the visual badge for variable-gender species', () => {
    expect(resolvePokemonGender('heracross', POKEMON_DB, 'female')).toBe('female');
  });

  it('uses gender-specific form names for Meowstic', () => {
    expect(resolvePokemonGender('meowstic', POKEMON_DB, 'female')).toBe('male');
    expect(resolvePokemonGender('meowstic-f', POKEMON_DB, 'male')).toBe('female');
  });
});

describe('sanitizeForFilename', () => {
  it('keeps letters, digits, and dashes', () => {
    expect(sanitizeForFilename('Ribbondol')).toBe('Ribbondol');
  });

  it('replaces spaces and strips unsafe characters', () => {
    expect(sanitizeForFilename(' Mr. Mime! ')).toBe('Mr-Mime');
  });

  it('returns an empty string for symbol-only names', () => {
    expect(sanitizeForFilename('♥♦♣')).toBe('');
  });
});
