# REA-092 — EQN coefficient editor and result paging

## Status
Partial completion. Controller fix and source-level regression suite committed; direct browser and physical CASIO verification remain outstanding.

Issue: https://github.com/philiparad/philiparad.github.io/issues/46

## Manufacturer reference
Original CASIO fx-991ES manual, pages E-55–57:
https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ES_991ES_EN.pdf

The guide specifies four types (linear 2, linear 3, quadratic, cubic), coefficient-cell entry/navigation, and solution pagination. It explicitly distinguishes:
- **=**: next solution; after final solution, return to coefficient editor.
- **Arrow up/down**: scroll among the available root pages, without exiting.
- **AC** while displaying a solution: return to the coefficient editor.
- Output formatting follows the setup's Math/Line and complex-format settings.

## Corrected implementation
In `calculator/js/app.js`, `eqnPage(delta,exitAtEnd=false)` separates pagination from exit:
- `=` calls `eqnPage(1,true)`, returning to coefficient editing only after the last root.
- Arrow keys call `eqnPage(±1)`, clamping the index rather than exiting on an endpoint.
- AC still restores the coefficient editor.
- The current MathIO/LineIO setting still selects exact or decimal solution text through `EQEX.display(root,state.math)`.

## Verification suite
File: `calculator/tests/rea092-eqn-validation.cjs`
Command: `node calculator/tests/rea092-eqn-validation.cjs`

**83 checks passed in an isolated JavaScript harness** on source fetched from the current GitHub repository.

Coverage for each of the three model profiles:
- All four EQN types and `solve()` dispatch.
- 2-variable and 3-variable systems; inconsistent/dependent systems.
- Rational, irrational and complex quadratic roots.
- Repeated quadratic and cubic roots.
- Cubic root ordering including original-manual example `x³−2x²−x+2=0`, yielding -1, 2, 1.
- MathIO symbolic vs LineIO decimal solution text.
- Coefficient navigation, edit, sign, backspace and clear.
- Invalid coefficients and equation types.
- Source-level integration of final-page EQUAL, arrow scroll, AC return, DEL and result rendering.

Tests use tolerant comparisons where numerical roots have ordinary floating-point rounding.

## Remaining acceptance requirements
- Execute Node suite in an actual checkout or CI.
- Real browser keyboard/DOM trace for four types, cursor cell position, fourth column horizontal scrolling and final solution behavior.
- Physical original / PLUS / PLUS C comparisons for root ordering, exact/decimal and complex presentation, error and cancellation.
- Compare MathIO/LineIO and setup settings against device captures, not just source.

No claims of measured hardware parity. Do not close issue #46 until those checks are complete. REA-091 was skipped at user request; REA-093 not started.
