// src/soundings/generator.ts
// Rule-based sounding generator — turns a text description into a sounding.
// Free, offline, no API.

import type { Sounding, SoundingLevel } from "./schema";

interface StormParams {
  sfcT: number; sfcTd: number; midDry: number;
  sfcWind: number; deepWind: number; turning: number; stormSpeed: number;
}

function paramsFromText(text: string): { p: StormParams; name: string } {
  const t = text.toLowerCase();
  let p: StormParams = {
    sfcT: 28, sfcTd: 18, midDry: 8, sfcWind: 10, deepWind: 40, turning: 0.4, stormSpeed: 25,
  };

  // Intensity
  if (/(violent|extreme|monster|ef5|ef4|significant|outbreak|nightmare)/.test(t)) {
    p = { sfcT: 32, sfcTd: 24, midDry: 10, sfcWind: 20, deepWind: 85, turning: 0.9, stormSpeed: 35 };
  } else if (/(strong|supercell|tornad|severe)/.test(t)) {
    p = { sfcT: 30, sfcTd: 22, midDry: 9, sfcWind: 15, deepWind: 60, turning: 0.7, stormSpeed: 30 };
  } else if (/(weak|marginal|pulse|garden|dinky|small)/.test(t)) {
    p = { sfcT: 30, sfcTd: 20, midDry: 6, sfcWind: 5, deepWind: 18, turning: 0.2, stormSpeed: 20 };
  }

  // Type
  if (/(hurricane|tropical|eyewall)/.test(t)) {
    p = { sfcT: 28, sfcTd: 26, midDry: 3, sfcWind: 40, deepWind: 45, turning: 0.3, stormSpeed: 15 };
  }
  if (/(landspout|low.?topped|cool season|shallow)/.test(t)) {
    p = { sfcT: 17, sfcTd: 12, midDry: 7, sfcWind: 15, deepWind: 50, turning: 0.6, stormSpeed: 25 };
  }
  if (/(derecho|squall|bow|wind)/.test(t)) {
    p.deepWind = Math.max(p.deepWind, 70); p.turning = 0.3; p.midDry = 11;
  }

  // Moisture / detail modifiers
  if (/(dry|high.?based|lp|low.?precip|not.*condensed)/.test(t)) p.sfcTd -= 5;
  if (/(wet|hp|rain.?wrapped|soaked|juicy|moist)/.test(t)) p.sfcTd += 3;
  if (/(isolated)/.test(t)) p.deepWind = Math.max(30, p.deepWind - 15);

  // Clamp to physically realistic ranges (highest observed CAPE ~5000-6000 J/kg).
  p.sfcT = Math.min(p.sfcT, 33);
  p.sfcTd = Math.min(p.sfcTd, 25);           // ~25°C Td is about as juicy as reality gets
  p.sfcTd = Math.min(p.sfcTd, p.sfcT - 1);   // dewpoint never exceeds temp
  p.midDry = Math.min(p.midDry, 11);

  const name = text.trim().length ? text.trim().slice(0, 40) : "Custom Storm";
  return { p, name };
}

function buildSounding(p: StormParams, name: string): Sounding {
  const skeleton = [
    { p: 1000, h: 0 }, { p: 925, h: 760 }, { p: 850, h: 1500 }, { p: 700, h: 3100 },
    { p: 500, h: 5700 }, { p: 400, h: 7300 }, { p: 300, h: 9500 }, { p: 200, h: 12200 },
    { p: 100, h: 16200 },
  ];

  const levels: SoundingLevel[] = skeleton.map((lvl) => {
    const frac = lvl.h / 16200;
    const lapse = 6.0 + p.midDry * 0.15;
    let T = p.sfcT - (lvl.h / 1000) * lapse;
    if (lvl.p <= 200) T = Math.max(T, -60);

    const dryRate = 1.0 + p.midDry * 0.25;
    let Td = p.sfcTd - (lvl.h / 1000) * dryRate * 2.2;
    Td = Math.min(Td, T - 0.5);

    const wind_kt = Math.round(p.sfcWind + (p.deepWind - p.sfcWind) * Math.pow(frac, 0.7));
    const wind_dir_deg = Math.round(160 + p.turning * 110 * Math.pow(frac, 0.5)) % 360;

    return {
      p_hPa: lvl.p, height_m: lvl.h,
      T_C: Math.round(T * 10) / 10,
      Td_C: Math.round(Td * 10) / 10,
      wind_dir_deg, wind_kt,
    };
  });

  return {
    meta: { name, source: "ai", notes: "Generated from description (rule-based)." },
    surface: { pressure_hPa: 1000, elevation_m: 0, T_C: p.sfcT, Td_C: p.sfcTd },
    storm_motion: { dir_deg: 240, speed_kt: p.stormSpeed },
    levels,
  };
}

export function generateSounding(description: string): Sounding {
  const { p, name } = paramsFromText(description);
  return buildSounding(p, name);
}