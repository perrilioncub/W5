// src/ui/skewt.ts
// Interactive skew-T log-P diagram with LCL/LFC/EL markers + wind barbs.

import type { Sounding } from "../soundings/schema";
import { computeIndices } from "../soundings/indices";

const W = 480, H = 480;
const M = { top: 20, right: 60, bottom: 40, left: 50 };
const plotW = W - M.left - M.right;
const plotH = H - M.top - M.bottom;
const P_TOP = 100, P_BOT = 1050;
const T_MIN = -90, T_MAX = 45;
const SKEW = 55;

function pY(p: number): number {
  const f = (Math.log(p) - Math.log(P_TOP)) / (Math.log(P_BOT) - Math.log(P_TOP));
  return M.top + f * plotH;
}
function hToP(s: Sounding, h: number): number {
  // interpolate pressure at a height
  const L = s.levels;
  if (h <= L[0].height_m) return L[0].p_hPa;
  const top = L[L.length - 1];
  if (h >= top.height_m) return top.p_hPa;
  for (let i = 1; i < L.length; i++) {
    if (L[i].height_m >= h) {
      const lo = L[i - 1], hi = L[i];
      const f = (h - lo.height_m) / (hi.height_m - lo.height_m);
      return lo.p_hPa + f * (hi.p_hPa - lo.p_hPa);
    }
  }
  return top.p_hPa;
}
function tX(T: number, p: number): number {
  const base = ((T - T_MIN) / (T_MAX - T_MIN)) * plotW;
  const skewAmt = (pY(p) - M.top) / plotH * SKEW;
  return M.left + base + skewAmt;
}
function xToT(x: number, p: number): number {
  const skewAmt = (pY(p) - M.top) / plotH * SKEW;
  return T_MIN + ((x - M.left - skewAmt) / plotW) * (T_MAX - T_MIN);
}

let dragState: { levelIdx: number; field: "T_C" | "Td_C" } | null = null;

export function renderSkewT(s: Sounding, onChange?: (s: Sounding) => void): SVGSVGElement {
  const idx = computeIndices(s);
  const L = s.levels;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("width", String(W));
  svg.setAttribute("height", String(H));
  svg.style.cssText = "background:#fff; border:1px solid #ccc; border-radius:6px; touch-action:none;";

  const add = (tag: string, attrs: Record<string, string | number>, text?: string) => {
    const e = document.createElementNS(ns, tag);
    for (const k in attrs) e.setAttribute(k, String(attrs[k]));
    if (text !== undefined) e.textContent = text;
    svg.appendChild(e);
    return e;
  };

  // Isotherms + isobars
  for (let T = -90; T <= 40; T += 10) {
    add("line", { x1: tX(T, P_BOT), y1: pY(P_BOT), x2: tX(T, P_TOP), y2: pY(P_TOP), stroke: "#ececec", "stroke-width": 1 });
    add("text", { x: tX(T, P_BOT), y: H - M.bottom + 14, "font-size": 9, fill: "#999", "text-anchor": "middle" }, String(T));
  }
  for (const p of [1000, 850, 700, 500, 400, 300, 200, 100]) {
    add("line", { x1: M.left, y1: pY(p), x2: M.left + plotW, y2: pY(p), stroke: "#ececec", "stroke-width": 1 });
    add("text", { x: M.left - 6, y: pY(p) + 3, "font-size": 9, fill: "#999", "text-anchor": "end" }, String(p));
  }

  // CAPE shading
  const capeArea = idx.parcelPath.filter(pt => pt.buoy > 0);
  if (capeArea.length > 1) {
    const fwd = capeArea.map(pt => `${tX(pt.parcelT_C, pt.p_hPa)},${pY(pt.p_hPa)}`);
    const back = capeArea.slice().reverse().map(pt => `${tX(pt.envT_C, pt.p_hPa)},${pY(pt.p_hPa)}`);
    add("polygon", { points: [...fwd, ...back].join(" "), fill: "rgba(220,40,40,0.18)" });
  }
  // Parcel path
  add("polyline", { points: idx.parcelPath.filter((_, i) => i % 4 === 0).map(pt => `${tX(pt.parcelT_C, pt.p_hPa)},${pY(pt.p_hPa)}`).join(" "), fill: "none", stroke: "#ff8c00", "stroke-width": 2, "stroke-dasharray": "5,3" });

  // Temp + dewpoint
  add("polyline", { points: L.map(l => `${tX(l.T_C, l.p_hPa)},${pY(l.p_hPa)}`).join(" "), fill: "none", stroke: "#d02020", "stroke-width": 2.5 });
  add("polyline", { points: L.map(l => `${tX(l.Td_C, l.p_hPa)},${pY(l.p_hPa)}`).join(" "), fill: "none", stroke: "#20a020", "stroke-width": 2.5 });

  // --- LCL / LFC / EL markers ---
  const marker = (h: number, label: string, color: string) => {
    if (h <= 0) return;
    const p = hToP(s, h);
    const y = pY(p);
    add("line", { x1: M.left, y1: y, x2: M.left + plotW, y2: y, stroke: color, "stroke-width": 1, "stroke-dasharray": "2,2", opacity: 0.6 });
    add("text", { x: M.left + 4, y: y - 2, "font-size": 9, fill: color, "text-anchor": "start", "font-weight": "bold" }, label);  };
    
  marker(idx.lcl_m, "LCL", "#008080");
  marker(idx.lfc_m, "LFC", "#c000c0");
  marker(idx.el_m, "EL", "#0060c0");

  // --- Wind barbs (right margin) ---
  const barbX = M.left + plotW + 22;
  add("line", { x1: barbX, y1: M.top, x2: barbX, y2: M.top + plotH, stroke: "#ddd", "stroke-width": 1 });
  const barbHeights = [0, 1000, 2000, 3000, 4000, 6000, 8000, 10000, 12000];
  for (const h of barbHeights) {
    const p = hToP(s, h);
    const y = pY(p);
    const dir = L.reduce((a, b) => Math.abs(b.height_m - h) < Math.abs(a.height_m - h) ? b : a).wind_dir_deg;
    const spd = L.reduce((a, b) => Math.abs(b.height_m - h) < Math.abs(a.height_m - h) ? b : a).wind_kt;
    drawBarb(add, barbX, y, dir, spd);
  }

  // Draggable handles
  L.forEach((l, i) => {
    const th = add("circle", { cx: tX(l.T_C, l.p_hPa), cy: pY(l.p_hPa), r: 5, fill: "#d02020", cursor: "ew-resize" });
    th.addEventListener("pointerdown", (e) => { e.preventDefault(); dragState = { levelIdx: i, field: "T_C" }; });
    const tdh = add("circle", { cx: tX(l.Td_C, l.p_hPa), cy: pY(l.p_hPa), r: 5, fill: "#20a020", cursor: "ew-resize" });
    tdh.addEventListener("pointerdown", (e) => { e.preventDefault(); dragState = { levelIdx: i, field: "Td_C" }; });
  });

  svg.addEventListener("pointermove", (e) => {
    if (!dragState || !onChange) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const lvl = s.levels[dragState.levelIdx];
    let newT = Math.max(-100, Math.min(50, Math.round(xToT(x, lvl.p_hPa) * 10) / 10));
    if (dragState.field === "T_C") { lvl.T_C = newT; if (lvl.Td_C > lvl.T_C) lvl.Td_C = lvl.T_C; }
    else { lvl.Td_C = Math.min(newT, lvl.T_C); }
    onChange(s);
  });
  const end = () => { dragState = null; };
  svg.addEventListener("pointerup", end);
  svg.addEventListener("pointerleave", end);

  add("text", { x: M.left, y: 14, "font-size": 11, fill: "#333", "font-weight": "bold" }, s.meta.name);
  return svg;
}

// Draw a wind barb at (x,y). Simplified: staff + flags/full/half barbs.
function drawBarb(add: Function, x: number, y: number, dir: number, spd: number) {
  const len = 20;
  const rad = ((dir - 90) * Math.PI) / 180; // direction FROM
  const dx = Math.cos(rad), dy = Math.sin(rad);
  const ex = x + dx * len, ey = y + dy * len;
  add("line", { x1: x, y1: y, x2: ex, y2: ey, stroke: "#333", "stroke-width": 1 });
  // perpendicular for barbs
  const px = -dy, py = dx;
  let s = Math.round(spd / 5) * 5;
  let pos = 0;
  const step = 3.5;
  // 50-kt flags
  while (s >= 50) {
    const bx = ex - dx * pos, by = ey - dy * pos;
    add("polygon", { points: `${bx},${by} ${bx + px * 7 + dx * 3},${by + py * 7 + dy * 3} ${bx - dx * step},${by - dy * step}`, fill: "#333" });
    s -= 50; pos += step * 1.5;
  }
  // 10-kt full barbs
  while (s >= 10) {
    const bx = ex - dx * pos, by = ey - dy * pos;
    add("line", { x1: bx, y1: by, x2: bx + px * 7, y2: by + py * 7, stroke: "#333", "stroke-width": 1 });
    s -= 10; pos += step;
  }
  // 5-kt half barb
  if (s >= 5) {
    const bx = ex - dx * pos, by = ey - dy * pos;
    add("line", { x1: bx, y1: by, x2: bx + px * 3.5, y2: by + py * 3.5, stroke: "#333", "stroke-width": 1 });
  }
}