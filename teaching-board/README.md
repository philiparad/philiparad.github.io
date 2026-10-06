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
- Reusable teaching snippets: save selections, search, preview, insert into another lesson, rename, trash/restore and export/import.
- Lesson timer and presentation mode.
- SVG/PNG exports; A4 landscape printing / Save as PDF.
- Self-contained editable JSON backups, including images and imported PDF pages.
- Automatic browser storage, save error/retry status and stale-write protection across tabs.

## Quick start

Create a lesson, choose a tool, and draw on the canvas. Click the lesson title to change its name or folder. Select objects with the pointer tool; Shift-click adds/removes objects. Drag the corner handle to resize. Double-click text, notes, equations or graphs to edit them. PDF pages are locked on import so you can write on top; select a page and use Lock / Unlock to move it.

Polygon: click each vertex, then press Enter. Use `*` for multiplication in graphs: `2*x^2-3`, `sin(x)`, `sqrt(x)`. Trigonometric arguments are radians.

Use Export → Editable backup before clearing browser data, or to transfer a lesson. Import creates a new lesson without replacing the original. Print / Save as PDF fits the full board onto one A4 landscape page; very large boards may print small.

## Reusable snippets

Select objects, open Selection tools, and choose **Save selection as snippet**. Open **Saved snippets** in any lesson to insert a copy at the current view center. Each copy is independent, unlocked, and keeps groups and connections between included objects. Connections to objects outside the selection detach. Insertions support normal undo/redo and become part of lesson backups.

Snippets are stored separately on this device; lesson backups do not contain the saved snippet collection. Use each snippet’s **Export** action and **Import snippet** to move or back up saved snippets. Removing a snippet moves it to recoverable Trash and does not affect copies already inserted into lessons. A snippet supports up to 1,000 objects and 5 MB.

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

### Polar curves
Open **Function graph** and choose **Polar: r(t)**. Enter a radius formula using `t` as the angle in radians, and set the angle minimum and maximum. Negative radii are supported. For example, `2*(1+cos(t))` from 0 to 6.283185307179586 draws a cardioid. Mix polar, parametric and ordinary functions on shared axes (up to eight curves). Select a saved graph and choose **Edit content** to revise its formulas; editable backups and snippets preserve the curve settings.

### Adjustable graph parameters
In the graph editor, choose **+ Add parameter** to define `a`, `b` or `c` with a value and bounds. Use these shared values in any function, parametric or polar formula, for example `a*x^2`. Move the slider or type a value to update the preview. **Insert graph** saves a static graph at that value, with all parameter settings retained for later editing, backups and snippets. Cancel discards changes.

### Parameter animation
Each shared graph parameter has **Play / Pause** controls. Playback previews one parameter at a time, reversing at its bounds. Editing a formula, slider, value or range stops playback; **Insert graph** stops playback and saves the current values. Closing the editor cancels playback. Graphs on the canvas remain static until edited again.
