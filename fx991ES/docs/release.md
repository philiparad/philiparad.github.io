# Release-readiness and compatibility gate — Milestone 18

## Scope
Independent browser-only calculator; no proprietary ROM, firmware, or artwork, no telemetry and no backend.

## Security
- Imports are untrusted: never evaluate imported strings as code or render via raw HTML.
- CSV formula injection: prefix externally supplied fields beginning with =, +, -, @.
- Restrictive Content Security Policy on calculator page: scripts and styles from same origin only; no outbound connections.
- No calculator input, history or classroom trace is sent to any external server.

## Manual browser checklist — not yet certified
1. Chrome, Edge, Firefox and Safari (desktop and mobile where possible).
2. Keyboard focus: Tab, Shift+Tab, Escape, Space/Enter.
3. Screen reader labels, LCD semantic output and error/result announcements.
4. Viewport 320px, 200%/400% zoom, high contrast, reduced motion.
5. PNG and JSON/CSV exports, offline operation, permission errors.
6. Complete regression suite and public website availability.
7. Device/emulator observations for both calculator models.

## Release gate
Internal and automated browser suites pass; manual QA recorded; no P0 issues; source and site files verified; hardware observations support compatibility claims. Currently device-observed cases: 0.

## Known gaps
Device-specific keypad/menu sequences, high-stack structures, pixel-glyph matching and Casio-specific rounding are not certified. Browser automation may be restricted by the execution environment.
