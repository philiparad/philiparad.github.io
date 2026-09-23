# Philip's Teaching Board

A personal teaching whiteboard built with HTML, CSS and JavaScript. Stage 2 adds the complete local teaching workflow to the Stage 1 foundation.

**Open:** https://philiparad.github.io/teaching-board/

## Features

- Lesson dashboard with names, folders, search, sorting, duplication, trash and restore.
- Infinite SVG workspace with pan, anchored zoom, fit-to-content and five paper styles.
- Pen, highlighter, object eraser, laser pointer, lines, arrows, rectangles, ellipses, triangles and polygons.
- Single/multiple selection, marquee, move, resize, rotation, color, fill, opacity, line width, lock, layers, copy/paste and keyboard nudge.
- Bounded undo/redo for document edits.
- Text and sticky notes, including Hebrew/RTL text.
- Editable LaTeX equations using MathJax.
- Editable function graphs using JSXGraph and a restricted expression parser (no eval).
- PNG/JPEG/WebP/GIF image import; PDF page import with locked page backgrounds.
- Lesson timer and presentation mode.
- SVG/PNG exports; A4 landscape printing / Save as PDF.
- Self-contained editable JSON backups, including images and imported PDF pages.
- Automatic browser storage, save error/retry status and stale-write protection across tabs.

## Quick start

Create a lesson, choose a tool, and draw on the canvas. Click the lesson title to change its name or folder. Select objects with the pointer tool; Shift-click adds/removes objects. Drag the corner handle to resize. Double-click text, notes, equations or graphs to edit them. PDF pages are locked on import so you can write on top; select a page and use Lock / Unlock to move it.

Polygon: click each vertex, then press Enter. Use `*` for multiplication in graphs: `2*x^2-3`, `sin(x)`, `sqrt(x)`. Trigonometric arguments are radians.

Use Export → Editable backup before clearing browser data, or to transfer a lesson. Import creates a new lesson without replacing the original. Print / Save as PDF fits the full board onto one A4 landscape page; very large boards may print small.

## Keyboard

V select; H pan; P pen; E eraser; L line; R rectangle; O ellipse; T text. Space + drag pans. Ctrl/⌘ + wheel zooms. Ctrl/⌘ Z undo; Shift Z or Y redo; A selects all; C/V copies/pastes objects; D duplicates; S downloads a backup. Delete removes unlocked objects. Arrow keys nudge by 1; Shift + arrow by 10. Escape cancels or exits presentation.

## Storage and limits

Boards stay in IndexedDB in the current browser profile. They are not uploaded to GitHub. Clearing site/browser data can delete them. Export backups regularly. As with any same-origin app, other scripts on this website share browser storage privileges.

This is a personal, device-local application. Google login, live multi-user collaboration, video calls and automatic cross-device cloud synchronization are not included. GitHub Pages provides static hosting, not a private database service. This is independently implemented software, not a pixel-identical or service-compatible copy of iDroo.

A board/backup is limited to 25 MB. Images: 15 MB input, resized to at most 2,200 pixels. PDFs: 30 MB and 30 pages, subject to the board size limit. Equations and graphs keep their editable source plus raster previews; they remain visible when reopened without loading their libraries. MathJax, JSXGraph and PDF.js load from pinned jsDelivr URLs when needed, so creating/editing those objects requires internet access. No lesson content is sent to those libraries' servers.

## Development and tests

No application server, package installation or build step. Serve the repository root with any static server, such as `python3 -m http.server 8080`, and open `/teaching-board/`.

`tests/index.html` runs pure logic and isolated IndexedDB tests. See `docs/VALIDATION.md` for release validation and `docs/ARCHITECTURE.md` for module responsibilities.

The folder uses relative URLs and hash routing. It is deployed through the existing repository's GitHub Pages workflow. Existing teaching materials and the homepage are preserved.
