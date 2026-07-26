// src/main.ts
import { WEISMAN_KLEMP } from "./soundings/presets";
import { validateSounding } from "./soundings/validate";

const app = document.querySelector<HTMLDivElement>("#app")!;

const sounding = WEISMAN_KLEMP;
const result = validateSounding(sounding);

app.innerHTML = `
  <h1>W5 — World Wide Web Weather Watcher</h1>
  <h2>${sounding.meta.name}</h2>
  <p>Source: ${sounding.meta.source} | Levels: ${sounding.levels.length}</p>
  <p>Validation: ${result.ok ? "✅ PASSED" : "❌ FAILED"}</p>
  ${result.errors.length ? `<pre>Errors:\n${result.errors.join("\n")}</pre>` : ""}
  ${result.warnings.length ? `<pre>Warnings:\n${result.warnings.join("\n")}</pre>` : ""}
  <h3>Profile</h3>
  <pre>${sounding.levels.map(l =>
    `${String(l.p_hPa).padStart(4)} hPa  ${String(l.height_m).padStart(6)} m  ` +
    `T ${String(l.T_C).padStart(4)}  Td ${String(l.Td_C).padStart(4)}  ` +
    `wind ${l.wind_dir_deg}° @ ${l.wind_kt}kt`
  ).join("\n")}</pre>
`;