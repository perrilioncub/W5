// src/soundings/presets.ts
// Hand-built sounding library — contrasting environments to compare.

import type { Sounding } from "./schema";

// Classic idealized supercell — strong CAPE, good deep-layer shear.
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

// A marginal "pulse storm" — weak, low shear, garden-variety summer cell.
export const PULSE_STORM: Sounding = {
  meta: { name: "Pulse Storm (no shear)", source: "preset",
  notes: "Moderate CAPE but near-zero shear/SRH — pops straight up and collapses. Proof that CAPE alone doesn't make a storm." },
  surface: { pressure_hPa: 1000, elevation_m: 200, T_C: 31, Td_C: 21 },
  storm_motion: { dir_deg: 200, speed_kt: 10 },
  levels: [
    { p_hPa: 1000, height_m: 0,     T_C: 31,  Td_C: 21,  wind_dir_deg: 180, wind_kt: 5 },
    { p_hPa: 925,  height_m: 760,   T_C: 25,  Td_C: 19,  wind_dir_deg: 190, wind_kt: 8 },
    { p_hPa: 850,  height_m: 1500,  T_C: 20,  Td_C: 16,  wind_dir_deg: 200, wind_kt: 10 },
    { p_hPa: 700,  height_m: 3200,  T_C: 9,   Td_C: 4,   wind_dir_deg: 210, wind_kt: 12 },
    { p_hPa: 500,  height_m: 5800,  T_C: -7,  Td_C: -14, wind_dir_deg: 220, wind_kt: 15 },
    { p_hPa: 400,  height_m: 7400,  T_C: -19, Td_C: -28, wind_dir_deg: 225, wind_kt: 18 },
    { p_hPa: 300,  height_m: 9600,  T_C: -37, Td_C: -47, wind_dir_deg: 230, wind_kt: 20 },
    { p_hPa: 200,  height_m: 12200, T_C: -57, Td_C: -68, wind_dir_deg: 235, wind_kt: 22 },
    { p_hPa: 100,  height_m: 16400, T_C: -60, Td_C: -78, wind_dir_deg: 240, wind_kt: 20 },
  ],
};

// A violent tornadic environment — extreme CAPE + big low-level shear/SRH.
export const TORNADO_OUTBREAK: Sounding = {
  meta: { name: "Tornado Outbreak (extreme)", source: "preset",
          notes: "High CAPE, strong veering low-level shear — significant tornado threat." },
  surface: { pressure_hPa: 995, elevation_m: 350, T_C: 29, Td_C: 24 },
  storm_motion: { dir_deg: 250, speed_kt: 35 },
  levels: [
    { p_hPa: 995,  height_m: 0,     T_C: 29,  Td_C: 24,  wind_dir_deg: 150, wind_kt: 20 },
    { p_hPa: 925,  height_m: 700,   T_C: 24,  Td_C: 22,  wind_dir_deg: 180, wind_kt: 35 },
    { p_hPa: 850,  height_m: 1450,  T_C: 20,  Td_C: 18,  wind_dir_deg: 210, wind_kt: 45 },
    { p_hPa: 700,  height_m: 3150,  T_C: 9,   Td_C: 3,   wind_dir_deg: 240, wind_kt: 55 },
    { p_hPa: 500,  height_m: 5800,  T_C: -8,  Td_C: -16, wind_dir_deg: 255, wind_kt: 65 },
    { p_hPa: 400,  height_m: 7400,  T_C: -20, Td_C: -30, wind_dir_deg: 260, wind_kt: 75 },
    { p_hPa: 300,  height_m: 9600,  T_C: -38, Td_C: -48, wind_dir_deg: 265, wind_kt: 90 },
    { p_hPa: 200,  height_m: 12300, T_C: -58, Td_C: -70, wind_dir_deg: 270, wind_kt: 100 },
    { p_hPa: 100,  height_m: 16500, T_C: -62, Td_C: -80, wind_dir_deg: 270, wind_kt: 85 },
  ],
};

// A low-topped, cool-season setup — modest CAPE but decent shear (California-style).
export const LOW_TOPPED: Sounding = {
  meta: { name: "Low-Topped (cool season)", source: "preset",
          notes: "Shallow, modest CAPE, low LCL — landspout/weak tornado potential." },
  surface: { pressure_hPa: 1010, elevation_m: 100, T_C: 17, Td_C: 12 },
  storm_motion: { dir_deg: 230, speed_kt: 25 },
  levels: [
    { p_hPa: 1010, height_m: 0,     T_C: 17,  Td_C: 12,  wind_dir_deg: 170, wind_kt: 15 },
    { p_hPa: 925,  height_m: 720,   T_C: 12,  Td_C: 9,   wind_dir_deg: 200, wind_kt: 28 },
    { p_hPa: 850,  height_m: 1450,  T_C: 8,   Td_C: 5,   wind_dir_deg: 220, wind_kt: 35 },
    { p_hPa: 700,  height_m: 3050,  T_C: -3,  Td_C: -9,  wind_dir_deg: 240, wind_kt: 42 },
    { p_hPa: 500,  height_m: 5500,  T_C: -22, Td_C: -30, wind_dir_deg: 250, wind_kt: 50 },
    { p_hPa: 400,  height_m: 7000,  T_C: -34, Td_C: -44, wind_dir_deg: 255, wind_kt: 55 },
    { p_hPa: 300,  height_m: 9000,  T_C: -48, Td_C: -58, wind_dir_deg: 260, wind_kt: 60 },
    { p_hPa: 200,  height_m: 11500, T_C: -58, Td_C: -70, wind_dir_deg: 260, wind_kt: 55 },
    { p_hPa: 100,  height_m: 15500, T_C: -58, Td_C: -78, wind_dir_deg: 260, wind_kt: 45 },
  ],
};