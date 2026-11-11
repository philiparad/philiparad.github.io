# REA-103 — Original fx-991ES STAT R(t), standard-normal upper tail

GitHub issue: https://github.com/philiparad/philiparad.github.io/issues/57
Parent audit: REA-084 / issue #34

## Manufacturer reference and operation

Original manufacturer fx-991ES / fx-115ES User's Guide, printed **E-49** (PDF page 50):
https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ES_991ES_EN.pdf

The manual's STAT Distr menu is reached via **SHIFT → 1 (STAT) → 7 (Distr) → 3 (R()** on the original model in single-variable STAT.

The standard-normal upper-tail probability is

`R(t) = Pr(Z >= t) = integral[t,infinity] exp(-u²/2)/sqrt(2π) du`.

By symmetry `R(t)=P(-t)`, while `P(t)+R(t)=1`. This is **not** the PLUS C DIST mode.

## Changes

1. `calculator/js/stat-normal.js`: replaced the cancellation-prone expression `R = 0.5 - Q(t)` with `R = lowerTail(-t)`. This computes very small positive upper tails directly using the existing lower-tail numerical implementation instead of subtracting two nearly equal doubles. For example, `R(10) ≈ 7.61985302416047e-24` and does not underflow to zero.
2. `calculator/js/math-engine.js`: registered `R(` and routes the function to `FreshStatNormal.calculate('R',t)`. The expression is authorized only for original `fx-991es` model, `STAT` mode, active 1-VAR feature gate and exactly one argument; unsupported modes and PLUS editions raise `Argument ERROR`.
3. `calculator/js/app.js`: original STAT Distr option 3 now inserts `R(` directly into the normal editable calculation field. This supports `R(Ans)`, arithmetic composition, cursor editing, and standard equals-key result/Ans handling. It rejects other calculator models and paired STAT types.
4. `calculator/fx991_fresh_standalone.html`: updated the three canonical modules and checked canonical HTML, CSS, capability manifest, and all 46 script load-order slots. No REA-104 normalized-variates implementation was started.

## Independently checkable examples

| Input | Result |
| --- | ---: |
| R(0) | 0.5 |
| R(1) | 0.158655253931457 |
| R(-1) | 0.841344746068543 |
| R(2) | 0.0227501319481792 |
| R(-2) | 0.977249868051821 |
| R(5) | 2.86651571879193e-7 |
| R(8) | 6.22096057427178e-16 |
| R(10) | 7.61985302416047e-24 |

These are normal-distribution mathematical reference values, **not physical-device captures**.

## Testing

Node regression suite:

```bash
node calculator/tests/rea103-stat-normal-r.cjs
```

**127 isolated JavaScript checks passed in the source harness**, including:
- Signed input and upper-tail reference results through `t=±12`.
- Extreme positive-tail nonzero retention.
- `P(t)+R(t)=1`, `R(t)=P(-t)`, and `R(t)+Q(t)=0.5` identities.
- Original model versus PLUS/PLUS C gates across COMP, STAT, CMPLX, and TABLE.
- Syntax and domain errors, `R(Ans)`, arithmetic combinations.
- Actual mocked execution of STAT Distr option 3, asserting it inserts `R(` and rejects other models.
- Isolation from PLUS C's independent DIST menu.

Browser keypad smoke test is committed as:

```bash
python3 calculator/tests/rea103_browser_stat_r.py
```

It exercises the original STAT key route on both modular and standalone versions, for 0, ±1, ±2 and 5; **Playwright has not been executed in this task**. Native Node.js execution also remains unconfirmed. Direct source-to-standalone comparison passed for the three edited modules and canonical resource/layout checks.

## Outstanding acceptance requirements

- Execute native Node suite and browser Playwright script; inspect LCD expression/result and rounding in MathIO, LineIO, Norm/Fix, negative-tail presentation and error cancellation.
- Independently compare true original fx-991ES physical key sequences, LCD and numerical precision. Collect real, reviewed native device captures under REA-099.
- Confirm other edition behavior using genuine hardware; source-only model gating is not physical proof.

The source implementation is complete, but issue #57 should remain open pending browser and physical validation. **REA-104 was not started.**
