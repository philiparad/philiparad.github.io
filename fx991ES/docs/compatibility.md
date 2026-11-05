# Milestone 16 — Compatibility matrix

The simulator is an independent educational implementation; none of the following operation subsets is certified against physical hardware.

| Component | Locally implemented | Device verified | Remaining risk |
|---|---|---|---|
| COMP exact arithmetic + partial natural editor | Yes | No | implicit multiplication, exact display semantics |
| SOLVE, derivative, integral, Σ | Educational implementation | No | convergence thresholds, error screens |
| CMPLX / STAT / BASE-N / EQN | Educational subsets | No | UI prompts, edge precision, mode limits |
| MATRIX / VECTOR / TABLE | Educational subsets | No | storage registers, coefficient workflows |
| C edition INEQ / VERIF / DIST | Educational subsets | No | reference numerical parity and physical sequences |
| 96×31 LCD independently drawn glyphs | Yes | No | physical glyph/layout fidelity, vertical overflow |
| Key state controller, SHIFT, SETUP, replay | Partial | No | full menu/context mapping |
| Independent internal test suite | 204/204 local checks | Not applicable | browser E2E still to confirm |
| Reference comparison lab | Yes, seeded manual expectations | **0 physical/emulator references bundled** | real device characterization |

`tests/reference.html` supports importing, editing, comparing, and exporting a manually collected corpus. A green reference comparison is not evidence of universal device equivalence; only the fields provided in each case were checked.
