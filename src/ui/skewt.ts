// src/ui/skewt.ts
// Renders a sounding as a skew-T log-P diagram (SVG).

import type { Sounding } from "../soundings/schema";
import { computeIndices } from "../soundings/indices";

// Chart config
const W = 420, H = 480;
const M = { top: 20, right: 20, bottom: 40, left: 50 };
const plotW = W - M.left - M.right;
const plotH = H - M.top - M.bottom;

const P_TOP = 100, P_BOT = 1050;     // pressure range (hPa)
const T_MIN = -90, T_MAX = 45;       // temperature range at the bottom (°C)
const SKEW = 55;                     // how much the isotherms slant (px per log-P decade-ish)

// pressure -> y (log scale)
function pY(p: number): number {
  const f = (Math.log(p) - Math.log(P_TOP)) / (Math.log(P_BOT) - Math.log(P_TOP));
  return M.top + f * plotH;
}
// temperature + pressure -> x (skewed)
function tX(T: number, p: number): number {
  const base = ((T - T_MIN) / (T_MAX - T_MIN)) * plotW;
  const skewAmt = (pY(p) - M.top) / plotH * SKEW; // more skew lower down
  return M.left + base + skewAmt;
}

export function renderSkewT(s: Sounding): string {
  const idx = computeIndices(s);
  const L = s.levels;
  let el: string[] = [];

  // --- Background: skewed isotherms ---
  for (let T = -90; T <= 40; T += 10) {
    const x1 = tX(T, P_BOT), y1 = pY(P_BOT);
    const x2 = tX(T, P_TOP), y2 = pY(P_TOP);
    el.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#e0e0e0" stroke-width="1"/>`);
    el.push(`<text x="${x1}" y="${H - M.bottom + 14}" font-size="9" fill="#999" text-anchor="middle">${T}</text>`);
  }
  // --- Isobars (horizontal) ---
  for (const p of [1000, 850, 700, 500, 400, 300, 200, 100]) {
    const y = pY(p);
    el.push(`<line x1="${M.left}" y1="${y}" x2="${M.left + plotW}" y2="${y}" stroke="#e0e0e0" stroke-width="1"/>`);
    el.push(`<text x="${M.left - 6}" y="${y + 3}" font-size="9" fill="#999" text-anchor="end">${p}</text>`);
  }

  // --- CAPE shading: fill between parcel (warmer) and env where buoyant ---
  const capeArea = idx.parcelPath.filter(pt => pt.buoy > 0);
  if (capeArea.length > 1) {
    const fwd = capeArea.map(pt => `${tX(pt.parcelT_C, pt.p_hPa)},${pY(pt.p_hPa)}`);
    const back = capeArea.slice().reverse().map(pt => `${tX(pt.envT_C, pt.p_hPa)},${pY(pt.p_hPa)}`);
    el.push(`<polygon points="${[...fwd, ...back].join(" ")}" fill="rgba(220,40,40,0.18)"/>`);
  }

  // --- Environment temperature curve (red) ---
  const tempPts = L.map(l => `${tX(l.T_C, l.p_hPa)},${pY(l.p_hPa)}`).join(" ");
  el.push(`<polyline points="${tempPts}" fill="none" stroke="#d02020" stroke-width="2.5"/>`);

  // --- Dewpoint curve (green) ---
  const tdPts = L.map(l => `${tX(l.Td_C, l.p_hPa)},${pY(l.p_hPa)}`).join(" ");
  el.push(`<polyline points="${tdPts}" fill="none" stroke="#20a020" stroke-width="2.5"/>`);

  // --- Lifted parcel path (dashed orange) ---
  const parcelPts = idx.parcelPath.filter((_, i) => i % 4 === 0)
    .map(pt => `${tX(pt.parcelT_C, pt.p_hPa)},${pY(pt.p_hPa)}`).join(" ");
  el.push(`<polyline points="${parcelPts}" fill="none" stroke="#ff8c00" stroke-width="2" stroke-dasharray="5,3"/>`);

  return `
    <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="background:#fff; border:1px solid #ccc; border-radius:6px;">
      ${el.join("\n")}
      <text x="${M.left}" y="14" font-size="11" fill="#333" font-weight="bold">${s.meta.name}</text>
    </svg>
  `;
}