// src/main.ts
import { computeIndices } from "./soundings/indices";
import { WEISMAN_KLEMP } from "./soundings/presets";
import { validateSounding } from "./soundings/validate";

const app = document.querySelector<HTMLDivElement>("#app")!;

const sounding = WEISMAN_KLEMP;
const result = validateSounding(sounding);
const idx = computeIndices(sounding);

app.innerHTML = `
  <h1>W5 — World Wide Web Weather Watcher</h1>
  <h2>${sounding.meta.name}</h2>
  <p>Source: ${sounding.meta.source} | Levels: ${sounding.levels.length}</p>
  <p>Validation: ${result.ok ? "✅ PASSED" : "❌ FAILED"}</p>
  ${result.errors.length ? `<pre>Errors:\n${result.errors.join("\n")}</pre>` : ""}
  ${result.warnings.length ? `<pre>Warnings:\n${result.warnings.join("\n")}</pre>` : ""}
  <h3>Indices</h3>
  <pre>CAPE:  ${idx.cape} J/kg
CIN:   ${idx.cin} J/kg
LCL:   ${idx.lcl_m} m
0-6km shear: ${idx.shear_0_6km_kt} kt
0-1km SRH:   ${idx.srh_0_1km} m²/s²</pre>
  <h3>Profile</h3>
  <pre>${sounding.levels.map(l =>
    `${String(l.p_hPa).padStart(4)} hPa  ${String(l.height_m).padStart(6)} m  ` +
    `T ${String(l.T_C).padStart(4)}  Td ${String(l.Td_C).padStart(4)}  ` +
    `wind ${l.wind_dir_deg}° @ ${l.wind_kt}kt`
  ).join("\n")}</pre>
`;