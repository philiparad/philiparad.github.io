# REA-089 — CMPLX results, memory and natural-display parity

## Status
**Implementation improvement and source regression suite committed.**
Physical fx-991ES / PLUS / PLUS C parity is not certified; no hardware capture or browser DOM trace was performed.

### Scope and reference
Issue https://github.com/philiparad/philiparad.github.io/issues/43

Original manual https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ES_991ES_EN.pdf

The application supports complex arithmetic, polar entry using `∠`, suffix commands `►r∠θ` and `►a+bi`, `arg`, `conj`/`Conjg`, `abs`, complex `Ans`, registers, and LineIO parts.

### Confirmed defect corrected
The previous complex-division implementation used the denominator `b.re + b.im*(b.im/b.re)` (or symmetric imaginary version). For valid large complex numbers, this intermediate can overflow to Infinity, producing an incorrect zero even when the mathematical quotient is finite.

For example:
```
(9e99+9e99i)/(9e99+9e99i) = 1
(9e99-9e99i)/(9e99+9e99i) = -i
```

The revised method divides both numerator components by the dominant divisor component **before** computing the bounded denominator `1+t*t`. The independent complex engine uses no proprietary firmware.

### Source-level regression coverage
`node calculator/tests/rea089-complex-parity.cjs`

**77 tests passed in an isolated JavaScript source harness**, including:
- Basic arithmetic, complex integer powers, conjugate, magnitude, argument, real/imaginary extraction and square roots.
- Very large and very small complex division operands.
- Degree, radian and gradian angle input/output and principal-angle normalization.
- Explicit ► polar/rectangular output suffix parsing and placement validation.
- Complex `Ans`, stored variables and real-register fallback, with original-model E/F restrictions.
- Formatting pure real, imaginary, mixed rectangular and polar values.
- Division by zero, `arg(0)`, invalid polar radius/angle, incomplete expressions and invalid suffixes.
- Static integration checks of SHIFT+2 CMPLX menu, `ENG` i insertion, polar-angle key, storage/recall and M+/M− routes.
- Static LCD two-line LineIO rendering checks and script load ordering.

### Verification pending
1. Run the suite using Node.js in a local checkout or CI job.
2. Use a real browser to trace SHIFT+2 → output command → =, and confirm two-line LCD and menu cancellation.
3. Test STO, RCL, M+, M−, Ans and mode transitions through a key-driven browser DOM trace.
4. Compare outputs/error recovery and menu ordering with original, PLUS and PLUS C hardware/manual captures. Code-level checks alone are **not** physical hardware evidence.
5. Check memory persistence and exact display line ordering against original hardware before closing the GitHub issue.

### Changes
- `calculator/js/complex-engine.js`: overflow-safe complex division.
- `calculator/tests/rea089-complex-parity.cjs`: 77 source-level regression assertions.
- `calculator/docs/rea089-complex-parity.md`: verification report.

Stop at REA-089; REA-090 is not started.
