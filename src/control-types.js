/**
 * Control types — how a token's VALUE is edited and how it becomes CSS.
 *
 * A control type is the Technic pin (stud #2): it teaches the self-building
 * editor how to render/parse ONE kind of token, without the core knowing what
 * that kind means. The core ships five NORMAL bricks; a consumer registers more
 * (a floor-texture picker, an animal selector, …) and the editor builds itself
 * around them automatically.
 *
 * A control type is data, not a component: it declares an `input` hint (which
 * the view maps to real UI) plus pure `parse`/`toCss` functions. Rendering the
 * actual widget is the VIEW's job — keep this framework-free.
 */

import { parseColor, formatColor } from "./color.js";

/** @typedef {{input:string, coerce?:Function, toCss:Function, defaultValue?:any}} ControlType */

/** The five primitives every UI needs. */
export const BUILTIN_CONTROL_TYPES = {
  color: {
    input: "color",
    coerce: (v) => (parseColor(v) ? formatColor(parseColor(v)) : v),
    toCss: (v) => String(v),
    defaultValue: "#000000",
  },
  alpha: {
    // 0..1 opacity, emitted as a bare number so it can drive rgba()/opacity.
    input: "range",
    min: 0, max: 1, step: 0.01,
    coerce: (v) => Math.max(0, Math.min(1, Number(v))),
    toCss: (v) => String(v),
    defaultValue: 1,
  },
  number: {
    input: "number",
    coerce: (v) => Number(v),
    toCss: (v) => (typeof v === "number" ? `${v}px` : String(v)),
    defaultValue: 0,
  },
  select: {
    // options: [{value,label}] declared on the token
    input: "select",
    coerce: (v) => v,
    toCss: (v) => String(v),
    defaultValue: "",
  },
  toggle: {
    input: "checkbox",
    coerce: (v) => Boolean(v),
    toCss: (v) => (v ? "1" : "0"),
    defaultValue: false,
  },
};

/** Registry of control types: built-ins plus whatever a consumer snaps in. */
export function createControlTypeRegistry() {
  const types = new Map(Object.entries(BUILTIN_CONTROL_TYPES));
  return {
    /** stud #2 — register a custom control type. */
    register(name, spec) {
      if (!name || typeof spec?.toCss !== "function") {
        throw new Error(`control type "${name}" needs at least a toCss(value) function`);
      }
      types.set(name, { input: "text", coerce: (v) => v, defaultValue: "", ...spec });
      return () => types.delete(name);
    },
    get: (name) => types.get(name),
    has: (name) => types.has(name),
    list: () => [...types.keys()],
  };
}
