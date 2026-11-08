# REA-017 — Physical case, bezel, button geometry and legends

**Priority P1.** Original acceptance criterion: *At agreed reference resolution, position/shape/palette typography and labels measured against annotated reference within defined tolerance.*

**Status:** Independently authored screenshot-space case improvements implemented. **Native CASIO physical/emulator pixel parity is not established**: the key map derives from a 274 × 580 user-provided face crop, not genuine `GetKeyPosition` observations (REA-003 still reports 0/50 native codes and rectangles).

## Changes

- Added an independently drawn solar-cell recess, segmented solar cells and model/edition face markings, without using any manufacturer image as a deployed asset.
- Rebalanced the graphite case background and molded bezel highlights.
- Changed the engraved model marking with the selected simulation profile (original, standard PLUS, PLUS C), so the face does not falsely advertise PLUS C when another model is selected. The edition marking is hidden for the original fx-991ES profile.
- Fixed the upper keys' invalid **`top`** ALPHA legend that was appearing because a layout metadata marker was mistaken for a physical legend.
- Preserved 50 individual button hit targets, model-independent physical key centers, SHIFT legends in yellow, ALPHA legends in pink, dark scientific keys, light numeric keys and green DEL/AC keys.
- Kept the shell at the original screenshot's **274:580** aspect ratio at responsive widths, separate from the official physical dimensions. No manufacturer's reference bitmap or proprietary SVG was copied.

## Geometry evidence

`geometry.json` pins a machine-readable body reference, key map path, landmarks and tolerances. The current known landmarks, in *274 × 580 screenshot-crop* coordinates, are:

| Landmark | X | Y | Width | Height |
|---|---:|---:|---:|---:|
| LCD bezel | 20.99 | 79.98 | 231.01 | 102.02 |
| Solar-cell recess | 141.11 | 26.97 | 100.01 | 39.15 |

The test reads the 50 key rectangles from `../rea-003/key-map.json`, converts the actual CSS DOM rectangles back to the reference coordinate system, and requires their centers and sizes to agree within **1.5 reference pixels**; bezel and solar landmarks must agree within **2.5 reference pixels**. The geometry is checked at case widths 274, 334 and 220 CSS pixels.

A live test also checks distinct key categories, color/style declarations, presence of all 50 keys, absence of stray `top` legends, correct model/edition names and elementary key arithmetic. This is a **reproducible consistency audit, not photographic computer vision or native-device pixel matching**.

```sh
python -m pip install playwright==1.56.0
python -m playwright install chromium
python calculator/reference/rea-017/test_geometry_browser.py
```

The CI workflow is `.github/workflows/rea017-geometry.yml`, which publishes `rea017-face-geometry-audit`.

## Manufacturer dimensions versus screenshot geometry

The [official fx-991ES PLUS C (2nd edition) specifications](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/technical_informatoin/specifications.html) give approximately **77 mm wide × 161.5 mm deep** and **11.1 mm thick**. The current source screenshot crop is 274 × 580 pixels and includes perspective, framing and unknown crop margins. Its 274:580 pixel aspect ratio **must not** be conflated with an orthographic measurement of the physical product.

The official manufacturer documentation also confirms a built-in solar cell; the deployed solar panel is an independently stylized visual approximation, not a copy of CASIO texture or exact cell arrangement.

## Before claiming full REA-017 acceptance

1. Obtain an authenticated orthographic reference for the exact **fx-991ES PLUS C 2nd edition** and annotate its body, bezel, solar aperture and every button's visible and active rectangles.
2. Extract real `GetKeyPosition` and `GetKeyInfo` results from the licensed Windows reference emulator; record emulator build, DPI, scaling, device version and the exact transforms.
3. Compare a standard-resolution browser raster against the original annotated image, using explicit geometry, typography, palette and silhouette tolerances. Review any manufacturer-variant differences before propagating them.
4. Repeat all geometry tests on the available regional models, and distinguish physical hardware, screenshot crop and emulator bitmap geometries rather than claiming they are identical.

**REA-018 has not been started.**
