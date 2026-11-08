# REA-013 — MODE / SETUP menu numbering and editable function prompts

**Status: WEB IMPLEMENTATION + REPEATABLE WEB TRANSITION TESTS; NATIVE CASIO FIDELITY PENDING.**

Backlog acceptance criterion: **compare the actual MODE, SETUP, function menus and form screens against the native CASIO emulator for key-by-key transitions and screen contents.** That final comparison is **blocked by REA-001**: no authenticated CASIO device or emulator screenshots have yet been captured. The tests below establish only independent web behavior, never native equivalence.

## Implemented improvements

1. Preserve model-specific 6-item MODE pages and 8-item SETUP pages with the actual local printed selection numbers, not a guessed global index. Submenu choices and page transitions remain available only through the calculator's physical keys.
2. Function-form input now maintains a **per-field caret position**. LEFT / RIGHT move the cursor in text fields, the keypad inserts at the caret, and DEL removes the character immediately before it. Choice fields continue to use LEFT / RIGHT to select options.
3. DOWN and EQUAL advance to the next function-form field, UP returns to the preceding field, and edited input persists across UP/DOWN transitions. AC exits the form.
4. Pre-populated examples are still explicitly **educational defaults**, not claimed CASIO-native prompt values. The first typed character replaces the default. This avoids entering computations based on an unwanted sample value.
5. The LCD renders the editing caret in prompt fields after editing begins, while leaving the initial sample display unchanged. Long values scroll to keep the active caret visible.
6. The public calculator state exposes only prompt metadata: field index, field ID/count, cursor offset, editing status, values and current text (not internal callbacks).
7. Modular and standalone HTML are synchronized.

## Reproducible web transition evidence

Run from repository root with Python Playwright / Chromium:

```sh
python -m pip install playwright==1.56.0
python -m playwright install chromium
python calculator/reference/rea-013/test_transitions_browser.py
```

This verifies all three supported profiles in both HTML builds: MODE page number labels, SETUP second-page labels, safe menu cancellation, prompt default replacement, caret insertion, in-place deletion, AC escape, FREQ form field advancement and back-navigation, TABLE submenu numbering, and SOLVE prompt entry.

The test exports `/tmp/rea013-transition-report.json` with the model, current screen, menu labels/page and safe prompt state for each checkpoint. CI publishes it as an artifact: `.github/workflows/rea013-transitions.yml`.

## Required hardware capture to finish the original task

- Use an authorized, version-identified **fx-991ES PLUS C 2nd edition** physical calculator or the genuine Windows reference emulator.
- Capture the initial LCD and **every intermediate LCD frame after each key** for MODE pages, every SETUP submenu, SOLVE, derivative/integral, matrix, table, statistics and distribution workflows.
- For each case record firmware/emulator identity, exact ordered key sequence, full screen images, active mode and error/result.
- Compare rendered LCD contents and key-by-key transitions using REA-004's differential runner; annotate mismatches as firmware-supported differences vs educational approximations.
- Only then consider marking the device fidelity aspect of REA-013 complete.

**Do not use synthetic web snapshots as CASIO device evidence.** REA-014 remains unstarted.
