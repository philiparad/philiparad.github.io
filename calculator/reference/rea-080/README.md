# REA-080 — Native inline calculus templates: ∫, d/dx and Σ

**Models:** original fx-991ES, fx-991ES PLUS and fx-991ES PLUS C.  
**Implementation:** modular `calculator/` code on `main`. Source testing passed. **Not verified against a physical CASIO calculator or a completed Playwright CI run.**

## Scope and manufacturer references

- [CASIO original fx-991ES manual](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ES_991ES_EN.pdf)
- [CASIO fx-991ES PLUS manual](https://support.casio.com/storage/en/manual/pdf/EN/004/fx-570_991ES_PLUS_EN.pdf)
- [CASIO fx-991ES PLUS C manual](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/)

The physical primary `∫` key inserts a definite-integral expression; `SHIFT + ∫` inserts a derivative at an X coordinate; `SHIFT + log□` inserts a finite sum template. MathIO uses a visually stacked mathematical layout; LineIO uses a horizontal editable function signature. Both modes use the original 50-key interface.

These implementations use an *independently designed* 96×31 logical LCD and a JavaScript numeric worker. They do not reproduce licensed CASIO display firmware or bitmaps.

## Source changes

- **`js/structured-editor.js`**: added first-class `integral`, `derivative` and `summation` nodes to the existing tree of navigable editor fields. Integrals and sums have `expression`, `lower`, `upper`; derivatives have `expression`, `at`. Field navigation works via RIGHT/LEFT; UP/DOWN can move between lower and upper and derivative expression/point, and DEL/undo use the same protected tree logic as fraction and radical nodes. Empty required slots cannot serialize strictly.
- **`js/lcd-viewport.js` / `js/display.js`**: draw stacked glyph-based ∫, d/dx, Σ templates in MathIO and compact horizontal `∫(expr,a,b)`, `d/dx(expr,at)`, `Σ(expr,a,b)` presentation in LineIO. Both layouts use a measured field cursor and viewport follow; long expressions still use viewport scroll cues. The source serialization is independent of display.
- **`js/inline-calculus.js`**: strictly parse a complete inline function into existing numeric worker arguments. Syntax `Diff(f(X),at)`, `Integral(f(X),a,b)`, `Sum(f(X),a,b)`, optionally `Diff(f(X),at,tol)` or `Integral(f(X),a,b,tol)` in linear source entry. Tolerance defaults are `1E-10` for a derivative and `1E-5` for an integral. A nonempty required argument is mandatory; mismatched parentheses/commas or trailing input cause a syntax error.
- **`js/app.js`**: physical keys insert the templates immediately into the main editor, instead of launching generic `fieldForm` prompts. On `=`, the serialized inline source is adapted to the worker's existing DERIVATIVE/INTEGRAL/SUM modes, and successful results are displayed through the standard result formatter. `AC`/MODE/OFF terminate the worker while the calculator is computing; rejected/canceled work does not update the result or variable memory. Normal expression inputs retain existing behavior.
- **`calculator/index.html`**: includes the parser before `app.js`; the keypad stays at 50 physical keys.

## Example key sequences

| Key sequence | Editable expression | Expected numerical output |
| --- | --- | --- |
| `∫`, ALPHA+LP (X), x², RIGHT, 0, RIGHT, 2, = | `Integral(X^2,0,2)` | 2.666666666… |
| `SHIFT+∫`, X, x², RIGHT, 3, = | `Diff(X^2,3)` | approximately 6 |
| `SHIFT+log□`, X, x², RIGHT, 0, RIGHT, 2, = | `Sum(X^2,0,2)` | 5 |

The LCD templates are editable expressions, not modal prompts. The source strings are internal representations for calculation, not what the MathIO LCD literally prints.

## Mathematical boundaries and errors

- Default `tol` is a project-configured approximation parameter; native CASIO firmware tolerances and intermediate numerical precision are **not proven equal** to this implementation.
- The mathematical engine limits explicit tolerance to 1e-14 through 0.1. Invalid values yield `Argument ERROR`.
- `Integral(1/(X-1),0,2)` passes through an integrand pole and yields `Math ERROR`; it does not invent an improper integral value.
- `Sum(X,2,1)` has reversed integer bounds and yields `Argument ERROR`.
- Incomplete slots (empty function or bounds) fail immediately as syntax errors. No silent substitution with zero or previous memory is allowed.
- Existing worker timeout and AC cancellation are preserved. No result or memory is committed after a cancellation.

**Limitation:** this implementation supports a full inline calculus operator as the top-level computation. It does not yet evaluate arbitrary arithmetic combinations containing embedded calculus nodes (e.g. `1+Integral(...)`), compose two such operators into one expression, or implement extra native integration/Sigma grammatical edge cases. Unsupported combinations are rejected rather than claimed supported. The variable of differentiation, integration or summation is currently fixed to `X`, matching the project's independent numeric worker.

## Verification performed

From repository root:

```sh
node calculator/tests/rea080-inline-calculus.cjs
python calculator/reference/rea-080/test_inline_calculus_browser.py
```

**Executed in a JavaScript source harness:**

- **55 checks passed** covering editor serialization, required slots, editable field navigation, undo, nested fractions, source parsing, default/explicit tolerance, numerical calculus results, and both MathIO and LineIO LCD pixels and cursor geometry.
- The actual numeric worker message handler was exercised with imported JavaScript modules. It returned 6 for `Diff(X^2,3)`, 8/3 for `Integral(X^2,0,2)`, and 5 for `Sum(X^2,0,2)`; it correctly rejected invalid tolerances, pole-crossing integrals and reversed summation bounds.
- JavaScript syntax validated for edited modules.

**Committed but not executed in this session:**

- Playwright Chromium browser test `reference/rea-080/test_inline_calculus_browser.py`. It serves the calculator over localhost HTTP for same-origin Worker execution, drives the physical DOM key buttons through MathIO and LineIO, checks field editing and computation, verifies error behavior and immediate AC cancellation, and checks all three models.
- GitHub Actions CI `.github/workflows/rea080-inline-calculus.yml`, which runs the new Node suite, the previous REA-073 editor suite, and Chromium browser tests.

## Remaining acceptance

1. Run and inspect browser CI, fix any actual DOM or Worker incompatibilities, and verify default and LineIO cursor rendering on a browser.
2. Collect real original / PLUS / PLUS C LCD frames and physical key traces to compare exact templates, line wrapping, variable notation, bound positions, tolerance behavior, and pixel glyphs; project geometry is only an independently drawn approximation.
3. Verify native input restrictions and complete expression grammar, e.g. nested calculus expressions and arithmetic combinations, before claiming exhaustive parity.
4. Review web-only REA-006 golden frame snapshots before any baseline update. No native device golden references are available.
5. Standalone synchronized single-file calculator is tracked by **REA-100**; no related update was made.

**REA-081 was not started.**
