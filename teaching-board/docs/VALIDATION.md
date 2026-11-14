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

## TXT-057: explicit paste formatting choices and accessible keyboard navigation (November 14, 2026)

The text editing toolbar now provides a native `select` control with
the accessible label `Paste formatting mode`. Two choices are exposed:
**Keep source formatting** (default for each draft) and **Match
destination formatting**. A mode change from the select's native
Up/Down Arrow keyboard interaction restores editor focus and the
logical saved selection, avoiding a silently moved paste caret.
The selection is also captured when the control receives keyboard
focus or a pointer interaction.

Rich clipboard paste now passes `matchDestination` through the
existing validated `replaceRichClipboard` operation. When enabled,
every inserted *text* run has its source style stripped before
receiving the destination caret's style (including pending toolbar
overrides). This avoids inheriting source bold/italic/underline or
color when the destination style leaves that property unspecified.
Atomic `U+FFFC` equation runs retain their original validated
image and LaTeX source without adding copied text styling.
Paragraph metadata follows the same destination-inheritance rules
already exercised for ordinary plain-text paste; unmodified
destination prefix/suffix metadata is preserved as appropriate.
Keep-source mode retains the original rich clipboard behavior.
Ordinary plain-text paste is destination-styled in either mode,
and clipboard HTML still passes inert parsing and validation.

**Verification:** [GitHub Actions run 43588942447](https://github.com/philiparad/philiparad.github.io/actions/runs/43588942447)
passed **308/308 Node.js tests** and all Chromium, Firefox, and WebKit
browser jobs, including nine unchanged visual goldens and Chromium A4
PDF raster validation. New model tests cover both paste modes,
multi-paragraph RTL/LTR and list metadata, selection replacement,
explicit pending marks, atomic math retention, and hostile rich
clipboard rejection. Cross-engine browser tests verify the native
selector's accessible label/options, ArrowUp/ArrowDown interaction,
selection/focus preservation, default-mode reset in new drafts,
rich paste preservation, destination style matching, equation
sources, and Undo/Redo.

**Limitations:** Native browser and OS clipboard managers may strip
custom MIME/HTML clipboard metadata. Such external clipboard
interoperability and real assistive-technology workflows remain
manual QA; these modes do not reconstruct rendered equations from
arbitrary plain LaTeX text.

## TXT-058: interoperable external HTML and keyboard-only plain paste (November 14, 2026)

`text-inline-clipboard.js` now provides `externalRichClipboardHTML()`:
a deliberately narrow, size- and node-bounded external HTML importer.
It uses an inert DOMParser document and reconstructs only validated
rich-text runs/paragraph metadata rather than importing clipboard DOM
nodes. It accepts safe inline text formatting, color, line breaks,
paragraph direction/alignment, ordered/bulleted lists and list starts.
HTML-only clipboards are supported when there is usable textual HTML;
existing authenticated-by-schema Teaching Board custom/encoded
clipboard payloads retain priority. Unsupported embedded images,
scripts, SVG, forms, and other active markup reject the rich HTML
import. Standard Office-like head style and meta blocks are ignored;
styles not present inline cannot be recovered. Unsafe HTML with an
available plain-text representation falls back to literal plain text,
not executable elements.

`inline-text.js` now recognizes `Ctrl/⌘+Shift+V` during a native
clipboard paste gesture. The browser still owns ClipboardEvent access;
the editor only consumes the next native paste as plain text and
resets the shortcut flag on paste, keyup or focusout to prevent stale
paste preferences. HTML-only clipboard metadata can be converted
to readable text with inline LaTeX instead of silently dropping the
paste. Plain-text paste still inherits destination formatting as
implemented in TXT-056. The paste-mode selector exposes this shortcut
in its title and ARIA description, and its keyboard selection/focus
behavior remains intact.

**Validation:** [GitHub Actions run 43592608226](https://github.com/philiparad/philiparad.github.io/actions/runs/43592608226)
passed **308/308 Node.js tests** and all Chromium, Firefox and
WebKit browser jobs, including unchanged visual reference images and
A4 PDF raster validation. New cross-browser tests cover HTML-only
numbered RTL/LTR lists, safe bold/color/italic preservation, destination
format matching, undo/redo, Ctrl+Shift+V with a complete rich
clipboard, ordinary Ctrl+V retaining equations, HTML-only encoded
equation carrier converted to LaTeX text, safe HTML `br` and hidden
element handling, rejected `img onerror` payloads, and bounded
oversize HTML. Further regression tests cover macOS Command+Shift+V,
keyup cancellation of a pending shortcut, and Office-style inert
head markup.

**Limits:** Not a general-purpose browser HTML sanitizer or full Office
importer. Unsupported rich HTML uses the available `text/plain`
fallback; if both sources contain no usable text, no paste is made.
Native OS clipboard, device screen-reader and third-party document
interoperability remain additional manual QA requirements.

## TXT-059: nested-list and table clipboard fidelity (November 14, 2026)

Expanded the external HTML clipboard importer in
`js/text-inline-clipboard.js` with best-effort flattening for
hierarchical lists and tabular source documents. The document model
continues to store only flat paragraphs, runs and one list type per
paragraph, so these conversions do not introduce incompatible nested
DOM or table-specific objects.

**Nested lists:** The walker tracks list depth, prefixes nested item
text with the explicit visual marker `↳ ` (up to four levels of
prefixes), and records each ordered item's original visible ordinal.
Explicit starts on nested lists remain intact, and returning to a
parent ordered list restores its correct numbering. A paragraph
nested directly inside `li` contributes to that list item rather than
creating an extra unnumbered paragraph.

**Tables:** The importer visits each direct table row; cells become
plain-text portions separated by ` | `, with one paragraph per row.
Table/header/cell inline styles and safe text are retained; `th`
is represented as bold. Row direction inherits from the surrounding
table, row or first cell when available. Cell geometry, borders,
`colspan`, `rowspan` and original grid layout are intentionally
not represented in the flat text model.

The same inert parsing, forbidden-element checking, 250 KB HTML
input cap, bounded node traversal, 10,000-character document limit,
paragraph validation and schema checks remain in place. Unsupported
or unsafe external HTML is not inserted as live DOM.

**Regression coverage:** [GitHub Actions run 43595689229](https://github.com/philiparad/philiparad.github.io/actions/runs/43595689229)
passed the Teaching Board Node.js tests and all three
Chromium/Firefox/WebKit browser jobs. New cross-browser tests cover
a nested mixed RTL/LTR ordered/bullet sequence with sublist restarts,
continuation of parent numbering, an HTML table with Hebrew/English
cells and bold headers, keep-source and match-destination pasting,
undo/redo, disallowed image handlers, excessive table rows and
out-of-range list numbers. Existing visual-golden and A4 PDF
regression checks remain green.

**Limitations and manual follow-up:** This is a readable flat-text
representation, not full table/layout round-tripping. Native OS
clipboard behavior and third-party editors should still be tested
manually with representative real documents.

## TXT-060: stable multi-paragraph selections and formatting (November 14, 2026)

`text-lists.js` introduces
`logicalSelectedParagraphIndices(saved, paragraphCount)`, based
on stable paragraph indexes and UTF-16 offsets. An end boundary
at `{paragraph:n,offset:0}` excludes paragraph `n` when the
selection begins in an earlier paragraph. Collapsed and backwards
selections are handled explicitly, rather than relying solely on
`Range.intersectsNode` (which can include a trailing unselected
paragraph). Existing DOM range discovery remains as a fallback.

A new `text-paragraph-format.js` provides a pure, validated
`formatSelectedParagraphs` transformation and a browser command
`applyParagraphFormatting`. Paragraph alignment and text direction
now use this shared model-based mechanism instead of mutating
individual DOM blocks. It retains text runs, list metadata,
custom numbering and math while restoring both logical selection
endpoints through an editor DOM rewrite.

`text-range-format.js` now attempts
`captureLogicalSelection` and `restoreLogicalSelection` first for
multi-paragraph bold/italic/underline, colors and clear formatting.
This supports reversed selections and cross-list spans, including
selections containing atomic inline math, without falling back to
coarse selection of the entire editor. The existing DOM-offset
reconstruction remains as a defensive fallback.

**Regression verification:** The new pure unit tests check forward,
backward, collapsed and newline-only selections; excluded end-boundary
paragraphs; invalid formatting; and formatting independence from
runs and list metadata. Browser regression tests use an actual
imported mixed RTL/LTR ordered/bulleted list and table; they apply
alignment, direction, list format and Ctrl+B to selections crossing
paragraphs, verify exact caret anchor/focus and unchanged text,
exercise Undo/Redo, and change direction from a focused toolbar select.

The completed implementation's GitHub Actions verification is
recorded in the TXT-060 commit history. Native screen readers,
input methods and editing in external native applications remain
manual checks.

## TXT-061: paragraph-boundary keys, empty list items, and equation-aware keyboard navigation (November 14, 2026)

Introduced the pure module `js/text-boundary-keys.js`, with
`boundaryEdit`, `boundaryNavigation` and `unlistEmptyParagraph`
to calculate text-safe keyboard actions from logical paragraph
indexes and UTF-16 offsets. All calculations count an atomic
inline equation as one `U+FFFC` placeholder and avoid touching
its image/LaTeX data.

**Editing boundaries:** A collapsed Backspace at the start of a
paragraph and Delete at its end remove only the adjacent newline
using the existing validated `replaceRichClipboard` splice operation.
The untouched destination paragraph's metadata survives according
to the existing TXT-055 merge rules. On an empty numbered/bulleted
item, Backspace first removes list styling without removing the
paragraph; when a following numbered item becomes a new list start,
its original visible ordinal is retained. Rebuilding the editor
restores the computed logical caret, records history, and supports
undo/redo. The same boundary handler runs on cancelable native
`beforeinput` delete events when needed.

**Navigation:** `Alt+ArrowUp/Down` jumps between paragraph indexes,
clamping offsets to the target paragraph length. `Shift+Alt+ArrowUp/Down`
preserves the selection anchor, including backwards selections.
`Ctrl/Meta+Home/End` targets the exact start/end of the whole text;
`Shift` extends the selection from its current anchor.
Unmodified Up/Down is intercepted only when the current paragraph
is empty; standard visual navigation in nonempty/wrapped text
remains native. Existing left/right equation navigation retains
priority for atomic equation boundaries.

**Tests:** New model-level tests cover paragraph joins, list
numbering, empty-list exits, equation-adjacent lines, RTL/LTR offsets,
document-edge navigation, reversed Shift selections, invalid
offsets, and unchanged native behavior. Cross-browser smoke tests
exercise all these actions, `beforeinput`, selection restoration,
equation accessibility/undo, and actual Playwright keyboard input
rather than relying exclusively on constructed key events.

The source-code regression job for the implementation passed at
[GitHub Actions run 43603467929](https://github.com/philiparad/philiparad.github.io/actions/runs/43603467929).
Physical keyboards, IME composition and assistive technology remain
manual integration checks, particularly when OS shortcuts are
overridden at the system level.

## TXT-062: multi-equation selections and atomic range deletion (November 14, 2026)

**Logical selection normalization** (`js/text-selection.js`):
`offsetInParagraph` now counts actual paragraph text without
depending on browser fragment serialization. For equation descendants,
the computed caret snaps to the boundary before or after the equation,
never into image or alternate-text markup; each equation is one
`U+FFFC` placeholder. `wrapperBoundary` resolves native browser
anchor/focus positions located directly on contenteditable root or
`ol`/`ul` containers between list items into the correct first
following paragraph or final preceding paragraph.

**Selection deletion** (`js/text-boundary-keys.js` and
`js/inline-text.js`): New pure `selectedDeletion(snapshot,saved,key)`
maps both ends of a valid, noncollapsed keyboard selection to absolute
UTF-16 document offsets. Backspace/Delete routes this selection to
the existing `replaceRichTextRange` → `replaceRichClipboard`
validated editing pipeline, rather than using browser-native partial
DOM deletion that can split equation wrappers, corrupt list
transitions, or lose undo fidelity. Paragraph-boundary joins and
empty-item unlisting from TXT-061 remain separate collapsed-caret
operations. Clipboard copy/cut continues to use validated rich
payloads with readable LaTeX for external plain-text targets.

**Regression coverage:** The new unit tests exercise root and list
wrapper boundary positions, reversed selections, caret anchors
located inside formula image descendants, multiple consecutive
equations, rich selection deletion across mixed numbered/bulleted/
plain paragraphs, preserved numbering, surviving equations, and
rejection of invalid/collapsed ranges. Cross-browser smoke tests
exercise RTL Shift+Arrow selection of two adjacent equations,
copy/cut across list transitions, model-based Backspace/Delete,
selection formatting, equation accessibility labels, preserved
LaTeX source, and undo/redo. An additional genuine Playwright
keyboard workflow selects equations across a paragraph break with
`Alt+Shift+ArrowDown`, deletes the range, and checks undo/redo.

**Verification:** [GitHub Actions run 43605361031](https://github.com/philiparad/philiparad.github.io/actions/runs/43605361031)
passed **328/328 Node.js tests** and the Chromium, Firefox, and WebKit
browser smoke jobs, including the established visual-golden and A4 PDF
raster checks.

**Limitations:** The changes normalize model-level positions but do
not override the browser's general visual bidirectional caret
algorithm for ordinary text. Real assistive technology, keyboard
layouts, native clipboard managers, and IME behavior warrant further
manual integration testing.

## TXT-063: IME composition, caret recovery and accessible equations (November 14, 2026)

**Safe IME styling — `js/text-pending.js`:** Before/after
composition diffs are aligned to complete Unicode grapheme clusters
using `Intl.Segmenter`, with Unicode code-point fallback. Styling
rejects a diff containing a paragraph newline or a complete
`U+FFFC` equation placeholder, keeping the native IME result
instead of extracting parts of equation markup. Successfully
styled text receives a collapsed caret after the committed range,
not a stale selected preedit range. Selection recovery is attempted
if a formatting operation fails.

**History coalescing — `js/inline-text.js`,
`js/text-history.js`:** While a composition is active, browser
preedit events do not add snapshots or invoke keyboard edit
commands. On `compositionend`, pending styles are applied and
one valid document snapshot is saved. A final input can arrive
after that event with different `InputEvent.inputType` values
depending on the engine; the first such input, in the absence
of another keyboard, pointer, focus or editing action, amends
only that composition's current history entry. A composition
whose initial end event has not yet changed the text instead
pushes a new entry upon the eventual input. No prior undo
entry is overwritten, and user-initiated edits reset the one-shot
coalescing state.

**Equation caret and keyboard access — `js/text-selection.js`,
`js/text-equation-caret.js`:**
`recoverEquationSelection` normalizes a caret inside a
`contenteditable=false` equation image subtree to the nearest
logical boundary of the intact `U+FFFC` atom; it does nothing to
ordinary Hebrew/English selections. An adjacent collapsed caret
can use **Alt+Enter** to open the existing visual/LaTeX equation
dialog. Cancel is non-destructive, leaves undo history unchanged
and returns focus to the editor.

**Accessibility:** The editor adds a visually hidden explanatory
element referenced by the textbox's `aria-describedby`, publishes
supported keys using `aria-keyshortcuts`, announces composition
start/finish through a polite `role=status` live region, and
reflects active composition through `aria-busy`. Existing math
elements remain labeled `role=math` with the LaTeX source and
their decorative image hidden from duplicate announcements.

**Tests:** Added `tests/text-ime-recovery.test.mjs` with coverage
for grapheme-aligned Hebrew niqqud, emoji substitution, safe
composition differences, atomic-equation caret recovery,
adjacent math lookup, and delayed-commit history amendment.
Expanded cross-browser Playwright smoke tests verify that IME
preedit suppresses shortcuts, pending formatting applies only
to committed Hebrew or mixed-direction text near equations,
both early and late native commits use one Undo step,
equation sources and list metadata survive, accessible hints
and status attributes remain present, and a real Alt+Enter
gesture opens the correct equation and Cancel restores focus.

**Verification:** [GitHub Actions run 43608679341](https://github.com/philiparad/philiparad.github.io/actions/runs/43608679341)
passed **333/333 Node.js tests**, plus Chromium, Firefox, and
WebKit, including existing visual-golden and A4 PDF checks.
The final documentation commit is separately validated in CI.

**Limits:** The browser tests simulate IME lifecycle events rather
than reproducing a physical OS input method or real screen reader.
Platform-native IME, braille, screen-reader, keyboard layouts,
and third-party accessibility workflows warrant manual QA.

## Toolbar calculator modal — November 14, 2026

A new `CalculatorModal` component in `js/calculator-modal.js` adds an
SVG calculator icon directly before the `⚙ Ink & style` properties
menu, using the existing `tool` icon conventions and responsive
`layout.css` styling. The button's ARIA label and `aria-expanded`
state reflect opening and closing, and `aria-controls` identifies
the native modal dialog.

The dialog embeds precisely
`https://philiparad.github.io/calculator/?key=calculator` in a
titled iframe. The browser provides modal keyboard focus
management and the Escape-to-close gesture. A header close
button offers a visible alternative. On close, the iframe `src`
is removed and focus is restored to the originating toolbar
button. `Editor.dispose()` disposes the component and unloads
the iframe when navigating back to the dashboard or switching
lessons; calculator state is intentionally not persisted in the
whiteboard document model.

**Regression coverage:** The browser smoke suite checks the
calculator icon, matching 36px size, exact placement before
the properties menu, proper `aria-label`/`aria-haspopup`/
`aria-controls`/`aria-expanded` attributes, exact iframe
source URL and accessible title, native modal state,
keyboard Escape and close-button interactions, iframe
unloading, focus restoration, and complete cleanup when
the user navigates away. The calculator iframe's network
response is stubbed only within automated tests, to avoid
a dependency on external network availability; production
loads the specified GitHub Pages URL unmodified.

A real manual deployment check should confirm that the
calculator page permits same-origin iframe embedding and
its key-only URL variant renders without extra surrounding
panels. TXT-064 mobile-accessibility work has not been started.

## Calculator Ans → editable text transfer (November 14, 2026)

**Implementation:** The calculator-only application
(`calculator/js/app.js`) listens for the narrowly scoped
`teaching-board/calculator-ans-v1` request. It replies only when
embedded, in calculator-only mode, and when the request comes from
its **same-origin parent**. It reads the calculator's
`state.resultPresentation.chosen.text` (rather than
recalculating `state.ans`) so fractions and the current
decimal/scientific representation are transferred as displayed.
An initial calculator without a computed Ans replies with the
`no-answer` error; no result is added to the board.

**Parent validation:** `js/calculator-modal.js` adds a
**Send Ans to Board** button in the calculator modal header.
It becomes enabled only after iframe load, sends a one-time
random request ID with a fixed expected target origin, and
accepts messages only when both `event.origin` and
`event.source===iframe.contentWindow` match the trusted
calculator. The strict response parser in
`js/calculator-answer.js` also checks the request ID, message
type/protocol, text length and disallowed control characters.
Bad/stale/forged responses are ignored; a timeout leaves the
modal open with a retry message. Closing/unmounting cancels
requests and unloads the iframe.

**Whiteboard insertion:** `Editor.insertCalculatorAnswer()`
creates a normal `type:'text'` object centered in world
coordinates at the visible canvas center. It stores the
literal Ans in `text`, `runs` and one left-to-right
paragraph; normal document validation, selection, saving,
painting, undo and redo apply. A failure leaves the modal
open, and a successful insertion closes it.

**Tests:** `tests/calculator-answer.test.mjs` checks actual
editable-object model validation, decimal/fraction/scientific
display preservation, malicious/invalid string rejection,
and protocol/request ID validation. Browser smoke tests use
an intercepted calculator iframe (for deterministic send/error
responses) to verify an initial no-result state, correct
fraction transfer, single centered object, visible selection,
modal closure and board undo/redo. A separate browser
test loads the **real local calculator controller** in a
same-origin iframe, evaluates a fraction using the actual
`EQUAL` key and verifies that its response matches the
calculator's displayed result. The previous modal Escape,
Close, lifecycle, geometry, visual-golden and A4 PDF tests
remain in the regression suite.

**Limitations:** The output is editable *plain text*. The
displayed fraction `1/3` is stored as those three characters,
not an automatically typeset LaTeX fraction. There is no
unprompted synchronization of ongoing calculator changes.
The browser test for the parent's modal stubs the GitHub
Pages iframe response; the second test uses the real calculator
code. End-to-end deployment to GitHub Pages and external
device accessibility remain manual validation steps.
