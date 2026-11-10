# REA-079 — SOLVE iteration, initial X and L−R result UI

**Scope:** original fx-991ES, fx-991ES PLUS, fx-991ES PLUS C. **Implementation status:** committed modular HTML/JS files, source tests passed. Actual Playwright execution and manufacturer-device parity remain pending.

## Manufacturer evidence

- [Official CASIO fx-570ES PLUS / fx-991ES PLUS — Using SOLVE](https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/function_calculations/using_SOLVE.html).
- [Official CASIO fx-115ES PLUS / fx-991ES PLUS C — Using SOLVE](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/function_calculations/using_SOLVE.html).
- [Original fx-991ES reference manual](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ES_991ES_EN.pdf).

CASIO specifies SOLVE is only available in COMP, uses Newton's method, prompts for the non-X variables (e.g. Y, A, B), then displays `Solve for X` with current X as the initial guess. Results are decimal and include the original equation, X, and `L−R` (left side minus right side at that X). `AC` exits. If the solver does not converge within its preset iterations, a `Continue: [=]` screen permits further iteration; `AC` cancels.

The web implementation uses independently designed 20-step Newton chunks, a 100-step hard cap and a 1e-10 default numerical threshold. **Those values do not represent measured CASIO internal iteration parameters.**

## Changes

- `js/solve-session.js`: parse a full source expression/equation, detect non-X variables in first-reference order using the existing CALC register scanner, and create LCD field prompts. A final `Solve for X` prompt uses the X register as its default. Prompt values are validated without changing memory; the model's register set is enforced.
- `js/solve-session.js`: return structured solution lines `[expression, 'X= ...', 'L-R= ...']`. The left-right residual is computed at the converged root, not a dummy zero. Added resumable chunked Newton iteration with an explicit numerical state: current X, current f(X), last step, and iteration count. It rejects no-root and pole cases rather than displaying a non-root.
- `js/numeric-worker.js`: imports the SOLVE module and advances numerical state in an off-main-thread worker. When a chunk exhausts without converging, it sends `{continue:true,resume}`; the next `=` resumes from that state, not from the original guess. Non-SOLVE tasks continue using their existing routines.
- `js/app.js`: `SHIFT+CALC` starts SOLVE from the **already entered expression**, rather than asking for the expression again. It prompts referenced registers, then X, on the existing LCD field editor. Upon success it atomically commits supplied register values and the solved X **only**, retaining Ans. The screen lists the expression, X and L−R for LCD scrolling. `=` restarts SOLVE from its previous source and the newly stored X; `AC` exits.
- `js/app.js`: `Continue: [=]` is a real continuation with retained state and no early memory writes. Canceling while calculating or on the continue prompt discards the incomplete run. Errors during prompt evaluation or worker execution leave original memory unchanged.
- `calculator/index.html`: registers SOLVE source ahead of the calculator controller.
- `tests/rea079-solve-session.cjs`, `reference/rea-079/test_solve_browser.py`, and `.github/workflows/rea079-solve-flow.yml`: deterministic and browser-key tests across all three models.

## Supported examples

| Expression | Prompts | Starting X | Expected behavior |
| --- | --- | --- | --- |
| `X^2-2` | Solve for X | 1 | X ≈ 1.414213562; L−R very near 0 |
| `Y=A*X^2+B` | Y, A, B, then X | 1 | Y=0, A=1, B=-2 → X ≈ 1.414213562 |
| `X^2=4` | Solve for X | 1 | X ≈ 2 |
| `X^2-2` | Solve for X | -1 | X ≈ −1.414213562 |
| `X^2+1` | Solve for X | 1 | Can't Solve; no register updates |
| `1/X` | Solve for X | 0 | Math ERROR; no register updates |
| `(X-1)^7` | Solve for X | 2 | Can reach genuine Continue state; next = advances iterations |
 
### Numerical and memory semantics

- An equation `L=R` is solved by evaluating `L-R` at each Newton step. A plain expression `f(X)` is treated as `f(X)=0`.
- Other variables use their prompted values. Their entries and X remain uncommitted during calculation, failure or cancellation.
- SOLVE output is a decimal X, followed by decimal L−R. No unsupported native radical formatting is asserted.
- Ans remains untouched by SOLVE in this independent model. CASIO X-register update behavior and any side effects on Ans, PreAns and stored data must still be verified on device.

## Verification

From repository root:

```sh
node calculator/tests/rea079-solve-session.cjs
python calculator/reference/rea-079/test_solve_browser.py
```

**Completed:** 35 source regression checks passed in a JavaScript execution harness; independent numeric-worker message handler was also invoked with imported source modules and successfully returned a root, a no-root rejection, a pole rejection, and *advancing* continuation states at 20 and 40 iterations. JavaScript source syntax validated.

**Committed, not executed in the current connector session:** Playwright test on real calculator buttons (all three models), and `.github/workflows/rea079-solve-flow.yml` CI workflow.

## Known limitations / remaining acceptance

1. Run Playwright Chromium and GitHub Actions, inspect the actual LCD, key paths, page scrolling and error screens for original, PLUS and PLUS C.
2. The independent 20-step Newton continuation and slope/line-search choices approximate a useful learning tool but do not replicate proprietary CASIO convergence thresholds, acceptance conditions, iteration budget or numeric precision. Native hardware/emulator traces are required.
3. The CALC/SOLVE variable grammar supports register references and expressions with X; special manual syntax such as `{equation},{solution variable}` solving for a non-X variable remains unimplemented, because this task explicitly targets **initial X and X result**. This is a documented gap, not silently claimed support.
4. Check shift/alpha controls, register persistence and cancellation via real device.
5. Unmodified companion all-in-one HTML is tracked in REA-100, not this issue.

**No REA-080 work was undertaken.**
