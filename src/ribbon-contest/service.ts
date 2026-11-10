import { parseContests } from './contestData';
import type { ContestEntry, ContestFormConfig } from './types';

export function sheetCsvUrl(value: string): string {
  const url = new URL(value);
  if (url.origin !== 'https://docs.google.com') throw new Error('Use a Google Sheets link.');
  const published = url.pathname.match(/^\/spreadsheets\/d\/e\/([a-zA-Z0-9_-]+)\/(?:pub|pubhtml)$/);
  if (published) {
    url.pathname = `/spreadsheets/d/e/${published[1]}/pub`;
    url.searchParams.set('output', 'csv');
    url.searchParams.set('single', 'true');
  } else {
    const shared = url.pathname.match(/^\/spreadsheets\/d\/([a-zA-Z0-9_-]+)(?:\/.*)?$/);
    if (!shared) throw new Error('Use a published CSV or shared Google Sheets link.');
    url.pathname = `/spreadsheets/d/${shared[1]}/gviz/tq`;
    const gid = url.searchParams.get('gid') ?? new URLSearchParams(url.hash.slice(1)).get('gid') ?? '0';
    url.search = '';
    url.searchParams.set('gid', gid);
    url.searchParams.set('tqx', 'out:csv');
    url.searchParams.set('headers', '1');
  }
  url.hash = '';
  return url.toString();
}

export async function loadContestSheet(url: string, signal?: AbortSignal) {
  const response = await fetch(sheetCsvUrl(url), { signal, credentials: 'omit', cache: 'no-store' });
  if (!response.ok) throw new Error('Contest information is unavailable. Please try again later.');
  const csv = await response.text();
  if (/^\s*</.test(csv) || csv.length > 2 * 1024 * 1024) throw new Error('The contest link did not return a CSV file. Publish the Contest info tab as CSV.');
  return parseContests(csv);
}

export function formUrls(config: ContestFormConfig, entry: ContestEntry) {
  const url = new URL(config.url);
  if (url.origin !== 'https://docs.google.com' || !/^\/forms\/d\/(?:e\/)?[a-zA-Z0-9_-]+\/viewform$/.test(url.pathname)) throw new Error('Use a Google Form responder link.');
  const values: [string | undefined, string][] = [[config.fields.roundId, entry.roundId], [config.fields.pokemon, entry.pokemon], [config.fields.ribbonIds, entry.ribbonIds.join(', ')], [config.fields.reference, entry.reference]];
  for (const [field, value] of values) {
    if (!field) continue;
    if (!/^\d+$/.test(field)) throw new Error('Form field IDs must be numeric.');
    url.searchParams.set(`entry.${field}`, value);
  }
  url.searchParams.set('usp', 'pp_url');
  url.searchParams.delete('embedded');
  const external = url.toString();
  url.searchParams.set('embedded', 'true');
  return { external, embedded: url.toString() };
}
