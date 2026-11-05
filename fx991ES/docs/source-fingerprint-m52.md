# Milestone 52 — Complete Browser Source Fingerprinting

## Defect corrected

Earlier browser run evidence used a SHA-256 digest derived from only eight files. A change to a different browser-runtime module such as `src/boot-diagnostics.js`, `src/natural-editor.js`, `src/modes.js`, or `tests/cases.js` did **not** change that fingerprint. This permitted incompatible browser reports to carry an unchanged build identifier, even when their source inventory was different.

## Correction

`tools/browser_matrix.py` now enumerates all JavaScript, HTML, and CSS in `src/` and `tests/`, plus the root `index.html` and `styles.css`. Each file contributes a sorted POSIX-relative name, byte length, and raw content to the SHA-256 hash. An added, removed, or modified browser module changes the digest. Missing required files and source-tree symlinks cause a hard failure.

Both the canonical 18-check browser matrix and the six native Playwright interaction probes use this same fingerprint. The evidence review and release qualification gate compare against the current checkout and reject old fingerprints automatically.

Generated evidence, diagnostic reports, and `release-manifest.json` are excluded to prevent self-referential hashes. The separate release manifest continues to cover the full project inventory, including Python tools and CI workflows.

**Migration:** M51 and earlier browser evidence hashes are not interchangeable with M52. Generate fresh captures with the M52 runner; never rewrite the source digest of old evidence by hand.

## Verification

```sh
node tests/run-node.cjs
python -m unittest discover -s tools/tests -v
python tools/release_gate.py verify
```

Eleven dedicated unit tests check stable hashing, source additions, removals, mutations, bootstrap and test-suite coverage, ignored generated artifacts, required source files and symlink rejection.

This is a source-provenance correction, **not** a claim of successful browser execution, release approval or physical Casio hardware equivalence.
