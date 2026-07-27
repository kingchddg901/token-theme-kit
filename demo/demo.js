/**
 * Wave 2 demo: the real <theme-kit-editor> element, self-building, plus a CUSTOM
 * widget the core knows nothing about.
 *
 *  - declare token groups (colors, alpha, number) — the minimum
 *  - add a custom "swatch" control type (core logic, stud #2) + a matching
 *    view-side widget (stud-for-the-view, element.registerWidget) — the limit
 *  - the element builds the whole editor from the registry; the preview surface
 *    is styled only with var(--token) and repaints live
 */
import { createThemeKit } from "../src/index.js";
import { cvdValidator } from "../src/plugins/cvd.js";
import { localStorageAdapter } from "../src/adapters/local-storage.js";
import { defineThemeKitEditor } from "../src/element.js";

defineThemeKitEditor();

const kit = createThemeKit({ prefix: "--" });
kit.setAdapter(localStorageAdapter("theme-kit-demo"));

// A custom control type — the core learns its LOGIC (how it becomes CSS), nothing more.
kit.registerControlType("swatch", { input: "swatch", toCss: (v) => String(v), defaultValue: "#3b82f6" });

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
    { key: "accent", type: "swatch", label: "Accent (custom swatch)", default: "#3b82f6",
      options: ["#3b82f6", "#e11d48", "#16a34a", "#f59e0b", "#a855f7"] },
    { key: "accent-text", type: "color", default: "#ffffff" },
    { key: "accent-alpha", type: "alpha", default: 1, label: "Accent opacity" },
  ],
});
kit.registerValidator(cvdValidator({ pairs: [
  { fg: "text", bg: "card", label: "body text" },
  { fg: "accent-text", bg: "accent", label: "button label" },
]}));

const previewEl = document.getElementById("preview");
previewEl.innerHTML = sampleCard();

const editor = document.createElement("theme-kit-editor");
editor.previewTarget = previewEl;
// The meta-plugin: teach the VIEW how to DRAW the custom "swatch" input.
editor.registerWidget("swatch", (c, { onChange, document }) => {
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;gap:6px";
  const buttons = [];
  // A custom widget owns its own display state (the selection ring) — the editor
  // only re-renders verdicts on change, never rebuilds inputs (focus-safe).
  const paint = (sel) =>
    buttons.forEach((b) => (b.style.borderColor = b.dataset.color === sel ? "#fff" : "transparent"));
  for (const color of c.options || []) {
    const b = document.createElement("button");
    b.type = "button";
    b.title = color;
    b.dataset.color = color;
    b.style.cssText =
      `width:22px;height:22px;border-radius:6px;cursor:pointer;background:${color};border:2px solid transparent`;
    b.addEventListener("click", () => { paint(color); onChange(color); });
    buttons.push(b);
    wrap.appendChild(b);
  }
  paint(c.value);
  return wrap;
});
editor.kit = kit; // triggers load + self-build
document.getElementById("editor").appendChild(editor);

// Authored ONCE against var(--token). Never edited to re-theme.
function sampleCard() {
  return `<div style="background:var(--bg);color:var(--text);border-radius:var(--radius);padding:20px;border:1px solid #ffffff14">
    <div style="background:var(--card);border-radius:var(--radius);padding:16px">
      <h3 style="margin:0 0 8px">Living Room</h3>
      <p style="margin:0 0 16px;opacity:.85">Vacuuming · 42% · 18 min left</p>
      <button style="background:var(--accent);opacity:var(--accent-alpha);color:var(--accent-text);border:0;border-radius:8px;padding:9px 16px;font:inherit;cursor:pointer">Start clean</button>
    </div>
  </div>`;
}
