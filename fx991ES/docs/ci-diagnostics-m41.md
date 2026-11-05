# Milestone 41 — Evidence-grounded CI diagnostics

## Goal

Explain *why* the GitHub Actions release check could not approve a browser build, without changing the qualification rules or claiming physical Casio compatibility.

## Inputs

- `browser-evidence/matrix-run.json`: actual browser-matrix result, including per-browser `PASS`, `FAIL` or `BLOCKED` and the last execution phase.
- `release-evidence/release-decision.json`: the existing Milestone 40 fail-closed release decision.

Missing input files are treated as missing evidence. The tool never manufactures passing captures. It is a diagnostic supplement to `evidence_review.py` and `release_gate.py`, **not a replacement** for their integrity and provenance checks.

## Output

`tools/ci_diagnostics.py` writes a JSON report and an escaped, self-contained HTML summary. Each browser has a status, phase, and short diagnostic, followed by deduplicated troubleshooting suggestions. Non-qualification returns exit status 1; report files are still written.

## Interpretation

- `BLOCKED` at **launch**: check Playwright installation/browser binaries.
- `BLOCKED` at **navigate**: check local HTTP server, network, or policy.
- `FAIL` at **execute**: inspect actual DOM assertions and console/page errors, then add a regression test for confirmed defects.
- Failure at **capture**: inspect downloads, JSON identity, and screenshots.
- Missing or contradictory reports: do not qualify the release.

A prior GitHub connector query returned no pull-request-associated workflow runs for the latest commits. That absence is not conclusive proof that no workflow ever executed; inspect the repository’s Actions tab directly for other events.

## Manual command

```sh
python tools/ci_diagnostics.py --matrix browser-evidence/matrix-run.json --decision release-evidence/release-decision.json --out release-evidence/ci-diagnostics.json
```

## Release rule

The existing requirement remains unchanged: **all 18 browser acceptance tests must pass in each of Chromium, Firefox and WebKit** using matching source evidence. Physical calculator measurements remain a separate requirement.