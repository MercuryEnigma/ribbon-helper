const BANDS = [
  [0.05, 0.4],
  [0.6, 0.95],
] as const;
const BINS_PER_BAND = 8;
const HORIZONTAL_SAMPLE_STEP = 4;
const FEATURE_SIZE = BANDS.length * BINS_PER_BAND;
const SEARCH_MARGIN = 12;
const MIN_OVERLAP_PIXELS = 180;
const MAX_ALIGNMENT_ERROR = 6;

export interface RowFeatures {
  height: number;
  size: number;
  values: Uint8Array;
}

interface OffsetScore {
  offset: number;
  score: number;
}

export function extractRowFeatures(image: ImageData): RowFeatures {
  const values = new Uint8Array(image.height * FEATURE_SIZE);
  let featureIndex = 0;

  for (let y = 0; y < image.height; y++) {
    for (const [startRatio, endRatio] of BANDS) {
      const bandStart = Math.floor(image.width * startRatio);
      const bandEnd = Math.ceil(image.width * endRatio);
      const bandWidth = bandEnd - bandStart;

      for (let bin = 0; bin < BINS_PER_BAND; bin++) {
        const startX = bandStart + Math.floor((bandWidth * bin) / BINS_PER_BAND);
        const endX = bandStart + Math.floor((bandWidth * (bin + 1)) / BINS_PER_BAND);
        let luminance = 0;
        let pixelCount = 0;

        for (let x = startX; x < endX; x += HORIZONTAL_SAMPLE_STEP) {
          const pixelIndex = (y * image.width + x) * 4;
          luminance += (
            77 * image.data[pixelIndex]
            + 150 * image.data[pixelIndex + 1]
            + 29 * image.data[pixelIndex + 2]
          ) >> 8;
          pixelCount++;
        }

        values[featureIndex++] = Math.round(luminance / Math.max(1, pixelCount));
      }
    }
  }

  return { height: image.height, size: FEATURE_SIZE, values };
}

function minimumOverlap(first: RowFeatures, second: RowFeatures): number {
  return Math.max(
    MIN_OVERLAP_PIXELS,
    Math.floor(Math.min(first.height, second.height) * 0.12),
  );
}

function scoreOffset(
  first: RowFeatures,
  second: RowFeatures,
  offset: number,
  rowStep: number,
): number | null {
  const start = Math.max(
    SEARCH_MARGIN,
    Math.floor(first.height * 0.4) - offset,
  );
  const end = Math.min(
    Math.floor(second.height * 0.6),
    second.height - SEARCH_MARGIN,
    first.height - offset - SEARCH_MARGIN,
  );

  if (end - start < minimumOverlap(first, second)) return null;

  let difference = 0;
  let compared = 0;

  for (let y = start; y < end; y += rowStep) {
    const firstBase = (offset + y) * first.size;
    const secondBase = y * second.size;

    for (let feature = 0; feature < first.size; feature++) {
      difference += Math.abs(
        first.values[firstBase + feature] - second.values[secondBase + feature],
      );
      compared++;
    }
  }

  return compared > 0 ? difference / compared : null;
}

function rankOffsets(
  first: RowFeatures,
  second: RowFeatures,
  offsets: Iterable<number>,
  rowStep: number,
): OffsetScore[] {
  const ranked: OffsetScore[] = [];

  for (const offset of offsets) {
    const score = scoreOffset(first, second, offset, rowStep);
    if (score !== null) ranked.push({ offset, score });
  }

  return ranked.sort((a, b) => a.score - b.score || b.offset - a.offset);
}

export function findBestVerticalOffset(
  first: RowFeatures,
  second: RowFeatures,
): number | null {
  if (first.size !== second.size) {
    throw new Error('Cannot compare row features with different sizes');
  }

  const maxOffset = first.height - minimumOverlap(first, second);
  const coarseOffsets: number[] = [];
  for (let offset = 0; offset <= maxOffset; offset += 4) {
    coarseOffsets.push(offset);
  }

  const coarse = rankOffsets(first, second, coarseOffsets, 4).slice(0, 8);
  if (coarse.length === 0) return null;

  const fineOffsets = new Set<number>();
  for (const candidate of coarse) {
    for (let offset = candidate.offset - 6; offset <= candidate.offset + 6; offset++) {
      if (offset >= 0 && offset <= maxOffset) fineOffsets.add(offset);
    }
  }

  const fine = rankOffsets(first, second, fineOffsets, 2).slice(0, 4);
  if (fine.length === 0) return null;

  const finalOffsets = new Set<number>();
  for (const candidate of fine) {
    for (let offset = candidate.offset - 2; offset <= candidate.offset + 2; offset++) {
      if (offset >= 0 && offset <= maxOffset) finalOffsets.add(offset);
    }
  }

  const best = rankOffsets(first, second, finalOffsets, 1)[0];
  return best && best.score <= MAX_ALIGNMENT_ERROR ? best.offset : null;
}

function rowDifference(
  first: RowFeatures,
  firstY: number,
  second: RowFeatures,
  secondY: number,
): number {
  const firstBase = firstY * first.size;
  const secondBase = secondY * second.size;
  let difference = 0;

  for (let feature = 0; feature < first.size; feature++) {
    difference += Math.abs(
      first.values[firstBase + feature] - second.values[secondBase + feature],
    );
  }

  return difference / first.size;
}

export function chooseSeam(
  first: RowFeatures,
  second: RowFeatures,
  offset: number,
): [number, number] {
  const overlap = Math.min(second.height, first.height - offset);
  const target = overlap / 2;
  const start = Math.max(SEARCH_MARGIN + 1, Math.floor(overlap * 0.35));
  const end = Math.min(overlap - SEARCH_MARGIN - 1, Math.ceil(overlap * 0.65));
  let bestY = Math.round(target);
  let bestScore = Number.POSITIVE_INFINITY;

  for (let y = start; y <= end; y++) {
    const mismatch = rowDifference(first, offset + y, second, y);
    const firstDetail = rowDifference(first, offset + y - 1, first, offset + y + 1);
    const secondDetail = rowDifference(second, y - 1, second, y + 1);
    const distanceFromMiddle = Math.abs(y - target) / overlap;
    const score = mismatch * 3 + firstDetail + secondDetail + distanceFromMiddle;

    if (score < bestScore) {
      bestScore = score;
      bestY = y;
    }
  }

  return [offset + bestY, bestY];
}
