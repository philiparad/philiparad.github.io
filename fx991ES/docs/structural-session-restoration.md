# Milestone 29 — Development and regression coverage

- Session schema upgraded to v2 with legacy v1 import support.
- Natural editor tree/caret round-trip and structural editing after restore.
- Strict schema validation, duplicate node IDs, missing caret anchors and malformed trees rejected.
- Node ID counter reseeded after importing a document to avoid collisions.
- Supported in-progress matrix/vector, STAT and coefficient wizard input buffers resume without calculating.
- Register COPY and CLRREG commands on register-summary screens; results are cloned, not shared references.
- Local regression tests include existing M1–M28 behavior.

Internal tests do not establish physical fx-991ES PLUS/C parity.
