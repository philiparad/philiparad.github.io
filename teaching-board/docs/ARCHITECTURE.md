# Architecture

## Modules

| Module | Responsibility |
| --- | --- |
| `js/app.js` | DOM application shell, routes, dashboard, canvas shell, UI errors |
| `js/model.js` | Document schema version, factory, validation, JSON backup envelope |
| `js/storage.js` | IndexedDB database migration, boards and assets, atomic revision checks |
| `js/save-queue.js` | One active write, latest pending snapshot, retryable failures |
| `js/history.js` | Bounded document-only undo/redo snapshots |
| `js/viewport.js` | World/screen transforms and zoom anchor math |
| `tests/` | Dependency-free browser test harness |

## Data contract

A board has `schemaVersion`, `id`, `title`, `folder`, `createdAt`, `updatedAt`, `revision`, `deleted`, `viewport`, `background`, and `items`. Each item has a unique `id`, supported `type`, and finite `x`/`y` coordinates. Stage 2 must extend validation with per-tool geometry and payload checks before enabling those tools. Document schema upgrades must preserve existing boards; increment the IndexedDB version only when object stores or indexes change.

Assets are separate Blob records referenced by IDs. They must be embedded in backups or exported as an archive before media tools are released. Backups must never rely on temporary Blob URLs. Do not render imported HTML or arbitrary SVG using innerHTML. Text content uses DOM textContent; future graph evaluation must use a math parser, never eval.

The repository adapter saves in one read/write transaction and compares the supplied revision with the stored revision before writing. Revisions belong to persistence, not the undo stack. Stale writes fail visibly rather than silently replacing another tab's edits.

A future sync adapter must implement equivalent get/list/save and asset operations. GitHub Pages cannot execute a private database API. Google OAuth and any cross-device storage need a separately configured service and access policy. Client code must contain no credentials or private keys.

## Stage boundary

Stage 1 intentionally renders only the canvas grid and navigation controls. It reserves document types for Stage 2, but does not pretend to render imported drawing objects yet. Complete rendering, object editing, accessibility and end-to-end teaching workflows belong to Stage 2.
