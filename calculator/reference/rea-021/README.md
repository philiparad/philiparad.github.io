# REA-021 — Decimal arithmetic and precision

**Implementation:** A 15-significant-digit, decimal-integer arithmetic path is implemented for ordinary numeric expressions. **Model-specific device parity remains unverified** because REA-001 has no genuine emulator/hardware traces.

The manufacturer's PLUS C guide documents 15 internal digits, generally 10 displayed digits, and cumulative errors for chained calculations:
https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ESPLUS_991ESPLUSC_EN.pdf

## Implementation

- `js/decimal-core.js` uses BigInt decimal coefficients and explicit base-10 scales. Arithmetic operators +, −, ×, ÷, integer powers, parentheses, unary signs, and implicit numeric multiplication use decimal intermediates rounded to 15 significant digits.
- The existing evaluator receives the final numeric answer (the app still uses Number for its public result, memory and advanced modes).
- Unsupported expressions (trigonometry, function calls, noninteger powers and variables) intentionally fall through to the prior evaluator.
- `index.html` and `fx991_fresh_standalone.html` load the same decimal logic.
- `test_decimal.js` tests decimal edges and legacy fallback: `node calculator/reference/rea-021/test_decimal.js`.

## Remaining verification limitations

The exact CASIO internal rounding algorithm and intermediate behavior are not disclosed by the 15-digit precision specification. This implementation uses decimal half-up rounding, and cannot be called firmware-accurate. Floating-point function calculations and exact rational-result chaining are distinct subsequent tasks. Hardware capture comparisons remain blocked by REA-001.

**Acceptance status:** Implementation and deterministic source tests available; manufacturer-device differential validation pending.
