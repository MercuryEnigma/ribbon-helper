import pokemonData from '../data/pokemon.json';
import ribbonsData from '../data/ribbons.json';
import type { PokemonDatabase } from '../switch-compatibility/types';
import type { ContestAnswer, ContestDefinition, ContestRound } from './types';
import { POKEMON_OPTIONS, RIBBON_OPTIONS } from './catalog';

export const CONTEST_HEADERS = ['number', 'round ID', 'title', 'puzzle text', 'opening time', 'closing time', 'verdict-release time', 'hint 1 text', 'hint 1 time', 'hint 2 text', 'hint 2 time', 'hint 3 text', 'hint 3 time', 'answer Pokémon', 'required ribbon IDs'];
const POKEMON = pokemonData as PokemonDatabase;
const RIBBONS = new Set(Object.keys(ribbonsData));
const normalize = (value: string) => value.normalize('NFKC').trim().toLowerCase();
const HEADER_ALIASES: Record<string, string[]> = {
  number: ['contest number'], 'verdict-release time': ['reveal time'],
  'answer Pokémon': ['answer Pokemon'], 'required ribbon IDs': ['answer Ribbons'],
};

export function resolvePokemon(value: string): string {
  const key = normalize(value);
  if (Object.hasOwn(POKEMON, key)) return key;
  const matches = POKEMON_OPTIONS.filter(option => normalize(option.name) === key);
  const base = matches.filter(option => !POKEMON[option.key]['data-source']);
  if (base.length === 1) return base[0].key;
  if (matches.length === 1) return matches[0].key;
  throw new Error(`Use an unambiguous Pokémon name or key: ${value}`);
}

export function resolveRibbon(value: string): string {
  const key = normalize(value);
  if (RIBBONS.has(key)) return key;
  const exact = RIBBON_OPTIONS.filter(option => normalize(option.name) === key);
  // Sheet authors commonly write "Effort" rather than "Effort Ribbon".
  // Allow an omitted suffix only when it still identifies exactly one entry.
  const matches = exact.length ? exact : RIBBON_OPTIONS.filter(option => normalize(option.name).replace(/ (?:ribbon|mark)$/, '') === key);
  if (matches.length !== 1) throw new Error(`Use an unambiguous ribbon name or ID: ${value}`);
  return matches[0].key;
}
const zonedFormat = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
function wallClock(time: number) {
  const parts = Object.fromEntries(zonedFormat.formatToParts(new Date(time)).map(part => [part.type, part.value]));
  return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
}

/** CSV exports contain formatted wall-clock dates, so never parse them in the
 * visitor's timezone. Explicit-offset ISO values are also accepted. */
export function parseContestTime(value: string, required = false): string | null {
  const text = value.trim();
  if (!text) { if (required) throw new Error('Opening and closing times are required.'); return null; }
  if (/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(text)) {
    const time = Date.parse(text);
    if (!Number.isFinite(time)) throw new Error(`Invalid contest date: ${text}`);
    return new Date(time).toISOString();
  }
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  const us = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i);
  if (!iso && !us) throw new Error(`Use yyyy-mm-dd hh:mm:ss or an explicit-offset ISO date: ${text}`);
  const match = (iso ?? us)!;
  const year = +(iso ? match[1] : match[3]), month = +(iso ? match[2] : match[1]), day = +(iso ? match[3] : match[2]);
  let hour = +(match[4] ?? 0);
  if (us?.[7]) { if (hour < 1 || hour > 12) throw new Error(`Invalid hour: ${text}`); hour = hour % 12 + (us[7].toUpperCase() === 'PM' ? 12 : 0); }
  const minute = +(match[5] ?? 0), second = +(match[6] ?? 0);
  const wall = Date.UTC(year, month - 1, day, hour, minute, second), check = new Date(wall);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59) throw new Error(`Invalid contest date: ${text}`);
  const offsets = new Set([-86400000, 0, 86400000].map(delta => wallClock(wall + delta) - (wall + delta)));
  const candidates = [...offsets].map(offset => wall - offset).filter(time => wallClock(time) === wall).sort((a, b) => a - b);
  if (!candidates.length) throw new Error(`This Los Angeles time does not exist due to daylight saving: ${text}`);
  // During the repeated autumn hour, use the first occurrence. An ISO offset
  // lets the organizer choose the second occurrence explicitly.
  return new Date(candidates[0]).toISOString();
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false, endedQuote = false;
  text = text.replace(/^\uFEFF/, '');
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { cell += '"'; index++; }
      else if (char === '"') { quoted = false; endedQuote = true; }
      else cell += char;
    } else if (char === '"' && !cell && !endedQuote) quoted = true;
    else if (char === ',') { row.push(cell); cell = ''; endedQuote = false; }
    else if (char === '\r' || char === '\n') {
      if (char === '\r' && text[index + 1] === '\n') index++;
      row.push(cell); rows.push(row); row = []; cell = ''; endedQuote = false;
    } else {
      if (endedQuote || char === '"') throw new Error('Malformed contest CSV.');
      cell += char;
    }
  }
  if (quoted) throw new Error('Unclosed quoted cell in contest CSV.');
  if (cell || row.length || endedQuote) { row.push(cell); rows.push(row); }
  return rows.filter(cells => cells.some(value => value.trim()));
}

export function parseContests(csv: string): ContestDefinition[] {
  const [headers, ...rows] = parseCsv(csv);
  if (!headers) throw new Error('The contest CSV needs a header row.');
  const columns = CONTEST_HEADERS.map(header => {
    const names = [header, ...(HEADER_ALIASES[header] ?? [])].map(normalize);
    const matches = headers.map((value, index) => names.includes(normalize(value)) ? index : -1).filter(index => index >= 0);
    if (matches.length > 1) throw new Error(`Duplicate contest column: ${header}`);
    return matches[0] ?? -1;
  });
  if ([0, 2, 3, 4, 5, 13, 14].some(index => columns[index] < 0)) throw new Error('The contest CSV needs number, title, puzzle text, opening/closing time, answer Pokémon, and required ribbons.');
  const seen = new Set<string>();
  return rows.map(row => {
    const text = (index: number) => (row[columns[index]] ?? '').trim();
    const id = text(1) || text(0), pokemon = resolvePokemon(text(13));
    const rawRibbons = text(14).split(/[,;\n]+/).map(value => value.trim()).filter(Boolean);
    const ribbonIds = [...new Set(rawRibbons.map(resolveRibbon))];
    if (!id || seen.has(id)) throw new Error('Every contest needs a unique round ID.');
    seen.add(id);
    if (!text(0) || !Number.isFinite(Number(text(0))) || !text(2) || !text(3)) throw new Error(`Number, title and puzzle are required: ${id}`);
    if (!ribbonIds.length) throw new Error(`Required ribbons are missing: ${id}`);
    const opensAt = parseContestTime(text(4), true)!, closesAt = parseContestTime(text(5), true)!;
    if (Date.parse(closesAt) <= Date.parse(opensAt)) throw new Error(`Closing must follow opening: ${id}`);
    const hints: ContestDefinition['hints'] = [];
    for (let index = 0; index < 3; index++) {
      if (!text(7 + index * 2)) continue;
      const time = parseContestTime(text(8 + index * 2)) ?? opensAt;
      hints.push({ number: index + 1, text: text(7 + index * 2), releasesAt: Date.parse(time) < Date.parse(opensAt) ? opensAt : time });
    }
    return { number: Number(text(0)), id, title: text(2), puzzle: text(3), opensAt, closesAt,
      verdictAt: parseContestTime(text(6)), hints, answer: { pokemon, ribbonIds } };
  }).sort((a, b) => a.number - b.number || a.id.localeCompare(b.id));
}

export function roundAt(round: ContestDefinition, now: number): ContestRound {
  const state = now < Date.parse(round.opensAt) ? 'upcoming' : now < Date.parse(round.closesAt) ? 'open' : 'closed';
  return { ...round, state, puzzle: state === 'upcoming' ? '' : round.puzzle,
    hints: round.hints.filter(hint => now >= Date.parse(hint.releasesAt)), solution: state === 'closed' ? round.answer : undefined };
}

export function checkAnswer(round: ContestDefinition, entry: ContestAnswer): boolean {
  const expected = POKEMON[round.answer.pokemon], actual = POKEMON[entry.pokemon];
  if (!expected || !actual) return false;
  const speciesMatch = expected['data-source'] ? entry.pokemon === round.answer.pokemon
    : (actual['data-source'] ?? entry.pokemon) === round.answer.pokemon;
  return speciesMatch && round.answer.ribbonIds.every(id => entry.ribbonIds.includes(id));
}
