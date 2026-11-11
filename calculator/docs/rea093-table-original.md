# REA-093 — TABLE restrictions, errors, and variable X

Issue: https://github.com/philiparad/philiparad.github.io/issues/47

## Status
Implemented and committed source-level improvements and tests. Hardware parity and end-to-end browser keyboard/DOM tests are pending; **do not close the issue yet**.

## Manufacturer reference
Original fx-991ES / fx-115ES User's Guide, pages E-61–E-62:
https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ES_991ES_EN.pdf

The original reference establishes:
- One f(X) table function; other stored variables are treated as constants.
- Maximum **30** inclusive X-values.
- d/dx, integration, Pol/Rec coordinate conversion, and summation may **not** be used in TABLE functions.
- Numeric expressions are allowed as Start, End, and Step values.
- Generating TABLE changes variable X.
- AC from the table grid returns to the function editor; table cells are read-only.
- Changing MathIO/LineIO in TABLE clears the function.

PLUS C dual-function mode is separate and is limited to 20 rows as reflected in existing model profiles; original/PLUS retain single-function behavior.

## Implementation
- `calculator/js/table-engine.js`: `validateExpression(source)` rejects unsupported function names, calculus symbols, statement separators and assignment. Valid scalar function expressions remain allowed.
- `calculator/js/app.js`: validates f(X) and, if configured, g(X) before generation; enforces the requested dual-function count rather than silently dropping a missing g(X).
- Start, End, and Step now accept expressions evaluated to finite numbers rather than requiring literal numeric strings.
- On successful generation, the final X value is assigned to real register X; stale complex X is removed.
- Invalid generation does **not** overwrite real X or the last successful TABLE draft. Opening a new TABLE prompt itself clears the previous displayed table, as was already the app's flow.
- Switching TABLE MathIO/LineIO now invalidates the generated table and saved draft, as specified by the original manual.

## Validation
Committed test:
```bash
node calculator/tests/rea093-table-original.cjs
```

**60/60 source-level checks passed in an isolated JavaScript harness.** The committed test file itself was re-fetched and evaluated against the committed engine and controller sources.

Coverage:
- Original, PLUS, and PLUS C model boundaries
- 30-row single-function capacity and overflow
- 20-row PLUS C dual-function capacity and overflow
- Zero/negative step, reversed start/end, nonnumeric range values
- Per-cell evaluation errors without aborting neighboring rows
- Grid navigation boundaries and model-specific function column counts
- Allowed and prohibited function syntax
- Controller integration for numeric range expressions, X changes, MathIO/LineIO reset, and return-to-editor keys

## Outstanding evidence
1. Run test file in a native Node checkout / CI.
2. Use a real browser to trace TABLE entry, Start/End/Step calculations, AC cancellation, grid cursor movement, setup changes, and errors.
3. Verify X register value after successful generation and after aborted/error generation using keyboard input.
4. Compare function restrictions, precise range boundary behavior, and LCD error/result rendering against original fx-991ES / PLUS / PLUS C hardware.

No physical device parity is claimed. REA-094 has not been started.
