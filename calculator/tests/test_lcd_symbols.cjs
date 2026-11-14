/* LCD geometry regression suite — run with: node calculator/tests/test_lcd_symbols.cjs
 * Pure Node.js: independent of browser, test runner, calculator state engine.
 */
'use strict';
const assert = require('node:assert/strict');
require('../js/lcd-viewport.js');
const lcd = require('../js/display.js');
const size = lcd.width * lcd.height;
const part = (type, fields) => ({type, parts:Object.fromEntries(fields.map(name=>[name,[]]))});
const variants = [
 ['fraction', ['numerator','denominator']],
 ['mixed', ['integer','numerator','denominator']],
 ['squareRoot', ['radicand']], ['cubeRoot', ['radicand']],
 ['nthRoot', ['index','radicand']], ['power', ['exponent']],
 ['exp10', ['exponent']], ['recurring', ['period']],
 ['logBase', ['base','argument']],
 ['derivative', ['expression','at']],
 ['integral', ['expression','lower','upper']],
 ['summation', ['expression','lower','upper']]
];
function state(root,screen='edit') {
 return {
  power:true,mode:'COMP',screen,math:true,contrast:5,
  input:'',result:'0',editor:{root,path:[],offset:0},
  viewport:{inputX:0,inputY:0}
 };
}
function raster(node,screen='edit'){
 const frame=lcd.rasterize(state([node],screen));
 assert.equal(frame.length,size);
 assert.ok(frame.some(x=>x!==0),node.type+' must render visible pixels');
 assert.ok(frame.every(x=>x===0||x===1),'LCD raster must be binary');
 return frame;
}
for(const [type,fields] of variants){
 const node=part(type,fields);
 const empty=raster(node);
 const filled=part(type,fields);
 for(const field of fields)filled.parts[field]=[{type:'char',value:'2'}];
 const populated=raster(filled);
 assert.notDeepEqual(empty,populated,type+' must distinguish empty and filled fields');
 assert.deepEqual(raster(node),empty,type+' must render deterministically');
}
const root=raster(part('squareRoot',['radicand']));
const pixel=(frame,x,y)=>frame[y*lcd.width+x];
// First empty field at logical x=7 and y=12; outline is at x+1..5/y+1..6.
// The caret is left of the outlined slot, so neither element appears as a
// single merged L-shaped placeholder.
assert.equal(pixel(root,16,26),1,'outlined placeholder top-left');
assert.equal(pixel(root,24,26),1,'outlined placeholder top-right');
assert.equal(pixel(root,24,36),1,'outlined placeholder bottom-right');
assert.equal(pixel(root,16,36),1,'outlined placeholder bottom-left');
assert.equal(pixel(root,0,24),1,'independent root-level edit caret');
console.log('LCD symbol geometry: '+variants.length+' structured types passed.');
