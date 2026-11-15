import test from 'node:test';
import assert from 'node:assert/strict';
import {clampFloatingWindowPosition,initialFloatingWindowPosition,
 CALCULATOR_WINDOW_MARGIN} from '../js/calculator-window-position.js';

test('floating calculator starts near right edge and remains within viewport',()=>{
 assert.deepEqual(initialFloatingWindowPosition(374,812,1440,900),{x:1046,y:70});
 assert.deepEqual(initialFloatingWindowPosition(302,660,375,720),{x:53,y:52});
});
test('dragging calculator clamps to every viewport edge',()=>{
 const clamp=(x,y)=>clampFloatingWindowPosition(x,y,374,812,1440,900);
 assert.deepEqual(clamp(-500,-100),{x:8,y:8});
 assert.deepEqual(clamp(9999,9999),{x:1058,y:80});
 assert.deepEqual(clamp(420,25),{x:420,y:25});
 assert.equal(CALCULATOR_WINDOW_MARGIN,8);
});
test('calculator remains visible after viewport shrink and resize',()=>{
 const old={x:1046,y:70};
 const resized=clampFloatingWindowPosition(old.x,old.y,302,660,375,720);
 assert.deepEqual(resized,{x:65,y:52});
});
