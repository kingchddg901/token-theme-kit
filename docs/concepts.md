# Concepts

## The thesis

**Declare a design token in a group file → an editor builds its own UI for it → your end users re-theme through that UI, never touching CSS.**

You author your CSS once against `var(--token)`. The kit turns token *values* into CSS custom properties on a target element. Your users change those values through a self-generating editor. Nobody hand-edits CSS to re-theme.

## The board and the studs (Lego)

Think of it as a small board with well-defined studs. Everything powerful is a brick you *choose* to click on.

**Normal bricks — the core everyone gets, with zero domain knowledge:**
- a token **registry** (declare token groups → they assemble)
- **color math** (parse / format / WCAG contrast)
- **`applyTheme`** (token values → CSS custom properties on an element)
- a scoped **preview** engine (apply pending values, commit / revert)
- a self-building **editor model** (registry → a list of typed controls)
- six primitive **control types**: `color, alpha, number, size, select, toggle`

**The studs — plug in only what you need:**

| # | Method | Extends… |
|---|--------|----------|
| 1 | `registerTokenGroup(group)` | what tokens exist |
| 2 | `registerControlType(name, spec)` | how a token *type* becomes CSS (parse / `toCss`) |
| 3 | `registerValidator(fn)` | per-control verdicts (e.g. CVD / contrast) |
| 4 | `setAdapter(adapter)` | where values persist |
| view | `editor.registerWidget(input, renderer)` | how a control is *drawn* |

The core ships **no** domain knowledge — no opinion about your specific tokens, your framework, or Home Assistant. A basic user touches no studs. A power user is their own best plugin author.

## Minimum → limit

The same core serves both ends:

- **Minimum:** declare a few `color`/`number` tokens, call `applyTheme`. Done. No plugins.
- **Limit:** register custom control types, validators, an adapter, and a dozen domain token groups; render the reference editor with custom widgets.

Ship at your limit; degrade to the minimum cleanly.

## Plugins for the plugins

Stud #2 (`registerControlType`) teaches the **core** a token type's *logic* — how its value becomes CSS. But something still has to *draw* the control, and the core is framework-agnostic, so it can't. That's the view-side **widget registry** (`registerWidget`): it maps an `input` type to a renderer.

So a custom control has two halves:
- **logic** on the kit — `registerControlType("floor-texture", { toCss, … })`
- **UI** on the view — `editor.registerWidget("texture-picker", (control, ctx) => element)`

The self-building editor then renders your custom control with zero editor-code changes. The core never learns what a "floor texture" is.

## Data flow

Two pure pipelines plus a DOM write:

```
registry + values  ─computeVars→  { "--token": "css" }  ─applyVars→  element.style
registry + validators + values  ─editorModel→  groups[] → controls[]  →  a view renders them
```

- `computeVars` and `editorModel` are **pure** (no DOM) — unit-testable in Node.
- `applyVars` / `createPreview` are the thin DOM layer.
- The **view** (any framework, or the bundled web component) turns the editor model into UI. Layout is always the view's business, never the core's.

## Why this shape

- **Extractability proves a layer.** If a theming system comes apart cleanly into a zero-domain core + opt-in plugins, the boundary was real. This kit is that core.
- **Single source, no drift.** Token-type behavior, editor structure, and apply live once, in the core — not duplicated across every card that consumes it.
- **Accessible by default, optionally.** CVD safety is a validator plugin: available to the accessibility-minded, zero cost to everyone else.
