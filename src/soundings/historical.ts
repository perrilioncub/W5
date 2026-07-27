// src/soundings/historical.ts
// Fetches real archived soundings (with CORS-proxy fallback) + paste import.

import type { Sounding } from "./schema";
import { parseWyoming, wyomingURL } from "./parser";

// Try direct fetch, then a public CORS proxy if blocked.
async function fetchText(url: string): Promise<string> {
  try {
    const r = await fetch(url);
    if (r.ok) return await r.text();
  } catch { /* fall through to proxy */ }
  // CORS proxy fallback (free, public)
  const proxied = "https://corsproxy.io/?url=" + encodeURIComponent(url);
  const r2 = await fetch(proxied);
  if (!r2.ok) throw new Error("Fetch failed (direct + proxy). Try pasting the data instead.");
  return await r2.text();
}

export async function fetchHistorical(
  station: string, year: string, month: string, day: string, hour: "00" | "12"
): Promise<Sounding> {
  const url = wyomingURL(station, year, month, day, hour);
  const html = await fetchText(url);
  // Wyoming wraps the table in <PRE>...</PRE>; extract it
  const preMatch = html.match(/<PRE>([\s\S]*?)<\/PRE>/i);
  const table = preMatch ? preMatch[1] : html;
  const name = `${station} ${year}-${month.padStart(2,"0")}-${day.padStart(2,"0")} ${hour}Z`;
  const result = parseWyoming(table, name);
  if ("error" in result) throw new Error(result.error);
  return result;
}

export function parsePasted(text: string): Sounding {
  const result = parseWyoming(text, "Pasted Sounding");
  if ("error" in result) throw new Error(result.error);
  return result;
}