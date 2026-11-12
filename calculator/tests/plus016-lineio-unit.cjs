#!/usr/bin/env node
/* PLUS-016: LineIO entry, cursor, overwrite, fraction, horizontal clipping.
 * Simulator unit test only; physical keylogs and browser replay are separate.
 */
'use strict';
const assert=require('node:assert/strict');
const E=require('../js/structured-editor.js');
const V=require('../js/lcd-viewport.js');
const LCD=require('../js/display.js');
const I=require('../js/lcd-indicators.js');
let cases=0;
function verify(label,fn){fn();cases++;}
verify('midline insertion and deletion',()=>{
 const e=E.fromString('12345');e.offset=2;E.insert(e,'9');
 assert.equal(E.serialize(e),'129345');assert.equal(E.cursor(e).offset,3);
 assert.ok(E.backspace(e));assert.equal(E.serialize(e),'12345');
 assert.equal(E.cursor(e).offset,2);
});
verify('insert versus overwrite',()=>{
 const e=E.fromString('12345');e.offset=2;E.insert(e,'9',true);
 assert.equal(E.serialize(e),'12945');
 assert.ok(E.undo(e));assert.equal(E.serialize(e),'12345');
});
verify('literal cursor traversal',()=>{
 const e=E.fromString('12345');e.offset=3;
 assert.ok(E.navigate(e,'LEFT'));assert.equal(E.cursor(e).offset,2);
 assert.ok(E.navigate(e,'RIGHT'));assert.equal(E.cursor(e).offset,3);
});
verify('linear fraction and field traversal',()=>{
 const e=E.fromString('12');E.template(e,'fraction');E.insert(e,'3');
 assert.equal(E.serialize(e,true),'((12)/(3))');
 assert.ok(E.navigate(e,'UP'));assert.equal(E.cursor(e).path.at(-1).field,'numerator');
 assert.ok(E.navigate(e,'DOWN'));assert.equal(E.cursor(e).path.at(-1).field,'denominator');
});
verify('long entry follows cursor without exceeding visible range',()=>{
 const data='1234567890'.repeat(8);
 for(const cursor of [0,1,5,22,23,24,40,60,79,80]){
  const window=V.linearWindow(data,cursor,23);
  assert.ok(window.start>=0&&window.end<=data.length);
  assert.ok(cursor>=window.start&&cursor<=window.end);
  assert.equal(window.left,window.start>0);
  assert.equal(window.right,data.length>window.end);
 }
});
verify('linear result render and horizontal clipping',()=>{
 const make=(screen,input,result,viewport)=>{
  const p=LCD.rasterize({power:true,mode:'COMP',math:false,screen,input,
   cursor:input.length,result,viewport});
  assert.equal(p.length,192*62);
  assert.ok(p.some(Boolean));return p;
 };
 const a=make('result','1+2','3',{inputX:0,resultX:0});
 assert.deepEqual(a,make('result','1+2','3',{inputX:0,resultX:0}));
 const b=make('result','123456789'.repeat(6),'987654321'.repeat(6),
  {inputX:80,resultX:30});
 assert.notDeepEqual(a,b);
});
verify('LineIO annunciator absent even with non-COMP mode',()=>{
 const s={power:true,mode:'COMP',screen:'edit',math:false,angle:'DEG',
  memory:{M:0},history:[],storedInputs:[]};
 assert.equal(I.derive(s).math,'');
});
console.log('PLUS-016 PASS: '+cases+' linear editor, cursor, overwrite, fraction, viewport, LCD result contracts (unit-only)');
