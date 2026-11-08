# REA-019 — View-only KeyLog and LCD screen capture

**Task definition (CASIO_Fresh_REA_Tasks.csv):** “Make view-only KeyLog and screen capture equivalent to emulator UX.”

**Priority:** P2 · **Original status:** Partial · **Dependency:** REA-001. The original acceptance criteria require “Copy formatted key trace, scale/capture options, outer-frame settings and keylog viewing compared against guide; no math outside LCD.”

## Reference and scope

CASIO, *fx-ES PLUS Emulator Subscription User's Guide*, EN-3–EN-4, [official PDF](https://edu.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-ES_PLUS_Emulator_Subscription_EN.pdf), describes:
- **Capture Screen** — image of the calculator screen placed on the clipboard.
- **Capture Setting → Outer Frame** — include/exclude a surrounding frame.
- **Capture Setting → ×X Zoom** — scale captured LCD image.
- **KeyLog** — a viewable history of key operations; select, copy, select all, clear, increase/decrease key size.

The independent HTML application implements the corresponding classroom workflows, not proprietary Windows application menus.

## New and improved features

### KeyLog

A **view-only key log** shows physical calculator operations, formatted with their visible key legend (e.g., `2 + 3 =` rather than `2 ADD 3 EQUAL`). It supports:
- Start/stop recording and a bounded 300-key log;
- Click-to-select keys, Ctrl/Cmd-click multiple selection, Shift-click range selection;
- **Copy selected keys** as plain text in chronological order;
- **Select all**, **Clear**, **A+ / A−** to increase/decrease visible key size;
- Export JSON containing the raw key data, selected indices and formatted trace;
- Accessible `aria-pressed` for selected keys and explicit selection counts.

Selecting, clearing, copying or resizing the log does **not** feed any key back to the calculator, evaluate a mathematical expression or change an answer.

### LCD capture

The Save LCD button now uses selected **capture settings**, which affect export only:
- Image zoom: ×1, ×2, ×3, ×4, ×5, ×6;
- **Outer frame:** optional bordered bitmap;
- Save PNG;
- Copy PNG to clipboard, subject to browser permissions/security;
- Existing Ctrl+C / Ctrl+Insert keyboard capture shortcut uses the same selected settings, where available.

The image is assembled from this application's **independently rendered** 768 × 248 LCD canvas with nearest-neighbor scaling to preserve its raster pixels. At ×2 with the outer frame, it measures 1560 × 520 pixels. At ×6 without the outer frame, it measures 4608 × 1488 pixels.

These are web-source dimensions; they are **not** evidence of CASIO's native LCD matrix or physical frame geometry.

## Architecture

- `calculator/js/teaching-tools.js`: pure key trace formatter, selection ordering, image zoom/frame construction and configuration validation.
- `calculator/index.html`: optional capture settings panel and enhanced KeyLog tools.
- `calculator/styles.css`: view-only keylog selection and screenshot settings styling.
- `calculator/js/app.js`: users' click/clipboard/download handling; calculator key recorder is still the single source of logged operations.
- `calculator/fx991_fresh_standalone.html`: independently usable synchronized build.

No React, Node.js or manufacturer emulator binary is required. Mathematical input, editing and calculation remain confined to the 50-key calculator and LCD. These tools serve only teachers' screenshots and demonstration records.

## Automated acceptance tests

```sh
python -m pip install playwright==1.56.0
python -m playwright install chromium
python calculator/reference/rea-019/test_teaching_tools_browser.py
```

`.github/workflows/rea019-teaching-tools.yml` tests both calculator builds using real browser button actions. Assertions cover key recording, selection/range-selection, copying a formatted key trace, key-size adjustment, selection persistence, clean PNG downloads, exact capture dimensions under frame/zoom settings, clipboard image routing, JSON export, and preservation of calculator state. A machine-readable audit is published as a GitHub Actions artifact.

## Evidence limitations

A running licensed CASIO emulator has **not** been directly inspected. Comparison is against the documented GUI operations, not verified native pixels or timing. The browser clipboard can be denied, particularly on `file:` pages or insecure origins; the Save LCD PNG option is always available as the fallback. Screenshot borders and scaling are independently designed, not copies of the manufacturer's original frame asset.

REA-019 must not be reported as fully native-verified while REA-001 remains without authentic emulator capture evidence.

**REA-020 has not been started.**
