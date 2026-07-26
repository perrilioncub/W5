// src/main.ts
import { computeIndices } from "./soundings/indices";
import { WEISMAN_KLEMP, PULSE_STORM, TORNADO_OUTBREAK, LOW_TOPPED } from "./soundings/presets";
import { renderSkewT } from "./ui/skewt";
import { renderHodograph } from "./ui/hodograph";
import { validateSounding } from "./soundings/validate";
import type { Sounding } from "./soundings/schema";

const app = document.querySelector<HTMLDivElement>("#app")!;

// The sounding library — presets for now; AI/historical will add to this later.
const library: Sounding[] = [TORNADO_OUTBREAK, WEISMAN_KLEMP, LOW_TOPPED, PULSE_STORM];

let selectedIndex = 0;

function threatLevel(s: Sounding): { label: string; color: string } {
  const idx = computeIndices(s);
  const score = idx.cape * (idx.srh_0_1km / 100) * (idx.shear_0_6km_kt / 40);
  if (score > 3000) return { label: "EXTREME", color: "#b00020" };
  if (score > 1000) return { label: "HIGH", color: "#e06000" };
  if (score > 200)  return { label: "MODERATE", color: "#c0a000" };
  return { label: "LOW", color: "#4080c0" };
}

function render() {
  const s = library[selectedIndex];
  const idx = computeIndices(s);
  const result = validateSounding(s);
  const threat = threatLevel(s);

  const options = library.map((snd, i) =>
    `<option value="${i}" ${i === selectedIndex ? "selected" : ""}>${snd.meta.name}</option>`
  ).join("");

  app.innerHTML = `
    <h1 style="margin-bottom:4px;">W5 — World Wide Web Weather Watcher</h1>
    <p style="color:#666; margin-top:0;">Sounding analysis</p>

    <div style="margin:16px 0;">
      <label style="font-weight:bold; margin-right:8px;">Environment:</label>
      <select id="picker" style="padding:6px 10px; font-size:14px; border-radius:4px;">
        ${options}
      </select>
    </div>

    <div style="border:1px solid #ccc; border-radius:8px; padding:16px;">
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:4px;">
        <h2 style="margin:0;">${s.meta.name}</h2>
        <span style="background:${threat.color}; color:#fff; padding:2px 10px; border-radius:12px; font-size:12px; font-weight:bold;">
          ${threat.label}
        </span>
        <span style="color:${result.ok ? "#2a2" : "#a22"}; font-size:13px;">
          ${result.ok ? "✅ valid" : "❌ invalid"}
        </span>
      </div>
      <p style="margin:0 0 12px 0; color:#666;">${s.meta.notes ?? ""}</p>

      <div style="display:flex; gap:20px; align-items:flex-start; flex-wrap:wrap;">
        <div>${renderSkewT(s)}</div>
        <div>${renderHodograph(s)}</div>
        <div style="min-width:200px;">
          <h3 style="margin:0 0 8px 0;">Indices</h3>
          <pre style="margin:0; font-size:13px; line-height:1.6;">CAPE:  ${idx.cape} J/kg
CIN:   ${idx.cin} J/kg
LCL:   ${idx.lcl_m} m
LFC:   ${idx.lfc_m} m
EL:    ${idx.el_m} m
0-6km shear: ${idx.shear_0_6km_kt} kt
0-1km SRH:   ${idx.srh_0_1km} m²/s²</pre>
          <p style="margin:12px 0 0 0; font-size:11px; color:#999;">
            <b>Skew-T:</b> <span style="color:#d02020;">■</span>Temp
            <span style="color:#20a020;">■</span>Dewpt
            <span style="color:#ff8c00;">■</span>Parcel
            <span style="color:rgba(220,40,40,0.4);">■</span>CAPE<br>
            <b>Hodo:</b> <span style="color:#e02020;">■</span>0-1
            <span style="color:#f08000;">■</span>1-3
            <span style="color:#20a020;">■</span>3-6
            <span style="color:#2060d0;">■</span>6-8km
          </p>
        </div>
      </div>
    </div>
  `;

  const picker = document.querySelector<HTMLSelectElement>("#picker")!;
  picker.addEventListener("change", () => {
    selectedIndex = parseInt(picker.value, 10);
    render();
  });
}

render();