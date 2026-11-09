# REA-031 — factorial, nPr and nCr domains and precision

## Official basis
CASIO's **fx-991ES PLUS C (2nd edition)** calculation-range and precision table:
https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/technical_informatoin/calculation_ranges.html

- `x!`: x must be an integer from **0 to 69**, inclusive.
- `nPr` and `nCr`: integer `0 ≤ r ≤ n < 10^10`, subject to manufacturer product/range limits, with valid results below `10^100`.
- Internal arithmetic is **15 digits**; typical single-calculation display precision is ±1 in the tenth significant digit. Consecutive calculations can accumulate error.
- Key sequences: `SHIFT+RECIP` → !, `SHIFT+MUL` → nPr, `SHIFT+DIV` → nCr. Examples `10nPr4=5040`, `10nCr4=210`.

## Implementation
`calculator/js/math-engine.js` now computes factorial, permutations and combinations with bounded `BigInt` integer intermediates. No speculative floating-point rounding of combinations; exact integers are converted at the **final step** to the existing 15-significant-digit numerical core. Exceeding the documented range or using invalid operands raises `Math ERROR`. Large but valid values with small `r` (including `9999999999nCr1`) no longer fail due to an artificial `n ≤ 170` ceiling.

Input parsing, priority rules and the already-mapped keyboard shortcuts are preserved. The inline standalone engine matches the modular one. The change does not alter REA-032 trigonometry or other unrelated features.

## Verification
```sh
node calculator/reference/rea-031/test_combinatorics.js
python3 calculator/reference/rea-031/test_browser.py
```

Run the earlier REA-021–REA-030 Node suites as regressions.

**Limitations:** The approximation reproduces documented input/result bounds but does **not** certify bit-exact firmware intermediate rounding, error-location offsets or hardware LCD positions. The Playwright script is provided for optional browser execution; development-time tests use a simulated browser DOM.
