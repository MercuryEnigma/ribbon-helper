import { describe, expect, it } from 'vitest';
import { detectHomeSectionBars, detectRibbonGrid } from './ribbonGrid';

function makeImage(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < data.length; index += 4) {
    data[index] = 244;
    data[index + 1] = 248;
    data[index + 2] = 248;
    data[index + 3] = 255;
  }
  return { width, height, data, colorSpace: 'srgb' };
}

function fill(
  image: ImageData,
  x: number,
  y: number,
  width: number,
  height: number,
  color: [number, number, number],
) {
  for (let py = y; py < y + height; py++) {
    for (let px = x; px < x + width; px++) {
      const offset = (py * image.width + px) * 4;
      image.data[offset] = color[0];
      image.data[offset + 1] = color[1];
      image.data[offset + 2] = color[2];
    }
  }
}

describe('detectRibbonGrid', () => {
  it('finds HOME section bars and occupied seven-column cells', () => {
    const image = makeImage(700, 900);
    fill(image, 35, 100, 630, 42, [219, 239, 235]);
    fill(image, 35, 300, 630, 42, [219, 239, 235]);
    fill(image, 35, 800, 630, 42, [219, 239, 235]);

    for (const y of [370, 470, 570]) {
      for (const column of [0, 1, 2, 3, 4, 5, 6]) {
        if (y === 570 && column > 2) continue;
        fill(image, 70 + column * 79, y, 48, 58, [180, 70, 120]);
      }
    }

    expect(detectHomeSectionBars(image)).toHaveLength(3);
    const grid = detectRibbonGrid(image);

    expect(grid.rows).toHaveLength(3);
    expect(grid.cells).toHaveLength(17);
    expect(grid.cells.at(-1)).toMatchObject({ row: 2, column: 2 });
  });

  it('rejects a screenshot without the following section heading', () => {
    const image = makeImage(700, 700);
    fill(image, 35, 100, 630, 42, [219, 239, 235]);

    expect(() => detectRibbonGrid(image)).toThrow(/complete Ribbons section/);
  });
});
