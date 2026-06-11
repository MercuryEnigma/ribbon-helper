import { compositeCanvases } from './imageUtils';
import {
  chooseSeam,
  extractRowFeatures,
  findBestVerticalOffset,
} from './overlapMatcher';

export type ProgressCallback = (step: number, total: number, detail: string) => void;

function findOverlap(c1: HTMLCanvasElement, c2: HTMLCanvasElement): [number, number] | null {
  if (c1.width !== c2.width) {
    throw new Error(
      `Screenshots must have the same width (${c1.width}px and ${c2.width}px provided)`,
    );
  }

  const data1 = c1.getContext('2d')!.getImageData(0, 0, c1.width, c1.height);
  const data2 = c2.getContext('2d')!.getImageData(0, 0, c2.width, c2.height);
  const features1 = extractRowFeatures(data1);
  const features2 = extractRowFeatures(data2);
  const offset = findBestVerticalOffset(features1, features2);

  return offset === null ? null : chooseSeam(features1, features2, offset);
}

async function mergePair(
  c1: HTMLCanvasElement,
  c2: HTMLCanvasElement,
): Promise<HTMLCanvasElement> {
  const match = findOverlap(c1, c2);
  if (!match) {
    throw new Error(
      'Could not find a reliable overlap. Check that the screenshots are sequential and in the correct order.',
    );
  }

  return compositeCanvases(c1, match[0], c2, match[1]);
}

export async function mergeAll(
  canvases: HTMLCanvasElement[],
  onProgress?: ProgressCallback,
): Promise<HTMLCanvasElement> {
  const total = canvases.length - 1;
  let result = canvases[0];

  for (let i = 0; i < total; i++) {
    onProgress?.(i, total, `Stitching image ${i + 2} of ${canvases.length}…`);
    result = await mergePair(result, canvases[i + 1]);
    onProgress?.(i + 1, total, `Merged ${i + 2} of ${canvases.length} images`);
  }

  return result;
}
