// src/soundings/indices.ts
// Full SPC-style sounding diagnostics — the meteorology brain of W5.

import type { Sounding, SoundingLevel } from "./schema";

export interface ParcelPoint { h: number; p_hPa: number; parcelT_C: number; envT_C: number; buoy: number; }

export interface ParcelResult {
  cape: number; cin: number; lcl_m: number; lfc_m: number; el_m: number;
  li: number; cape3km: number; path: ParcelPoint[];
}

export interface SoundingIndices {
  // Parcels
  sbcape: number; sbcin: number;
  mlcape: number; mlcin: number;
  mucape: number; mucin: number;
  cape3km: number;         // 0-3km CAPE (low-level)
  li: number;
  lcl_m: number; lfc_m: number; el_m: number;
  dcape: number;           // downdraft CAPE
  // Moisture / thermo
  pwat_in: number;         // precipitable water (inches)
  kindex: number;
  totalTotals: number;
  meanMixingRatio: number; // g/kg
  // Levels
  fzl_m: number;           // freezing level height
  wbz_m: number;           // wet-bulb zero height
  // Lapse rates (°C/km)
  lr_0_3km: number; lr_3_6km: number; lr_700_500: number; lr_850_500: number;
  // Shear / kinematics
  shear_0_1km_kt: number; shear_0_6km_kt: number; shear_0_8km_kt: number;
  ebwd_kt: number;         // effective bulk wind difference
  srh_0_1km: number; srh_0_3km: number; srh_eff: number;
  bunkersRight: { dir: number; spd: number };
  bunkersLeft: { dir: number; spd: number };
  criticalAngle: number;
  // Effective inflow layer
  eil_bot_m: number; eil_top_m: number;
  // Composites
  stp: number;             // significant tornado parameter (fixed-layer)
  scp: number;             // supercell composite parameter
  ship: number;            // significant hail parameter
  // Parcel path for skew-T
  parcelPath: ParcelPoint[];
}

// --- Constants ---
const Cp = 1005.7, g = 9.81, Lv = 2.501e6, Rd = 287.04, epsilon = 0.622;
const C2K = (c: number) => c + 273.15;
const KT = 0.514444; // kt -> m/s

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
// Wet-bulb temp (°C) — Stull 2011 approximation
function wetBulb(T_C: number, Td_C: number): number {
  const rh = Math.max(1, Math.min(100, 100 * esat(Td_C) / esat(T_C)));
  return T_C * Math.atan(0.151977 * Math.sqrt(rh + 8.313659))
    + Math.atan(T_C + rh) - Math.atan(rh - 1.676331)
    + 0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) - 4.686035;
}

function interp(levels: SoundingLevel[], targetH: number, key: keyof SoundingLevel): number {
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
// interpolate a field by PRESSURE
function interpP(levels: SoundingLevel[], targetP: number, key: keyof SoundingLevel): number {
  if (targetP >= levels[0].p_hPa) return levels[0][key] as number;
  const top = levels[levels.length - 1];
  if (targetP <= top.p_hPa) return top[key] as number;
  for (let i = 1; i < levels.length; i++) {
    if (levels[i].p_hPa <= targetP) {
      const lo = levels[i - 1], hi = levels[i];
      const f = (Math.log(targetP) - Math.log(lo.p_hPa)) / (Math.log(hi.p_hPa) - Math.log(lo.p_hPa));
      return (lo[key] as number) + f * ((hi[key] as number) - (lo[key] as number));
    }
  }
  return top[key] as number;
}
function windUV(dir_deg: number, speed_kt: number) {
  const rad = (dir_deg * Math.PI) / 180;
  return { u: -speed_kt * Math.sin(rad), v: -speed_kt * Math.cos(rad) };
}
function uvToDirSpd(u: number, v: number) {
  const spd = Math.sqrt(u * u + v * v);
  let dir = (Math.atan2(-u, -v) * 180) / Math.PI;
  if (dir < 0) dir += 360;
  return { dir: Math.round(dir), spd: Math.round(spd) };
}

// --- Generic parcel lift from a given start (T,Td,p,h) ---
function liftParcel(s: Sounding, startT: number, startTd: number, startP: number, startH: number): ParcelResult {
  const L = s.levels;
  const w0 = mixingRatio(startTd, startP);
  let parcelT_K = C2K(startT);
  let saturated = false, lcl_m = -1;
  const topH = L[L.length - 1].height_m;
  const dz = 20;
  const path: ParcelPoint[] = [];

  for (let h = startH + dz; h <= topH; h += dz) {
    const p = interp(L, h, "p_hPa");
    if (!saturated) {
      parcelT_K -= (g / Cp) * dz;
      if (parcelT_K - 273.15 <= dewpointFromMixing(w0, p)) { saturated = true; if (lcl_m < 0) lcl_m = h; }
    } else {
      const T = parcelT_K, ws = mixingRatio(T - 273.15, p);
      const num = 1 + (Lv * ws) / (Rd * T);
      const den = 1 + (Lv * Lv * ws * epsilon) / (Cp * Rd * T * T);
      parcelT_K -= (g / Cp) * (num / den) * dz;
    }
    const envT_C = interp(L, h, "T_C");
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

  let cape = 0, cin = 0, cape3km = 0;
  if (lfc_m > 0) {
    for (const pt of path) {
      if (pt.h >= lfc_m && pt.h <= el_m && pt.buoy > 0) {
        cape += pt.buoy * dz;
        if (pt.h <= 3000) cape3km += pt.buoy * dz;
      }
      if (pt.h >= lcl_m && pt.h < lfc_m && pt.buoy < 0) cin += pt.buoy * dz;
    }
  }
  // Lifted Index: env - parcel at 500mb
  const envT500 = interpP(L, 500, "T_C");
  const parcel500 = path.reduce((best, pt) =>
    Math.abs(pt.p_hPa - 500) < Math.abs(best.p_hPa - 500) ? pt : best, path[0]);
  const li = envT500 - parcel500.parcelT_C;

  return { cape: Math.max(0, cape), cin: Math.min(0, cin), lcl_m,
           lfc_m: lfc_m < 0 ? 0 : lfc_m, el_m: el_m < 0 ? 0 : el_m, li, cape3km, path };
}

// Surface-based parcel
function surfaceParcel(s: Sounding): ParcelResult {
  return liftParcel(s, s.surface.T_C, s.surface.Td_C, s.surface.pressure_hPa, 0);
}
// Mixed-layer parcel (lowest 100mb averaged)
function mixedLayerParcel(s: Sounding): ParcelResult {
  const L = s.levels;
  const pTop = s.surface.pressure_hPa - 100;
  let sumT = 0, sumW = 0, n = 0;
  for (let p = s.surface.pressure_hPa; p >= pTop; p -= 10) {
    sumT += interpP(L, p, "T_C");
    sumW += mixingRatio(interpP(L, p, "Td_C"), p);
    n++;
  }
  const mlT = sumT / n, mlW = sumW / n;
  const mlTd = dewpointFromMixing(mlW, s.surface.pressure_hPa);
  return liftParcel(s, mlT, mlTd, s.surface.pressure_hPa, 0);
}
// Most-unstable parcel (search lowest 300mb for max theta-e-ish -> here, max CAPE)
function mostUnstableParcel(s: Sounding): ParcelResult {
  const L = s.levels;
  let best = surfaceParcel(s);
  const pBot = s.surface.pressure_hPa;
  for (let p = pBot; p >= pBot - 300; p -= 25) {
    const h = interpP(L, p, "height_m");
    const T = interpP(L, p, "T_C"), Td = interpP(L, p, "Td_C");
    const r = liftParcel(s, T, Td, p, h);
    if (r.cape > best.cape) best = r;
  }
  return best;
}

// DCAPE — descend a parcel from min-theta-e level (~mid levels) to surface
function computeDCAPE(s: Sounding): number {
  const L = s.levels;
  // Start near 600-700mb (typical min theta-e); use wet-bulb descent
  const startP = 650;
  const startH = interpP(L, startP, "height_m");
  const startTw = wetBulb(interpP(L, startP, "T_C"), interpP(L, startP, "Td_C"));
  let parcelT_K = C2K(startTw);
  let dcape = 0;
  const dz = 20;
  for (let h = startH - dz; h >= 0; h -= dz) {
    const p = interp(L, h, "p_hPa");
    const T = parcelT_K, ws = mixingRatio(T - 273.15, p);
    const num = 1 + (Lv * ws) / (Rd * T);
    const den = 1 + (Lv * Lv * ws * epsilon) / (Cp * Rd * T * T);
    parcelT_K += (g / Cp) * (num / den) * dz; // warming as it descends (moist)
    const envT_K = C2K(interp(L, h, "T_C"));
    const buoy = g * (envT_K - parcelT_K) / envT_K; // negative buoyancy drives downdraft
    if (buoy > 0) dcape += buoy * dz;
  }
  return Math.round(dcape);
}

function shearKt(s: Sounding, hBot: number, hTop: number): number {
  const wb = windUV(interp(s.levels, hBot, "wind_dir_deg"), interp(s.levels, hBot, "wind_kt"));
  const wt = windUV(interp(s.levels, hTop, "wind_dir_deg"), interp(s.levels, hTop, "wind_kt"));
  return Math.sqrt((wt.u - wb.u) ** 2 + (wt.v - wb.v) ** 2);
}

// Mean wind (kt, u/v) over a height layer
function meanWind(s: Sounding, hBot: number, hTop: number) {
  let u = 0, v = 0, n = 0;
  for (let h = hBot; h <= hTop; h += 100) {
    const w = windUV(interp(s.levels, h, "wind_dir_deg"), interp(s.levels, h, "wind_kt"));
    u += w.u; v += w.v; n++;
  }
  return { u: u / n, v: v / n };
}

// Bunkers right/left mover storm motion (the "ID method")
function bunkers(s: Sounding) {
  const mean = meanWind(s, 0, 6000);
  const low = windUV(interp(s.levels, 0, "wind_dir_deg"), interp(s.levels, 0, "wind_kt"));
  const high = windUV(interp(s.levels, 6000, "wind_dir_deg"), interp(s.levels, 6000, "wind_kt"));
  const shrU = high.u - low.u, shrV = high.v - low.v;
  const shrMag = Math.sqrt(shrU * shrU + shrV * shrV) || 1;
  const D = 7.5 / KT; // 7.5 m/s deviation, in kt
  // right mover: mean + D * (k x shear)/|shear|
  const rU = mean.u + D * (shrV / shrMag);
  const rV = mean.v - D * (shrU / shrMag);
  const lU = mean.u - D * (shrV / shrMag);
  const lV = mean.v + D * (shrU / shrMag);
  return { right: uvToDirSpd(rU, rV), left: uvToDirSpd(lU, lV), rightUV: { u: rU, v: rV } };
}

// SRH over a layer, given a storm motion vector (kt)
function srhLayer(s: Sounding, hBot: number, hTop: number, storm: { u: number; v: number }): number {
  let srh = 0; const dz = 50;
  for (let h = hBot; h < hTop; h += dz) {
    const w0 = windUV(interp(s.levels, h, "wind_dir_deg"), interp(s.levels, h, "wind_kt"));
    const w1 = windUV(interp(s.levels, h + dz, "wind_dir_deg"), interp(s.levels, h + dz, "wind_kt"));
    const um = (w0.u + w1.u) / 2 - storm.u, vm = (w0.v + w1.v) / 2 - storm.v;
    srh += (um * (w1.v - w0.v) - vm * (w1.u - w0.u));
  }
  // convert kt² to m²/s²
  return -srh * KT * KT;
}

// Effective inflow layer: levels with CAPE>=100 and CIN>=-250 (SPC definition)
function effectiveInflow(s: Sounding): { bot: number; top: number } {
  const L = s.levels;
  let bot = -1, top = -1;
  const topH = L[L.length - 1].height_m;
  for (let h = 0; h <= topH; h += 100) {
    const p = interp(L, h, "p_hPa");
    const T = interp(L, h, "T_C"), Td = interp(L, h, "Td_C");
    const r = liftParcel(s, T, Td, p, h);
    const qualifies = r.cape >= 100 && r.cin >= -250;
    if (qualifies && bot < 0) bot = h;
    if (!qualifies && bot >= 0 && top < 0) { top = h; break; }
  }
  if (bot >= 0 && top < 0) top = topH;
  if (bot < 0) { bot = 0; top = 0; }
  return { bot, top };
}

export function computeIndices(s: Sounding): SoundingIndices {
  const L = s.levels;
  const sb = surfaceParcel(s);
  const ml = mixedLayerParcel(s);
  const mu = mostUnstableParcel(s);

  // Storm motion — use Bunkers right mover (proper) instead of the stored guess
  const bunk = bunkers(s);
  const stormRM = bunk.rightUV;

  // SRH layers
  const srh1 = srhLayer(s, 0, 1000, stormRM);
  const srh3 = srhLayer(s, 0, 3000, stormRM);

  // Effective inflow layer
  const eil = effectiveInflow(s);
  const srhEff = eil.top > eil.bot ? srhLayer(s, eil.bot, eil.top, stormRM) : 0;

  // EBWD — shear from EIL bottom to half the EL height (approx SPC method)
  const elHalf = mu.el_m / 2;
  const ebwd = eil.top > eil.bot ? shearKt(s, eil.bot, Math.max(elHalf, eil.top + 1000)) : shearKt(s, 0, 6000);

  // Moisture
  let pwat = 0;
  for (let i = 1; i < L.length; i++) {
    const dp = L[i - 1].p_hPa - L[i].p_hPa;
    const wAvg = (mixingRatio(L[i - 1].Td_C, L[i - 1].p_hPa) + mixingRatio(L[i].Td_C, L[i].p_hPa)) / 2;
    pwat += wAvg * dp;
  }
  // pwat accumulated as (kg/kg * hPa); convert to mm then inches
  const pwat_in = (pwat * 100 / g) / 25.4;
  const meanMR = mixingRatio(s.surface.Td_C, s.surface.pressure_hPa) * 1000;

  // K-index & Total Totals
  const T850 = interpP(L, 850, "T_C"), Td850 = interpP(L, 850, "Td_C");
  const T700 = interpP(L, 700, "T_C"), Td700 = interpP(L, 700, "Td_C");
  const T500 = interpP(L, 500, "T_C");
  const kindex = (T850 - T500) + Td850 - (T700 - Td700);
  const totalTotals = (T850 - T500) + (Td850 - T500);

  // Freezing level & wet-bulb zero
  let fzl_m = 0, wbz_m = 0;
  const topH = L[L.length - 1].height_m;
  for (let h = 0; h <= topH; h += 50) {
    if (fzl_m === 0 && interp(L, h, "T_C") <= 0) fzl_m = h;
    const tw = wetBulb(interp(L, h, "T_C"), interp(L, h, "Td_C"));
    if (wbz_m === 0 && tw <= 0) wbz_m = h;
  }

  // Lapse rates (°C/km)
  const lr = (hB: number, hT: number) => (interp(L, hB, "T_C") - interp(L, hT, "T_C")) / ((hT - hB) / 1000);
  const lrP = (pB: number, pT: number) => {
    const hB = interpP(L, pB, "height_m"), hT = interpP(L, pT, "height_m");
    return (interpP(L, pB, "T_C") - interpP(L, pT, "T_C")) / ((hT - hB) / 1000);
  };
  const lr_0_3km = lr(0, 3000), lr_3_6km = lr(3000, 6000);
  const lr_700_500 = lrP(700, 500), lr_850_500 = lrP(850, 500);

  const dcape = computeDCAPE(s);

  // Critical angle: angle between 0-500m shear vector and storm-relative sfc wind
  const sfcW = windUV(interp(L, 0, "wind_dir_deg"), interp(L, 0, "wind_kt"));
  const w500m = windUV(interp(L, 500, "wind_dir_deg"), interp(L, 500, "wind_kt"));
  const shrLowU = w500m.u - sfcW.u, shrLowV = w500m.v - sfcW.v;
  const srU = sfcW.u - stormRM.u, srV = sfcW.v - stormRM.v;
  const dot = shrLowU * srU + shrLowV * srV;
  const magA = Math.sqrt(shrLowU ** 2 + shrLowV ** 2) || 1;
  const magB = Math.sqrt(srU ** 2 + srV ** 2) || 1;
  const criticalAngle = Math.round((Math.acos(Math.max(-1, Math.min(1, dot / (magA * magB)))) * 180) / Math.PI);

  // --- Composite indices (SPC formulas) ---
  // STP (fixed layer): (SBCAPE/1500)*((2000-SBLCL)/1000)*(SRH1/150)*(SHEAR6/20)*((2000+SBCIN)/1500)
  const lclTerm = Math.max(0, Math.min(1.1, (2000 - sb.lcl_m) / 1000));
  const cinTerm = sb.cin > -50 ? 1 : (2000 + sb.cin) / 1500;
  const shr6 = shearKt(s, 0, 6000) * KT; // m/s
  const shrTerm = shr6 < 12.5 ? 0 : shr6 > 30 ? 1.5 : shr6 / 20;
  const stp = Math.max(0,
    (sb.cape / 1500) * lclTerm * (srh1 / 150) * (shrTerm) * Math.max(0, cinTerm));

  // SCP: (MUCAPE/1000)*(SRHeff/50)*(EBWD/20)
  const ebwdTerm = ebwd * KT < 10 ? 0 : ebwd * KT > 20 ? 1 : (ebwd * KT) / 20;
  const scp = Math.max(0, (mu.cape / 1000) * (srhEff / 50) * ebwdTerm);

  // SHIP: (MUCAPE * MUmr * LR75 * (-T500) * SHEAR6) / normalization
  let ship = (mu.cape * meanMR * lr_700_500 * (-T500) * (shr6)) / 42000000;
  ship = Math.max(0, ship);

  return {
    sbcape: Math.round(sb.cape), sbcin: Math.round(sb.cin),
    mlcape: Math.round(ml.cape), mlcin: Math.round(ml.cin),
    mucape: Math.round(mu.cape), mucin: Math.round(mu.cin),
    cape3km: Math.round(sb.cape3km),
    li: Math.round(sb.li * 10) / 10,
    lcl_m: Math.round(sb.lcl_m), lfc_m: Math.round(sb.lfc_m), el_m: Math.round(sb.el_m),
    dcape,
    pwat_in: Math.round(pwat_in * 100) / 100,
    kindex: Math.round(kindex), totalTotals: Math.round(totalTotals),
    meanMixingRatio: Math.round(meanMR * 10) / 10,
    fzl_m, wbz_m,
    lr_0_3km: Math.round(lr_0_3km * 10) / 10, lr_3_6km: Math.round(lr_3_6km * 10) / 10,
    lr_700_500: Math.round(lr_700_500 * 10) / 10, lr_850_500: Math.round(lr_850_500 * 10) / 10,
    shear_0_1km_kt: Math.round(shearKt(s, 0, 1000)), shear_0_6km_kt: Math.round(shearKt(s, 0, 6000)),
    shear_0_8km_kt: Math.round(shearKt(s, 0, 8000)),
    ebwd_kt: Math.round(ebwd),
    srh_0_1km: Math.round(srh1), srh_0_3km: Math.round(srh3), srh_eff: Math.round(srhEff),
    bunkersRight: { dir: bunk.right.dir, spd: bunk.right.spd },
    bunkersLeft: { dir: bunk.left.dir, spd: bunk.left.spd },
    criticalAngle,
    eil_bot_m: eil.bot, eil_top_m: eil.top,
    stp: Math.round(stp * 100) / 100, scp: Math.round(scp * 100) / 100, ship: Math.round(ship * 100) / 100,
    parcelPath: sb.path,
  };
}