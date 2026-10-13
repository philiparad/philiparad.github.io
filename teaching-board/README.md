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

A board/backup is limited to 25 MB. Images: 15 MB input, resized to at most 2,200 pixels. PDFs: 30 MB input and up to 30 selected pages per import, subject to the board size limit. Equations and graphs keep their editable source plus raster previews; they remain visible when reopened without loading their libraries. MathJax, JSXGraph and PDF.js load from pinned jsDelivr URLs when needed, so creating/editing those objects requires internet access. No lesson content is sent to those libraries' servers.

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

### Text alignment
Select text or sticky notes, then open **Ink & style → Text alignment** to choose Auto, Left, Center or Right. Auto follows the text direction (including Hebrew). The setting also applies to new text and notes. Locked objects are preserved; alignment supports undo, editable backups and image/PDF export through the shared SVG renderer.

### Text emphasis
Select text or sticky notes and open **Ink & style → Text style** for Regular, Bold, Italic or Bold italic. Formatting applies to the whole text object and becomes the default for new text and notes. It is preserved in inline editing, undo/redo, copies, snippets, backups and exports. Locked objects remain unchanged.

### Individual graph curve styles
Each curve in the graph editor has **Line pattern** (Solid, Dotted, Dashed, Long dashed) and **Line thickness** (1–8 px presets). Styles work with ordinary, parametric and polar curves, including parameter playback. Styled curves have matching line samples in the graph legend. Inserted graphs keep these settings when edited, copied, saved as snippets or backed up. Existing graphs default to solid, 3 px lines.

### Selective PDF import
Choose **PDF pages**, select a file, then enter page numbers or ranges (for example **1, 3-5**). Up to 30 unique pages are imported in document order; repeated page numbers are ignored. PDFs with more than 30 pages are supported by selecting a subset. Cancel leaves the lesson unchanged. Imported pages remain locked for annotation, and the entire import is one undoable change.

### PDF page previews
The PDF import dialog shows six page thumbnails at a time. Use **Previous previews / Next previews**, tick the pages you need, or edit the page-range field; both selection methods stay synchronized. **Clear selection** starts an empty selection. Previews are generated only for the displayed group. Cancel leaves the lesson unchanged.

### PDF import layouts
In **Choose PDF pages**, use **Page layout** to choose a Vertical stack, Horizontal row or Two-column grid. Pages keep document order and their aspect ratios. Spacing accounts for mixed page sizes. The new pages start at the current view center; existing objects are preserved. The complete import remains a single undoable change.

### A4 page navigation
Switch **Canvas layout** to **A4 pages**, then use the **Go to A4 page** selector to jump directly to any page. The page indicator follows the page at the center of the view while panning and after reopening a lesson. Page options update after adding, deleting, undoing or redoing pages. Navigation changes the view without adding an undo step.

### PDF pages as an A4 document
Choose **PDF pages → Page layout → A4 document pages**. Each selected PDF page is proportionally fitted and centered inside a portrait A4 sheet with a 24-pixel margin, then locked for annotation. A new or single empty A4 lesson uses its first sheet; existing A4 documents append after their last page. The view jumps to the first imported sheet. A nonempty infinite canvas must first be explicitly switched to A4. Imports respect the 100-sheet limit and can be undone/redone as one change, including the layout and page count. **Export → Print / Save as PDF** uses the existing one-sheet-per-page A4 print layout.

### Export selected objects or a canvas region
Choose **Export → SVG image / PNG image / Print / Save as PDF**, then choose **Export area**: Entire lesson, Selected objects, Current canvas view, or Custom rectangle. Select objects before opening export; locked selections are included. View export follows the current pan and zoom. A custom rectangle uses canvas coordinates (left, top, width, height) initialized from the current view; it clips objects at its edges. Selection export includes only selected objects with a small margin. Cancel does not change the lesson. Editable backups always contain the complete lesson; whole A4 PDF export still prints one sheet per page.

### Transparent PNG export
Choose **Export → PNG image → PNG background → Transparent**. This removes the canvas paper (including grids, dots and ruling) for the entire lesson, selected objects, current view or custom rectangle. The downloaded PNG retains object opacity and transparent space around drawings. Object fills and backgrounds embedded in imported images/PDF pages remain. **Board paper** is the default; SVG, PDF and editable backups retain their existing behavior.

### Export padding and PNG resolution
The export dialog offers **Padding (canvas units)** from 0 to 1,000 for whole-lesson and selected-object images, and single-page PDF exports. Current-view/custom-rectangle exports keep their exact crop; whole A4 PDFs keep their page layout. For PNG, select **PNG resolution → 1× / 2× / 3× / 4×** and see the resulting pixel dimensions before exporting. Large images are proportionally reduced to stay within 8,000 pixels per side and 24 megapixels. Defaults remain 30 units of padding and 2× PNG resolution. Transparent PNG export supports these controls.

### Export selected A4 pages
In an A4 lesson choose **Export → Print / Save as PDF → Export area → Selected A4 pages**. Enter page numbers and increasing ranges such as **1, 3-5**. Duplicates are removed and pages print in document order, one portrait A4 sheet per selected page. The dialog shows the selected count and rejects empty or out-of-range selections. **Entire lesson** still prints every A4 page. Selection affects only the export; the lesson and undo history are unchanged.

### Recovery snapshots
Open **Selection tools and lesson timer → Recovery** to **Create snapshot** or view this lesson's **Recovery snapshots**. The dashboard also has **Recovery snapshots** for all lessons, including lessons in Trash. Snapshots capture the complete editable lesson (images, graphs, A4 pages and viewport). Automatic snapshots are considered on opening a nonempty lesson and after successful saves, at most once every five minutes when content changes; there is no background timer when idle. Up to five recent versions are retained per lesson, within 50 MB, with oldest versions replaced as newer snapshots are saved. Manual snapshots can be created at any time. **Restore as new lesson** preserves the original and creates a separate recovered copy. Snapshot storage is independent of normal saves; a snapshot failure does not roll back a saved lesson. Snapshots stay in this browser on this device and are lost when site data is cleared. Continue using editable backups for durable or cross-device copies.

Graph examples: open Function graph, expand Graph examples, choose a starter and click Load example. The example replaces the dialog's curves, shared parameters and bounds; edit it before inserting. Cancel preserves an existing graph. Eight starters cover algebra, trigonometry, adjustable parameters, parametric and polar curves.

Function domains: each y = f(x) curve has optional Domain minimum x and Domain maximum x fields. Leave either blank for no bound on that side. These restrict the function independently of the shared axis window; the legend records the restriction. Parametric/polar curves retain their separate t bounds.

Piecewise functions: select Piecewise function as a curve type. Add up to eight branches with separate expressions and x bounds. Branches share the curve color and style and may use shared parameters. Blank bounds are unbounded; gaps are allowed and overlapping intervals are rejected. Each branch includes its lower bound and excludes its upper bound.
