# REA-039 — STO/RCL, M+/M−, registers, Ans/PreAns

## Reference
[CASIO fx-115ES PLUS / fx-991ES PLUS C (2nd edition): Using Memory Functions](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/basic_calculations/memory_functions.html). Official examples: `3+5 STO A` → A=8; `RCL A` → 8; `10×5 M+` → M=50; `10+5 M−` → M=35; `RCL M` → 35. The nonzero M indicator must appear.

## Changes
- `js/app.js`: SHIFT+RCL is direct STO standby, and RCL is direct recall standby. The following physical key selects A–F, X, Y or M without a variable menu; cancellation via AC leaves memory unchanged. STO executes a pending expression (once) before storing its value. RCL displays the value and updates Ans.
- M+/M− evaluate the pending expression, then add/subtract its result to M, rather than using an unrelated older Ans. Overflow is rejected before memory mutation. Register M is the independent memory register (not a separate copy).
- AC and OFF/ON preserve registers and Ans/PreAns. Leaving COMP for another mode clears PreAns but retains Ans and variables.
- SHIFT+9 CLR menu now follows CASIO ordering (1 Setup, 2 Memory, 3 All), with `=` confirmation and AC cancellation. Confirmed memory clear resets A–F, X, Y, M, Ans and PreAns.
- `js/lcd-indicators.js` uses actual STO/RCL standby state for its LCD annunciator. Existing nonzero M indicator is maintained.
- Standalone HTML and modular scripts are identical for changed modules.

## Tests
```bash
node calculator/reference/rea-039/test_memory.js
python3 calculator/reference/rea-039/test_browser.py
```
The Node test exercises the complete standalone controller in a fake DOM and checks register assignment, recall, M+/M−, failure recovery, persistence across mode/power changes and CLR. Browser tests require Playwright+Chromium. Exact physical LCD design and undocumented CASIO firmware edge cases are not certified. REA-040 is excluded.
