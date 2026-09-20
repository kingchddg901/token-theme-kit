/**
 * The editor element, against a DOM stub — enough to render it and drive a
 * change without a browser, in the same spirit as widgets.test.mjs.
 *
 * The element had no tests at all, which is exactly why the `is-set` marker
 * could go stale: the focus-safe patch path refreshed verdicts and nothing
 * else, so a token you had just edited kept an unmarked reset until something
 * forced a full rebuild.
 *
 *   node --test test/element.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { createThemeKit } from "../src/kit.js";

/* ------------------------------------------------------------- DOM stub */

function node(tag) {
  return {
    tag,
    parts: {},
    children: [],
    _h: {},
    textContent: "",
    title: "",
    type: "",
    value: "",
    style: { setProperty() {}, removeProperty() {} },
    setAttribute(k, v) { this.parts[k] = String(v); },
    getAttribute(k) { return this.parts[k] ?? null; },
    removeAttribute(k) { delete this.parts[k]; },
    addEventListener(t, fn) { this._h[t] = fn; },
    removeEventListener(t) { delete this._h[t]; },
    appendChild(c) { this.children.push(c); return c; },
    append(...cs) { this.children.push(...cs); },
    remove() {},
    fire(t, e = {}) { this._h[t]?.({ preventDefault() {}, stopPropagation() {}, target: this, ...e }); },
    /** Every descendant, so a test can find a control by its part. */
    all(out = []) { for (const c of this.children) { out.push(c); c.all?.(out); } return out; },
  };
}

function withDom(fn) {
  const saved = { document: globalThis.document, HTMLElement: globalThis.HTMLElement,
    CustomEvent: globalThis.CustomEvent, customElements: globalThis.customElements };
  globalThis.document = { createElement: (t) => node(t) };
  // attachShadow is called from the constructor, so it lives on the base class.
  globalThis.HTMLElement = class {
    constructor() { this.isConnected = true; }
    attachShadow() { this.shadowRoot = node("shadow-root"); return this.shadowRoot; }
    dispatchEvent() { return true; }
    addEventListener() {}
    removeEventListener() {}
  };
  globalThis.CustomEvent = class { constructor(type, init) { this.type = type; Object.assign(this, init); } };
  globalThis.customElements = { get: () => undefined, define: () => {} };
  return Promise.resolve(fn()).finally(() => Object.assign(globalThis, saved));
}

/** The element imports HTMLElement at class-definition time, so import it inside the stub. */
async function editorClass() {
  const { ThemeKitEditor } = await import("../src/element.js");
  return ThemeKitEditor;
}

function makeEditor(Editor, kit) {
  const el = new Editor();
  el.kit = kit;                 // the setter starts _init(), which renders
  return el;
}

const kitWith = () => {
  const kit = createThemeKit({ adapter: { load: async () => ({}), save: async () => {} } });
  kit.registerTokenGroup({
    id: "colour", label: "Colour",
    tokens: [{ key: "accent", label: "Accent", type: "color", default: "#3b82f6" },
      { key: "ink", label: "Ink", type: "color", default: "#111111" }],
  });
  return kit;
};

const resetOf = (el, key) => el.shadowRoot.all().find((n) => n.tag === "button"
  && (n.parts.part || "").includes("reset-token") && (n.title || "").includes(key));

/* ------------------------------------------------------------------ tests */

// RED IF: the marker only updates on a full render. Editing a token has to mark
// its reset AT ONCE - the whole point of the focus-safe path is that there is
// no rebuild to piggyback on, so a stale marker told the user "not set" about a
// value they had just typed.
test("editing a token marks its reset button without a rebuild", async () => {
  await withDom(async () => {
    const Editor = await editorClass();
    const el = makeEditor(Editor, kitWith());
    await new Promise((r) => setTimeout(r, 0));          // _init is async (adapter load)

    const accent = resetOf(el, "Accent");
    assert.ok(accent, "the accent control has a reset button");
    assert.equal(accent.parts.part, "reset reset-token", "nothing is set to begin with");

    el._onChange("accent", "#ff0000");
    assert.equal(accent.parts.part, "reset reset-token is-set", "the edited token is marked at once");
    assert.equal(resetOf(el, "Ink").parts.part, "reset reset-token", "and its neighbour is not");
  });
});

// RED IF: values set from outside (a theme picked by the host) leave the
// markers describing the values before it.
test("values set from outside re-mark every reset button", async () => {
  await withDom(async () => {
    const Editor = await editorClass();
    const el = makeEditor(Editor, kitWith());
    await new Promise((r) => setTimeout(r, 0));

    el.values = { accent: "#00ff00", ink: "#222222" };
    assert.equal(resetOf(el, "Accent").parts.part, "reset reset-token is-set");
    assert.equal(resetOf(el, "Ink").parts.part, "reset reset-token is-set");

    el.values = {};
    assert.equal(resetOf(el, "Accent").parts.part, "reset reset-token", "and clearing unmarks them");
  });
});
