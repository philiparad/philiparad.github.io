# Milestone 19 — Release Candidate Evidence Gate

Independent educational browser simulator of fx-991ES PLUS / C behavior, with no CASIO firmware or proprietary assets. Not affiliated with or endorsed by CASIO. Plain HTML/CSS/JavaScript; no Node or React required in the browser.

## Applications

- \`index.html\`: calculator
- \`tests/acceptance.html\`: internal regression tests
- \`tests/reference.html\`: provenance-aware reference observation lab
- \`tests/differential.html\`: differential replay diagnostics
- \`tests/release.html\`: browser runtime and QA checks
- \`tests/rc.html\`: **new evidence-based release gate** and JSON evidence import/export

## Current readiness

- **252/252** local JavaScript tests passed at build time (239 Milestone 18 + 13 release-gate checks).
- **0 bundled physical-device/emulator observations**. Hardware compatibility is NOT certified.
- Browser QA evidence is not bundled or presumed. Chromium checks, where performed locally, are development checks—not manual accessibility or cross-browser certification.
- See \`docs/release-candidate.md\`, \`docs/release.md\`, and \`docs/compatibility.md\` for precise gaps and requirements.

## Developer tests

\`node tests/run-node.cjs\` uses Node as an optional local test tool, not as an application dependency. No external packages are needed.