# REA-082 — Per-operand ° / r / g suffixes and DRG▶ conversion

**Status:** mathematical and keypad implementation committed to modular browser calculator. **69 source-level regression checks passed.** Playwright/CI and genuine CASIO device comparisons are still pending.

## Manufacturer instructions

- [Original CASIO fx-991ES manual — converting an input value to the calculator's default angle unit](https://support.casio.com/pdf/004/fx-115ES_991ES_Eng.pdf)
- [CASIO fx-991ES PLUS — Angle Unit Conversion](https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/function_calculations/angle_unit_conversion.html)
- [CASIO PLUS C reference/manual](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/)
- [CASIO PLUS SETUP — default DEG/RAD/GRA choices](https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/calculation_calculator/configuring_calculator.html)

The manufacturer documents `SHIFT + Ans (DRG▶)`, followed by `1:°`, `2:r`, or `3:g`. These mark **the unit of the preceding operand** and convert it into the calculator's currently selected global angle unit. They do **not** set that global unit.

CASIO's documented DEG examples are `(π÷2)r = 90` and `50g = 45`, with the same source-unit interpretation inside trigonometric calculations.

## Changes in source

1. **`calculator/js/math-engine.js`:** the ordinary expression lexer now treats single-character `r` and `g` as postfix angle-unit operators, not undefined variables; `°` remains supported. The parser converts the immediately preceding operand from its annotated unit into the global `DEG`, `RAD`, or `GRAD` setting. This works within nested `sin/cos/tan` expressions and parentheses.
2. **`calculator/js/app.js`:** `SHIFT + Ans` no longer cycles the global setting. It displays `DRG▶` with exactly three choices. `1` inserts `°`, `2` inserts `r`, and `3` inserts `g`. `AC` cancels without modifying the source expression or setup angle.
3. **Result-screen semantics:** invoking DRG▶ from a displayed result starts a fresh input `(Ans)` followed by the selected unit suffix, so the suffix applies to the complete result without merging `Ans` and the suffix into an invalid identifier.
4. **`calculator/js/legend-audit.js`:** the SHIFT+Ans modifier indicates DRG availability in COMP and explicitly blocks it in CMPLX, rather than offering an apparent input method there. Global DEG/RAD/GRA selection remains under `SHIFT + MODE` (SETUP).
5. **Tests:** source unit tests and three-model Playwright button/menu/SETUP tests, plus GitHub Actions workflow.

### Unit examples

| Global angle SETUP | Expression | Calculation result |
| --- | --- | --- |
| DEG | `(pi/2)r` | 90 |
| DEG | `50g` | 45 |
| RAD | `90°` | π/2 |
| RAD | `50g` | π/4 |
| GRAD | `90°` | 100 |
| GRAD | `(pi/2)r` | 100 |
| All three | `sin(90°)` | 1 |
| All three | `sin((pi/2)r)` | 1 |
| All three | `cos(100g)` | 0 |
| All three | `sin(30°+50g)` | sin(75°) ≈ 0.9659258263 |

**Binding warning:** A suffix applies to its *immediate preceding operand*. `(pi/2)r` means convert π/2 radians; `pi/2r` parses as π divided by `2r`, which is **different** except when the global setting is already RAD. Use parentheses to match the manufacturer's full-expression examples. The parser intentionally does not reinterpret an unparenthesized expression as an implicitly grouped unit conversion.

### Global angle persistence

- `SHIFT+MODE → 3`: DEG, `SHIFT+MODE → 4`: RAD, `SHIFT+MODE → 5`: GRA.
- `SHIFT+Ans → DRG▶ → 1/2/3`: inserts a local suffix; the global setting does not change.
- Adjacent modifier distinction: on PLUS C, `ALPHA+Ans` inserts `PreAns`; on the original and standard PLUS profiles, the printed `ALPHA+Ans` legend is absent and the key is blocked. This does not open DRG▶ or change the angle setting.
- An unmarked trig argument is interpreted using the currently selected global unit.
- Inverse trig outputs (e.g. `asin(1)`) follow the global unit.
- Existing complete degrees/minutes/seconds (`°′″`) parsing remains independent from DRG angle suffixes.

## Tests

From repository root:

```sh
node calculator/tests/rea082-drg-angle.cjs
node calculator/tests/rea081-legend-audit.cjs
python calculator/reference/rea-082/test_drg_browser.py
```

**Executed:** 69 deterministic JavaScript checks in a source-execution harness, covering all three global angle settings, nested trigonometric expressions, unit postfix scope, invalid syntax, tangent pole behavior, global setting persistence, physical legend and menu definition. JavaScript syntax checked.

**Committed but NOT executed in the connector session:** `reference/rea-082/test_drg_browser.py` and `.github/workflows/rea082-drg-angles.yml`. The browser test serves the calculator over local HTTP and clicks actual DOM keys on original, PLUS and PLUS C; it checks DRG menu choices, nested trig, setup persistence, result-screen usage, cancel/error, and COMP/CMPLX availability.

## Pending acceptance

1. Run Playwright/CI and confirm the actual browser keypad/menu/display states. Do not claim a green browser run until observed.
2. Compare physical original, PLUS, and PLUS C key sequences, printed DRG legends, LCD unit glyphs, rounding and display formatting, error/cancel behavior and mode persistence with CASIO or an authorized emulator.
3. Confirm DRG availability and angle-unit operations in every advanced mode; this implementation intentionally limits the dedicated operand-suffix menu to COMP.
4. Review boundary precision in nested expressions near tangent poles and the original/PLUS/C native accuracy envelopes.
5. Standalone single-file sync remains tracked separately as REA-100.

**REA-083 was not started.**
