# REA-107 — Paired STAT descriptive results despite oversized moments

## Source defect

Before this change, paired STAT `summary()` eagerly rejected any aggregate that exceeded 9.999999999e99, **even if the user requested only Var or MinMax**. Example: paired samples `(1e50,1)` and `(-1e50,2)` have valid X mean 0, X population sigma 1e50, Y mean 1.5 and Y population sigma 0.5, while ΣX² is not representable within the application's output range.

## Implementation

- Apply the existing REA-106 weighted/scaled 1-VAR descriptive calculation independently to paired X and Y, including frequency and skipped zero-weight rows.
- Retain unbounded raw sums for ΣX, ΣX², ΣY, ΣY², ΣXY, ΣX³, ΣX²Y and ΣX⁴. Their selected result is checked by `format()`, which continues to throw `Math ERROR` for an unavailable aggregate.
- Use a reduction instead of `Math.max(...rows.map(...))` when calculating the quadratic-fit span, avoiding large argument lists.
- Synchronize the same logic in the generated standalone.
- Native regression tests are in `test_paired_stat.js`, checked by `.github/workflows/rea107-paired-stat.yml`.

## Validation

GitHub source changes and CI configuration have been committed. Native tests, CI execution, standalone build check, browser key traces, and real Casio device comparison **were not executed or independently verified within this authoring environment**. The workflow is configured to run the native regression cases and standalone-sync check on relevant commits.

## Out of scope

Extreme-number stability of regression fitting (`fit`, `linear`, `quad`) and correctness of actual Casio hardware behavior are not established by this fix. Do not use this source-level patch as evidence of physical-device parity.
