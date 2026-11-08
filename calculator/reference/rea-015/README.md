# REA-015 — Two-dimensional LCD scrolling and overflow

**Status:** Web viewport implementation and regression suite provided. **Pixel-accurate CASIO behavior remains unverified** pending the genuine emulator/device capture corpus required by REA-001 and native LCD measurement from REA-002.

## Implemented behavior

The calculator keeps independent display positions for four areas of the 96×31 **project-defined** LCD raster:

| Region | Stored state | Physical navigation |
|---|---|---|
| Editable linear expression | `viewport.inputX` | LEFT / RIGHT move the caret and automatically reveal it |
| Editable structured formula | `viewport.inputX`, `viewport.inputY` | LEFT / RIGHT / UP / DOWN move between fields and automatically pan both axes |
| Calculation result | `viewport.resultX` | LEFT / RIGHT pan lengthy result text without destroying the result or editing its expression |
| Multi-line TABLE/STAT/MATRIX etc output | `viewport.flowX`, `outputPage` | LEFT / RIGHT pan the current three lines horizontally; UP / DOWN change the visible page vertically |

**SHIFT + arrow key** manually pans an editable expression without moving its mathematical caret. It can reveal areas outside the current caret-centered view. With a result on screen, SHIFT + LEFT / RIGHT pans its numeric text.

Overflow arrows are drawn when more content exists beyond a side of the current view. Vertical formula cues are shown when content extends above or below the 2D viewport. Horizontal and vertical scroll positions are not conflated: returning to an output page preserves all original text, rather than truncating the data during rendering.

The tree-based `lcd-viewport.js` uses the current expression node dimensions, exponent heights, nested fraction baselines and root indices to locate the exact *web-rendered* caret and follow it through large expressions. It never truncates the stored expression.

### Compatibility and accessibility

- Short equations and ordinary results stay at their established positions.
- Long results retain full calculation strings and support repeated LEFT / RIGHT panning.
- Multi-line function results retain full unwrapped lines in memory; only their **visible window** is clipped.
- The same behavior is embedded into `fx991_fresh_standalone.html`, without React or Node.js.
- The 96×31 grid is an independent design choice, **not** a verified CASIO matrix.

## Source and tests

- `calculator/js/lcd-viewport.js` — geometric layout and viewport calculations.
- `calculator/js/app.js` — separate scroll states and physical navigation.
- `calculator/js/display.js` — clipped raster rendering and overflow cues.
- `calculator/reference/rea-015/test_viewport_browser.py` — real DOM keypad test in modular and standalone builds.
- `.github/workflows/rea015-viewport.yml` — automated browser coverage and optional machine-readable trace artifact.

To run:

```sh
python -m pip install playwright==1.56.0
python -m playwright install chromium
python calculator/reference/rea-015/test_viewport_browser.py
```

The test covers 36-digit horizontal scrolling, caret movement without data loss, nested fractions exceeding the vertical viewport, manual panning, a long DMS result, long TABLE rows and independent horizontal/vertical flow navigation.

## Remaining native acceptance criteria

The full backlog definition requires that long equations, matrices and results have independent overflow behavior **matching original CASIO hardware**. That last step is still blocked until authenticated native LCD frame-by-frame sequences are available. Other limits include native animation/blinking, physical display row geometry and mode-specific scroll cues. Web tests cannot serve as manufacturer reference evidence.

**REA-016 has not been started.**
