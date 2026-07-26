// src/soundings/presets.ts
// Hand-built soundings. Starting with a classic idealized supercell profile.

import type { Sounding } from "./schema";

export const WEISMAN_KLEMP: Sounding = {
  meta: { name: "Weisman-Klemp Supercell", source: "preset",
          notes: "Classic idealized supercell environment." },
  surface: { pressure_hPa: 1000, elevation_m: 0, T_C: 30, Td_C: 22 },
  storm_motion: { dir_deg: 240, speed_kt: 30 },
  levels: [
    { p_hPa: 1000, height_m: 0,     T_C: 30,  Td_C: 22,  wind_dir_deg: 180, wind_kt: 5 },
    { p_hPa: 925,  height_m: 780,   T_C: 24,  Td_C: 19,  wind_dir_deg: 200, wind_kt: 20 },
    { p_hPa: 850,  height_m: 1500,  T_C: 18,  Td_C: 15,  wind_dir_deg: 220, wind_kt: 30 },
    { p_hPa: 700,  height_m: 3200,  T_C: 7,   Td_C: 2,   wind_dir_deg: 250, wind_kt: 40 },
    { p_hPa: 500,  height_m: 5900,  T_C: -8,  Td_C: -18, wind_dir_deg: 260, wind_kt: 50 },
    { p_hPa: 400,  height_m: 7500,  T_C: -20, Td_C: -32, wind_dir_deg: 265, wind_kt: 60 },
    { p_hPa: 300,  height_m: 9700,  T_C: -38, Td_C: -50, wind_dir_deg: 270, wind_kt: 70 },
    { p_hPa: 200,  height_m: 12400, T_C: -58, Td_C: -70, wind_dir_deg: 270, wind_kt: 75 },
    { p_hPa: 100,  height_m: 16600, T_C: -60, Td_C: -80, wind_dir_deg: 270, wind_kt: 60 },
  ],
};