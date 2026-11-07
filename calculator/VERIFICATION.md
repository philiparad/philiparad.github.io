# Independent simulator verification and REA traceability

Date: 2026-11-07.

## Source data

- User-provided REA report: static analysis of the installed fx-991ES PLUS C 2nd Edition Windows emulator.
- Verified statically: **50 key definitions**, **644 × 1250** pixel calculator model artwork, `GetDisplayPosition` origin candidate **(126, 256)**, and emulator UI features including Pop-up Display and KeyLog.
- Exact native LCD resolution, hardware scancodes, CPU/ROM semantics and arithmetic firmware rules are **not established by that report**.
- Design screenshot: **316 × 628**, body crop at **(22,22) to (296,602)** (274 × 580).

## Architecture

The web implementation is authored from scratch. It uses no code from the existing GitHub implementation and no proprietary CASIO binaries, firmware, font assets or face bitmap. It has four independent JavaScript modules: key metadata, LCD raster, mathematical evaluator, and state/controller/UI integration. The emulator's menu/form architecture is not used as source code.

## Verified browser behaviors

Browser: locally installed headless Chromium, rendering from a new inline document, without requiring network access.

- UI loads without JavaScript page exceptions.
- All **50 physical keys** and their normal, SHIFT, ALPHA entry points were dispatched: **150 synthetic calls, zero JavaScript exceptions**. This is a stability check, NOT verification of hardware behavior.
- Direct interaction tests: `2 + 3 = 5`; `5! = 120`; `5 nPr 2 = 20`; `1/3 + 1/6 = 1/2`; `S⇔D` toggles `0.5`; MODE → STAT computes `n=5, mean=3, variance=2`.
- Built-in mathematical self tests: 18 test cases cover precedence, trigonometry, algebra, factorial, fractions, numeric calculus, matrices, key count and LCD raster geometry.

## Screenshot comparison

- Screenshot calibration performed at exactly **274 × 580** pixels.
- Measured **mean absolute RGB channel error: 15.83 / 255** relative to the user image.
- Pixels with any RGB channel difference >25: **16.94%**.
- These numbers describe rendered-image similarity only, not CASIO hardware equivalence.
- These visual figures were measured for the initial fresh face; the modified LCD-only workflow does not change its keypad geometry. New MODE, prompt and result screenshots are in the output artifacts.

## Known limitations

1. The 96 × 31 display and handcrafted glyphs are independent approximations, not confirmed native CASIO LCD hardware.
2. The emulator's 50 exact key hit rectangles have not been extracted via `GetKeyPosition`; face geometry is measured from the user's supplied screenshot.
3. Shifted/alpha functions are partly educational approximations rather than verified hardware combinations.
4. Advanced modes now use **LCD prompts and physical keys**, not web forms or modal windows; the workflows are independently authored educational approximations and do not certify manufacturer navigation or edge cases.
5. Binary numeric values use JavaScript `Number` (IEEE-754) rather than a reverse-engineered CASIO arithmetic or decimal core. Numerical equivalence and rounding in tricky edge cases are not certified.
6. The source has not been tested against a *running* proprietary emulator's reference output sequences.

## Next verification stages

1. Native emulator screenshots in COMP, modes, natural fraction, error and result views.
2. Recover exact 50-key geometry from model DLL API, with run-time Windows observation.
3. Test SHIFT/ALPHA combinations in all calculator modes against hardware or a running emulator.
4. Build an independent decimal-precision arithmetic core and hardware-reference test corpus.
5. Add image-golden pixel tests with tolerances and a physically captured reference display.

## LCD-only revision — browser tests

- No `<dialog>` elements remain in the calculator UI. All mode, setup, register, constants, numerical calculations and advanced-mode entry are controlled by physical keypad events and rendered inside the LCD.
- Browser mode-paging tests confirm all **11** modes are available using two menu pages and numeric selection.
- Tested complete default-value calculation flows for CMPLX, STAT, BASE-N, EQN, MATRIX, TABLE, VECTOR, INEQ, VERIF and DIST: **10/10 completed** inside the LCD.
- Additional browser checks confirm direct COMP calculation, SHIFT+MODE setup, numerical integration, result paging and no uncaught JavaScript exceptions.
- Built-in mathematical self checks: **18/18 passed**.
- Read-only enlarged LCD and KeyLog panels are inline, not dialogs.
- The original handheld CASIO's firmware-equivalent menu sequences and advanced model parity are **not** claimed.
