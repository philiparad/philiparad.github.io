# Milestone 16 — Reference characterization protocol

This project independently reimplements documented calculator behavior. **No physical-device or official-emulator observations are bundled.** The six starter examples in `FX991_REFERENCE.SEEDED` are research/manual-based expectations, not verified reference measurements.

## Collect a reproducible observation

1. Choose one actual physical device or legitimate installed official emulator. Record **model/edition**, observation date, and original setup, including angle and number format.
2. Set that device to the stated initial conditions and enter a **precise physical key sequence**. Translate it to the simulator's documented **semantic key identifiers**. Do not assume that alternative mappings reproduce the handheld.
3. Transcribe the observed result, error message, mode, and screen state. If uncertain, leave a field absent, rather than guessing.
4. In `tests/reference.html`, select **Manual observation recorder**, identify the actual device, enter the key sequence and observed output, and add the case.
5. **Export corpus JSON**. The page does not persist observations automatically or send them to a server.
6. Run the comparison. Any mismatch is a development issue; passing means equality to those specific transcribed fields only.

## Distinct evidence classes

- `internal`: source-code-derived expectations for deterministic implementation tests; does not verify physical compatibility.
- `manual`: interpretations/examples from publicly available documentation; must be reviewed for correct edition and notation.
- `physical`: dated, identifiable firsthand physical-device observation; source identity and date required.
- `official-emulator`: dated observation of a legitimately obtained emulator; source identity and date required.

The tester counts manual/internal tests separately from actually observed physical/emulator cases. No gold-standard compatibility rating is inferred from an empty observed corpus.

## Corpus format

```json
{
  "schema": "fx991-reference-v1",
  "cases": [
    {
      "caseId": "physical-example-001",
      "model": "standard",
      "setup": {"angle": "DEG", "format": "Norm2", "digits": 3},
      "events": ["2", "ADD", "3", "="],
      "source": {
        "kind": "physical",
        "device": "replace with actual edition/serial-less identifier",
        "observedAt": "2026-11-05",
        "notes": "Manual transcription; replace before using as evidence"
      },
      "expected": {"mode": "COMP", "view": "result", "result": "5"}
    }
  ]
}
```

The above is a schema illustration only, **not** an actual recorded observation.

Expected fields: `mode`, `view`, `expression`, `result`, `error`, `frameHash`, `indicators`, `ans`. Only fields present in a case are compared; order is meaningful for indicators. `frameHash` is the simulator's independently authored framebuffer hash and **cannot** be compared to a physical CASIO LCD bitmap as proof of identical graphics.

## Interpretation and limits

- Incomplete traces, missing device settings, and incorrect mapping of physical keys to semantic events can produce spurious results.
- The input state is initialized using the model descriptor, with optional setup applied programmatically. Setup UI key-press fidelity must be tested separately.
- Recorded observations are human-entered and not independently authenticated.
- Numerical comparisons are currently strict string comparisons. No hidden tolerance is assumed; approximate reference values should record visible digits precisely.
- Do not copy firmware, font ROMs, proprietary screenshots/assets, activation mechanisms, or emulator code. Only document externally observable behavior.
- Expand coverage by collecting normal, edge and error cases in both standard and C editions, and include mode menu, editor, replay, memory and formatting workflows.

### Future acceptance gate

Full compatibility requires a substantial independently observed corpus for every supported mode, numerical rounding and error-workflow checks, semantic display comparisons, cross-browser tests, and manual physical keypad validation. **The Milestone 16 harness alone does not satisfy this gate.**
