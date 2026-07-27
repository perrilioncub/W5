// src/soundings/generator.ts
// Rule-based sounding generator — turns a text description into a sounding.
// Free, offline, no API. Expanded keyword vocabulary.

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

  // --- INTENSITY TIERS ---
  if (/(ef5|f5|violent|extreme|monster|nightmare|catastrophic|historic|generational|apocalyptic)/.test(t)) {
    p = { sfcT: 32, sfcTd: 24, midDry: 10, sfcWind: 25, deepWind: 90, turning: 0.95, stormSpeed: 38 };
  } else if (/(ef4|f4|significant|outbreak|intense|major|dangerous|large|wedge)/.test(t)) {
    p = { sfcT: 31, sfcTd: 23, midDry: 9.5, sfcWind: 20, deepWind: 75, turning: 0.85, stormSpeed: 35 };
  } else if (/(ef3|f3|strong|supercell|potent)/.test(t)) {
    p = { sfcT: 30, sfcTd: 22, midDry: 9, sfcWind: 15, deepWind: 62, turning: 0.7, stormSpeed: 30 };
  } else if (/(ef2|f2|tornad|severe|classic|rotating)/.test(t)) {
    p = { sfcT: 29, sfcTd: 21, midDry: 8.5, sfcWind: 12, deepWind: 52, turning: 0.6, stormSpeed: 28 };
  } else if (/(ef1|f1|ef0|f0|marginal|brief|spin.?up)/.test(t)) {
    p = { sfcT: 27, sfcTd: 18, midDry: 7, sfcWind: 8, deepWind: 35, turning: 0.4, stormSpeed: 22 };
  } else if (/(pulse|garden|dinky|puny|dying|struggling|weak|popcorn|air.?mass)/.test(t)) {
    p = { sfcT: 30, sfcTd: 20, midDry: 6, sfcWind: 5, deepWind: 18, turning: 0.2, stormSpeed: 18 };
  }

  // --- STORM TYPE (overrides) ---
  if (/(hurricane|tropical|eyewall|cyclone|typhoon)/.test(t)) {
    p = { sfcT: 28, sfcTd: 26, midDry: 3, sfcWind: 45, deepWind: 50, turning: 0.35, stormSpeed: 15 };
  }
  if (/(landspout|non.?supercell|boundary)/.test(t)) {
    p = { sfcT: 26, sfcTd: 16, midDry: 8, sfcWind: 10, deepWind: 30, turning: 0.5, stormSpeed: 20 };
  }
  if (/(low.?topped|cool.?season|mini.?supercell|shallow|cold.?core)/.test(t)) {
    p = { sfcT: 17, sfcTd: 12, midDry: 7, sfcWind: 15, deepWind: 50, turning: 0.6, stormSpeed: 25 };
  }
  if (/(waterspout|fair.?weather)/.test(t)) {
    p = { sfcT: 27, sfcTd: 24, midDry: 5, sfcWind: 6, deepWind: 20, turning: 0.3, stormSpeed: 12 };
  }
  if (/(derecho|squall|bow|qlcs|mcs|complex)/.test(t)) {
    p.deepWind = Math.max(p.deepWind, 72); p.turning = 0.3; p.midDry = 11; p.sfcWind = Math.max(p.sfcWind, 18);
  }
  if (/(gustnado|shelf|outflow)/.test(t)) {
    p = { sfcT: 29, sfcTd: 19, midDry: 9, sfcWind: 20, deepWind: 45, turning: 0.25, stormSpeed: 30 };
  }
  if (/(hailstorm|hail)/.test(t)) {
    p.sfcT = 26; p.midDry = 9.5; p.deepWind = Math.max(p.deepWind, 55);
  }
  if (/(splitting|left.?mover|anticyclonic)/.test(t)) {
    p.turning = 0.5; p.deepWind = Math.max(p.deepWind, 55);
  }

  // --- MOISTURE / PRECIP CHARACTER ---
  if (/(hp|rain.?wrapped|soaked|drenched|high.?precip|torrential|flooding|wet)/.test(t)) p.sfcTd += 3;
  if (/(lp|low.?precip|dry|high.?based|not.*condensed|dusty|desert|elevated)/.test(t)) p.sfcTd -= 6;
  if (/(juicy|moist|humid|muggy|saturated)/.test(t)) p.sfcTd += 2;
  if (/(dry.?line|dryline)/.test(t)) { p.sfcTd -= 2; p.midDry += 1; }

  // --- INSTABILITY / LAPSE MODIFIERS ---
  if (/(steep|cold mid|explosive|towering)/.test(t)) p.midDry += 1.5;
  if (/(capped|cap|inversion)/.test(t)) p.sfcTd -= 2;
  if (/(uncapped|no cap|open warm sector)/.test(t)) p.sfcTd += 1;

  // --- SHEAR / ROTATION MODIFIERS ---
  if (/(sheared|screaming|ripping|strong shear|veering|curved hodo|corkscrew)/.test(t)) { p.deepWind += 15; p.turning = Math.min(1, p.turning + 0.2); }
  if (/(unidirectional|straight.?line|straight hodo)/.test(t)) p.turning = 0.15;
  if (/(weak shear|no shear|little shear|unsheared)/.test(t)) { p.deepWind = Math.min(p.deepWind, 25); p.turning = 0.2; }
  if (/(long.?track|mile.?wide|maxi)/.test(t)) { p.turning = Math.min(1, p.turning + 0.15); p.deepWind += 10; }

  // --- SIZE / SPECIFIC descriptors ---
  if (/(isolated|discrete|lone)/.test(t)) p.deepWind = Math.max(28, p.deepWind - 12);
  if (/(small|little|tiny|skinny|rope|needle)/.test(t)) p.deepWind = Math.max(25, p.deepWind - 8);

  // --- REGIONAL flavor ---
  if (/(dixie|southeast|nocturnal|night)/.test(t)) { p.sfcTd += 2; p.turning = Math.min(1, p.turning + 0.15); }
  if (/(high plains|colorado|denver)/.test(t)) { p.sfcTd -= 4; p.midDry += 1; }
  if (/(gulf coast|texas|oklahoma|plains|dixie alley|tornado alley)/.test(t)) { p.sfcTd += 1; }

  // --- Clamp to physically realistic ranges (highest observed CAPE ~5000-6000 J/kg) ---
  p.sfcT = Math.min(p.sfcT, 33);
  p.sfcTd = Math.min(p.sfcTd, 25);
  p.sfcTd = Math.min(p.sfcTd, p.sfcT - 1);
  p.midDry = Math.min(Math.max(p.midDry, 4), 11);
  p.deepWind = Math.min(p.deepWind, 110);
  p.turning = Math.min(Math.max(p.turning, 0), 1);

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