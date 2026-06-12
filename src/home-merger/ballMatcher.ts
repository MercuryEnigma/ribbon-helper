export const BALL_NAMES: Record<string, string> = {
  poke: 'Poké Ball',
  great: 'Great Ball',
  ultra: 'Ultra Ball',
  master: 'Master Ball',
  safari: 'Safari Ball',
  level: 'Level Ball',
  lure: 'Lure Ball',
  moon: 'Moon Ball',
  friend: 'Friend Ball',
  love: 'Love Ball',
  heavy: 'Heavy Ball',
  fast: 'Fast Ball',
  sport: 'Sport Ball',
  premier: 'Premier Ball',
  repeat: 'Repeat Ball',
  timer: 'Timer Ball',
  nest: 'Nest Ball',
  net: 'Net Ball',
  dive: 'Dive Ball',
  luxury: 'Luxury Ball',
  heal: 'Heal Ball',
  quick: 'Quick Ball',
  dusk: 'Dusk Ball',
  cherish: 'Cherish Ball',
  dream: 'Dream Ball',
  beast: 'Beast Ball',
  'hisuian-poke': 'Hisuian Poké Ball',
  'hisuian-great': 'Hisuian Great Ball',
  'hisuian-ultra': 'Hisuian Ultra Ball',
  'hisuian-heavy': 'Hisuian Heavy Ball',
  leaden: 'Leaden Ball',
  gigaton: 'Gigaton Ball',
  feather: 'Feather Ball',
  wing: 'Wing Ball',
  jet: 'Jet Ball',
  origin: 'Origin Ball',
  strange: 'Strange Ball',
};

export const BALL_IDS = Object.keys(BALL_NAMES);
export const ORIGINAL_BALL_IDS = BALL_IDS.filter(ballId => ballId !== 'strange');

export interface BallMatch {
  ballId: string;
  score: number;
}

/** Mean per-pixel RGB distance below which the best ball match is trusted. */
export const BALL_ACCEPT_SCORE = 140;

const GRID_SIZE = 20;
/** Compare only the inner disc of the icon, skipping the outline and shadow. */
const INNER_RADIUS_SQ = 0.5;

interface BallReference {
  ballId: string;
  pixels: Uint8ClampedArray;
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load ball reference: ${url}`));
    image.src = url;
  });
}

function toReferencePixels(image: HTMLImageElement): Uint8ClampedArray {
  const source = createCanvas(image.naturalWidth, image.naturalHeight);
  const sourceContext = source.getContext('2d', { willReadFrequently: true })!;
  sourceContext.drawImage(image, 0, 0);
  const data = sourceContext.getImageData(0, 0, source.width, source.height);

  // The sprites carry a drop shadow below the ball, so derive the circle from
  // the fully opaque pixels and anchor a square crop at their top edge.
  let left = source.width;
  let right = -1;
  let top = source.height;
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      if (data.data[(y * source.width + x) * 4 + 3] <= 250) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
    }
  }
  const size = Math.max(1, right - left + 1);

  const output = createCanvas(GRID_SIZE, GRID_SIZE);
  const outputContext = output.getContext('2d', { willReadFrequently: true })!;
  outputContext.imageSmoothingEnabled = true;
  outputContext.imageSmoothingQuality = 'high';
  outputContext.drawImage(image, left, top, size, size, 0, 0, GRID_SIZE, GRID_SIZE);
  return outputContext.getImageData(0, 0, GRID_SIZE, GRID_SIZE).data;
}

async function loadReferences(): Promise<BallReference[]> {
  return Promise.all(BALL_IDS.map(async ballId => {
    const url = `${import.meta.env.BASE_URL}images/balls/${ballId}.png`;
    return { ballId, pixels: toReferencePixels(await loadImage(url)) };
  }));
}

let referencePromise: Promise<BallReference[]> | null = null;

function scoreBall(
  reference: Uint8ClampedArray,
  target: Uint8ClampedArray,
): number {
  let difference = 0;
  let compared = 0;
  const center = (GRID_SIZE - 1) / 2;

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const dx = (x - center) / center;
      const dy = (y - center) / center;
      if (dx * dx + dy * dy > INNER_RADIUS_SQ) continue;
      const index = (y * GRID_SIZE + x) * 4;
      if (reference[index + 3] <= 250) continue;

      difference += (
        Math.abs(reference[index] - target[index])
        + Math.abs(reference[index + 1] - target[index + 1])
        + Math.abs(reference[index + 2] - target[index + 2])
      );
      compared++;
    }
  }

  return compared === 0 ? Number.POSITIVE_INFINITY : difference / compared;
}

export async function matchBallIcon(
  canvas: HTMLCanvasElement,
  centerX: number,
  centerY: number,
  radius: number,
): Promise<BallMatch[]> {
  referencePromise ??= loadReferences();
  const references = await referencePromise;

  const crop = createCanvas(GRID_SIZE, GRID_SIZE);
  const context = crop.getContext('2d', { willReadFrequently: true })!;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    canvas,
    Math.round(centerX - radius),
    Math.round(centerY - radius),
    Math.round(radius * 2),
    Math.round(radius * 2),
    0,
    0,
    GRID_SIZE,
    GRID_SIZE,
  );
  const target = context.getImageData(0, 0, GRID_SIZE, GRID_SIZE).data;

  return references
    .map(reference => ({
      ballId: reference.ballId,
      score: scoreBall(reference.pixels, target),
    }))
    .sort((a, b) => a.score - b.score);
}
