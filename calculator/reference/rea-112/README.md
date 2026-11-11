# REA-112 — Preserve STAT internal precision in Ans

## Defect

The independent calculator previously built STAT menus using `REG.format(value)`, which rounds each value to 12 significant decimal digits. When a user selected a displayed item, `statMenuResult()` parsed the **display text** back into a Number and assigned it to `state.ans` and `state.raw`. This discarded working precision before further arithmetic.

For X = [0, 2] in 1-VAR, the sample standard deviation is `Math.SQRT2 = 1.4142135623730951`, but the displayed line is `s X = 1.41421356237`. The old selection path stored `1.41421356237` in `Ans`.

## Fix

- `calculator/js/app.js` now passes the source statistics object into `statMenuResult()`, not only the rounded string lines.
- The menu builds its unchanged labels using the existing `REG.sumLines()`, `REG.varLines()`, `REG.minMaxLines()`, or `REG.regLines()`.
- An ordered numeric array maps the displayed entries to **original full-precision values**, covering 1-VAR and paired Sum/Var/MinMax as well as linear and quadratic Reg.
- Selection writes the original finite, in-range number to `state.ans` and `state.raw`, while retaining the existing rounded display line.
- Null, non-finite and out-of-range results still raise `Math ERROR` **at selection time**, preserving the REA-111 per-entry error isolation.
- `calculator/fx991_fresh_standalone.html` contains the exact updated canonical `app.js` text.

## Verification

The new Node test `calculator/reference/rea-112/test_stat_precision.js` extracts the production `statMenuResult()` function from canonical `app.js`, invokes it with realistic STAT data, mocks the actual menu callbacks, and checks full-precision `Ans`, display lines, every category's mapping, and invalid selections.

| Test suite | Direct assertions passed |
|---|---:|
| REA-112 STAT internal precision | 25 |
| REA-111 isolated STAT menu errors | 24 |
| REA-110 weighted QR | 53 |
| REA-109 quadratic roots | 50 |
| REA-108 linear regression | 55 |
| REA-107 paired STAT | 28 |
| **Total** | **235** |

Tests were evaluated using the committed JavaScript source in a direct in-session execution harness. The REA-112 test also uses native Node `fs` and `path` imports when executed by CI.

The new GitHub Actions workflow is `.github/workflows/rea112-stat-precision.yml`. It checks JavaScript syntax, executes all six native suites, and runs `python3 calculator/tools/build_standalone.py --check`.

## Validation limits

GitHub Actions completion, complete browser/physical-key traces, standalone build-script execution, and comparison against physical CASIO hardware have **not been independently verified** in this session. Source-level correctness does not establish hardware parity.
