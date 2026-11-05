# Differential testing and provenance — Milestone 17

## Purpose

Reproducibly find differences between recorded expected behavior and the independently implemented calculator. The system does **not** manufacture actual observations.

## Procedure

1. Record a physical-device or official-emulator test in `tests/reference.html`, including model, date, setup, exact key events and transcribed LCD result. Export the corpus.
2. Import that corpus into `tests/differential.html`. Optional `checkpoints` contain step-indexed expectations that were genuinely observed.
3. Compare. The first reported divergence is the earliest **supplied** checkpoint mismatch; if none is supplied, it can only report the final comparison.
4. Export JSON and CSV reports, preserve raw observations separately, and distinguish `manual`, `internal`, `physical`, and `official-emulator` evidence kinds.

## Checkpoint schema

```json
{
  "caseId":"manual-comp-add",
  "model":"standard",
  "events":["2","ADD","3","="],
  "source":{"kind":"manual"},
  "expected":{"result":"5"},
  "checkpoints":[{"step":1,"expected":{"expression":"2"}}]
}
```

`step: 0` is initial state. `step: n` is after the nth key. An automatically generated checkpoint from the emulator is useful only for regression tests and **must not** be mislabeled as a physical observation.

## Determinism and fuzzing

State snapshots include mode, view, expression, result, error, Ans, indicators and a project framebuffer hash. Hashes use canonical serialization and FNV-1a 32-bit and are **diagnostic only**, not secure cryptographic identifiers. Fuzzing is seeded and repeats the same sequences to detect internal nondeterminism or exceptions. Such tests are not a hardware compatibility oracle.

## Security and accessibility

All imported JSON passes bounded schema checks; DOM output is inserted using `textContent` rather than interpolated HTML. The built-in accessibility audit checks some common issues but is not a WCAG certification. Manual audits must inspect keyboard focus, names, roles, contrast, screen reader status, mobile layout, and reduced motion support.