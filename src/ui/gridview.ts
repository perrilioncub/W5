// src/ui/gridview.ts
// Renders a grid scalar field to a canvas with a blue-white-red colormap.

import { Grid } from "../solver/grid";

// value in [-1,1] -> [r,g,b]. blue (cold) -> white -> red (warm).
function colormap(v: number): [number, number, number] {
  const t = Math.max(-1, Math.min(1, v));
  if (t < 0) {
    const f = t + 1;              // 0..1 as t goes -1..0
    return [Math.round(255 * f), Math.round(255 * f), 255];
  } else {
    const f = 1 - t;              // 1..0 as t goes 0..1
    return [255, Math.round(255 * f), Math.round(255 * f)];
  }
}

export function renderGrid(grid: Grid, field: Float32Array, scale: number, pxPerCell = 4): HTMLCanvasElement {
  const { nx, nz } = grid.cfg;
  const canvas = document.createElement("canvas");
  canvas.width = nx * pxPerCell;
  canvas.height = nz * pxPerCell;
  canvas.style.cssText = "border:1px solid #ccc; border-radius:6px; image-rendering:pixelated;";
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(canvas.width, canvas.height);

  for (let k = 0; k < nz; k++) {
    for (let i = 0; i < nx; i++) {
      const val = field[grid.idx(i, k)] / scale;   // normalize to ~[-1,1]
      const [r, g, b] = colormap(val);
      // z increases upward, but canvas y increases downward -> flip
      const flipK = nz - 1 - k;
      for (let py = 0; py < pxPerCell; py++) {
        for (let px = 0; px < pxPerCell; px++) {
          const cx = i * pxPerCell + px;
          const cy = flipK * pxPerCell + py;
          const o = (cy * canvas.width + cx) * 4;
          img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 255;
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}