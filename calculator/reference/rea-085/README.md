# REA-085 — Original fx-991ES STAT menus and symbolic parameter insertion

**Status:** Source implementation committed on `main`. Source regression **51 passed**, REA-084 compatibility regression **84 passed**. Playwright and native hardware have **not** been verified.

## Manufacturer basis

[Original fx-991ES manual](https://support.casio.com/pdf/004/fx-115ES_991ES_Eng.pdf), pp. E-47–E-51. The original STAT command menu is:

| Key | 1-VAR | Paired variables |
| --- | --- | --- |
| 1 | Type | Type |
| 2 | Data | Data |
| 3 | Edit | Edit |
| 4 | Sum | Sum |
| 5 | Var | Var |
| 6 | MinMax | MinMax |
| 7 | Distr | Reg |

The original Sum / Var / MinMax / Reg commands are **symbols inserted into the calculation source**, not menu items that instantly replace the expression with a calculated number.

- **1-VAR Sum:** Σx², Σx
- **1-VAR Var:** n, mean x̄, population xσn, sample xσn−1
- **1-VAR MinMax:** minX, maxX
- **Paired Sum:** Σx², Σx, Σy², Σy, Σxy, Σx³, Σx²y, Σx⁴
- **Paired Var:** n, x̄, xσn, xσn−1, ȳ, yσn, yσn−1
- **Paired MinMax:** minX, maxX, minY, maxY
- **Linear Reg:** A, B, r, x̂, ŷ
- **Quadratic Reg:** A, B, C, x̂1, x̂2, ŷ

## Source changes

- **`js/stat-parameters.js`:** immutable original-model submenus with physical item numbering, unique editor token names (e.g. `StatSumX2`, `StatMeanX`, `StatRegB`), dynamic token discovery and parameter resolution from the current committed STAT table.
- **`js/app.js`:** original fx-991ES `SHIFT+1` displays the seven-entry menu without clearing sample data; Sum, Var, MinMax and Reg submenus preserve documented context and parameter order. Selecting a parameter inserts a symbolic identifier into the editable calculation instead of writing an immediate result.
- **`js/app.js`:** the `=` key in the original STAT calculation editor resolves all referenced parameters with `REG.summary` or `REG.fit`, merges them into an ephemeral expression evaluation scope and only on success commits the resulting scalar to Ans and the result screen. Existing A/B/C/M/X/Y registers are not overwritten with regression coefficients.
- **Regression estimates:** x̂ and ŷ entries open a numeric prompt for the input value; quadratic regression supports first/second roots. Invalid fits or missing roots do not commit Ans.
- **Editor-origin handling:** selecting from the STAT data table or a prior result starts a fresh expression; selecting during an active editable source inserts at the caret. `AC` cancels menus without changing already committed data.
- **`index.html`:** loads the new resolver before the controller.
- **PLUS/PLUS C:** existing generic selector menu remains unchanged: this is an original-model-only task, and REA-084 normal distribution options remain available in original 1-VAR.

### Independent internal editor token format

The web implementation displays `StatMeanX`, `StatSumX2`, etc. as readable internal symbolic identifiers. This is **not** yet a pixel/typographic reproduction of CASIO's STAT parameter glyphs. It preserves the important semantic distinction: commands insert references, and values are calculated only when the expression is evaluated.

The token value is *live*, not a literal. If the sample table is edited and the same source re-evaluated, the command reads the updated table. Variable registers retain their normal meaning; regression coefficient names use a separate namespace.

## Verified examples

For X observations 1, 2, 3 with frequencies 2, 3, 1:

| Symbol | Value |
| --- | ---: |
| n | 6 |
| Σx | 11 |
| Σx² | 23 |
| x̄ | 11/6 ≈ 1.833333333 |
| xσn | ≈ 0.687184271 |
| xσn−1 | ≈ 0.752772653 |
| minX | 1 |
| maxX | 3 |

Examples:
- `StatSumX2+StatSumX` evaluates to **34**.
- `StatMeanX*StatN` evaluates to **11**.
- `StatSumX+A` works with an independently stored A value; the statistical command does not assign to A.
- Paired (1,3), (2,5), (3,7), (4,9) have regression coefficients A=1, B=2, r=1 and SumY²=164.
- Empty samples, missing Y data, undefined sample standard deviation (n=1) and degenerate paired regressions are reported as errors at evaluation rather than prematurely modifying Ans.

## Verification and reproduction

From repository root:

```sh
node calculator/tests/rea085-stat-parameters.cjs
node calculator/tests/rea084-stat-normal.cjs
python calculator/reference/rea-085/test_stat_parameters_browser.py
```

**Observed in connector-backed source execution:** 51 REA-085 checks passed, 84 REA-084 checks passed, and edited JavaScript passed syntax validation. Tests cover menus, normalized/statistical parameters, frequency, combined arithmetic, symbolic storage, live recalculation, invalid/empty data, coefficients, regression roots, 1-VAR/paired separation, and source controller integration.

**Committed, not yet executed in this session:** Playwright `reference/rea-085/test_stat_parameters_browser.py`, which hosts the calculator on localhost HTTP, drives the DOM keys through STAT data entry, original Sum/Var/Reg menus and arithmetic, errors, cancellations, and PLUS/PLUS C isolation. GitHub Actions workflow: `.github/workflows/rea085-stat-parameters.yml`.

## Remaining acceptance / limitations

1. **Run CI/browser tests** and investigate any actual UI regressions before marking the task hardware-equivalent.
2. **Real fx-991ES LCD comparison:** verify the exact printed source glyphs, submenu pages, estimates' inline behavior, cursor positioning and immediate result display. The web's readable internal parameter tokens and estimate prompts are a deliberate approximation.
3. **Regression X estimates:** multiple roots for quadratic regressions depend on independent fit and root ordering; compare with the device.
4. **Advanced grammar:** combinations with unsupported operations or formatting may differ from actual CASIO firmware and must be separately validated. Input length remains limited by the web editor.
5. **PLUS-family menus:** unchanged intentionally; if fidelity issues exist there, handle them in a separately scoped issue.
6. **Standalone all-in-one synchronization:** tracked under REA-100, not modified here.

**REA-086 not started.**
