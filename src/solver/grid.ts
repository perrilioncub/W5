// src/solver/grid.ts
// The simulation grid + state. 2.5D: an x-z slice carrying u, w, v winds + theta.
// Arakawa C-grid layout (staggered), stored as flat Float32Arrays.

export interface GridConfig {
    nx: number;    // cells in x (horizontal)
    nz: number;    // cells in z (vertical)
    dx: number;    // cell spacing x (meters)
    dz: number;    // cell spacing z (meters)
  }
  
  export class Grid {
    cfg: GridConfig;
    // Scalar fields at cell centers (nx * nz)
    theta: Float32Array;   // potential temperature perturbation (K)
    // Wind components (staggered, but we keep simple sizing for now)
    u: Float32Array;       // horizontal wind (m/s)
    w: Float32Array;       // vertical wind (m/s)
    v: Float32Array;       // north-south wind — the "2.5D" component (m/s)
  
    constructor(cfg: GridConfig) {
      this.cfg = cfg;
      const n = cfg.nx * cfg.nz;
      this.theta = new Float32Array(n);
      this.u = new Float32Array(n);
      this.w = new Float32Array(n);
      this.v = new Float32Array(n);
    }
  
    // index helper: (i in x, k in z) -> flat array index
    idx(i: number, k: number): number {
      return k * this.cfg.nx + i;
    }
  
    // Seed a warm/cold circular blob of theta (Straka-style bubble later).
    seedBlob(cx: number, cz: number, radius: number, amplitude: number) {
      const { nx, nz, dx, dz } = this.cfg;
      for (let k = 0; k < nz; k++) {
        for (let i = 0; i < nx; i++) {
          const x = i * dx, z = k * dz;
          const dist = Math.sqrt(((x - cx) / radius) ** 2 + ((z - cz) / radius) ** 2);
          if (dist <= 1) {
            // smooth cosine bump so edges aren't jagged
            this.theta[this.idx(i, k)] += amplitude * (Math.cos(Math.PI * dist) + 1) / 2;
          }
        }
      }
    }
  }