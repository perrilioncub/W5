// src/solver/advection.ts
// First-order upwind advection for scalar fields and the w-wind.

import { Grid } from "./grid";

function advectField(grid: Grid, field: Float32Array, dt: number) {
  const { nx, nz, dx, dz } = grid.cfg;
  const u = grid.u, w = grid.w;
  const out = new Float32Array(field.length);

  for (let k = 0; k < nz; k++) {
    for (let i = 0; i < nx; i++) {
      const c = grid.idx(i, k);
      const uij = u[c], wij = w[c];

      let dFdx: number;
      if (uij > 0) { const im1 = i > 0 ? grid.idx(i - 1, k) : c; dFdx = (field[c] - field[im1]) / dx; }
      else { const ip1 = i < nx - 1 ? grid.idx(i + 1, k) : c; dFdx = (field[ip1] - field[c]) / dx; }

      let dFdz: number;
      if (wij > 0) { const km1 = k > 0 ? grid.idx(i, k - 1) : c; dFdz = (field[c] - field[km1]) / dz; }
      else { const kp1 = k < nz - 1 ? grid.idx(i, k + 1) : c; dFdz = (field[kp1] - field[c]) / dz; }

      out[c] = field[c] - dt * (uij * dFdx + wij * dFdz);
    }
  }
  field.set(out);
}

export function advectTheta(grid: Grid, dt: number) {
  advectField(grid, grid.theta, dt);
}

// Advect theta AND the wind components (self-advection of momentum).
export function advectAll(grid: Grid, dt: number) {
  advectField(grid, grid.theta, dt);
  advectField(grid, grid.w, dt);
  advectField(grid, grid.u, dt);
}