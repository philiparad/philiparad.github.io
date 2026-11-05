# Milestone 28 — Session portability and optional recovery

The calculator now supports manual JSON download/upload of a **version 1** session envelope. It preserves the selected model/mode, angle and display settings, scalar register values and Ans, MatA/MatB/MatC, VctA/VctB/VctC, STAT rows and kind, expression, and up to 50 history entries.

Recovery uses `localStorage` **only after the user enables it**. Disabling clears the saved snapshot. Browser private mode, quotas, or disabled storage can prevent recovery; import/export remain available. Sessions are local to the browser and are not synchronized to GitHub or any server.

Validation rejects malformed JSON, unknown schema revisions, nonfinite numeric entries, inconsistent matrix sizes, invalid rational denominators, oversized data, forbidden property names, unsupported modes and unsupported numeric types. Imported sessions never evaluate imported strings or JavaScript. The UI returns safely to **edit mode**, clearing transient workflows, unsaved editor templates, calculated result caches, and active prompts; no automatic calculation takes place.

**Limitations:** exact nested template document structure is reconstructed from source characters rather than guaranteed pixel-perfect structural editing context. `lastValue` and numerical transient state are not restored. JSON is portable but not encrypted; avoid importing untrusted or confidential files. Local recovery may be cleared by browser privacy controls. This is not a firmware memory-card emulation or a claim of CASIO memory parity.
