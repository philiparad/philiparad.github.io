# REA-077 — CALC substitution of every referenced variable

**Source implementation:** committed to the modular calculator. **32 deterministic JavaScript regression checks passed**. Browser/physical-device validation remains pending.

## Official manufacturer behavior

- [CASIO fx-991ES PLUS "Using CALC" guide](https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/function_calculations/using_CALC.html).
- [CASIO fx-115ES PLUS / fx-991ES PLUS C "Using CALC"](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ESPLUS_991ESPLUSC_EN.pdf).
- [Original fx-991ES manual](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ES_991ES_EN.pdf).

CASIO's published example stores `3A+B`, presses CALC, then enters A=5 and B=10 to obtain 25; CALC or = repeats with A=7 and B=20 to obtain 41. The prompt shows the current stored value for each register. CALC supports COMP and CMPLX, colon-separated multi-statements and variable-labelled equalities such as `Y=X^2+X+3`.

## Changed files

1. `js/calc-substitution.js` — independent tokenizer/variable discovery and session evaluator. It detects every referenced register in first-appearance order, without mistaking built-in functions, `Ans`, `PreAns`, `pi`, or `e` for variable prompts. It rejects E/F on original fx-991ES; accepts the expanded PLUS/PLUS C registers. It handles adjacent variables `AX` as `A*X`, imaginary `Bi` in CMPLX, and a CMPLX result format command.
2. `js/app.js` — CALC now opens the LCD's per-variable field editor. Each prompt initially displays its previous register value. The last = validates the complete substitution and the expression. Only then are prompted registers committed and the final COMP/CMPLX result displayed. Invalid input keeps the final field available for correction without committing any register changes.
3. `js/app.js` — after successful CALC the original expression remains editable, and CALC or = from its result starts the same prompt series with updated register defaults. AC exits CALC without changing already committed previous values. Loading/editing another expression, changing MODE or model, reset, and power transitions invalidate the old CALC session.
4. `calculator/index.html` — load the new CALC module before `app.js`.
5. `tests/rea077-calc-substitution.cjs` — 32 deterministic source-level checks.
6. `reference/rea-077/test_calc_browser.py` — Playwright tests using calculator DOM buttons, original/PLUS/C models, full prompt order, repeat/cancellation, failed-result atomicity, multi-statement/equality cases and CMPLX.
7. `.github/workflows/rea077-calc-substitution.yml` — source and Chromium browser CI.

## CALC examples and expected result

| Stored expression | Variables prompted | Input values | Result |
| --- | --- | --- | --- |
| `3A+B` | A, B | 5, 10 | 25 |
| Repeat `3A+B` via CALC or = | A, B (defaults 5, 10) | 7, 20 | 41 |
| `2AX+3BX+C` | A, X, B, C | 2, 3, 4, 5 | 53 |
| `Y=X^2+X+3` | X only | 2 | 9 |
| `X+Y:X(X+Y)` | X, Y | 2, 3 | statement results 5 and 10, final Ans 10 |
| `A+Bi` in CMPLX | A, B | 1, 2 | `1+2i` |

### Transactional memory invariant

The prompt's draft values do not mutate calculator memory. Only after **every** variable value and **every** statement evaluates successfully does the calculator commit the substituted values. When evaluation fails (e.g. `X/(Y-Y)`), the current prompt remains visible, and previous register values and Ans remain unchanged. This avoids the prior implementation's partial memory and one-variable limitation.

## Testing

Run from `calculator/`:

```sh
node tests/rea077-calc-substitution.cjs
python reference/rea-077/test_calc_browser.py
```

The JavaScript suite passed **32 checks** in a connector-backed JavaScript execution harness. The browser test is committed but has **not been executed** in the current session. The GitHub Actions workflow is also committed; its run status has not been confirmed.

## Remaining acceptance

- Execute Playwright browser tests, inspect screenshots, input prompt arrows, and error recovery on all three profiles.
- Check native device and licensed emulator CALC variable prompt ordering, previous-value display, multi-statement result pagination and CMPLX glyphs, including ALPHA + CALC equality.
- Native CALC can offer additional source-specific cursor and result modes not replicated by the independent web editor. All native parity claims remain blocked without device recordings.
- Compare CALC with SHIFT+CALC (SOLVE), ALPHA+CALC (equality input), SHIFT/ALPHA prompt entry and browser-focused keyboard behavior.
- Standalone all-in-one calculator synchronization remains a separate REA-100 task.

**REA-078 was not started.**
