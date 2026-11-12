# CASIO fx-991ES PLUS (2nd edition) — Independent Educational Calculator

The project implements **one calculator model only**: **CASIO fx-991ES PLUS, 2nd edition (NATURAL-V.P.A.M.)**.

- [Open calculator](index.html)
- [Standalone HTML](fx991_fresh_standalone.html)
- [PLUS-only browser parity lab](parity-lab.html)
- [Implementation tasks and acceptance criteria](FX991ES_PLUS_IMPLEMENTATION_BACKLOG.md)
- [Official CASIO user guide](https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/)

There is **no model selector**. The URL's obsolete `model` query parameter is ignored. The app exposes only the eight manufacturer modes: COMP, CMPLX, STAT, BASE-N, EQN, MATRIX, TABLE and VECTOR.

## Build and source of truth

`index.html`, `styles.css`, the ordered `js/*.js` scripts included in `index.html`, and `reference/rea-008/capabilities.json` are authoritative. Never edit the generated standalone independently.

From the repository root:

```bash
python3 calculator/tools/build_standalone.py --write
python3 calculator/tools/build_standalone.py --check
python3 -m unittest discover -v -s calculator/tests -p 'test_rea100_standalone.py'
```

For regression tests, run the JavaScript contract checks and Playwright browser suites specified in `.github/workflows/rea100-standalone-sync.yml`. Only the supported PLUS model should appear in test matrices.

## Calculator interaction

Press **MODE**, then **1–8** for the required mode. Press **SHIFT → MODE** for SETUP. Use the arrows for LCD menu navigation and **AC** to leave a menu. Enter values using the 50 on-screen buttons. The page provides an enlarged LCD, key-log, LCD capture and browser-based regression checks.

The educational implementation is not proprietary CASIO firmware and has not been certified to reproduce the real device's internal precision, LCD pixels or all key transitions. See the backlog for the specific unresolved gaps.

## Validation policy

- Every feature fix requires manufacturer-documentation evidence and a repeatable key sequence.
- Validate both modular and standalone publications.
- Preserve numerical, error, rounding, state, SHIFT/ALPHA and MODE behavior.
- Treat actual hardware parity as unverified until the same test has a physical-device LCD/key-log observation.
- Do not reintroduce another calculator model or an unneeded model-switching abstraction.
