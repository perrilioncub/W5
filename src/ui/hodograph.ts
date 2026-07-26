// src/ui/hodograph.ts
// Renders a sounding's wind profile as a hodograph (u/v wind components, 0-8km).

import type { Sounding, SoundingLevel } from "../soundings/schema";

const SIZE = 320;
const C = SIZE / 2;           // center
const MAX_KT = 80;            // outer ring speed
const scale = (SIZE / 2 - 30) / MAX_KT; // px per knot

function windUV(dir_deg: number, speed_kt: number): { u: number; v: number } {
  const rad = (dir_deg * Math.PI) / 180;
  return { u: -speed_kt * Math.sin(rad), v: -speed_kt * Math.cos(rad) };
}

function interpByHeight(levels: SoundingLevel[], targetH: number, key: keyof SoundingLevel): number {
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

// u,v (kt) -> screen x,y. v is up (north), u is right (east).
function toXY(u: number, v: number): { x: number; y: number } {
  return { x: C + u * scale, y: C - v * scale };
}

export function renderHodograph(s: Sounding): string {
  const el: string[] = [];

  // --- Range rings ---
  for (let spd = 20; spd <= MAX_KT; spd += 20) {
    el.push(`<circle cx="${C}" cy="${C}" r="${spd * scale}" fill="none" stroke="#e0e0e0" stroke-width="1"/>`);
    el.push(`<text x="${C + spd * scale + 2}" y="${C - 2}" font-size="8" fill="#bbb">${spd}</text>`);
  }
  // --- Axes ---
  el.push(`<line x1="${C}" y1="20" x2="${C}" y2="${SIZE - 20}" stroke="#ddd" stroke-width="1"/>`);
  el.push(`<line x1="20" y1="${C}" x2="${SIZE - 20}" y2="${C}" stroke="#ddd" stroke-width="1"/>`);

  // --- Hodograph curve: sample 0-8km, color by height band ---
  const bands = [
    { top: 1000, color: "#e02020", label: "0-1km" },  // red = low levels (tornado layer)
    { top: 3000, color: "#f08000", label: "1-3km" },  // orange
    { top: 6000, color: "#20a020", label: "3-6km" },  // green
    { top: 8000, color: "#2060d0", label: "6-8km" },  // blue
  ];

  let prevXY: { x: number; y: number } | null = null;
  let bandStart = 0;
  for (const band of bands) {
    const pts: string[] = [];
    for (let h = bandStart; h <= band.top; h += 100) {
      const dir = interpByHeight(s.levels, h, "wind_dir_deg");
      const spd = interpByHeight(s.levels, h, "wind_kt");
      const { u, v } = windUV(dir, spd);
      const { x, y } = toXY(u, v);
      pts.push(`${x},${y}`);
      if (prevXY && pts.length === 1) pts.unshift(`${prevXY.x},${prevXY.y}`);
      prevXY = { x, y };
    }
    el.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="${band.color}" stroke-width="3"/>`);
    bandStart = band.top;
  }

  // --- Surface dot + storm motion marker ---
  const sfc = windUV(s.levels[0].wind_dir_deg, s.levels[0].wind_kt);
  const sfcXY = toXY(sfc.u, sfc.v);
  el.push(`<circle cx="${sfcXY.x}" cy="${sfcXY.y}" r="4" fill="#333"/>`);

  const storm = windUV(s.storm_motion.dir_deg, s.storm_motion.speed_kt);
  const stormXY = toXY(storm.u, storm.v);
  el.push(`<circle cx="${stormXY.x}" cy="${stormXY.y}" r="5" fill="none" stroke="#a020a0" stroke-width="2"/>`);
  el.push(`<text x="${stormXY.x + 7}" y="${stormXY.y + 3}" font-size="9" fill="#a020a0">storm</text>`);

  return `
    <svg viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" style="background:#fff; border:1px solid #ccc; border-radius:6px;">
      ${el.join("\n")}
      <text x="8" y="14" font-size="11" fill="#333" font-weight="bold">Hodograph (kt)</text>
    </svg>
  `;
}