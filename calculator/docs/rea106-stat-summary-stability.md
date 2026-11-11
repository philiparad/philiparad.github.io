# REA-106 — Numerically stable 1-VAR STAT summary and range isolation

Issue: https://github.com/philiparad/philiparad.github.io/issues/60

## Defect

The original `calculator/js/stat-regression.js` calculated `Σx²` and `Σ(x−mean)²` with the same hard output bound applied to every intermediate. This made a representable mean or population standard deviation unavailable when only the intermediate square exceeded the LCD range. For example, the 1-VAR dataset `[1e50, -1e50]` previously raised `Math ERROR`, even though `meanX=0` and `xσn=1e50` are finite and within the modeled result range.

This issue concerns a mathematical implementation defect in an independent emulator. The manual and physical device have **not** been proven to use these internal algorithms.

## Changes committed

- `calculator/js/stat-regression.js`: for **1-VAR only**, calculate the weighted mean and weighted population standard deviation using normalized/scaled residuals. The sample standard deviation uses the conventional factor `sqrt(n/(n-1))`. This avoids squaring huge inputs before computing σ.
- Keep raw `sumX`, `sumX2`, and `sampleSDX` internally even when their magnitudes exceed the calculator's *displayable* numeric range; selecting an unrepresentable aggregate throws `Math ERROR`. The variance field is an intermediate diagnostic and is not exposed as a separate calculator result.
- Replace `Math.max(...rows)` and `Math.min(...rows)` for 1-VAR with folds, avoiding JavaScript argument-stack overflow on large tables.
- The *paired* STAT regression path is intentionally unchanged.
- `calculator/js/stat-parameters.js`: reject out-of-range `StatSumX`, `StatSumX2`, and `StatSampleSDX` when they are selected as calculator registers, while permitting valid `StatSDX` and `StatMeanX`.
- `calculator/fx991_fresh_standalone.html`: synchronized both edited modules from canonical source.
- `.github/workflows/rea100-standalone-sync.yml`: added REA-106 Node tests and browser smoke tests to the standard release gate.

## Source-level test examples

| Dataset | Population mean | Population σ | Expected behavior |
| --- | ---: | ---: | --- |
| `[2,4,6]` | 4 | 1.632993161855452 | Ordinary 1-VAR values unchanged |
| `[1e50,-1e50]` | 0 | 1e50 | Population σ valid; `Σx²` selection raises `Math ERROR` |
| `[1e90,-1e90]` | 0 | 1e90 | Stable population σ |
| `[8e99,-8e99]` | 0 | 8e99 | Population σ valid; sample σ selection raises `Math ERROR` |
| `[1,3,5]` with FREQ `[1,3,2]` | 10/3 | approximately 1.374368542 | Weighted sample respected |

Other tests include FREQ edits, FREQ=0 exclusion, `X▶t` normalization, `P(X▶t)` and `R(X▶t)` composition, one-row data, zero variance, no data mutation, and an unchanged paired linear regression case.

### Test commands

From repository root:

```bash
node calculator/tests/rea106-stat-stability.cjs
python3 calculator/tests/rea106_browser_stat_stability.py
python3 calculator/tools/build_standalone.py --check
python3 -m unittest discover -v -s calculator/tests -p 'test_rea100_standalone.py'
```

**84 isolated JavaScript regression checks passed** against committed source files in the JavaScript harness. The browser test starts actual original/PLUS/PLUS C STAT mode in Chromium and then compares live module calculations between modular and standalone publications. The Chromium browser test, native Node/Python tests and GitHub Actions jobs were **committed but not executed/confirmed** in this session.

Direct source-inspection synchronization checked canonical index HTML, CSS, manifest, all 46 module order slots and exact embedded source text for the modified modules. This does not prove physical CASIO firmware/LCD parity. Physical hardware captures and independent review remain required under REA-099.

## Limits

- The physical STAT editor supports a much smaller number of rows than the standalone summary API's 100,000 weighted-observation limit. The large-table regression protects the mathematical helper from host JavaScript argument-stack failures, not a real calculator's input capacity.
- When the summary is requested as a combined panel containing *every* aggregate, an oversized sum can still produce `Math ERROR`. The original-model individual parameter menu allows a valid mean or population σ to be selected independently.
- More extensive checks are required for extreme floating-point cancellation, internal precision at 10-digit display accuracy, and genuine original/PLUS/PLUS C reference-device behavior.

REA-106 code and automated tests are committed; issue #60 remains open pending runtime/device verification. REA-107 has not been started.
