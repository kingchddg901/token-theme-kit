/**
 * The reference editor's stylesheet — separated from element.js so it can be
 * asserted on in Node.
 *
 * element.js declares `class ThemeKitEditor extends HTMLElement`, which THROWS
 * the moment the module is evaluated without a DOM, so anything living in that
 * file is unreachable from `node --test`. The escape-hatch invariant below has
 * to be machine-checked -- a comment saying "do not tokenise this" is not a
 * guard -- so the stylesheet lives here instead. Same reason computeVars and
 * editorModel are pure: what can be tested in Node, is.
 */

export const STYLE = `
  :host { display: block; color: var(--tk-fg, inherit); font: inherit; }
  fieldset { border: 1px solid var(--tk-line, #2a3550); border-radius: 10px;
             margin: 0 0 12px; padding: 8px 12px 12px; }
  legend { padding: 0 6px; color: var(--tk-dim, #8b98a5); font-size: 12px;
           letter-spacing: .04em; text-transform: uppercase; }
  .row { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; margin: 8px 0; }
  .verdict { font-size: 12.5px; margin: 1px 0 6px; }
  .verdict.warn { color: var(--tk-warn, #e3b341); }
  .verdict.error { color: var(--tk-error, #ff7b72); }
  input[type=color] { width: 44px; height: 26px; padding: 0; border: 1px solid var(--tk-line, #2a3550);
                      border-radius: 6px; background: none; cursor: pointer; }

  /* A control row and its per-token reset. The reset sits OUTSIDE .row, which is
     a <label> -- a <button> inside a label activates the label's control, so a
     reset placed there would fight the widget it resets. */
  .ctl { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; }
  .ctl .verdicts { grid-column: 1 / -1; }
  [part~="reset"] { background: none; border: 0; cursor: pointer; padding: 2px 6px;
                    color: var(--tk-dim, #8b98a5); font-size: 15px; line-height: 1; }
  [part~="reset"]:hover { color: var(--tk-fg, inherit); }
  legend [part~="reset"] { font-size: 11px; text-transform: none; letter-spacing: 0; }

  /* --- BEGIN RESET-ALL: NO var() BEYOND THIS POINT ------------------------
     The last-resort control. Every value here is a LITERAL on purpose, and
     test/reset.test.mjs fails if a var() ever appears between these markers.

     Everything else in this editor is themed by the tokens the editor itself
     edits, which is correct -- live preview is the point. But that makes every
     other control reachable by a bad value: set text colour equal to surface
     colour and the UI that would undo it is gone, and the value is already
     persisted through the adapter, so a reload does not help.

     Black on white is 21:1, the maximum ratio there is, and it depends on
     nothing, so no combination of user values can touch it. On a light theme
     this reads as an out-of-place black button. That is the intended trade:
     a recovery control has to be legible, not tasteful.

     The white outline is for the dark case -- #000 on a dark surround stays
     perfectly readable but loses its edge, so it reads as floating text rather
     than a button. font-size is pinned for the same reason the colours are:
     "font: inherit" on :host means a themed font could otherwise shrink it away.

     NOT defended: an ancestor with opacity/filter/mix-blend-mode. Nothing
     self-contained can survive that, and it would take the whole page with it.
     --------------------------------------------------------------------- */
  [part~="reset-all"] {
    display: block;
    width: 100%;
    margin: 4px 0 0;
    padding: 10px 14px;
    background: #000000;
    color: #ffffff;
    border: 1px solid #ffffff;
    border-radius: 8px;
    font-size: 14px;
    line-height: 1.2;
    font-weight: 600;
    cursor: pointer;
    opacity: 1;
  }
  /* --- END RESET-ALL ---------------------------------------------------- */
`;
