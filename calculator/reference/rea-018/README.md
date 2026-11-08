# REA-018 — Physical PC keyboard shortcut parity

**Priority:** P2 · **Dependency:** REA-005 · **Acceptance:** Keyboard shortcuts for operators, DEL, cursors, SHIFT/ALPHA functions should match the bundled fx-ES PLUS emulator guide.

## Primary reference

CASIO, *fx-ES PLUS Emulator Subscription User's Guide*, **EN-2**, "Emulator Operations":

[CASIO official emulator guide](https://edu.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-ES_PLUS_Emulator_Subscription_EN.pdf).

That guide explicitly lists the following calculator-to-PC mappings. They are keyboard shortcuts for the emulator **UI**, not native manufacturer keycodes. It documents a model-specific ambiguity for comma (and some top keys) that is not yet verified on each physical device.

| PC keyboard input | Calculator action in the independent implementation | Provenance |
|---|---|---|
| F1 | SHIFT | CASIO EN-2 |
| F2 | ALPHA | CASIO EN-2 |
| F3, Home | MODE | CASIO EN-2 |
| F4 | ON | CASIO EN-2 |
| Enter, numpad Enter | = | CASIO EN-2 (numpad alias is an extension) |
| Backspace, Delete | DEL | CASIO EN-2 |
| Arrow keys | REPLAY LEFT/RIGHT/UP/DOWN | CASIO EN-2 |
| ^ | x^□ | CASIO EN-2 |
| ( ), + - * / | Same physical mathematical operators | CASIO EN-2 |
| Period | Decimal point | CASIO EN-2 |
| Comma | Calculator argument separator | CASIO EN-2, model-dependent |
| 0–9 | Corresponding calculator number key | CASIO EN-2 |
| Space | AC, unless an actual calculator button has keyboard focus | CASIO EN-2 with browser accessibility exception |
| Tab | AC **only when the calculator face container has keyboard focus**; Shift+Tab moves focus away | CASIO EN-2 with browser accessibility exception |
| Ctrl+C, Ctrl+Insert | Copy LCD PNG through Clipboard API **when the calculator face / key owns focus and browser permissions allow** | CASIO EN-2, browser security variation |
| Escape | AC | Web-only convenience, not an assertion about official guide |

Additional web-only convenience: letter and operator text can be typed inside calculation-prompt fields. `=` remains the calculator equals action; `Enter` advances prompt fields. Comma becomes a literal separator inside prompt fields and a calculator argument separator inside ordinary formulas. Generated SHIFT combinations on a PC keyboard (such as Shift+6 for `^`) must not independently toggle the calculator's SHIFT modifier.

## Accessibility and browser conflict policy

This is a web browser, not a standalone Windows emulator:

- While the calculator face itself is focused, **Tab** activates AC as the guide specifies. **Shift+Tab** exits the face. Once a physical button has focus, Tab navigates normally.
- **Space/Enter** on an actual focused button use the button's native HTML keyboard activation; they are not duplicated by the document-level dispatcher.
- Text input, select, textarea, contenteditable and companion-panel control focus are not hijacked by calculator shortcuts.
- Ctrl/Alt/Meta browser and operating system shortcuts are left intact. The sole exception is authorized Ctrl+C/Ctrl+Insert LCD capture while the calculator face or a calculator key is focused; clipboard writing is subject to browser permission and secure-context rules. The visible **Save LCD** button remains the fallback when clipboard permission is denied.
- A keyboard event during IME composition is ignored by the calculator.
- All keyboard routes converge on the same `press(key)` handler as physical on-screen calculator buttons, so history, display and test logging stay consistent.

## Implementation and tests

- `calculator/js/keyboard.js`: pure key resolver, dispatch and explicit safety rules; no external framework.
- `calculator/js/app.js`: physical-key dispatcher, prompt comma, clipboard screenshot writer.
- `calculator/index.html`: keyboard help and focusable calculator face.
- `calculator/fx991_fresh_standalone.html`: same bindings embedded for offline use.
- `reference/rea-018/test_keyboard_browser.py`: browser tests in both builds for the official key table, actual keydown sequences, modifier keys, Tab/Space/focus behavior, prompt typing, comma handling and clipboard routing.
- `.github/workflows/rea018-keyboard.yml`: CI acceptance suite and JSON artifact.

Run from the repository root:

```sh
python -m pip install playwright==1.56.0
python -m playwright install chromium
python calculator/reference/rea-018/test_keyboard_browser.py
```

## Remaining native parity limits

This is **guide-based keyboard shortcut mapping**. An authenticated running Windows emulator session remains necessary to compare keyboard input handling on the specific PLUS C version, locale-dependent punctuation, clipboard behavior and system-reserved F keys. The reference guide's emulator shortcuts are confirmed; full real-emulator behavior has not been captured via REA-001.

**REA-019 has not been started.**
