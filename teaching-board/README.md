# Philip's Teaching Board

Personal teaching application inspired by the iDroo workflow. This is **Stage 1: infrastructure**, not the finished whiteboard.

## Open

GitHub Pages path: `https://philiparad.github.io/teaching-board/`

The application is plain HTML, CSS and JavaScript modules. There is no React, Node.js application, build step, package installation, server, API key or account requirement. It coexists with the repository's existing homepage and teaching resources.

To run locally, serve the repository directory using any static HTTP server, for example `python3 -m http.server 8080`, then open `/teaching-board/`. JavaScript modules need HTTP/HTTPS, not `file://`.

## Available in Stage 1

- Responsive dashboard and hash-based board navigation, including reloadable URLs.
- Create, rename, search and reopen lessons, including Hebrew titles.
- IndexedDB board and binary asset repositories with versioned schema.
- Atomic revision checks to reject stale writes from another tab.
- Serialized saves with visible errors and retained pending changes.
- Board JSON backup and non-destructive import as a new lesson.
- Canvas shell with pan, anchored zoom, reset and persisted viewport.
- Undo/redo document module for Stage 2 editor commands.
- Infrastructure test runner at `tests/`.

## Storage and privacy

GitHub Pages hosts public application code. Board content is saved in IndexedDB in the current browser profile on this origin; it is **not** committed to GitHub or uploaded to a cloud service. There is no cloud synchronization or Google sign-in in this release. Clearing browser/site data can delete lessons. Export JSON backups regularly. Other scripts on the same website origin have the same browser storage privileges.

Stage 1 backup files contain the board document. The binary asset store is infrastructure only; Stage 2 must add asset-inclusive backups before exposing media import. There are no external scripts or remote data requests in Stage 1.

See [architecture](docs/ARCHITECTURE.md) and [Stage 2 delivery checklist](docs/STAGE-2.md).

## Verification

Open `tests/index.html` through HTTP/HTTPS. It tests schema validation, Hebrew backup round trips, history, viewport math, save serialization/retry, IndexedDB persistence, stale-write conflicts and asset storage. The storage tests use a random isolated database and delete it afterward.

Manual acceptance: create a lesson, rename it, pan/zoom, refresh, export a backup, import it, and confirm the original remains present. Open the same lesson in two tabs and verify a stale write is rejected.

## Deployment

This folder uses relative URLs and hash routing, so the repository's existing GitHub Pages deployment can serve it without a rewrite rule or build pipeline. No root deployment configuration is changed. If Pages is disabled, enable deployment from `main` / root in repository Settings → Pages. A committed folder alone does not prove a successful Pages deployment.
