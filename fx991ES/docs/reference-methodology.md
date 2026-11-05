# Reference-corpus methodology

The Research Report calls for a black-box compatibility corpus collected from ordinary operations of legitimately obtained physical calculators and the official emulator. This milestone does **not** pretend that such a corpus exists.

For each device observation, record model and edition, initial setup (angle and formatting), physical key sequence, observed screen text, typed result if known, error state, and confidence. Include independent manual transcription or original classroom observation only; do not extract ROMs or private assets.

Recommended JSON schema:

```json
{
  "caseId": "comp_0001",
  "referenceDevice": "standard-physical",
  "setup": { "angle": "DEG", "format": "Norm2" },
  "events": ["2", "ADD", "3", "="],
  "expect": { "mode": "COMP", "display": "5", "error": null },
  "evidence": "Manual observation, unverified example until measured"
}
```

An observation should never be labeled verified unless performed against the actual selected device/emulator edition. Use separate categories for (1) internal unit tests, (2) official manual expectation, and (3) directly observed physical/emulator behavior.

For acceptance, require all supported mandatory workflows to pass a corresponding reference; unsupported workflows block any full compatibility release claim.
