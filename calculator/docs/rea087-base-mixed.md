# REA-087 — BASE-N mixed-radix expressions

## Status
Source implementation and automated source-level regression suite committed.
**Not yet confirmed against physical CASIO hardware or a real browser DOM/key trace.**

## Key flow
1. Select **BASE-N** mode and choose a display radix (DEC/HEX/BIN/OCT).
2. Press **SHIFT → 3** to open BASE operations.
3. Page one contains logical functions (and/or/xor/xnor/Not/Neg).
4. Press **DOWN** to show page two, then select **1 d:**, **2 h:**, **3 b:** or **4 o:**.
5. Enter digits for that literal. Repeat after an arithmetic operator. The selected result radix remains unchanged.
6. Press **=** to evaluate; **AC** in the menu cancels without changing the current expression.

Examples in selected DEC:
- `d:10+h:FF+b:101+o:7` = `277`
- `h:FFFFFFFF+d:2` = `1` (32-bit signed HEX -1 + 2)
- `b:1010 xor h:0C` = `6`
- `-h:1+d:2` = `1`

The textual engine also accepts compact lowercase prefix aliases such as `d10+hFF+b101+o7`. The colon form is preferred for manual/keypad entry because it is unambiguous. Uppercase letters A–F retain their meaning as bare hexadecimal digits, e.g. `D10+F` in HEX mode.

A literal is parsed in its own radix, including signed two's-complement BIN/OCT/HEX conversion, but the **final arithmetic result is range-checked and displayed in the selected radix**. Invalid digits yield `Syntax ERROR`; signed-range overflow and divide-by-zero yield `Math ERROR`.

## Test coverage
Run `node calculator/tests/rea087-base-mixed.cjs` from the repository root.
The test suite contains **123 checks** across original fx-991ES, fx-991ES PLUS and fx-991ES PLUS C source profiles:
- Mixed arithmetic, parentheses, logical operations, negative operands, numeric boundary cases
- Two's-complement interpretation, results in BIN/DEC/HEX, active-radix range checks
- Invalid digits, missing values, division by zero, arithmetic overflow
- Page-two menu labeling, page navigation and AC source wiring
- Display radix preservation and SHIFT/ALPHA modifier guards

The suite was executed successfully in an **isolated JavaScript harness** that supplied the repository code and assertion dependencies. The actual Node.js command and browser UI suite have **not** been run in this session because this execution environment cannot fetch the repository into the local runtime.

## Verification pending
- Real browser key/DOM trace for SHIFT → 3 → DOWN → digit → entry → = and for AC cancel
- Physical hardware comparisons, including model-specific BASE menu order and result/error display
- Adjacent SHIFT/ALPHA manual comparison and result conversion route on actual devices

Issue: https://github.com/philiparad/philiparad.github.io/issues/37
