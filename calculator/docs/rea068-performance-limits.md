# REA-068 — Performance limits and fail-safe execution

Scope: independent web calculator in `calculator/`, not a verified CASIO firmware port.

## Numerical workflows

The LCD-driven COMP operations **d/dx, ∫, SOLVE, Σ, Π** are submitted to `js/numeric-worker.js` using the immutable scalar setup and a copied memory snapshot. No mathematical expressions are evaluated on the main UI thread during these workflows. The main thread remains available for key handling, screen updates and cancellation.

- **AC:** cancel the running calculation and return to edit, without committing a result.
- **MODE:** cancel and open MODE selection.
- **ON:** cancel and restore the powered-on edit screen.
- **OFF/automatic power-off/model switch:** terminate any active calculation.
- **6,000 ms wall-time ceiling:** terminate the worker and show `Time Out` in the entry flow.
- **Worker failure:** error is reported in the existing prompt; `Ans` and `PreAns` are not changed.
- **Single active request:** starting another numerical operation terminates the prior worker. Late messages from cancelled workers are ignored because their job identity no longer matches.

The worker is independent of the calculator UI; it imports `decimal-core.js`, `number-format.js`, `sexagesimal.js` and `math-engine.js` via relative static paths. It does not use `eval`, proprietary code, or firmware binaries.

## Engine ceilings (existing)

| Operation | Ceiling / failure |
| --- | --- |
| Derivative | At most 17 refinement passes, `Time Out` on nonconvergence |
| Integral | At most 60,000 function samples, maximum recursion depth 24 |
| SOLVE | At most 100 iterations, 22 step reductions per iteration, `Can't Solve` |
| Σ (summation) | At most 20,000 consecutive integer terms |
| Π (product) | At most 20,000 terms; positive integral step |
| Numerical tolerance | Between `1e-14` and `0.1`, inclusive |
| Worker runtime | 6 seconds of elapsed wall time, after which it is terminated |

These limits are **web-simulator safeguards**, not verified CASIO hardware limits. An unresponsive or nonterminating worker can be terminated without blocking the primary calculator interface. When JavaScript workers are unavailable, the operation fails explicitly (`Worker unavailable`) rather than running unexpectedly on the UI thread.

## Validation

`node tests/rea068-numerical-worker.cjs` checks five normal numerical operations, seven domain/limit failures and four source-level controller cancellation guards. It does **not** replace real browser DOM tests, screen captures, or physical-device timing measurements.

Known limitations: the existing TABLE mode is bounded to small row limits and still runs synchronously, as do some small matrix, distribution, and STAT operations. Worker cancellation and time ceilings currently apply to the five COMP numerical workflows only, not to every simulator function.
