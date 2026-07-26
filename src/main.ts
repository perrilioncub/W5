// src/main.ts
import { computeIndices } from "./soundings/indices";
import { WEISMAN_KLEMP, PULSE_STORM, TORNADO_OUTBREAK, LOW_TOPPED } from "./soundings/presets";
import { validateSounding } from "./soundings/validate";
import type { Sounding } from "./soundings/schema";

const app = document.querySelector<HTMLDivElement>("#app")!;

const soundings: Sounding[] = [TORNADO_OUTBREAK, WEISMAN_KLEMP, LOW_TOPPED, PULSE_STORM];

function card(s: Sounding): string {
  const result = validateSounding(s);
  const idx = computeIndices(s);
  return `
    <div style="border:1px solid #ccc; padding:12px; margin:8px 0; border-radius:6px;">
      <h2 style="margin:0 0 4px 0;">${s.meta.name}</h2>
      <p style="margin:0 0 8px 0; color:#666;">${s.meta.notes ?? ""}</p>
      <p style="margin:0;">Validation: ${result.ok ? "✅ PASSED" : "❌ FAILED"}</p>
      <pre style="margin:8px 0 0 0;">CAPE:  ${idx.cape} J/kg
CIN:   ${idx.cin} J/kg
LCL:   ${idx.lcl_m} m
LFC:   ${idx.lfc_m} m
EL:    ${idx.el_m} m
0-6km shear: ${idx.shear_0_6km_kt} kt
0-1km SRH:   ${idx.srh_0_1km} m²/s²</pre>
    </div>
  `;
}

app.innerHTML = `
  <h1>W5 — World Wide Web Weather Watcher</h1>
  <p>Comparing ${soundings.length} environments (sorted by intensity):</p>
  ${soundings.map(card).join("")}
`;