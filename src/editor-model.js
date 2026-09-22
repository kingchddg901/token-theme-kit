/**
 * Editor model — the self-building editor, as pure data.
 *
 * Walk the registry, and for each token emit a CONTROL descriptor: its label,
 * its control type's input hint, the current value, and any validator verdicts.
 * The VIEW renders this however it likes (your stacked layout, a grid, tabs) —
 * the model has no opinion on arrangement. This is what makes the editor
 * "self-building": add a token, a control appears; register a control type, the
 * editor knows how to render it — all without touching editor code.
 *
 * Pure and DOM-free → unit-testable in Node.
 */

export function buildEditorModel({ registry, controlTypes, validators, values = {} }) {
  const resolved = resolveValues(registry.tokens, values, controlTypes);
  const verdicts = validators ? validators.run(resolved, { tokens: registry.tokens }) : [];
  const byKey = groupBy(verdicts, (v) => v.key);

  const groups = registry.groups.map((g) => ({
    id: g.id,
    label: g.label,
    controls: g.tokens.map((t) => {
      const ct = controlTypes.get(t.type); // unknown → `raw`, not color
      return {
        key: t.key,
        label: t.label,
        type: t.type,
        input: t.input || ct.input, // token can override the widget hint
        value: resolved[t.key],
        // pass-through widget metadata (options for selects, min/max/step for ranges)
        ...pickDefined(t, ["options", "min", "max", "step", "help"]),
        ...pickDefined(ct, ["min", "max", "step"]),
        verdicts: byKey.get(t.key) || [],
      };
    }),
  }));

  return { groups, verdicts, values: resolved };
}

/**
 * Resolve every token to its effective value. Order per token:
 *   override (a value)  →  inherited token's resolved value (`decl.inherit`)  →  own default  →  type default.
 *
 * `inherit` lets a token fall back to ANOTHER token until it is overridden — e.g. a per-item token
 * that follows its layer's colour until you tune that one item, and `resetValues` returns it to
 * following. Chains resolve; a cycle stops at the token that closes it (its own default is used).
 */
export function resolveValues(tokens, values, controlTypes) {
  const out = {};
  const resolve = (key, seen) => {
    if (key in out) return out[key];              // memoised (and breaks re-entry)
    const decl = tokens.get(key);
    if (!decl) return undefined;
    const ct = controlTypes.get(decl.type);       // unknown → `raw`, not color
    let raw = values?.[key];
    if (raw === undefined && decl.inherit && decl.inherit !== key && !seen.has(decl.inherit)) {
      raw = resolve(decl.inherit, new Set(seen).add(key));
    }
    if (raw === undefined) raw = decl.default;
    const val = raw !== undefined ? (ct.coerce ? ct.coerce(raw) : raw) : ct.defaultValue;
    out[key] = val;
    return val;
  };
  for (const [key] of tokens) resolve(key, new Set());
  return out;
}

function groupBy(arr, keyFn) {
  const m = new Map();
  for (const x of arr) {
    const k = keyFn(x);
    if (k == null) continue;
    (m.get(k) || m.set(k, []).get(k)).push(x);
  }
  return m;
}

function pickDefined(obj, keys) {
  const out = {};
  for (const k of keys) if (obj?.[k] !== undefined) out[k] = obj[k];
  return out;
}
