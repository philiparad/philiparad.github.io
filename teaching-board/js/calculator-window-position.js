/**
 * Keep the calculator entirely within the visible viewport, including when a
 * device rotates or the window becomes smaller after it was dragged.
 * Pure geometry, independent of dialog focus or board state.
 */
export const CALCULATOR_WINDOW_MARGIN=8;

export function clampFloatingWindowPosition(x,y,width,height,viewportWidth,viewportHeight,
 margin=CALCULATOR_WINDOW_MARGIN){
 const maxX=Math.max(margin,viewportWidth-width-margin);
 const maxY=Math.max(margin,viewportHeight-height-margin);
 return {
  x:Math.min(maxX,Math.max(margin,x)),
  y:Math.min(maxY,Math.max(margin,y))
 };
}

/** Open near the right edge, leaving the lesson visible to the left. */
export function initialFloatingWindowPosition(width,height,viewportWidth,viewportHeight){
 return clampFloatingWindowPosition(viewportWidth-width-20,70,
  width,height,viewportWidth,viewportHeight);
}
