# REA-083 — Complete sexagesimal editing, conversion and arithmetic

**Scope:** original fx-991ES, fx-991ES PLUS and fx-991ES PLUS C.  
**State:** modular web source and tests committed; 78 source checks and 69 prior DRG checks passed. Playwright/CI execution and physical CASIO fidelity remain unverified.

## Manufacturer references and intended semantics

- [Original fx-991ES User's Guide, Degree, Minute, Second (Sexagesimal) Calculations](https://support.casio.com/pdf/004/fx-115ES_991ES_Eng.pdf)
- [fx-991ES PLUS User's Guide, sexagesimal calculations](https://support.casio.com/pdf/004/fx-570_991ES_PLUS_E.pdf)
- [Official fx-991ES PLUS calculation range](https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/technical_informatoin/calculation_ranges.html)
- [PLUS C basic calculations](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/basic_calculations/index.html)

The documented input is degrees `°`, minutes `′`, seconds `″`, with an **explicit value for both degrees and minutes**, even when zero. The official guide supports addition/subtraction of sexagesimal values, multiplication or division of a sexagesimal value with a decimal value, and decimal ↔ sexagesimal toggles. The conversion range is bounded by `9999999°59′59″`.

## Implementation

- **`calculator/js/sexagesimal.js`** now validates complete three-component sexagesimal input and field ranges. Degrees and minutes must be nonnegative integers, seconds must be nonnegative and less than 60, and all values must be within the documented seven-digit degree range. Invalid partial sequences and extra numeric text following a completed token report `Syntax ERROR` or `Argument ERROR`, not an invented zero/default.
- Signed values remain ordinary unary expressions: `-2°30′0″` means `-(2+30/60)`. The numeric engine consumes validated DMS terms as decimal-degree arithmetic, so signs, addition, subtraction, decimal multiplication/division and nested parentheses are preserved.
- **DMS formatter** supports negative values, zero, fractional seconds, and carries across 60 seconds and 60 minutes. The implementation no longer converts the full seven-digit-degree range to **integer microseconds in JavaScript**, which previously failed beyond the safe-integer range. It instead calculates components with adaptive output precision. At very large degree magnitudes, fractional seconds are not displayed with false precision that the independent 15-digit decimal model cannot retain.
- **Physical DMS key** sequentially inserts `°`, `′`, `″` after completed numeric components, and refuses to skip required inputs. The key in COMP result mode toggles decimal ↔ DMS while preserving `Ans` and the underlying numeric result. Values outside the DMS display range produce a visible explanation instead of a bogus DMS result.
- **Mode and modifier distinction:** plain DMS entry is restricted to COMP. `ALPHA+DMS` retains independent register B input; `SHIFT+DMS` retains its separate result-only function and is not confused with ordinary DMS conversion.
- The REA-082 DRG degree suffix `90°` remains valid as a **single unit suffix**, not a malformed three-component DMS token. Full `2°15′18″` is treated as a sexagesimal number. Trigonometric per-operand suffixes are unaffected.

## Verified mathematical examples

| Input | Web calculation | Expected DMS display |
| --- | --- | --- |
| `2°20′30″+0°39′30″` | 3 | `3°0′0″` |
| `2°15′18″` | 2.255 | `2°15′18″` |
| `-2°30′0″` | -2.5 | `-2°30′0″` |
| `2°30′0″-3°0′0″` | -0.5 | `-0°30′0″` |
| `2°30′0″*2` | 5 | `5°0′0″` |
| `2°30′0″/2` | 1.25 | `1°15′0″` |
| `0°0′59.9999999″` | about 0.01666666664 | `0°1′0″` (carry on display rounding) |
| `9999999°59′59″` | approximately 9999999.99972222 | `9999999°59′59″` |

The final two rows are independent web precision policies; exact native second-fraction rounding and input eligibility require physical-device testing.

## Testing

From repository root:

```sh
node calculator/tests/rea083-sexagesimal.cjs
node calculator/tests/rea082-drg-angle.cjs
python calculator/reference/rea-083/test_dms_browser.py
```

**Executed in source-level JavaScript harness:**
- **REA-083:** 78 deterministic checks passed — signed inputs, arithmetic, DMS formatting, carry behavior, range limits, malformed syntax, input key progression, DMS result toggle/Ans immutability, model/SHIFT/ALPHA key separation and compatibility with DRG degree suffixes.
- **REA-082:** 69 source checks passed — suffix degrees/radians/grads, nested trig and SETUP persistence.
- Changed JS syntax verified.

**Committed, not executed here:**
- `reference/rea-083/test_dms_browser.py` — Playwright Chromium real-key trace on all three model profiles; local HTTP hosting, physical DMS entry, result toggles, arithmetic, invalid fields, large-range display, ALPHA/SHIFT routing and CMPLX restriction.
- `.github/workflows/rea083-sexagesimal.yml` — runs both source suites and the browser test.

## Known limitations and acceptance remaining

1. **Run browser/CI** before claiming the actual browser menu, caret, key and LCD display sequences pass. Source tests do not certify DOM rendering or event integration.
2. **Native hardware comparison** remains outstanding: compare original, PLUS and PLUS C key traces, rounding of fractional seconds, signed zero presentation, precision at the seven-digit boundary, display truncation/scrolling and conversion error messages.
3. The independent implementation models DMS in decimal **degree quantities**, and conversion outputs are bounded. Complete native behavior for combinations outside documented basic sexagesimal arithmetic, advanced modes, and the exact CASIO firmware rounding algorithm is not yet certified.
4. The independent DMS formatter displays up to six fractional second places at small magnitudes but reduces display precision at large magnitudes; this avoids invented digit accuracy and **is not a verified CASIO formatting algorithm**.
5. Synchronizing the standalone single-file calculator remains separately tracked under REA-100.

**REA-084 was not started.**
