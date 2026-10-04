import test from 'node:test';
import assert from 'node:assert/strict';
import {SpeedInk} from '../js/speed-ink.js';
function stroke(speed,interval=10,zoom=1){
 const ink=new SpeedInk([0,0],0,zoom),values=[];
 for(let t=interval;t<=400;t+=interval)values.push(ink.add([speed*t/zoom,0],t));
 return values;
}
test('slow movement is thicker than fast movement within restrained bounds',()=>{
 const slow=stroke(.08),fast=stroke(2);
 assert.ok(slow.at(-1)>fast.at(-1)+.2);
 for(const v of [...slow,...fast])assert.ok(v>=.25&&v<=.65);
 for(let k=1;k<fast.length;k++)assert.ok(Math.abs(fast[k]-fast[k-1])<.06);
});
test('width is stable across event rates and viewport zoom',()=>{
 for(const speed of [.08,.5,2]){
  assert.ok(Math.abs(stroke(speed,5).at(-1)-stroke(speed,20).at(-1))<1e-12);
  assert.deepEqual(stroke(speed,10,.25),stroke(speed,10,4));
 }
});
test('taps, missing timestamps, reversed clocks and long pauses remain finite',()=>{
 const ink=new SpeedInk([0,0],100);
 assert.equal(ink.add([0,0],120),.5);
 assert.equal(ink.add([10,0],120),.5);
 assert.equal(ink.add([20,0],110),.5);
 assert.equal(ink.add([30,0],NaN),.5);
 const before=ink.value,after=ink.add([31,0],100000);
 assert.ok(after>before&&after-before<.1);
 const missing=new SpeedInk([0,0]);assert.equal(missing.add([10,0],10),.5);
 assert.ok(Number.isFinite(missing.add([20,0],20)));
});
