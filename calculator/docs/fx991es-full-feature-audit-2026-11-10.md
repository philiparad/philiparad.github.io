# CASIO fx-991ES feature inventory and post-REA-068 development backlog

**Audit date:** 2026-11-10  
**Target source:** [philiparad.github.io/calculator](https://github.com/philiparad/philiparad.github.io/tree/main/calculator) (`main`)  
**Primary manufacturer source:** [Original fx-115ES / fx-991ES manual](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ES_991ES_EN.pdf)  
**Secondary source:** [fx-991ES PLUS manual](https://support.casio.com/storage/en/manual/pdf/EN/004/fx-570_991ES_PLUS_EN.pdf)  
**C-edition source:** [fx-991ES PLUS C guide](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/)  
**Repository evidence:** `calculator/js/`, `calculator/index.html`, `calculator/reference/`, `calculator/tests/`, `calculator/reference/rea-008/capabilities.json`.

## Audit method and scope

This is a reverse-engineering-style **feature comparison** of published model documentation and the current independent web implementation. It does not decompile manufacturer firmware or use undocumented CASIO internal software. The original fx-991ES has 8 modes (COMP, CMPLX, STAT, BASE-N, EQN, MATRIX, TABLE, VECTOR). The PLUS C edition additionally supports INEQ, VERIF and DIST. These features are **not** required for original fx-991ES parity. Keep edition-specific command sets separate.

Status legend:
- **source**: current code contains an operational path, but model-specific hardware parity is NOT verified.
- **partial**: current code has relevant capability, but full native key flow, output, or edge behavior is incomplete or unverified.
- **missing**: no corresponding source-level user feature was identified.
- **discrepancy**: current source contradicts specific original manual evidence.
- **unverified**: no sufficient real-hardware reference/capture. 
- **C-only source / model gate needed**: not part of original hardware feature requirements.
- **not simulatable**: non-software physical artifact, such as solar cell or case; not a missing software feature.

The original manual explicitly documents 40 constants based on ISO 1992 and CODATA 1998 (E-64); the current code uses a 2002 surrogate for original fx-991ES, hence REA-094. The original STAT menu documents P/Q/R and normalized variate t (E-48–49), hence REA-084. These are confirmed feature discrepancies. The original calculator's six ordinary variables A/B/C/D/X/Y are distinguished from the PLUS-family's broader register map; original-model gating is covered in REA-069.

### Summary

- **178 feature-level entries** (including model-specific and physical/non-simulatable entries).
- **36 open development tasks** REA-069 to REA-104; each task specifies acceptance conditions and manual/reference evidence. REA-084 is the coordinating STAT Distr task; REA-101–104 split the four genuinely missing functions into individual issues.
- Source implementation does **not** prove matching CASIO results, timing or LCD pixels.
- Further physical-device tests may reveal additional gaps; those should receive new issue numbers after REA-100.

## Full feature inventory

| Category | Model feature / subfeature | Current status | Issue |
|---|---|---|---|
| Hardware | Original fx-991ES 8-mode selection | source | [REA-071](https://github.com/philiparad/philiparad.github.io/issues/21) |
| Hardware | PLUS 2nd edition 8-mode selection | source | [REA-071](https://github.com/philiparad/philiparad.github.io/issues/21) |
| Hardware | PLUS C 11-mode selection | source | [REA-098](https://github.com/philiparad/philiparad.github.io/issues/52) |
| Hardware | Original model-specific case/printed legends | partial | [REA-070](https://github.com/philiparad/philiparad.github.io/issues/20) |
| Hardware | PLUS case/legends | partial | [REA-070](https://github.com/philiparad/philiparad.github.io/issues/20) |
| Hardware | PLUS C case/legends | partial | [REA-070](https://github.com/philiparad/philiparad.github.io/issues/20) |
| Hardware | Exactly 50 clickable keys | source | [REA-081](https://github.com/philiparad/philiparad.github.io/issues/31) |
| Hardware | Two-way solar/battery physical power | not simulatable | — |
| Hardware | Automatic power-off simulation | source | [REA-096](https://github.com/philiparad/philiparad.github.io/issues/50) |
| Hardware | ON/OFF key behavior | partial | [REA-096](https://github.com/philiparad/philiparad.github.io/issues/50) |
| Hardware | Low battery physical telemetry | not simulatable | — |
| Hardware | Slide-on protective cover | not simulatable | — |
| Hardware | 31×96 dot-matrix LCD logical size | source | [REA-072](https://github.com/philiparad/philiparad.github.io/issues/22) |
| Hardware | LCD actual pixels/glyphs/geometry | unverified | [REA-072](https://github.com/philiparad/philiparad.github.io/issues/22) |
| Hardware | SHIFT/ALPHA/STO/RCL display annunciators | partial | [REA-072](https://github.com/philiparad/philiparad.github.io/issues/22) |
| Hardware | Scroll and page indicators | partial | [REA-072](https://github.com/philiparad/philiparad.github.io/issues/22) |
| Hardware | Result and expression horizontal/vertical viewport | partial | [REA-072](https://github.com/philiparad/philiparad.github.io/issues/22) |
| Hardware | Contrast settings | partial | [REA-072](https://github.com/philiparad/philiparad.github.io/issues/22) |
| Keys and editing | Primary digit and arithmetic keys | source | [REA-081](https://github.com/philiparad/philiparad.github.io/issues/31) |
| Keys and editing | SHIFT secondary function keys | partial | [REA-081](https://github.com/philiparad/philiparad.github.io/issues/31) |
| Keys and editing | ALPHA symbols and registers | partial | [REA-081](https://github.com/philiparad/philiparad.github.io/issues/31) |
| Keys and editing | Original key-to-function label map | partial | [REA-070](https://github.com/philiparad/philiparad.github.io/issues/20) |
| Keys and editing | Insert/overwrite editing mode | source | [REA-073](https://github.com/philiparad/philiparad.github.io/issues/23) |
| Keys and editing | Delete/backspace and cancel | source | [REA-073](https://github.com/philiparad/philiparad.github.io/issues/23) |
| Keys and editing | REPLAY directional caret navigation | partial | [REA-096](https://github.com/philiparad/philiparad.github.io/issues/50) |
| Keys and editing | Natural fraction stacked entry | partial | [REA-073](https://github.com/philiparad/philiparad.github.io/issues/23) |
| Keys and editing | Improper/mixed fraction entry | partial | [REA-073](https://github.com/philiparad/philiparad.github.io/issues/23) |
| Keys and editing | Nested square/cube/nth-root entry | partial | [REA-073](https://github.com/philiparad/philiparad.github.io/issues/23) |
| Keys and editing | Power/exponent math templates | partial | [REA-073](https://github.com/philiparad/philiparad.github.io/issues/23) |
| Keys and editing | Integral/differential/summation templates | partial | [REA-080](https://github.com/philiparad/philiparad.github.io/issues/30) |
| Keys and editing | Subexpression selection and cursor transitions | partial | [REA-073](https://github.com/philiparad/philiparad.github.io/issues/23) |
| Keys and editing | Math input vs linear input | partial | [REA-073](https://github.com/philiparad/philiparad.github.io/issues/23) |
| Keys and editing | Implicit multiplication entry rules | partial | [REA-097](https://github.com/philiparad/philiparad.github.io/issues/51) |
| Keys and editing | Parenthesis auto-closing and nested limits | partial | [REA-097](https://github.com/philiparad/philiparad.github.io/issues/51) |
| Setup and display | SETUP MathIO | source | [REA-071](https://github.com/philiparad/philiparad.github.io/issues/21) |
| Setup and display | SETUP LineIO | source | [REA-071](https://github.com/philiparad/philiparad.github.io/issues/21) |
| Setup and display | Angle DEG/RAD/GRAD | source | [REA-082](https://github.com/philiparad/philiparad.github.io/issues/32) |
| Setup and display | Fix0–9 display precision | partial | [REA-075](https://github.com/philiparad/philiparad.github.io/issues/25) |
| Setup and display | Sci1–10 significant digits | partial | [REA-075](https://github.com/philiparad/philiparad.github.io/issues/25) |
| Setup and display | Norm1/Norm2 format | partial | [REA-075](https://github.com/philiparad/philiparad.github.io/issues/25) |
| Setup and display | Decimal dot/comma output | source | [REA-071](https://github.com/philiparad/philiparad.github.io/issues/21) |
| Setup and display | Improper/mixed global fraction preference | partial | [REA-076](https://github.com/philiparad/philiparad.github.io/issues/26) |
| Setup and display | Complex a+bi/r∠θ format preference | partial | [REA-089](https://github.com/philiparad/philiparad.github.io/issues/43) |
| Setup and display | STAT frequency ON/OFF | source | [REA-085](https://github.com/philiparad/philiparad.github.io/issues/35) |
| Setup and display | Initialize Setup / Memory / All | partial | [REA-096](https://github.com/philiparad/philiparad.github.io/issues/50) |
| Setup and display | S⇔D numeric toggling | partial | [REA-076](https://github.com/philiparad/philiparad.github.io/issues/26) |
| Setup and display | Exact symbolic radical results | partial | [REA-074](https://github.com/philiparad/philiparad.github.io/issues/24) |
| Setup and display | Exact symbolic pi/radian results | partial | [REA-074](https://github.com/philiparad/philiparad.github.io/issues/24) |
| Setup and display | Engineering notation forward/reverse | source | [REA-075](https://github.com/philiparad/philiparad.github.io/issues/25) |
| Basic COMP | Four operations and precedence | source | [REA-097](https://github.com/philiparad/philiparad.github.io/issues/51) |
| Basic COMP | Unary minus vs subtraction | source | [REA-097](https://github.com/philiparad/philiparad.github.io/issues/51) |
| Basic COMP | Parenthesized calculation | source | [REA-097](https://github.com/philiparad/philiparad.github.io/issues/51) |
| Basic COMP | Percent calculation | source | [REA-097](https://github.com/philiparad/philiparad.github.io/issues/51) |
| Basic COMP | Positive/negative integer fractions | source | [REA-076](https://github.com/philiparad/philiparad.github.io/issues/26) |
| Basic COMP | Rational arithmetic exact intermediates | partial | [REA-074](https://github.com/philiparad/philiparad.github.io/issues/24) |
| Basic COMP | Decimal arithmetic precision/rounding | partial | [REA-075](https://github.com/philiparad/philiparad.github.io/issues/25) |
| Basic COMP | Integer exponents and powers | source | [REA-097](https://github.com/philiparad/philiparad.github.io/issues/51) |
| Basic COMP | Reciprocal x^-1 | source | [REA-081](https://github.com/philiparad/philiparad.github.io/issues/31) |
| Basic COMP | Square and cube | source | [REA-081](https://github.com/philiparad/philiparad.github.io/issues/31) |
| Basic COMP | Square root and cube root | source | [REA-073](https://github.com/philiparad/philiparad.github.io/issues/23) |
| Basic COMP | General nth root | source | [REA-073](https://github.com/philiparad/philiparad.github.io/issues/23) |
| Basic COMP | Factorial | source | [REA-081](https://github.com/philiparad/philiparad.github.io/issues/31) |
| Basic COMP | Permutations nPr | source | [REA-097](https://github.com/philiparad/philiparad.github.io/issues/51) |
| Basic COMP | Combinations nCr | source | [REA-097](https://github.com/philiparad/philiparad.github.io/issues/51) |
| Basic COMP | Absolute value | source | [REA-081](https://github.com/philiparad/philiparad.github.io/issues/31) |
| Basic COMP | Rounding function Rnd | source | [REA-075](https://github.com/philiparad/philiparad.github.io/issues/25) |
| Basic COMP | Random number Ran# | source | [REA-098](https://github.com/philiparad/philiparad.github.io/issues/52) |
| Basic COMP | pi and e constants | source | [REA-074](https://github.com/philiparad/philiparad.github.io/issues/24) |
| Basic COMP | DMS input/editing | partial | [REA-083](https://github.com/philiparad/philiparad.github.io/issues/33) |
| Basic COMP | DMS to decimal and back | partial | [REA-083](https://github.com/philiparad/philiparad.github.io/issues/33) |
| Basic COMP | Multi-statement colon expression | source | [REA-077](https://github.com/philiparad/philiparad.github.io/issues/27) |
| Basic COMP | CALC variable substitution | partial | [REA-077](https://github.com/philiparad/philiparad.github.io/issues/27) |
| Basic COMP | CALC equation and complex substitutions | partial | [REA-078](https://github.com/philiparad/philiparad.github.io/issues/28) |
| Basic COMP | SOLVE numerical equation solving | partial | [REA-079](https://github.com/philiparad/philiparad.github.io/issues/29) |
| Basic COMP | Derivative d/dx | partial | [REA-080](https://github.com/philiparad/philiparad.github.io/issues/30) |
| Basic COMP | Definite integral | partial | [REA-080](https://github.com/philiparad/philiparad.github.io/issues/30) |
| Basic COMP | Summation Σ | partial | [REA-080](https://github.com/philiparad/philiparad.github.io/issues/30) |
| Basic COMP | Pol rectangular→polar conversion | source | [REA-081](https://github.com/philiparad/philiparad.github.io/issues/31) |
| Basic COMP | Rec polar→rectangular conversion | source | [REA-081](https://github.com/philiparad/philiparad.github.io/issues/31) |
| Basic COMP | Error categories / editor recovery | partial | [REA-097](https://github.com/philiparad/philiparad.github.io/issues/51) |
| Scientific | sin/cos/tan | source | [REA-082](https://github.com/philiparad/philiparad.github.io/issues/32) |
| Scientific | Inverse sin/cos/tan | source | [REA-082](https://github.com/philiparad/philiparad.github.io/issues/32) |
| Scientific | Hyperbolic sinh/cosh/tanh | source | [REA-081](https://github.com/philiparad/philiparad.github.io/issues/31) |
| Scientific | Inverse hyperbolic functions | source | [REA-081](https://github.com/philiparad/philiparad.github.io/issues/31) |
| Scientific | Natural logarithm ln | source | [REA-075](https://github.com/philiparad/philiparad.github.io/issues/25) |
| Scientific | Common logarithm log10 | source | [REA-075](https://github.com/philiparad/philiparad.github.io/issues/25) |
| Scientific | Arbitrary base logarithm | source | [REA-081](https://github.com/philiparad/philiparad.github.io/issues/31) |
| Scientific | Exponential e^x | source | [REA-081](https://github.com/philiparad/philiparad.github.io/issues/31) |
| Scientific | Exponential 10^x | source | [REA-081](https://github.com/philiparad/philiparad.github.io/issues/31) |
| Scientific | Angle suffixes degrees/radians/grads | partial | [REA-082](https://github.com/philiparad/philiparad.github.io/issues/32) |
| Scientific | Natural math radical/π trig results | partial | [REA-074](https://github.com/philiparad/philiparad.github.io/issues/24) |
| Scientific | Original 40 scientific constant codes | partial | [REA-094](https://github.com/philiparad/philiparad.github.io/issues/48) |
| Scientific | Original ISO 1992/CODATA 1998 values | discrepancy | [REA-094](https://github.com/philiparad/philiparad.github.io/issues/48) |
| Scientific | 40 metric conversion commands | partial | [REA-095](https://github.com/philiparad/philiparad.github.io/issues/49) |
| Scientific | Conversions prohibited in BASE-N and TABLE | source | [REA-095](https://github.com/philiparad/philiparad.github.io/issues/49) |
| Memory/history | Answer memory Ans | source | [REA-096](https://github.com/philiparad/philiparad.github.io/issues/50) |
| Memory/history | Independent memory M | source | [REA-096](https://github.com/philiparad/philiparad.github.io/issues/50) |
| Memory/history | M+ and M− | source | [REA-096](https://github.com/philiparad/philiparad.github.io/issues/50) |
| Memory/history | STO/RCL register operations | partial | [REA-069](https://github.com/philiparad/philiparad.github.io/issues/19) |
| Memory/history | Original six ordinary variables A/B/C/D/X/Y | discrepancy | [REA-069](https://github.com/philiparad/philiparad.github.io/issues/19) |
| Memory/history | Recall and store by ALPHA key | partial | [REA-069](https://github.com/philiparad/philiparad.github.io/issues/19) |
| Memory/history | Ans preservation after errors | partial | [REA-096](https://github.com/philiparad/philiparad.github.io/issues/50) |
| Memory/history | Result-to-following-expression chaining | partial | [REA-096](https://github.com/philiparad/philiparad.github.io/issues/50) |
| Memory/history | Calculation history up/down | source | [REA-096](https://github.com/philiparad/philiparad.github.io/issues/50) |
| Memory/history | History editable replay | partial | [REA-096](https://github.com/philiparad/philiparad.github.io/issues/50) |
| CMPLX | Rectangular a+bi arithmetic | source | [REA-089](https://github.com/philiparad/philiparad.github.io/issues/43) |
| CMPLX | Polar r∠θ entry and output | source | [REA-089](https://github.com/philiparad/philiparad.github.io/issues/43) |
| CMPLX | Conjugate/argument/magnitude | source | [REA-089](https://github.com/philiparad/philiparad.github.io/issues/43) |
| CMPLX | Complex reciprocal / powers | source | [REA-089](https://github.com/philiparad/philiparad.github.io/issues/43) |
| CMPLX | CMPLX menus and output command | partial | [REA-089](https://github.com/philiparad/philiparad.github.io/issues/43) |
| CMPLX | Complex Ans/variable persistence | partial | [REA-089](https://github.com/philiparad/philiparad.github.io/issues/43) |
| CMPLX | CALC complex substitutions | partial | [REA-078](https://github.com/philiparad/philiparad.github.io/issues/28) |
| STAT | List-based one-variable X editor | source | [REA-085](https://github.com/philiparad/philiparad.github.io/issues/35) |
| STAT | Paired X/Y regression editor | source | [REA-086](https://github.com/philiparad/philiparad.github.io/issues/36) |
| STAT | Frequency column editing | source | [REA-085](https://github.com/philiparad/philiparad.github.io/issues/35) |
| STAT | One-variable sum/mean/population/sample SD | source | [REA-086](https://github.com/philiparad/philiparad.github.io/issues/36) |
| STAT | Min/max and square sums | source | [REA-086](https://github.com/philiparad/philiparad.github.io/issues/36) |
| STAT | Two-variable sums and correlation | source | [REA-086](https://github.com/philiparad/philiparad.github.io/issues/36) |
| STAT | Linear A+BX regression | source | [REA-086](https://github.com/philiparad/philiparad.github.io/issues/36) |
| STAT | Quadratic regression | source | [REA-086](https://github.com/philiparad/philiparad.github.io/issues/36) |
| STAT | Logarithmic regression | source | [REA-086](https://github.com/philiparad/philiparad.github.io/issues/36) |
| STAT | Exponential e^X regression | source | [REA-086](https://github.com/philiparad/philiparad.github.io/issues/36) |
| STAT | Exponential A·B^X regression | source | [REA-086](https://github.com/philiparad/philiparad.github.io/issues/36) |
| STAT | Power regression | source | [REA-086](https://github.com/philiparad/philiparad.github.io/issues/36) |
| STAT | Inverse regression | source | [REA-086](https://github.com/philiparad/philiparad.github.io/issues/36) |
| STAT | Estimated xHat/yHat values | partial | [REA-086](https://github.com/philiparad/philiparad.github.io/issues/36) |
| STAT | Original STAT P(t) probability | missing | [REA-101](https://github.com/philiparad/philiparad.github.io/issues/55) |
| STAT | Original STAT Q(t) probability | missing | [REA-102](https://github.com/philiparad/philiparad.github.io/issues/56) |
| STAT | Original STAT R(t) probability | missing | [REA-103](https://github.com/philiparad/philiparad.github.io/issues/57) |
| STAT | Original normalized variate t | missing | [REA-104](https://github.com/philiparad/philiparad.github.io/issues/58) |
| STAT | Original STAT multi-page menu | partial | [REA-085](https://github.com/philiparad/philiparad.github.io/issues/35) |
| BASE-N | Binary input and display | source | [REA-088](https://github.com/philiparad/philiparad.github.io/issues/42) |
| BASE-N | Octal input and display | source | [REA-088](https://github.com/philiparad/philiparad.github.io/issues/42) |
| BASE-N | Decimal integer input | source | [REA-088](https://github.com/philiparad/philiparad.github.io/issues/42) |
| BASE-N | Hexadecimal input | source | [REA-088](https://github.com/philiparad/philiparad.github.io/issues/42) |
| BASE-N | Bitwise AND OR XOR XNOR | source | [REA-088](https://github.com/philiparad/philiparad.github.io/issues/42) |
| BASE-N | Bitwise NOT and two's complement NEG | source | [REA-088](https://github.com/philiparad/philiparad.github.io/issues/42) |
| BASE-N | Model-specific signed bit ranges | partial | [REA-088](https://github.com/philiparad/philiparad.github.io/issues/42) |
| BASE-N | Mixed-base d/h/b/o literals within expressions | partial | [REA-087](https://github.com/philiparad/philiparad.github.io/issues/37) |
| BASE-N | BASE-N page-one/page-two menus | partial | [REA-087](https://github.com/philiparad/philiparad.github.io/issues/37) |
| EQN | Simultaneous linear two-variable system | source | [REA-092](https://github.com/philiparad/philiparad.github.io/issues/46) |
| EQN | Simultaneous linear three-variable system | source | [REA-092](https://github.com/philiparad/philiparad.github.io/issues/46) |
| EQN | Quadratic equation solving | source | [REA-092](https://github.com/philiparad/philiparad.github.io/issues/46) |
| EQN | Cubic equation solving | source | [REA-092](https://github.com/philiparad/philiparad.github.io/issues/46) |
| EQN | Coefficient editor and navigation | partial | [REA-092](https://github.com/philiparad/philiparad.github.io/issues/46) |
| EQN | Root result paging and complex/irrational form | partial | [REA-092](https://github.com/philiparad/philiparad.github.io/issues/46) |
| MATRIX | MatA/MatB/MatC storage | source | [REA-090](https://github.com/philiparad/philiparad.github.io/issues/44) |
| MATRIX | MatAns result memory | source | [REA-090](https://github.com/philiparad/philiparad.github.io/issues/44) |
| MATRIX | Matrix add/subtract/multiply | source | [REA-090](https://github.com/philiparad/philiparad.github.io/issues/44) |
| MATRIX | Matrix transpose and determinant | source | [REA-090](https://github.com/philiparad/philiparad.github.io/issues/44) |
| MATRIX | Matrix inverse and integer power | source | [REA-090](https://github.com/philiparad/philiparad.github.io/issues/44) |
| MATRIX | Matrix scalar multiplication | source | [REA-090](https://github.com/philiparad/philiparad.github.io/issues/44) |
| MATRIX | Direct expression parsing with MatAns | partial | [REA-090](https://github.com/philiparad/philiparad.github.io/issues/44) |
| TABLE | Single f(X) numeric table | source | [REA-093](https://github.com/philiparad/philiparad.github.io/issues/47) |
| TABLE | Original maximum 30 x-values | source | [REA-093](https://github.com/philiparad/philiparad.github.io/issues/47) |
| TABLE | Range step and scrolling | source | [REA-093](https://github.com/philiparad/philiparad.github.io/issues/47) |
| TABLE | Unsupported operation restrictions and X side effects | partial | [REA-093](https://github.com/philiparad/philiparad.github.io/issues/47) |
| TABLE | C model dual f(X)/g(X) mode | C-only source | [REA-098](https://github.com/philiparad/philiparad.github.io/issues/52) |
| VECTOR | VctA/VctB/VctC storage | source | [REA-091](https://github.com/philiparad/philiparad.github.io/issues/45) |
| VECTOR | VctAns result memory | source | [REA-091](https://github.com/philiparad/philiparad.github.io/issues/45) |
| VECTOR | 2D/3D vector edit and navigation | source | [REA-091](https://github.com/philiparad/philiparad.github.io/issues/45) |
| VECTOR | Dot product | source | [REA-091](https://github.com/philiparad/philiparad.github.io/issues/45) |
| VECTOR | 3D cross product | source | [REA-091](https://github.com/philiparad/philiparad.github.io/issues/45) |
| VECTOR | Vector norm, addition, subtraction, scalar | source | [REA-091](https://github.com/philiparad/philiparad.github.io/issues/45) |
| VECTOR | Angle between vectors | source | [REA-091](https://github.com/philiparad/philiparad.github.io/issues/45) |
| VECTOR | Native vector expression chaining | partial | [REA-091](https://github.com/philiparad/philiparad.github.io/issues/45) |
| PLUS-only additions | Random integer RanInt (PLUS family) | model gate needed | [REA-098](https://github.com/philiparad/philiparad.github.io/issues/52) |
| PLUS C additions | INEQ quadratic/cubic inequalities (C only) | C-only source | [REA-098](https://github.com/philiparad/philiparad.github.io/issues/52) |
| PLUS C additions | VERIF relations and chains (C only) | C-only source | [REA-098](https://github.com/philiparad/philiparad.github.io/issues/52) |
| PLUS C additions | DIST seven families (C only) | C-only source | [REA-098](https://github.com/philiparad/philiparad.github.io/issues/52) |
| PLUS C additions | List-based DIST editing (C only) | C-only source | [REA-098](https://github.com/philiparad/philiparad.github.io/issues/52) |
| PLUS C additions | Recurring decimal notation and some extra operations | model gate needed | [REA-098](https://github.com/philiparad/philiparad.github.io/issues/52) |
| Quality | Manufacturer keys/screens validated with real device | unverified | [REA-099](https://github.com/philiparad/philiparad.github.io/issues/53) |
| Quality | Original model reference corpus | unverified | [REA-099](https://github.com/philiparad/philiparad.github.io/issues/53) |
| Quality | Source-only functional regression tests | source | [REA-099](https://github.com/philiparad/philiparad.github.io/issues/53) |
| Quality | Accessibility keyboard and touch | source | [REA-099](https://github.com/philiparad/philiparad.github.io/issues/53) |
| Quality | Cancellable worker scientific workflows | source | [REA-099](https://github.com/philiparad/philiparad.github.io/issues/53) |
| Quality | Standalone vs modular release equivalence | unverified | [REA-100](https://github.com/philiparad/philiparad.github.io/issues/54) |

## Development task queue

| Task | Work item | Status |
|---|---|---|
| [REA-069](https://github.com/philiparad/philiparad.github.io/issues/19) | Correct original fx-991ES variable/register availability | Open |
| [REA-070](https://github.com/philiparad/philiparad.github.io/issues/20) | Render model-specific original fx-991ES casing and key legends | Open |
| [REA-071](https://github.com/philiparad/philiparad.github.io/issues/21) | Correct model-specific MODE, SETUP and command menu sequences | Open |
| [REA-072](https://github.com/philiparad/philiparad.github.io/issues/22) | Validate LCD glyphs, annunciators, pagination and 31×96 behavior | Open |
| [REA-073](https://github.com/philiparad/philiparad.github.io/issues/23) | Complete native two-dimensional textbook input templates | Open |
| [REA-074](https://github.com/philiparad/philiparad.github.io/issues/24) | Implement exact radical and pi-form calculation results | Open |
| [REA-075](https://github.com/philiparad/philiparad.github.io/issues/25) | Reconcile numerical precision and Fix/Sci/Norm rounding with original manual | Open |
| [REA-076](https://github.com/philiparad/philiparad.github.io/issues/26) | Match S⇔D, improper/mixed fractions, irrational conversion restrictions | Open |
| [REA-077](https://github.com/philiparad/philiparad.github.io/issues/27) | Implement native CALC substitution of all referenced variables | Open |
| [REA-078](https://github.com/philiparad/philiparad.github.io/issues/28) | Support CALC in CMPLX and equation-style expressions | Open |
| [REA-079](https://github.com/philiparad/philiparad.github.io/issues/29) | Reproduce SOLVE iteration UI, L−R and initial-guess interaction | Open |
| [REA-080](https://github.com/philiparad/philiparad.github.io/issues/30) | Use native inline ∫, d/dx and Σ templates rather than generic prompts | Open |
| [REA-081](https://github.com/philiparad/philiparad.github.io/issues/31) | Audit every SHIFT/ALPHA legend against mode and screen context | Open |
| [REA-082](https://github.com/philiparad/philiparad.github.io/issues/32) | Match native per-operand angle notation and DRG▶ conversions | Open |
| [REA-083](https://github.com/philiparad/philiparad.github.io/issues/33) | Complete sexagesimal editing, conversion and arithmetic | Open |
| [REA-084](https://github.com/philiparad/philiparad.github.io/issues/34) | Add STAT P(, Q(, R( and normalized variate t functions | Open |
| [REA-085](https://github.com/philiparad/philiparad.github.io/issues/35) | Finish original STAT menu order, raw parameter insertion and storage | Open |
| [REA-086](https://github.com/philiparad/philiparad.github.io/issues/36) | Validate all STAT regression variants, coefficients and estimates | Open |
| [REA-087](https://github.com/philiparad/philiparad.github.io/issues/37) | Complete BASE-N mixed-radix literals inside expressions | Open |
| [REA-088](https://github.com/philiparad/philiparad.github.io/issues/42) | Verify BASE-N sign, XNOR, NOT, NEG and 16/32-bit edge cases | Open |
| [REA-089](https://github.com/philiparad/philiparad.github.io/issues/43) | Complete CMPLX result commands, memory and natural display parity | Open |
| [REA-090](https://github.com/philiparad/philiparad.github.io/issues/44) | Complete native MATRIX expression chaining and MatAns workflows | Open |
| [REA-091](https://github.com/philiparad/philiparad.github.io/issues/45) | Complete native VECTOR expression chaining and VctAns workflows | Open |
| [REA-092](https://github.com/philiparad/philiparad.github.io/issues/46) | Match EQN coefficient editor, root ordering and complex/irrational results | Open |
| [REA-093](https://github.com/philiparad/philiparad.github.io/issues/47) | Check TABLE original-model restrictions, errors and X side effects | Open |
| [REA-094](https://github.com/philiparad/philiparad.github.io/issues/48) | Replace guessed original scientific constants with manual-era values | Open |
| [REA-095](https://github.com/philiparad/philiparad.github.io/issues/49) | Verify all 40 metric conversion codes and original factors | Open |
| [REA-096](https://github.com/philiparad/philiparad.github.io/issues/50) | Correct original fx-991ES memory, reset and replay persistence | Open |
| [REA-097](https://github.com/philiparad/philiparad.github.io/issues/51) | Complete expression precedence and hardware stack-error compatibility | Open |
| [REA-098](https://github.com/philiparad/philiparad.github.io/issues/52) | Isolate edition-only features and model-specific random commands | Open |
| [REA-099](https://github.com/philiparad/philiparad.github.io/issues/53) | Require model-specific physical/reference evidence before parity claims | Open |
| [REA-100](https://github.com/philiparad/philiparad.github.io/issues/54) | Keep standalone calculator publication synchronized with modular source | Open |

| [REA-101](https://github.com/philiparad/philiparad.github.io/issues/55) | Implement original STAT P(t): standard normal lower-tail probability | Open |
| [REA-102](https://github.com/philiparad/philiparad.github.io/issues/56) | Implement original STAT Q(t): standard normal probability from 0 to t | Open |
| [REA-103](https://github.com/philiparad/philiparad.github.io/issues/57) | Implement original STAT R(t): standard normal upper-tail probability | Open |
| [REA-104](https://github.com/philiparad/philiparad.github.io/issues/58) | Implement original STAT normalized variate t from sample data | Open |

## Recommended execution order

1. **Manual contradictions and genuinely missing features:** REA-069 (original registers), REA-084 and REA-101–104 (original STAT P/Q/R and normalized t), REA-094 (1998 constants), REA-098 (edition gates).
2. **Core native workflows:** REA-073, REA-074, REA-075, REA-077, REA-078, REA-080.
3. **Model and controls parity:** REA-070, REA-071, REA-072, REA-081, REA-082, REA-083.
4. **Mode-specific behavior:** REA-085 through REA-093, REA-095 through REA-097.
5. **Release confidence:** REA-099 reference device differential checks and REA-100 consistent publication. Do not declare hardware compatibility until evidenced.

## Definition of done for each issue

1. State model/edition and cite the corresponding official manual section or measured physical device evidence.
2. Specify mode, setup, memory state, normal/SHIFT/ALPHA keys and intermediate LCD states.
3. Implement the function, including editor and result behavior, not just a mode button.
4. Test normal, boundary, invalid input/error, cancellation/back-navigation and interactions.
5. Add a runnable unit test **and** browser DOM/key trace where applicable.
6. Compare against real-device/official emulator captures only when genuinely available. Clearly distinguish expected/manual from observed/device.
7. Commit to GitHub and stop before the next REA task.
