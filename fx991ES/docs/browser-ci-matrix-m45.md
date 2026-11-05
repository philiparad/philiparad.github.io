# Milestone 45: actionable browser matrix summary

- `tools/ci_matrix_summary.py` renders a GitHub Actions Markdown summary from `browser-evidence/matrix-run.json`.
- Incomplete, duplicated, malformed or missing browser results are `BLOCKED`.
- The summaries are diagnostic only and **do not replace** source-provenance verification and authenticated GitHub artifact inspection.
- The main browser workflow publishes its status in `$GITHUB_STEP_SUMMARY` and uploads JSON/Markdown under `release-evidence/`, even after a failed browser run.
- Browser qualification requires 18 actual passing checks from Chromium, Firefox and WebKit against matching source. Physical Casio compatibility remains unverified.
- The GitHub connector's commit-associated run lookup is restricted to pull-request runs; an empty result should not be described as proof that no push-triggered workflow ran.
