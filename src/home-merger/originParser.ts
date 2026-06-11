export const HOME_ORIGINS = [
  'Gen 3',
  'Gen 4',
  'Gen 5',
  'Gen 6',
  'VC',
  'Gen 7',
  'GO',
  'Switch',
  'PLZA',
] as const;

export type HomeOrigin = typeof HOME_ORIGINS[number];

export interface OriginMatch {
  origin: HomeOrigin | null;
  confidence: number;
  matchedPhrase: string | null;
}

interface OriginRule {
  origin: HomeOrigin;
  phrases: string[];
}

const ORIGIN_RULES: OriginRule[] = [
  {
    origin: 'VC',
    phrases: [
      'kanto region in the good old days',
      'johto region in the good old days',
    ],
  },
  { origin: 'Gen 3', phrases: ['a distant land', 'hoenn region'] },
  { origin: 'Gen 4', phrases: ['sinnoh region', 'johto region'] },
  { origin: 'Gen 5', phrases: ['unova region'] },
  { origin: 'Gen 6', phrases: ['kalos region'] },
  { origin: 'Gen 7', phrases: ['alola region'] },
  { origin: 'GO', phrases: ['pokemon go'] },
  {
    origin: 'Switch',
    phrases: [
      'galar region',
      'hisui region',
      'paldea region',
      'kanto region',
      'pokemon home',
    ],
  },
  {
    origin: 'PLZA',
    phrases: ['lumiose city', 'legends z a', 'pokemon legends z a'],
  },
];

export function normalizeOcrText(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .toLowerCase()
    .replace(/\bpok[eé]mon\b/g, 'pokemon')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseHomeOrigin(text: string): OriginMatch {
  const normalized = normalizeOcrText(text);

  for (const rule of ORIGIN_RULES) {
    for (const phrase of rule.phrases) {
      if (normalized.includes(phrase)) {
        return { origin: rule.origin, confidence: 1, matchedPhrase: phrase };
      }
    }
  }

  const tokens = new Set(normalized.split(' '));
  let best: OriginMatch = {
    origin: null,
    confidence: 0,
    matchedPhrase: null,
  };

  for (const rule of ORIGIN_RULES) {
    for (const phrase of rule.phrases) {
      const phraseTokens = phrase.split(' ');
      const matching = phraseTokens.filter(token => tokens.has(token)).length;
      const confidence = matching / phraseTokens.length;

      if (confidence > best.confidence && confidence >= 0.66) {
        best = {
          origin: rule.origin,
          confidence,
          matchedPhrase: phrase,
        };
      }
    }
  }

  return best;
}
