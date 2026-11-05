# Milestone 23 — LCD layout and structural navigation

## Display contract

The framebuffer is 96 × 31 logical monochrome pixels. Rows 0–6 are reserved for status; rows 7–21 hold mathematical input; row 22 is the separator; rows 23–30 hold the result. All drawing of editable mathematical expressions is clipped to the input viewport.

The independent renderer computes a layout box with `width`, `height`, `baseline`, draw commands, and structural cursor anchors. Each child is aligned by its baseline, while exponents occupy a raised box. Fraction numerators and denominators retain their own layout and local cursor anchors.

For input taller than 15 pixels, `scrollY` places the active anchor in the input viewport where possible. Overflow arrows are rendered independently of the expression tree. `scrollX` follows the active structural anchor. This is a legibility strategy, **not verified Casio firmware behavior**.

## Navigation

LEFT/RIGHT traverse structural template slots and enter/exit nested nodes. UP/DOWN search the cursor's ancestor chain for an adjacent slot; this supports reaching a fraction denominator even if the caret is inside a nested function in the numerator. Moving the caret does not mutate the mathematical source.

## Verification

Internal regression suite: 318/318. New tests check exponent baselines, vertical viewport clipping, deep scrolling, caret visibility, horizontal scrolling, nested vertical navigation, framebuffer determinism, and preservation of status/result areas. Browser automation is blocked by the local policy. No physical Casio validation corpus has been collected.

## Remaining gaps

- Casio-specific bitmap glyph, arrow and cursor blink parity is unverified.
- Vertical scroll gestures and device-accurate overflow prompts require hardware observations.
- Very deep math may not fit entirely in the 15-pixel input region; the implementation follows the active caret and clips other parts.
- Structural deletion/insertion still lacks some specialized calculator templates and display options.