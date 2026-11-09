# REA-038 — Robust Numerical d/dx, ∫, Σ and SOLVE

## Scope / acceptance
The REA-038 backlog item asks for improved convergence, domains, singularities, variable prompts, stopping rules and error classifications, compared with the prior fixed-step Simpson integral and unguarded finite differences/Newton solve.

## Source-backed rules (CASIO fx-991ES PLUS C)
- [Differential calculations](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/function_calculations/differential_calculations.html): centered-difference numerical derivative; default tolerance 1E-10, minimum user-provided tolerance 1E-14; COMP only.
- [Integration calculations](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/function_calculations/integration_calculations.html): **Gauss–Kronrod** integrator with default tolerance 1E-5; COMP only, numerical errors can exceed tolerance near discontinuities.
- [Σ calculations](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/function_calculations/calculations.html): inclusive integer interval, `−10^10 < a ≤ b < 10^10`, and disallowed nested operations.
- [Using SOLVE](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/function_calculations/using_SOLVE.html): Newton-based root approximation, initial guess is material, may fail to find existing roots; solution screen includes `X` and residual `L-R`.
- [Errors](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/technical_informatoin/errors.html): distinguish Math, Argument, Time Out and Can't Solve.

## Implementation
- `calculator/js/math-engine.js`: guarded central differences with decreasing step and cusp checks; adaptive Simpson integration with local error estimates and a finite evaluation limit; compensated (Kahan) finite sum; safeguarded Newton iteration with a line-search and residual validation. The numerical integration algorithm is deliberately **not** claimed to reproduce Gauss–Kronrod firmware.
- Tolerances are checked and selectable for derivative and integral prompts. The browser guard rejects tolerances below 1E-14, values above .1, excessive Σ terms (20,000) and large integration intervals. Guard thresholds are project-specific, **not official hardware limits**.
- `calculator/js/app.js`: the COMP mode numerical prompts validate expressions, bounds, tolerance and unsupported nested functions. SHIFT+INTEGRAL → d/dx; INTEGRAL → integral; SHIFT+LOGBASE → Σ; SHIFT+CALC → SOLVE. Existing Π flow is unchanged.
- SOLVE accepts a zero expression or an equation such as `X^2=2`, or `Y=X+5` with Y supplied from the register, and displays X and L-R. Numerical operations update Ans, PreAns and history on success. Failed operations keep the prompt for correction and do not overwrite stored answers.
- Standalone HTML uses exactly the same code as the modular build.

## Test commands
```sh
node calculator/reference/rea-038/test_numerical.js
python3 calculator/reference/rea-038/test_browser.py
```
Previously committed REA-021–REA-037 regressions should also pass. The optional browser test requires Playwright and Chromium. Calculator-level tests are performed in a simulated DOM environment; this does **not** establish native CASIO firmware parity, exact LCD pixels or hardware-specific stopping criteria.

REA-039 is not started.
