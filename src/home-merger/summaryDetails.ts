import type {
  PokemonData,
  PokemonDatabase,
} from '../switch-compatibility/types';
import {
  BALL_ACCEPT_SCORE,
  matchBallIcon,
  type BallMatch,
} from './ballMatcher';
import type { HomeOcrResult, OcrLine } from './homeOcr';

export const HOME_LANGUAGES = [
  'JPN',
  'ENG',
  'FRE',
  'GER',
  'ITA',
  'SPA',
  'KOR',
  'CHS',
  'CHT',
] as const;

export const NATURE_NAMES = {
  hardy: 'Hardy',
  lonely: 'Lonely',
  brave: 'Brave',
  adamant: 'Adamant',
  naughty: 'Naughty',
  bold: 'Bold',
  docile: 'Docile',
  relaxed: 'Relaxed',
  impish: 'Impish',
  lax: 'Lax',
  timid: 'Timid',
  hasty: 'Hasty',
  serious: 'Serious',
  jolly: 'Jolly',
  naive: 'Naive',
  modest: 'Modest',
  mild: 'Mild',
  quiet: 'Quiet',
  bashful: 'Bashful',
  rash: 'Rash',
  calm: 'Calm',
  gentle: 'Gentle',
  sassy: 'Sassy',
  careful: 'Careful',
  quirky: 'Quirky',
} as const;

export type HomeLanguage = typeof HOME_LANGUAGES[number];
export type HomeGender = 'male' | 'female' | 'unknown';
export type HomeNature = keyof typeof NATURE_NAMES;

export interface SummaryDetails {
  nickname: string | null;
  nicknameConfidence: number;
  detectedGender: Exclude<HomeGender, 'unknown'> | null;
  gender: HomeGender | null;
  shiny: boolean;
  language: HomeLanguage | null;
  languageConfidence: number;
  nature: HomeNature | null;
  ball: string | null;
  ballCandidates: BallMatch[];
  ot: string | null;
  otConfidence: number;
  idNo: string | null;
  idNoConfidence: number;
}

interface PixelRegion {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

const BALL_CENTER_X_RATIO = 0.0576;
const BALL_RADIUS_RATIO = 0.0178;

function clampRegion(region: PixelRegion, image: ImageData): PixelRegion {
  return {
    x0: Math.max(0, Math.round(region.x0)),
    x1: Math.min(image.width, Math.round(region.x1)),
    y0: Math.max(0, Math.round(region.y0)),
    y1: Math.min(image.height, Math.round(region.y1)),
  };
}

function countPixels(
  image: ImageData,
  region: PixelRegion,
  predicate: (red: number, green: number, blue: number) => boolean,
): number {
  const { x0, x1, y0, y1 } = clampRegion(region, image);
  let count = 0;

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const offset = (y * image.width + x) * 4;
      if (predicate(
        image.data[offset],
        image.data[offset + 1],
        image.data[offset + 2],
      )) {
        count++;
      }
    }
  }

  return count;
}

function isFemalePink(red: number, green: number, blue: number): boolean {
  return (
    red >= 180
    && red - green >= 80
    && blue - green >= 5
    && blue - green <= 110
  );
}

function isMaleBlue(red: number, green: number, blue: number): boolean {
  return (
    blue >= 165
    && green >= 100
    && blue - red >= 45
    && blue - green <= 90
  );
}

export function detectGender(
  image: ImageData,
  region: PixelRegion,
): Exclude<HomeGender, 'unknown'> | null {
  const minimum = Math.max(20, Math.round((image.width * 0.01) ** 2));
  const female = countPixels(image, region, isFemalePink);
  const male = countPixels(image, region, isMaleBlue);

  if (female < minimum && male < minimum) return null;
  return female >= male ? 'female' : 'male';
}

function isShinySparkleOrange(red: number, green: number, blue: number): boolean {
  return (
    red >= 185
    && green >= 60
    && green <= 165
    && blue <= 100
    && red - green >= 60
    && green - blue >= 30
  );
}

export function detectShiny(image: ImageData, dexLineCenterY: number): boolean {
  const width = image.width;
  const region: PixelRegion = {
    x0: width * 0.03,
    x1: width * 0.27,
    y0: dexLineCenterY + width * 0.07,
    y1: dexLineCenterY + width * 0.2,
  };

  return countPixels(image, region, isShinySparkleOrange)
    >= Math.max(15, Math.round(width * 0.012));
}

export function findDexLine(lines: OcrLine[]): OcrLine | null {
  return lines.find(line => /\bno\s*[.,:]?\s*0*\d{1,4}\b/i.test(line.text)) ?? null;
}

function editDistance(first: string, second: string): number {
  const previous = Array.from({ length: second.length + 1 }, (_, index) => index);

  for (let firstIndex = 1; firstIndex <= first.length; firstIndex++) {
    let diagonal = previous[0];
    previous[0] = firstIndex;
    for (let secondIndex = 1; secondIndex <= second.length; secondIndex++) {
      const above = previous[secondIndex];
      previous[secondIndex] = Math.min(
        previous[secondIndex] + 1,
        previous[secondIndex - 1] + 1,
        diagonal + (first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }

  return previous[second.length];
}

export function parseHomeLanguage(text: string): HomeLanguage | null {
  const cleaned = text.replace(/[^a-z]/gi, '').toUpperCase();
  if ((HOME_LANGUAGES as readonly string[]).includes(cleaned)) {
    return cleaned as HomeLanguage;
  }

  const candidate = HOME_LANGUAGES
    .map(language => ({ language, distance: editDistance(cleaned, language) }))
    .sort((first, second) => first.distance - second.distance)[0];
  return cleaned.length >= 2 && candidate?.distance <= 1
    ? candidate.language
    : null;
}

export function parseNickname(text: string): string | null {
  const firstLine = text.split(/\r?\n/).map(line => line.trim()).find(Boolean);
  if (!firstLine) return null;

  const nickname = firstLine
    .normalize('NFKC')
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/[♀♂®©@]+$/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  return nickname || null;
}

export function parseTrainerName(text: string): string | null {
  const firstLine = text.split(/\r?\n/).map(line => line.trim()).find(Boolean);
  if (!firstLine) return null;
  const trainerName = firstLine
    .normalize('NFKC')
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/\s+/g, ' ')
    .trim();
  return trainerName || null;
}

export function parseTrainerId(text: string): string | null {
  const compact = text.replace(/\s+/g, '');
  if (!/^[0-9OoIl|]+$/.test(compact)) return null;
  const normalized = compact
    .replace(/[Oo]/g, '0')
    .replace(/[Il|]/g, '1');
  const digits = normalized.match(/\d{1,6}/)?.[0] ?? null;
  return digits;
}

export function parseNature(text: string): HomeNature | null {
  const match = text.match(/\bnature\s*:\s*([a-z]+)/i);
  if (!match) return null;
  const normalized = match[1].toLowerCase();
  return normalized in NATURE_NAMES ? normalized as HomeNature : null;
}

function effectiveData(
  pokemonKey: string,
  pokemonDb: PokemonDatabase,
): PokemonData | null {
  const data = pokemonDb[pokemonKey];
  if (!data) return null;
  const source = data['data-source'] ? pokemonDb[data['data-source']] : undefined;
  return source ? { ...source, ...data } : data;
}

export function resolvePokemonGender(
  pokemonKey: string,
  pokemonDb: PokemonDatabase,
  detectedGender: Exclude<HomeGender, 'unknown'> | null,
): HomeGender | null {
  const data = effectiveData(pokemonKey, pokemonDb);
  if (!data) return detectedGender;

  const formName = data.forms?.en?.toLowerCase();
  if (formName === 'male') return 'male';
  if (formName === 'female') return 'female';
  if (data.gender === 'male' || data.gender === 'female' || data.gender === 'unknown') {
    return data.gender;
  }
  return detectedGender;
}

export function sanitizeForFilename(name: string): string {
  return name
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N} _-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

export async function extractSummaryDetails(
  canvas: HTMLCanvasElement,
  image: ImageData,
  ocr: HomeOcrResult,
  pokemonKey: string,
  pokemonDb: PokemonDatabase,
): Promise<SummaryDetails> {
  const width = image.width;
  const detectedGender = detectGender(image, {
    x0: width * 0.08,
    x1: width * 0.46,
    y0: width * 0.21,
    y1: width * 0.3,
  });
  const dexLine = findDexLine(ocr.identityLines);
  const shiny = dexLine !== null
    ? detectShiny(image, (dexLine.y0 + dexLine.y1) / 2)
    : false;

  const ballCandidates = await matchBallIcon(
    canvas,
    width * BALL_CENTER_X_RATIO,
    width * 0.252,
    width * BALL_RADIUS_RATIO,
  );
  const ball = ballCandidates[0] && ballCandidates[0].score <= BALL_ACCEPT_SCORE
    ? ballCandidates[0].ballId
    : null;

  return {
    nickname: parseNickname(ocr.nicknameText),
    nicknameConfidence: ocr.nicknameConfidence,
    detectedGender,
    gender: resolvePokemonGender(pokemonKey, pokemonDb, detectedGender),
    shiny,
    language: parseHomeLanguage(ocr.languageText),
    languageConfidence: ocr.languageConfidence,
    nature: parseNature(ocr.trainerNotesText),
    ball,
    ballCandidates,
    ot: parseTrainerName(ocr.trainerNameText),
    otConfidence: ocr.trainerNameConfidence,
    idNo: parseTrainerId(ocr.trainerIdText),
    idNoConfidence: ocr.trainerIdConfidence,
  };
}
