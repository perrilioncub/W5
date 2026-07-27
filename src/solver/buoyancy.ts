// src/solver/buoyancy.ts
// Buoyancy: warm theta perturbations accelerate air upward, cold downward.
// dw/dt += g * (theta' / theta_base)

import { Grid } from "./grid";

const G = 9.81;          // gravity m/s²
const THETA_BASE = 300;  // reference potential temperature (K)

export function applyBuoyancy(grid: Grid, dt: number) {
  const { nx, nz } = grid.cfg;
  const th = grid.theta, w = grid.w;
  for (let k = 0; k < nz; k++) {
    for (let i = 0; i < nx; i++) {
      const c = grid.idx(i, k);
      // warm (theta' > 0) -> upward accel; cold -> downward
      const accel = G * (th[c] / THETA_BASE);
      w[c] += accel * dt;
    }
  }
}