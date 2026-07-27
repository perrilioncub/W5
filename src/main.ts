// src/main.ts
import { computeIndices } from "./soundings/indices";
import { WEISMAN_KLEMP, PULSE_STORM, TORNADO_OUTBREAK, LOW_TOPPED } from "./soundings/presets";
import { generateSounding } from "./soundings/generator";
import { fetchHistorical, parsePasted } from "./soundings/historical";
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

function renderHodographEl(s: Sounding): HTMLElement {
  const div = document.createElement("div");
  div.innerHTML = renderHodograph(s);
  return div;
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

    <div style="background:#eef4ee; border:1px solid #cdd; border-radius:8px; padding:12px; margin:12px 0;">
      <label style="font-weight:bold;">📡 Import real sounding (Univ. Wyoming):</label><br/>
      <div style="margin-top:6px; display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
        <input id="stn" placeholder="Station" value="72357" style="width:110px; padding:6px; border:1px solid #bbb; border-radius:4px;"/>
        <input id="yr" placeholder="YYYY" value="2013" style="width:70px; padding:6px; border:1px solid #bbb; border-radius:4px;"/>
        <input id="mo" placeholder="MM" value="05" style="width:50px; padding:6px; border:1px solid #bbb; border-radius:4px;"/>
        <input id="dy" placeholder="DD" value="20" style="width:50px; padding:6px; border:1px solid #bbb; border-radius:4px;"/>
        <select id="hr" style="padding:6px; border:1px solid #bbb; border-radius:4px;"><option value="00">00Z</option><option value="12" selected>12Z</option></select>
        <button id="fetchBtn" style="padding:6px 14px; border:none; background:#2a8; color:#fff; border-radius:4px; cursor:pointer;">Fetch</button>
        <span id="fetchMsg" style="font-size:12px;"></span>
      </div>
      <div style="margin-top:8px;">
        <textarea id="pasteBox" placeholder="...or paste raw Wyoming table text here and click Parse" style="width:75%; height:38px; padding:6px; border:1px solid #bbb; border-radius:4px; font-family:monospace; font-size:11px; vertical-align:middle;"></textarea>
        <button id="parseBtn" style="padding:6px 14px; border:none; background:#68a; color:#fff; border-radius:4px; cursor:pointer;">Parse</button>
      </div>
      <p style="margin:6px 0 0 0; font-size:11px; color:#888;">Station examples: 72357 Norman OK · 72293 San Diego · 72249 Fort Worth · 72469 Denver. If Fetch is blocked, paste the text table from weather.uwyo.edu.</p>
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
    document.querySelector("#panel1")!.innerHTML = panelHTML(edited);
    document.querySelector("#panel2")!.innerHTML = panel2HTML(edited);
    const hodo = document.querySelector("#hodoSlot")!;
    hodo.innerHTML = ""; hodo.appendChild(renderHodographEl(edited));
    const slot = document.querySelector("#skewtSlot")!;
    slot.innerHTML = ""; slot.appendChild(renderSkewT(edited, onEdit));
  };

  document.querySelector("#skewtSlot")!.appendChild(renderSkewT(s, onEdit));
  document.querySelector("#hodoSlot")!.appendChild(renderHodographEl(s));

  // Picker
  document.querySelector<HTMLSelectElement>("#picker")!.addEventListener("change", (e) => {
    selectedIndex = parseInt((e.target as HTMLSelectElement).value, 10); render();
  });

  // Generate
  const input = document.querySelector<HTMLInputElement>("#descInput")!;
  const gen = () => { const d = input.value.trim(); if (!d) return; library.push(generateSounding(d)); selectedIndex = library.length - 1; render(); };
  document.querySelector<HTMLButtonElement>("#genBtn")!.addEventListener("click", gen);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") gen(); });

  // Historical fetch
  const msg = document.querySelector<HTMLSpanElement>("#fetchMsg")!;
  document.querySelector<HTMLButtonElement>("#fetchBtn")!.addEventListener("click", async () => {
    msg.style.color = "#666"; msg.textContent = "Fetching...";
    try {
      const stn = (document.querySelector("#stn") as HTMLInputElement).value.trim();
      const yr = (document.querySelector("#yr") as HTMLInputElement).value.trim();
      const mo = (document.querySelector("#mo") as HTMLInputElement).value.trim();
      const dy = (document.querySelector("#dy") as HTMLInputElement).value.trim();
      const hr = (document.querySelector("#hr") as HTMLSelectElement).value as "00" | "12";
      const snd = await fetchHistorical(stn, yr, mo, dy, hr);
      library.push(snd); selectedIndex = library.length - 1; render();
    } catch (err: any) { msg.style.color = "#a33"; msg.textContent = err.message || "Failed."; }
  });

  // Paste parse
  document.querySelector<HTMLButtonElement>("#parseBtn")!.addEventListener("click", () => {
    try {
      const txt = (document.querySelector("#pasteBox") as HTMLTextAreaElement).value;
      const snd = parsePasted(txt);
      library.push(snd); selectedIndex = library.length - 1; render();
    } catch (err: any) { msg.style.color = "#a33"; msg.textContent = err.message || "Parse failed."; }
  });
}

render();