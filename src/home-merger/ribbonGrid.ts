export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RibbonGridCell extends PixelRect {
  row: number;
  column: number;
}

export interface RibbonGridLayout {
  header: PixelRect;
  followingHeader: PixelRect;
  rows: PixelRect[];
  cells: RibbonGridCell[];
  background: [number, number, number];
}

const COLUMN_COUNT = 7;
const GRID_LEFT_RATIO = 0.08;
const GRID_RIGHT_RATIO = 0.87;

function pixelOffset(image: ImageData, x: number, y: number): number {
  return (y * image.width + x) * 4;
}

function colorDistance(
  red: number,
  green: number,
  blue: number,
  color: readonly number[],
): number {
  return (
    Math.abs(red - color[0])
    + Math.abs(green - color[1])
    + Math.abs(blue - color[2])
  );
}

function isHomeSectionColor(red: number, green: number, blue: number): boolean {
  return (
    red >= 205
    && red <= 240
    && green >= 225
    && green <= 248
    && blue >= 215
    && blue <= 245
    && green >= red
  );
}

function findRuns(matches: boolean[], minimumLength: number): [number, number][] {
  const runs: [number, number][] = [];
  let start = -1;

  for (let index = 0; index <= matches.length; index++) {
    if (matches[index] && start < 0) {
      start = index;
    } else if (!matches[index] && start >= 0) {
      if (index - start >= minimumLength) runs.push([start, index - 1]);
      start = -1;
    }
  }

  return runs;
}

export function detectHomeSectionBars(image: ImageData): PixelRect[] {
  const sampleStep = Math.max(2, Math.round(image.width / 300));
  const startX = Math.round(image.width * 0.05);
  const endX = Math.round(image.width * 0.95);
  const sampledColumns = Math.ceil((endX - startX) / sampleStep);
  const rowMatches: boolean[] = [];

  for (let y = 0; y < image.height; y++) {
    let matching = 0;

    for (let x = startX; x < endX; x += sampleStep) {
      const offset = pixelOffset(image, x, y);
      if (
        isHomeSectionColor(
          image.data[offset],
          image.data[offset + 1],
          image.data[offset + 2],
        )
      ) {
        matching++;
      }
    }

    rowMatches.push(matching / sampledColumns >= 0.72);
  }

  const minimumHeight = Math.max(8, Math.round(image.width * 0.025));
  return findRuns(rowMatches, minimumHeight).map(([start, end]) => ({
    x: startX,
    y: start,
    width: endX - startX,
    height: end - start + 1,
  }));
}

function estimateBackground(
  image: ImageData,
  top: number,
  bottom: number,
): [number, number, number] {
  const counts = new Map<string, number>();
  const step = Math.max(2, Math.round(image.width / 400));
  const startX = Math.round(image.width * GRID_LEFT_RATIO);
  const endX = Math.round(image.width * GRID_RIGHT_RATIO);

  for (let y = top; y < bottom; y += step) {
    for (let x = startX; x < endX; x += step) {
      const offset = pixelOffset(image, x, y);
      const red = Math.round(image.data[offset] / 4) * 4;
      const green = Math.round(image.data[offset + 1] / 4) * 4;
      const blue = Math.round(image.data[offset + 2] / 4) * 4;
      const key = `${red},${green},${blue}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const mostCommon = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!mostCommon) return [245, 250, 248];

  return mostCommon[0].split(',').map(Number) as [number, number, number];
}

function detectRibbonRows(
  image: ImageData,
  top: number,
  bottom: number,
  background: readonly number[],
): PixelRect[] {
  const startX = Math.round(image.width * GRID_LEFT_RATIO);
  const endX = Math.round(image.width * GRID_RIGHT_RATIO);
  const sampleStep = Math.max(1, Math.round(image.width / 500));
  const rowMatches: boolean[] = Array(top).fill(false);

  for (let y = top; y < bottom; y++) {
    let foreground = 0;

    for (let x = startX; x < endX; x += sampleStep) {
      const offset = pixelOffset(image, x, y);
      if (
        colorDistance(
          image.data[offset],
          image.data[offset + 1],
          image.data[offset + 2],
          background,
        ) > 36
      ) {
        foreground++;
      }
    }

    rowMatches[y] = foreground >= Math.max(6, Math.round(image.width * 0.007));
  }

  const minimumRowHeight = Math.max(12, Math.round(image.width * 0.045));
  return findRuns(rowMatches, minimumRowHeight)
    .filter(([start, end]) => start >= top && end < bottom)
    .map(([start, end]) => ({
      x: startX,
      y: start,
      width: endX - startX,
      height: end - start + 1,
    }));
}

function hasRegularRowSpacing(rows: PixelRect[], imageWidth: number): boolean {
  if (rows.length < 1) return false;
  if (rows.length === 1) return true;

  const centers = rows.map(row => row.y + row.height / 2);
  const gaps = centers.slice(1).map((center, index) => center - centers[index]);
  const averageGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  const expectedMinimum = imageWidth * 0.075;
  const expectedMaximum = imageWidth * 0.15;

  return (
    averageGap >= expectedMinimum
    && averageGap <= expectedMaximum
    && gaps.every(gap => Math.abs(gap - averageGap) <= averageGap * 0.22)
  );
}

function cellHasForeground(
  image: ImageData,
  cell: PixelRect,
  background: readonly number[],
): boolean {
  const step = Math.max(1, Math.round(image.width / 600));
  let foreground = 0;
  let sampled = 0;

  for (let y = cell.y; y < cell.y + cell.height; y += step) {
    for (let x = cell.x; x < cell.x + cell.width; x += step) {
      const offset = pixelOffset(image, x, y);
      if (
        colorDistance(
          image.data[offset],
          image.data[offset + 1],
          image.data[offset + 2],
          background,
        ) > 36
      ) {
        foreground++;
      }
      sampled++;
    }
  }

  return foreground / sampled >= 0.025;
}

export function detectRibbonGrid(image: ImageData): RibbonGridLayout {
  const bars = detectHomeSectionBars(image);
  if (bars.length < 2) {
    throw new Error(
      'The complete Ribbons section was not found. Include the Ribbons heading, every ribbon row, and the following section heading.',
    );
  }

  const header = bars[bars.length - 2];
  const followingHeader = bars[bars.length - 1];
  const gridTop = header.y + header.height;
  const gridBottom = followingHeader.y;

  if (gridBottom - gridTop < image.width * 0.12) {
    throw new Error(
      'The Ribbons section appears incomplete. Include the bottom of the ribbon grid and the following section heading.',
    );
  }

  const background = estimateBackground(image, gridTop, gridBottom);
  const rows = detectRibbonRows(image, gridTop, gridBottom, background);
  if (!hasRegularRowSpacing(rows, image.width)) {
    throw new Error(
      'The ribbon rows could not be read reliably. Make sure the merged image contains the complete Pokémon HOME ribbon grid.',
    );
  }

  const cells: RibbonGridCell[] = [];
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const columnWidth = row.width / COLUMN_COUNT;

    for (let column = 0; column < COLUMN_COUNT; column++) {
      const cell: RibbonGridCell = {
        row: rowIndex,
        column,
        x: Math.round(row.x + column * columnWidth),
        y: row.y,
        width: Math.round(columnWidth),
        height: row.height,
      };

      if (cellHasForeground(image, cell, background)) cells.push(cell);
    }
  }

  if (cells.length === 0) {
    throw new Error('No ribbon or mark icons were found in the Ribbons section.');
  }

  return { header, followingHeader, rows, cells, background };
}
