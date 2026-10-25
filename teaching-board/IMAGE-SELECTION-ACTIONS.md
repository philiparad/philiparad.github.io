# Selected-image functionality: IDroo comparison and implementation

Completed sequentially, 25 October 2026.

## 1. Context menu and clipboard — complete
- Right-click an image or use Image actions to open the selection menu.
- Duplicate; Cut; Copy; Paste; Group/Ungroup with selection-aware availability.
- Bring to Front; Send to Back; Save as snippet; Export selection; Delete.
- Native Ctrl+X and board-selection clipboard interoperability across board tabs.
- Context paste supports board selections and image clipboard entries where browser access is available. Ctrl+V remains available when the browser blocks programmatic clipboard reads.
- PNG, SVG and PDF selection export choices use the existing export controls and timestamp filenames.

## 2. Selected-image toolbar — complete
- Floating toolbar appears for one selected image.
- Crop image; optional border color/width or No border; image opacity; actions menu.
- Toolbar stays within the visible board and hides during gestures or when selection changes.
- Border and opacity survive saving, undo/redo, and export.

## 3. Crop editing — complete
- Draw a new crop; drag an existing crop box; resize using eight side/corner handles.
- Numeric percentages; Apply crop; Cancel; Reset crop.
- Preserve source image and the affine image frame; resetting restores the uncropped frame, including rotated or stretched images.

## 4. Lock to Background — complete
- Background objects render behind ordinary objects.
- Normal clicks, ordinary marquee selection and the eraser skip background images.
- Ctrl-click, right-click, or deliberate selection allows editing; the context action becomes Unlock.
- Background lock is separate from Teaching Board's existing protective Lock/Unlock, so existing locked lessons keep their protection.
- Groups remain coherent; copied objects are unlocked.

## 5. Integration and input — complete
- Retain existing move, proportional/free resize, rotation, angle guide and 5-degree rotation snapping.
- Alt-click/Alt-marquee removes objects from selection.
- Arrow keys move 1 unit; Shift moves 10; Ctrl+Shift moves 100.
- Ctrl+U ungroup alias; existing Ctrl+Shift+G remains supported.
- Shift+F10/context-menu key opens actions; arrow keys navigate menu; Escape closes it.
- Touch/stylus hold opens actions in the Select tool; moving cancels the hold.
- All 192 automated checks pass, plus 21 core checks.
- Browser checks: image toolbar, right-click menu, lock/normal-click exclusion/right-click unlock, crop/apply/reset, and border rendering.

## Reference and scope
The supplied selected-image screenshot, IDroo's official editing and image documentation, and its public client JavaScript were analyzed. Existing Teaching Board functions were reused where already equivalent. This is an independent implementation for Teaching Board's local SVG model, not copied IDroo code.

- https://app.idroo.com/help/editing-objects
- https://app.idroo.com/help/images-documents
- https://app.idroo.com/assets/public/ModularBoard-B1EChO-5.js (ImageOptions, selection, crop and editing commands)
- https://app.idroo.com/assets/public/objectFactory-BN6PeSDs.js (image source, crop and affine geometry)

The scope is functionality available for images already on a board. IDroo account storage, uploading document formats, live collaboration and paid-plan features are outside this selected-image task.
