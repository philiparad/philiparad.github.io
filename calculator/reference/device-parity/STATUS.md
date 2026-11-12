# Three-model CASIO parity — executed verification status

**Updated:** 2026-11-12  
**Models:** original fx-991ES; fx-991ES PLUS 2nd edition; fx-991ES PLUS C 2nd edition.  
**Parity verdict:** **Browser verified for the tested scenarios; physical hardware parity UNVERIFIED**.

## Actual executed results

| Verification | Outcome | Evidence |
|---|---|---|
| Playwright/Chromium browser keypad + navigation + display | **162 / 162 passed** | [GitHub Actions run 43148006611](https://github.com/philiparad/philiparad.github.io/actions/runs/43148006611) |
| Original fx-991ES | 53 / 53 passed | Recorded web LCD PNG and KeyLog per case |
| fx-991ES PLUS | 53 / 53 passed | Recorded web LCD PNG and KeyLog per case |
| fx-991ES PLUS C | 56 / 56 passed | Recorded web LCD PNG and KeyLog per case |
| LCD screenshot SHA-256 integrity | 162 / 162 matched | Downloaded workflow artifact |
| Recorded KeyLog SHA-256 integrity | 162 / 162 matched | Downloaded workflow artifact |
| Actual recorded vs requested KeyLog sequences | 162 / 162 matched | Browser runner's state snapshots + JSON |
| Manual Fix/Sci/Norm display examples | Passed in Node and browser | `test_manual_rounding.cjs`, `cases.json` |
| Source/model/edition mathematical tests | Passed | GitHub Actions source-and-model job |
| Prior REA-107–122 STAT regression suites | 990 direct JavaScript assertions passed | Prior suite execution |
| Deterministic standalone source/build check | Passed | GitHub Actions `build_standalone.py --check`; exact embedding of 46 modules |
| Genuine or licensed-emulator native LCD comparison | **0 completed** | Requires actual native evidence |

**Run artifact:** `casio-three-model-browser-evidence`, run [43148006611](https://github.com/philiparad/philiparad.github.io/actions/runs/43148006611), artifact id `13912547531`. Downloaded evidence contains 162 browser-generated LCD screenshots, 162 recorded KeyLogs, `report.json` and `verified.json`. Artifact digest: `sha256:f33549eb966be74483c9e5c78dec236dc5378c23ab4f7885ee53bb6e63ffad85`.

**Permanent executed review:** [EXECUTED_REVIEW_2026-11-12.md](EXECUTED_REVIEW_2026-11-12.md).

## Three existing simulation editions

- [Original fx-991ES](../../index.html?model=fx-991es): eight standard MODE entries, original memory-register restrictions.
- [fx-991ES PLUS](../../index.html?model=fx-991es-plus): eight base modes and expanded PLUS register set.
- [fx-991ES PLUS C](../../index.html?model=fx-991es-plus-c): eleven modes, including second-page INEQ/VERIF/DIST, PLUS C-only mathematical functions.
- [Interactive three-model parity lab](../../parity-lab.html): model comparison and browser KeyLog tests.

The models are separate **configurations of the shared independent web engine**; no manufacturer ROM, firmware, DLL or licensed executable has been published.

## Issues discovered and corrected in the verification harness

- Initial Chromium installation failed on Ubuntu 26.04 because the pinned Playwright version was too old; upgraded to a supported release. CI subsequently ran successfully.
- The initial expanded square-root tests produced an extra closing parenthesis after the natural MathIO template; removed that erroneous extra key press. Six test failures disappeared without modifying calculator calculations.
- Added real app KeyLog recording, hash-verified KeyLog exports, and state coverage of shift/alpha, mode pages, math/angle modes.
- Expanded the browser suite to **57 distinct scenarios**, executed across the applicable models as **162 browser checks**.
- Browser-rendered LCD screenshots reviewed for MENU, PLUS C exclusive page, √9, Fix 2, Sci 4, Norm1/Norm2 and division-by-zero error screens. No obvious internal inconsistencies in those selected screenshots.
- Manual-defined display rounding examples passed using **actual browser key sequences**, not only formatter unit tests.

## What remains open

- [ ] Capture authentic model-matched reference LCD images and key logs from physical original fx-991ES and PLUS.
- [ ] Run the legally obtained PLUS C Windows emulator locally, record native key/LCD results, or collect genuine PLUS C hardware captures.
- [ ] Compare native result rounding, screen glyphs, layout, key scanning, error handling, and editing using `compare_lcd.py` and `verify_evidence.py` (human review required).
- [ ] Expand case coverage to additional MATRIX, VECTOR, STAT, EQN, BASE-N, SOLVE, calculus and model-dependent corner cases.
- [ ] Close model-specific parity acceptance only when verifiable native reference evidence exists.

**Critical distinction:** Browser simulation and documented mathematical agreement do **not** establish physical-device/firmware parity. The user's supplied `CASIO(1).zip` contains a PLUS C second-edition Windows emulator installer and documentation, but no authenticated screenshots or executed native key traces. It was not executed in this environment.
