import ribbonsData from '../data/ribbons.json';
import type { RibbonGridCell, RibbonGridLayout } from './ribbonGrid';

const NORMALIZED_SIZE = 48;

interface NormalizedIcon {
  pixels: Uint8ClampedArray;
}

export interface RibbonMatchCandidate {
  ribbonId: string;
  score: number;
}

export interface RibbonCellMatch {
  cell: RibbonGridCell;
  best: RibbonMatchCandidate;
  alternatives: RibbonMatchCandidate[];
  confidence: number;
  margin: number;
  accepted: boolean;
}

export type RibbonMatchProgress = (completed: number, total: number) => void;

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function getOpaqueBounds(image: ImageData): {
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  let left = image.width;
  let top = image.height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const alpha = image.data[(y * image.width + x) * 4 + 3];
      if (alpha < 24) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  return right < left
    ? null
    : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

function normalizeTransparentCanvas(canvas: HTMLCanvasElement): NormalizedIcon {
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const bounds = getOpaqueBounds(image);
  if (!bounds) return { pixels: new Uint8ClampedArray(NORMALIZED_SIZE ** 2 * 4) };

  const output = createCanvas(NORMALIZED_SIZE, NORMALIZED_SIZE);
  const outputContext = output.getContext('2d', { willReadFrequently: true })!;
  const padding = 2;
  const scale = Math.min(
    (NORMALIZED_SIZE - padding * 2) / bounds.width,
    (NORMALIZED_SIZE - padding * 2) / bounds.height,
  );
  const width = bounds.width * scale;
  const height = bounds.height * scale;
  const x = (NORMALIZED_SIZE - width) / 2;
  const y = (NORMALIZED_SIZE - height) / 2;

  outputContext.imageSmoothingEnabled = true;
  outputContext.imageSmoothingQuality = 'high';
  outputContext.drawImage(
    canvas,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    x,
    y,
    width,
    height,
  );

  return {
    pixels: outputContext.getImageData(
      0,
      0,
      NORMALIZED_SIZE,
      NORMALIZED_SIZE,
    ).data,
  };
}

function normalizeCell(
  source: HTMLCanvasElement,
  cell: RibbonGridCell,
  background: readonly number[],
): NormalizedIcon {
  const crop = createCanvas(cell.width, cell.height);
  const context = crop.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(
    source,
    cell.x,
    cell.y,
    cell.width,
    cell.height,
    0,
    0,
    cell.width,
    cell.height,
  );

  const image = context.getImageData(0, 0, cell.width, cell.height);
  for (let index = 0; index < image.data.length; index += 4) {
    const distance = (
      Math.abs(image.data[index] - background[0])
      + Math.abs(image.data[index + 1] - background[1])
      + Math.abs(image.data[index + 2] - background[2])
    );
    image.data[index + 3] = distance <= 28
      ? 0
      : Math.min(255, Math.round((distance - 28) * 5));
  }
  context.clearRect(0, 0, cell.width, cell.height);
  context.putImageData(image, 0, 0);

  return normalizeTransparentCanvas(crop);
}

export function scoreNormalizedIcons(
  first: Uint8ClampedArray,
  second: Uint8ClampedArray,
): number {
  if (first.length !== second.length) {
    throw new Error('Cannot compare normalized icons with different sizes');
  }

  let difference = 0;
  let compared = 0;

  for (let index = 0; index < first.length; index += 4) {
    const firstAlpha = first[index + 3] / 255;
    const secondAlpha = second[index + 3] / 255;
    const visible = Math.max(firstAlpha, secondAlpha);
    if (visible < 0.03) continue;

    const alphaDifference = Math.abs(firstAlpha - secondAlpha);
    const colorDifference = (
      Math.abs(first[index] - second[index])
      + Math.abs(first[index + 1] - second[index + 1])
      + Math.abs(first[index + 2] - second[index + 2])
    ) / (255 * 3);

    difference += alphaDifference * 0.55 + colorDifference * visible * 0.45;
    compared++;
  }

  return compared === 0 ? 1 : difference / compared;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load ribbon reference: ${url}`));
    image.src = url;
  });
}

async function loadReferences(): Promise<Map<string, NormalizedIcon>> {
  const references = new Map<string, NormalizedIcon>();
  const ribbonIds = Object.keys(ribbonsData);

  await Promise.all(ribbonIds.map(async ribbonId => {
    const url = `${import.meta.env.BASE_URL}images/ribbons/${ribbonId}.png`;
    const image = await loadImage(url);
    const canvas = createCanvas(image.naturalWidth, image.naturalHeight);
    canvas.getContext('2d')!.drawImage(image, 0, 0);
    references.set(ribbonId, normalizeTransparentCanvas(canvas));
  }));

  return references;
}

let referencePromise: Promise<Map<string, NormalizedIcon>> | null = null;

export async function matchRibbonGrid(
  canvas: HTMLCanvasElement,
  layout: RibbonGridLayout,
  onProgress?: RibbonMatchProgress,
): Promise<RibbonCellMatch[]> {
  referencePromise ??= loadReferences();
  const references = await referencePromise;
  const matches: RibbonCellMatch[] = [];

  for (let index = 0; index < layout.cells.length; index++) {
    const cell = layout.cells[index];
    const normalized = normalizeCell(canvas, cell, layout.background);
    const ranked = [...references.entries()]
      .map(([ribbonId, reference]) => ({
        ribbonId,
        score: scoreNormalizedIcons(normalized.pixels, reference.pixels),
      }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 12);

    const best = ranked[0];
    const margin = ranked[1] ? ranked[1].score - best.score : 0;
    const confidence = Math.max(0, Math.min(1, 1 - best.score));

    matches.push({
      cell,
      best,
      alternatives: ranked.slice(1),
      confidence,
      margin,
      accepted: confidence >= 0.72 && margin >= 0.012,
    });
    onProgress?.(index + 1, layout.cells.length);
  }

  return matches;
}
