# REA-007 — Model and emulator-version differences

**Task:** Validate emulator behavior version and physical model differences.

**Status: PARTIAL — published model-specific mode inventories and menu filtering; hardware / emulator-version equivalence NOT established.**

## Verified manufacturer DOCUMENTATION (not live firmware observations)

| Target model | Officially documented calculation modes | Count | Documentation |
|---|---|---:|---|
| fx-991ES (original) | COMP, CMPLX, STAT, BASE-N, EQN, MATRIX, TABLE, VECTOR | 8 | [CASIO original fx-991ES guide](https://support.casio.com/pdf/004/fx-115ES_991ES_Eng.pdf) |
| fx-991ES PLUS (2nd edition) | COMP, CMPLX, STAT, BASE-N, EQN, MATRIX, TABLE, VECTOR | 8 | [CASIO fx-991ES PLUS calculation modes](https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/calculation_calculator/calculation_modes.html) |
| fx-991ES PLUS C (2nd edition) | COMP, CMPLX, STAT, BASE-N, EQN, MATRIX, TABLE, VECTOR, INEQ, VERIF, DIST | 11 | [CASIO fx-991ES PLUS C calculation modes](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/calculation_calculator/calculation_modes.html) |

These lists are assertions about **manufacturer-documented feature availability**, not implementation completeness. For example, the fresh application implements only a subset of STAT, MATRIX, EQN and DIST functionality and has not demonstrated numerical parity.

## What was implemented

- `calculator/js/model-profiles.js` registers three independently authored, official-manual-grounded model IDs and ordered lists of modes. Default is **fx-991ES PLUS C (2nd edition)** to avoid changing the previously targeted application unexpectedly.
- The calculator's LCD MODE menu displays exactly the modes documented for the selected model. For the two eight-mode versions the second page contains only TABLE and VECTOR; INEQ, VERIF and DIST are absent and cannot be selected.
- A **device-profile selector** outside the calculator face chooses which physical device is being simulated. It is an emulator configuration control, not a mathematical operation. All calculations, MODE selection, and input remain on the calculator's LCD and keys.
- Changing device profiles resets the calculator to COMP to prevent an unsupported active calculation mode or retained wizard from the previous model.
- Both modular `index.html` and embedded `fx991_fresh_standalone.html` have been synchronized.
- The optional `?model=fx-991es`, `?model=fx-991es-plus`, `?model=fx-991es-plus-c` query parameters select the initial model; unknown values fall back to the PLUS C project default.

## What static REA DID and DID NOT establish

The earlier installed-program REA described a Windows `fx-991ES PLUS C 2nd edition` emulator installer labeled **version 5.00**, with a **644 × 1250** face bitmap in `fxESPLUS2_P16.dll` and native UI functions such as `GetKeyInfo` and `GetDisplayPosition`. These are **static binary/asset observations**. They do not establish which embedded calculator firmware revision executes, whether the Windows emulator behaves identically to each physical regional model, or how native key scan codes differ. Do not describe package version as firmware version.

The existing 96 × 31 web LCD, source arithmetic, key layouts and generic wizard sequences are **not model-specific validated emulation**. Reusing an eight-mode menu for original/PLUS is backed by manuals but does **not** make the web app an accurate original fx-991ES replica.

## Test the completed subset

The browser acceptance suite runs on both modular and standalone HTML and covers:

- 8 / 8 / 11 MODE menus, correct ordering, pagination and unavailable 9th item on eight-mode models;
- using the physical number/operation buttons to calculate a sum;
- accessing PLUS C-only INEQ via MODE second page;
- switching away from INEQ resets to COMP;
- no popup dialog or browser JavaScript exceptions.

```sh
python3 -m pip install playwright==1.56.0
python3 -m playwright install chromium
python3 calculator/reference/rea-007/test_models_browser.py
```

CI workflow: `.github/workflows/rea007-models.yml`.

## Remaining items required before REA-007 can be marked FULLY VERIFIED

1. Run and capture **genuine** reference sequences on all physical variants in scope (or licensed emulator versions with an explicitly documented model ID).
2. Record Windows emulator version, actual engine/firmware version if observable, locale/region, installed DLL checksums, and validated keyboard/LCD menu behavior.
3. Contrast representative calculations, MODE/SETUP and unsupported functions against the hardware/manual for each variant; highlight behavioral differences separately from mode counts.
4. Use REA-001 / REA-004 reference screenshots and differential comparisons to support device-specific claims.
5. Document any C-edition emulator behaviors that cannot be inferred for an original non-C fx-991ES.

No CASIO manufacturer firmware, binary, or proprietary bitmap is included.
