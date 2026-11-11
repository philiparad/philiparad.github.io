# REA-084 — Original fx-991ES STAT 1-VAR Distr functions

**Scope:** Original `fx-991es` only; regression and browser checks explicitly ensure PLUS/PLUS C are unaffected.

**Implementation status:** source module, calculator menu and expression-prompt integration, source tests and CI committed. JavaScript source regression: **84 checks passed**. Browser and physical-manufacturer parity are not yet confirmed.

## Authoritative source

- [CASIO original fx-991ES User's Guide, pages E-47–E-49, STAT / Distr](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ES_991ES_EN.pdf).
- [CASIO PLUS reference explaining the same four mathematical functions](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-570ESPLUS_991ESPLUS_EN.pdf).

In the original **STAT 1-VAR** calculation context, `SHIFT + 1 (STAT) → 7 (Distr)` provides `1:P(`, `2:Q(`, `3:R(`, and `4:▶t`. With `t` a standardized value, `P(t)` is the normal CDF to its left, `Q(t)` the signed normal integral from 0 to t, and `R(t)` the complementary upper tail. `x▶t = (x−meanX)/populationSDX` uses **population**, not sample, standard deviation from the current STAT table, including FREQ counts.

## Source changes

- `calculator/js/stat-normal.js`: bounded deterministic standard-normal integral using adaptive Simpson quadrature, symmetry and tail handling, with `P`, `Q`, `R` and `t` evaluation. Rejects invalid/unavailable data and sigma=0.
- `calculator/js/app.js`: original model, single-variable STAT menu item `7. Distr` routes to the four-item menu. Paired regression keeps item `7. Reg`; PLUS/PLUS C existing menu structure is not changed. Choosing an item opens a labeled numeric prompt with editable value; after successful validation the result and original input label are shown in the STAT output and numeric Ans is updated. Subsequent `P(Ans)` uses the previous normalized value.
- `calculator/js/app.js`: `SHIFT + 1` on the STAT calculation edit/result screen now opens the STAT command menu without mistakenly reselecting MODE STAT and clearing the stored observations.
- `calculator/index.html`: loads the new normal module ahead of app controller.
- `calculator/tests/rea084-stat-normal.cjs`: 84 deterministic checks.
- `calculator/reference/rea-084/test_stat_distr_browser.py`: Playwright key/menu/STAT data entry test, original and unaffected PLUS models.
- `.github/workflows/rea084-stat-distr.yml`: runs the unit suite and Chromium browser test.

## Mathematical examples

The documented weighted data are:

| X | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 9 | 10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FREQ | 1 | 2 | 1 | 2 | 2 | 2 | 3 | 4 | 2 | 1 |

The table has n=20, mean X=5.1, population SD X≈2.7549954627911823.

`3▶t` = (3−5.1)/2.7549954627911823 ≈ **−0.7622517091**, and `P(Ans)` ≈ **0.2229548948** (Fix3: **0.223**). For X=7, standardized t≈0.6896563082 and upper tail `R(t)`≈**0.2452051741**. The numerical methods also return `P(0)=R(0)=0.5`, `Q(0)=0`, `Q(−1)≈−0.3413447461`, and `P(t)+R(t)=1`.

These values were directly checked in the source-execution harness against independently known reference probabilities and documented CASIO Fix3 examples.

## Usage and verification

From the repository root:

```sh
node calculator/tests/rea084-stat-normal.cjs
python calculator/reference/rea-084/test_stat_distr_browser.py
```

**Executed in this session:** 84 source-level JS tests passed for the official weighted sample, normal area/tail/symmetry, probability boundaries, weighted sigma, undefined/missing sigma, signed standardized values, and original-only STAT menu/source wiring. Changed JavaScript modules passed syntax compilation in the harness.

**Committed, not executed:** the Playwright browser test and its GitHub Actions workflow. The browser test drives the real DOM calculator keys, enters 1,2,3 in STAT, checks `▶t` then `P(Ans)`, checks `Q(0)` and `R(0)`, error/cancel handling and original paired vs PLUS menu distinctions. Browser execution remains pending because the available environment could not retrieve the GitHub repository into a browser runtime.

## Known limits and acceptance tasks

1. Execute and inspect Playwright/CI. Source-level checks cannot prove DOM prompt/menu correctness.
2. Compare original fx-991ES display sequences and numeric rounding against actual calculator or authorized emulator, particularly the STAT calculation screen syntax (native menu inserts `P(`, `Q(`, `R(`, and postfix `▶t` into the calculation line; this independent implementation uses **labeled LCD numeric prompts**, not full native inline editing).
3. Verify normal distribution numerical accuracy and acceptable native rounding at extreme tails. The adaptive quadrature is an independent approximation rather than a reproduction of CASIO ROM.
4. Confirm invalid-dataset behavior and sample editing navigation against real hardware before closing the issue.
5. PLUS and PLUS C normal distribution menu behavior is **outside this issue's explicitly original-only scope**. Their existing menus remain unchanged.
6. Standalone single-file calculator synchronization remains tracked by REA-100.

**REA-085 not started.**
