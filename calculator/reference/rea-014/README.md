# REA-014 — Structured LCD cursor, insert / overwrite and deletion

**Task:** Implement working LEFT/RIGHT/UP/DOWN, DEL, SHIFT+DEL and editing in mathematical templates and linear expressions.

**Status:** Independent web-editor behavior implemented; true native CASIO LCD cursor semantics remain unverified because REA-001 has no native reference frames.

## Implemented

- **LEFT / RIGHT**: navigate by character inside the current plain-text field. At a structured formula boundary, enter the adjoining child slot before proceeding into neighboring content. Leave the current template only after reaching its field boundary.
- **UP / DOWN**: jump between numerator/denominator, and nth-root index/radicand. Traverses from a nested field to its nearest vertically navigable ancestor, without erasing sibling content.
- **SHIFT + DEL**: switch between insert and overwrite mode using the real calculator keys. Insert splices new characters at the caret; overwrite replaces a plain character under the caret. Both modes work inside formula child fields and ordinary linear text.
- **Protected formula nodes**: overwrite never replaces a whole fraction, exponent, or root node with a plain character. Instead it inserts a new character before it, preserving all nested input.
- **DEL**: deletes the preceding plain character. When the preceding item is a structured formula, it moves into that formula rather than destroying its contents. An entirely empty formula can be removed. If FRAC captured an existing numerator and the new denominator is empty, DEL restores the original numerator nodes without loss.
- **Function prompts**: use the same insert/overwrite mode; SHIFT+DEL is evaluated before DEL, and the caret position is respected for editing an expression or parameter.
- **AC**: clears current input while leaving the active editing preference intact. A full reset restores insertion mode.

## Source files

- `calculator/js/structured-editor.js`: expression tree manipulation, navigation, deletion and safe overwrite.
- `calculator/js/app.js`: keyboard state routing and prompt editing.
- `calculator/fx991_fresh_standalone.html`: synchronized independent standalone application.
- `reference/rea-014/test_cursor_browser.py`: browser tests with actual DOM keypad actions.
- `.github/workflows/rea014-cursor.yml`: GitHub Actions acceptance suite.

## Browser tests

```sh
python3 -m pip install playwright==1.56.0
python3 -m playwright install chromium
python3 calculator/reference/rea-014/test_cursor_browser.py
```

The suite exercises character replacement, insertion, deletion, vertical template fields, exiting/re-entering structured nodes, cancellation of incomplete fractions, root-field overwrite, and prompt text editing in both the modular and standalone calculator.

## Native fidelity caveat

The mathematical tree and its cursor are independent code, not a copy of manufacturer firmware. Native glyph geometry, caret blink timing, exact key-boundary behavior and horizontal/vertical LCD scrolling cannot be certified without original CASIO frame captures. Full pan/overflow behavior is a **separate REA-015 task** and is intentionally not started here.

All changes remain limited to REA-014.
