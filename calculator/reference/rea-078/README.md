# REA-078 — CALC in CMPLX and equation-style expressions

**Status:** Source-level implementation and regression completed on `main`. Native hardware fidelity and browser execution remain pending. REA-079 not started.

## Manufacturer references

- [fx-570ES PLUS / fx-991ES PLUS CALC guide, E-19–20](https://support.casio.com/pdf/004/fx-570_991ES_PLUS_E.pdf).
- [fx-115ES PLUS / fx-991ES PLUS C User's Guide, using CALC, E-26–27](https://support.casio.com/pdf/004/fx-115_991ES_PLUS_C_E.pdf).
- [fx-991ES original reference manual](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ES_991ES_EN.pdf).

CASIO's CMPLX CALC example stores `A+Bi►r∠θ`, then uses `A=√3, B=1` to produce `2∠30`, and repeats with `A=1, B=√3` to produce `2∠60` in degree mode. Documented CALC expression types include complex expressions, colon-separated multi-statements and equations of the form `A=B+C` or `Y=X²+X+3`. The `ALPHA+CALC` key sequence inserts the equality operator.

## Implementation

- **`calculator/js/calc-substitution.js`**: CALC evaluates complex prompt expressions with the full complex engine, retaining both real and imaginary parts, `Ans`, `PreAns`, model-specific registers and prior entered variables. The complex engine can accept `1+2i`, `3-i`, and polar inputs. Each prompted value is validated before source expression evaluation. Evaluation of all segments is transactional; no result or prompt memory change is committed on a failure.
- **Model-specific equality labels:** a left-hand output label is validated against the edition's actual register availability. Original fx-991ES rejects `E=A+B`; PLUS and PLUS C support it. The label itself is **not** prompted for or silently stored in a register.
- **Output representation:** CALC evaluation returns structured per-statement results `{target,text,value}` (including named output labels) so multi-statements remain inspectable while the existing LCD result displays the final computed value. The controller records this metadata in `state.calcSession.statementResults`; no additional physical calculator display page has been invented.
- **`calculator/js/app.js`**: inside an LCD CALC prompt, physical `ENG` inserts imaginary `i`, and `SHIFT+NEG` enters polar angle `∠` in CMPLX mode. The ordinary calculator input routes remain unchanged.
- **CALC replay:** after a successful calculation, CALC or `=` returns to the complete prompt sequence with the previously stored values, including real and imaginary registers. `AC` cancels a pending prompt without storing incomplete values.
- **Prior regression maintenance:** `calculator/tests/rea077-calc-substitution.cjs` now accepts extended CALC session metadata without weakening its functional assertions.

### Supported source examples

| Mode | CALC expression | Inputs | Result |
| --- | --- | --- | --- |
| CMPLX, DEG | `A+Bi►r∠θ` | `A=√3`, `B=1` | `2∠30` |
| CMPLX, DEG, repeat | `A+Bi►r∠θ` | `A=1`, `B=√3` | `2∠60` |
| CMPLX | `A+Bi` | `A=1+2i`, `B=3-i` | `2+5i` |
| CMPLX | `Y=A+Bi` | `A=2`, `B=3` | `2+3i`, output label `Y` |
| CMPLX | `Y=A+Bi:Ans+2` | `A=1`, `B=2` | `1+2i`, then `3+2i` |
| COMP | `Y=X^2+X+3` | `X=2` | `9`, output label `Y` |

The source-level parser recognizes the left side as an output label, not a simultaneous equation solver; equation solving is handled by other calculator modes/tasks. For mixed or unsupported expressions, errors are reported instead of inventing a physical CASIO behavior.

## Verification

From the repository root:

```sh
node calculator/tests/rea078-cmplx-equations.cjs
node calculator/tests/rea077-calc-substitution.cjs
python calculator/reference/rea-078/test_cmplx_calc_browser.py
```

**Observed in a JavaScript execution harness:**
- REA-078: **35** deterministic complex/equality/multi-statement/model/error/source checks passed.
- Previous REA-077: **32** regression checks passed after updating the extended session source assertion.
- JavaScript syntax checks passed for changed modules and controller.

**Committed, not yet executed in this session:**
- Playwright browser test `reference/rea-078/test_cmplx_calc_browser.py`, which drives the calculator's existing 50 DOM-key buttons across all three models, checks documented polar outputs, complex-valued prompt editing, equality labels, multi-statements, failure atomicity, cancellation and `ALPHA+CALC`.
- GitHub Actions workflow `.github/workflows/rea078-cmplx-equations.yml`, which runs both Node regression suites and Playwright Chromium.

## Remaining acceptance

1. **Browser and CI:** run Playwright, inspect failures, and verify all three model profiles on an actual browser. Do not claim a green CI run until its result is observed.
2. **Native firmware parity:** confirm original, PLUS and PLUS C physical display frames, complex formatting and register behavior, prompt ordering, cancellation and error recovery against CASIO or authorized emulator captures.
3. **MathO display fidelity:** exact native complex radicals (`√3+i`) and LCD glyphs are not fully reproduced by the independent complex renderer; decimal evaluation is verified mathematically only.
4. **Multi-statement presentation:** the result metadata preserves each intermediate result, but this implementation has not added unverified native pages for navigating them.
5. **Integration boundaries:** CASIO supports CALC only in COMP and CMPLX. `SHIFT+CALC` (SOLVE), advanced EQN mode, and standalone single-file synchronization are separate tasks.

**REA-079 was not started.**
