# REA-069 — Original fx-991ES register inventory and access control

## Reference

- CASIO *fx-115ES / fx-991ES User's Guide*, E-25–27, "Using Calculator Memory": **six** ordinary variables `A, B, C, D, X, Y`, and a separate independent `M`.
  - https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ES_991ES_EN.pdf
- CASIO *fx-570ES PLUS / fx-991ES PLUS* manual, variables section: **eight** ordinary variables `A, B, C, D, E, F, X, Y`, plus independent `M`.
  - https://support.casio.com/pdf/004/fx-570_991ES_PLUS_E.pdf
- PLUS C uses the same expanded register inventory; its extra calculation modes do not apply to the original.

## Implementation

`js/model-profiles.js` exports `registers(model)` and `hasRegister(model,name)`.
For original `fx-991es` the allowed set is `A B C D X Y M`. PLUS and PLUS C also include `E F`.

`js/app.js` now checks this set for primary register assignment, STO/RCL, ALPHA variable insertion, and CALC substitutions. The CALC variable choice list and memory selection prompt are model-aware. An unavailable STO/RCL target leaves selection pending; AC still cancels. The displayed key legends remain unchanged and are tracked separately in REA-070.

`js/math-engine.js` and `js/complex-engine.js` block original-model E/F variable evaluation, including expressions inserted by pasted text or replay, while preserving the mathematical constant lower-case `e` and decimal exponent syntax `1E-3`. The numerical worker receives the model profile through existing option snapshots.

## Reproducible tests

From `calculator/`:

```sh
node tests/rea069-registers.cjs
python reference/rea-069/test_registers_browser.py
```

The Node suite verifies register lists, model gating, real/complex evaluation, constants and controller guard presence. The optional Playwright browser suite tests ALPHA E, STO E, expression evaluation, CALC, mode switching, and unchanged PLUS routes.

Source-level verification does not imply device-firmware equivalence; the browser test must be executed in a Playwright-enabled environment to claim DOM validation.

## Examples

- Original: `ALPHA COS` (E legend) must not insert E, `SHIFT RCL COS` must not store, and `E+1` produces `Variable ERROR`.
- Original: `SHIFT RCL NEG` stores A, `RCL NEG` recalls A, and `M+` remains independent memory.
- PLUS / PLUS C: `SHIFT RCL COS` stores E, `RCL COS` recalls E, and `E+1` evaluates using the stored value.
