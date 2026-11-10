# REA-071 — MODE / SETUP menu sequence and model selection audit

**Status:** Source implementation committed; real-hardware LCD/menu timing and executed Playwright checks remain unverified.

## Manufacturer sources

- [Original fx-115ES / fx-991ES user guide, E-7–E-10](https://support.casio.com/pdf/004/fx-115ES_991ES_E.pdf).
- [fx-570ES PLUS / fx-991ES PLUS user guide, calculation modes and setup](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-570ESPLUS_991ESPLUS_EN.pdf).
- [fx-115ES PLUS / fx-991ES PLUS C user guide, calculation modes and setup](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ESPLUS_991ESPLUSC_EN.pdf).
- [PLUS C configuration guide](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/calculation_calculator/configuring_calculator.html).

### Documented MODE sequences

| Key sequence | Original fx-991ES | Standard PLUS | PLUS C |
| --- | --- | --- | --- |
| MODE 1–8 | COMP, CMPLX, STAT, BASE-N, EQN, MATRIX, TABLE, VECTOR | Same | Same |
| MODE ▼ 1 | Not offered | Not offered | INEQ |
| MODE ▼ 2 | Not offered | Not offered | VERIF |
| MODE ▼ 3 | Not offered | Not offered | DIST |

The MODE page numbers repeat from **1** on the PLUS C second page; they do not continue with 9–11. UP returns to the first page, and AC exits without selecting a mode.

### Documented SETUP sequences

SHIFT MODE opens two pages:

- Page 1, all models: 1 MthIO; 2 LineIO; 3 Deg; 4 Rad; 5 Gra; 6 Fix; 7 Sci; 8 Norm.
- Page 2, original/PLUS: 1 ab/c; 2 d/c; 3 CMPLX; 4 STAT; 5 Disp; 6 CONT.
- Page 2, PLUS C: 1 ab/c; 2 d/c; 3 CMPLX; 4 STAT; 5 TABLE; 6 Rdec; 7 Disp; 8 CONT.

Nested choices: MthIO → 1 MathO, 2 LineO; Norm → 1 Norm1, 2 Norm2; CMPLX → rectangular/polar; STAT → frequency ON/OFF; Disp → dot/comma. PLUS C adds TABLE single/dual and Rdec ON/OFF. Fix and Sci digit-entry submenus, contrast, angle unit, and fraction style have retained existing functionality.

## Implementation and invariants

- `js/menu-model.js` defines `MODE_PAGES`, `modePages(model)`, `modeSelection(model,page,key)`, and flat `modeEntries(model)` with explicitly **page-local keys**.
- `js/setup.js` retains manual-page arrays and exports `entries(model)`, `setting(model,id)`, `selection(model,page,key)`; all choices identify their source page.
- `js/app.js` renders printed page-local numeric keys, consumes those normalized model entries, and checks setting availability before applying it. Invalid or model-incompatible settings cannot be applied by the controller functions. Selected choices execute existing setup state transitions.
- UI key handlers, error/resume, calculation-mode entry paths, and the existing 50-key layout are otherwise unchanged. The generic menu state machine remains shared between models.

## Regression

From `calculator/`:

```sh
node tests/rea071-mode-setup.cjs
python reference/rea-071/test_mode_setup_browser.py
```

The Node suite checks all page lengths, numbered options, two distinct second-page SETUP variants, valid/invalid mapping, model-specific option gating, and source integration. It passed **170 checks** in a JavaScript execution harness.

The browser test switches all three models, presses real DOM key controls, validates MODE page transitions and SETUP actions (MathIO, degrees/radians, FIX, SCI, Norm, Disp, TABLE, Rdec), checks AC cancellation and verifies that PLUS C-only modes remain absent on the other two models.

## Remaining acceptance

Official guide claims establish intended keys, not complete firmware equivalence. Browser test still requires execution in an environment with Playwright and Chromium, especially for LCD render/layout. Real-device photographs and key/display captures are required to certify pixel parity, timing, and mode-specific native prompt behavior. The standalone all-in-one HTML version is a separate synchronization task (REA-100).
