import { scaleCanvas } from '../home-merger/imageUtils';

export function dominantBorder(image: ImageData): [number, number, number] {
  const counts = new Map<string, { count: number; color: number[] }>();
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
    if (x > 2 && x < image.width - 3 && y > 2 && y < image.height - 3) continue;
    const i = (y * image.width + x) * 4;
    const color = [image.data[i], image.data[i + 1], image.data[i + 2]];
    const key = color.map(channel => Math.round(channel / 12)).join(',');
    const entry = counts.get(key) ?? { count: 0, color };
    entry.count++; counts.set(key, entry);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count)[0].color as [number, number, number];
}

/** Keep the largest enclosed object, then fill holes inside its outline. This
 * removes selection arrows/borders without deleting white parts of an icon. */
export function isolateForeground(source: HTMLCanvasElement, svCursor = false): HTMLCanvasElement | null {
  const canvas = source.width > 320 ? scaleCanvas(source, 320 / source.width) : source;
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const { width, height, data } = image;
  const background = dominantBorder(image), mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const bg = background;
      const distance = Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]);
      const navy = Math.abs(data[i] - 27) + Math.abs(data[i + 1] - 48) + Math.abs(data[i + 2] - 77);
      if (distance > 65 && (!svCursor || navy > 45)) mask[y * width + x] = 1;
    }
  }
  const queue = new Int32Array(mask.length);
  if (svCursor) {
    // The animated cyan/lime cursor enters a tile from its top or bottom edge.
    // Remove only edge-connected cursor colors, preserving green ribbon bows.
    const indicator = (position: number) => {
      const i = position * 4, r = data[i], g = data[i + 1], b = data[i + 2];
      return g > 165 && (g > r + 5 && g > b + 30 || g > r + 40 && b > r + 15);
    };
    const seen = new Uint8Array(mask.length);
    let read = 0, write = 0;
    function seed(position: number) { if (!seen[position] && indicator(position)) { seen[position] = 1; queue[write++] = position; } }
    for (let y = 0; y < 6; y++) for (let x = 0; x < width; x++) { seed(y * width + x); seed((height - 1 - y) * width + x); }
    while (read < write) {
      const position = queue[read++], x = position % width, y = Math.floor(position / width);
      mask[position] = 0;
      for (const next of [x ? position - 1 : -1, x + 1 < width ? position + 1 : -1, y ? position - width : -1, y + 1 < height ? position + width : -1]) if (next >= 0) seed(next);
    }
    // Include the cursor's anti-aliased outline, not just its bright center.
    for (let position = 0; position < seen.length; position++) if (seen[position]) {
      const x = position % width, y = Math.floor(position / width);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (x + dx >= 0 && x + dx < width && y + dy >= 0 && y + dy < height) mask[(y + dy) * width + x + dx] = 0;
    }
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (x < 6 || x >= width - 6 || y < 6 || y >= height - 6) mask[y * width + x] = 0;
  }
  let best: number[] = [], bestTouches = false;
  const components: { pixels: number[]; touches: boolean }[] = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start]) continue;
    let read = 0, write = 1, touches = false;
    const component: number[] = [];
    queue[0] = start; mask[start] = 0;
    while (read < write) {
      const position = queue[read++], x = position % width, y = Math.floor(position / width);
      component.push(position);
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touches = true;
      for (const next of [x ? position - 1 : -1, x + 1 < width ? position + 1 : -1, y ? position - width : -1, y + 1 < height ? position + width : -1]) {
        if (next >= 0 && mask[next]) { mask[next] = 0; queue[write++] = next; }
      }
    }
    components.push({ pixels: component, touches });
    if ((bestTouches && !touches && component.length > best.length * .12) || (touches === bestTouches && component.length > best.length) || !best.length) {
      best = component; bestTouches = touches;
    }
  }
  if (best.length < width * height * .015) return null;
  const object = new Uint8Array(mask.length);
  best.forEach(position => { object[position] = 1; });
  // Marks can consist of detached pieces (the Gourmand face and Itemfinder
  // sparkle). Keep substantial interior pieces instead of only one component.
  const white = best.filter(position => data[position * 4] > 215 && data[position * 4 + 1] > 215 && data[position * 4 + 2] > 215).length;
  if (svCursor && white / best.length > .15) {
    components.filter(component => !component.touches && component.pixels.length >= Math.max(8, best.length * .035))
      .forEach(component => component.pixels.forEach(position => { object[position] = 1; }));
  }
  // Flood the exterior; the remaining enclosed white holes belong to the object.
  const exterior = new Uint8Array(mask.length);
  let read = 0, write = 0;
  function seed(position: number) { if (!object[position] && !exterior[position]) { exterior[position] = 1; queue[write++] = position; } }
  for (let x = 0; x < width; x++) { seed(x); seed((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { seed(y * width); seed(y * width + width - 1); }
  while (read < write) {
    const position = queue[read++], x = position % width, y = Math.floor(position / width);
    for (const next of [x ? position - 1 : -1, x + 1 < width ? position + 1 : -1, y ? position - width : -1, y + 1 < height ? position + width : -1]) if (next >= 0) seed(next);
  }
  let minX = width, minY = height, maxX = 0, maxY = 0;
  const selectedGold = svCursor && background[0] > 150 && background[1] > 100 && background[2] < 90;
  for (let position = 0; position < mask.length; position++) {
    if (svCursor && !selectedGold ? !object[position] : exterior[position]) data[position * 4 + 3] = 0;
    else { const x = position % width, y = Math.floor(position / width); minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  }
  const cut = document.createElement('canvas'); cut.width = width; cut.height = height;
  cut.getContext('2d')!.putImageData(image, 0, 0);
  const result = document.createElement('canvas'); result.width = 64; result.height = 64;
  const scale = Math.min(60 / (maxX - minX + 1), 60 / (maxY - minY + 1));
  const w = (maxX - minX + 1) * scale, h = (maxY - minY + 1) * scale;
  result.getContext('2d')!.drawImage(cut, minX, minY, maxX - minX + 1, maxY - minY + 1, (64 - w) / 2, (64 - h) / 2, w, h);
  return result;
}
