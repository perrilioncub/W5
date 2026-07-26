// src/main.ts
import { computeIndices } from "./soundings/indices";
import { WEISMAN_KLEMP, PULSE_STORM, TORNADO_OUTBREAK, LOW_TOPPED } from "./soundings/presets";
import { renderSkewT } from "./ui/skewt";
import { renderHodograph } from "./ui/hodograph";
import type { Sounding } from "./soundings/schema";

const app = document.querySelector<HTMLDivElement>("#app")!;
const soundings: Sounding[] = [TORNADO_OUTBREAK, WEISMAN_KLEMP, LOW_TOPPED, PULSE_STORM];

function card(s: Sounding): string {
  const idx = computeIndices(s);
  return `
    <div style="border:1px solid #ccc; padding:12px; margin:8px 0; border-radius:6px;">
      <h2 style="margin:0 0 4px 0;">${s.meta.name}</h2>
      <p style="margin:0 0 12px 0; color:#666;">${s.meta.notes ?? ""}</p>
      <div style="display:flex; gap:16px; align-items:flex-start; flex-wrap:wrap;">
        <div>${renderSkewT(s)}</div>
        <div>${renderHodograph(s)}</div>
        <div>
          <pre style="margin:0;">CAPE:  ${idx.cape} J/kg
CIN:   ${idx.cin} J/kg
LCL:   ${idx.lcl_m} m
LFC:   ${idx.lfc_m} m
EL:    ${idx.el_m} m
0-6km shear: ${idx.shear_0_6km_kt} kt
0-1km SRH:   ${idx.srh_0_1km} m²/s²</pre>
          <p style="margin:8px 0 0 0; font-size:11px; color:#999;">
            Hodograph bands:
            <span style="color:#e02020;">■</span>0-1
            <span style="color:#f08000;">■</span>1-3
            <span style="color:#20a020;">■</span>3-6
            <span style="color:#2060d0;">■</span>6-8km
          </p>
        </div>
      </div>
    </div>
  `;
}

app.innerHTML = `
  <h1>W5 — World Wide Web Weather Watcher</h1>
  <p>Skew-T + Hodograph analysis of ${soundings.length} environments:</p>
  ${soundings.map(card).join("")}
`;