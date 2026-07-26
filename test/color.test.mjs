import { test } from "node:test";
import assert from "node:assert/strict";
import { parseColor, formatColor, contrast } from "../src/color.js";

test("parseColor handles hex forms", () => {
  assert.deepEqual(parseColor("#fff"), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepEqual(parseColor("#101418"), { r: 16, g: 20, b: 24, a: 1 });
  assert.equal(parseColor("#ff000080").a, 128 / 255);
  assert.equal(parseColor("nope"), null);
});

test("parseColor handles rgb/rgba", () => {
  assert.deepEqual(parseColor("rgb(255, 0, 0)"), { r: 255, g: 0, b: 0, a: 1 });
  assert.equal(parseColor("rgba(0,0,0,0.5)").a, 0.5);
});

test("formatColor round-trips opaque as hex, translucent as rgba", () => {
  assert.equal(formatColor({ r: 16, g: 20, b: 24, a: 1 }), "#101418");
  assert.equal(formatColor({ r: 255, g: 0, b: 0, a: 0.5 }), "rgba(255, 0, 0, 0.5)");
});

test("contrast: black on white is the max ~21", () => {
  const ratio = contrast(parseColor("#000"), parseColor("#fff"));
  assert.ok(ratio > 20.9 && ratio <= 21);
});
