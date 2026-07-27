// src/soundings/masterprompt.ts
// Generates a copy-paste prompt for ANY external AI to produce a W5 sounding.
// "Bring your own AI" — zero cost, zero API, uses the user's own ChatGPT/Claude/Gemini.

export function buildMasterPrompt(description: string): string {
    const desc = description.trim() || "a classic tornadic supercell environment";
    return `You are a meteorological sounding generator. Produce a physically realistic \
  atmospheric sounding for this scenario:
  
  "${desc}"
  
  Return ONLY valid JSON (no markdown, no code fences, no commentary) matching this EXACT schema:
  
  {
    "meta": { "name": "short name", "source": "ai", "notes": "one-line description" },
    "surface": { "pressure_hPa": 1000, "elevation_m": 0, "T_C": 30, "Td_C": 22 },
    "storm_motion": { "dir_deg": 240, "speed_kt": 30 },
    "levels": [
      { "p_hPa": 1000, "height_m": 0, "T_C": 30, "Td_C": 22, "wind_dir_deg": 180, "wind_kt": 5 }
    ]
  }
  
  RULES:
  - Provide 9-15 levels from the surface (~1000 hPa) up to ~100 hPa.
  - Pressure must strictly DECREASE and height must strictly INCREASE with each level.
  - Dewpoint (Td_C) must NEVER exceed temperature (T_C) at any level.
  - wind_dir_deg in [0,360), wind_kt >= 0.
  - Match the scenario's physics: supercells need steep mid-level lapse rates, a low LCL \
  (surface Td within a few C of T), veering low-level winds (curved hodograph), and strong \
  0-6km shear (>40kt). Higher intensity = more CAPE + more low-level shear/SRH. Hurricanes = \
  warm, moist, deep, weakly-sheared. Low-topped/cool-season = shallow, modest CAPE, low LCL. \
  Keep values physically realistic (observed CAPE rarely exceeds ~5000-6000 J/kg).
  - Return ONLY the JSON object.`;
  }