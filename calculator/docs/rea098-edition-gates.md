# REA-098 — Edition-specific feature isolation

Issue: https://github.com/philiparad/philiparad.github.io/issues/52

## Scope and status
Implemented model-specific feature gating in the calculator model registry, arithmetic evaluator and UI controller. Added 103 source-level regression checks. End-to-end browser/physical CASIO comparisons remain open; issue #52 should not yet be closed.

## Model capability matrix

| Capability | Original fx-991ES | fx-991ES PLUS | fx-991ES PLUS C |
| --- | --- | --- | --- |
| Standard 8 calculation modes | Yes | Yes | Yes |
| INEQ mode | No | No | Yes |
| VERIF mode | No | No | Yes |
| DIST mode/list | No | No | Yes |
| Ran# basic random | Yes | Yes | Yes |
| RanInt# integer random | No | Yes | Yes |
| Recurring decimal input | No | No | Yes |
| Dual-function TABLE | No | No | Yes |
| E/F registers | No | Yes | Yes |

The catalog represents the modeled editions. See original CASIO guide:
https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ES_991ES_EN.pdf

## Changes
1. `calculator/js/model-profiles.js` declares `FEATURES` and `hasFeature(model,feature)` for supported editions; `supports()` rejects unknown profiles rather than falling back to the more capable C model.
2. `calculator/js/math-engine.js` rejects `RanInt#(...)` and `RanInt(...)` with `Argument ERROR` for the original model, before any decimal optimizer.
3. `calculator/js/app.js` rejects unsupported RanInt expressions even when pasted/replayed; ALPHA + decimal-point RanInt insertion is blocked on original. All models preserve SHIFT + decimal-point Ran#.
4. C-only recurring decimal template insertion is blocked on original/PLUS; direct pasted `RPT(...)` notation is blocked on those earlier editions.
5. C-only recurring-decimal setup is explicitly refused outside PLUS C.
6. `advancedMode()` now validates requested mode against model profile even when invoked by a non-menu path; existing `setMode()` gating remains intact.

These changes target the shared controller's unintended exposure of edition-only functions. The physical keyboard source (`calculator/js/keyboard.js`) retains its generic PC key translation; final authorization is done in the model-aware controller and math engine. No unsupported command should silently execute through the keyboard mapping.

## Regression
```bash
node calculator/tests/rea098-edition-gates.cjs
```
**103 checks passed in an isolated JavaScript harness**, using retrieved committed GitHub sources. Tests cover:
- All 8 common modes and all 3 C-only modes across 3 model profiles
- Original/PLUS/C capability declarations and E/F register restrictions
- Basic Ran# behavior in all models
- RanInt rejection on original, successful calculation on PLUS and C, including direct API/pasted expression forms
- Fail-closed unknown-profile mode and feature checks
- Controller source routing, input gating, mode checks and pasted recurring-decimal rejection
- Physical keyboard mapping of SHIFT, ALPHA, MODE, ON, Enter; ordinary browser focus shortcuts preserved

## Limitations and outstanding checks
- Execute committed Node tests in a real repository checkout or CI.
- Browser key traces for original: SHIFT+DOT (Ran#), ALPHA+DOT (RanInt refusal), ALPHA+SQRT (recurring refusal), mode selection for INEQ/VERIF/DIST, and pasted expressions.
- Browser key traces for PLUS and PLUS C to verify the appropriate enablement and C-only setup.
- Compare model-specific legends and observed behavior to original, PLUS and PLUS C physical devices. No hardware parity has been established.
- Review other later-edition key combinations and any enhanced functions not listed here; a model-level feature catalog is an explicit allow-list for audited features, not a complete ROM equivalence certificate.

Stop before REA-099.
