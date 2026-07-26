/**
 * Demo: the whole thesis on one screen.
 *  - declare a few token groups (minimum: colors, alpha, number, select)
 *  - register the CVD validator (a taste of the "limit" — stud #3)
 *  - a generic view builds the editor FROM the model (no per-token UI code)
 *  - a preview surface styled ONLY with var(--token) repaints live as you edit
 *
 * This generic view is the embryo of the Wave-2 `theme-kit/element`. Note it
 * contains ZERO knowledge of specific tokens — it renders whatever the model says.
 */
import { createThemeKit } from "../src/index.js";
import { cvdValidator } from "../src/plugins/cvd.js";
import { localStorageAdapter } from "../src/adapters/local-storage.js";

const kit = createThemeKit({ prefix: "--" });
kit.setAdapter(localStorageAdapter("theme-kit-demo"));

// ---- declare tokens (this is all a basic consumer writes) ------------------
kit.registerTokenGroup({
  id: "surface", label: "Surface",
  tokens: [
    { key: "bg", type: "color", default: "#111820" },
    { key: "card", type: "color", default: "#1b2530" },
    { key: "text", type: "color", default: "#e6edf3" },
    { key: "radius", type: "number", default: 14 },
  ],
});
kit.registerTokenGroup({
  id: "brand", label: "Brand",
  tokens: [
    { key: "accent", type: "color", default: "#3b82f6" },
    { key: "accent-text", type: "color", default: "#ffffff" },
    { key: "accent-alpha", type: "alpha", default: 1, label: "Accent opacity" },
    { key: "density", type: "select", default: "cozy",
      options: [{ value: "cozy", label: "Cozy" }, { value: "compact", label: "Compact" }] },
  ],
});

// ---- a taste of the limit: CVD verdicts on the text/accent pairs -----------
kit.registerValidator(cvdValidator({ pairs: [
  { fg: "text", bg: "card", label: "body text", min: 4.5 },
  { fg: "accent-text", bg: "accent", label: "button label", min: 4.5 },
]}));

// ---- wire it up ------------------------------------------------------------
const previewEl = document.getElementById("preview");
const editorEl = document.getElementById("editor");
const preview = kit.preview(previewEl, await kit.load());
let values = { ...preview.values };

previewEl.innerHTML = sampleCard();
renderEditor();

function onChange(key, value) {
  values = { ...values, [key]: value };
  preview.apply(values);        // live repaint, no CSS touched
  kit.save(values);             // persist via the adapter
  renderEditor();               // refresh verdicts
}

function renderEditor() {
  const model = kit.editorModel(values);
  editorEl.innerHTML = "";
  const h = document.createElement("h2");
  h.textContent = "Theme"; h.style.margin = "0 0 12px"; h.style.fontSize = "16px";
  editorEl.appendChild(h);
  for (const group of model.groups) {
    const fs = document.createElement("fieldset");
    fs.style.cssText = "border:1px solid #263040;border-radius:10px;margin:0 0 12px;padding:10px 12px";
    fs.innerHTML = `<legend style="padding:0 6px;color:#8b98a5">${group.label}</legend>`;
    for (const c of group.controls) fs.appendChild(controlRow(c));
    editorEl.appendChild(fs);
  }
}

function controlRow(c) {
  const row = document.createElement("label");
  row.style.cssText = "display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;margin:6px 0";
  const name = document.createElement("span");
  name.textContent = c.label;
  const input = buildInput(c);
  row.append(name, input);
  const wrap = document.createElement("div");
  wrap.appendChild(row);
  for (const v of c.verdicts) {
    const note = document.createElement("div");
    note.textContent = v.message;
    note.style.cssText = `font-size:12px;margin:2px 0 6px;color:${v.level === "error" ? "#ff7b72" : "#e3b341"}`;
    wrap.appendChild(note);
  }
  return wrap;
}

function buildInput(c) {
  let el;
  if (c.input === "color") {
    el = tag("input", { type: "color", value: c.value });
    el.oninput = () => onChange(c.key, el.value);
  } else if (c.input === "range") {
    el = tag("input", { type: "range", min: c.min ?? 0, max: c.max ?? 1, step: c.step ?? 0.01, value: c.value });
    el.oninput = () => onChange(c.key, Number(el.value));
  } else if (c.input === "number") {
    el = tag("input", { type: "number", value: c.value });
    el.style.width = "70px";
    el.oninput = () => onChange(c.key, Number(el.value));
  } else if (c.input === "select") {
    el = document.createElement("select");
    for (const o of c.options || []) el.appendChild(tag("option", { value: o.value ?? o, textContent: o.label ?? o }));
    el.value = c.value;
    el.onchange = () => onChange(c.key, el.value);
  } else {
    el = tag("input", { type: "text", value: c.value });
    el.oninput = () => onChange(c.key, el.value);
  }
  return el;
}

function tag(name, props) { return Object.assign(document.createElement(name), props); }

// The preview surface — authored ONCE against var(--token). Never edited to re-theme.
function sampleCard() {
  return `<div style="
      background: var(--bg); color: var(--text); border-radius: var(--radius);
      padding: 20px; max-width: 420px; border: 1px solid #ffffff14;">
    <div style="background: var(--card); border-radius: var(--radius); padding: 16px;">
      <h3 style="margin:0 0 8px">Living Room</h3>
      <p style="margin:0 0 16px; opacity:.85">Vacuuming · 42% · 18 min left</p>
      <button style="
          background: var(--accent); opacity: var(--accent-alpha); color: var(--accent-text);
          border: 0; border-radius: 8px; padding: 8px 16px; font: inherit; cursor: pointer;">
        Start clean
      </button>
    </div>
  </div>`;
}
