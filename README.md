# theme-kit

> Working name — rename freely.

**Declare a design token in a group file → an editor builds its own UI for it → your users re-theme through that UI, never touching CSS.**

Extracted from a Home Assistant Lovelace card, so it's HA-first — but it knows nothing about HA, or about your tokens. The core is pure machinery with **zero domain knowledge**; everything powerful is an opt-in plugin.

## The board and the four studs

The core (the "normal bricks" every user gets): a token **registry**, **color math**, **`applyTheme`** (tokens → CSS custom properties), a scoped **preview** engine, and a self-building **editor model**. Plus five primitive control types (color, alpha, number, select, toggle).

Everything domain-specific snaps onto one of four studs — and you pay for nothing you don't use:

| Stud | Method | You plug in… |
|------|--------|--------------|
| #1 tokens | `registerTokenGroup(group)` | your token groups |
| #2 controls | `registerControlType(name, spec)` | custom editor widgets (a texture picker, an icon selector) |
| #3 verdicts | `registerValidator(fn)` | checks like CVD / colorblind safety (`theme-kit/cvd`) |
| #4 storage | `setAdapter(adapter)` | persistence (localStorage default; HA `Store` is a plugin) |

## Minimum (a basic user)

```js
import { createThemeKit } from "theme-kit";

const kit = createThemeKit();
kit.registerTokenGroup({
  id: "brand",
  tokens: [{ key: "accent", type: "color", default: "#3b82f6" }],
});

kit.applyTheme(document.body, { accent: "#e11d48" }); // sets --accent; done
```

Author your CSS once against `var(--accent)`. Users change the value through the editor; nobody hand-edits CSS to re-theme.

## Limit (the power user)

Same core — you're just your own best plugin author:

```js
import { cvdValidator } from "theme-kit/cvd";
import { haUserDataAdapter } from "theme-kit/adapters/ha";

kit.registerControlType("floor-texture", { input: "texture-picker", toCss: v => `url(/tex/${v}.png)` });
kit.registerValidator(cvdValidator({ pairs: [{ fg: "text", bg: "card" }] }));
kit.setAdapter(haUserDataAdapter(hass));   // persist per-user, synced across devices
kit.registerTokenGroup(floorGroup);        // + a dozen more
```

## Self-building editor

The editor is data, not code. `kit.editorModel(values)` walks the registry into grouped **controls** — label, widget hint, current value, validator verdicts. A view renders that however it likes (stacked, grid, tabs — the model has no opinion). Add a token, a control appears. Register a control type, the editor knows how to render it. No editor code changes, ever.

## Persistence (stud #4)

The default adapter is `localStorage` (zero-install, per-browser). For Home Assistant, `theme-kit/adapters/ha` persists to the logged-in user's frontend store — **cross-device, no custom integration required** — and debounces writes so dragging a control doesn't spam the socket:

```js
import { haUserDataAdapter } from "theme-kit/adapters/ha";

kit.setAdapter(haUserDataAdapter(() => this.hass)); // pass a getter; HA swaps hass each update
```

Any `{ load(): Promise<values>, save(values): Promise<void> }` object works, so a server-side / integration-backed adapter is a drop-in.

## Run

```bash
npm test                 # node --test — pure logic, no DOM
npx serve demo           # then open the printed URL for the live editor demo
```

## Status

Core + four studs + CVD + **localStorage & HA adapters**, 21 tests green. Next: a reference editor web component (`theme-kit/element`), then dogfooding by migrating the origin card to consume this.
