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

/** Device-only calculator window preference: proportional coordinates avoid
 * reopening offscreen after a resize or a change between desktop and tablet.
 * No board objects, equation data, or calculation history are stored here. */
export const CALCULATOR_WINDOW_POSITION_KEY='teaching-board-calculator-window-position-v1';

function positionRatiosValid(value){
 return value&&typeof value==='object'&&!Array.isArray(value)&&
  value.v===1&&Number.isFinite(value.x)&&Number.isFinite(value.y)&&
  value.x>=0&&value.x<=1&&value.y>=0&&value.y<=1;
}

export function readCalculatorWindowPosition(storage){
 try{
  const raw=storage?.getItem(CALCULATOR_WINDOW_POSITION_KEY);
  if(typeof raw!=='string'||raw.length>128)return null;
  const saved=JSON.parse(raw);
  return positionRatiosValid(saved)?{x:saved.x,y:saved.y}:null;
 }catch{return null;}
}

export function windowPositionRatios(position,width,height,viewportWidth,viewportHeight){
 const clamped=clampFloatingWindowPosition(position.x,position.y,
  width,height,viewportWidth,viewportHeight);
 const roomX=Math.max(0,viewportWidth-width-2*CALCULATOR_WINDOW_MARGIN);
 const roomY=Math.max(0,viewportHeight-height-2*CALCULATOR_WINDOW_MARGIN);
 return {
  x:roomX?(clamped.x-CALCULATOR_WINDOW_MARGIN)/roomX:0,
  y:roomY?(clamped.y-CALCULATOR_WINDOW_MARGIN)/roomY:0
 };
}

export function restoreCalculatorWindowPosition(ratios,width,height,viewportWidth,viewportHeight){
 if(!positionRatiosValid({v:1,...ratios}))
  return initialFloatingWindowPosition(width,height,viewportWidth,viewportHeight);
 const roomX=Math.max(0,viewportWidth-width-2*CALCULATOR_WINDOW_MARGIN);
 const roomY=Math.max(0,viewportHeight-height-2*CALCULATOR_WINDOW_MARGIN);
 return clampFloatingWindowPosition(
  CALCULATOR_WINDOW_MARGIN+ratios.x*roomX,
  CALCULATOR_WINDOW_MARGIN+ratios.y*roomY,
  width,height,viewportWidth,viewportHeight);
}

/** Reset only the floating-window preference, never board or calculator data. */
export function clearCalculatorWindowPosition(storage){
 try{
  if(!storage?.removeItem)return false;
  storage.removeItem(CALCULATOR_WINDOW_POSITION_KEY);
  return true;
 }catch{return false;}
}

export function storeCalculatorWindowPosition(storage,position,width,height,viewportWidth,viewportHeight){
 try{
  if(!storage?.setItem)return false;
  const ratios=windowPositionRatios(position,width,height,viewportWidth,viewportHeight);
  storage.setItem(CALCULATOR_WINDOW_POSITION_KEY,JSON.stringify({v:1,...ratios}));
  return true;
 }catch{return false;}
}
