import { cropCanvas, scaleCanvas } from './imageUtils';
import type { PixelRect } from './ribbonGrid';

export interface OcrWord {
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OcrLine {
  text: string;
  words: OcrWord[];
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface HomeOcrResult {
  identityText: string;
  identityConfidence: number;
  identityLines: OcrLine[];
  trainerNotesText: string;
  trainerNotesConfidence: number;
  nicknameText: string;
  nicknameConfidence: number;
  languageText: string;
  languageConfidence: number;
  trainerNameText: string;
  trainerNameConfidence: number;
  trainerIdText: string;
  trainerIdConfidence: number;
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

function scaledCrop(
  canvas: HTMLCanvasElement,
  rect: PixelRect,
  maxScale = 2,
): { canvas: HTMLCanvasElement; scale: number } {
  const crop = cropCanvas(canvas, rect.x, rect.y, rect.width, rect.height);
  const scale = Math.max(1, Math.min(maxScale, 1800 / crop.width));
  return { canvas: scaleCanvas(crop, scale), scale };
}

function extractLines(blocks: any[], rect: PixelRect, scale: number): OcrLine[] {
  const lines: OcrLine[] = [];

  for (const block of blocks ?? []) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        const words: OcrWord[] = (line.words ?? []).map((word: any) => ({
          text: word.text ?? '',
          x0: rect.x + word.bbox.x0 / scale,
          y0: rect.y + word.bbox.y0 / scale,
          x1: rect.x + word.bbox.x1 / scale,
          y1: rect.y + word.bbox.y1 / scale,
        }));
        if (words.length === 0) continue;

        lines.push({
          text: (line.text ?? '').trim(),
          words,
          x0: rect.x + line.bbox.x0 / scale,
          y0: rect.y + line.bbox.y0 / scale,
          x1: rect.x + line.bbox.x1 / scale,
          y1: rect.y + line.bbox.y1 / scale,
        });
      }
    }
  }

  return lines;
}

async function recognizeCrop(
  canvas: HTMLCanvasElement,
  rect: PixelRect,
  options: {
    withLines?: boolean;
    pageSegMode?: number;
    whitelist?: string;
    maxScale?: number;
  } = {},
): Promise<{ text: string; confidence: number; lines: OcrLine[] }> {
  const worker = await getWorker();
  const { PSM } = await import('tesseract.js');
  const {
    withLines = false,
    pageSegMode = PSM.SPARSE_TEXT,
    whitelist = '',
    maxScale = 2,
  } = options;
  await worker.setParameters({
    tessedit_pageseg_mode: pageSegMode,
    tessedit_char_whitelist: whitelist,
    preserve_interword_spaces: '1',
  });
  const { canvas: scaled, scale } = scaledCrop(canvas, rect, maxScale);
  const result = await worker.recognize(
    scaled,
    {},
    { text: true, blocks: withLines },
  );

  return {
    text: result.data.text,
    confidence: result.data.confidence,
    lines: withLines ? extractLines(result.data.blocks, rect, scale) : [],
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
  const notesTop = Math.max(0, Math.round(firstSectionHeader.y - width * 0.84));
  const notesRect: PixelRect = {
    x: Math.round(width * 0.03),
    y: notesTop,
    width: Math.round(width * 0.94),
    height: Math.max(1, firstSectionHeader.y - notesTop),
  };
  const nicknameRect: PixelRect = {
    x: Math.round(width * 0.08),
    y: Math.round(width * 0.21),
    width: Math.round(width * 0.38),
    height: Math.round(width * 0.09),
  };
  const languageRect: PixelRect = {
    x: Math.round(width * 0.64),
    y: Math.round(width * 0.225),
    width: Math.round(width * 0.09),
    height: Math.round(width * 0.06),
  };
  const firstSectionCenter = firstSectionHeader.y + firstSectionHeader.height / 2;
  const trainerRowCenter = firstSectionCenter - width * 0.78;
  const trainerNameRect: PixelRect = {
    x: Math.round(width * 0.22),
    y: Math.round(trainerRowCenter - width * 0.05),
    width: Math.round(width * 0.28),
    height: Math.round(width * 0.1),
  };
  const trainerIdRect: PixelRect = {
    x: Math.round(width * 0.7),
    y: Math.round(trainerRowCenter - width * 0.05),
    width: Math.round(width * 0.27),
    height: Math.round(width * 0.1),
  };

  try {
    onProgress?.('Reading Pokémon identity', 0);
    const identity = await recognizeCrop(canvas, identityRect, { withLines: true });
    onProgress?.('Reading Trainer Notes', 0);
    const trainerNotes = await recognizeCrop(canvas, notesRect);
    const { PSM } = await import('tesseract.js');
    onProgress?.('Reading nickname', 0);
    const nickname = await recognizeCrop(canvas, nicknameRect, {
      pageSegMode: PSM.SINGLE_LINE,
      maxScale: 3,
    });
    onProgress?.('Reading language', 0);
    const language = await recognizeCrop(canvas, languageRect, {
      pageSegMode: PSM.SINGLE_WORD,
      whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      maxScale: 4,
    });
    onProgress?.('Reading Original Trainer', 0);
    const trainerName = await recognizeCrop(canvas, trainerNameRect, {
      pageSegMode: PSM.SINGLE_LINE,
      maxScale: 3,
    });
    onProgress?.('Reading ID No.', 0);
    const trainerId = await recognizeCrop(canvas, trainerIdRect, {
      pageSegMode: PSM.SINGLE_LINE,
      whitelist: '0123456789',
      maxScale: 4,
    });

    return {
      identityText: identity.text,
      identityConfidence: identity.confidence,
      identityLines: identity.lines,
      trainerNotesText: trainerNotes.text,
      trainerNotesConfidence: trainerNotes.confidence,
      nicknameText: nickname.text,
      nicknameConfidence: nickname.confidence,
      languageText: language.text,
      languageConfidence: language.confidence,
      trainerNameText: trainerName.text,
      trainerNameConfidence: trainerName.confidence,
      trainerIdText: trainerId.text,
      trainerIdConfidence: trainerId.confidence,
    };
  } finally {
    activeProgress = undefined;
  }
}
