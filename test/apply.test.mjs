import { test } from "node:test";
import assert from "node:assert/strict";
import { createThemeKit } from "../src/kit.js";

test("computeVars resolves override > default > type-default, and names vars", () => {
  const kit = createThemeKit();
  kit.registerTokenGroup({
    id: "s",
    tokens: [
      { key: "surface-bg", type: "color", default: "#101418" },
      { key: "radius", type: "size", default: 12 },              // size → px
      { key: "z", type: "number", default: 5 },                  // raw number, no unit
      { key: "dur", type: "number", unit: "ms", default: 200 },  // unit from the token
      { key: "opacity", type: "alpha" }, // no default → falls back to type default (1)
    ],
  });

  const vars = kit.computeVars({ "surface-bg": "#e11d48" });
  assert.equal(vars["--surface-bg"], "#e11d48"); // override wins
  assert.equal(vars["--radius"], "12px"); // size appends px
  assert.equal(vars["--z"], "5"); // number is bare — no px
  assert.equal(vars["--dur"], "200ms"); // unit declared on the token
  assert.equal(vars["--opacity"], "1"); // type default
});

test("prefix and per-token cssVar overrides", () => {
  const kit = createThemeKit({ prefix: "--evcc-" });
  kit.registerTokenGroup({
    id: "s",
    tokens: [
      { key: "accent", default: "#3b82f6" },
      { key: "special", default: "#fff", cssVar: "--brand-special" },
    ],
  });
  const vars = kit.computeVars();
  assert.equal(vars["--evcc-accent"], "#3b82f6"); // prefixed
  assert.equal(vars["--brand-special"], "#fff"); // explicit cssVar bypasses prefix
});

test("preview: apply is transient, commit persists, revert drops back", () => {
  const el = fakeEl();
  const kit = createThemeKit();
  kit.registerTokenGroup({ id: "s", tokens: [{ key: "accent", default: "#000" }] });
  const preview = kit.preview(el, {});

  assert.equal(el.style._props["--accent"], "#000"); // baseline painted
  preview.apply({ accent: "#f00" });
  assert.equal(el.style._props["--accent"], "#f00");
  preview.revert();
  assert.equal(el.style._props["--accent"], "#000"); // back to baseline
  preview.commit({ accent: "#0f0" });
  preview.revert();
  assert.equal(el.style._props["--accent"], "#0f0"); // commit moved the baseline
});

function fakeEl() {
  const props = {};
  return {
    style: {
      _props: props,
      setProperty: (k, v) => (props[k] = v),
      removeProperty: (k) => delete props[k],
    },
  };
}
