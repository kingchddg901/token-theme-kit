import { test } from "node:test";
import assert from "node:assert/strict";
import { createRegistry, humanize } from "../src/registry.js";

test("register assembles a flat token map + grouped view", () => {
  const r = createRegistry();
  r.register({ id: "surfaces", tokens: [{ key: "surface-bg", default: "#101418" }] });
  r.register({ id: "brand", label: "Brand", tokens: [{ key: "accent", type: "color", default: "#3b82f6" }] });

  assert.equal(r.groups.length, 2);
  assert.equal(r.tokens.size, 2);
  assert.equal(r.tokens.get("accent").default, "#3b82f6");
  // group + auto-label are stamped onto each token
  assert.equal(r.tokens.get("surface-bg").group, "surfaces");
  assert.equal(r.tokens.get("surface-bg").label, "Surface Bg");
});

test("unregister removes a group and fires subscribers", () => {
  const r = createRegistry();
  let ticks = 0;
  r.subscribe(() => ticks++);
  const off = r.register({ id: "g", tokens: [{ key: "a", default: "#000" }] });
  assert.equal(r.tokens.size, 1);
  off();
  assert.equal(r.tokens.size, 0);
  assert.equal(ticks, 2); // one register, one unregister
});

test("a token without a key throws (fail loud at author time)", () => {
  const r = createRegistry();
  assert.throws(() => r.register({ id: "bad", tokens: [{ default: "#000" }] }), /missing a key/);
});

test("humanize", () => {
  assert.equal(humanize("surface-bg"), "Surface Bg");
  assert.equal(humanize("room_card_radius"), "Room Card Radius");
});
