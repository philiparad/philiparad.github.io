# Milestone 19 — Evidence-based Release Candidate Gate

The independent calculator has an internal regression suite but is **not yet verified as hardware-compatible**. The release gate in \`tests/rc.html\` is conservative: it starts with zero observations and refuses to mark a release ready on internal tests alone.

## Required evidence

1. Full internal suite with no failures.
2. Chromium, Firefox, and WebKit observations for keypad, keyboard, screen-reader, 320px viewport, 200% zoom, contrast, exports, and offline use. Include browser/OS/version, date, and observed status.
3. At least one passing **real physical calculator or official emulator** reference for each model profile (standard/C). A single passing example is only a minimum gate indicator, not comprehensive compatibility evidence.
4. Runtime health and public GitHub Pages deployment separately checked.
5. No failed comparisons or failed browser checks.

Import/export via JSON is manual and local only; no observations are invented or transmitted. \`releaseReady=true\` indicates the documented minimum evidence gate, **not proof of complete Casio fidelity**. Final release still requires human review of coverage, quantitative numerical reference comparisons, known gaps, and IP/trademark presentation.

## Provenance policy

Manual-derived expected results are not physical observations. Do not claim a device or emulator was tested unless the sequence was actually operated and the display transcribed or otherwise recorded. Physical compatibility remains unverified with the bundled project: zero device observations.

## Browser testing

The local CLI suite is \`node tests/run-node.cjs\` (optional development tool; no Node runtime in the shipped app). Browser pages are \`tests/acceptance.html\`, \`tests/release.html\`, and \`tests/rc.html\`. Manual a11y and physical-device checks cannot be replaced by programmatic checks.

## Security

Evidence files are treated as untrusted JSON and validated before use. User-origin text is displayed with \`textContent\` and is not executed. Avoid embedding proprietary ROMs, fonts, emulator resources, or activation material.