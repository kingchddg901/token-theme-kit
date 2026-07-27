import { test } from "node:test";
import assert from "node:assert/strict";
import { createThemeKit } from "../src/kit.js";

/**
 * Stands in for the real dogfood. The eufy_vacuum card's ~406-token registry
 * lives in a separate private repo, so we can't import it here — instead we
 * reproduce its SHAPE: many groups, and the same nine-type vocabulary including
 * the string-valued types (text/shadow/typography/easing/motion/duration) that
 * used to silently fall back to the color widget. Locks two promises:
 *   1. large registry → computeVars is 1:1 (count, unique, namespaced)
 *   2. unknown/string types render via `raw` (text), NEVER the color swatch
 */

const SOURCE_TYPES = [
  "color", "number", "size", "alpha", "select", "toggle", // built-ins
  "text", "shadow", "typography", "duration", "easing", "motion", // NOT built-in → must fall back to raw
];

test("large mixed registry: computeVars is 1:1 — every token, unique, namespaced", () => {
  const kit = createThemeKit({ prefix: "--evcc-" });
  let n = 0;
  for (let g = 0; g < 12; g++) {
    const tokens = SOURCE_TYPES.map((type, i) => ({
      key: `g${g}-t${i}-${type}`,
      type,
      default: type === "color" ? "#123456" : 4,
    }));
    n += tokens.length;
    kit.registerTokenGroup({ id: `group-${g}`, tokens });
  }
  const names = Object.keys(kit.computeVars({}));
  assert.equal(names.length, n); // 1:1 count — no token dropped
  assert.equal(new Set(names).size, n); // all unique
  assert.ok(names.every((v) => v.startsWith("--evcc-"))); // all namespaced
});

test("unknown/string control types fall back to `raw` (text), NEVER the color widget", () => {
  const kit = createThemeKit({ prefix: "--evcc-" });
  kit.registerTokenGroup({
    id: "strings",
    tokens: [
      { key: "font-family", type: "typography", default: "Inter, sans-serif" },
      { key: "card-shadow", type: "shadow", default: "0 2px 8px rgba(0,0,0,.3)" },
      { key: "ease", type: "easing", default: "cubic-bezier(.4,0,.2,1)" },
      ...["text", "duration", "motion"].map((t) => ({ key: `k-${t}`, type: t, default: "v" })),
    ],
  });
  const controls = kit.editorModel({}).groups.flatMap((g) => g.controls);
  // The v4 bug: these used to resolve to input:"color", value:"#000000".
  for (const c of controls) {
    assert.notEqual(c.input, "color", `${c.key} (${c.type}) must NOT fall back to the color widget`);
    assert.equal(c.input, "text", `${c.key} should render via the raw/text widget`);
  }
  const font = controls.find((c) => c.key === "font-family");
  assert.equal(font.value, "Inter, sans-serif"); // a real string, not "#000000"
});
