# fx-991ES PLUS (2nd edition) — Current verification and parity status

**Updated:** 2026-11-17  
**Current supported model:** CASIO fx-991ES PLUS **2nd edition only**.  
**Release evidence:** source/browser/Windows comparison tests, as documented below.  
**Physical-device parity:** **UNVERIFIED — no authenticated same-key genuine fx-991ES PLUS 2nd edition LCD/key-log comparison has been completed**.

## Scope of the current product

The calculator at `calculator/index.html` and its Tauri 2 desktop build share
the same JavaScript mathematics engine, keypad and LCD renderer. The default
website and the native window now show only the calculator; the native window
loads the packaged local `index.html`, not a remote website. There is no active
three-model configuration or model selector. The eight supported modes are
COMP, CMPLX, STAT, BASE-N, EQN, MATRIX, TABLE and VECTOR.

The previous fx-991ES / PLUS / PLUS C browser observations remain preserved in
[historical three-model review](HISTORICAL_THREE_MODEL_REVIEW_2026-11-12.md).
Those **historical** results do not demonstrate that the current single-model
revision is correct and must not be mixed with current acceptance totals.

## Evidence tiers

| Tier | Required evidence | Current verdict |
| --- | --- | --- |
| Source and numerical tests | Real test assertions against the current revision | Available for many modes; independent failures still block a release |
| Browser tests | User-visible key sequences in a real Chromium page | Partial coverage; verify actual Actions results for each current commit |
| Cross-engine display | 8 LCD scenarios at 4 emulated DPRs in Chromium and native WebView2 | Previous CAL-012 32/32 comparison passed, but recheck on latest revision |
| Windows installers | Successful NSIS/MSI Windows Actions run + downloaded installer artifacts | Must be checked after each desktop change |
| Installed Windows scaling | Launched native Tauri app inspected at physical 100/125/150/200% monitor scales | Not yet evidenced |
| Genuine-device parity | Same-key results, errors, LCD images and logs from a genuine PLUS 2nd edition | **0 authenticated paired comparisons — unverified** |

## Required desktop release gates

1. Validate a production-only manifest containing exact HTML-linked JavaScript
   scripts, the numerical Web Worker, the capability JSON and bundled LCD font;
   reject historical reference fixtures and duplicated calculator source files.
2. Compare hashes of staged JS/HTML against the authoritative modular website
   sources; ensure the local desktop has the **current** calculator behavior.
3. Enforce restrictive Tauri Content Security Policy (local scripts/fonts and
   local worker only; no remote network dependency for calculations).
4. Run deterministic LCD/caret/keyboard regression tests and available
   numerical mode contracts against the current commit.
5. Run matching Chromium/WebView2 LCD screenshots with emulated DPR
   1, 1.25, 1.5 and 2; inspect the report and retain the artifact.
6. Build **both** Windows NSIS and MSI installers after successful validation.
7. Require manual native-install and genuine hardware evidence separately.
   Never infer completed hardware parity from an all-green CI run.

## What remains unresolved

- Physical CASIO calibration for rounding and precision corner cases.
- Verified native keypad/LCD comparisons for statistical regression, CMPLX,
  SOLVE/CALC, EQN, MATRIX, VECTOR, TABLE and BASE-N.
- Installed-app observations on Windows 10/11 at actual Windows display scales.
- Maintenance of a reproducible dependency lock (see CAL-020 and Windows CI).
- Any failing release gate reported on the current GitHub revision.

The current evidence does not justify the phrase *hardware-equivalent* or
*manufacturer-certified*. Only compare native and web output after obtaining
reliable same-input physical-device or licensed emulator evidence.
