// src/soundings/validate.ts
// The validation gauntlet — checks a sounding is physically legal.
// Returns specific errors so bad soundings (incl. AI-generated) can be fixed.

import type { Sounding } from "./schema";

export interface ValidationResult {
  ok: boolean;
  errors: string[];   // hard failures — sounding is unusable
  warnings: string[]; // physically extreme but valid — flag, don't reject
}

export function validateSounding(s: Sounding): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const L = s.levels;

  // Need enough levels to be meaningful
  if (!L || L.length < 3) {
    errors.push("Sounding needs at least 3 levels.");
    return { ok: false, errors, warnings };
  }

  for (let i = 0; i < L.length; i++) {
    const lv = L[i];

    // Td must not exceed T (no supersaturation)
    if (lv.Td_C > lv.T_C + 0.01) {
      errors.push(`Level ${i}: dewpoint (${lv.Td_C}°C) exceeds temperature (${lv.T_C}°C).`);
    }
    // Wind direction in range
    if (lv.wind_dir_deg < 0 || lv.wind_dir_deg >= 360) {
      errors.push(`Level ${i}: wind_dir_deg (${lv.wind_dir_deg}) must be in [0, 360).`);
    }
    // Wind speed non-negative
    if (lv.wind_kt < 0) {
      errors.push(`Level ${i}: wind_kt (${lv.wind_kt}) cannot be negative.`);
    }

    if (i > 0) {
      const prev = L[i - 1];
      // Pressure strictly decreasing upward
      if (lv.p_hPa >= prev.p_hPa) {
        errors.push(`Level ${i}: pressure (${lv.p_hPa}) must be less than level ${i - 1} (${prev.p_hPa}).`);
      }
      // Height strictly increasing upward
      if (lv.height_m <= prev.height_m) {
        errors.push(`Level ${i}: height (${lv.height_m}) must exceed level ${i - 1} (${prev.height_m}).`);
      }
      // No superadiabatic layers above the surface layer (skip the first gap)
      if (i > 1) {
        const dz = lv.height_m - prev.height_m;
        const dT = prev.T_C - lv.T_C; // temp normally drops with height
        if (dz > 0) {
          const lapse = (dT / dz) * 1000; // °C per km
          if (lapse > 9.8) {
            warnings.push(`Level ${i}: lapse rate ${lapse.toFixed(1)}°C/km is superadiabatic.`);
          }
        }
      }
    }
  }

  // Vertical coverage — should reach into the upper troposphere
  const top = L[L.length - 1];
  if (top.p_hPa > 150) {
    warnings.push(`Sounding top is only ${top.p_hPa} hPa; ideally extends to ~100 hPa.`);
  }

  return { ok: errors.length === 0, errors, warnings };
}