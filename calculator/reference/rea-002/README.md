# REA-002 — Capture native LCD matrix and active drawable rectangle

**Status: BLOCKED ON REAL EMULATOR/DEVICE CAPTURE.** This task is dependent on REA-001, whose first 133 test sequences are defined but have no authentic captures yet.

The static emulator analysis identified resources of 192 × 63 and 192 × 8 pixels. Neither establishes the native calculator's LCD matrix. The independent web app's 96 × 31 framebuffer is an implementation choice, *not* proven CASIO hardware geometry.

## Workbench

Open `calculator/reference/rea-002/index.html` in a browser. It requires no React, Node.js, server, or third-party dependencies. It does not send images over the network.

1. Capture an original, unmodified **PNG** from the CASIO emulator using the built-in screen capture option. Record emulator model, version, date and display setup.
2. Load the PNG. Drag rectangles to identify the LCD bezel, active display, annunciator band and representative glyph cell. Measurements are in original image pixels, regardless of CSS zoom.
3. Determine the actual *logical dot matrix* independently using repeatable integer-scale pixel-grid measurements across multiple screens, or a trustworthy device reference. Do not confuse an emulator's bitmap dimensions with LCD pixels.
4. Enter measured dot count, screenshot pixels per dot, and methodology. Export the JSON and annotated PNG. **Keep the original PNG**; the export stores its SHA-256 hash.
5. Use the validator on each evidence JSON and original PNG, then cross-review screenshots before approving native matrix dimensions.

## Expected evidence

- Source PNG with date, model, emulator version, and captured setup.
- Correct rectangles within the original source PNG: LCD bezel, active area, annunciators, one glyph cell.
- Native logical pixel width/height and dot pitch, **plus** a reproducible observation method.
- Confirmation through at least two different LCD states and a reviewer; screenshot-derived estimates are not hardware certification.

## Verification and stop condition

A complete measurement record can be structurally validated with:

```sh
python calculator/reference/rea-002/validate.py evidence.json /path/to/original-reference.png
```

The validator prints `STRUCTURALLY_VALID_UNREVIEWED`, never `HARDWARE_VERIFIED`. REA-002 must remain **in progress** until actual native captures have been collected and externally reviewed. Work on REA-003 must not begin until instructed.