import { cropCanvas } from '../home-merger/imageUtils';
import type { PixelRect, RibbonGridLayout } from '../home-merger/ribbonGrid';
import { matchRibbonGrid, scoreNormalizedIcons } from '../home-merger/ribbonMatcher';
import { GAME_LAYOUTS, type SwitchScreenshotGame } from './gameLayouts';
import { isolateForeground, dominantBorder } from './imageMasks';
import { readGameScreenshotText } from '../home-merger/homeOcr';
import { normalizeOcrText } from '../home-merger/originParser';
import ribbonsData from '../data/ribbons.json';

// A contrasting neutral background preserves white mark outlines when the
// consolidated image is normalized for matching again.
const BACKGROUND: [number, number, number] = [56, 68, 86];
export const GAME_RIBBON_ACCEPTANCE = { confidence: .72, margin: .007 };
const CAPTION_IDS = new WeakMap<HTMLCanvasElement, string>();

async function selectedCaption(frame: HTMLCanvasElement): Promise<string | undefined> {
  const text = await readGameScreenshotText(cropCanvas(frame, 700, 180, 510, 65));
  if (text.confidence < 65) return;
  const normalized = ` ${normalizeOcrText(text.text)} `;
  const names = Object.entries(ribbonsData).map(([id, value]) => ({ id, name: normalizeOcrText(value.names.en) }))
    .filter(entry => normalized.includes(` ${entry.name} `)).sort((a, b) => b.name.length - a.name.length);
  if (names.length && (!names[1] || names[0].name !== names[1].name)) return names[0].id;
}

function rowCenters(panel: HTMLCanvasElement, game: SwitchScreenshotGame): number[] {
  const stride = GAME_LAYOUTS[game].stride;
  if (game !== 'bdsp') return Array.from({ length: game === 'sv' ? 4 : 3 }, (_, index) => stride * (index + .5));
  const image = panel.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, panel.width, panel.height);
  const foreground: boolean[] = [];
  for (let y = 0; y < panel.height; y++) {
    let count = 0;
    for (let x = 8; x < panel.width - 8; x += 2) {
      const i = (y * panel.width + x) * 4;
      if (Math.abs(image.data[i] - 235) + Math.abs(image.data[i + 1] - 235) + Math.abs(image.data[i + 2] - 235) > 110) count++;
    }
    foreground.push(count > 12);
  }
  // Ignore tiny gaps in an icon's outline.
  for (let y = 2; y < foreground.length - 2; y++) if (!foreground[y] && foreground.slice(y - 2, y).some(Boolean) && foreground.slice(y + 1, y + 3).some(Boolean)) foreground[y] = true;
  const centers: number[] = [];
  let start = -1;
  for (let y = 0; y <= foreground.length; y++) {
    if (foreground[y] && start < 0) start = y;
    if (!foreground[y] && start >= 0) {
      if (y - start >= 48) centers.push((start + y) / 2);
      start = -1;
    }
  }
  return centers;
}

function extractTiles(panel: HTMLCanvasElement, game: SwitchScreenshotGame, caption?: string) {
  const stride = panel.width / 5, tiles: HTMLCanvasElement[] = [];
  for (const centerY of rowCenters(panel, game)) for (let column = 0; column < 5; column++) {
    const size = Math.round(stride * .98);
    const x = Math.round(stride * (column + .5) - size / 2), y = Math.round(centerY - size / 2);
    const top = Math.max(0, y), bottom = Math.min(panel.height, y + size);
    if (bottom - top < size * .7) continue;
    const raw = cropCanvas(panel, x, top, size, bottom - top);
    const isolated = isolateForeground(raw, game === 'sv');
    if (isolated) {
      tiles.push(isolated);
      if (caption && game === 'sv') {
        const bg = dominantBorder(raw.getContext('2d')!.getImageData(0, 0, raw.width, raw.height));
        if (bg[0] > 150 && bg[1] > 100 && bg[2] < 90) CAPTION_IDS.set(isolated, caption);
      }
    }
  }
  return tiles;
}

function drawTiles(tiles: HTMLCanvasElement[]) {
  const canvas = document.createElement('canvas'); canvas.width = 500; canvas.height = Math.max(1, Math.ceil(tiles.length / 5)) * 100;
  const context = canvas.getContext('2d')!; context.fillStyle = `rgb(${BACKGROUND.join(',')})`; context.fillRect(0, 0, canvas.width, canvas.height);
  const cells = tiles.map((tile, index) => {
    const x = (index % 5) * 100 + 18, y = Math.floor(index / 5) * 100 + 18;
    context.drawImage(tile, x, y);
    return { x, y, width: 64, height: 64, row: Math.floor(index / 5), column: index % 5 };
  });
  const placeholder: PixelRect = { x: 0, y: 0, width: 1, height: 1 };
  const layout: RibbonGridLayout = { header: placeholder, followingHeader: placeholder, rows: [], cells, background: BACKGROUND };
  return { canvas, layout };
}

/** Insert blank screen space while retaining the game's panel borders and footer. */
function extendScreen(frame: HTMLCanvasElement, game: SwitchScreenshotGame, extra: number) {
  const canvas = document.createElement('canvas');
  canvas.width = frame.width; canvas.height = frame.height + extra;
  const context = canvas.getContext('2d')!;
  const panel = {
    swsh: { right: 623, seam: 397, summarySeam: 120 },
    bdsp: { right: 664, seam: 468, summarySeam: 120 },
    sv: { right: 650, seam: 580, summarySeam: 580 },
  }[game];
  for (const [x, width, seam] of [[0, panel.right, panel.seam], [panel.right, frame.width - panel.right, panel.summarySeam]]) {
    context.drawImage(frame, x, 0, width, seam, x, 0, width, seam);
    if (extra) context.drawImage(frame, x, seam - 1, width, 1, x, seam, width, extra);
    context.drawImage(frame, x, seam, width, frame.height - seam, x, seam + extra, width, frame.height - seam);
  }
  return canvas;
}

/** Register only the scrolling ribbon panel, not the fixed model and UI.
 * Small overlaps matter: BDSP's viewport can cut a row in half between shots. */
function panelOffset(first: HTMLCanvasElement, second: HTMLCanvasElement): { offset: number; score: number } | null {
  const a = first.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, first.width, first.height);
  const b = second.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, second.width, second.height);
  let best = { offset: 0, score: Infinity };
  for (let offset = 0; offset <= first.height - 3; offset++) {
    const overlap = Math.min(first.height - offset, second.height);
    const errors = Array(5).fill(0), counts = Array(5).fill(0);
    for (let y = 0; y < overlap; y += 2) for (let column = 0; column < 5; column++) for (let sample = 1; sample <= 7; sample++) {
      const x = Math.round((column + sample / 8) * first.width / 5);
      const ai = ((offset + y) * first.width + x) * 4, bi = (y * second.width + x) * 4;
      // Blank background cannot establish a correspondence.
      const foreground = Math.abs(a.data[ai] - 235) + Math.abs(a.data[ai + 1] - 235) + Math.abs(a.data[ai + 2] - 235);
      if (foreground < 100) continue;
      errors[column] += Math.abs(a.data[ai] - b.data[bi]) + Math.abs(a.data[ai + 1] - b.data[bi + 1]) + Math.abs(a.data[ai + 2] - b.data[bi + 2]);
      counts[column]++;
    }
    const scores = errors.map((error, column) => counts[column] > Math.max(3, overlap * .1) ? error / counts[column] / 3 : Infinity).sort((x, y) => x - y);
    const score = (scores[0] + scores[1] + scores[2]) / 3 + 2 / overlap;
    if (score < best.score) best = { offset, score };
  }
  return best.score < 18 ? best : null;
}

export async function consolidateGameRibbons(frames: HTMLCanvasElement[], game: SwitchScreenshotGame, progress: (detail: string) => void) {
  const profile = GAME_LAYOUTS[game];
  const panels = frames.map(frame => cropCanvas(frame, profile.grid.x, profile.grid.y, profile.grid.width, profile.grid.height));
  let tiles: HTMLCanvasElement[];
  if (game === 'bdsp' && panels.length > 1) {
    let merged = panels[0], allRegistered = true;
    for (const panel of panels.slice(1)) {
      let match = panelOffset(merged, panel);
      let partialSeam: number | null = null;
      if (!match) {
        const previous = rowCenters(merged, game), next = rowCenters(panel, game);
        const partialCenter = previous.length ? previous[previous.length - 1] + profile.stride : NaN;
        // Some BDSP captures expose complementary halves of a row with no
        // common pixels. Align their regular row pitch, keeping both halves.
        if (Number.isFinite(partialCenter) && Math.abs(merged.height - partialCenter) < profile.stride * .35 && next[0] > profile.stride * .8) {
          match = { offset: Math.round(partialCenter + profile.stride - next[0]), score: -1 };
          partialSeam = Math.round(partialCenter);
        }
      }
      if (!match) { allRegistered = false; break; }
      const output = document.createElement('canvas'); output.width = merged.width; output.height = Math.max(merged.height, match.offset + panel.height);
      const context = output.getContext('2d')!; context.drawImage(merged, 0, 0);
      const seam = partialSeam ?? Math.round((Math.min(merged.height, match.offset + panel.height) + match.offset) / 2);
      context.drawImage(panel, 0, seam - match.offset, panel.width, panel.height - (seam - match.offset), 0, seam, panel.width, panel.height - (seam - match.offset));
      merged = output;
    }
    tiles = allRegistered ? extractTiles(merged, game) : panels.flatMap(panel => extractTiles(panel, game));
  } else {
    tiles = [];
    for (const [index, panel] of panels.entries()) {
      // SV's cursor covers the selected icon. Its explicit on-screen name is
      // stronger evidence than comparing the partially occluded artwork.
      const caption = game === 'sv' ? await selectedCaption(frames[index]).catch(() => undefined) : undefined;
      tiles.push(...extractTiles(panel, game, caption));
    }
  }
  progress('Combining visible ribbon rows');
  const initial = drawTiles(tiles);
  const initialMatches = tiles.length ? await matchRibbonGrid(initial.canvas, initial.layout, undefined, GAME_RIBBON_ACCEPTANCE) : [];
  const kept: HTMLCanvasElement[] = [], pixels: Uint8ClampedArray[] = [], known = new Set<string>();
  initialMatches.forEach((match, index) => {
    const caption = CAPTION_IDS.get(tiles[index]);
    if (caption) { match = { ...match, best: { ribbonId: caption, score: 0 }, accepted: true }; }
    const image = tiles[index].getContext('2d')!.getImageData(0, 0, 64, 64).data;
    if (match.accepted ? known.has(match.best.ribbonId) : pixels.some(previous => scoreNormalizedIcons(previous, image) < .012)) return;
    if (match.accepted) known.add(match.best.ribbonId);
    kept.push(tiles[index]); pixels.push(image);
  });
  const grid = drawTiles(kept);
  const stride = profile.grid.width / 5;
  const height = Math.ceil(kept.length / 5) * stride;
  const extra = Math.max(0, Math.ceil(height - profile.grid.height));
  const canvas = extendScreen(frames[0], game, extra);
  const context = canvas.getContext('2d')!;
  // Sample the original empty panel, preserving its own color rather than
  // exposing the contrasting background used privately for icon recognition.
  context.drawImage(frames[0], profile.grid.x - 6, profile.grid.y + 10, 2, 2,
    profile.grid.x, profile.grid.y, profile.grid.width, profile.grid.height + extra);
  const cells = kept.map((tile, index) => {
    const left = profile.grid.x + (index % 5) * stride;
    const top = profile.grid.y + Math.floor(index / 5) * stride;
    if (game === 'swsh') {
      context.save(); context.shadowColor = '#0003'; context.shadowBlur = 3; context.shadowOffsetY = 2;
      context.fillStyle = '#fff'; context.fillRect(left + 3, top + 3, stride - 10, stride - 10); context.restore();
    }
    const size = stride * .8, inset = (stride - size) / 2;
    context.drawImage(tile, left + inset, top + inset, size, size);
    return { x: left + inset, y: top + inset, width: size, height: size, row: Math.floor(index / 5), column: index % 5 };
  });
  const layout = { ...grid.layout, cells, background: profile.background };
  return { canvas, layout, recognition: grid, verifiedRibbonIds: kept.map(tile => CAPTION_IDS.get(tile)) };
}
