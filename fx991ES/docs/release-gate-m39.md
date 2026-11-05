# Milestone 39 — Production release candidate gate

The version 39 package is a **release candidate**, not a release certified against a physical calculator. The new source-inventory manifest (`release-manifest.json`) uses SHA-256 to detect unintended local changes. The manifest is not a digital signature or provenance attestation, and it cannot prove the identity of a browser or device.

## Commands (development and CI only)

```sh
node tests/run-node.cjs
python -m unittest discover -s tools/tests -v
python tools/release_gate.py verify
python tools/browser_matrix.py --out browser-evidence
python tools/release_gate.py qualify --evidence browser-evidence --out browser-evidence/release-qualification.json
```

Qualification passes **only** when (1) the complete source inventory matches its generated manifest and (2) the existing offline reviewer accepts all 18 checks in each of Chromium, Firefox and WebKit, with source fingerprints, timestamps and URL checks satisfied. A missing report, startup block, execution failure, or wrong build must fail qualification.

GitHub Actions executes the browser matrix, audits evidence, writes the candidate decision, and uploads the diagnostics even if the matrix is blocked. A blocked result does **not** create a release tag or claim browser compatibility. Physical calculator observations and model-specific equivalence remain independent and unverified.

The simulator shipped to the browser remains static HTML/CSS/vanilla JavaScript. Python and Node are optional test/CI tooling only.