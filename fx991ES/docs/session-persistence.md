# Milestone 29 — Session v2 and interrupted workflow restoration

The browser-only calculator exports/imports version 2 JSON sessions. Supported data include exact typed scalar values, Ans, angle/display setup, registers MatA/MatB/MatC and VctA/VctB/VctC, statistical rows, expression/history, nested mathematical document nodes and the semantic caret anchor.

**Version 1 compatibility:** older M28 session files continue to import. Because v1 lacked document structure, v1 restores expressions as source tokens in safe editing mode.

**Validated workflow recovery:** v2 can resume mode-specific register-menu/editor/summary/operation screens, STAT grid editing, and configured coefficient/function wizards for EQN, MATRIX, VECTOR, STAT and TABLE. Missing or invalid transient source workflows export as null and reload to ordinary edit mode. Importing an invalid **stored** workflow fails validation rather than silently accepting attacker-controlled input.

**Validation:** Every document node is checked against a strict allowlist, bounded by 620 nodes and nesting depth 20, with unique safe IDs, valid Sequence slots, a valid sequence-offset caret, and exact matching serialized source text. Numeric register dimensions and buffer sizes are checked. Wizard field definitions are reconstructed from a fixed catalog and checked against model restrictions; imported strings are never evaluated as JavaScript. Node IDs advance after restoration to prevent new edits from colliding with imported IDs.

**Privacy:** Automatic recovery uses `localStorage` only when explicitly enabled and can be cleared or disabled; local JSON is neither encrypted nor synchronized. Browser private mode, storage quotas or blocked storage may prevent recovery.

**Limits:** Cached calculation results, computed numerical transient objects, error screens, SHIFT/ALPHA, precise LCD scroll offsets, and non-catalog custom flows are not restored; import does not execute formulas. Physical CASIO memory and keyboard parity have not been validated.
