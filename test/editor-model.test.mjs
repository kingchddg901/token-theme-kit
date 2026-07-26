import { test } from "node:test";
import assert from "node:assert/strict";
import { createThemeKit } from "../src/kit.js";
import { cvdValidator } from "../src/plugins/cvd.js";

test("editorModel walks the registry into grouped controls with resolved values", () => {
  const kit = createThemeKit();
  kit.registerTokenGroup({
    id: "brand",
    label: "Brand",
    tokens: [
      { key: "accent", type: "color", default: "#3b82f6" },
      { key: "radius", type: "number", default: 12 },
    ],
  });

  const model = kit.editorModel({ accent: "#e11d48" });
  assert.equal(model.groups.length, 1);
  const [accent, radius] = model.groups[0].controls;
  assert.equal(accent.value, "#e11d48"); // override resolved
  assert.equal(accent.input, "color"); // widget hint from control type
  assert.equal(radius.value, 12);
  assert.equal(radius.input, "number");
});

test("stud #2: a custom control type renders in the self-building editor", () => {
  const kit = createThemeKit();
  // A domain brick the core knows nothing about — a floor-texture picker.
  kit.registerControlType("floor-texture", {
    input: "texture-picker",
    toCss: (v) => `url(/textures/${v}.png)`,
    defaultValue: "oak",
  });
  kit.registerTokenGroup({
    id: "floor",
    tokens: [{ key: "floor", type: "floor-texture", options: ["oak", "tile"] }],
  });

  const model = kit.editorModel();
  const ctrl = model.groups[0].controls[0];
  assert.equal(ctrl.input, "texture-picker"); // editor built itself around the custom type
  assert.deepEqual(ctrl.options, ["oak", "tile"]);
  assert.equal(ctrl.value, "oak"); // custom type's default
  // and it still computes to CSS via the plugin's toCss
  assert.equal(kit.computeVars()["--floor"], "url(/textures/oak.png)");
});

test("stud #3: CVD validator attaches verdicts to the offending control", () => {
  const kit = createThemeKit();
  kit.registerTokenGroup({
    id: "text",
    tokens: [
      { key: "text", type: "color", default: "#777777" },
      { key: "bg", type: "color", default: "#808080" },
    ],
  });
  kit.registerValidator(cvdValidator({ pairs: [{ fg: "text", bg: "bg", label: "body text" }] }));

  const model = kit.editorModel(); // grey-on-grey → fails
  const textCtrl = model.groups[0].controls.find((c) => c.key === "text");
  assert.ok(textCtrl.verdicts.length >= 1);
  assert.match(textCtrl.verdicts[0].message, /contrast/);

  // fix it → verdict clears
  const ok = kit.editorModel({ text: "#000000", bg: "#ffffff" });
  const okCtrl = ok.groups[0].controls.find((c) => c.key === "text");
  assert.equal(okCtrl.verdicts.length, 0);
});

test("no validators registered → zero verdicts, zero cost (the 99% path)", () => {
  const kit = createThemeKit();
  kit.registerTokenGroup({ id: "b", tokens: [{ key: "accent", default: "#000" }] });
  assert.deepEqual(kit.editorModel().verdicts, []);
});
