import { detectHomeSectionBars, type PixelRect } from '../home-merger/ribbonGrid';

export type ScreenshotGame = 'home' | 'swsh' | 'bdsp' | 'sv';
export type SwitchScreenshotGame = Exclude<ScreenshotGame, 'home'>;
export const SCREENSHOT_GAME_NAMES: Record<ScreenshotGame, string> = {
  home: 'Pokémon HOME', swsh: 'Sword / Shield', bdsp: 'Brilliant Diamond / Shining Pearl', sv: 'Scarlet / Violet',
};

/** Switch geometry is in a normalized 1280×720 frame. Only the ribbon viewport
 * scrolls; retain the fixed summary alongside it when consolidating images. */
export const GAME_LAYOUTS: Record<SwitchScreenshotGame, { grid: PixelRect; text: PixelRect; level?: PixelRect; background: [number, number, number]; stride: number }> = {
  swsh: { grid: { x: 62, y: 96, width: 500, height: 294 }, text: { x: 754, y: 25, width: 340, height: 49 }, background: [255, 255, 255], stride: 100 },
  bdsp: { grid: { x: 80, y: 94, width: 540, height: 380 }, text: { x: 758, y: 53, width: 450, height: 50 }, background: [235, 235, 235], stride: 108 },
  sv: { grid: { x: 100, y: 150, width: 533, height: 426 }, text: { x: 701, y: 511, width: 495, height: 65 }, level: { x: 127, y: 620, width: 90, height: 29 }, background: [27, 48, 77], stride: 106.5 },
};

export function detectScreenshotGame(canvas: HTMLCanvasElement): ScreenshotGame {
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  // The first HOME screenshot can precede all section headings.
  if (canvas.height > canvas.width * 1.05) return 'home';
  function sample(x: number, y: number) {
    const index = (Math.min(canvas.height - 1, Math.round(y * canvas.height)) * canvas.width + Math.min(canvas.width - 1, Math.round(x * canvas.width))) * 4;
    return [image.data[index], image.data[index + 1], image.data[index + 2]];
  }
  const [r, g, b] = sample(.1, .035);
  const panel = sample(.65, .42);
  if (r > 150 && r > g * 1.6 && r > b * 1.3) return 'swsh';
  if (panel[0] < 70 && panel[1] < 110 && panel[2] > panel[0] + 20) return 'sv';
  const cyan = sample(.91, .25), pink = sample(.12, .74);
  if (cyan[1] > cyan[0] + 25 && cyan[2] > cyan[0] + 25 && pink[0] > pink[1] + 15) return 'bdsp';
  if (detectHomeSectionBars(image).length >= 2) return 'home';
  throw new Error('The screenshot layout was not recognized. Use an uncropped Pokémon HOME, Sword/Shield, BDSP, or Scarlet/Violet ribbon screen.');
}
