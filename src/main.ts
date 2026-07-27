// src/main.ts
import { computeIndices } from "./soundings/indices";
import { WEISMAN_KLEMP, PULSE_STORM, TORNADO_OUTBREAK, LOW_TOPPED } from "./soundings/presets";
import { generateSounding } from "./soundings/generator";
import { renderSkewT } from "./ui/skewt";
import { renderHodograph } from "./ui/hodograph";
import type { Sounding } from "./soundings/schema";

const app = document.querySelector<HTMLDivElement>("#app")!;
const library: Sounding[] = [TORNADO_OUTBREAK, WEISMAN_KLEMP, LOW_TOPPED, PULSE_STORM];
let selectedIndex = 0;

function row(label: string, val: string | number, unit = ""): string {
  return `<tr><td style="color:#555; padding-right:10px;">${label}</td><td style="font-weight:bold; text-align:right;">${val}${unit}</td></tr>`;
}

function panelHTML(s: Sounding): string {
  const x = computeIndices(s);
  return `
    <table><tbody>
      ${row("SBCAPE", x.sbcape, " J/kg")}
      ${row("MLCAPE", x.mlcape, " J/kg")}
      ${row("MUCAPE", x.mucape, " J/kg")}
      ${row("0-3km CAPE", x.cape3km, " J/kg")}
      ${row("SBCIN", x.sbcin, " J/kg")}
      ${row("DCAPE", x.dcape, " J/kg")}
      ${row("LI", x.li)}
      ${row("LCL/LFC/EL", `${x.lcl_m}/${x.lfc_m}/${x.el_m}`, " m")}
      ${row("PWAT", x.pwat_in, " in")}
      ${row("K / TT", `${x.kindex}/${x.totalTotals}`)}
      ${row("FZL/WBZ", `${x.fzl_m}/${x.wbz_m}`, " m")}
    </tbody></table>`;
}
function panel2HTML(s: Sounding): string {
  const x = computeIndices(s);
  return `
    <table><tbody>
      ${row("0-1/0-6 shear", `${x.shear_0_1km_kt}/${x.shear_0_6km_kt}`, " kt")}
      ${row("EBWD", x.ebwd_kt, " kt")}
      ${row("0-1 SRH", x.srh_0_1km, " m²/s²")}
      ${row("0-3 SRH", x.srh_0_3km, " m²/s²")}
      ${row("Eff SRH", x.srh_eff, " m²/s²")}
      ${row("Bunkers R", `${x.bunkersRight.dir}°/${x.bunkersRight.spd}kt`)}
      ${row("Crit Angle", x.criticalAngle, "°")}
      ${row("LR 0-3/3-6", `${x.lr_0_3km}/${x.lr_3_6km}`, "")}
      ${row("LR 700-500", x.lr_700_500, "")}
      <tr><td colspan="2" style="border-top:1px solid #ccc;"></td></tr>
      ${row("STP", `<span style="color:${x.stp >= 1 ? '#b00' : '#333'}">${x.stp}</span>`)}
      ${row("SCP", `<span style="color:${x.scp >= 1 ? '#b00' : '#333'}">${x.scp}</span>`)}
      ${row("SHIP", `<span style="color:${x.ship >= 1 ? '#b00' : '#333'}">${x.ship}</span>`)}
    </tbody></table>`;
}

function render() {
  const s = library[selectedIndex];
  const options = library.map((snd, i) => `<option value="${i}" ${i === selectedIndex ? "selected" : ""}>${snd.meta.name}</option>`).join("");

  app.innerHTML = `
    <h1 style="margin-bottom:4px;">W5 — World Wide Web Weather Watcher</h1>
    <p style="color:#666; margin-top:0;">SPC-style sounding analysis · <b>drag the red/green dots to edit</b> 🖱️</p>
    <div style="background:#f4f4f8; border:1px solid #ddd; border-radius:8px; padding:12px; margin:12px 0;">
      <label style="font-weight:bold;">🌪️ Describe a storm:</label><br/>
      <input id="descInput" type="text" placeholder="e.g. violent rain-wrapped tornado" style="width:55%; padding:8px; border-radius:4px; border:1px solid #bbb; margin-top:6px;"/>
      <button id="genBtn" style="padding:8px 16px; border-radius:4px; border:none; background:#3060d0; color:#fff; cursor:pointer;">Generate</button>
    </div>
    <div style="margin:12px 0;">
      <label style="font-weight:bold; margin-right:8px;">Environment:</label>
      <select id="picker" style="padding:6px 10px; border-radius:4px;">${options}</select>
    </div>
    <h2 style="margin:8px 0;">${s.meta.name}</h2>
    <div style="display:flex; gap:16px; align-items:flex-start; flex-wrap:wrap;">
      <div id="skewtSlot"></div>
      <div id="hodoSlot"></div>
      <div id="panel1" style="font-size:13px; line-height:1.5;">${panelHTML(s)}</div>
      <div id="panel2" style="font-size:13px; line-height:1.5;">${panel2HTML(s)}</div>
    </div>
  `;

  const onEdit = (edited: Sounding) => {
    // live-update only the panels + hodograph; skew-T updates itself in place
    document.querySelector("#panel1")!.innerHTML = panelHTML(edited);
    document.querySelector("#panel2")!.innerHTML = panel2HTML(edited);
    const hodo = document.querySelector("#hodoSlot")!;
    hodo.innerHTML = ""; hodo.appendChild(renderHodographEl(edited));
    // redraw skew-T so curves follow the dragged points
    const slot = document.querySelector("#skewtSlot")!;
    slot.innerHTML = ""; slot.appendChild(renderSkewT(edited, onEdit));
  };

  document.querySelector("#skewtSlot")!.appendChild(renderSkewT(s, onEdit));
  document.querySelector("#hodoSlot")!.appendChild(renderHodographEl(s));

  document.querySelector<HTMLSelectElement>("#picker")!.addEventListener("change", (e) => {
    selectedIndex = parseInt((e.target as HTMLSelectElement).value, 10); render();
  });
  const input = document.querySelector<HTMLInputElement>("#descInput")!;
  const gen = () => { const d = input.value.trim(); if (!d) return; library.push(generateSounding(d)); selectedIndex = library.length - 1; render(); };
  document.querySelector<HTMLButtonElement>("#genBtn")!.addEventListener("click", gen);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") gen(); });
}

// helper: hodograph returns HTML string, wrap into an element
function renderHodographEl(s: Sounding): HTMLElement {
  const div = document.createElement("div");
  div.innerHTML = renderHodograph(s);
  return div;
}

render();