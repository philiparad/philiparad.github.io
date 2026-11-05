# Milestone 18 — Release Hardening and Browser QA

Independent educational scientific calculator inspired by fx-991ES PLUS / C. **Not affiliated with CASIO.** Browser-only HTML/CSS/JavaScript.

## Release-hardening changes

- Main-page CSP: same-origin scripts/styles, no outbound connections, plugins, inline script, or HTML forms.
- Skip-to-content, semantic LCD labels, result/error announcements, keyboard focus, reduced-motion and forced-color support.
- Browser QA at `tests/release.html` and deterministic release audit at `src/release-audit.js`.
- Safer CSV exports for untrusted reference values.
- No external assets, tracking, or proprietary ROMs.

## Entry points

- `index.html`: calculator
- `tests/acceptance.html`: internal tests
- `tests/release.html`: browser QA
- `tests/reference.html`: reference recording
- `tests/differential.html`: key replay and comparison

## Testing and limits

Run `node tests/run-node.cjs` if Node is installed for development, or open the browser test pages. Node is **not** required to operate the calculator. No physical or official-emulator observations are yet verified. Browser and device compatibility are not certified; see `docs/release.md`.
