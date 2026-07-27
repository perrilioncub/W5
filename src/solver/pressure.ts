// src/solver/pressure.ts
// Pressure projection: removes divergence from the wind field so air circulates
// instead of piling up. Iterative (Jacobi) Poisson solve — simple + stable.

import { Grid } from "./grid";

export function pressureProject(grid: Grid, iterations = 20) {
  const { nx, nz, dx, dz } = grid.cfg;
  const u = grid.u, w = grid.w;
  const n = nx * nz;

  // 1. Compute divergence of the wind field: div = du/dx + dw/dz
  const div = new Float32Array(n);
  for (let k = 0; k < nz; k++) {
    for (let i = 0; i < nx; i++) {
      const c = grid.idx(i, k);
      const uL = i > 0 ? u[grid.idx(i - 1, k)] : u[c];
      const uR = i < nx - 1 ? u[grid.idx(i + 1, k)] : u[c];
      const wD = k > 0 ? w[grid.idx(i, k - 1)] : w[c];
      const wU = k < nz - 1 ? w[grid.idx(i, k + 1)] : w[c];
      div[c] = (uR - uL) / (2 * dx) + (wU - wD) / (2 * dz);
    }
  }

  // 2. Solve Poisson: ∇²p = div, via Jacobi iterations
  let p = new Float32Array(n);
  let pNew = new Float32Array(n);
  const dx2 = dx * dx, dz2 = dz * dz;
  const denom = 2 * (1 / dx2 + 1 / dz2);

  for (let iter = 0; iter < iterations; iter++) {
    for (let k = 0; k < nz; k++) {
      for (let i = 0; i < nx; i++) {
        const c = grid.idx(i, k);
        const pL = i > 0 ? p[grid.idx(i - 1, k)] : p[c];
        const pR = i < nx - 1 ? p[grid.idx(i + 1, k)] : p[c];
        const pD = k > 0 ? p[grid.idx(i, k - 1)] : p[c];
        const pU = k < nz - 1 ? p[grid.idx(i, k + 1)] : p[c];
        pNew[c] = ((pL + pR) / dx2 + (pD + pU) / dz2 - div[c]) / denom;
      }
    }
    const tmp = p; p = pNew; pNew = tmp;
  }

  // 3. Subtract pressure gradient from winds: u -= dp/dx, w -= dp/dz
  for (let k = 0; k < nz; k++) {
    for (let i = 0; i < nx; i++) {
      const c = grid.idx(i, k);
      const pL = i > 0 ? p[grid.idx(i - 1, k)] : p[c];
      const pR = i < nx - 1 ? p[grid.idx(i + 1, k)] : p[c];
      const pD = k > 0 ? p[grid.idx(i, k - 1)] : p[c];
      const pU = k < nz - 1 ? p[grid.idx(i, k + 1)] : p[c];
      u[c] -= (pR - pL) / (2 * dx);
      w[c] -= (pU - pD) / (2 * dz);
    }
  }
}

// Light damping to suppress grid-scale noise (the "square border" artifact).
export function applyDamping(grid: Grid, amount = 0.02) {
  const { nx, nz } = grid.cfg;
  for (const field of [grid.u, grid.w, grid.theta]) {
    const out = new Float32Array(field.length);
    for (let k = 0; k < nz; k++) {
      for (let i = 0; i < nx; i++) {
        const c = grid.idx(i, k);
        const L = i > 0 ? field[grid.idx(i - 1, k)] : field[c];
        const R = i < nx - 1 ? field[grid.idx(i + 1, k)] : field[c];
        const D = k > 0 ? field[grid.idx(i, k - 1)] : field[c];
        const U = k < nz - 1 ? field[grid.idx(i, k + 1)] : field[c];
        const avg = (L + R + D + U) / 4;
        out[c] = field[c] * (1 - amount) + avg * amount;
      }
    }
    field.set(out);
  }
}