# API reference

## Entry points

| Import | What |
|--------|------|
| `token-theme-kit` | core: `createThemeKit` + helpers |
| `token-theme-kit/cvd` | optional colorblind/contrast validator |
| `token-theme-kit/adapters/local-storage` | default persistence adapter |
| `token-theme-kit/adapters/ha` | Home Assistant frontend-store adapter |
| `token-theme-kit/element` | the `<theme-kit-editor>` reference view |
| `token-theme-kit/widgets` | the widget registry (`createWidgetRegistry`, `BUILTIN_WIDGETS`) — import directly **only if building your own view**; the `element` already uses it |

---

## `createThemeKit(options?)`

```js
const kit = createThemeKit({ prefix = "--", adapter = null } = {});
```

- `prefix` — prepended to a token's `key` to form its CSS variable when the token has no explicit `cssVar`. Default `"--"`.
- `adapter` — a persistence adapter (see below); can also be set later with `setAdapter`.

Returns a **kit** with:

### Studs
- `registerTokenGroup(group)` → `() => void` (unregister). **Stud #1.**
- `registerControlType(name, spec)` → `() => void`. **Stud #2.**
- `registerValidator(fn)` → `() => void`. **Stud #3.**
- `setAdapter(adapter)` → `this`. **Stud #4.**

### Reads
- `get tokens` → `Map<key, tokenDecl>` (flat).
- `get groups` → `group[]` (grouped, editor order).
- `subscribe(fn)` → `() => void`. Fires when the registry changes.

### Apply / preview / model
- `computeVars(values?)` → `{ [cssVar]: string }`. Pure.
- `applyTheme(el, values?)` → `el`. Writes the computed vars to `el.style`.
- `preview(el, baseline?)` → a **preview** (see below).
- `editorModel(values?)` → an **editor model** (see below). Pure.

### Persistence
- `load()` → `Promise<values>` (via the adapter; `{}` if none).
- `save(values)` → `Promise<values>`.

---

## Token group

```js
{
  id: "surfaces",            // required, unique
  label: "Surfaces",         // optional (defaults to a humanized id)
  tokens: [ tokenDecl, … ],
}
```

### Token declaration

```js
{
  key: "surface-bg",         // required. CSS var = cssVar || (prefix + key)
  type: "color",             // control type name; default "color"
  default: "#101418",        // optional default value
  cssVar: "--evcc-bg",       // optional explicit CSS variable (bypasses prefix)
  label: "Surface BG",       // optional (defaults to humanized key)
  unit: "px",                // optional; read by number/size toCss (px|rem|ms|%|…)
  input: "range",            // optional widget-hint override
  options: [{ value, label }], // for select-like controls
  min, max, step,            // optional slider bounds (editor-only)
}
```

Only token **values** are your app's state; declarations are static config.

---

## Control types (stud #2)

```js
kit.registerControlType("floor-texture", {
  input: "texture-picker",       // widget hint the view resolves
  coerce: (v) => v,              // normalize an incoming value (optional)
  toCss: (v, token) => `url(/tex/${v}.png)`, // value (+ decl) → CSS string
  defaultValue: "oak",           // used when no value/default is present
});
```

Built-ins: `color`, `alpha` (0–1), `number` (bare; honors `token.unit`), `size` (px; honors `token.unit`), `select`, `toggle`, `raw` (string passed through as-is — `font-family`, `box-shadow`, easing curves, transforms).

Need a unit other than px — ms, deg, %, rem? Use `number` with `unit`: `{ type: "number", unit: "ms", default: 180 }` gives a numeric (slider) control that emits `180ms`. `size` is just the px shorthand; there's deliberately no separate `duration`/`angle` type — `unit` generalizes them, so a "duration" is a `number` + `unit: "ms"`, not its own kind.

An **unknown / unregistered** type falls back to `raw` (a text field, with a one-time console warning) — **never `color`**, so a typo'd type name renders harmlessly rather than as a black color swatch.

**Control type → widget.** These are two distinct lists: a *control type* defines value→CSS logic; a *widget* draws the control. Each control type names an `input` the view's widget registry resolves:

| control type | `input` (widget) |
|---|---|
| color | color |
| alpha | range |
| number / size | number |
| select | select |
| toggle | checkbox |
| raw | text |

A custom control type just names an `input`; an input with no matching widget falls back to the text widget.

---

## Validators (stud #3)

A validator is `(resolvedValues, context) => verdict[]`:

```js
{ key: "text", level: "warn" | "error" | "info", message: "…" }
```

`context = { tokens }`. The editor model attaches verdicts to their `key`'s control.

**CVD plugin:**
```js
import { cvdValidator } from "token-theme-kit/cvd";
kit.registerValidator(cvdValidator({ pairs: [{ fg: "text", bg: "card", min: 4.5, label: "body text" }] }));
```

---

## Persistence adapters (stud #4)

Interface: `{ load(): Promise<values>, save(values): Promise<void> }`.

```js
import { localStorageAdapter } from "token-theme-kit/adapters/local-storage";
kit.setAdapter(localStorageAdapter("my-theme"));

import { haUserDataAdapter } from "token-theme-kit/adapters/ha";
kit.setAdapter(haUserDataAdapter(() => hass, "my-theme", { saveDebounceMs: 350 }));
// pass hass OR a getter; also exposes flush() for card disconnect.
```

---

## Preview

```js
const p = kit.preview(el, baseline);
p.apply(pending);      // paint el with { ...baseline, ...pending } — transient
p.commit(pending?);    // move the baseline; returns the new values
p.revert();            // repaint the baseline
p.values;              // current committed values
```

---

## Editor model

`kit.editorModel(values)` →

```js
{
  groups: [{
    id, label,
    controls: [{
      key, label, type,
      input,                 // widget hint
      value,                 // resolved value
      options, min, max, step, help,   // pass-through metadata
      verdicts: [{ level, message }],
    }],
  }],
  verdicts: [ … ],           // all verdicts, flat
  values,                    // resolved values
}
```

Pure — a view renders it however it likes.

---

## The element

```js
import { defineThemeKitEditor, ThemeKitEditor } from "token-theme-kit/element";
defineThemeKitEditor("theme-kit-editor"); // idempotent; returns the tag

const ed = document.createElement("theme-kit-editor");
ed.previewTarget = someElement;   // where var(--token) is applied (optional)
ed.registerWidget(input, renderer); // view-side custom widget
ed.kit = kit;                     // triggers load + self-build
ed.values;                        // get/set current values
// emits a "change" CustomEvent { detail: { key, values } }
```

**Widget renderer** — `(control, ctx) => HTMLElement`, where `ctx = { onChange(value), document }`. Built-in widgets: `color, range, number, select, checkbox, text`. Custom control types register a matching widget; unknown inputs fall back to a text field. A custom widget owns its own display state (the editor re-renders verdicts on change, never the inputs).

---

## Core helpers (also exported from the root)

`computeVars`, `applyVars`, `createPreview`, `buildEditorModel`, `resolveValues`, `createRegistry`, `createControlTypeRegistry`, `createValidatorRegistry`, `BUILTIN_CONTROL_TYPES`, `humanize`, and color math: `parseColor`, `formatColor`, `luminance`, `contrast`.
