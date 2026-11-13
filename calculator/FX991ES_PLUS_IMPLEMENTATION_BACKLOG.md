# CASIO fx-991ES PLUS (2nd edition) — Implementation Backlog

**Scope:** Exactly one supported model: fx-991ES PLUS (2nd edition). No original ES, PLUS C, INEQ, VERIF, DIST, or model-selector behavior.
**Baseline:** Official manufacturer user guide: https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/
**Rule:** Every change gets dedicated model-specific regression tests, keypad traces, and modular ↔ standalone verification. Avoid any unsupported claims of physical parity.

| Task | Priority | Area | Implementation acceptance criteria | Verification |
|---|---|---|---|---|
| PLUS-001 | P0 | Model | Only fx-991ES PLUS exists in UI and runtime; URL model query cannot switch profiles | Static and browser checks |
| PLUS-002 | P0 | Dead code | Remove other-model branches, imports, feature tables, screenshots, samples and build/test fixtures; no references to fx-991es, PLUS C, INEQ, VERIF or DIST remain in active application | Repo-wide source search |
| PLUS-003 | P0 | MODE | All eight modes open by MODE → 1…8, with correct status, return and cancel behavior | 8-mode keylogs |
| PLUS-004 | P0 | SHIFT | SHIFT+1/2/3/4/5 must perform printed contextual function, never switch calculator mode | Keylog comparison with real PLUS |
| PLUS-005 | P0 | ALPHA | Verify all ALPHA+key actions and unavailable-function behavior against PLUS key legends | 50-key × modifiers table |
| PLUS-006 | P0 | EQN | All four EQN types accept numerical expressions, cursor edits and sign/exponent input as documented | 4-types × 30 cases |
| PLUS-007 | P0 | Errors | Correct SOLVE/COMP Variable, Math, Syntax, Stack and Argument error classification and caret recovery | Official error test set |
| PLUS-008 | P0 | STAT | Switching FREQ/Stat Format resets data as on CASIO; preserve data only where documented | Model keylog tests |
| PLUS-009 | P1 | Menus | Numbering, paging, submenu action keys, return and confirmation consistent with hardware | Menu tree test |
| PLUS-010 | P1 | MATRIX | Reimplement printed SHIFT+4, Dim, Data, MatA/B/C, MatAns workflows and key behavior | Matrix keylog/test cases |
| PLUS-011 | P1 | VECTOR | Reimplement printed SHIFT+5, Dim, Data, VctA/B/C, VctAns workflows | Vector keylog/test cases |
| PLUS-012 | P1 | STAT edit | Implement STAT Edit → Ins, Del, Del-A navigation and preserve expected row behavior | STAT edit keylogs |
| PLUS-013 | P1 | TABLE | Correct range boundaries, maximum 30 rows, error cells, memory and editor navigation | Boundary/fractional-step cases |
| PLUS-014 | P1 | LCD | Pixel-correct native glyphs, icons, symbol placement and 96×31 logical screen composition | Model-specific golden screenshots |
| PLUS-015 | P1 | MathIO | Correct nested templates, fractions, roots, calculus, cursor insertion and clipping | Screenshot and AST tests |
| PLUS-016 | P1 | LineIO | Reproduce ordinary linear entry, replay, cursor, fractions and result display | Manufacturer keylogs |
| PLUS-017 | P1 | Precision | Match 15-digit internal arithmetic, 10-digit display, rounding, Norm/Fix/Sci and overflow cases | Numerical boundary suite |
| PLUS-018 | P1 | Symbolic | Expand supported π, surd, rational, complex and EQN forms without guessing unsupported exact identities | Reference expression corpus |
| PLUS-019 | P1 | BASE-N | Verify DEC/BIN/OCT/HEX, signed ranges, two's complement, operators and key mappings | CASIO reference vectors |
| PLUS-020 | P1 | CMPLX | Test rectangular/polar operations, argument, conjugate, Ans and mode-exit memory | Device comparison |
| PLUS-021 | P1 | SOLVE/CALC | Verify iterative solve, prompts, cancellation, memory writeback, numerical failure and multiple roots | Manufacturer example traces |
| PLUS-022 | P2 | Constants | Compare 40 scientific constants, printed order and device-specific values | Full 40-code table |
| PLUS-023 | P2 | CONV | Verify 40 conversions, offsets, suffix entry and displayed scientific notation | Full 40-code table |
| PLUS-024 | P2 | DMS/angles | Test negative DMS, DRG conversion, degrees/radians/gradians and boundary rounding | Reference cases |
| PLUS-025 | P2 | Keyboard | Ensure PC shortcuts never hijack native browser controls and map to correct physical keys | Playwright focus testing |
| PLUS-026 | P1 | CI | Integrate exhaustive 50-key × 3-modifier × screen tests, plus real keypress browser cases | CI must run and pass |
| PLUS-027 | P0 | Standalone | Regenerate standalone from authoritative files; fail if stale; remove other-model assets | Byte-identical builder check |
| PLUS-028 | P2 | Hardware parity | Acquire native LCD captures and keylogs, compare pixel and numeric deviations; report unresolved differences explicitly | Signed evidence report |

## Acceptance gates
1. **Single-model gate:** no alternate-model labels, query switching, executable branches or documentation in active calculator.
2. **Interaction gate:** the physical 50-key matrix, SHIFT, ALPHA, MODE, SETUP, AC, DEL, REPLAY, = and nested menus have independently tested outcomes.
3. **Computation gate:** tests compare exact results, allowed error messages, and display rounding to manufacturer examples and controlled hardware captures.
4. **Publication gate:** both modular and standalone pass the same tests before release.
5. **Disclosure gate:** manufacturer hardware parity is described as unverified unless backed by physical evidence.

## Verified implementation status — 2026-11-12

- **PLUS-001:** Implemented. Single PLUS identity, no profile switching; strict profile tests pass.
- **PLUS-002:** Active runtime cleanup and gate pass. Archived research files, reference screenshots and historical multi-model fixtures are retained; repository-wide archival deletion is **not complete**.
- **PLUS-003–PLUS-013:** Implemented with model-specific source and physical-button browser regressions, including both modular and standalone publication. Verified by [successful GitHub Actions release run](https://github.com/philiparad/philiparad.github.io/actions/runs/43186524940).
- **PLUS-010:** MATRIX printed SHIFT+4 menu, expressions, MatAns, determinant, transpose, STO copy.
- **PLUS-011:** VECTOR printed SHIFT+5 menu, direct vector calculations, Dot, VctAns and STO copy.
- **PLUS-012:** STAT Edit 1 Ins / 2 Del-A, physical DEL line deletion, safe append and capacity tests.
- **PLUS-013:** TABLE ULP-level fractional boundary checks, 1–30 X-values, error cells, grid navigation and variable X writeback.
- **PLUS-014:** Added deterministic 192×62 simulator raster/glyph/status-indicator contract, executed successfully in isolated JavaScript against current source; included in release CI. Physical 96×31 LCD parity remains **unverified**, without native device captures.
- **PLUS-015:** Added and executed 24 MathIO/LineIO render cases covering all 12 structured templates plus nested radicals, fraction field navigation, and long-expression viewport clipping; included in release CI. Physical template parity, browser-level interactions, and screenshot comparison remain **open**.
- **PLUS-016:** Added and executed seven LineIO unit contracts for text insertion, delete, overwrite/undo, cursor traversal, fraction serialization, horizontal viewport bounds and deterministic LCD result rendering; wired into release CI. Browser physical-key replay, native result screenshots, and hardware keylog comparison remain **open**.
- **PLUS-017:** Corrected ten-significant-digit Norm rounding at decimal ties/carries (such as 9.9999999995 ⇒ 10). Added and executed 22 unit checks covering 15-significant-digit decimal arithmetic, ten-digit Norm, Fix/Sci, exponent/overflow/underflow boundaries; CI integration added. Native hardware precision and complete browser result parity remain **unverified**.
- **PLUS-018:** Added and executed 21 source-backed symbolic regression checks for rational provenance, π, radicals, unsafe approximation rejection, quadratic exact roots and basic complex arithmetic; CI integrated. The supported subset is demonstrated but complete manufacturer symbolic and physical-device parity remain **open**.
- **PLUS-019:** Added and executed 53 BASE-N unit contracts grounded in the official manufacturer examples/ranges (DEC/BIN/OCT/HEX, two’s complement, mixed-radix input, arithmetic, logical operators and invalid inputs); release CI integration committed. Browser physical-key mapping/keylogs, native hardware references and complete parity remain **open**.
- **PLUS-020:** Fixed numerical ghost real components at exact quarter-turn principal roots (for example sqrt(-1) now displays i), regenerated matching standalone CMPLX source block, added and executed 36 CMPLX unit checks (manufacturer arithmetic, conjugate/arg, polar angles, formatting overrides, Ans/PreAns, small-component preservation, errors), and wired them into release CI. Full browser keylogs, mode transitions and hardware numerical/display parity remain **open**.
- **PLUS-021:** Corrected false SOLVE convergence caused by residual tolerance scaling with |X|, synchronized standalone build, added and executed 25 SOLVE/CALC unit checks (prompts, guesses, distinct quadratic roots, failure/no-root outcomes, bounds, substitution-validation and atomic return changes) and release CI integration. Browser cancellation/keylogs, real-device Newton threshold behavior and full interactive parity remain **open**.
- **PLUS-027:** Byte-identical standalone synchronization verified in release workflow; 39 active JavaScript modules.
- **PLUS-014–PLUS-015:** Regression coverage added; device-reference and full interactive parity still **open**. **PLUS-016:** Unit regressions added but hardware and browser replay parity remain **open**. **PLUS-017:** Source defect fixed and numerical boundary tests added; hardware/browser parity remains **open**. **PLUS-018:** Symbolic unit corpus added; full physical-device and browser parity remain **open**. **PLUS-019:** Manufacturer-grounded unit corpus added; browser/physical-key parity still **open**. **PLUS-020:** CMPLX regression suite and root correction added; browser/device parity remains **open**. **PLUS-021:** SOLVE numerical correction and unit contracts added; hardware/browser cancellation parity **open**. **PLUS-022–PLUS-026, PLUS-028:** Remaining implementation and reference gaps are **open**. In particular, PLUS-014 requires native 96×31 LCD screenshots/keylogs to certify exact glyph, annunciator and pixel placements; source/browser-only tests cannot prove device pixel parity.

### Verification scope and evidence
- Release run: https://github.com/philiparad/philiparad.github.io/actions/runs/43186524940 (success)
- Source and browser regressions do **not** constitute hardware parity certification.
- Do not mark physical-device pixel/precision/menu parity verified without a matching CASIO fx-991ES PLUS (2nd edition) device capture and observed key sequence.
