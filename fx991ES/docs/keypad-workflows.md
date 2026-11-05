# Milestone 25 — Mode-aware key workflows

This stage resolves physical semantic keys by model, modifier, and current mode. `FX991_KEYS.resolve(model, key, modifier, mode)` remains independent of DOM labels.

| Context | Key sequence | Expected behavior |
|---|---|---|
| COMP | SHIFT, SQ | Insert cube power |
| COMP | SHIFT, LOG | Insert ten-power expression |
| COMP | SHIFT, LN | Insert exp function |
| COMP | SHIFT, SIN | Inverse sine structural function |
| BASE-N | LOG | Select BIN |
| BASE-N | RECIP | Select HEX |
| BASE-N | NEG/DMS/HYP/SIN/COS/TAN | Enter hexadecimal A/B/C/D/E/F |
| COMP | RCL_MENU, A | Recall register A |
| COMP | SHIFT, RCL, A | Store current result in register A |

These are independent best-effort behavioral candidates, not measured physical keyboard parity. Existing mode wizards remain partial. No actual-device evidence ships in this package.
