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

## EQN cubic and three-variable systems (REA-051)

**MODE → 5 (EQN)** now presents the four CASIO equation types, in documented order: **1** two-unknown simultaneous linear equations, **2** three-unknown simultaneous equations, **3** quadratic `aX²+bX+c=0`, and **4** cubic `aX³+bX²+cX+d=0`. The original sequential numeric prompts were replaced by a dedicated calculator-LCD coefficient matrix editor in **REA-052**. The matrix supports the six, twelve, three or four respective coefficients.

**Results:** after the final coefficient is confirmed, the LCD displays the first solution. Press **= / DOWN / RIGHT** for the next solution, **UP / LEFT** to go backward, and **AC** to return to the coefficient matrix with its values retained. Pressing **=** after the last root also returns to the coefficient matrix. Solving does not overwrite normal COMP answer memory. The simulator displays real roots as numbers and complex solutions as real/imaginary parts on separate LCD rows.

**Mathematics and edge cases:** 2×2 and 3×3 linear systems use pivoted Gaussian elimination, classify **No Solution** and **Infinite Solutions**, and validate numeric residuals. Quadratic equations use a cancellation-resistant formula and display non-real conjugate roots. Cubic equations use Cardano's formula, trigonometric evaluation for three distinct real roots, and return complex conjugate roots when only one root is real. A repeated real root appears once, in line with the device's unique-root presentation; leading coefficients of zero are rejected. For the manufacturer's example `X³−2X²−X+2=0`, the result order is **X1=−1, X2=2, X3=1**. For `X²+X+3/4=0`, the two complex solutions are approximately **−0.5±0.707106781187i**.

**Supported test examples:** the CASIO three-unknown system `X−Y+Z=2; X+Y−Z=0; −X+Y+Z=4` gives **X=1, Y=2, Z=3**. Both inconsistent and underdetermined systems produce explicit classification instead of invented roots. The roots are independently computed numerically, without CASIO firmware; exact surd/fraction typography and hardware-level rounding remain outside the verified scope.

**Verification:** independent engine checks cover distinct, repeated and complex polynomial roots, 2×2/3×3 systems and singular cases; controller checks cover coefficient entry, paged solutions, and returning to retained coefficients. Full deployed-browser and physical-calculator parity tests have not been performed.

Official reference: [CASIO fx-991ES PLUS equation calculations](https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/using_calculation_modes/equation_calculations.html).

## EQN coefficient matrix editor and MathIO exact output (REA-052)

The dedicated LCD-native **EQN Coefficient Editor** replaces the old sequential prompt wizard for all four equation types. It displays the numeric coefficient matrix inside the calculator screen, not in a separate web form. Each type starts with zero-filled coefficients, following the CASIO fx-991ES PLUS guide.

**Key operation:** select **MODE → EQN**, then the equation type. Enter a number and press **=** to commit it and advance to the next cell. **UP/DOWN** move between rows; **LEFT/RIGHT** move between coefficient cells. To correct an earlier value, navigate to it, type the replacement and confirm with **=**. **(−)** toggles its sign, **DEL** removes digits from the edited value, and decimal/scientific notation is accepted. **AC** clears all coefficients to zero (it does not exit the editor). Unsupported operations such as memory accumulation, STO, Pol and Rec are intentionally rejected in this editor.

The final **=** on the last cell calculates the equation and opens the first result. Each further **=** advances through the solution pages; after the last result it returns to the coefficient matrix with all entered values preserved. **AC** on a solution screen also returns to the matrix. An invalid equation (such as a zero leading coefficient) leaves the matrix and its values available for correction. Changing equation type creates a new zero-filled matrix.

**Output:** In MathIO, eligible values are displayed as reduced rational fractions or simple quadratic radicals using symbolic `√` notation; for example, `2X²+X−3=0` produces `−3/2` and `1`, while `X²−2=0` produces `−√2` and `√2`. `X²+X+3/4=0` can be displayed as `−1/2±√2/2i`. These symbolic expressions are emitted only when the coefficients admit a validated simple rational/surd representation. Otherwise the numerical result is retained. LineIO uses decimal values instead. Simultaneous-equation outputs do not invent surd solutions. The LCD uses a compact textual presentation; it does not yet reproduce every pixel of the original stacked-fraction typesetting.

**Testing:** 12 dedicated coefficient-editor model checks, 9 exact-output-format checks, 20 controller key-sequence tests and 15 EQN built-in tests passed during implementation. Tests covered re-editing cells, AC clear, changing equation type, error correction, real/complex/fraction results, and all rows of a 3×3 system. Full deployed-browser visual regression and physical-device parity testing were not performed.

References: <https://support.casio.com/storage/en/manual/pdf/EN/004/fx-570_991ES_PLUS_EN.pdf>, Equation Calculations (EQN), page E-28.

## MATRIX registers, dimensions and matrix answer memory (REA-053)

**MODE → MATRIX** now opens a native LCD workflow instead of the previous one-off two-matrix 2×2 web prompt. Three independent matrix registers, **MatA**, **MatB** and **MatC**, can each hold a numeric matrix of **1–3 rows by 1–3 columns** (all nine dimension combinations). Each register remembers its dimensions and entries when another register is opened or another calculator mode is selected. Full calculator reset clears all matrix registers and history.

**Define a register:** enter MATRIX mode, choose **MatA / MatB / MatC** (1/2/3) and choose a dimension (1–9). The last **3×3** option is on the next menu page: press **RIGHT → 9**. The LCD displays an editable table. Type a numeric value and press **=** to store it and advance, or use **UP/DOWN/LEFT/RIGHT** to navigate individual cells. **(−)** changes a cell's sign; **DEL** edits the value. A repeated edit does not affect other registers. Press **AC** to leave the editor while preserving committed changes. On the final **=**, the editor closes and stores the completed matrix.

**Matrix menu:** press **SHIFT → 4 (MATRIX)** in MATRIX mode to access **1 Dim**, **2 Data**, **3 MatA**, **4 MatB**, **5 MatC**, **6 MatAns**, **7 Copy**, **8 Calc**, **9 History**. The ninth option is on the next page (**RIGHT → 9**). **Dim** creates or replaces a register at a chosen dimension; **Data** reopens an existing editable register. Register/MatAns options inspect stored values using the LCD and arrow keys. **Copy** copies any existing MatA/MatB/MatC/MatAns into another register, producing an independent matrix that can be edited without changing the source.

**MatAns and history:** supported calculations retain the previous **add, multiply and determinant** operations. Choose **Calc**, then an operation and the input registers; incompatible dimensions report a calculation error. A matrix result is stored as **MatAns** and displayed as a browsable LCD matrix. Scalar determinant results are shown as numbers. A history of the most recent **30** matrix calculations holds operand snapshots and result snapshots; selecting a historical matrix restores that result into MatAns. This history is separate from the general COMP input history.

**Example:** define MatA = `[[2,1],[1,1]]`, MatB = `[[2,-1],[-1,2]]`; multiply them to obtain **MatAns = [[3,0],[1,1]]**. Copy MatAns to MatC and edit MatC independently: the saved MatAns and MatA/MatB remain unchanged. All dimensions within 3×3 are available. Further matrix operations, including subtraction, inverse, transpose, powers, scalar multiplication and absolute determinant, were added in **REA-054**. Full arbitrary MATRIX expression parsing remains beyond the verified scope.

**Verification:** 18 matrix-register/engine tests, 15 key-sequence tests for register definition, arithmetic, MatAns, copy and independent edits, 6 further key-sequence tests for 3×3 page selection and mode-change persistence, and 7 built-in MATRIX checks passed. These are implementation-level tests; actual browser rendering and physical-device parity have not yet been fully verified.

Official reference: <https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/using_calculation_modes/matrix.html>.

## MATRIX arithmetic operations and error semantics (REA-054)

The **MATRIX Calc** menu, opened with **SHIFT → 4 → 8**, now provides all nine operations. Options **1–8** fit on its first menu page; press **RIGHT → 9** to access the final option. Each operation chooses the required MatA, MatB or MatC register (uninitialized registers are not offered). All calculations are performed on independent snapshots and store matrix results in **MatAns** while retaining the source registers.

| Calculator option | Operation | Constraints / result |
|---|---|---|
| 1 Add | MatA + MatB or any two chosen registers | Matching dimensions; matrix MatAns |
| 2 Multiply | Matrix product | Left columns equal right rows; matrix MatAns |
| 3 Det | Determinant | Square matrix only; scalar |
| 4 Subtract | A − B | Matching dimensions; matrix MatAns |
| 5 Inverse | A⁻¹ | Square nonsingular matrix; matrix MatAns |
| 6 Transpose | Transpose(A) | Any 1–3 by 1–3 matrix; matrix MatAns |
| 7 Power | A^n | Square matrix, integer exponent from −99 through 99; matrix MatAns |
| 8 Scalar | k·A | Numeric scalar multiplier; matrix MatAns |
| 9 AbsDet | Absolute value of determinant | Square matrix only; nonnegative scalar |

After selecting **Power** or **Scalar**, use the calculator's dedicated LCD parameter editor to enter a signed exponent or scalar. **(−)** starts a negative parameter, **DEL** corrects digits, **=** calculates and **AC** returns to MATRIX options without changing the registers. A zero power returns the identity matrix; a negative power uses the inverse first. Fractions and decimals are allowed for scalar multiplication, but exponentiation is restricted to whole-number exponents. If any computation is invalid (dimension mismatch, singular inverse, noninteger exponent or numerical overflow), an error is displayed; **MatAns** and calculation history remain unchanged, and the user can correct the input or select another operation.

**Calculation examples:** In MatA store `[[4,7],[2,6]]`; its inverse is `[[0.6,-0.7],[-0.2,0.4]]`, its square is `[[30,70],[20,50]]`, and scalar multiplication by `−2` yields `[[-8,-14],[-4,-12]]`. Transposing a (2×3) matrix produces (3×2), and taking absolute determinant of `[[1,2],[3,4]]` returns `2`.

**Scope and verification:** The core engine includes numerically checked inverses (Gaussian elimination with pivoting), matrix dimensions up to (3×3), and typed errors. Standalone engine tests, calculator key-sequence tests and permanent self-tests cover the new operations and invalid cases. Arbitrary typed MATRIX expressions and bit-for-bit CASIO numerical rounding are **not** claimed complete; no deployed-browser visual or physical-calculator parity test was performed.

## VECTOR named registers, dimension editing and VctAns (REA-055)

**MODE → VECTOR** (second MODE page, **RIGHT → 2** in the 8-mode emulator menu) now opens native vector-register selection instead of the original one-off pair-of-vectors prompt. Define independent **VctA**, **VctB**, and **VctC** registers with **two or three components**. The registers retain their dimensions and entries while switching other calculator modes; full calculator reset clears these vectors, VctAns and vector history.

**Editor controls:** choose a register, then **1 = 2D** or **2 = 3D**. The calculator LCD displays its component list. Type each numeric component and press **=** to store and advance. **UP/DOWN/LEFT/RIGHT** move between components and permit replacement of an earlier value; **(−)** switches signs, and **DEL** deletes a digit. Pressing **=** on the final component or **AC** exits the table with committed values saved. Press **SHIFT → 5** to open the VECTOR menu.

**VECTOR menu:** **1 Dim** defines a named register, **2 Data** reopens its editor, **3 VctA**, **4 VctB**, **5 VctC** and **6 VctAns** display stored vectors, **7 Copy** copies a register or VctAns into an independent destination register, **8 Calc** offers Dot, Cross and Abs (magnitude), and **9 History** recalls up to 30 recent vector calculations (on page 2, **RIGHT → 9**). Existing operations have been integrated with the persistent register model. The 3D cross product creates a **VctAns** vector; scalar dot products and magnitudes are displayed as numbers and do **not** overwrite existing VctAns.

**Example:** choose VctA = `(1,2,3)` and VctB = `(4,5,6)`. Dot product gives **32**; cross product gives **VctAns = (−3,6,−3)**; magnitude of VctA is **√14 ≈ 3.74165738677**. Copy VctAns to VctC, edit VctC, and the saved VctAns remains unchanged.

**Error semantics:** a cross product requires both vectors to be 3D; dot products require equal vector dimensions; invalid components and unsupported calculations are rejected. Failed calculations do not overwrite vector history or VctAns. This implements the REA-055 storage/editor/memory requirements; broad VECTOR expression parsing and additional operation parity are separate follow-up tasks.

**Verification:** 23 vector model unit tests, 16 end-to-end key-sequence tests, LCD rendering checks and nine permanent VECTOR regression checks were added or executed during development. These are simulator checks rather than full deployed-browser or physical-calculator equivalence tests.

## VECTOR arithmetic, scalar products and geometric angle interpretation (REA-056)

**Scope:** REA-056 completes the VECTOR calculation operations while preserving the VctA, VctB and VctC registers, native editor and VctAns memory introduced in REA-055. In VECTOR mode, press **SHIFT → 5 → 8 (Calc)** to select:

| Menu key | Operation | Result and restrictions |
|---|---|---|
| 1 | Dot product (A·B) | Scalar; vectors must have equal 2D or 3D dimensions |
| 2 | Cross product (A×B) | Vector stored in VctAns; currently requires 3D vectors |
| 3 | Magnitude `Abs(A)` | Scalar nonnegative length |
| 4 | Addition A+B | Vector stored in VctAns; dimensions must match |
| 5 | Subtraction A−B | Vector stored in VctAns; dimensions must match |
| 6 | Scalar multiplication kA | Vector stored in VctAns; LCD prompts for a signed decimal factor |
| 7 | Angle between A and B | Scalar in current DEG/RAD/GRA unit; dimensions must match and both lengths must be nonzero |

**Geometric interpretation:** The angle is computed from `acos((A·B)/(|A||B|))`, with the cosine clamped into `[-1,1]` to avoid spurious domain failures near parallel vectors. The result uses the configured angle unit (**degrees**, **radians**, or **gradians**). The display/notice also labels a pair as **perpendicular**, **parallel in the same direction**, **parallel in opposite directions**, **acute**, or **obtuse** when the component values justify it. Selecting Angle directly in this emulator is a *convenience addition*: the physical fx-991ES PLUS manual obtains the angle with dot product, magnitudes and inverse cosine rather than a dedicated Angle command.

**Examples:** with VctA=(1,2,3) and VctB=(4,5,6), addition gives VctAns=(5,7,9), subtraction gives VctAns=(-3,-3,-3), dot product gives 32 and cross product gives VctAns=(-3,6,-3). Multiplying VctA by -2 gives VctAns=(-2,-4,-6). For perpendicular 2D vectors (3,4) and (-4,3), Angle returns 90° in DEG, π/2 in RAD or 100 in GRA.

**Memory and errors:** Vector results replace **VctAns** but never alter VctA/VctB/VctC. Scalar results (dot, magnitude and angle) do **not** overwrite a previous VctAns. Successful operations append snapshots to the separate VECTOR history, including the angle's geometric classification and unit. A zero vector cannot form an angle; incompatible dimensions, invalid scalar inputs and overflow are rejected with an error. Failed calculations preserve VctAns and history. A signed numeric scalar can be corrected in the LCD parameter prompt without re-entering the vectors.

**Verification:** 21 dedicated engine checks, 20 controller key-sequence tests and 20 built-in VECTOR regression checks exercise arithmetic, scalar signs, angle units, geometry classifications, dimensional failures, error recovery, history and VctAns preservation. Physical-calculator parity and deployed-browser graphical tests have not yet been carried out.

CASIO reference: <https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/using_calculation_modes/vector_calculations.html>.

## TABLE f(X), g(X) and native synchronized grid (REA-057)

REA-057 replaces the previous TABLE text-list result with a calculator-LCD-native, synchronized table. It accepts **f(X)** and, on the **fx-991ES PLUS C** model when enabled in SETUP, **g(X)**. Enter the functions, then **Start**, **End**, and **Step**. The input expressions are evaluated against the same X values; the table displays **X | F(X) | G(X)** for dual-function mode, or **X | F(X)** for single-function mode.

**CASIO-specific row limits:** The standard **fx-991ES PLUS** and original **fx-991ES** support a single f(X) table of **at most 30 rows**. The **fx-991ES PLUS C** supports either a single f(X) table (**30 rows**) or simultaneous f(X), g(X) tables (**20 rows**). In PLUS C, select **SETUP → TABLE → f(X)** or **f(X),g(X)**. The simulator will not offer dual columns on non-C models, even if an incompatible setup value was retained. In the C dual-function input workflow, leaving g(X) empty produces a single-function table with the single-function limit.

**Generation and editing:** TABLE prompts accept a numeric Start, End and positive Step, with **End greater than Start**. Rows include X values from Start in increments of Step, stopping at the last value not exceeding End (including End if reached). Requests exceeding the model-specific row allowance report **Insufficient MEM** without changing existing calculator history; zero/negative steps and reversed ranges report **Argument ERROR**. Individual function-evaluation domain failures appear as **ERROR** cells. A completed table updates scalar memory X to the last generated X value, matching CASIO TABLE behavior.

**Native LCD navigation:** **UP/DOWN** move through rows and simultaneously keep f(X) and g(X) aligned with the same X. **LEFT/RIGHT** select the X, F(X) or G(X) column. The 96×31 LCD shows a compact three-column table, a highlighted selected cell, and a full-value inspection line. **AC** or **=** returns to the function-entry prompts with the previous functions and range preserved for editing. TABLE results are view-only; individual computed table cells cannot be edited.

**Example:** On PLUS C, set f(X)=X²−2 and g(X)=X+1; Start=−1, End=1, Step=0.5. Five synchronized rows appear:

| X | F(X) | G(X) |
|---:|---:|---:|
| -1 | -1 | 0 |
| -0.5 | -1.75 | 0.5 |
| 0 | -2 | 1 |
| 0.5 | -1.75 | 1.5 |
| 1 | -1 | 2 |

**Verification:** 20 table-model unit tests, 15 end-to-end controller tests and 12 permanent built-in TABLE regression checks were added/executed. The LCD was checked in both single- and dual-function layouts. Full deployed-browser visual parity and physical-device validation remain outstanding.

Official CASIO documentation: [fx-991ES PLUS TABLE](https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/using_calculation_modes/creating_number.html); [fx-991ES PLUS C manual](https://support.casio.com/pdf/004/fx-115_991ES_PLUS_C_E.pdf).

## INEQ actual quadratic and cubic inequality solution sets (REA-058)

**MODE → INEQ** now computes the real solution sets instead of displaying only zeros and a general sign explanation. This mode is exposed on calculator profiles that support INEQ. Choose **1 Quadratic** or **2 Cubic**; then choose the relation (**1 >**, **2 <**, **3 ≥**, **4 ≤**) and enter three or four polynomial coefficients in the existing LCD prompt editor. The leading coefficient must be nonzero. Press **=** after the last coefficient to calculate the satisfying intervals.

The solver supports all four comparisons `<`, `<=`, `>`, `>=` against zero. It sorts all real polynomial roots, recognizes even- and odd-multiplicity roots, computes the sign of every intervening interval, and merges adjacent intervals only when their shared root is included in the solution. Strict inequalities exclude equality points; non-strict inequalities include them. Quadratic cases with no real zeros, tangent roots, cubic cases with one or three distinct real zeros, cubic double roots, and cubic triple roots are supported.

**Examples:**
- `X²−3X+2 < 0` → `1 < X < 2`.
- `X²−3X+2 ≥ 0` → `X ≤ 1 OR X ≥ 2`.
- `X²+1 < 0` → `No solution`; `X²+1 ≥ 0` → `All real X`.
- `(X−1)² ≤ 0` → `X = 1`.
- `X³−3X+2 ≤ 0` → `X ≤ −2 OR X = 1`.
- `2X³−3X² ≥ 0` → `X = 0 OR X ≥ 1.5`, also used as an example in the CASIO manual.

**Navigation and presentation:** Solutions use the existing calculator LCD result pages. **UP/DOWN** browse solution rows, **LEFT/RIGHT** pan longer lines and **AC** returns to regular mode. Output explicitly uses `No solution` or `All real X` where applicable. Root bounds are shown with up to 12 significant decimal digits where an irrational value cannot be expressed exactly in this interface. Native INEQ coefficient editing and special-case MathIO output were added in **REA-059**. Full physical-hardware LCD parity remains unverified.

**Verification:** The dedicated inequality model passed 26 focused tests; the integrated controller passed 14 end-to-end keypad checks; 14 built-in regression cases cover quadratic/cubic sign intervals, repeated zeros, degeneracy and official CASIO examples. The tests are simulator-level and do not establish physical-device parity or complete deployed-browser validation.

Official manual: <https://support.casio.com/pdf/004/fx-115_991ES_PLUS_C_E.pdf>.

## INEQ native coefficient editing and special-case displays (REA-059)

REA-059 replaces the REA-058 sequential coefficient prompts and generic multi-line output with calculator-native **INEQ coefficient cells** and a **dedicated paged LCD result**. The underlying REA-058 polynomial interval solver is unchanged.

**Workflow:** Select **MODE → INEQ**, choose **quadratic** or **cubic**, then the relation **>**, **<**, **≥** or **≤**. The LCD displays a horizontal three-cell `a,b,c` table for quadratics or a four-cell `a,b,c,d` table for cubics. The default leading coefficient is `1`; other coefficients begin at `0`. Enter signed numbers and decimals with the calculator keys. **=** stores the active coefficient and moves to the next. **LEFT/RIGHT** allow revisiting any coefficient, **DEL** edits digits, **(−)** switches the sign and **AC** clears the coefficient table. The last **=** solves the inequality. Errors such as a zero leading coefficient preserve the table and permit correction without re-entering the other values.

**Result paging:** The solution is divided into one **INEQ result page per disjoint solution interval or isolated equality root**. **=**, **DOWN**, or **RIGHT** advances; **UP** or **LEFT** returns to the preceding page. **AC** returns to the stored coefficient table; advancing past the last result also returns to the coefficient table. The LCD header names the inequality degree and relation and highlights special cases such as **NO SOLUTION**, **ALL REAL X**, and **EQUALITY ROOT**.

**Natural MathIO:** When supported, interval boundaries use reduced rational fractions, e.g. `X > 3/2` rather than `X > 1.5`, and certain quadratic irrational roots use radicals, such as `−√2 < X < √2` or `3/2−√5/2 < X < 3/2+√5/2`. LineIO retains numeric decimal bounds. Root expression conversion is deliberately conservative, so other roots continue to use decimal approximations rather than unverified symbolic expressions. The display is a compact text-rendering approximation to the hardware LCD, **not** a verified pixel-identical CASIO result layout.

**Special cases:** For `X²+1 < 0`, the LCD shows **No Solution**; for `X²+1 ≥ 0`, it shows **All Real Numbers**. For `(X−1)² ≤ 0`, it shows the isolated solution **X = 1**. For `X³−3X+2 ≤ 0`, two pages show **X ≤ −2** and **X = 1**. A strict inequality with a tangent root correctly excludes that root, keeping the two disjoint intervals separate.

**Verification:** The result formatter passed 17 unit tests, and a dedicated end-to-end controller/keypad run exercised coefficient entry, navigation, correction, result paging, empty and all-real outcomes, and MathIO surds. Additional built-in INEQ regression cases cover the new formatting and coefficient-editor behavior. Full deployed-browser rendering and real-device parity testing remain outstanding.

## VERIF chained relational expressions (REA-060)

**MODE → VERIF** now presents a single editable **relation chain**, replacing the former three-field Left / Operator / Right calculation form. Enter a combined expression such as `1<2<3`, `2^3=8`, `1<=2<3`, or `1<2!=3`, and press **=** to obtain **TRUE** or **FALSE**. Each adjacent comparison is evaluated independently and a chain is TRUE only if **all** comparisons succeed; for example, `1<2<3` is TRUE but `1<3<2` is FALSE. Both results update the scalar Ans as `1` or `0` respectively.

**Relational-key entry:** In the relation input prompt, press **CALC** to open a six-option operator picker: **1 =**, **2 !=**, **3 <**, **4 <=**, **5 >**, **6 >=**. Alternatively press **SHIFT + 1–6** to insert the corresponding operator at the input cursor. Standard calculator arrows move the cursor; **DEL** corrects text; the regular numeric, arithmetic, function and parentheses keys still enter the subexpressions. The `TEXT:` input route also accepts relation strings. Plain-text aliases `≤`, `≥`, `≠`, `==`, and `<>` are recognized for copy/paste and programmatic entry.

**Truth semantics:** Equality is a strict numerical comparison **without epsilon tolerance**; `!=` is its exact complement. Inequalities use the direct numerical `<`, `<=`, `>`, and `>=` operations. Arithmetic is evaluated by the existing calculator expression engine; each subexpression in a chain is computed once. The existing engine may round certain operations, so comparisons depend on the actual numeric results. For example, the current implementation evaluates `1/3*3=1` as TRUE, whereas `sin(30)=0.5` may be FALSE because the computed sine is not represented as exactly `0.5`. This precision behavior is not represented as physical CASIO hardware parity.

**Errors:** No relational operator, missing operands, consecutive malformed relations, unmatched parentheses, invalid mathematical operations and nonfinite results produce **Syntax ERROR**, **Math ERROR**, or the underlying arithmetic error. Invalid input keeps the editable relation prompt available for corrections; a failed verification does not overwrite the prior Ans.

**Verification:** 21 dedicated chained-relation unit tests, 13 calculator controller key-sequence checks, 12 additional permanent built-in VERIFY regressions, and a real calculator-math-engine cross-check verify parsing, relation-key entry, chain truth tables, strict comparison behavior and error recovery. Full deployed-browser visual and physical-device parity testing remain outstanding.

## DIST seven distribution calculations (REA-061)

REA-061 completes **all seven** distribution calculation types on the **fx-991ES PLUS C** model. The original educational four-choice Normal/Binomial form is replaced by a model-correct **DIST type** menu and independent, ordered parameter prompts. Select **MODE → DIST** (in the simulator's 11-mode picker, the second page: **MODE → RIGHT → 5**). The DIST menu shows four types on page one and three on page two; use **RIGHT** to reach the latter.

| Menu page | Selection | CASIO DIST name | Input parameter order |
|---|---|---|---|
| 1 | 1 | Normal PD | x, σ, μ |
| 1 | 2 | Normal CD | Lower, Upper, σ, μ |
| 1 | 3 | Inverse Normal | Area, σ, μ (left tail) |
| 1 | 4 | Binomial PD | x, N, p |
| 2 | 1 | Binomial CD | x, N, p |
| 2 | 2 | Poisson PD | x, μ |
| 2 | 3 | Poisson CD | x, μ |

**Usage:** Enter numeric values or supported arithmetic expressions in the same sequence as the original CASIO. **=** advances to the next parameter and calculates after the final input. The result is written to scalar Ans and displayed numerically on the calculator LCD. Press **=** or **AC** from the result to reopen the first parameter with the previous values retained; press **SHIFT → 1** in the DIST entry/result workflow to reopen the distribution-type menu. REA-062 adds the dedicated DIST List editor with a 25-sample limit and X/Ans result columns; the scalar Var workflow from REA-061 remains available.

**Accuracy and domains:** Gaussian PD/CD use a standard normal density and numerically integrated CDF with direct tail integration. Inverse Normal solves the **left-tail quantile** using a monotone bracketed numerical method. Binomial probabilities use stable log-factorial evaluation and recurrence-based cumulative tails; Poisson probabilities use log-factorial PMFs and recurrence-based tails. Cumulative probabilities are clamped into [0,1] to correct rounding noise. Standard deviations must be positive; binomial trials, success counts and Poisson counts must be nonnegative integers, with binomial success probabilities in [0,1] and Poisson means nonnegative. An inverse-normal Area of 0 or 1 has no finite quantile and is rejected with a Math ERROR. Invalid parameters leave the editable prompt open without updating Ans. Very expensive cumulative calculations have a bounded operation count and report Time Out Error rather than hanging the browser.

**Reference examples:** Normal PD at x=36, σ=2, μ=35 is **0.1760326634**, matching the CASIO manual; Normal CD from -1 to 1 with μ=0 and σ=1 is approximately **0.6826894921**; inverse Normal at Area=.975, σ=1, μ=0 is approximately **1.9599639845**; Binomial PD at x=10, N=15, p=.6 is approximately **0.1859378448**; and Poisson CD at x=3, μ=2 is approximately **0.8571234605**.

**Verification:** 30 initial numerical/domain unit tests, 28 further reference-data/edge-case tests, 26 controller key-sequence tests, and 17 permanent built-in DIST checks were run or added for the seven type/parameter workflows. Numerical agreement has not been certified against every hardware firmware variant; CASIO documents distribution accuracy up to five significant digits, and visual LCD / key-scan hardware parity remains unverified.

Official model-specific source: <https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/using_calculation_modes/dist.html>.

## DIST List input, editing and X/Ans result table (REA-062)

REA-062 implements the calculator-style **DIST List** workflow for the **four discrete distribution modes**: Binomial PD, Binomial CD, Poisson PD and Poisson CD. The three normal distributions retain Var-only input.

**Select input format:** Enter **MODE → DIST**, select the desired discrete distribution type, then choose **1 Var** for the existing single-value workflow or **2 List** for multiple sample values. In the emulator's 11-mode menu, DIST is **MODE → RIGHT → 5**; the DIST type menu shows the first four types, with the final three on its second page. The selected List has a maximum of **25 X samples**. All rows share the same distribution parameters (N, p, or μ).

**Enter and edit List samples:** The LCD shows two columns, **X** and **Ans**, with a highlight on the selected cell. Type a signed numeric sample and press **=** to store it and advance. Use **UP/DOWN** to move between samples and **LEFT/RIGHT** to inspect X or Ans. Selecting an existing X row and entering a new value replaces that sample. **DEL** on a selected, unedited row removes the sample and closes the gap; while editing a value, **DEL** removes the final digit.

**Insert or clear:** Press **SHIFT → 1** to open **DIST Edit**. Choose **1 Ins** to insert a new sample immediately before the current row, enter its value and press **=**; invalid input does not mutate the existing samples, and **AC** cancels the pending insertion. Choose **2 Del-A** to clear the entire sample list. Choose **3 Type** to switch distribution types, or **4 Calc** to calculate. Attempting to exceed 25 samples reports **Insufficient MEM**.

**Calculate:** From the List screen press **CALC**, then enter the shared parameters in CASIO order:
- Binomial PD/CD: `N`, then `p`.
- Poisson PD/CD: `μ`.

Press **=** after each parameter. The same LCD screen then shows **X** and the corresponding calculated **Ans** for each sample. Calculations that fail for an individual X (such as a non-integer) appear as **ERROR** in that row's Ans cell, while valid rows still produce answers. Invalid *shared* parameters produce an error without discarding the sample list. Editing or deleting X values invalidates outdated Ans values until the list is recalculated. **AC** while actively entering a sample cancels its current edit; otherwise it returns to the Var/List selection.

**CASIO example:** Choose Binomial PD, List, and enter X values **10, 11, 12, 13, 14**. Press CALC and enter N=15 and p=0.6. The Ans column contains approximately **0.18594, 0.12678, 0.063388, 0.021942 and 0.0047018**, matching the model's documented five-sample example.

**Scope and verification:** This is a browser-calculator approximation of the fx-991ES PLUS C List experience; it is not pixel-identical or certified against the device's scan codes. The DIST List model passed 18 focused unit tests, the controller passed a 19-step realistic key-sequence test, and 16 permanent List regression checks cover capacity, insertion/deletion, stale results, per-row errors and scalar calculation preservation. Full deployed-browser graphical testing remains outstanding.

Official CASIO reference: <https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/using_calculation_modes/dist.html>.

## Scientific constants: all 40 manufacturer codes (REA-063)

REA-063 replaces the five-entry shortcut menu with CASIO's documented **40 scientific constants**, keyed by their fixed **two-digit codes 01–40**. In a normal calculation, press **SHIFT → 7 (CONST)**. The LCD displays **CONSTANT / Number 01–40?**; enter two digits. For example, **SHIFT → 7 → 2 → 8** inserts `c₀`, the speed of light in vacuum, as an expression operand equal to **299792458 m/s**. This works inside arithmetic expressions: `2 × CONST 28` computes **599584916**. Press **DEL/LEFT** to erase a digit, **AC** to cancel, or enter another valid two-digit code after a rejected code. Codes 00 and 41–99 are rejected. Scientific constants are not available in BASE-N, following the documented mode restriction.

**Complete code map** (the number, symbol, and physical quantity are shared by the fx-991ES, fx-991ES PLUS and fx-991ES PLUS C manufacturer manuals):

| Codes | Symbols and quantities |
|---|---|
| 01–05 | 01 proton mass (mp); 02 neutron mass (mn); 03 electron mass (me); 04 muon mass (mμ); 05 Bohr radius (a₀) |
| 06–10 | 06 Planck constant (h); 07 nuclear magneton (μN); 08 Bohr magneton (μB); 09 reduced Planck constant (ħ); 10 fine-structure constant (α) |
| 11–15 | 11 classical electron radius (re); 12 electron Compton wavelength (λc); 13 proton gyromagnetic ratio (γp); 14 proton Compton wavelength (λcp); 15 neutron Compton wavelength (λcn) |
| 16–20 | 16 Rydberg constant (R∞); 17 atomic mass constant (u); 18 proton magnetic moment (μp); 19 electron magnetic moment (μe); 20 neutron magnetic moment (μn) |
| 21–25 | 21 muon magnetic moment (μμ); 22 Faraday constant (F); 23 elementary charge (e); 24 Avogadro constant (NA); 25 Boltzmann constant (k) |
| 26–30 | 26 ideal gas molar volume (Vm); 27 molar gas constant (R); 28 speed of light (c₀); 29 first radiation constant (c₁); 30 second radiation constant (c₂) |
| 31–35 | 31 Stefan–Boltzmann constant (σ); 32 electric constant (ε₀); 33 magnetic constant (μ₀); 34 magnetic flux quantum (Φ₀); 35 standard gravity (g) |
| 36–40 | 36 conductance quantum (G₀); 37 vacuum impedance (Z₀); 38 Celsius temperature offset (t); 39 Newtonian gravitational constant (G); 40 standard atmosphere (atm) |

**Historical numeric profiles:** For **fx-991ES PLUS** and **fx-991ES PLUS C**, the catalog uses the **NIST CODATA 2014 values**, matching the 2nd-edition CASIO PLUS reference (for example `G = 6.67408×10⁻¹¹`). For the **original fx-991ES**, the implementation uses the **NIST CODATA 2002 historic values** as a period-appropriate *approximation* (for example `G = 6.6742×10⁻¹¹`); the original calculator manual lists the same 40 codes but does not clearly identify the precise embedded CODATA release, so physical-ROM value parity is **not** asserted for that model. The 40 values are historical, **not 2026 scientific recommendations**. The numerical catalog keeps signs, SI units and constant identity; exact mathematical constants such as π and e are separate from the manufacturer-coded scientific constants.

**Expression integration:** Each selected constant is inserted as a protected ordinary numeric expression such as `(2.99792458*10^(8))`. This avoids requiring extra symbolic parser functions and permits addition, multiplication and division using the existing calculator engine. The entry is converted at sufficient numeric precision for the underlying JavaScript calculator's 15-significant-digit evaluation. The text LCD prompts for a constant code rather than showing the old five-option list.

**Tests:** 13 catalog/controller source-model assertions, **120 numeric expression checks** (40 codes × 3 models) using the real calculator math engine, 13 keypad-navigation scenarios, and 12 permanent built-in CONST regressions cover all manufacturer codes, code entry/cancel/recovery, model profiles and arithmetic insertion. Full deployed-browser visual and physical-device parity tests remain outstanding.

**Source manuals and numeric archives:** CASIO 2nd-edition [scientific-constants table](https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/function_calculations/scientific_constants.html); CASIO [original fx-991ES manual](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ES_991ES_EN.pdf); NIST [2002 CODATA ASCII archive](https://physics.nist.gov/cuu/Constants/ArchiveASCII/allascii_2002.txt) and [2014 CODATA ASCII archive](https://physics.nist.gov/cuu/Constants/ArchiveASCII/allascii_2014.txt).

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
