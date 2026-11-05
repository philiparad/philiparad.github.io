# Milestone 13 Compatibility Matrix

Independent implementation. These are implemented *subsets*, **not** verified parity with a CASIO device.

| Area | Local implementation | Missing device-level functionality |
|---|---|---|
| COMP | Fractions, radicals, π, powers, trig/log subset, factorial, Ans/memory, SOLVE/DIFF/INTEGRAL/SUM teaching controls | Full implicit multiplication, CALC keypad sequence, exact CASIO numeric/formatting behavior |
| CMPLX | Rectangular + − × ÷, magnitude, argument, conjugation, polar conversions | Full menu/polar output settings, physical key sequence, typed complex Ans fidelity |
| STAT | 1VAR and 7 regression fit types | STAT table editor, FREQ columns, variable/menu pathways, stable QR regression |
| BASE-N | 2/8/10/16, masking, bitwise, basic arithmetic | Exact signed input range and base-specific key workflow characterization |
| EQN | Linear systems 2/3 variables, quadratic incl. complex, cubic real roots | Full complex cubic roots, reference-specific root order, coefficient menus |
| MATRIX | Up to 3×3, + − × det trans inverse powers, norm | MatA/MatB/MatC/MatAns storage, complete mode menus |
| TABLE | One function, C two functions, 30/20 row caps | Actual TABLE wizard, setup prompts, formatting and memory exceptions |
| VECTOR | 2/3-component + − × scalar, dot/cross, norm, angle | Vct registers, angle-unit settings for angle result, variable menus |
| C extensions | INEQ quadratic/cubic inequality solution intervals, VERIF TRUE/FALSE with Ans=1/0, seven DIST operations plus list input (25 max), C dual-function TABLE | Casio coefficient/menu workflows, edge-case numerical fidelity, reference device traces |
| LCD | Independent 96×31 framebuffer | Structural math rasterization, model reference fidelity |
| Testing | 162/162 local JS regression tests | Hardware/emulator golden traces, browser E2E |

The roadmap details come from the uploaded Milestone 8 research report; no claim of Casio's undocumented internal algorithms is made.
