# REA-100 — Deterministic modular/standalone publication

Issue: https://github.com/philiparad/philiparad.github.io/issues/54

## Status

**Source synchronization implemented and committed.** The standalone HTML file was reconstructed from the current canonical markup, stylesheet, capability manifest and **all 46 JavaScript modules** in the exact order declared by `calculator/index.html`.

This is **web-release equivalence**, not proof that the emulator matches physical CASIO fx-991ES, PLUS, or PLUS C hardware.

The GitHub CI workflow and real browser automation have been committed, but their actual GitHub Actions result was not observed in this session. Issue #54 should remain open until CI runs successfully.

## Canonical files

- `calculator/index.html`: canonical markup and ordered script inventory.
- `calculator/styles.css`: canonical styles.
- `calculator/js/*.js`: canonical feature implementations, included in the order declared by index.
- `calculator/reference/rea-008/capabilities.json`: canonical model-specific public capability and verification status.

`calculator/fx991_fresh_standalone.html` is a **generated artifact**, not a second editable source.

## Generator

`calculator/tools/build_standalone.py` uses only Python's standard library to:
1. Read modular HTML, stylesheet, scripts and the capability manifest.
2. Replace the stylesheet link with one inline style block.
3. Inline all JavaScript modules with `data-source` labels in canonical load order.
4. Embed the canonical capability manifest before the capability UI script.
5. Preserve the rest of the HTML markup exactly.
6. Reject missing/unexpected modules and unsafe script/style closing sequences.
7. Create deterministic UTF-8 output, without timestamps, build IDs or random differences.
8. Fail `--check` when committed standalone bytes differ from regenerated output.

From repository root:

```bash
python3 calculator/tools/build_standalone.py --write
python3 calculator/tools/build_standalone.py --check
python3 -m unittest discover -v -s calculator/tests -p 'test_rea100_standalone.py'
```

## Validation performed

Source comparison through the GitHub connector, after final assembly:
- 46/46 JavaScript modules matched their canonical source text **exactly**, including module order and source wrappers.
- Generated HTML markup, after replacing inlined resources with original links, matched `index.html` exactly.
- Embedded CSS matched `styles.css`.
- Embedded capability JSON matched the canonical manifest.
- No partial build placeholders remained.
- 46 inlined scripts and one inlined stylesheet were present.

These checks were performed directly against the committed files. They were **not** physical calculator tests.

## Committed automated tests

1. `calculator/tests/test_rea100_standalone.py`: byte-exact generator output comparison, all module source matching, stylesheet matching, embedded manifest equality and no external script references.
2. `calculator/tests/rea100_browser_parity.py`: Playwright keyboard clicks for three calculator models, comparing modular and standalone calculation results, mode lists and visible public-capability counts, while failing on browser JavaScript errors.
3. `.github/workflows/rea100-standalone-sync.yml`: runs generator `--check`, Python unit tests and Playwright Chromium checks on changes to publishing inputs.

The tests and workflow are committed; **do not report the Python/Playwright checks as passed until GitHub Actions has actually executed successfully**.

## Known limits and follow-up

- Hardware parity continues to require REA-099's independently reviewed native capture corpus; no physical reference captures were gathered.
- The web source modules are identical, but any environmental differences between `file://`, HTTP and embedded scripts must be checked by Chromium automation and manual open-file inspection.
- The fast decimal evaluator still has an independent implicit-multiplication precedence discrepancy from REA-097 (e.g. `8/2(2+2)` may take its own precedence path). The REA-100 browser smoke tests intentionally use an explicit `MUL` key in that scenario. That parser gap should be tracked separately rather than misreported as release drift.
- This project intentionally uses plain HTML/CSS/JavaScript in browsers, with Python only for offline generation/CI, not React or Node.js.

REA-101 was not started.
