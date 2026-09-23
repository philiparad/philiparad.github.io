# Architecture

The app is vanilla JavaScript ES modules, rendered with DOM APIs and SVG, hosted as static files on GitHub Pages.

| Module | Responsibility |
| --- | --- |
| app.js | Routes, dashboard, folder/search/sort, trash/restore, backup import |
| editor.js | Tool state machine, scene commands, selection, editing, timer, presentation |
| scene.js | SVG rendering, bounds and background patterns |
| model.js | Versioned document validation and self-contained backups |
| storage.js | IndexedDB migration and atomic optimistic revision checks |
| save-queue.js | Serialized/coalesced writes with error retention and retry |
| history.js | Bounded document history, separate from storage revisions |
| viewport.js | World/screen coordinates and anchored zoom |
| expression.js | Restricted mathematical grammar; no eval |
| media.js | On-demand libraries, math previews, image/PDF rasterization |
| export.js | Backup, SVG, PNG, A4 print/PDF output |
| ui.js | Accessible dialogs, controls, downloads and messages |

Document schema remains version 1, preserving Stage 1 boards. Item geometry is local to each item; the SVG group applies world translation and rotation. Media payloads are embedded raster data URLs, allowing portable backups without remote references. Equations/graphs also retain source and graph bounds for editing. Unsafe imported URLs/colors/types are rejected. DOM text uses textContent; imported HTML/SVG markup is not injected.

The asset object store from Stage 1 remains available for future larger-file storage, but current media is embedded to ensure complete portable backups. Any future storage format must include migrations and an asset-inclusive backup contract.

Saves compare revisions atomically inside an IndexedDB read/write transaction. Another tab's stale revision fails visibly. The pending snapshot remains available for retry or backup. Reopen a lesson to resolve a conflict; export a backup first if keeping the unsaved changes. Undo history contains only scene content and background, not storage revisions.

Authentication and shared cloud storage are separate future services. They cannot be implemented privately using GitHub Pages alone; no secrets or access tokens belong in this repository.
