# Stage 2 — complete the personal teaching application

Start only after Stage 1 infrastructure is committed to the target repository. Keep Stage 2 changes in a separate commit series.

## Drawing and editing

- [ ] SVG scene renderer with document hydration and safe typed item validation.
- [ ] Pointer/stylus freehand pen, highlighter, eraser and laser pointer.
- [ ] Line, arrow, rectangle, ellipse, triangle and polygon tools.
- [ ] Select, marquee, move, resize, rotate, duplicate, delete and layer order.
- [ ] Per-object color, fill, opacity and line width; locked objects.
- [ ] Connect bounded undo/redo to document commands and shortcuts.
- [ ] Text and sticky notes with Hebrew/RTL support.

## Teaching tools

- [ ] MathJax equation editor, presets and editable saved source.
- [ ] JSXGraph function plots with safe expression parsing and editable source.
- [ ] Images and PDF page import, with size limits and recoverable failures.
- [ ] Grid, dots, ruled, plain and dark backgrounds.
- [ ] Presentation mode and lesson timer.

## Board management and export

- [ ] Folders, sorting, duplication, trash and restore.
- [ ] Asset-inclusive editable backups and validated import.
- [ ] SVG/PNG exports and PDF export or verified print-to-PDF workflow.
- [ ] Explicit saved/error/retry states for every modifying command.

## Acceptance gates

- [ ] Create a lesson, draw, undo/redo, reload and reopen without data loss.
- [ ] Validate math/graphs, Hebrew text, image/PDF import, export and reimport.
- [ ] Conflict handling across two tabs; quota/storage failures retain work.
- [ ] Keyboard, touch and narrow-screen checks.
- [ ] Verify deployed Pages URL and refresh/navigation behavior.
- [ ] Document supported features and remaining differences from iDroo honestly.

This is a personal teaching application. Live multi-user collaboration, conferencing, Google authentication and cross-device synchronization require additional service infrastructure and are not implemented by GitHub Pages itself.
