// src/soundings/indices.ts
// Parcel theory + shear diagnostics — the meteorology brain of W5.

import type { Sounding, SoundingLevel } from "./schema";

export interface ParcelPoint { h: number; p_hPa: number; parcelT_C: number; envT_C: number; buoy: number; }

export interface SoundingIndices {
  cape: number; cin: number; lcl_m: number; lfc_m: number; el_m: number;
  shear_0_6km_kt: number; srh_0_1km: number;
  parcelPath: ParcelPoint[];
}

const Cp = 1005.7, g = 9.81, Lv = 2.501e6, Rd = 287.04, epsilon = 0.622;
const C2K = (c: number) => c + 273.15;

function esat(T_C: number): number {
  return 6.112 * Math.exp((17.67 * T_C) / (T_C + 243.5));
}
function mixingRatio(Td_C: number, p_hPa: number): number {
  const e = esat(Td_C);
  return (epsilon * e) / (p_hPa - e);
}
function dewpointFromMixing(w: number, p_hPa: number): number {
  const e = (w * p_hPa) / (epsilon + w);
  const lnE = Math.log(e / 6.112);
  return (243.5 * lnE) / (17.67 - lnE);
}
function interpByHeight(levels: SoundingLevel[], targetH: number, key: keyof SoundingLevel): number {
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
function windUV(dir_deg: number, speed_kt: number): { u: number; v: number } {
  const spd = speed_kt * 0.514444;
  const rad = (dir_deg * Math.PI) / 180;
  return { u: -spd * Math.sin(rad), v: -spd * Math.cos(rad) };
}

function computeParcel(s: Sounding) {
  const sfc = s.surface;
  const L = s.levels;
  const w0 = mixingRatio(sfc.Td_C, sfc.pressure_hPa);
  let parcelT_K = C2K(sfc.T_C);
  let saturated = false;
  let lcl_m = -1;
  const topH = L[L.length - 1].height_m;
  const dz = 20;

  const path: ParcelPoint[] = [];
  for (let h = dz; h <= topH; h += dz) {
    const p = interpByHeight(L, h, "p_hPa");
    if (!saturated) {
      parcelT_K -= (g / Cp) * dz;
      const parcelTd = dewpointFromMixing(w0, p);
      if (parcelT_K - 273.15 <= parcelTd) { saturated = true; if (lcl_m < 0) lcl_m = h; }
    } else {
      const T = parcelT_K;
      const ws = mixingRatio(T - 273.15, p);
      const num = 1 + (Lv * ws) / (Rd * T);
      const den = 1 + (Lv * Lv * ws * epsilon) / (Cp * Rd * T * T);
      parcelT_K -= (g / Cp) * (num / den) * dz;
    }
    const envT_C = interpByHeight(L, h, "T_C");
    const buoy = g * (parcelT_K - C2K(envT_C)) / C2K(envT_C);
    path.push({ h, p_hPa: p, parcelT_C: parcelT_K - 273.15, envT_C, buoy });
  }
  if (lcl_m < 0) lcl_m = 0;

  let lfc_m = -1, el_m = -1;
  for (const pt of path) {
    if (pt.h < lcl_m) continue;
    if (lfc_m < 0 && pt.buoy > 0) lfc_m = pt.h;
    if (lfc_m > 0 && pt.buoy < 0 && pt.h > lfc_m) { el_m = pt.h; break; }
  }
  if (lfc_m > 0 && el_m < 0) el_m = topH;

  let cape = 0, cin = 0;
  if (lfc_m > 0) {
    for (const pt of path) {
      if (pt.h >= lfc_m && pt.h <= el_m && pt.buoy > 0) cape += pt.buoy * dz;
      if (pt.h >= lcl_m && pt.h < lfc_m && pt.buoy < 0) cin += pt.buoy * dz;
    }
  }
  return { cape: Math.max(0, cape), cin: Math.min(0, cin), lcl_m,
           lfc_m: lfc_m < 0 ? 0 : lfc_m, el_m: el_m < 0 ? 0 : el_m, parcelPath: path };
}

function bulkShear(s: Sounding): number {
  const L = s.levels;
  const sfcW = windUV(L[0].wind_dir_deg, L[0].wind_kt);
  const w6 = windUV(interpByHeight(L, 6000, "wind_dir_deg"), interpByHeight(L, 6000, "wind_kt"));
  const du = w6.u - sfcW.u, dv = w6.v - sfcW.v;
  return Math.sqrt(du * du + dv * dv) / 0.514444;
}
function srh01(s: Sounding): number {
  const L = s.levels;
  const storm = windUV(s.storm_motion.dir_deg, s.storm_motion.speed_kt);
  let srh = 0; const dz = 50;
  for (let h = 0; h < 1000; h += dz) {
    const w0 = windUV(interpByHeight(L, h, "wind_dir_deg"), interpByHeight(L, h, "wind_kt"));
    const w1 = windUV(interpByHeight(L, h + dz, "wind_dir_deg"), interpByHeight(L, h + dz, "wind_kt"));
    const um = (w0.u + w1.u) / 2 - storm.u, vm = (w0.v + w1.v) / 2 - storm.v;
    srh += (um * (w1.v - w0.v) - vm * (w1.u - w0.u));
  }
  return -srh;
}

export function computeIndices(s: Sounding): SoundingIndices {
  const p = computeParcel(s);
  return {
    cape: Math.round(p.cape), cin: Math.round(p.cin), lcl_m: Math.round(p.lcl_m),
    lfc_m: Math.round(p.lfc_m), el_m: Math.round(p.el_m),
    shear_0_6km_kt: Math.round(bulkShear(s)), srh_0_1km: Math.round(srh01(s)),
    parcelPath: p.parcelPath,
  };
}