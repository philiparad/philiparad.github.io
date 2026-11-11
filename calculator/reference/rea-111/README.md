# REA-111 — Isolate errors to individual STAT menu values

## Reproduced defect

The calculator's STAT `Sum` and `Var` menus previously called `REG.lines()`, which formatted every statistic in the menu before opening the selector. If **any** statistic exceeded the simulator's 9.999999999e99 numerical range, `format()` raised `Math ERROR` and suppressed the entire menu, even when other values were valid.

Representative cases:

| Data | Previously inaccessible valid result | Unavailable result |
|---|---|---|
| 1-VAR X = [1e50, -1e50] | Sum X = 0 | Sum X² = 2e100 |
| 1-VAR X = [9e99, -9e99] | Population Sigma X = 9e99 | Sample s X ≈ 1.27e100 |
| Paired X = [1e50, -1e50], Y = [3, 5] | Sum X = 0, Sum Y = 8, Sum Y² = 34 | Sum X², Sum X²Y, Sum X⁴ |

These are web simulator defects, not observations from an original Casio device.

## Fix

`calculator/js/stat-regression.js` now formats each menu item separately. When a value specifically exceeds the displayable range, that single line is represented as `<label> = Math ERROR` without suppressing other valid choices or changing the order of available entries.

The existing `calculator/js/app.js` selection logic checks `Number(line.split(' = ')[1])`, rejects non-finite values with `Math ERROR`, and keeps the error visible to the user. Thus an unavailable item still fails when selected; no fabricated finite number is presented.

The same behavior applies to `Sum`, `Var`, and the common `lines()` formatter. `N/A` remains unchanged for undefined correlation/sample values. Unexpected exceptions are rethrown rather than hidden.

## Verification

Direct in-session JavaScript execution against the committed modular source completed all five relevant test suites:

| Suite | Assertions passed |
|---|---:|
| REA-111 STAT result isolation | 24 |
| REA-110 weighted QR | 53 |
| REA-109 inverse quadratic roots | 50 |
| REA-108 linear regression | 55 |
| REA-107 paired STAT summary (updated for per-entry errors) | 28 |
| **Total** | **210** |

The updated REA-107 assertion now expects one unavailable sum to be marked as `Math ERROR` while `Sum X = 0` remains present. No numerical expectations were relaxed.

The standalone HTML includes the complete current `stat-regression.js` module text verbatim. The GitHub Actions workflow `.github/workflows/rea111-stat-menu-values.yml` runs the native Node suites, JavaScript syntax checks and `python3 calculator/tools/build_standalone.py --check`.

## Remaining validation

The authoring session did **not** independently execute GitHub Actions, the standalone build script, browser key/DOM interaction traces, or physical CASIO comparison. CI has been configured but its outcome must be checked separately. Full browser behavior and manufacturer parity remain unverified.
