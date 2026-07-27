// src/ui/skewt.ts
// Interactive skew-T log-P diagram (SVG) — drag temp/dewpoint points to edit.

import type { Sounding } from "../soundings/schema";
import { computeIndices } from "../soundings/indices";

const W = 420, H = 480;
const M = { top: 20, right: 20, bottom: 40, left: 50 };
const plotW = W - M.left - M.right;
const plotH = H - M.top - M.bottom;
const P_TOP = 100, P_BOT = 1050;
const T_MIN = -90, T_MAX = 45;
const SKEW = 55;

function pY(p: number): number {
  const f = (Math.log(p) - Math.log(P_TOP)) / (Math.log(P_BOT) - Math.log(P_TOP));
  return M.top + f * plotH;
}
function tX(T: number, p: number): number {
  const base = ((T - T_MIN) / (T_MAX - T_MIN)) * plotW;
  const skewAmt = (pY(p) - M.top) / plotH * SKEW;
  return M.left + base + skewAmt;
}
// inverse: screen x + pressure -> temperature (for dragging)
function xToT(x: number, p: number): number {
  const skewAmt = (pY(p) - M.top) / plotH * SKEW;
  const base = x - M.left - skewAmt;
  return T_MIN + (base / plotW) * (T_MAX - T_MIN);
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

  const add = (tag: string, attrs: Record<string, string | number>) => {
    const e = document.createElementNS(ns, tag);
    for (const k in attrs) e.setAttribute(k, String(attrs[k]));
    svg.appendChild(e);
    return e;
  };

  // Isotherms
  for (let T = -90; T <= 40; T += 10) {
    add("line", { x1: tX(T, P_BOT), y1: pY(P_BOT), x2: tX(T, P_TOP), y2: pY(P_TOP), stroke: "#e8e8e8", "stroke-width": 1 });
    const lbl = add("text", { x: tX(T, P_BOT), y: H - M.bottom + 14, "font-size": 9, fill: "#999", "text-anchor": "middle" });
    lbl.textContent = String(T);
  }
  // Isobars
  for (const p of [1000, 850, 700, 500, 400, 300, 200, 100]) {
    add("line", { x1: M.left, y1: pY(p), x2: M.left + plotW, y2: pY(p), stroke: "#e8e8e8", "stroke-width": 1 });
    const lbl = add("text", { x: M.left - 6, y: pY(p) + 3, "font-size": 9, fill: "#999", "text-anchor": "end" });
    lbl.textContent = String(p);
  }

  // CAPE shading
  const capeArea = idx.parcelPath.filter(pt => pt.buoy > 0);
  if (capeArea.length > 1) {
    const fwd = capeArea.map(pt => `${tX(pt.parcelT_C, pt.p_hPa)},${pY(pt.p_hPa)}`);
    const back = capeArea.slice().reverse().map(pt => `${tX(pt.envT_C, pt.p_hPa)},${pY(pt.p_hPa)}`);
    add("polygon", { points: [...fwd, ...back].join(" "), fill: "rgba(220,40,40,0.18)" });
  }
  // Parcel path
  const parcelPts = idx.parcelPath.filter((_, i) => i % 4 === 0).map(pt => `${tX(pt.parcelT_C, pt.p_hPa)},${pY(pt.p_hPa)}`).join(" ");
  add("polyline", { points: parcelPts, fill: "none", stroke: "#ff8c00", "stroke-width": 2, "stroke-dasharray": "5,3" });

  // Temp & dewpoint lines
  add("polyline", { points: L.map(l => `${tX(l.T_C, l.p_hPa)},${pY(l.p_hPa)}`).join(" "), fill: "none", stroke: "#d02020", "stroke-width": 2.5 });
  add("polyline", { points: L.map(l => `${tX(l.Td_C, l.p_hPa)},${pY(l.p_hPa)}`).join(" "), fill: "none", stroke: "#20a020", "stroke-width": 2.5 });

  // Draggable handles
  L.forEach((l, i) => {
    const tHandle = add("circle", { cx: tX(l.T_C, l.p_hPa), cy: pY(l.p_hPa), r: 5, fill: "#d02020", cursor: "ew-resize" }) as SVGCircleElement;
    tHandle.addEventListener("pointerdown", (e) => { e.preventDefault(); dragState = { levelIdx: i, field: "T_C" }; });
    const tdHandle = add("circle", { cx: tX(l.Td_C, l.p_hPa), cy: pY(l.p_hPa), r: 5, fill: "#20a020", cursor: "ew-resize" }) as SVGCircleElement;
    tdHandle.addEventListener("pointerdown", (e) => { e.preventDefault(); dragState = { levelIdx: i, field: "Td_C" }; });
  });

  // Drag handling
  svg.addEventListener("pointermove", (e) => {
    if (!dragState || !onChange) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const lvl = s.levels[dragState.levelIdx];
    let newT = Math.round(xToT(x, lvl.p_hPa) * 10) / 10;
    newT = Math.max(-100, Math.min(50, newT));
    if (dragState.field === "T_C") {
      lvl.T_C = newT;
      if (lvl.Td_C > lvl.T_C) lvl.Td_C = lvl.T_C; // keep Td <= T
    } else {
      lvl.Td_C = Math.min(newT, lvl.T_C); // dewpoint can't exceed temp
    }
    onChange(s);
  });
  const endDrag = () => { dragState = null; };
  svg.addEventListener("pointerup", endDrag);
  svg.addEventListener("pointerleave", endDrag);

  const title = add("text", { x: M.left, y: 14, "font-size": 11, fill: "#333", "font-weight": "bold" });
  title.textContent = s.meta.name;

  return svg;
}