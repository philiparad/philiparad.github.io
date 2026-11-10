# Independent fx-991ES-style scientific calculator — LCD-only interaction

This is an independent educational web calculator based on the static CASIO emulator REA findings and user-provided visual reference. It does **not** import manufacturer's firmware, emulator libraries, artwork, or code from the existing GitHub implementation.

## Run it

Open `index.html` in a modern browser from this folder, or open the `fx991_fresh_standalone.html` file directly (all CSS/JS embedded). There are no runtime dependencies, no React and no Node.js.

## All operations take place inside the calculator

- Press **MODE** to open the LCD menu. Select a numbered item with **1–6**. Use **▶ / ◀** to move between menu pages. Press **AC** to exit.
- Press **SHIFT → MODE** to configure angle and output settings on the LCD.
- Each multi-field operation shows a **prompt on the LCD**. Enter a value using calculator keys, then press **=** to accept the value and advance. Press **▲** to go to the previous field; press **AC** to cancel.
- For an operation-selection field, **◀ / ▶** cycle between valid choices, then **=** confirms.
- Enter comma-separated rows or observations using **SHIFT + )** (comma). The hardware ALPHA keys enter X, Y, and memory variables. A physical keyboard can also type symbols and text directly into the active LCD prompt.
- Results appear on the LCD, with **▲ / ▼** for multiple result pages. **AC** returns to editing.
- **RCL** and **SHIFT + RCL** select memory registers with the LCD; **SHIFT + 9** opens CLR; **SHIFT + 7** opens constants.
- Optional diagnostic LCD magnification, screen capture, and KeyLog appear in inline panels below the calculator, not popup dialogs. They do not accept calculations.

The available advanced modes use educational workflows, not validated manufacturer firmware sequences. The independent 96 × 31 LCD raster, model behaviors, numerical precision and display glyphs have not been established as CASIO-hardware equivalent.

## Power lifecycle (REA-044)

- **Automatic power-off (APO):** after approximately **10 minutes (600,000 ms)** without a calculator-key operation, the display switches off. This applies to the supported fx-991ES, fx-991ES PLUS, and fx-991ES PLUS C model profiles, based on the corresponding CASIO manuals. Press **ON** to resume.
- **Stored state:** APO uses the same preservation policy as **SHIFT → AC (OFF)**: Ans, PreAns, A–F, X, Y, independent M memory, calculation mode, and SETUP remain stored in the current browser session. The volatile display and replay history clear. Refreshing the browser page still restarts this standalone simulator; it is not persistent storage.
- **Background tabs:** browsers may delay scheduled callbacks; the application compares the elapsed wall-clock time when a timer runs, on tab visibility changes, and before a calculator key executes.
- **Simulated battery:** actual battery capacity is **not measured**. For diagnostics, `FreshCalculator.setSimulatedBattery('low')` or `FreshCalculator.setSimulatedBattery('normal')` marks a simulation-only state visible through `FreshCalculator.getState().batterySimulation`. This does not change computational accuracy, emulate power drain, or claim a hardware battery reading.
- **Deterministic verification:** built-in self-checks validate the model policy, exact time-limit boundary, backwards-clock handling, and the simulation label using fixed input values; no test waits ten minutes. Runtime APO is handled by one cancellable inactivity timer. Device-equivalent power consumption and actual battery decline are out of scope.

## First-class complex expressions (REA-045)

In **MODE → CMPLX**, enter an expression directly on the LCD rather than a two-complex-number wizard. The independent complex engine accepts `i`, parentheses, unary signs, `+`, `−`, `×`, `÷`, implicit multiplication, powers, `conj(z)`, `abs(z)`, `arg(z)`, `re(z)`, `im(z)`, and `sqrt(z)`. Arguments follow the selected DEG/RAD/GRAD angle unit; rectangular and polar display follow the CMPLX setup. An undefined argument of zero or division by zero reports Math ERROR.

Examples: `(2+3i)*(4-5i)` → `23+2i`; `(1+i)^2` → `2i`; `conj(2+3i)` → `2-3i`; `abs(3+4i)` → `5`; `arg(i)` → `90` in DEG mode. Type letters on a computer keyboard in CMPLX, or use **ALPHA → ENG** to insert `i` using the calculator face. The browser app's `FreshCalculator.loadExpression(text)` is also useful for repeatable tests.

**Ans and registers:** results retain real and imaginary parts in CMPLX Ans. In CMPLX mode, **SHIFT → RCL → register** stores the entire complex value; **RCL → register** recalls it; M+ and M− accumulate complex quantities. Ordinary numeric assignments in COMP supersede earlier complex values of the same register. CLR Memory/All clear complex registers, while OFF/ON preserves them in the browser session. Other modes continue to use the existing real-number engine; this does not certify CASIO firmware parity.

**Verification:** the engine was exercised with ten executable expression tests, including division-by-zero rejection, and the controller with eight state-transition tests. The modular `index.html` includes `js/complex-engine.js`. The separately embedded `fx991_fresh_standalone.html` is not automatically regenerated by this change, so the new feature is available through the modular page.

## Rectangular/polar conversion and CMPLX commands (REA-046)

The modular application supports **rectangular** (`a+bi`) and **polar** (`r∠θ`) complex-number input and output. In CMPLX, **SHIFT → (−)** inserts the polar angle separator `∠`; **ENG** or **ALPHA → ENG** inserts `i`.

**SHIFT → 2 (CMPLX)** presents four LCD menu choices, in the published order: **1 arg(**, **2 Conjg(**, **3 ►r∠θ**, **4 ►a+bi**. The last two are trailing output commands and override the SETUP choice **for that expression only**. The configured rectangular/polar output remains unchanged for the next calculation. From an existing result, the output command creates `Ans►r∠θ` or `Ans►a+bi` for explicit evaluation instead of corrupting the old expression.

Examples (DEG mode):
- `2∠45` entered with rectangular output → approximately `1.41421356237+1.41421356237i`.
- `1+i►r∠θ` → approximately `1.41421356237∠45`.
- `2∠45►a+bi` → rectangular output even when SETUP is polar.
- `conj(2+3i)` → `2-3i`; `arg(1+i)` → `45`.

**Units:** Polar input and argument output respect the current DEG, RAD or GRAD setting. The displayed argument is normalized to the interval `(-180°, 180°]` (or equivalent for the other units); an angle of `-180°` is shown as `180°`. Non-real polar radius/angle, negative radius, malformed command placement and division by zero produce an error. These are defined restrictions of this independent implementation, not a certification of all hardware limits.

**LCD:** MathIO renders the complete compact result; LineIO draws the rectangular real and imaginary values, or the polar radius and angle, on separate LCD lines. Some CASIO natural-display surd/fraction representations are not yet recreated exactly; the numerical values and chosen display form are the intended verified behavior.

**Verification (without physical hardware):** 12 complex-engine tests, 14 controller/key-sequence tests and an independent two-line LCD raster check passed. Tests included entry via physical keys, the four-option command menu, one-shot overrides, persistent SETUP behavior, radians and invalid expressions. Full browser/hardware parity tests were not performed.

## Files

- `index.html` — modular browser application.
- `styles.css` — calculator face and companion layout.
- `js/app.js` — LCD-only controller.
- `js/display.js` — independent LCD bitmap rasterizer.
- `js/math-engine.js` — independently authored arithmetic and numerical features.
- `js/keypad.js` — independent 50-key face.
- `fx991_fresh_standalone.html` — standalone HTML file with all CSS/JS embedded.
- `tests/all-modes-browser.py`, `tests/browser-flows.py` — optional development-only Playwright checks (Python); not needed to run the calculator.

## Verification

The built-in calculator checks pass **18/18**, and local Chromium browser tests successfully completed normal arithmetic, SETUP, MENU paging, TABLE, STAT, CMPLX, BASE-N, EQN, MATRIX, VECTOR, INEQ, VERIF, DIST, and numerical integration flows. Browser checks are source-behavior tests, not device-equivalence certification.
