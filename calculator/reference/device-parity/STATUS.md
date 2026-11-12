# Three-model CASIO parity — implementation and acceptance status

**Updated:** 2026-11-12  
**Target editions:** fx-991ES original; fx-991ES PLUS 2nd edition; fx-991ES PLUS C 2nd edition.  
**Scope:** Browser simulator, manufacturer-reference tests, evidence provenance and native-LCD comparison.  
**Parity verdict:** **NOT YET HARDWARE-VERIFIED** for any of the three editions.

## Completed source implementation

- [x] Three independently selectable model configurations and direct full-size URLs.
- [x] Side-by-side interactive `calculator/parity-lab.html`, with manufacturer links and exportable browser-only test results.
- [x] Three-edition manual-derived modes, register sets and edition-specific feature matrix.
- [x] Added correct PLUS C-only restrictions for GCD, LCM, Int, Intg and Π; retained ordinary/legacy math API behavior when no model was specified.
- [x] Updated `calculator/js/math-engine.js`, `calculator/js/model-profiles.js` and exact matching standalone HTML source.
- [x] Browser Playwright runner configured for 18 key/DOM scenarios across all three edition profiles. It records actual web-LCD PNGs, SHA-256 hashes, key sequences and state results.
- [x] Independent evidence verifier: requires native source type, matching key sequences, image hashes and explicit signed visual/result/key-behavior review; distinguishes physical hardware from licensed emulator and will not certify browser-only cases.
- [x] Optional grayscale/threshold 96×31 web-to-reference LCD mismatch visualizer with calibrated crop and small translation alignment. **An image difference alone is not a native parity certificate.**
- [x] Test and CI workflow definitions committed. The new workflow is `.github/workflows/casio-three-model-parity.yml`.

## Executed source-based JavaScript checks

| Suite | Assertions | Execution |
|---|---:|---|
| Three-model manifest/menu/keypad contract | 240 | Passed in JavaScript harness |
| Broad mathematical, scientific and STAT functions across model IDs | 264 | Passed in JavaScript harness |
| C-only function gates and unsupported command rejection | 43 | Passed in JavaScript harness |
| Existing REA-107–122 STAT regression suites | 990 | Passed in JavaScript harness |
| **Total** | **1,537** | **No failed assertions** |

The test harness executes the currently committed modules and test content, but is **not** a confirmed GitHub Actions/Node/Chromium execution.

## Documentation and ZIP findings

- Inspected the uploaded `CASIO(1).zip` (41 entries) and reviewed its bundled English `EmulatorUsersGuide.pdf`.
- The ZIP contains an **fx-991ES PLUS C 2nd edition Windows emulator** and activation components; it is *not* an authentic hardware capture for the other two models.
- Documented the emulator's capture, keylog, zoomed LCD, browser/keyboard operation, licensing and isolation requirements in `README.md`.
- Cross-checked edition distinctions with CASIO's original fx-991ES manual, fx-991ES PLUS 2nd edition manual and PLUS C 2nd edition online manual.
- No executable, DLL, license contents or manufacturer screen images from the ZIP were added to the public repository.

## Outstanding acceptance (all three models)

- [ ] Execute the new CI job and investigate any failures or standalone build drift.
- [ ] Execute Chromium Playwright key/DOM scenarios and inspect LCD captures.
- [ ] Collect genuine fx-991ES original screenshots/key logs for representative input, error and menu scenarios.
- [ ] Collect fx-991ES PLUS 2nd edition native screenshots/key logs.
- [ ] Run the user's licensed PLUS C Windows emulator locally and capture its authentic LCD and key logs (or use the actual calculator).
- [ ] Calibrate reference LCD crop/geometry and compare all relevant state transitions, result precision, line wrapping, annunciators, rounding and errors.
- [ ] Expand 18 browser scenarios into the full manufacturer feature/mode matrix; execute adjacent SHIFT/ALPHA and editing paths, native memory, EQN, MATRIX, VECTOR, STAT, BASE-N, numeric calculus, resets and random functions.
- [ ] Obtain explicit reviewer signoff per feature/model and close only those legacy REA issues with complete acceptance evidence.

**Important:** "source implemented", "browser test passed", "licensed-emulator reviewed" and "physical-device reviewed" are four different states. At present this work establishes source-level progress and the verification machinery, not a completed hardware parity claim.
