# Milestone 13 — C-edition Extensions

This is an **independent educational** fx-991ES PLUS / fx-991ES PLUS C-inspired simulator, not an official or device-accurate emulator. HTML/CSS/vanilla JavaScript only; no React, Node runtime, external libraries, proprietary artwork, or firmware. Open `index.html` and select the **fx-991ES PLUS C** profile; open `tests/acceptance.html` for the regression suite.

## What changed from Milestone 12

Adds `src/c-edition.js` and connects three C-only mode engines to the **same** existing `FX991_MODES.calculate()`, key dispatch, typed Ans, history, 96×31 pixel framebuffer, and model-gating state. All 128 tests from the previous milestone are retained; 34 regression cases have been added.

### INEQ — inequalities

Enter `LT:a,b,c` for `aX²+bX+c < 0`, `LE` for `≤`, `GT` for `>`, and `GE` for `≥`. Cubics use four coefficients `a,b,c,d` for `aX³+bX²+cX+d`. Examples:

- `LT:1,2,-3` → `(-3, 1)`
- `LE:1,2,-3` → `[-3, 1]`
- `GT:1,-6,11,-6` → `(1, 2) ∪ (3, ∞)`
- `LE:1,0,0` → `{0}`

Uses root isolation over critical points, bisecting sign changes, and handling repeated/isolated roots for non-strict inequalities. Numeric root grouping is heuristic for nearly multiple roots; extreme coefficients require more verification.

### VERIF — relational verification

Expressions such as `4*sqrt(9)=12`, `1<2<3`, `1<=2<=3`, `2!=3`, and `3>=2>=1`. Evaluation uses the existing AST parser (never JavaScript `eval`). The result is `TRUE` (typed Ans=1) or `FALSE` (typed Ans=0). Mixed relational directions and malformed syntax are rejected. Approximate equality uses a specified tolerance (1e-10 relative/absolute), **not** yet reference-characterized Casio comparison semantics.

### DIST — seven distribution operations

| Command | Meaning | Example |
|---|---|---|
| `NPD:x,sigma,mu` | Normal density | `NPD:36,2,35` → 0.1760326634 (approximately) |
| `NCD:lower,upper,sigma,mu` | Normal cumulative interval | `NCD:0,1,1,0` |
| `INV:area,sigma,mu` | Inverse normal CDF | `INV:0.975,1,0` |
| `BPD:x,n,p` | Binomial probability mass | `BPD:2,4,0.5` → 0.375 |
| `BCD:x,n,p` | Binomial cumulative probability | `BCD:2,4,0.5` → 0.6875 |
| `PPD:x,lambda` | Poisson probability mass | `PPD:2,2` |
| `PCD:x,lambda` | Poisson cumulative probability | `PCD:2,2` |

For binomial/Poisson workflows, a semicolon-separated list of up to 25 x values is accepted: `BPD:0;1;2|2,0.5` or `PPD:0;1;2|2`. Normal CDF uses an independently implemented erf approximation (absolute error approximately 7.5e-8); inverse CDF uses Acklam rational approximations; discrete distributions use log-gamma probability masses and cumulative sums. Numerical tails and large parameters **require additional high-accuracy validation** before claiming calculator parity.

## Verification

The test corpus now contains **162 deterministic JavaScript tests: 162/162 passed** using a JavaScript VM with structured-clone support. This is an implementation regression suite, **not** external-device reference validation. The browser acceptance runner is `tests/acceptance.html`.

## Limitations

1. These C modes are educational text-command editors, not the physical Casio menu/coefficient/list-entry UX.
2. C edition mode paging, numeric output rendering, and error surfaces are not yet fully matched to the handheld.
3. The numeric algorithms use JavaScript binary64 for some operations; probability precision and large-parameter stability remain approximate.
4. There are no licensed hardware/emulator golden traces, no firmware/code reuse, and no compatibility certification.
5. Full production state-machine workflows, screen layout, background numerical cancellation and browser QA remain future stages.

The project retains Milestone 12 COMP/CMPLX/STAT/BASE-N/EQN/MATRIX/TABLE/VECTOR capabilities, exact rational arithmetic subset, numerical calculus, shared memory, history, and independent framebuffer. C TABLE dual-function support (up to 20 rows) is retained.

## Next roadmap item

Implement the **production state machine**: full mode-specific key resolution, menus, field-entry/replay, one-shot SHIFT/ALPHA, STO/RCL, error recovery, C-edition menu navigation, and deterministic reference traces. This is followed by complete LCD math layout and physical-device characterization.


## Milestone 15 — independent LCD layout engine

New `src/display.js` implements a logical 96×31 monochrome framebuffer, original compact bitmap glyph atlas, structured layout boxes for fractions/powers/roots/functions/groups, cursor anchors, and horizontal viewport scrolling. The editable document, layout tree, and framebuffer remain distinct artifacts. The LCD displays the structural expression in the 14-pixel input region, with a separate result line. Extreme nested structures may exceed the input region and are clipped; a later milestone must implement scale/vertical viewport policy and reference-device reconciliation. No Casio ROM/fonts were used.

The new `FX991_DISPLAY.composeScreen()` exposes `{pixels, overflow, scrollX, layout}`, enabling deterministic rendering tests and teacher screenshots.