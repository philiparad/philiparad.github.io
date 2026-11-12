# REA-123 — PLUS C screenshot-derived parity corrections (2026-11-12)

## Evidence and classification

The user supplied **11 screenshots** (10 cropped LCD captures and 1 full Windows emulator face). The full-face image contains a CASIO emulator keypad whose PLUS C-specific **VERIFY**, **GCD**, **LCM** and **PreAns** legends support the identification **fx-991ES PLUS C (2nd edition)**. The separately uploaded `CASIO(2).zip` contains the same second-edition Windows emulator package as `CASIO(1).zip`, with identical full SHA-256:

`a2c7f4c502cd83a202535a377ff8480137e68707927666e8951753ecab01b281`

The screenshots are **user-submitted manufacturer-emulator display references**, not independently authenticated physical hardware captures. They show final LCD states but **no native emulator KeyLog export**, so exact native key sequences, intermediary transitions and reviewer-certified hardware parity cannot be asserted. The public repository contains only the filename/semantic/cryptographic-hash manifest at [native-emulator-screenshots-2026-11-12.json](native-emulator-screenshots-2026-11-12.json), not the copyrighted emulator executable, DLLs, license or user-provided screenshot images.

## Screen-by-screen comparison and implementation

| User capture | Previous web behavior | Source correction | Verification level |
|---|---|---|---|
| COMP, `888÷3` displays `296` | Prior 162-case browser suite tested other expressions | Added `native-888-divided-by-3` browser test, expected raw 296 | Same numerical result; native key log missing |
| MODE first page | Text `MODE` heading, plain numbered labels | Boxed inverse-color 1–8 key labels, no heading, two columns × four rows | Emulator screenshot-grounded layout approximation |
| EQN selection | Descriptions `2 unknowns`, `3 unknowns`, `Quadratic`, `Cubic` | Display four actual equation forms while retaining their original functional choices | Emulator screenshot-grounded |
| MatA register selector | `MATRIX` heading | `Matrix?`, MatA/MatB/MatC choices | Emulator screenshot-grounded |
| MatA(m×n) dimensions | 1×1 first, then increasing dimensions | Changed selection order: 3×3, 3×2, 3×1, 2×3, 2×2, 2×1, followed by 1-row options | Emulator screenshot-grounded first six choices |
| MatA 3×3 editing | Generic `EDIT MatA 3x3` heading and plain numbers | PLUS C-only bracketed grid, a/b/c headings, row numbers and selected-cell inverse highlight | Emulator screenshot-grounded approximation, **not** matched native pixels |
| VECTOR registers | `VECTOR` engineering heading | `Vector?` with VctA/VctB/VctC | Emulator screenshot-grounded |
| TABLE initial prompt | Prepopulated sample `X²−2` in engineering form | Empty `f(X)=` initial prompt with visual cursor, `g(X)=` on the second function | Emulator screenshot-grounded |
| BASE-N initial screen | `Dec` at upper left, zero at lower right | `Dec` positioned directly above the result at lower right | Emulator screenshot-grounded |

**Scope control:** The screenshot-derived bracketed MATRIX editor is restricted to the PLUS C profile; no native reference was supplied for original ES or standard ES PLUS. The existing model differences for modes and memory are retained. The shared MODE/EQN labels and selection ordering are implemented in the web engine, but native LCD geometry for the other two editions remains unverified.

## Source and browser verification

- Expanded `calculator/reference/device-parity/cases.json` from **57 to 67 scenarios**, adding **10 PLUS C-only screenshot-derived keyflow scenarios** (numerical example, EQN types and coefficients, matrix register/dimensions/editor, vector selector, TABLE first prompt and BASE-N initial screen).
- Browser scenario count when applied across applicable profiles: **53 original + 53 PLUS + 66 PLUS C = 172 cases**.
- Added `test_native_screen_layout.cjs` with **23 direct raster assertions** (MODE boxed selection, four explicit EQN choices, native-inspired MATRIX/VECTOR, empty TABLE prompt, BASE-N lower-right placement, PLUS C-only 3×3 bracketed MATRIX editor).
- Verified direct JavaScript execution of the current LCD module and `test_native_screen_layout.cjs`: **23/23 assertions passed**.
- Synchronized updated `app.js` and `display.js` into `fx991_fresh_standalone.html`; GitHub Actions is configured to run the full browser suite, 3-model source tests and standalone build consistency.
- **Do not claim the new 172-case browser run passed until a completed GitHub Actions artifact confirms that.** The most recently confirmed previous run remains **162/162** (run [43148006611](https://github.com/philiparad/philiparad.github.io/actions/runs/43148006611)).

## Remaining native reference requirements

1. Obtain the official emulator's **KeyLog** export for each submitted LCD state, including intermediate keys, mode, angle and setup state. A screenshot alone cannot prove how it was reached.
2. Record source resolution/crop and genuine screenshot provenance, then compare the same key sequence against a browser frame from the new screenshot-derived CI scenarios.
3. Compare LCD alignment after perspective-free native cropping. The independent web LCD logical raster is 96×31 by design, **not measured from physical CASIO LCD hardware**. Pixel match percentages therefore are diagnostic rather than device parity certificates.
4. Record manufacturer-emulator-reviewed results separately from **physical-device-reviewed** results. Exact native hardware parity needs real calculator captures for each of the three models.
5. Further cases still required for matrix editing all dimensions, matrix arithmetic, vector calculations, EQN coefficient entry/solution pages, TABLE grid, BASE-N conversions, STAT tables and advanced numeric functions.

**Current verdict:** User-provided PLUS C screenshots materially improved the simulator's LCD/navigation fidelity and now have recorded hashes and regression coverage. **No actual native KeyLog observations were supplied, so native key-log parity and genuine physical-device parity remain open.**
