# token-theme-kit

**Declare a design token in a group file → an editor builds its own UI for it → your users re-theme through that UI, never touching CSS.**

A framework-agnostic theming kit. Extracted from a Home Assistant Lovelace card, so it's HA-friendly — but the core knows nothing about HA, or about your tokens. It's pure machinery with **zero domain knowledge**; everything powerful is an opt-in plugin.

**The whole adoption path is one line:** pick a `prefix` (your namespace), register your token groups, author your CSS against `var(--yourprefix-*)`. Bring your own tokens — the kit is the engine, not a theme.

📚 **Docs:** [Concepts](docs/concepts.md) · [API reference](docs/api.md)

## The board and the four studs

The core (the "normal bricks" every user gets): a token **registry**, **color math**, **`applyTheme`** (tokens → CSS custom properties), a scoped **preview** engine, and a self-building **editor model**. Plus seven primitive control types (`color, alpha, number, size, select, toggle, raw`) — `number` is a bare value, `size` adds px, any token can declare a `unit` (px/rem/ms/…), and **`raw` passes a string straight through** for the `font-family` / `box-shadow` / easing-curve tokens every real system has.

Everything domain-specific snaps onto a stud — and you pay for nothing you don't use:

| Stud | Method | You plug in… |
|------|--------|--------------|
| #1 tokens | `registerTokenGroup(group)` | your token groups |
| #2 controls | `registerControlType(name, spec)` | a token type's logic (parse / toCss) |
| #3 verdicts | `registerValidator(fn)` | checks like CVD / colorblind safety (`token-theme-kit/cvd`) |
| #4 storage | `setAdapter(adapter)` | persistence (localStorage default; HA store is a plugin) |
| view | `editor.registerWidget(input, renderer)` | a custom widget for the self-building editor ("plugin for the plugins") |

## Minimum (a basic user)

```js
import { createThemeKit } from "token-theme-kit";

const kit = createThemeKit({ prefix: "--myapp-" });   // ← pick your namespace
kit.registerTokenGroup({
  id: "brand",
  tokens: [{ key: "accent", type: "color", default: "#3b82f6" }],
});

kit.applyTheme(document.body, { accent: "#e11d48" }); // writes --myapp-accent
```

Author your CSS once against `var(--myapp-accent)`. Users change the value through the editor; nobody hand-edits CSS to re-theme.

**String values** — `font-family`, `box-shadow`, easing curves — use the `raw` type; the value is the CSS, passed through as-is:

```js
{ key: "body-font", type: "raw", default: "Inter, system-ui, sans-serif" } // → --myapp-body-font
```

## Limit (the power user)

Same core — you're just your own best plugin author:

```js
import { cvdValidator } from "token-theme-kit/cvd";
import { haUserDataAdapter } from "token-theme-kit/adapters/ha";
import { defineThemeKitEditor } from "token-theme-kit/element";

kit.registerControlType("floor-texture", { input: "texture-picker", toCss: v => `url(/tex/${v}.png)` });
kit.registerValidator(cvdValidator({ pairs: [{ fg: "text", bg: "card" }] }));
kit.setAdapter(haUserDataAdapter(() => hass)); // persist per-user, synced across devices
kit.registerTokenGroup(floorGroup);            // + a dozen more

defineThemeKitEditor();
const editor = document.createElement("theme-kit-editor");
editor.previewTarget = cardEl;
editor.registerWidget("texture-picker", (control, { onChange, document }) => { /* your widget */ });
editor.kit = kit; // self-builds, including your custom control
```

## The self-building editor

The editor is data, not code. `kit.editorModel(values)` walks the registry into grouped **controls** — label, widget hint, current value, validator verdicts. A view renders that however it likes (stacked, grid, tabs — the model has no opinion).

`token-theme-kit/element` is the reference view: a `<theme-kit-editor>` web component with a stacked layout, live preview, and a **widget registry** (`registerWidget`) so custom control types get custom UI — the "plugin for the plugins." It's focus-safe: a value change repaints preview + verdicts only, never the inputs.

Add a token, a control appears. Register a control type + a widget, the editor draws it. No editor code changes, ever.

## Persistence (stud #4)

The default adapter is `localStorage` (zero-install, per-browser). For Home Assistant, `token-theme-kit/adapters/ha` persists to the logged-in user's frontend store — **cross-device, no custom integration required** — and debounces writes so dragging a control doesn't spam the socket. Any `{ load(): Promise<values>, save(values): Promise<void> }` object works, so a server-side / integration-backed adapter is a drop-in.

## Run

```bash
npm test                 # node --test — pure logic, no DOM (26 cases)
npx serve demo           # then open the printed URL for the live editor demo
```

## Status

Core + four studs + CVD + localStorage & HA adapters + the `<theme-kit-editor>` element + widget registry. **26 tests green.**

Dogfooded against a separate, opinionated theme system — a Lovelace card of ~400 tokens across 25 groups (its token count is *dynamic*, so a live instance reads higher). The kit had never seen those tokens, yet `computeVars` carried every CSS variable and `editorModel` reproduced the card's control list group-for-group — including the string-valued tokens (`font` / `shadow` / easing / …) carried by custom control types via stud #2. The point isn't fidelity to that system; it's **capacity** — the engine absorbed a 400-plus-token system it knew nothing about. Yours drops in the same way.

## License

MIT — see [LICENSE](LICENSE).
