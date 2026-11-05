# Milestone 20 — Physical calculator compatibility validation

## Evidence protocol

1. Verify the exact model and edition using its own markings; record version/serial only if appropriate, without disclosing personal or licensing data.
2. Factory reset if appropriate, or document the exact angle, Fix/Sci/Norm, and mode state.
3. Perform a key sequence on the physical device or a legally installed official emulator.
4. Capture *observed* result and error strings. Do not copy a manual example into the observed field.
5. Record source, device, date, setup notes, and semantic key sequence in `tests/device.html`.
6. Compare against the independent simulator. Export JSON for reproducibility and attach a nonproprietary observation summary to a GitHub issue.
7. Triage mismatches: numeric/format, error class, mode/state, editor, or workflow. Test simple cases before complex ones.

## Recommended coverage

- Standard: operator precedence, exact fractions, radicals, trigonometry (Deg/Rad), SOLVE, differentiation, integration, BASE-N signed limits, EQN roots, matrix/vector operations, statistical results, TABLE row limits, memory and replay, errors.
- C edition: additional INEQ, VERIF, DIST and two-function TABLE workflows, plus common standard behaviors.
- Boundary conditions: zero/negative radicands, factorial limits, overflow, rounding near display transitions, a failed SOLVE start, nested editor structures and menu pagination.

## Release status

Zero physical/official-emulator observations are bundled. No compatibility certification can be claimed. Internal regression tests and manual-derived examples cannot substitute for reference measurements. The device-validation lab does not run CASIO firmware, copy LCD glyphs, or bypass emulator activation. No observation is uploaded automatically.