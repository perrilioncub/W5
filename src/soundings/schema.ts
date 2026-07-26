// src/soundings/schema.ts
// The sounding contract — the spine of W5.
// Every input path (manual, presets, AI, file import) produces one of these,
// and everything downstream (skew-T, indices, solver) reads it.

/** One level in the vertical profile. */
export interface SoundingLevel {
    p_hPa: number;       // pressure (hPa) — strictly decreasing up the profile
    height_m: number;    // geometric height above ground (m) — strictly increasing
    T_C: number;         // temperature (°C)
    Td_C: number;        // dewpoint (°C) — must be <= T_C
    wind_dir_deg: number; // wind direction (° from North, meteorological)
    wind_kt: number;     // wind speed (knots)
  }
  
  /** Surface conditions — the parcel launch point. */
  export interface SoundingSurface {
    pressure_hPa: number;
    elevation_m: number;
    T_C: number;
    Td_C: number;
  }
  
  /** Storm motion vector — needed for SRH & storm-relative diagnostics. */
  export interface StormMotion {
    dir_deg: number;
    speed_kt: number;
  }
  
  /** Where this sounding came from. */
  export type SoundingSource = "manual" | "preset" | "ai" | "archive" | "import";
  
  /** Metadata about the sounding. */
  export interface SoundingMeta {
    name: string;
    source: SoundingSource;
    notes?: string;
  }
  
  /** The complete sounding — the contract. */
  export interface Sounding {
    meta: SoundingMeta;
    surface: SoundingSurface;
    storm_motion: StormMotion;
    levels: SoundingLevel[]; // ordered surface -> top, ~15-40 levels
  }