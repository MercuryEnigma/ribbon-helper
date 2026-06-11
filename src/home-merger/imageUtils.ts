export function loadFileToCanvas(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name}`));
    };
    img.src = url;
  });
}

export function cropCanvas(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  out.getContext('2d')!.drawImage(canvas, x, y, width, height, 0, 0, width, height);
  return out;
}

export function scaleCanvas(canvas: HTMLCanvasElement, scale: number): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = Math.round(canvas.width * scale);
  out.height = Math.round(canvas.height * scale);
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, out.width, out.height);
  return out;
}

export function toGrayscale(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = canvas.width;
  out.height = canvas.height;
  const ctx = out.getContext('2d')!;
  ctx.filter = 'grayscale(1)';
  ctx.drawImage(canvas, 0, 0);
  return out;
}

export function compositeCanvases(
  c1: HTMLCanvasElement,
  cutY1: number,
  c2: HTMLCanvasElement,
  cutY2: number,
): HTMLCanvasElement {
  const bottomHeight = c2.height - cutY2;
  const out = document.createElement('canvas');
  out.width = c1.width;
  out.height = cutY1 + bottomHeight;
  const ctx = out.getContext('2d')!;
  ctx.drawImage(c1, 0, 0, c1.width, cutY1, 0, 0, c1.width, cutY1);
  ctx.drawImage(c2, 0, cutY2, c2.width, bottomHeight, 0, cutY1, c2.width, bottomHeight);
  return out;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob returned null'));
    }, type);
  });
}
