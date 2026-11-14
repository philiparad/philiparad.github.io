# Release validation

- All JavaScript modules passed syntax checks.
- 18 core tests passed: schema checks, Hebrew backup round trip, unsafe input rejection, embedded media round trip, undo/redo, viewport transforms, anchored zoom, queued saves/retries, graph parsing and rotated bounds.
- Browser test runner also exercises IndexedDB reopen, stale-write rejection and asset storage in an isolated database.
- Interactive release verification is recorded after testing the deployed site. The local preview host was inaccessible to the cloud browser in this session.

## Current automated regression coverage (November 14, 2026)

The original 18-test release-validation notes above are historical. The current
[Teaching Board CI workflow](https://github.com/philiparad/philiparad.github.io/actions/workflows/teaching-board-tests.yml)
runs the Node 22 syntax checks and **277 Node tests**, plus real Chromium,
Firefox, and WebKit browser smoke tests covering rich-text editing,
selection/undo/redo, IME-related input, A4 continuation, IndexedDB reload,
and JSON/SVG export.

A separate browser visual-parity check compares the **board render-cache SVG**
with the **independent SVG export** pixel by pixel for three fixtures per
engine, including bidirectional text, an inline equation, rotated sticky
notes, long Unicode words, and emoji. It also confirms that a deliberate
missing-text regression is detected. The HTML editor has a distinct
layout-height and direction check.

Verified reference run: [GitHub Actions 43559719415](https://github.com/philiparad/philiparad.github.io/actions/runs/43559719415):
all four jobs passed; 263 Node tests passed; nine visual comparisons had
zero differing pixels.

**Golden-pixel regression:** The suite now also enforces nine separately committed
SHA-256 hashes of 720×470 RGBA pixel buffers—three fixtures per browser
engine—in `browser-tests/visual-goldens.json`. The references were captured
from [CI run 43564090574](https://github.com/philiparad/philiparad.github.io/actions/runs/43564090574),
then independently enforced by [CI run 43564213632](https://github.com/philiparad/philiparad.github.io/actions/runs/43564213632)
(all four jobs successful). These checks detect visual changes even if board and
SVG export paths change identically. The review/update workflow is described
in [VISUAL_GOLDENS.md](VISUAL_GOLDENS.md). This stores immutable hash references,
not complete PNG screenshots, and does not establish exact HTML/SVG/PDF glyph-level equivalence.
A separate **Chromium A4 PDF print regression** uses Teaching Board's own
`preparePrintPagesDocument` implementation, Chromium's PDF printer, and
Poppler's independent `pdfinfo` and `pdftoppm` tools. It checks exact page
count, A4 orientation/dimensions, text and graphics presence, no cross-page
bleed, and that printing only page two excludes page one's objects. The
two-page and selected-page tests passed in [GitHub Actions 43560506880](https://github.com/philiparad/philiparad.github.io/actions/runs/43560506880),
alongside all 263 Node tests and three-browser smoke and SVG parity checks.

**Inspectable visual review (current):** Each browser engine now exports three
cached/editor PNGs, three independent SVG-export PNGs, three difference maps,
an offline HTML contact gallery and a JSON hash report. GitHub Actions publishes
a separate `teaching-board-visual-<engine>` ZIP archive for each engine, with a
14-day retention period. The images are dimension-validated before upload;
these short-lived artifacts correspond to the permanently committed visual
hashes but are not themselves checked-in golden PNG files.

[CI run 43565067755](https://github.com/philiparad/philiparad.github.io/actions/runs/43565067755)
passed all four jobs (**269/269 Node tests**, all three real-browser checks and
visual hash comparisons) and published all three inspectable PNG archives.

Full native OS IME testing, permanent committed PNG golden snapshots, exact
PDF-to-SVG glyph-level pixel equality, and wider device coverage remain open.

## Text editor draft recovery verification (November 14, 2026)

Existing text boxes and sticky notes now save their **changed, validated**
rich-text drafts locally under a lesson- and object-scoped key. Reopening the
same object in the same browser profile explicitly offers **Recover saved
draft** or **Discard saved draft**. Invalid intermediate equation markup and
other parse failures retain the latest valid structured snapshot plus a
separately viewable raw-text fallback, without persisting any editor HTML.
A failed save keeps the editor open. Cancel or a successful save clears the
recovery entry; an entry older than 30 days is discarded and purged when read.
Storage access errors must not interrupt editing.

The unit suite covers document metadata validation, mismatched records, quota
and storage errors, expiry/purge, malformed equation recovery, and last-valid
history restoration. The three real-browser suites cover formatted recovery
after reload, malformed equation save repair, and raw invalid draft recovery
after reload without overwriting saved lesson content.

**Verified:** [GitHub Actions 43567045605](https://github.com/philiparad/philiparad.github.io/actions/runs/43567045605)
passed **274/274 Node tests** and the Chromium, Firefox, and WebKit browser
jobs (all four jobs green).

**Additional new-object recovery (November 14, 2026):** Uncommitted new
text boxes and sticky notes now keep their plain, validated rich-text content
and safe geometry/style metadata in lesson- and item-scoped local draft records.
After a reload, the editor toolbar explicitly offers **Recover unsaved text**,
showing a per-object preview and individual review/discard actions. A recovery
opens the editable text overlay; it does not insert an object automatically.
Recovery is schema-validated, excludes object IDs already in the board, and
retains each new draft until the asynchronous IndexedDB board save succeeds.
Explicit Cancel clears it, while editor disposal/navigation preserves it.

Unit tests verify collection discovery, collision exclusion, expiration and
purging without skipping entries, blocked storage and new-editor lifecycle.
The real-browser smoke test restores a brand-new formatted sticky note into an
actual lesson after navigating to it, commits and persists it once, then checks
that reload does not duplicate it. Chromium, Firefox and WebKit pass.

**Limits:** Text recovery does not provide cross-device synchronization,
server backups, or guaranteed persistence when local browser storage is
disabled. Native operating-system IME behavior still requires manual QA.

## TXT-051: HTML/SVG bidi and wrapping validation (November 14, 2026)

Additional real-browser regressions now test that physical Hebrew RTL,
English LTR and centered text anchors agree between a native HTML
contenteditable editor and actual mounted SVG text glyph bounds. They
also measure native line breaks with per-character Range rectangles and
check that Hebrew, English and mixed-direction numbered sticky-note
paragraphs remain inside both HTML and SVG text boxes, retaining the
full source text.

The new checks detected and corrected the RTL SVG token-anchor defect
rather than merely accepting an increased clipping tolerance.
Unit tests exercise direction-aware anchors for mixed-script tokens.
[Reference-capture workflow 43572387008](https://github.com/philiparad/philiparad.github.io/actions/runs/43572387008)
passed **280/280 Node tests** and the new geometry smoke tests
across Chromium, Firefox and WebKit. Its visual jobs intentionally
reported the old golden-hash mismatch; the images were inspected, and
all nine versioned golden hashes updated. A subsequent enforcing run
must pass before this release is considered fully verified.

## TXT-052: mathematical inline images (November 14, 2026)

Fixed the CSS selector which previously treated non-editable inline equation
spans as 100%-width block editors. HTML now constrains equation image widths
to the available text or padded sticky-note width, consistent with SVG.
Equations align on the surrounding text baseline and reserve a non-clipping
line height in SVG.

New Node tests check oversized equations, atomic wrapping, baseline positions,
and both RTL and LTR source text. Browser tests use valid generated PNG images
and independently compare native HTML image baselines, fitted dimensions,
SVG positions, export preservation and editor bounds. These geometry checks
passed Chromium, Firefox and WebKit in
[CI capture run 43576725714](https://github.com/philiparad/philiparad.github.io/actions/runs/43576725714).
The sole expected failure in that capture run was outdated pixel baselines
for the mixed-language inline-math fixture, now explicitly reviewed and
updated in the golden manifest. Final full verification remains dependent
on the subsequent enforcing workflow, including the A4 PDF raster check.

## TXT-053: atomic inline-equation editing (November 14, 2026)

Added explicit logical-caret navigation and deletion for non-editable inline
math spans. An equation counts as exactly one `U+FFFC` token, regardless
of its nested HTML image markup. Left/Right arrows skip one equation only
when the caret is beside it; the logical direction follows each paragraph's
computed RTL or LTR flow. Shift+Arrow selects one atomic token. Clicking the
left or right half of the rendered equation places the caret on the
corresponding logical side, including reversed RTL behavior.

Adjacent Backspace/Delete removes only the equation and restores the caret
to its old logical start. The editor records this as a normal rich-text
history entry, supporting Undo/Redo without losing neighboring Hebrew or
English text. Cancelable mobile-style `beforeinput` deletion and selected
range deletion are covered as separate regression paths. Ordinary native
text editing is unchanged when no equation borders the caret.

[Verified GitHub Actions run 43577589874](https://github.com/philiparad/philiparad.github.io/actions/runs/43577589874)
passed **285/285 Node.js tests**, plus Chromium, Firefox and WebKit browser
smoke tests, all nine committed pixel goldens, and Chromium A4 PDF print to
Poppler rasterization. Browser smoke coverage includes caret movement in
LTR/RTL and after changing paragraph direction, Shift selection, native
selected-equation deletion, Backspace/Delete, cancelable `beforeinput`,
mouse placement and Undo/Redo. Full native OS IME/device coverage remains
manual QA.

## TXT-054: accessible rich-text clipboard and inline LaTeX (November 14, 2026)

**Implementation:** `text-inline-clipboard.js` preserves text formatting,
paragraph direction and lists, embedded equation images and editable
LaTeX sources using a versioned, validated clipboard schema. Plain-text
output uses `\\(source\\)` rather than `U+FFFC`.

Pasting validates the custom MIME payload or an encoded, inert HTML
fallback. No external clipboard HTML enters the editor as live DOM.
Untrusted or malformed rich data falls back to literal plain text.
Validated fragments are recreated with the editor's own DOM writer,
preserving undo/redo and caret position.

Inline equations expose an ARIA `math` role with the LaTeX source in
the accessible label; the image is hidden from redundant announcements.

[Verified run 43583536256](https://github.com/philiparad/philiparad.github.io/actions/runs/43583536256):
**290/290 Node.js tests**, Chromium/Firefox/WebKit regression suites,
unchanged visual golden images and A4 PDF validation all passed.
New browser tests cover copy, cut, paste, formatting, editable LaTeX,
HTML fallback, selected cut/undo/redo and malicious HTML as literal text.

Browser and OS clipboard managers may strip custom MIME and HTML
metadata. In that case plain-text LaTeX remains readable but is not
automatically reconstructed into an editable image. Native screen
reader and external-application clipboard QA remain manual.

## TXT-055: multi-paragraph clipboard and numbered-list fidelity (November 14, 2026)

Enhanced `text-inline-clipboard.js` to reconstruct the visible ordinal of
the first copied numbered list item, even if its source `numberStart`
was only specified in an earlier paragraph. A number restart in a later
copied paragraph remains explicit. When the true ordinal falls outside
the existing validated 1–10000 explicit-start range, the rich payload is
rejected rather than silently misnumbered.

Paragraph replacement now respects actual source and destination boundaries:
the unaffected destination prefix retains its metadata; the first fully
replaced or empty paragraph can inherit source metadata; interior pasted
paragraphs keep source direction, alignment and numbering. A destination
suffix that survives a selection spanning multiple old paragraphs retains
its own paragraph metadata. A rich paste splitting a single destination
paragraph retains the rich source metadata on its last new paragraph. For
plain-text multi-line paste, new lines inherit the destination paragraph
direction/list type and numbered items continue rather than restarting
at the old explicit first-item number.

Cutting a full paragraph and its trailing newline now lets the surviving
next paragraph retain its language direction and real numbered-list
ordinal, with undo/redo restoring the original content.

For external applications, portable `text/html` now uses actual ordered
and unordered lists, `<li>`, direction attributes, alignment and safe
strong/emphasis/underline/strike/color markup. Equations have escaped
textual LaTeX in accessible math spans. An encoded, versioned clipboard
payload remains on an inert outer element for lossless import back into
Teaching Board when the custom MIME field is stripped. HTML is never
inserted as executable editor DOM, and size and schema validation still
apply.

**Regression verification:** [GitHub Actions run 43586455295](https://github.com/philiparad/philiparad.github.io/actions/runs/43586455295)
passed **298/298 Node.js tests** and all Chromium/Firefox/WebKit browser
jobs. Cross-browser tests exercise a mixed RTL/LTR copied numbered sequence
starting at ordinal 8, its inline LaTeX and styling, paste into an empty
document, undo/redo, cut of a complete row, paste after a bullet prefix,
HTML-only round-trip, and safe plain multi-line paste. The unchanged
visual-golden and A4 print/PDF regressions also passed. Browser system
clipboard and third-party office application behavior still require
manual interoperability validation.

## TXT-056: caret-aware plain-text paste and formatting overrides (November 14, 2026)

Plain-text pasting now chooses style from the insertion position in
the **destination paragraph**. At a collapsed caret it prefers the
preceding text run, falling forward to the next text run at a paragraph
start or next to an inline equation. For non-collapsed selection
replacement it prefers the first selected text run. Equations are
atomic and are never treated as style sources, and styling does not
leak across paragraph boundaries.

The validated `replaceRichClipboard` operation applies these styles
to inserted plain-text runs, including multi-line content. Pending
formatting marks set by the toolbar explicitly override inherited
bold/italic/underline/strikethrough and color; `removeFormat` can
clear inherited color. A multi-line plain paste with pending marks
uses the same validated rebuilding path, while single-line pending
input retains its established native insertion workflow. Original
rich clipboard fragments are still pasted with their source
formatting, not the target insertion style.

Browser tests exercise Hebrew RTL colored/bold paragraphs and English
LTR italic text; insertion at a style boundary; replacement of
a formatted selection; a differently formatted next paragraph;
multiple pasted lines inside a numbered list; pending style override;
paste directly before and after an accessible inline equation;
undo/redo; and malicious clipboard HTML as literal text.

**Verification:** [GitHub Actions run 43587241484](https://github.com/philiparad/philiparad.github.io/actions/runs/43587241484)
passed **304/304 Node.js tests**, all Chromium/Firefox/WebKit browser
smoke suites, all nine unchanged visual-golden checks, and the
Chromium A4 PDF-to-Poppler raster regression.

**Limitations:** Clipboard sanitization and OS/browser behavior outside
the automated browsers still require hands-on testing. These changes
do not attempt to convert arbitrary external LaTeX text into an
editable rendered equation.
