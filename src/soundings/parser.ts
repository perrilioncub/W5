// src/soundings/parser.ts
// Parses University of Wyoming / standard sounding text into the W5 schema.

import type { Sounding, SoundingLevel } from "./schema";

// Wyoming table columns: PRES HGHT TEMP DWPT RELH MIXR DRCT SKNT ...
// We pull PRES, HGHT, TEMP, DWPT, DRCT, SKNT.
export function parseWyoming(text: string, name = "Imported Sounding"): Sounding | { error: string } {
  const lines = text.split("\n");
  const levels: SoundingLevel[] = [];

  for (const line of lines) {
    // Data rows are fixed-width numeric; need at least 8 numeric-ish columns
    const cols = line.trim().split(/\s+/);
    if (cols.length < 8) continue;
    const nums = cols.map(Number);
    // Valid data row: first 4 are finite numbers (pres, hght, temp, dwpt)
    if (nums.slice(0, 4).some(n => !isFinite(n))) continue;

    const [pres, hght, temp, dwpt] = nums;
    const drct = isFinite(nums[6]) ? nums[6] : 0;
    const sknt = isFinite(nums[7]) ? nums[7] : 0;

    // sanity: pressure 50-1100, temp -100..60
    if (pres < 50 || pres > 1100 || temp < -100 || temp > 60) continue;

    levels.push({
      p_hPa: pres, height_m: Math.round(hght),
      T_C: temp, Td_C: Math.min(dwpt, temp),
      wind_dir_deg: ((drct % 360) + 360) % 360,
      wind_kt: Math.max(0, sknt),
    });
  }

  if (levels.length < 4) return { error: "Couldn't find enough valid data rows. Paste the raw text table from Wyoming (the PRES HGHT TEMP DWPT... block)." };

  // Ensure monotonic decreasing pressure (Wyoming is already surface-up)
  levels.sort((a, b) => b.p_hPa - a.p_hPa);
  // Dedupe by pressure
  const dedup: SoundingLevel[] = [];
  for (const l of levels) {
    if (!dedup.length || Math.abs(dedup[dedup.length - 1].p_hPa - l.p_hPa) > 0.5) dedup.push(l);
  }

  const sfc = dedup[0];
  return {
    meta: { name, source: "import", notes: "Imported real sounding data." },
    surface: { pressure_hPa: sfc.p_hPa, elevation_m: sfc.height_m, T_C: sfc.T_C, Td_C: sfc.Td_C },
    storm_motion: { dir_deg: 240, speed_kt: 25 }, // Bunkers will override in indices
    levels: dedup,
  };
}

// Build a Wyoming archive URL for a station + date.
// station: e.g. "72293" (San Diego), date parts.
export function wyomingURL(station: string, year: string, month: string, day: string, hour: "00" | "12"): string {
  const ddhh = `${day.padStart(2, "0")}${hour}`;
  return `https://weather.uwyo.edu/cgi-bin/sounding?region=naconf&TYPE=TEXT%3ALIST&YEAR=${year}&MONTH=${month.padStart(2, "0")}&FROM=${ddhh}&TO=${ddhh}&STNM=${station}`;
}