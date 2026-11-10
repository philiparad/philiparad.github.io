# REA-075 — Decimal precision, Fix / Sci / Norm rounding and boundaries

**State:** Source-level improvements committed to modular calculator. Mathematical regression verified in a JavaScript harness; browser test committed but not yet executed in this session. **Physical CASIO accuracy remains unverified.**

## Manufacturer evidence

- [Original CASIO fx-115ES/fx-991ES User's Guide, calculation range and precision, p. E-67](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ES_991ES_EN.pdf)
- [CASIO fx-570ES PLUS/fx-991ES PLUS, calculation ranges and precision](https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/technical_informatoin/calculation_ranges.html)

Both guides document internal 15-digit calculations, ten-digit display accuracy (generally ±1 at the tenth digit), valid nonzero range `1×10^-99` through `9.999999999×10^99`, and zero. They do **not** establish the exact firmware rounding mode at all halfway cases or the correct response to every underflow/overflow intermediate; those require authentic device or emulator traces.

## Implementation

- `js/number-format.js`: Scientific 1–10-digit display rounding no longer produces an impossible exponent of `100` when the numeric value itself is still within the documented range. The fallback retains the ten-digit in-range mantissa, and avoids inventing an out-of-range result.
- `js/number-format.js`: Fix0–9 counts all displayed decimal mantissa digits, including requested trailing places, and uses ten-digit scientific fallback if the fixed representation cannot fit. This addresses former outputs such as `10000000000.00` and `9999999999.90`.
- `js/decimal-core.js`: The independent 15-significant-digit arithmetic path now maps nonzero results below the documented `10^-99` range to zero rather than returning a nonzero out-of-range number. This is a **chosen underflow emulation policy** and not a device-confirmed native transition.
- Existing 15-digit decimal rounding, sign normalization, Norm1 threshold `0.01`, Norm2 threshold `1e-9`, and Fix/Sci setup navigation are retained and regression-checked.
- Exact rational/surd/π result handling is unchanged; this task concerns **decimal** representations only.

### Bounded examples

| Calculation / setting | Expected web display |
| --- | --- |
| `999.995`, Fix2 | `1000.00` |
| `-2.5`, Fix0 | `-3` |
| `1e10`, Fix2 | `1.000000000×10^10` |
| `9999999999.9`, Fix2 | `1.000000000×10^10` |
| `999.995`, Sci3 | `1.00×10^3` |
| `9.999999999e99`, Sci3 | `9.999999999×10^99` (range-safe fallback) |
| `0.0099`, Norm1 | `9.9×10^-3` |
| `0.0099`, Norm2 | `0.0099` |
| `1e-99` | `1×10^-99` |
| `1e-100` | `0` (web underflow policy) |
| `1e100` | `Math ERROR` |

## Reproducible tests

From `calculator/`:

```sh
node tests/rea075-precision.cjs
python reference/rea-075/test_precision_browser.py
```

The Node source suite passed **74 checks** in a JavaScript execution harness (all Fix0–9 and Sci1–10 choices, Norm thresholds, half-up ties, carry/negative zero, 15-digit decimal arithmetic, plus upper/lower range boundaries for all three model menus).

The browser suite covers physical web MODE/SETUP number-key sequences, Fix/Sci/Norm values, transitions back to MathIO, domain errors and AC cancellation for all three model profiles. It is committed but **not executed** during this source-only GitHub connector session.

GitHub Actions workflow: `.github/workflows/rea075-precision.yml`, runs both suites when enabled. Do not claim a green workflow until its run has been observed.

## Outstanding fidelity / acceptance gaps

1. The CASIO guide's 15-digit internal arithmetic is an accuracy envelope. JavaScript's binary floating point and the project's bounded base-10 arithmetic are not firmware-equivalent for every function, chained operation, boundary tie, and trig or transcendental calculation.
2. The fixed-to-scientific fallback and exponent-99 cap are conservative display safeguards; confirm precise CASIO fallback behavior on original/PLUS/C devices before claiming numeric display parity.
3. **Underflow behavior needs physical evidence**; returning zero is the independent project's range policy. It may not reproduce all intermediate native error/round-to-zero transitions.
4. Distinguish the nine Sci menu digit choices 1–9 and `0` → ten digits from the mathematical precision of Ans memory. Verify native digit counts through direct device screenshots.
5. Execute Playwright/CI, verify actual browser output and any changed REA-006 web-only golden snapshots before approval.
6. Standalone HTML synchronization is handled by **REA-100**, not this task.

**No REA-076 work has been undertaken.**
