# REA-096 — Original fx-991ES memory, reset and replay persistence

Issue: https://github.com/philiparad/philiparad.github.io/issues/50

## Source reference
Original manufacturer's fx-115ES/fx-991ES User's Guide:
https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ES_991ES_EN.pdf

- E-10: CLR → 1 Setup initializes **calculation mode COMP** and setup settings; CLR → 2 Memory clears Ans, M and named variables; CLR → 3 All clears all state.
- E-24: Calculation history is supported in COMP, CMPLX and BASE-N. It is cleared by OFF/ON, mode changes, input/output format changes, or any reset.
- E-25: Ans survives AC/mode/OFF and is not changed by an error; when exiting CMPLX, the imaginary part of Ans is lost.
- E-26–27: independent memory M and named variables survive AC, modes and power cycles. LCD M indicator is present when independent M is nonzero.

## Implemented
### calculator/js/app.js
1. `clearSetup()` restores COMP and default angle/setup while preserving Ans, independent M and variable registers. Previously the current mode was not reset.
2. `setMode()` clears calculation history and replay; previously old calculation history was only filtered by mode and could reappear when switching back.
3. Leaving CMPLX transfers the real component of complex Ans into ordinary Ans and discards the imaginary component.
4. Changing MathIO/LineIO clears calculation history and replay, while preserving memories.
5. The history navigation eligibility check now includes the three original manual-supported modes (COMP, CMPLX, BASE-N).
6. Existing `powerOff()` / `powerOn()` preserve Ans, named memory, mode and setup while clearing history; these paths are now covered by tests.

### calculator/js/lcd-indicators.js
Replay arrows in the calculation display now appear only in history-compatible modes. Menu and other pagination indicators continue to operate independently.

## Reproducible source-level test
```bash
node calculator/tests/rea096-memory-replay.cjs
```

**43 isolated JavaScript checks passed** against the retrieved modified controller and LCD indicator sources. Controller lifecycle functions were actually executed in a mocked browser-state environment; this is more than a text-only assertion, but it is **not** a full browser DOM or hardware trace.

Cases are exercised for `fx-991es`, `fx-991es-plus`, and `fx-991es-plus-c`, including:
- Mode changes that preserve M/Ans but clear history.
- Complex Ans real-part retention and imaginary-part discard.
- CLR Setup resetting COMP while preserving memory.
- CLR All clearing Ans and variable registers.
- OFF/ON persistence and history invalidation.
- MathIO/LineIO history clearing.
- LCD M, STO/RCL, shift, power and history indicators.
- Source checks for M+/M−, STO/RCL, pending-memory cancellation, replay-mode gate and error-path nonmutation.

## Remaining before closing
1. Execute the committed test file directly with Node.js from a checked-out repository.
2. End-to-end key-driven browser flows: M+, SHIFT M−, SHIFT RCL/STO, RCL, AC cancellation, mode changes, CLR 1/2/3 with Yes/Cancel, OFF and ON.
3. Compare history and replay LCD pages, M indicator, Ans after complex calculations, and reset effects to an original physical fx-991ES.
4. Verify power/memory retention and any model-specific differences on PLUS and PLUS C hardware separately.
5. In particular, BASE-N history is now eligible for replay, but full BASE-N browser history-generation behavior remains to be verified.

This report does **not** certify physical hardware parity. Keep issue #50 open until those checks are complete. REA-097 was not started.
