import { canvasToBlob } from '../home-merger/imageUtils';
import { screenshotProcessor } from '../screenshot-processor/ScreenshotProcessor';
import type { ScreenshotGame } from '../screenshot-processor/gameLayouts';

export interface ContestRecognition {
  game: ScreenshotGame;
  imageUrl: string;
  pokemon: string;
  ribbonIds: string[];
  warning: string;
  candidates: { key: string; confidence: number }[];
}

/** Contest presentation adapter; recognition and consolidation belong to the
 * same ScreenshotProcessor instance used by Ribbon Checker. */
export async function recognizeContestFiles(files: File[], progress: (message: string) => void): Promise<ContestRecognition> {
  const { canvas, analysis } = await screenshotProcessor.process(files, detail => progress(detail));
  const blob = await canvasToBlob(canvas);
  return {
    game: analysis.game,
    imageUrl: URL.createObjectURL(blob),
    pokemon: analysis.identityConfirmed ? analysis.identity.candidates[0]?.pokemonKey ?? '' : '',
    ribbonIds: analysis.detectedRibbonIds,
    warning: analysis.warnings.join(' '),
    candidates: analysis.ribbonMatches.filter(match => !match.accepted).map(match => ({ key: match.best.ribbonId, confidence: match.confidence })),
  };
}
