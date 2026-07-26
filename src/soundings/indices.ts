// src/soundings/indices.ts
// Parcel theory + shear diagnostics — the meteorology brain of W5.

import type { Sounding, SoundingLevel } from "./schema";

export interface SoundingIndices {
  cape: number;      // J/kg — convective available potential energy
  cin: number;       // J/kg — convective inhibition (negative)
  lcl_m: number;     // m — lifted condensation level height
  shear_0_6km_kt: number; // kt — bulk wind shear surface to 6km
  srh_0_1km: number; // m²/s² — 0-1km storm-relative helicity
}

// --- Thermodynamic constants ---
const Rd = 287.04;     // gas constant dry air (J/kg/K)
const Cp = 1005.7;     // specific heat dry air (J/kg/K)
const g = 9.81;        // gravity (m/s²)
const Lv = 2.501e6;    // latent heat vaporization (J/kg)
const epsilon = 0.622; // Rd/Rv

const C2K = (c: number) => c + 273.15;

// Saturation vapor pressure (hPa) via Bolton 1980
function esat(T_C: number): number {
  return 6.112 * Math.exp((17.67 * T_C) / (T_C + 243.5));
}

// Mixing ratio (kg/kg) from temp/dewpoint at a pressure
function mixingRatio(Td_C: number, p_hPa: number): number {
  const e = esat(Td_C);
  return (epsilon * e) / (p_hPa - e);
}

// Dewpoint (°C) from mixing ratio + pressure (inverse of above)
function dewpointFromMixing(w: number, p_hPa: number): number {
  const e = (w * p_hPa) / (epsilon + w);
  const lnE = Math.log(e / 6.112);
  return (243.5 * lnE) / (17.67 - lnE);
}

// Linear interpolation helper along the sounding by height
function interpByHeight(levels: SoundingLevel[], targetH: number,
                        key: keyof SoundingLevel): number {
  if (targetH <= levels[0].height_m) return levels[0][key] as number;
  const top = levels[levels.length - 1];
  if (targetH >= top.height_m) return top[key] as number;
  for (let i = 1; i < levels.length; i++) {
    if (levels[i].height_m >= targetH) {
      const lo = levels[i - 1], hi = levels[i];
      const f = (targetH - lo.height_m) / (hi.height_m - lo.height_m);
      return (lo[key] as number) + f * ((hi[key] as number) - (lo[key] as number));
    }
  }
  return top[key] as number;
}

// Convert wind dir/speed -> u,v components (m/s). Meteorological convention.
function windUV(dir_deg: number, speed_kt: number): { u: number; v: number } {
  const spd = speed_kt * 0.514444; // kt -> m/s
  const rad = (dir_deg * Math.PI) / 180;
  return { u: -spd * Math.sin(rad), v: -spd * Math.cos(rad) };
}

/**
 * Lift a surface parcel and integrate buoyancy to get CAPE, CIN, LCL.
 * Steps in fine height increments through the environment profile.
 */
function computeParcel(s: Sounding): { cape: number; cin: number; lcl_m: number } {
  const sfc = s.surface;
  const L = s.levels;

  // Surface parcel properties
  const w0 = mixingRatio(sfc.Td_C, sfc.pressure_hPa); // conserved until saturation
  let parcelT_K = C2K(sfc.T_C);
  let saturated = false;
  let lcl_m = -1;

  let cape = 0;
  let cin = 0;

  const topH = L[L.length - 1].height_m;
  const dz = 20; // integration step (m)

  // Track pressure as we go (hydrostatic-ish, from environment interpolation)
  for (let h = dz; h <= topH; h += dz) {
    const pPrev = interpByHeight(L, h - dz, "p_hPa");
    const p = interpByHeight(L, h, "p_hPa");

    if (!saturated) {
      // Dry adiabatic lift: T decreases at g/Cp
      parcelT_K -= (g / Cp) * dz;
      // Check saturation: parcel dewpoint vs parcel temp at this pressure
      const parcelTd = dewpointFromMixing(w0, p);
      if (parcelT_K - 273.15 <= parcelTd) {
        saturated = true;
        if (lcl_m < 0) lcl_m = h;
      }
    } else {
      // Moist adiabatic lift (approximate moist lapse rate)
      const T = parcelT_K;
      const ws = mixingRatio(T - 273.15, p);
      const num = 1 + (Lv * ws) / (Rd * T);
      const den = 1 + (Lv * Lv * ws * epsilon) / (Cp * Rd * T * T);
      const moistLapse = (g / Cp) * (num / den); // K/m
      parcelT_K -= moistLapse * dz;
    }

    // Environment temperature at this height
    const envT_K = C2K(interpByHeight(L, h, "T_C"));

    // Buoyancy contribution to energy (per unit mass)
    const buoy = g * (parcelT_K - envT_K) / envT_K;
    const dCAPE = buoy * dz;

    if (parcelT_K > envT_K) {
      cape += dCAPE;          // parcel warmer -> positive buoyancy
    } else if (lcl_m < 0 || h < (lcl_m + 3000)) {
      cin += dCAPE;           // parcel colder near/below LCL -> inhibition
    }
  }

  if (lcl_m < 0) lcl_m = 0;
  return { cape: Math.max(0, cape), cin: Math.min(0, cin), lcl_m };
}

// Bulk shear surface -> 6km (magnitude of the wind-difference vector)
function bulkShear(s: Sounding): number {
  const L = s.levels;
  const sfcW = windUV(L[0].wind_dir_deg, L[0].wind_kt);
  const dir6 = interpByHeight(L, 6000, "wind_dir_deg");
  const spd6 = interpByHeight(L, 6000, "wind_kt");
  const w6 = windUV(dir6, spd6);
  const du = w6.u - sfcW.u, dv = w6.v - sfcW.v;
  return Math.sqrt(du * du + dv * dv) / 0.514444; // m/s -> kt
}

// 0-1km storm-relative helicity
function srh01(s: Sounding): number {
  const L = s.levels;
  const storm = windUV(s.storm_motion.dir_deg, s.storm_motion.speed_kt);
  // Sample the 0-1km layer in fine steps
  let srh = 0;
  const dz = 50;
  for (let h = 0; h < 1000; h += dz) {
    const d0 = interpByHeight(L, h, "wind_dir_deg");
    const s0 = interpByHeight(L, h, "wind_kt");
    const d1 = interpByHeight(L, h + dz, "wind_dir_deg");
    const s1 = interpByHeight(L, h + dz, "wind_kt");
    const w0 = windUV(d0, s0), w1 = windUV(d1, s1);
    // SRH increment: (v-c) x dV, cross product z-component
    const um = (w0.u + w1.u) / 2 - storm.u;
    const vm = (w0.v + w1.v) / 2 - storm.v;
    const du = w1.u - w0.u, dv = w1.v - w0.v;
    srh += (um * dv - vm * du);
  }
  return -srh; // sign convention
}

export function computeIndices(s: Sounding): SoundingIndices {
  const { cape, cin, lcl_m } = computeParcel(s);
  return {
    cape: Math.round(cape),
    cin: Math.round(cin),
    lcl_m: Math.round(lcl_m),
    shear_0_6km_kt: Math.round(bulkShear(s)),
    srh_0_1km: Math.round(srh01(s)),
  };
}