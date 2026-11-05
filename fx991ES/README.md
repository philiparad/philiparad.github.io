# Milestone 23 — Deep LCD Layout and Structural Navigation

Independent educational browser simulator of fx-991ES PLUS / C behavior, with no CASIO firmware or proprietary assets. Not affiliated with or endorsed by CASIO. Plain HTML/CSS/JavaScript; no Node or React required in the browser.

## Applications

- `index.html`: calculator
- `tests/acceptance.html`: internal regression tests
- `tests/reference.html`: provenance-aware reference observation lab
- `tests/differential.html`: differential replay diagnostics
- `tests/release.html`: browser runtime and QA checks
- `tests/rc.html`: evidence-based release gate and JSON evidence import/export
- `tests/device.html`: **new physical/official-emulator comparison workbench**, discrepancy triage, provenance-aware evidence import/export

## Current readiness

- **318/318** local JavaScript tests passed (303 previous + 15 new baseline, clipping, vertical scroll and navigation tests).
- **0 bundled physical-device/emulator observations**. Hardware compatibility is NOT certified.
- Browser QA evidence is not bundled or presumed. Chromium checks, where performed locally, are development checks—not manual accessibility or cross-browser certification.
- See `docs/release-candidate.md`, `docs/release.md`, and `docs/compatibility.md` for precise gaps and requirements.

## Developer tests

`node tests/run-node.cjs` uses Node as an optional local test tool, not as an application dependency. No external packages are needed.

## Milestone 20 protocol

Use `tests/device.html` to select a documented reference scenario, operate it on an actual handheld or legitimately licensed official emulator, enter the observed result and provenance, and export the evidence JSON. Imported observations are compared with reproducible simulator traces and classified into numerical/formatting, workflow, editor, error, and mode-state discrepancies. **No physical/emulator observations ship with this project.** The sample device evidence used in unit tests is deliberately synthetic and is never exported as a project observation. See `docs/device-validation.md`.

## Milestone 21 correction: multiplication by juxtaposition

The shared COMP expression parser now recognizes implicit multiplication before parenthesized groups, π, register variables, Ans, and supported scientific function calls. This multiplication binds more tightly than an explicit multiplication/division operator, following the precedence policy in the Milestone 8 research report. Examples: `2(3+4) = 14`, `2pi = 2π`, `1/2pi = 1/(2π)`, and `sin(30)cos(60) = 0.25` in degree mode. Exponents and unary negatives preserve `-2^2 = -4`.

**Evidence status:** these tests verify the independently implemented parser against the report's stated precedence rule. No physical calculator/emulator observations are represented by these cases. Input editor, LCD output, error-position display, and Casio-specific corner cases still need physical/device characterization.

See `docs/compatibility-corrections.md` for a behavior-by-behavior change log and known gaps.

## Milestone 22 — structural cursor recovery

- `FX991_EDITOR.seekSource(document, offset)` maps semantic-source offsets back to stable structural cursor anchors without flattening or replacing the document tree.
- `FX991_EDITOR.firstMissingAnchor(document)` identifies the first empty template slot for syntax error positioning.
- The unified controller returns to the original structural document when LEFT/RIGHT is pressed from an error screen, keeping nested fractions, powers and roots editable.
- Division by an exactly zero right operand reports the divisor's source position; unsupported errors still carry conservative positions.
- Regression cases cover Fix/Sci rounding carry, Norm thresholds, S⇔D value identity, nested structural editing, and error recovery.

These behaviors are implemented compatibility candidates, **not** empirically confirmed against a physical device. The LCD vertical overflow and precise Casio cursor blink/placement remain unresolved.

## Milestone 23 — deep mathematical layout

- The LCD layout uses baseline-aware boxes for tokens, fractions, superscripts, roots, functions and nested expressions. Exponents are raised relative to the base text baseline.
- The 96×31 framebuffer clips expression drawing to rows 7–21; status and result regions remain isolated.
- Tall expressions scroll vertically toward the active structural cursor; top/bottom arrows indicate offscreen material. Horizontal scrolling is retained. Layout output includes `scrollX`, `scrollY`, and viewport metadata.
- UP/DOWN navigation finds the nearest enclosing mathematical template with an adjacent slot, allowing movement from a nested numerator function to a fraction denominator.
- The renderer is an independently developed approximation; its glyphs and layout are not pixel-identical to any CASIO product. The display has only fifteen logical rows for mathematical input, so tall expressions are **scrolled, not all visible simultaneously**.
- **318/318** internal JavaScript regression tests pass; Chromium browser navigation remains blocked by this environment, and physical device parity has not been measured.

See `docs/lcd-navigation.md` for the layout contract and gaps.
