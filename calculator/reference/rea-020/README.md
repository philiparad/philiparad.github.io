# REA-020 — LCD contrast and appearance

**Implementation:** Web LCD contrast rendering is implemented on `main`. **Native CASIO equivalence is unverified.** This task was partially addressed by REA-012 (SETUP contrast entry and state), but the raster renderer still used fixed RGB values.

## Changes

- `calculator/js/display.js`: contrast 0–9 modifies the ink color of every logical on-pixel. Paper color, active pixel positions, and mathematical calculations are unchanged.
- At level **5**, the original approved web-only golden-frame pixel palette remains identical: ink RGB `[29, 40, 34]` and paper RGB `[215, 230, 215]`.
- Levels below 5 lighten the pixel ink and levels above 5 darken it. Contrasts are clamped to 0–9. Changes are rendered immediately by the existing left/right-key contrast screen, without modifying values or the logical raster.
- `fx991_fresh_standalone.html` receives the same renderer.
- `test_contrast_browser.py` checks the exact default ink RGB, strict monotonic ink brightness, identical logical pixel arrays and lack of state mutation in both builds.

## Test

From repository root, with Python Playwright and Chromium installed:

```sh
python3 calculator/reference/rea-020/test_contrast_browser.py
```

The script has been committed but has **not** been executed in this chat environment. Existing REA-006 golden-frame web baselines should remain unchanged at the default level.

## Hardware evidence still required

Capture real device/emulator LCD appearance at multiple contrast levels with identical input, ambient/camera settings and cropping. Infer level-to-pixel luminance only from those reference images. The current RGB mapping is an **independent educational approximation**, not verified physical LCD transfer behavior.

Do not mark native-fidelity acceptance as complete until these comparisons pass.
