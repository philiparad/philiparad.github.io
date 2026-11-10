# REA-073 — Natural textbook expression editing (MathIO)

**Status:** Editor source improvements committed; regression checks passed in JavaScript execution. **Native CASIO hardware pixel and key-operation parity remains unverified.**

## Official documentation and scope

- [Original fx-991ES user's guide: Math-format input and incorporating values into functions (pp. E-14–E-16)](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ES_991ES_EN.pdf).
- [fx-991ES PLUS user's guide: Inputting with Natural Display, expressions as arguments](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-570_991ES_PLUS_EN.pdf).

The original/PLUS editions support a textbook-like MathIO editor with fraction, mixed number, power, nth root, base logarithm, and nested arguments. The current project has reusable tree-based template nodes and an independent 96×31 web raster; it does not contain a real CASIO ROM font or genuine device captures.

## REA-073 changes

- **Operand-aware fraction insertion:** inserting FRAC after a completed numeral, named variable, parenthesized expression, structured radical, or structured power captures that complete operand into the fraction numerator. This is an incremental approximation of CASIO's documented "incorporating a value into a function" behavior, not a full replacement for its physical SHIFT+INS selection workflow.
- **Nested slot navigation:** UP/DOWN no longer claims movement when already in the requested field; LEFT/RIGHT can enter/leave nested edit nodes without destroying siblings. Empty required fields remain rejected by strict serialization (no silent calculation of incomplete expressions).
- **Undo:** a bounded 40-snapshot edit history restores the entire tree and exact slot cursor after insertion, template creation, deletion, or replacement. **Ctrl+Z is a browser-only convenience** when the calculator face or a calculator key is focused. It does **not** imply a corresponding original fx-991ES physical key. Browser shortcuts outside the calculator remain untouched.
- **Signed mixed fractions:** a negative whole part now applies the negative sign to the fractional component too. Example: `-2 1/4` evaluates as `-2.25`, not `-1.75`.
- **Model preservation:** controller keypad/button mapping, MODE/SETUP, and original/PLUS register limits remain unchanged.

## Reproduction

From `calculator/`:

```sh
node tests/rea073-structured-editor.cjs
python reference/rea-073/test_editor_browser.py
```

The 24 source checks cover full operands, nested fractions, cube and nth roots, square root fractions, powers, logarithm base, mixed signs, strict placeholders, cursor flow, deletion/restoration, bounded undo, overwriting and LCD cursor difference, keyboard focus and controller routing.

The Playwright browser test enters formulas **through actual DOM calculator key buttons**, changes models, verifies resulting expressions/values, checks error on missing denominator, and tests browser-only Ctrl+Z. Browser test and GitHub Actions workflow are committed but had not been executed in the connector execution session; do not claim browser execution or CI success until those runs are observed.

## Remaining REA-073 acceptance gaps

1. **Full native MathIO key parity:** original CASIO insertion mode via SHIFT+DEL (INS) and incorporation while the caret precedes a fraction, whole function, or parenthesized expression requires a manufacturer-faithful state machine. The current source captures completed operands as a practical partial implementation, but not all native cases.
2. **Complete multi-line template support:** derivatives, integrals and sums currently use calculator prompts rather than the native multi-field inline glyph templates. This behavior is covered by the separate **REA-080** development task.
3. **Pixel-perfect structured layout and caret motion:** requires device/emulator frame captures, including the allowable formula-height limit, complex nested roots and long 2D expressions, plus authentic matching LCD dimensions. Dependencies: REA-001/002/004/072.
4. **LineIO exact physical behavior and insertion/overwrite restrictions:** current web UI does not yet claim exact calculator parity under all editor setup combinations.
5. **Regression baseline review:** changes to expressions can affect REA-006 web-only golden snapshots. Always compare and approve candidates rather than silently replacing golden pixels.
6. **Browser/device verification:** run the Playwright test and compare a curated matrix of physical key traces and display frames against the three targeted calculator editions.

**No follow-on REA task was undertaken.** The standalone all-in-one HTML file is tracked separately under REA-100.
