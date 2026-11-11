# REA-094 — Original fx-991ES scientific constants (CASIO Appendix #114)

## Status
**Code corrected and committed; full original-model appendix fixture checked in source-level JavaScript tests.**
Physical CASIO parity and a real browser-key/DOM trace are not verified. Leave GitHub issue #48 open until they are.

Issue: https://github.com/philiparad/philiparad.github.io/issues/48

## Manufacturer-issued references
- Original fx-991ES User's Guide, page E-65 states that the constants use **ISO Standards (1992) and CODATA Recommended Values (1998)**:
  https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ES_991ES_EN.pdf
- CASIO *fx-115ES / fx-570ES / fx-991ES Appendix*, **example #114**, printed pages 46–47, enumerates all 40 codes and numeric values:
  https://support.casio.com/pdf/004/fx-115ES_570ES.etc_Appendix.pdf

Both printed Appendix pages were inspected, including the last six entries on page 47. Codes 01–40 were entered from this manufacturer appendix rather than being inferred from general NIST 1998 data; that preserves calculator-specific rounding and adopted ISO values.

## Implementation
`calculator/js/scientific-constants.js`:
1. Original model `fx-991es` now selects the **1998** profile instead of the previous **2002 surrogate**.
2. `ORIGINAL_1998` contains 40 manufacturer-printed numeric strings, in original keypad code order.
3. Each item contains `printed1998`, and `select('fx-991es', code)` exposes a numerical `value`, `year:1998`, and `printedValue` retaining the appendix's significant digits and zeroes.
4. Existing PLUS/PLUS C 2014 candidate data are untouched and still selected independently. Their hardware accuracy remains a separate question; this change does not certify those catalogs.
5. Molar-volume constant's descriptive name is no longer incorrectly tied to a modern 100-kPa condition on the original model. Code 26's original value is `22.413996e-3` m³/mol.

### Important example discrepancies from the previous surrogate
| Code | Constant | Original Appendix #114 |
| --- | --- | --- |
| 01 | Proton mass | `1.67262158e-27` kg |
| 06 | Planck constant | `6.62606876e-34` J·s |
| 19 | Electron magnetic moment | `-928.476362e-26` J/T |
| 26 | Ideal gas molar volume | `22.413996e-3` m³/mol |
| 28 | Speed of light | `299792458` m/s |
| 39 | Gravitational constant | `6.673e-11` m³/(kg·s²) |
| 40 | Standard atmosphere | `101325` Pa |

The source stores printed significant digits; this is **not** a claim that the LCD displays every appendix digit simultaneously.

## Regression verification
Run from repository root:
```bash
node calculator/tests/rea094-original-constants.cjs
```

**305 checks passed in an isolated JavaScript harness** executed against GitHub-source modules. The suite was committed to the repository.
- All 40 original code positions and manufacturer-printed significant-digit strings
- All 40 corresponding numeric values and edition metadata
- All 40 valid arithmetic insertion literals
- PLUS and PLUS C model-isolation across 80 code lookups
- Representative early/late-code boundaries and invalid codes
- Two-key 01 and 40 input, backspace and invalid-key handling
- Static controller verification for `SHIFT+7`, BASE-N restriction, AC cancellation, DEL correction and literal insertion

## Remaining before closing
1. Execute committed suite using a native Node checkout or CI.
2. Perform browser keyboard/DOM traces of `SHIFT+7` → digits, AC cancellation, DEL correction and invalid 00/41.
3. Compare observed LCD precision and exponent formatting on physical original fx-991ES with the appendix values and current simulator.
4. Verify 40 constants in original model on real hardware; PLUS/PLUS C still require independent catalogs/hardware evidence.

This task intentionally stops at REA-094. REA-095 was not started.
