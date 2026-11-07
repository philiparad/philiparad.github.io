# REA-009 — Structured textbook input

**Target:** fx-991ES PLUS C 2nd edition independent HTML/CSS/JavaScript educational replica.

**Task status:** Implemented textbook expression tree, slot navigation and two-dimensional LCD rendering. Native CASIO hardware input fidelity remains unverified until REA-001/REA-002 device evidence is available.

## Implementation

- `js/structured-editor.js`: an independently authored expression tree with character and formula-template nodes. Each template contains actual editable child sequences, not a printable slash/power text string. The current cursor tracks a nested path and offset.
- `js/app.js`: routes the existing **physical calculator keys** to structured insertion, field navigation, delete and evaluation. The existing calculation engine continues to parse the expression serialized from the tree.
- `js/display.js`: renders fraction bars, stacked numerator/denominator, exponents, root signs, nth-root indices and a cursor inside editable placeholders, using the existing 96 × 31 logical LCD framebuffer. The display size and glyphs remain independent approximations, not proven CASIO hardware dimensions.
- `fx991_fresh_standalone.html`: contains the complete same editor and LCD rendering with no external dependencies.

## How to enter textbook formulas

The following operations use the calculator's own buttons and LCD, without modal dialogs or external input forms.

| Example | Physical key sequence |
|---|---|
| `2/3` stacked fraction | `2 FRAC 3 =` (previous number captured as numerator) |
| `1/2` stacked fraction | `FRAC 1 ▼ 2 ▶ =` |
| `2^3` | `2 POWER 3 ▶ =` |
| `√9` | `SQRT 9 ▶ =` |
| `³√8` | `SHIFT SQRT 8 ▶ =` |
| `³√8` as nth root | `SHIFT POWER 3 ▶ 8 ▶ =` |
| `1½` | `SHIFT FRAC 1 ▶ 1 ▶ 2 ▶ =` |

Arrow keys move between placeholders and back into the surrounding expression; `DEL` deletes characters or removes an empty template. The editor validates missing child fields before evaluation. For natural fractions, `▼` jumps from numerator to denominator, and `▲` returns to numerator. The tree can also contain nested templates such as a square root in a denominator.

## Verification

`.github/workflows/rea009-structured.yml` runs `reference/rea-009/test_structured_browser.py` with Chromium and real DOM button presses on both modular and standalone builds. It checks numerical results, nested tree node types, incomplete input rejection, cursor insertion and preservation of COMP/MODE functionality.

No React or Node.js is used by the application.

## Known limitations and follow-up task boundaries

- The 96 × 31 custom LCD and 3 × 5 pixel font are not guaranteed to match CASIO native typography; pixel-accurate font/raster reproduction is **REA-010** and is intentionally not begun here.
- The parser still uses JavaScript Number and approximations for fractions; exact rational arithmetic belongs to **REA-021/022**, not REA-009.
- This task does not clone CASIO firmware. Real hardware key sequences and native cursor positions need external emulator/device observations.
- Additional edge-case editing and scrolling can be developed under REA-014/015.

No manufacturer's proprietary firmware, artwork, or emulator DLL is included.
