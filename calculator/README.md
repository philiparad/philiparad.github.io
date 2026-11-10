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

## STAT LCD data editor (REA-047)

**MODE → STAT** now opens a type-selection menu: **1: 1-VAR** for one-variable data, or **2: A+BX** for paired X/Y data. The old comma-separated prompt is replaced by a scrolling table **inside the calculator's own LCD**. The table starts empty. Row capacity depends on visible columns: **80** for X alone, **40** for X/FREQ or X/Y, and **26** for X/Y/FREQ.

- Enter a number with calculator keys; **=** commits the current cell and advances to the next column, automatically creating a new row after the last column. **UP/DOWN** select rows, **LEFT/RIGHT** select columns, and **DEL** edits or clears the selected cell.
- **SHIFT → UP** inserts a row immediately after the current row. **SHIFT → DOWN** deletes the current row (the table always retains at least one blank row). **AC** exits the table and **MODE** can select another calculator mode.
- Use **SHIFT → MODE → STAT: ON/OFF** to add or hide the **FREQ** column without losing entered X/Y values. Frequency values are nonnegative integers. Zero-frequency rows contribute no observations.
- **CALC** computes statistical results shown on the LCD in a scrollable list. **UP/DOWN** scroll result pages; **AC** returns to the existing data table. One-variable results include count, sum, population/sample SD, mean, min and max. Paired-data results include X/Y means and deviations, covariance-based correlation, and least-squares slope/intercept (when defined).
- The table validates numeric entry, enforces the manual-derived **80/40/26 row limits** and **100,000 weighted observations**, and reports errors for missing paired values, invalid frequency weights, undefined results or empty datasets. The separate HTML diagnostic panels remain read-only.

**Verification:** the STAT model passed weighted-mean, paired regression, row removal and invalid-frequency tests. A simulated controller/LCD key-sequence suite passed 13/13 checks, including STAT selection, data entry, row operations, frequency SETUP, navigation and display rendering. These are behavioral tests of the independent implementation, not proof of manufacturer-firmware parity. The modular `calculator/index.html` loads `js/stat-editor.js`; the separately bundled standalone HTML file is not automatically regenerated.

## Full STAT regression and statistics menus (REA-048)

The STAT type menu now provides all eight documented types: **1 1-VAR**, **2 A+BX** (linear), **3 _+CX²** (quadratic), **4 ln X** (logarithmic), **5 e^X** (exponential), **6 A·B^X** (base-B exponential), **7 A·X^B** (power), and **8 1/X** (inverse). The selected type is shown on the LCD data table.

Press **SHIFT → 1 (STAT)** from the data table or a STAT result to access **Type, Data, Edit, Sum, Var, MinMax, Reg, and Estimate**. The Sum, Var, MinMax and Reg submenus show selectable individual values; **CALC** shows the combined summary. Statistical values include weighted sums (Σx, Σx², Σy, Σy², Σxy, Σx³, Σx²y, Σx⁴), population and sample standard deviations for both X and Y, means, minima and maxima, and fitted coefficients. The regression menu provides A/B and correlation r where defined, and A/B/C for quadratic regression. **Estimate** asks for an X or Y value and calculates y-hat or x-hat; quadratic x-hat can return two values.

Regression models:
- Linear: `y = A + B*x`
- Quadratic: `y = A + B*x + C*x^2`
- Logarithmic: `y = A + B*ln(x)` (X positive)
- e exponential: `y = A*exp(B*x)` (Y positive when fitting)
- ab exponential: `y = A*B^x` (Y positive when fitting)
- Power: `y = A*x^B` (X/Y positive when fitting)
- Inverse: `y = A + B/x` (X nonzero)

Weighted least squares are used for the models that support paired data; quadratic coefficients use scaled input and a pivoted linear solver. Invalid domains, insufficient independent observations, singular regressions and undefined inverse estimates report a calculation error instead of supplying misleading values. For a single observation, the sample standard deviation is unavailable.

The model implements the official STAT menu families and formulas but does not claim bit-identical CASIO floating-point rounding. **Changing from one-variable to paired-variable, or vice versa, clears the table**; switching between paired regression types preserves it. Data limits are **80 rows (X)**, **40 rows (X/FREQ or X/Y)**, **26 rows (X/Y/FREQ)**, with a separate bound on weighted observation count.

References: [CASIO fx-991ES PLUS guide](https://support.casio.com/storage/en/manual/pdf/EN/004/fx-570_991ES_PLUS_EN.pdf), Statistical Calculations section (E-22 to E-24).

**REA-048 verification:** seven regression-type checks, sample-SD and estimate tests, 16 end-to-end STAT key-sequence checks, and further built-in checks cover the implemented functionality. Full deployed-browser regression and physical-calculator parity checks remain outstanding.

## BASE-N signed integer entry and conversion (REA-049)

**MODE → BASE-N** now opens a key-driven calculator expression editor (the former comma-separated BASE-N wizard is removed). The initial radix is **Dec**. The physical face selects **SQUARE / x² → DEC**, **RECIP / x⁻¹ → HEX**, **LOG → BIN**, **LN → OCT**, as in the fx-991ES PLUS manual. The LCD shows a dedicated Dec/Hex/Bin/Oct label and fixed-width nondecimal results.

- Enter digits in the selected radix and calculate with **=**; `+`, `−`, `×`, `÷` and parentheses are supported here. Hexadecimal A–F use the physical **(−), °′″, hyp, sin, cos, tan** keys (NEG/DMS/HYP/SIN/COS/TAN), or A–F on a computer keyboard. In decimal mode, the **(−)** key inserts a negative sign. Unlike COMP, fractional inputs, exponents, and floating-point values are intentionally not accepted.
- With a BASE-N result displayed, pressing another radix key **converts the stored signed integer** instead of reinterpreting the displayed digits. Switching radices while entering an unfinished expression clears that unfinished input, to avoid silently changing its meaning. **AC** clears the current input/result to zero.
- Binary is **16-bit two's complement**, with signed range **−32768 through 32767**. Decimal, octal and hexadecimal are **32-bit two's complement**, with signed range **−2147483648 through 2147483647**. The nondecimal display widths are **16 BIN digits**, **11 OCT digits** and **8 HEX digits**. Overflows and conversions outside the destination's signed range report Math ERROR without silently wrapping.
- Examples: BIN `11+1` → `0000000000000100`; HEX `1F+1` → `00000020`; OCT `7+1` → `00000000010`. Decimal `-1` converts to HEX `FFFFFFFF`, OCT `37777777777`, and BIN `1111111111111111`. Divisions discard any fractional part toward zero.
- The signed ranges are currently identical for the supported fx-991ES, fx-991ES PLUS and PLUS C profiles; model-specific tables are kept separate in `js/base-n.js` for future variants.

**Scope boundary (REA-049):** radix entry, signed representations and conversion were implemented here. Logical operators and two's-complement functions were subsequently added in REA-050. Unlike physical calculator memory, the browser session does not persist across a page reload.

**Verification:** 18 direct engine tests and 14 controller/LCD key-sequence checks passed during development, covering radix selection, signed binary and octal values, HEX letter entry, width padding, decimal minimum, invalid digits, overflow, conversion and reset. Additional permanent built-in regression cases are included. These are simulator checks rather than a full real-device or deployed-browser parity test.

Reference: [CASIO fx-570ES PLUS / fx-991ES PLUS manual, BASE-N section](https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/using_calculation_modes/base-n_calculations.html).

## BASE-N logical operations and negation (REA-050)

In BASE-N, press **SHIFT → 3 (BASE)** to open the physical calculator's six-choice logical-operation menu:

1. **and** — bitwise AND
2. **or** — bitwise OR
3. **xor** — exclusive OR
4. **xnor** — exclusive NOR (complement of XOR)
5. **Not(** — bitwise complement of the operand
6. **Neg(** — arithmetic two's-complement negation

Choose an operation from the calculator menu. For binary operators, enter the second operand and press `=`. For the unary functions, enter the operand and close the parenthesis before `=`. Choosing a binary operator immediately after a displayed result uses that result as the first operand. The menu operates in the currently selected **DEC**, **HEX**, **BIN** or **OCT** radix, and respects the corresponding 32-bit or 16-bit signed integer width.

Using **BIN**:
- `1010 and 1100` → `0000000000001000`
- `1011 or 11010` → `0000000000011011`
- `1010 xor 1100` → `0000000000000110`
- `1111 xnor 101` → `1111111111110101`
- `Not(1010)` → `1111111111110101`
- `Neg(101101)` → `1111111111010011`

Logical values use explicitly masked **BigInt** words so negative complements and two's-complement negation do not silently overflow or truncate through JavaScript Number bitwise arithmetic. The expression evaluator supports parentheses and nested `Not(...)`/`Neg(...)` calls. For combinations of operators that the original manual does not explicitly specify, the simulator defines precedence as: multiplication/division, addition/subtraction, AND, XOR/XNOR, then OR. Use parentheses to make combined operations unambiguous.

**Verification:** 17 standalone engine assertions, 12 calculator-controller key-sequence checks, and 19 built-in BASE-N checks passed. The six manual examples were covered. Full deployed-browser and physical-calculator parity checks have not been run; the implementation is an independently written simulation.

Manual reference: [CASIO fx-570ES PLUS / fx-991ES PLUS user's guide, Logical and Negation Operations, page E-27](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-570ESPLUS_991ESPLUS_EN.pdf).

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
