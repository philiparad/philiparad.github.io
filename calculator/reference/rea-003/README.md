# REA-003 — Exact physical keycode and hit-rectangle audit

**Status: PARTIALLY IMPLEMENTED / NOT NATIVE-VERIFIED.**

This is the third task of the CASIO Fresh REA backlog. REA-001/002 still lack real emulator observations, so a genuine mapping from native `GetKeyInfo` / `GetKeyPosition` cannot be certified. Do **not** invent native scan codes or report this task as done.

## What this increment implements

- Canonical `key-map.json` with **50 unique physical key IDs**, base, SHIFT and ALPHA legends, body-relative rectangle centers, widths and heights.
- A lightweight [interactive inspection workbench](index.html) that draws the 50 hit targets using independently authored CSS and shows selected key geometry, legends and unknown native codes.
- An optional local PNG/JPEG reference viewer. Image pixels stay in the browser and are not embedded in or uploaded to this public repository.
- Local operator notes and native-code observations export to JSON; **exported observations are unreviewed and not device evidence by themselves**.
- Python standard-library validator `validate.py` checking 50-key identity, source-to-manifest parity, standalone HTML parity, rectangle bounds, pairwise hitbox overlaps and an explicit unverified status.

## Actual source defect corrected

Previously the first scientific row was arranged as:

```
CALC  ∫  [blank]  x⁻¹  log□  [blank]
```

The user's reference image instead shows:

```
CALC  ∫  [blank]  [blank]  x⁻¹  log□
```

The old geometry produced an unintended overlap between DOWN and x⁻¹ (about 112.4 screenshot pixels squared). Corrected `calculator/js/keypad.js`, `calculator/fx991_fresh_standalone.html`, and the 50-key manifest; a source-data rectangle audit now detects **zero** overlaps.

## How to test

From the GitHub checkout root:

```sh
python3 calculator/reference/rea-003/validate.py
```

Open `calculator/reference/rea-003/index.html` through a local static web server or GitHub Pages to inspect the interactive overlay. The validator is a *source/geometry* consistency test, not a native calculator equivalence test.

## What is required before marking REA-003 complete

1. On an authorized Windows environment running the exact supported emulator version, use the model DLL exports `GetKeyCount`, `GetKeyPosition`, `GetKeyInfo`, and `GetKeyboardInfo` or instrument their caller to acquire native return values.
2. Record call signatures, return values, mapping methodology and the 50 native codes. Use actual observed data rather than guessed identifiers.
3. Capture full UI screenshots, native key rectangles and activation-free test traces for all 50 keys (plus SHIFT/ALPHA legends and semantics). Record emulator model/version, DPI scale, face resolution, key order and source checksums.
4. Review code-to-label mapping against each pressed key. Explicitly record any unmatched key or regional variant.
5. Populate `native_scancode`, `native_key_rect` and evidence provenance for every manifest key; verify model-wide geometry and functionality before changing status to `VERIFIED`.

**Native scancode coverage:** 0/50. **Screenshot-space hitbox geometry:** 50/50, with no overlap after the fix. These are separate claims.

No original CASIO bitmap, firmware, DLL or licensed emulator code is redistributed.
