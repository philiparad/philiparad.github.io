# Milestone 16 — Reference Characterization and Compatibility Testing

Independent educational scientific calculator inspired by fx-991ES PLUS / fx-991ES PLUS C, **not affiliated with CASIO**. Fully browser-side HTML/CSS/vanilla JavaScript. No React, Node runtime, external libraries, ROM extraction, or proprietary assets.

## Open

- **Calculator:** `index.html`
- **Internal tests:** `tests/acceptance.html`
- **Reference laboratory:** `tests/reference.html` — import/export observed behavior and compare to the calculator.

## Milestone 16 additions

- `src/reference.js` — schema validation, model/setup normalization, key-trace execution, field-by-field comparison, observable state, and reference-result aggregation.
- `tests/reference.html` — interactive browser laboratory with six **manually seeded documentation-based expectations**, JSON corpus editing and import/export, observed-device recorder, case-by-case diagnostics, and detailed deterministic key traces.
- `docs/reference-methodology.md` — explicit collection/evidence/provenance protocol.
- `docs/compatibility.md` — separate claims about local test success and device-level verification.
- Fourteen new internal regression tests for validation, deterministic rendering, model selection, error states, and reference-provenance separation.

**Internal JavaScript tests: 204/204 passed locally** (190 previous + 14 new). These do not establish physical-device compatibility. The bundled corpus has **zero verified physical/emulator observations**.

## How to contribute actual reference observations

Open `tests/reference.html`, record a real device or legitimate emulator operation with its edition, date, initial setup and entered keys, then add its observed result. Export the updated JSON and version it separately with attribution/provenance. The page does not automatically save personal data or transmit it off-device.

## Known limitations

- This release does not establish equivalence with actual CASIO numeric precision, editor menus, status glyphs, or ROM behavior.
- The reference runner performs strict comparison on explicitly provided fields. It does not infer missing observations or self-certify seeded manual expectations.
- The standalone LCD renderer clips very tall nested expressions and uses independent glyphs.
- Automated Chromium browser-level E2E and hardware/emulator black-box checks are still required.

## Next engineering stage

Milestone 17: differential testing, cross-browser accessibility checks, a larger provenance-backed observed corpus, automated replay diagnostics, and browser quality assurance. See the research report's verification roadmap.
