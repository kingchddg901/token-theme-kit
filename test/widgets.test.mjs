import { test } from "node:test";
import assert from "node:assert/strict";
import { createWidgetRegistry } from "../src/widgets.js";

// Minimal DOM stub — enough to build widgets and fire their events without a browser.
function stubDoc() {
  return {
    createElement(tag) {
      return {
        tag,
        _h: {},
        children: [],
        addEventListener(type, fn) { this._h[type] = fn; },
        appendChild(c) { this.children.push(c); return c; },
        fire(type) { this._h[type]?.(); },
      };
    },
  };
}

test("registry ships the five primitives + text fallback", () => {
  const r = createWidgetRegistry();
  for (const t of ["color", "range", "number", "select", "checkbox", "text"]) assert.ok(r.has(t));
});

test("unknown input types fall back to a text widget", () => {
  const r = createWidgetRegistry();
  assert.equal(r.has("mystery"), false);
  assert.equal(r.get("mystery"), r.get("text")); // resolves to the fallback
});

test("built-in color widget reflects value and reports changes", () => {
  const document = stubDoc();
  const r = createWidgetRegistry();
  let got;
  const el = r.get("color")(
    { key: "accent", input: "color", value: "#3b82f6" },
    { onChange: (v) => (got = v), document }
  );
  assert.equal(el.type, "color");
  assert.equal(el.value, "#3b82f6");
  el.value = "#e11d48";
  el.fire("input");
  assert.equal(got, "#e11d48");
});

test("built-in select widget builds options and reports the chosen value", () => {
  const document = stubDoc();
  const r = createWidgetRegistry();
  let got;
  const el = r.get("select")(
    { key: "density", input: "select", value: "cozy",
      options: [{ value: "cozy", label: "Cozy" }, { value: "compact", label: "Compact" }] },
    { onChange: (v) => (got = v), document }
  );
  assert.equal(el.tag, "select");
  assert.equal(el.children.length, 2);
  assert.equal(el.children[0].value, "cozy");
  el.value = "compact";
  el.fire("change");
  assert.equal(got, "compact");
});

test("plugins for the plugins: a custom widget renders for its input type", () => {
  const document = stubDoc();
  const r = createWidgetRegistry();
  // A domain author snaps in a renderer for a control type the core never knew about.
  const off = r.register("texture-picker", (c, { onChange, document }) => {
    const node = document.createElement("div");
    node.dataset = { widget: "texture", value: c.value };
    node.pick = (v) => onChange(v);
    return node;
  });
  assert.ok(r.has("texture-picker"));

  let got;
  const el = r.get("texture-picker")(
    { key: "floor", input: "texture-picker", value: "oak" },
    { onChange: (v) => (got = v), document }
  );
  assert.equal(el.dataset.value, "oak"); // custom widget drew from the control
  el.pick("tile");
  assert.equal(got, "tile"); // and reports back through the same onChange contract

  off();
  assert.equal(r.has("texture-picker"), false); // unregister works
});
