#!/usr/bin/env node
/* PLUS-015: MathIO structured template and viewport contracts.
 * Source-level simulator validation; no assertion of physical LCD parity.
 */
'use strict';
const assert=require('node:assert/strict');
const E=require('../js/structured-editor.js');
const V=require('../js/lcd-viewport.js');
const LCD=require('../js/display.js');
const expected=['fraction','mixed','power','exp10','recurring','squareRoot','cubeRoot',
 'nthRoot','logBase','derivative','integral','summation'];
assert.deepEqual([...E.types],expected);
let rendered=0;
function render(e,math=true,viewport={inputX:0,inputY:0}){
 const bytes=LCD.rasterize({power:true,mode:'COMP',screen:'edit',editor:e,math,viewport});
 assert.equal(bytes.length,192*62);
 assert.ok(bytes.some(Boolean),'template produces visible pixels');
 return bytes;
}
for(const type of expected){
 const e=E.create();
 E.template(e,type);
 assert.equal(e.root[0].type,type);
 assert.equal(E.isComplete(e),false,'empty template cannot calculate: '+type);
 for(const field of Object.keys(e.root[0].parts))
  e.root[0].parts[field]=[{type:'char',value:'2'}];
 assert.ok(E.isComplete(e),'filled template complete: '+type);
 const layout=V.layout(e,12,false);
 assert.ok(layout.width>0,'template width: '+type);
 assert.ok(Number.isFinite(layout.cursor.x),'cursor x: '+type);
 assert.ok(Number.isFinite(layout.cursor.y),'cursor y: '+type);
 render(e,true);render(e,false);rendered+=2;
}
// Inserting a fraction after a number captures that number as numerator.
const fraction=E.fromString('12');
E.template(fraction,'fraction');
assert.equal(E.cursor(fraction).path[0].field,'denominator');
assert.equal(E.serialize(fraction).includes('12'),true);
E.insert(fraction,'3');
assert.equal(E.serialize(fraction,true),'((12)/(3))');
assert.ok(E.navigate(fraction,'UP'));
assert.equal(E.cursor(fraction).path[0].field,'numerator');
assert.ok(E.navigate(fraction,'DOWN'));
assert.equal(E.cursor(fraction).path[0].field,'denominator');
render(fraction);
// Insertion into a nested radical must not erase existing values.
const nested=E.create();
E.template(nested,'squareRoot');
E.template(nested,'fraction');
E.insert(nested,'1');
E.navigate(nested,'RIGHT');
E.insert(nested,'2');
assert.ok(E.serialize(nested).includes('sqrt('));
render(nested);
// Cursor-following for long expressions must never exceed viewport bounds.
const long=E.fromString('1234567890'.repeat(15));
E.template(long,'fraction');E.insert(long,'3');
const view=V.follow(long,{x:0,y:0},12);
assert.ok(view.x>=0&&view.x<=Math.max(0,view.frame.width-96+8));
assert.ok(view.arrows.left,'left overflow arrow expected');
assert.ok(view.arrows.right,'right overflow arrow expected');
render(long,true,{inputX:view.x,inputY:view.y});
console.log('PLUS-015 PASS: '+rendered+' MathIO/LineIO template renders, fraction navigation, nesting and viewport clipping');
