import { test } from "node:test";
import assert from "node:assert/strict";
import { resetValues, groupKeys, isOverridden } from "../src/reset.js";
import { STYLE } from "../src/editor-style.js";
import { createThemeKit } from "../src/kit.js";

/**
 * Three tiers of reset, and the one control that must survive the theme it edits.
 *
 * Each test below names the change that turns it red. A guard whose failing input
 * cannot be stated is a preference, not a test.
 */

/* ---------------------------------------------------------------------------
   1. A reset DELETES the override. It does not write the default back.
   --------------------------------------------------------------------------- */

test("reset removes the key rather than storing a copy of the default", () => {
  const { values } = resetValues({ accent: "#ff0000", bg: "#000" }, ["accent"]);
  assert.equal("accent" in values, false); // RED IF: reset assigns decl.default
  assert.deepEqual(values, { bg: "#000" });
});

test("a reset token re-derives from the CURRENT default, not the one at reset time", () => {
  // The behavioural consequence of delete-vs-write, and the reason it matters.
  const kit = createThemeKit({ prefix: "--" });
  kit.registerTokenGroup({ id: "core", tokens: [{ key: "accent", type: "color", default: "#111111" }] });

  const { values } = resetValues({ accent: "#ff0000" }, ["accent"]);
  assert.equal(kit.computeVars(values)["--accent"], "#111111");

  // Ship a new kit version that re-declares the token with a different default.
  const kit2 = createThemeKit({ prefix: "--" });
  kit2.registerTokenGroup({ id: "core", tokens: [{ key: "accent", type: "color", default: "#222222" }] });
  assert.equal(kit2.computeVars(values)["--accent"], "#222222");
  // RED IF: reset wrote #111111 into values — the token would be pinned to the
  // old default forever, indistinguishable from a deliberate override.
});

test("reset does not mutate the input", () => {
  const before = { accent: "#ff0000" };
  resetValues(before, ["accent"]);
  assert.deepEqual(before, { accent: "#ff0000" }); // RED IF: delete runs on the original
});

/* ---------------------------------------------------------------------------
   2. The no-op guard — clearing nothing must not report a change.
   --------------------------------------------------------------------------- */

test("clearing an untouched key reports changed: 0", () => {
  const { changed } = resetValues({ bg: "#000" }, ["accent"]);
  assert.equal(changed, 0); // RED IF: the guard counts requested keys, not present ones
});

test("changed counts only keys that were actually present", () => {
  const { changed, values } = resetValues({ a: 1, b: 2 }, ["a", "b", "c"]);
  assert.equal(changed, 2);
  assert.deepEqual(values, {});
});

test("null clears everything and reports the true count", () => {
  const { values, changed } = resetValues({ a: 1, b: 2, c: 3 }, null);
  assert.deepEqual(values, {});
  assert.equal(changed, 3);
});

test("resetting an empty set of values is a no-op, not a crash", () => {
  assert.deepEqual(resetValues(undefined, null), { values: {}, changed: 0 });
  assert.deepEqual(resetValues(null, ["a"]), { values: {}, changed: 0 });
});

/* ---------------------------------------------------------------------------
   3. Group scoping — a group reset touches its own group and nothing else.
   --------------------------------------------------------------------------- */

test("groupKeys returns one group's keys and never a neighbour's", () => {
  const model = {
    groups: [
      { id: "core", controls: [{ key: "accent" }, { key: "bg" }] },
      { id: "chips", controls: [{ key: "chip-bg" }] },
    ],
  };
  assert.deepEqual(groupKeys(model, "core"), ["accent", "bg"]);
  assert.deepEqual(groupKeys(model, "chips"), ["chip-bg"]); // RED IF: group filter leaks
  assert.deepEqual(groupKeys(model, "nope"), []);
});

test("a group reset leaves other groups' overrides intact", () => {
  const model = {
    groups: [
      { id: "core", controls: [{ key: "accent" }, { key: "bg" }] },
      { id: "chips", controls: [{ key: "chip-bg" }] },
    ],
  };
  const { values } = resetValues(
    { accent: "#f00", bg: "#000", "chip-bg": "#0f0" },
    groupKeys(model, "core")
  );
  assert.deepEqual(values, { "chip-bg": "#0f0" });
});

test("isOverridden distinguishes absent from explicitly-undefined", () => {
  assert.equal(isOverridden({ a: 1 }, "a"), true);
  assert.equal(isOverridden({}, "a"), false);
  assert.equal(isOverridden({ a: undefined }, "a"), true); // present-but-undefined is still a key
});

/* ---------------------------------------------------------------------------
   4. THE ESCAPE HATCH — reset-all may not be themeable by what it resets.
   --------------------------------------------------------------------------- */

/**
 * The reset-all region with CSS COMMENTS STRIPPED.
 *
 * Stripping is not tidiness. On its first run this test went red reporting two
 * `var(` inside the region -- both of them in the comment that explains why
 * var() is banned there. The guard was reading prose, so it would have failed
 * for a correct stylesheet and passed for a tokenised one the moment somebody
 * reworded the comment. A guard that fires on its own documentation is measuring
 * the wrong text.
 */
/**
 * Every rule that styles a reset control, with CSS COMMENTS STRIPPED.
 *
 * Stripping first, then matching by SELECTOR. Extracting by the BEGIN/END
 * markers does not work: the match starts inside the opening comment, so there
 * is no `/*` left for a stripper to anchor to and the prose survives into the
 * assertion -- which is how this guard went red on its first run, over the two
 * `var(` in the sentence explaining that var() is banned here.
 *
 * Matching by selector also means a reset tier added later is covered the day
 * it is written, with no test edit. A marker-scoped guard would not be.
 */
const resetRules = () => {
  const css = STYLE.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = css.match(/\[part~="reset[^"]*"\][^{]*\{[^}]*\}/g) || [];
  assert.ok(rules.length >= 4, `expected every reset tier to be styled, found ${rules.length}`);
  return rules;
};

test("no reset control reads a custom property — none of them can be themed away", () => {
  for (const rule of resetRules()) {
    const vars = rule.match(/var\(/g) || [];
    assert.deepEqual(
      vars,
      [],
      "a reset must not read a custom property: a token the editor edits could be set to " +
        `match its background and hide the control that undoes it —\n${rule}`
    );
  }
  // RED IF: anyone rewrites `background: #000000` as `var(--tk-reset-bg, #000)`,
  // in ANY tier — per-token, per-group or total.
});

test("the shared reset rule pins the literals that make every tier legible", () => {
  const base = resetRules().find((r) => /^\[part~="reset"\]\s*\{/.test(r));
  assert.ok(base, 'the shared [part~="reset"] rule is missing');
  for (const literal of ["background: #000000", "color: #ffffff", "border: 1px solid #ffffff"]) {
    assert.ok(base.includes(literal), `the shared reset rule lost: ${literal}`);
  }
  // The outline is not decoration: #000 on a dark surround stays readable but
  // loses its edge, so it reads as floating text rather than a button.
});

test("every tier pins its own font-size", () => {
  // `font: inherit` on :host means a themed font could shrink a reset's label
  // away as effectively as a colour could hide it.
  for (const tier of ["reset-token", "reset-group", "reset-all"]) {
    const rule = resetRules().find((r) => r.startsWith(`[part~="${tier}"]`));
    assert.ok(rule, `no rule for ${tier}`);
    assert.match(rule, /font-size:\s*\d/, `${tier} does not pin a font-size`);
  }
});

test("hover stays literal — inverting is still two fixed colours", () => {
  const hover = resetRules().find((r) => r.includes(":hover"));
  assert.ok(hover, "the reset hover rule is missing");
  assert.ok(hover.includes("#ffffff") && hover.includes("#000000"));
  assert.equal((hover.match(/var\(/g) || []).length, 0);
  // RED IF: hover is restyled as `color: var(--tk-fg)` — a hover state that
  // vanishes is a control you cannot confirm you are about to press.
});

test("every OTHER control is themed — the invariant is scoped, not blanket", () => {
  // If this fails, the fix was "make it all literal", which throws away live
  // preview. The point is one un-themeable escape hatch, not a frozen editor.
  const marked = /BEGIN RESET CONTROLS[\s\S]*?END RESET CONTROLS/;
  assert.match(STYLE, marked, "the reset-controls markers moved — this guard stops guarding");
  const outside = STYLE.replace(marked, "");
  assert.ok(outside.includes("var(--tk-line"));
  assert.ok(outside.includes("var(--tk-dim"));
});
