import pokemonData from '../data/pokemon.json';
import type { PokemonDatabase } from '../switch-compatibility/types';
import { analyzeHomeSummary, type HomeRecognitionResult } from '../home-merger/homeAnalysis';
import { cropCanvas, loadFileToCanvas, scaleCanvas } from '../home-merger/imageUtils';
import { mergeAll } from '../home-merger/ocrMerge';
import { readGameScreenshotText, type HomeOcrResult } from '../home-merger/homeOcr';
import { matchPokemonIdentity, getFormOptions } from '../home-merger/pokemonIdentity';
import { matchRibbonGrid } from '../home-merger/ribbonMatcher';
import type { SummaryDetails } from '../home-merger/summaryDetails';
import { normalizeOcrText } from '../home-merger/originParser';
import { detectScreenshotGame, GAME_LAYOUTS, SCREENSHOT_GAME_NAMES, type ScreenshotGame } from './gameLayouts';
import { consolidateGameRibbons, GAME_RIBBON_ACCEPTANCE } from './gameRibbons';

export type ScreenshotProgress = (detail: string, progress: number) => void;
export interface ScreenshotAnalysis extends HomeRecognitionResult {
  game: ScreenshotGame;
  warnings: string[];
  identityConfirmed: boolean;
}
export interface ProcessedScreenshots { canvas: HTMLCanvasElement; analysis: ScreenshotAnalysis; fileCount: number; }
type Prepared = { game: ScreenshotGame; original: HTMLCanvasElement; layout?: Awaited<ReturnType<typeof consolidateGameRibbons>>['layout']; verifiedRibbonIds?: (string | undefined)[] };
const POKEMON = pokemonData as PokemonDatabase;

/** The single entry point used by Ribbon Checker and Ribbon Contest. All OCR
 * work is serialized because Tesseract shares a reusable, stateful worker. */
export class ScreenshotProcessor {
  private queue: Promise<unknown> = Promise.resolve();
  private prepared = new WeakMap<HTMLCanvasElement, Prepared>();

  private run<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation, operation);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }

  process(files: File[], progress: ScreenshotProgress = () => {}): Promise<ProcessedScreenshots> {
    return this.run(async () => {
      if (!files.length || files.length > 12) throw new Error('Select 1–12 screenshots of the same Pokémon and game.');
      if (files.some(file => !['image/png', 'image/jpeg'].includes(file.type) || file.size > 12 * 1024 * 1024)) throw new Error('Use PNG or JPEG images up to 12 MB each.');
      const frames: HTMLCanvasElement[] = [];
      for (const [index, file] of [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).entries()) {
        progress(`Loading screenshot ${index + 1} of ${files.length}`, .02 + index / files.length * .08);
        const frame = await loadFileToCanvas(file);
        if (frame.width * frame.height > 16000000) throw new Error('Use screenshots no larger than 16 megapixels.');
        frames.push(frame);
      }
      const game = detectScreenshotGame(frames[0]);
      if (frames.some(frame => detectScreenshotGame(frame) !== game)) throw new Error('These screenshots come from different games. Select screenshots from one game at a time.');
      progress(`Detected ${SCREENSHOT_GAME_NAMES[game]}`, .12);
      let canvas: HTMLCanvasElement, prepared: Prepared;
      if (game === 'home') {
        const normalized = frames.map(frame => frame.width === frames[0].width ? frame : scaleCanvas(frame, frames[0].width / frame.width));
        canvas = normalized.length === 1 ? normalized[0] : await mergeAll(normalized, (step, total, detail) => progress(detail, .15 + step / Math.max(1, total) * .25));
        prepared = { game, original: canvas };
      } else {
        const normalized = frames.map(frame => scaleCanvas(frame, 1280 / frame.width));
        const consolidated = await consolidateGameRibbons(normalized, game, detail => progress(detail, .3));
        canvas = consolidated.canvas;
        prepared = { game, original: normalized[0], layout: consolidated.layout, verifiedRibbonIds: consolidated.verifiedRibbonIds };
      }
      this.prepared.set(canvas, prepared);
      const analysis = await this.analyzePrepared(canvas, prepared, progress);
      progress('Screenshots ready for review', 1);
      return { canvas, analysis, fileCount: files.length };
    });
  }

  analyze(canvas: HTMLCanvasElement, progress: ScreenshotProgress = () => {}): Promise<ScreenshotAnalysis> {
    return this.run(async () => {
      const prepared = this.prepared.get(canvas);
      if (!prepared) throw new Error('Select the original screenshots again to retry recognition.');
      return this.analyzePrepared(canvas, prepared, progress);
    });
  }

  private async analyzePrepared(canvas: HTMLCanvasElement, prepared: Prepared, progress: ScreenshotProgress): Promise<ScreenshotAnalysis> {
    if (prepared.game === 'home') {
      const result = await analyzeHomeSummary(canvas, (_stage, detail, amount) => progress(detail, .4 + amount * .6));
      return { ...result, game: 'home', warnings: [], identityConfirmed: !!result.identity.candidates.length };
    }
    const game = prepared.game, profile = GAME_LAYOUTS[game], warnings: string[] = [];
    progress('Reading the Pokémon summary', .6);
    const textCanvas = cropCanvas(prepared.original, profile.text.x, profile.text.y, profile.text.width, profile.text.height);
    let text = { text: '', confidence: 0 }, level = text;
    try {
      text = await readGameScreenshotText(textCanvas);
      level = profile.level ? await readGameScreenshotText(cropCanvas(prepared.original, profile.level.x, profile.level.y, profile.level.width, profile.level.height)) : text;
    } catch {
      warnings.push('Text recognition was unavailable. Select the Pokémon and review its details manually.');
    }
    const identity = matchPokemonIdentity(`${text.text}\n${level.text}`, POKEMON);
    // Do not turn fuzzy matches to nicknames such as "Nyx" or "Ribbondol"
    // into arbitrary species. Populate the field only for a full name/dex match.
    const words = ` ${normalizeOcrText(text.text)} `;
    identity.candidates = identity.candidates.filter(candidate => {
      const name = normalizeOcrText(POKEMON[candidate.baseKey]?.names?.en ?? '');
      return (!!name && words.includes(` ${name} `)) || identity.dexNumber === candidate.dexNumber;
    });
    identity.recognizedName = identity.candidates[0]?.displayName ?? null;
    const nickname = game === 'sv' ? text.text.match(/^(.*?)\s+the\b/im)?.[1]?.trim() ?? null : text.text.replace(/\bLv\.?\s*\d+.*/i, '').replace(/[♂♀]/g, '').trim() || null;
    const ocr: HomeOcrResult = { identityText: text.text, identityConfidence: text.confidence, identityLines: [], trainerNotesText: '', trainerNotesConfidence: 0,
      nicknameText: nickname ?? '', nicknameConfidence: text.confidence, languageText: '', languageConfidence: 0, trainerNameText: '', trainerNameConfidence: 0, trainerIdText: '', trainerIdConfidence: 0 };
    progress('Reading the consolidated ribbon grid', .75);
    const ribbonMatches = await matchRibbonGrid(canvas, prepared.layout!, (count, total) => progress(`Matching ribbon ${count} of ${total}`, .75 + count / total * .2), GAME_RIBBON_ACCEPTANCE);
    ribbonMatches.forEach((match, index) => {
      const caption = prepared.verifiedRibbonIds?.[index];
      if (caption) ribbonMatches[index] = { ...match, best: { ribbonId: caption, score: 0 }, accepted: true, confidence: 1, margin: 1 };
    });
    const details: SummaryDetails = { nickname, nicknameConfidence: text.confidence, detectedGender: null, gender: null, shiny: false, language: null, languageConfidence: 0,
      nature: null, ball: null, ballCandidates: [], ot: null, otConfidence: 0, idNo: null, idNoConfidence: 0 };
    if (!identity.candidates.length && !warnings.length) warnings.push('The screenshot shows a nickname or unreadable species. Select the Pokémon and form below.');
    if (!ribbonMatches.length) warnings.push('No complete ribbon icons were found. Include the ribbon grid in your screenshots.');
    const best = identity.candidates[0];
    return { game, warnings, identityConfirmed: !!identity.candidates.length, ocr, identity, details, origin: { origin: null, confidence: 0, matchedPhrase: null },
      formOptions: best ? getFormOptions(best.baseKey, POKEMON) : [], ribbonMatches,
      detectedRibbonIds: [...new Set(ribbonMatches.filter(match => match.accepted).map(match => match.best.ribbonId))] };
  }
}

export const screenshotProcessor = new ScreenshotProcessor();
