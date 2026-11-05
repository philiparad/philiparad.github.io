# Milestone 21 — COMP compatibility corrections

The COMP parser now supports selected multiplication-by-juxtaposition cases and gives it higher priority than explicitly written multiplication and division, following the research report's stated ES-style policy.

## Reproducible local tests

- `2(3+4) = 14`
- `2pi = 2π`
- `2sqrt(9) = 6`
- `sin(30)cos(60) = 0.25` (DEG)
- `1/2pi = 1/(2π)`
- `1/2(3+4) = 1/14`
- `3Ans` and `2A` multiply memory registers
- `-2^2 = -4` and `(-2)^2 = 4` remain unchanged

16 new regression tests were added (284 total). These test the independent interpreter and report-derived precedence rule; they **do not** represent captured device/emulator results.

## Compatibility gaps

Other implicit multiplication cases, exact device key sequences, physical LCD glyphs, numerical precision boundaries, and error cursor behavior need physical/emulator characterization. No device observation has been invented and release certification remains blocked.
