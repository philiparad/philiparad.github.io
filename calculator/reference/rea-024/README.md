# REA-024 — Calculator errors and cursor recovery

**Status:** Implemented with independent regression checks. Device-equivalent error cursor locations remain **unverified** because the REA-001 native-capture corpus is incomplete.

CASIO model-specific reference: https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/technical_informatoin/errors.html

## Changes

- `js/error-handling.js` centralizes error labels: Math ERROR, Stack ERROR, Syntax ERROR, Argument ERROR, Dimension ERROR, Variable ERROR (SOLVE), Can't Solve, Insufficient MEM, and Time Out.
- A bounded parentheses-depth check prevents extreme nesting from exhausting the JavaScript stack. This is an independent protective bound, **not** a measured CASIO numeric-stack capacity.
- For editable **linear** calculations, LEFT or RIGHT from the error display returns to the preserved expression with the caret near the offending token. The common manufacturer example `14/0*2` identifies the zero; inserting `1` produces `14/10*2 = 2.8`.
- AC on the error screen cancels and clears the expression; other keys leave the error screen in place.
- For structured textbook input, the tree remains intact, but exact nested cursor positioning has not been independently verified; this is deliberately not claimed.
- The LCD shows the classified error and cancellation/recovery key hints. The accessibility label includes recovery instructions.
- Both modular and standalone HTML are synchronized.

## Tests

```sh
node calculator/reference/rea-024/test_error.js
python3 calculator/reference/rea-024/test_error_browser.py
```

The browser test requires optional Python Playwright/Chromium and exercises both builds. In this development session, the controller recovery sequence was exercised with an in-memory mock DOM; the actual browser script is provided for later execution.

## Limitations

Not all error conditions can be reproduced in the current application. The error label catalog is broader than implemented advanced modes. Locations are best-effort for known syntax/domain patterns; not manufacturer-certified token offsets. More detailed domain validation and firmware-specific fault positioning must be compared against genuine device captures. REA-025 is outside this increment.
