# REA-104 — Original fx-991ES STAT normalized variate X▶t

Issue: https://github.com/philiparad/philiparad.github.io/issues/58
Parent audit: REA-084 / issue #34

## Manufacturer behavior

Original CASIO fx-991ES / fx-115ES User's Guide, printed page **E-49**, PDF page **51** (zero-based PDF page index 50):
https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ES_991ES_EN.pdf

The original single-variable STAT calculation submenu is:

**SHIFT → 1 (STAT) → 7 (Distr) → 4 (▶t)**

The manual prints the **postfix** operation `X▶t`, not a `t(X)` function. It computes:

`t = (X - meanX) / populationSDX`,

using the currently stored STAT editor observations, with FREQ values when enabled. It uses **population** `xσn`, *not* sample `xσn-1`, and it is a **standardized normal variate**, not a Student t-distribution probability.

## Implementation

- `calculator/js/math-engine.js`: recognize literal postfix token `▶t`, apply it at postfix precedence (like factorial), require original `fx-991es` model in `STAT` / `1VAR` context, and compute the normalized value with `FreshStatNormal.normalized(x, opts.statSummary)`. The function rejects unsupported modes/editions with `Argument ERROR` and zero or invalid standard deviation with `Math ERROR`.
- `calculator/js/app.js`: STAT Distr option 4 inserts the postfix token `▶t` into the editable expression rather than opening an unrelated prompt. Existing expressions can append it. On result-origin insertion, `Ans▶t` is created for continuation.
- The original STAT equals-key path commits the active table cell and obtains `REG.summary(state.statTable)` **at evaluation time**. This preserves edits and frequency-weighted rows, including zero-weight rows. Ans is updated only after a successful result.
- The general expression path also supplies the summary in original-model STAT context where needed, without granting newer editions the command.
- `calculator/fx991_fresh_standalone.html`: regenerated changed script modules from canonical source; script load order, canonical HTML, CSS and capability manifest consistency inspected.

No changes to PLUS C's dedicated DIST mode or to physical hardware evidence.

## Numerical reference examples

For X observations `{2, 4, 6}`, `mean=4`, `population σ=sqrt(8/3) ≈ 1.632993161855452`:

| Input | Result |
| --- | ---: |
| `2▶t` | -1.224744871391589 |
| `4▶t` | 0 |
| `6▶t` | 1.224744871391589 |
| `P(6▶t)` | 0.8896643190400766 |

For X observations `{1,3,5}` with FREQ weights `{1,3,2}`, the mean is `10/3` and population σ ≈ `1.374368541873`: `5▶t ≈ 1.212678125181665`.

An unchanged X sample with a changed frequency changes the derived population mean and σ. Zero variance, empty data, one observation and missing summary must not silently return a numeric result.

## Regression

```bash
node calculator/tests/rea104-stat-normalized-t.cjs
```

**106 isolated JavaScript checks passed** against the committed sources. Checks cover:

- Population vs sample standard deviation in a set of eight unweighted and weighted datasets.
- Negative/zero/positive standardized values, `Ans▶t`, and direct `P/Q/R` chaining.
- 3 model profiles × 4 modes × 2 permission states, including non-STAT rejection.
- Zero-variance, single-observation, missing or invalid summary and malformed expression errors.
- Frequency edits and excluded zero-weight rows.
- No mutation of the original observation data.
- Executable mocked STAT menu action: postfix append, result-origin Ans reuse, and PLUS C restriction.
- Original STAT equals-key route explicitly commits editor changes and calculates a fresh weighted summary.

Committed browser test:

```bash
python3 calculator/tests/rea104_browser_stat_t.py
```

This script attempts a real browser key sequence: original STAT 1-VAR → enter 2,4,6 → AC → input 6 → SHIFT 1, 7, 4 → = → AC → P(Ans), comparing modular and standalone outputs.

## Remaining verification

The regression suite was run in an **isolated JavaScript harness**, not as a native Node test. The Playwright script was committed but was **not executed in Chromium**; the actual browser keypad/LCD sequence remains unverified. Confirm browser editing, display rounding in all I/O formats, FREQ ON/OFF transitions, cancellation and error recovery. Physical CASIO fx-991ES captures and independent device-to-browser comparison are still needed under REA-099 before claiming firmware or hardware parity.

Issue #58 should remain open until browser and actual-device evidence is collected. This is the last scoped task: do not begin a new task.
