/**
 * <theme-kit-editor> — the reference view (Wave 2).
 *
 * A self-building editor web component: point it at a kit, and it renders one
 * control per token, wired to live preview and persistence. Its LAYOUT (stacked
 * groups) is its own opinion — swap it by writing your own view against
 * `kit.editorModel()`; the model has no layout opinion. Custom control types are
 * drawn via the widget registry (the "plugin for the plugins", `registerWidget`).
 *
 * Usage:
 *   import { defineThemeKitEditor } from "theme-kit/element";
 *   defineThemeKitEditor();                       // registers <theme-kit-editor>
 *   const ed = document.createElement("theme-kit-editor");
 *   ed.previewTarget = someCardElement;           // where var(--token) is applied
 *   ed.registerWidget("texture-picker", (c, {onChange, document}) => {...}); // meta-plugin
 *   ed.kit = kit;                                 // triggers load + render
 *
 * Focus-safe: a value change repaints preview + verdicts only, never the inputs,
 * so dragging a control never loses focus. A full rebuild happens only when the
 * token registry itself changes (a group added/removed).
 */
import { createWidgetRegistry } from "./widgets.js";

const STYLE = `
  :host { display: block; color: var(--tk-fg, inherit); font: inherit; }
  fieldset { border: 1px solid var(--tk-line, #2a3550); border-radius: 10px;
             margin: 0 0 12px; padding: 8px 12px 12px; }
  legend { padding: 0 6px; color: var(--tk-dim, #8b98a5); font-size: 12px;
           letter-spacing: .04em; text-transform: uppercase; }
  .row { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; margin: 8px 0; }
  .verdict { font-size: 12.5px; margin: 1px 0 6px; }
  .verdict.warn { color: var(--tk-warn, #e3b341); }
  .verdict.error { color: var(--tk-error, #ff7b72); }
  input[type=color] { width: 44px; height: 26px; padding: 0; border: 1px solid var(--tk-line, #2a3550);
                      border-radius: 6px; background: none; cursor: pointer; }
`;

export class ThemeKitEditor extends HTMLElement {
  constructor() {
    super();
    this._widgets = createWidgetRegistry();
    this._values = {};
    this._kit = null;
    this._preview = null;
    this._previewTarget = null;
    this._unsub = null;
    this._verdictNodes = new Map();
    this._inited = false;
    this.attachShadow({ mode: "open" });
  }

  set kit(k) { this._kit = k; this._init(); }
  get kit() { return this._kit; }

  set previewTarget(el) { this._previewTarget = el; this._init(); }
  get previewTarget() { return this._previewTarget; }

  get values() { return { ...this._values }; }
  set values(v) { this._values = { ...(v || {}) }; this._preview?.apply(this._values); this._patchVerdicts(); }

  /** The meta-plugin: register a renderer for a custom control's input type. */
  registerWidget(input, renderer) { return this._widgets.register(input, renderer); }

  connectedCallback() { this._init(); }

  disconnectedCallback() {
    this._unsub?.();
    this._unsub = null;
    this._preview?.flush?.();
    this._inited = false;
  }

  async _init() {
    if (this._inited || !this._kit || !this.isConnected) return;
    this._inited = true;
    const stored = await this._kit.load();
    this._values = { ...stored };
    if (this._previewTarget) this._preview = this._kit.preview(this._previewTarget, this._values);
    // Rebuild fully when the token registry structure changes (a group added/removed).
    this._unsub = this._kit.subscribe(() => this._renderFull());
    this._renderFull();
  }

  _onChange(key, value) {
    this._values = { ...this._values, [key]: value };
    this._preview?.apply(this._values);          // live repaint — no CSS touched
    this._kit.save(this._values);                // persist via the adapter
    this._patchVerdicts();                       // refresh verdicts only (focus-safe)
    this.dispatchEvent(new CustomEvent("change", { detail: { key, values: this.values } }));
  }

  _renderFull() {
    const root = this.shadowRoot;
    root.textContent = "";
    this._verdictNodes.clear();
    const style = document.createElement("style");
    style.textContent = STYLE;
    root.appendChild(style);

    const model = this._kit.editorModel(this._values);
    const ctx = { onChange: null, document };
    for (const group of model.groups) {
      const fs = document.createElement("fieldset");
      fs.setAttribute("part", "group");
      const lg = document.createElement("legend");
      lg.setAttribute("part", "group-label");
      lg.textContent = group.label;
      fs.appendChild(lg);
      for (const c of group.controls) {
        const wrap = document.createElement("div");
        const row = document.createElement("label");
        row.className = "row";
        row.setAttribute("part", "row");
        const name = document.createElement("span");
        name.setAttribute("part", "label");
        name.textContent = c.label;
        const widget = this._widgets.get(c.input)(c, {
          onChange: (v) => this._onChange(c.key, v),
          document,
        });
        row.append(name, widget);
        wrap.appendChild(row);
        const verdicts = document.createElement("div");
        this._verdictNodes.set(c.key, verdicts);
        this._fillVerdicts(verdicts, c.verdicts);
        wrap.appendChild(verdicts);
        fs.appendChild(wrap);
      }
      root.appendChild(fs);
    }
  }

  _patchVerdicts() {
    if (!this._kit) return;
    const model = this._kit.editorModel(this._values);
    for (const group of model.groups) {
      for (const c of group.controls) {
        const node = this._verdictNodes.get(c.key);
        if (node) this._fillVerdicts(node, c.verdicts);
      }
    }
  }

  _fillVerdicts(container, verdicts) {
    container.textContent = "";
    for (const v of verdicts || []) {
      const d = document.createElement("div");
      d.className = `verdict ${v.level === "error" ? "error" : "warn"}`;
      d.setAttribute("part", "verdict");
      d.textContent = v.message;
      container.appendChild(d);
    }
  }
}

/** Define the custom element (idempotent). Returns the tag name. */
export function defineThemeKitEditor(tag = "theme-kit-editor") {
  if (typeof customElements !== "undefined" && !customElements.get(tag)) {
    customElements.define(tag, ThemeKitEditor);
  }
  return tag;
}
