# REA-123 — Executed three-model browser, LCD and key-log review

**Date:** November 12, 2026  
**Evidence provenance:** GitHub Actions Playwright/Chromium rendering of the independently developed web simulator, **NOT a CASIO hardware capture**.  
**Successful run:** https://github.com/philiparad/philiparad.github.io/actions/runs/43148006611  
**Run commit:** `4b3fd028edcbb1e7b64ac5b944993dd4a5171e4d`  
**Artifact:** `casio-three-model-browser-evidence`, artifact ID `13912547531`, archive digest `sha256:f33549eb966be74483c9e5c78dec236dc5378c23ab4f7885ee53bb6e63ffad85`.

## Executed browser result

| Profile | Scenarios | Passed | Failed |
|---|---:|---:|---:|
| Original fx-991ES | 53 | 53 | 0 |
| fx-991ES PLUS (2nd edition) | 53 | 53 | 0 |
| fx-991ES PLUS C (2nd edition) | 56 | 56 | 0 |
| **Total** | **162** | **162** | **0** |

The scenario manifest has 57 distinct descriptions, with edition gates yielding 162 actual browser executions. Tests use the page's real clickable calculator keys, inspect calculated raw values and displayed result text, mode/angle/MathIO state, LCD mode-menu items and pagination, SHIFT/ALPHA state, input deletion and error recovery. Each scenario reloads the correct model to avoid cross-case state contamination.

The GitHub Actions source-and-model job succeeded, including JavaScript model/mathematics tests, reference-image verifier unit tests, synthetic LCD-diff unit tests, and `python3 calculator/tools/build_standalone.py --check`. The standalone source comparison also matched all **46 canonical JS modules**, the stylesheet, capability manifest and HTML.

## Evidence integrity and keypad comparisons

The successful workflow published **162 actual browser LCD screenshot PNG files and 162 KeyLog JSON files**, as well as `report.json` and `verified.json`.

Downloaded the artifact and independently inspected the archive: every one of the **162 screenshot SHA-256 checksums and 162 KeyLog file checksums matched** its report entry. Every recorded key sequence matched the corresponding requested sequence; the KeyLog includes the simulator's before/after mode, screen and result transitions, not a manually reconstructed trace.

The separate provenance verifier found **0 native-device-reviewed cases** and **0 physical-device-reviewed cases**. This is correct: no authentic original/PLUS/PLUS C device screenshots were supplied in the ZIP, and the PLUS C Windows emulator has not been run in a licensed Windows runtime.

## Browser LCD review

Inspected a three-column contact sheet assembled from the downloaded PNG files. Observed:

- The first MODE page consistently displays eight entries: COMP, CMPLX, STAT, BASE-N, EQN, MATRIX, TABLE, VECTOR, all with numbered menu choices.
- **PLUS C** alone displays a second MODE page of INEQ, VERIF, DIST; the original and standard PLUS profiles do not expose this page.
- MathIO renders a two-dimensional radical for `√9`, displaying 3 as the result in each profile.
- In LineIO, `Fix 2` renders `100/7 → 14.29`; `Sci 4` renders `1/7 → 1.429×10^-1`; `Norm 1` renders `1/200 → 5×10^-3`; `Norm 2` renders `1/200 → 0.005`. The browser's raw Ans retains unrounded precision.
- Division by zero shows the calculator's `Math ERROR` screen with cancel/edit navigation hints. Modifiers, angle units, mode pagination and error recovery passed their state assertions.
- Each PNG captures the web-rendered display; visual checks establish **internal browser consistency only**, not the authenticity, exact geometry, bitmapped glyph shapes or timing of CASIO LCD hardware.

Manufacturer manual examples were also checked by `calculator/reference/device-parity/test_manual_rounding.cjs` and model-specific browser cases. This does not substitute for independent device observations or model-specific photographic comparisons.

## Issues found and corrected during verification

1. Initial Chromium job failed before testing: Playwright 1.56 could not install its browser on GitHub's Ubuntu 26.04 runner. Changed to an Ubuntu-compatible Playwright release. Subsequent browser jobs executed successfully.
2. Added actual *application* KeyLog recording, comparison to each requested key sequence, hashed KeyLog JSON files, and state snapshots. Previous tests merely remembered input keys.
3. Expanded the suite from 18 descriptions (51 model executions) to 57 descriptions (162 model executions), covering arithmetic precedence, trigonometry, powers, roots, logarithms, editor deletion, errors, model menu differences, SHIFT/ALPHA, DEG/RAD/GRAD, MathIO/LineIO and Fix/Sci/Norm.
4. The first expanded suite had six failures on `√9`/`√16`: the test erroneously typed a closing parenthesis after a natural-display radical template, causing a syntax error. Corrected the **test key sequence**, not the calculator's mathematical engine. The next run passed 126/126.
5. The first expanded snapshot did not expose menu page, modifier, angle and MathIO fields; added those existing app fields to both Playwright and interactive comparison lab. Final suite passed 162/162.
6. Model source and standalone HTML were confirmed exactly synchronized. No calculator calculation defects were demonstrated by this browser suite after correcting test definitions.

## Native reference limitations and next acceptance criteria

- The user-supplied archive includes the **fx-991ES PLUS C second-edition Windows emulator installer and guide**, but no authentic emulator LCD screenshots, no native key-by-key traces, and no original fx-991ES or regular PLUS device references.
- The installed environment cannot run that proprietary Windows emulator with its licensed activation. Therefore **model-specific physical/reference screenshot comparisons have not been executed**. No hardware parity, genuine LCD pixel equivalence or firmware equivalence is claimed.
- Reference comparison remains actionable: run each genuine calculator or appropriately licensed model-specific emulator, capture the same documented key sequences and native LCDs, then pair the captures with the browser artifact using `verify_evidence.py` and `compare_lcd.py`. Only reviewed, same-model/same-key evidence can advance per-feature parity status.
- Some complex model-specific operations remain outside the 57 representative scenarios; full-feature parity requires further case coverage and review.

**Verdict:** 162/162 browser behaviors verified, 324/324 individual screenshot/KeyLog hashes matched, 162/162 recorded key sequences matched, manual display rounding examples passed, and **0/162 native physical-device comparisons completed**. Keep REA-123 open for hardware/reference acceptance.
