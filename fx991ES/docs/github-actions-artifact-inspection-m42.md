# Milestone 42 — GitHub Actions artifact inspection

## Purpose

Inspect **actual** browser artifacts returned by a GitHub Actions run, without inventing browser results. The inspector only accepts an existing ZIP, rejects unsafe or oversized members, and compares the captured source fingerprint, exact acceptance test names, URLs, timestamps, browser identity and CI decision to the current checkout.

## Obtain evidence

Open the **Actions** tab in `philiparad/fx991ES`, select a run of `browser-acceptance.yml`, and download its `browser-evidence-<run ID>` artifact. The workflow also writes an `actions-evidence.zip` inside `artifact-upload/`, which can be extracted and given directly to the inspector.

```bash
python tools/actions_artifact_inspector.py artifact-upload/actions-evidence.zip --root . --out release-evidence/artifact-inspection.json
```

The inspector emits JSON and static escaped HTML. Its exit status is 0 only when the **contents** are complete and consistent. A downloaded ZIP is not a trusted CI attestation: even when contents pass, `releaseQualified` remains `false` and `ciRunAuthenticated` remains `false` until the GitHub run ID, conclusion, commit SHA and artifact ID are verified through an authenticated source.

## Integrity and adversarial cases

The inspector rejects traversal paths, symlinks, duplicate paths (including flattened alias duplicates), unrecognized directories, executable types, oversized entries, suspicious compression ratios, and incompatible or missing evidence. It reads JSON as data only and HTML-escapes any diagnostic string. The ZIP size limit is 20 MiB, total uncompressed limit is 32 MiB, and individual entry limit is 8 MiB.

## Known verification boundary

Current ChatGPT-connected GitHub `fetch_commit_workflow_runs` returns only pull-request-associated runs. An empty result for a push commit **does not** prove no workflow ran. The inspector therefore does not claim to have fetched any unavailable artifacts and cannot infer browser pass/fail from absent GitHub metadata.

The simulator and automated checks are independent of proprietary Casio firmware. Browser compatibility and physical-calculator equivalence are separate requirements.
