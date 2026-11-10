# REA-081 — Audit of all 50 physical key legends across modifiers, modes and screens

**Status:** source-level audit, visual availability state, tests, and export mechanism committed on `main`. Browser/CI execution and original-CASIO physical key traces are not yet verified.

## Coverage: complete five-dimensional matrix

The audit enumerates **34,650 rows**, one for each:
- 3 models: original `fx-991es`, `fx-991es-plus`, `fx-991es-plus-c`
- 50 physical keys in the face model
- 3 modifier choices: `normal`, `SHIFT`, `ALPHA`
- 11 potential modes: `COMP, CMPLX, STAT, BASE-N, EQN, MATRIX, TABLE, VECTOR, INEQ, VERIF, DIST`
- 7 interaction screens: `edit, result, prompt, menu, flow-result, error, calculating`

This is an intentionally exhaustive Cartesian inventory, including unsupported model/mode combinations that are now explicitly classified as **blocked**. The inventory includes `model, key, modifier, mode, screen, legend, status, reason` for every row.

## Manufacturer reference material

- [Original fx-991ES user guide](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ES_991ES_EN.pdf)
- [fx-991ES PLUS user guide](https://support.casio.com/storage/en/manual/pdf/EN/004/fx-570_991ES_PLUS_EN.pdf)
- [fx-991ES PLUS C online guide](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/)

The web calculator reproduces selected documented physical functions. The 50-key geometry and SHIFT/ALPHA labels come from the project's independently drawn reference-derived keypad, **not a certified manufacturer key-scan map or verified firmware image**.

## How to export the complete audit

1. In the web calculator's **Verification** panel, select **Export 50-key SHIFT/ALPHA audit (JSON)**. The browser downloads a machine-readable JSON object containing all 34,650 row combinations.
2. From the repository root, execute:

```sh
node calculator/reference/rea-081/generate_inventory.cjs
```

This creates `calculator/reference/rea-081/rea081-inventory.json`. The CI workflow also uploads the generated JSON as the **`rea081-modifier-key-inventory`** artifact for each successful run. The generated multi-megabyte JSON file is not committed as a static source copy; the module and deterministic generator are committed.

### Classification states

| Status | Meaning |
| --- | --- |
| `available` | The web calculator intends a supported normal/SHIFT/ALPHA action in this context |
| `blocked` | A specific combination is unavailable, including unsupported model modes; clicking a marked modifier combination produces an explanation without falling through to the base key |
| `unlabelled` | The model has no printed SHIFT/ALPHA legend for that key |
| `unlabelled-control` | Independent web convenience, such as SHIFT + directional viewport scrolling, rather than an advertised native printed legend |
| `delegated` | A dedicated advanced-mode/menu/form handler owns this key; this is **not** proof that the scientific legend is active in that context |

The status is recalculated on every calculator repaint, following changes to model, mode, screen, SHIFT and ALPHA state. The inactive legend is visually dimmed; the physical button remains clickable for explanatory feedback, is keyboard-focusable, and exposes its availability reason via `aria-description`.

## Specific corrections and checks

- **CMPLX `ALPHA + ENG`** now inserts the colon statement separator. **Normal `ENG`** remains imaginary unit `i`. The prior implementation returned `i` for both in CMPLX.
- Original `fx-991es`: printed `ALPHA + COS/TAN` E/F registers, `ALPHA + SQRT` recurring decimal, `ALPHA + ANS` PreAns, and `SHIFT + 6` VERIFY are not exposed where that model has no such legend.
- PLUS and PLUS C: E/F registers available in appropriate input context; PLUS C enables VERIFY, Rdec, and additional marked functions.
- **SHIFT + CALC**, **SHIFT + ∫**, and **SHIFT + log□** are COMP-only; unavailable contexts do not silently launch SOLVE or calculus.
- **SHIFT + S⇔D**, **SHIFT + DMS** and **SHIFT + ENG** are result-only operations. SHIFT + viewport arrows are a web convenience while editing or viewing a result, not a universally available menu shortcut.
- An invalid model/mode combination is blocked at inventory construction, rather than falsely classified as active based on a key label alone.
- Error screens, numerical-worker calculation screens, and advanced mode-owned screens have explicit classification. The inventory does not misrepresent dedicated handlers as scientific shortcuts.

## Tests and execution status

From the repository root:

```sh
node calculator/tests/rea081-legend-audit.cjs
node calculator/reference/rea-081/generate_inventory.cjs
python calculator/reference/rea-081/test_legends_browser.py
```

**Executed in the JavaScript source harness:** 26 deterministic checks passed over a complete inventory of 34,650 rows. Checks include uniqueness, complete dimensions, statuses/reasons, unsupported model/modes, missing labels, COMP/CMPLX modifiers, result-only functions, original vs PLUS vs PLUS C behaviors, accessible availability hints, no disabled physical button, and the CMPLX `ALPHA + ENG` correction.

**Committed, not executed in the current connector session:** browser Playwright Chromium key/DOM test and `.github/workflows/rea081-legend-audit.yml` CI pipeline. The browser test checks all three models, active labels, unavailable modifier feedback, mode/result changes, CMPLX colon vs imaginary unit and the exported matrix size.

## Acceptance still pending

1. Execute CI and inspect actual Chromium tests, browser focus, tooltip/aria-description behavior, and printed modifier availability across viewport sizes.
2. Compare all printed legends and mode-specific key behavior against an original fx-991ES, PLUS and PLUS C (or licensed emulator) with real key/display traces. The policy is source-grounded, not verified native parity.
3. Audit each dedicated advanced-mode handler (**STAT, BASE-N, EQN, MATRIX, VECTOR, TABLE, INEQ, VERIF, DIST**) at the actual screen/subscreen level. The finite set of seven screen categories records `delegated` instead of falsely certifying every handler.
4. Reconcile disagreements with official manual tables, especially model-specific shifted constants, register labels and mode setup. The UI itself remains a web approximation.
5. Full standalone single-file sync remains tracked separately by REA-100.

**REA-082 was not started.**
