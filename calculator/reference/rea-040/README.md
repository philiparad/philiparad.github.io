# REA-040 — Consistent Ans/PreAns, chaining, recall and repeat

This increment implements only REA-040 of the original REA backlog.

## Primary manufacturer reference
[CASIO fx-991ES PLUS C (2nd edition), Using Memory Functions](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/basic_calculations/memory_functions.html).

The last successful result is stored in **Ans**; the preceding result moves to **PreAns**. PreAns is COMP-only and is cleared on leaving COMP. CASIO demonstrates a Fibonacci series **1, 1, 2, 3, 5**, the chained expression `3×4 = 12`, then `Ans÷30 = 0.4`, and persistence across AC and OFF. The exact key behavior of every advanced-mode output is not established by the reference.

## Implementation

* `js/app.js`: `setResult()` is the shared, guarded result transition for COMP and scalar advanced-mode calculations. Failed calculations do not mutate answer memory or append history.
* `applyAdvancedResult()` now calls the same result pipeline, fixing the previously missing PreAns and history updates for scalar STAT, CMPLX, BASE-N, EQN, MATRIX, VECTOR, VERIFY and DIST workflows. Complex imaginary-part persistence is **not** solved here (REA-045).
* Following a result with `+`, `−`, `×` or `÷` automatically opens a new expression beginning with `Ans`, without prematurely changing Ans/PreAns; entering a digit still starts fresh.
* ALPHA + ANS inserts `PreAns` in COMP. Repeated = recalculates an expression against updated Ans/PreAns (Fibonacci example); no unverified alternative repeat algorithm is claimed.
* CALC variable substitution evaluates the proposed value and expression first, then commits the register and result only after success.
* STO on an already displayed result does not move Ans to PreAns again. RCL and M+/M− continue using the common calculation result mechanism.
* The modular and standalone controllers are synchronized.

## Tests

```sh
node calculator/reference/rea-040/test_ans_preans.js
python3 calculator/reference/rea-040/test_browser.py
```

The self-contained Node test uses a fake DOM and tests the full controller. Earlier REA-021–REA-039 suites are also regression gates. Browser execution with Playwright/Chromium and physical-device parity remain unverified.

REA-041 is not included.
