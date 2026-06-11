import { cropCanvas, scaleCanvas } from './imageUtils';
import type { PixelRect } from './ribbonGrid';

export interface HomeOcrResult {
  identityText: string;
  identityConfidence: number;
  trainerNotesText: string;
  trainerNotesConfidence: number;
}

export type OcrProgress = (status: string, progress: number) => void;

let activeProgress: OcrProgress | undefined;
let workerPromise: Promise<any> | null = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = import('tesseract.js').then(async ({ createWorker }) => (
      createWorker('eng', 1, {
        workerPath: `${import.meta.env.BASE_URL}tesseract/worker.min.js`,
        corePath: `${import.meta.env.BASE_URL}tesseract`,
        langPath: `${import.meta.env.BASE_URL}tesseract`,
        logger: message => activeProgress?.(
          message.status,
          Number.isFinite(message.progress) ? message.progress : 0,
        ),
      })
    ));
  }
  return workerPromise;
}

function scaledCrop(canvas: HTMLCanvasElement, rect: PixelRect): HTMLCanvasElement {
  const crop = cropCanvas(canvas, rect.x, rect.y, rect.width, rect.height);
  return scaleCanvas(crop, Math.max(1, Math.min(2, 1800 / crop.width)));
}

async function recognizeCrop(
  canvas: HTMLCanvasElement,
  rect: PixelRect,
): Promise<{ text: string; confidence: number }> {
  const worker = await getWorker();
  const { PSM } = await import('tesseract.js');
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
  const result = await worker.recognize(scaledCrop(canvas, rect));
  return {
    text: result.data.text,
    confidence: result.data.confidence,
  };
}

export async function readHomeSummaryText(
  canvas: HTMLCanvasElement,
  firstSectionHeader: PixelRect,
  onProgress?: OcrProgress,
): Promise<HomeOcrResult> {
  activeProgress = onProgress;
  const width = canvas.width;
  const identityRect: PixelRect = {
    x: Math.round(width * 0.03),
    y: 0,
    width: Math.round(width * 0.94),
    height: Math.min(canvas.height, Math.round(width * 1.25)),
  };
  const notesTop = Math.max(0, Math.round(firstSectionHeader.y - width * 0.78));
  const notesRect: PixelRect = {
    x: Math.round(width * 0.03),
    y: notesTop,
    width: Math.round(width * 0.94),
    height: Math.max(1, firstSectionHeader.y - notesTop),
  };

  try {
    onProgress?.('Reading Pokémon identity', 0);
    const identity = await recognizeCrop(canvas, identityRect);
    onProgress?.('Reading Trainer Notes', 0);
    const trainerNotes = await recognizeCrop(canvas, notesRect);

    return {
      identityText: identity.text,
      identityConfidence: identity.confidence,
      trainerNotesText: trainerNotes.text,
      trainerNotesConfidence: trainerNotes.confidence,
    };
  } finally {
    activeProgress = undefined;
  }
}
