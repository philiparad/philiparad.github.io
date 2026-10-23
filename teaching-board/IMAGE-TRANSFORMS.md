# IDroo image controls — sequential task record

1. [x] Analyze the reference.
   - [x] Inspect screenshot and official editing help.
   - [x] Inspect publicly served Image model and scale/rotate interactions.
   - [x] Confirm eight handles, corner proportion toggle, side stretching, rotation center, 5-degree Shift snap, angle guide and gesture history.
2. [x] Implement resizing, then verify before rotation.
   - [x] Eight green square handles with fixed screen size and external padding.
   - [x] Opposite anchor, proportional corner projection and Shift override.
   - [x] Exact affine image stretching after rotation; preserve image source/crop; support crossing the anchor.
   - [x] Targeted geometry and existing group tests pass.
3. [x] Implement rotation, then verify before integration.
   - [x] Blue circle above the selection, pointer offset compensation and center rotation.
   - [x] Degree guide, five-degree Shift snapping and group rotation.
   - [x] Targeted rotation checks pass.
4. [x] Integration validation.
   - [x] Renderer cache, bounds, connectors, export and saved model support image affine basis.
   - [x] One undo entry per completed gesture; existing Escape/pointer cancellation restores history.
   - [x] Locked selections have no transform controls.
   - [x] 181 automated checks and 21 core checks pass.
   - [x] Browser corner resize, side resize, rotation and undo/redo verified.
5. [ ] Publish and verify the live deployment.

## Reference analysis (23 October 2026)

- Official behavior: https://app.idroo.com/help/editing-objects
- Public interaction bundle: https://app.idroo.com/assets/public/ModularBoard-B1EChO-5.js
  `fS` is the scale interaction, with `shouldUseProportionalScaling`, opposite-handle projection and scale history. `dS` is the rotation interaction, with center/offset calculation, Shift step of 5 degrees, angle overlay and rotation history. Names are build-specific.
- Public image model: https://app.idroo.com/assets/public/objectFactory-BN6PeSDs.js
  Image defaults `scaleProportionally` to true.
- Shared public geometry: https://app.idroo.com/assets/public/app-CVI90VXz.js
  Matrix scale and rotation utilities confirm affine transforms.

Teaching Board uses an independently written implementation adapted to its SVG model, not copied IDroo source. An optional four-number imageBasis preserves affine stretching of a rotated image; legacy images default to the identity basis. The visible selection remains axis-aligned, as in the reference interaction code. Handles stay 10 screen pixels across at every zoom.
