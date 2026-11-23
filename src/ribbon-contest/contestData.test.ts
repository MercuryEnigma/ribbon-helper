import { describe, expect, it } from 'vitest';
import { checkAnswer, CONTEST_HEADERS, parseContests } from './contestData';

function puzzle(id: string, changes: Record<string, string> = {}) {
  const values: Record<string, string> = {
    number: '1', 'round ID': id, title: 'Test puzzle', 'puzzle text': 'Find this Pokémon.',
    'opening time': '2026-11-01T00:00:00Z', 'closing time': '2026-12-01T00:00:00Z',
    'answer Pokémon': 'pikachu', 'required ribbon IDs': 'effort-ribbon',
    ...changes,
  };
  return CONTEST_HEADERS.map(header => values[header] ?? '');
}

function sheet(rows: string[][]) {
  return [CONTEST_HEADERS, ...rows].map(row => row.map(cell => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n');
}

describe('parseContests', () => {
  it.each(['Any pokemon', 'Any Pokémon', '  ANY POKEMON  '])('accepts any species or form for %s', pokemon => {
    const [round] = parseContests(sheet([puzzle('any', { 'answer Pokémon': pokemon })]));
    expect(round).toBeDefined();
    for (const species of ['pikachu', 'milotic', 'pikachu-alola-cap']) {
      expect(checkAnswer(round, { pokemon: species, ribbonIds: ['effort-ribbon'] })).toBe(true);
    }
    expect(checkAnswer(round, { pokemon: 'not a Pokémon', ribbonIds: ['effort-ribbon'] })).toBe(false);
    expect(checkAnswer(round, { pokemon: 'pikachu', ribbonIds: [] })).toBe(false);
  });

  it('checks alternatives and exclusions together with comma-separated AND requirements', () => {
    const [round] = parseContests(sheet([puzzle('operators', {
      'required ribbon IDs': 'Effort | Training, !Best Friends',
    })]));
    const accepts = (ribbonIds: string[]) => checkAnswer(round, { pokemon: 'pikachu', ribbonIds });
    expect(accepts(['effort-ribbon'])).toBe(true);
    expect(accepts(['training-ribbon'])).toBe(true);
    expect(accepts(['effort-ribbon', 'training-ribbon'])).toBe(true);
    expect(accepts(['effort-ribbon', 'best-friends-ribbon'])).toBe(false);
    expect(accepts([])).toBe(false);
    expect(checkAnswer(round, { pokemon: 'milotic', ribbonIds: ['effort-ribbon'] })).toBe(false);
  });

  it('allows an empty ribbon selection for a NOT-only answer', () => {
    const [round] = parseContests(sheet([puzzle('excluded', { 'required ribbon IDs': '!Effort' })]));
    expect(checkAnswer(round, { pokemon: 'pikachu', ribbonIds: [] })).toBe(true);
    expect(checkAnswer(round, { pokemon: 'pikachu', ribbonIds: ['effort-ribbon'] })).toBe(false);
  });

  it.each([', ', ',', ';', '\n', ' & '])('keeps %j as AND and allows extra ribbons', separator => {
    const [round] = parseContests(sheet([puzzle('and', { 'required ribbon IDs': `Effort${separator}Training` })]));
    expect(checkAnswer(round, { pokemon: 'pikachu', ribbonIds: ['effort-ribbon'] })).toBe(false);
    expect(checkAnswer(round, { pokemon: 'pikachu', ribbonIds: ['effort-ribbon', 'training-ribbon', 'best-friends-ribbon'] })).toBe(true);
  });

  it('preserves base-species and exact-form requirements', () => {
    const [base, form] = parseContests(sheet([puzzle('base'), puzzle('form', { 'answer Pokémon': 'pikachu-alola-cap' })]));
    expect(checkAnswer(base, { pokemon: 'pikachu-alola-cap', ribbonIds: ['effort-ribbon'] })).toBe(true);
    expect(checkAnswer(form, { pokemon: 'pikachu', ribbonIds: ['effort-ribbon'] })).toBe(false);
  });

  it.each([
    { 'answer Pokémon': 'not a Pokémon' },
    { 'required ribbon IDs': 'not a ribbon' },
    { 'required ribbon IDs': '' },
    { 'required ribbon IDs': 'Effort |' },
    { 'required ribbon IDs': 'Effort, , Training' },
    { 'required ribbon IDs': 'Effort | unknown' },
    { 'required ribbon IDs': '!' },
    { number: 'invalid' },
    { title: '' },
    { 'puzzle text': '' },
    { 'opening time': 'invalid' },
    { 'closing time': '2026-10-01T00:00:00Z' },
    { 'hint 1 text': 'A hint', 'hint 1 time': 'invalid' },
    { 'verdict-release time': 'invalid' },
  ])('skips a malformed row and continues parsing: %j', changes => {
    const result = parseContests(sheet([
      puzzle('before', { number: '3' }),
      puzzle('invalid', changes),
      puzzle('after', { number: '2' }),
    ]));

    expect(result.map(round => round.id)).toEqual(['after', 'before']);
    expect(result[0].answer).toEqual({ pokemon: 'pikachu', ribbonIds: ['effort-ribbon'] });
  });

  it('does not reserve the ID of an invalid row', () => {
    const result = parseContests(sheet([
      puzzle('same-id', { 'verdict-release time': 'invalid' }),
      puzzle('same-id', { title: 'Valid puzzle' }),
    ]));

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Valid puzzle');
  });

  it('skips duplicate IDs and continues to later puzzles', () => {
    const result = parseContests(sheet([
      puzzle('same-id'), puzzle('same-id'), puzzle('later'),
    ]));

    expect(result.map(round => round.id)).toEqual(['later', 'same-id']);
  });

  it('returns an empty list when all puzzle rows are invalid', () => {
    expect(parseContests(sheet([puzzle('invalid', { title: '' })]))).toEqual([]);
  });

  it('still rejects a sheet missing required columns', () => {
    expect(() => parseContests('number,title\n1,Incomplete')).toThrow('The contest CSV needs');
  });
});
