# fx-991ES PLUS (2nd edition) — Verification Scope

The single supported device is the **CASIO fx-991ES PLUS (2nd edition)**. Reference: https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/

## Evidence levels

- **Source checked:** Parser, engine, state logic, model support and keypad definitions were reviewed or unit tested.
- **Browser checked:** An actual Chromium test pressed the user-visible keypad on both modular and standalone publications, with state and output assertions.
- **Hardware verified:** A real PLUS key-log and native LCD observation were compared to the same web case, and reviewed independently.

No hardware parity certification is currently claimed. A source test is not evidence of native physical behavior.

## Mandatory release gates

1. The application and capability manifest expose exactly one model.
2. All eight MODE options and four EQN types have browser key-sequence tests.
3. All 50 physical buttons have normal, SHIFT and ALPHA classification coverage.
4. Numerically sensitive modes have reference-value and error-class tests.
5. Standalone build equals its current modular sources byte-for-byte.
6. All CI jobs must pass before claiming the release is verified.

See [PLUS implementation backlog](FX991ES_PLUS_IMPLEMENTATION_BACKLOG.md).
