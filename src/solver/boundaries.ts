// src/solver/boundaries.ts
// Boundary conditions for the 2.5D domain.
// Top/bottom: rigid free-slip (no vertical flow through walls).
// Left/right: open/zero-gradient (stuff flows out without reflecting).

import { Grid } from "./grid";

export function applyBoundaries(grid: Grid) {
  const { nx, nz } = grid.cfg;
  const u = grid.u, w = grid.w, v = grid.v, th = grid.theta;

  // --- Top & bottom: w = 0 (no flow through floor/ceiling), free-slip for u,v ---
  for (let i = 0; i < nx; i++) {
    const bot = grid.idx(i, 0);
    const botIn = grid.idx(i, 1);
    const top = grid.idx(i, nz - 1);
    const topIn = grid.idx(i, nz - 2);

    // no vertical velocity through the walls
    w[bot] = 0; w[top] = 0;
    // free-slip: copy tangential winds + theta from just inside (zero-gradient)
    u[bot] = u[botIn]; u[top] = u[topIn];
    v[bot] = v[botIn]; v[top] = v[topIn];
    th[bot] = th[botIn]; th[top] = th[topIn];
  }

  // --- Left & right: open (zero-gradient) — copy from the interior neighbor ---
  for (let k = 0; k < nz; k++) {
    const left = grid.idx(0, k);
    const leftIn = grid.idx(1, k);
    const right = grid.idx(nx - 1, k);
    const rightIn = grid.idx(nx - 2, k);

    u[left] = u[leftIn]; w[left] = w[leftIn]; v[left] = v[leftIn]; th[left] = th[leftIn];
    u[right] = u[rightIn]; w[right] = w[rightIn]; v[right] = v[rightIn]; th[right] = th[rightIn];
  }
}