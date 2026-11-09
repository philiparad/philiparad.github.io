# REA-025 — Fix / Sci / Norm1 / Norm2 display formatting

**Scope:** Unified calculation-result display formatting for the independent calculator. This task does **not** change numerical arithmetic or the upcoming REA-026 fraction-conversion behavior.

## Official target

CASIO fx-991ES PLUS C (2nd edition), [Configuring the Calculator Setup](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/calculation_calculator/configuring_calculator.html):
- **Fix 0–9:** display exactly the selected count of digits after the decimal point.
- **Sci 1–9:** show the selected count of significant digits, retaining trailing zeros; **Sci 0 = 10 significant digits**.
- **Norm1:** exponential notation for nonzero magnitudes below `10^-2` or at/above `10^10`.
- **Norm2:** exponential notation for nonzero magnitudes below `10^-9` or at/above `10^10`.

## Implementation

- `js/number-format.js`: shared formatter for all four modes, decimal-digit rounding from 15-significant-digit numeric values, decimal-separator setting, and zero/negative-zero cases. This avoids binary `toFixed` tie artifacts such as 1.005 → 1.00.
- `js/math-engine.js` delegates numeric result formatting to the shared formatter; internal arithmetic and stored Ans are not changed.
- `js/result-format.js` delegates decimal and Sci output to the same module, preserving exact rational/symbolic formatting when applicable.
- `index.html` and `fx991_fresh_standalone.html` include the new module.
- `test_format.js` runs deterministic cross-module comparisons, documented manufacturer examples, positive/negative values, boundary magnitudes, comma decimal separator, and exact-rational presentation compatibility.

## Execute

```sh
node calculator/reference/rea-025/test_format.js
node calculator/reference/rea-021/test_decimal.js
node calculator/reference/rea-022/test_rational.js
node calculator/reference/rea-023/test_precedence.js
node calculator/reference/rea-024/test_error.js
```

These checks validate **source behavior**, not firmware equivalence. CASIO-specific tie-breaking and hardware LCD display behavior still need reference-backed differential testing (REA-001/004). This is an independent educational implementation, not a manufacturer ROM or licensed bitmap.
