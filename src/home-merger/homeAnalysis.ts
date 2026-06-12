import pokemonData from '../data/pokemon.json';
import type { PokemonDatabase } from '../switch-compatibility/types';
import { detectHomeSectionBars, detectRibbonGrid } from './ribbonGrid';
import { matchRibbonGrid, type RibbonCellMatch } from './ribbonMatcher';
import { readHomeSummaryText, type HomeOcrResult } from './homeOcr';
import {
  getFormOptions,
  matchPokemonIdentity,
  type PokemonIdentityCandidate,
  type PokemonIdentityMatch,
} from './pokemonIdentity';
import { parseHomeOrigin, type OriginMatch } from './originParser';
import { resolveHomeRibbonOrder } from './homeRibbonOrder';
import { extractSummaryDetails, type SummaryDetails } from './summaryDetails';

export type HomeAnalysisProgress = (
  stage: 'layout' | 'ribbons' | 'ocr' | 'details',
  detail: string,
  progress: number,
) => void;

export interface HomeRecognitionResult {
  ocr: HomeOcrResult;
  identity: PokemonIdentityMatch;
  formOptions: PokemonIdentityCandidate[];
  origin: OriginMatch;
  details: SummaryDetails;
  ribbonMatches: RibbonCellMatch[];
  detectedRibbonIds: string[];
}

const POKEMON_DB = pokemonData as PokemonDatabase;

export async function analyzeHomeSummary(
  canvas: HTMLCanvasElement,
  onProgress?: HomeAnalysisProgress,
): Promise<HomeRecognitionResult> {
  onProgress?.('layout', 'Finding the complete ribbon grid', 0);
  const image = canvas.getContext('2d', { willReadFrequently: true })!
    .getImageData(0, 0, canvas.width, canvas.height);
  const sectionBars = detectHomeSectionBars(image);
  const grid = detectRibbonGrid(image);
  onProgress?.('layout', `Found ${grid.cells.length} ribbon cells`, 1);

  const rawRibbonMatches = await matchRibbonGrid(canvas, grid, (completed, total) => {
    onProgress?.(
      'ribbons',
      `Matching ribbon ${completed} of ${total}`,
      completed / total,
    );
  });
  const ribbonMatches = resolveHomeRibbonOrder(rawRibbonMatches);

  if (sectionBars.length === 0) {
    throw new Error('Trainer Notes could not be located in the merged summary.');
  }

  const ocr = await readHomeSummaryText(
    canvas,
    sectionBars[0],
    (detail, progress) => onProgress?.('ocr', detail, progress),
  );
  const identity = matchPokemonIdentity(ocr.identityText, POKEMON_DB);
  const bestIdentity = identity.candidates[0];
  const baseKey = bestIdentity?.baseKey;
  const formOptions = baseKey ? getFormOptions(baseKey, POKEMON_DB) : [];
  const origin = parseHomeOrigin(ocr.trainerNotesText);
  onProgress?.('details', 'Reading nickname and trainer details', 0.95);
  const details = await extractSummaryDetails(
    canvas,
    image,
    ocr,
    bestIdentity?.pokemonKey ?? '',
    POKEMON_DB,
  );
  const detectedRibbonIds = ribbonMatches
    .filter(match => match.accepted)
    .map(match => match.best.ribbonId);

  return {
    ocr,
    identity,
    formOptions,
    origin,
    details,
    ribbonMatches,
    detectedRibbonIds,
  };
}
