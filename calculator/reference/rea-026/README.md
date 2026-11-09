# REA-026 — S⇔D and improper/mixed fraction conversion

## Scope and manufacturer reference

Implemented result-display conversions for the independent CASIO-inspired simulator. CASIO's fx-991ES PLUS C instructions state that S⇔D switches supported fraction/decimal, surd/decimal and π/decimal forms; SHIFT+S⇔D switches improper/mixed fraction displays. Conversion is not available for some results, and mixed-fraction output must be within the documented 10-character limit.

Official references:
- [fx-991ES PLUS C User's Guide, "Toggling Calculation Results"](https://support.casio.com/pdf/004/fx-115_991ES_PLUS_C_E.pdf)
- [CASIO Fraction Calculations](https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/basic_calculations/fraction_calculations.html)

## Implementation

- S⇔D only toggles when a supported exact fraction or symbolic representation exists. Scientific results with no exact alternative retain their decimal form; no inferred approximate fraction is manufactured.
- SHIFT+S⇔D toggles the currently displayed improper/mixed form, without modifying the persistent fraction-style SETUP preference.
- Mixed fraction presentation enforces the 10-character result length limit. A result that exceeds the limit remains an improper fraction.
- The original raw numeric result, Ans and exact BigInt rational metadata are preserved.
- Both `js/app.js`, `js/result-format.js` and `fx991_fresh_standalone.html` were updated consistently.

## Tests

```sh
node calculator/reference/rea-026/test_conversion.js
python3 calculator/reference/rea-026/test_conversion_browser.py
```

The browser suite requires Playwright/Chromium and tests both distributions. The implementation has also been exercised in an in-memory calculator DOM harness. Hardware-level LCD, conversion timing, repeating-decimal options, and native-result conversion parity remain **unverified**, pending authenticated CASIO reference captures. This task does not implement the next CSV item.
