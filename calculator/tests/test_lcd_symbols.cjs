/* Run: node calculator/tests/test_lcd_symbols.cjs
 * Deterministic LCD integration tests; no browser required.
 * The tests check rendering, not manufacturer hardware parity.
 */
'use strict';
const assert = require('node:assert/strict');
require('../js/lcd-viewport.js');
const lcd = require('../js/display.js');
const structuredEditor = require('../js/structured-editor.js');

const fieldsByType = {
  fraction:['numerator','denominator'],
  mixed:['integer','numerator','denominator'],
  squareRoot:['radicand'],
  cubeRoot:['radicand'],
  nthRoot:['index','radicand'],
  power:['exponent'],
  exp10:['exponent'],
  recurring:['period'],
  logBase:['base','argument'],
  derivative:['expression','at'],
  integral:['expression','lower','upper'],
  summation:['expression','lower','upper']
};
const makeNode = (type, filled=false) => ({
  type,
  parts: Object.fromEntries(fieldsByType[type].map(name => [
    name, filled ? [{type:'char',value:'2'}] : []
  ]))
});
const makeState = (root=[],options={}) => ({
  power:true, mode:'COMP', screen:'edit', math:true, contrast:5,
  input:'', result:'0', editor:{root,path:[],offset:0},
  viewport:{inputX:0,inputY:0,resultX:0}, ...options
});
const size = lcd.width*lcd.height;
const draw = state => {
  const frame=lcd.rasterize(state);
  assert.equal(frame.length,size,'LCD dimensions');
  assert.ok(frame.every(v=>v===0||v===1),'LCD must remain a 1-bit pixel matrix');
  return frame;
};
const hasInk = pixels=>pixels.some(Boolean);
const px = (pixels,x,y)=>pixels[y*lcd.width+x];
let cases=0;

// Every structured input: empty/filled, MathIO/LineIO, editing/result, with
// distinct outputs between an actual input value and its empty field.
for(const type of Object.keys(fieldsByType)){
  for(const math of [true,false]){
    for(const screen of ['edit','result']){
      const empty=draw(makeState([makeNode(type)],{math,screen,input:math?'':'?'}));
      const filled=draw(makeState([makeNode(type,true)],{math,screen,input:math?'':'2'}));
      assert.ok(hasInk(empty)&&hasInk(filled),type+' must be visible');
      assert.notDeepEqual(empty,filled,type+' must distinguish slot from value');
      assert.deepEqual(draw(makeState([makeNode(type)],{math,screen,input:math?'':'?'})),empty,
        type+' deterministic rendering');
      cases+=2;
    }
  }
}

// Expected native-style 7x11 bitmap slot: small hollow outline, with a
// one-pixel border and no artificial thick rectangle.
const root=draw(makeState([makeNode('squareRoot')]));
for(const [x,y] of [[17,27],[21,27],[17,34],[21,34]]) {
  assert.equal(px(root,x,y),1,'slot outline '+x+','+y);
}
assert.equal(px(root,19,30),0,'slot is hollow');
assert.equal(px(root,0,24),1,'root-level cursor remains visible');
cases++;

// Nested expressions, mixed content, and clipping/scrolling.
const nested=makeNode('fraction');
nested.parts.numerator=[makeNode('squareRoot')];
nested.parts.denominator=[{type:'char',value:'7'},makeNode('power')];
for(const screen of ['edit','result']){
  for(const shift of [0,12,48]){
    const frame=draw(makeState([nested],{screen,viewport:{inputX:shift,inputY:0}}));
    assert.ok(hasInk(frame),'nested expression must draw');
    cases++;
  }
}
for(const type of Object.keys(fieldsByType)){
  const node=makeNode(type,true);
  const input=[{type:'char',value:'2'},node,{type:'char',value:'+'},{type:'char',value:'3'}];
  assert.ok(hasInk(draw(makeState(input))),'mixed expression '+type);
  cases++;
}

// Verify the entire high-resolution text atlas is accepted as input,
// including Greek symbols, comparisons, mathematical operators and arrows.
for(const ch of Object.keys(lcd.highFont)){
  assert.ok(hasInk(draw(makeState([],{input:ch,editor:null}))),
    'high-resolution glyph must draw: '+ch);
  cases++;
}

// All manufacturer-supported modes must draw input without throwing.
for(const mode of ['COMP','CMPLX','STAT','BASE-N','EQN','MATRIX','TABLE','VECTOR']){
  for(const input of ['', '2+3', 'sqrt(9)', '1/2']){
    const frame=draw(makeState([],{mode,input}));
    assert.ok(frame.length===size,'mode '+mode);
    cases++;
  }
}

// Exercise real editor insertion, typing, and undo for every template.
// These are not manufactured editor JSON snapshots: they follow production APIs.
for(const type of structuredEditor.types){
  const editor=structuredEditor.create();
  structuredEditor.template(editor,type);
  const blank=draw(makeState([],{editor}));
  structuredEditor.insert(editor,'2');
  const typed=draw(makeState([],{editor}));
  assert.notDeepEqual(blank,typed,'editor insertion must update LCD for '+type);
  assert.ok(structuredEditor.undo(editor),'undo available for '+type);
  assert.deepEqual(draw(makeState([],{editor})),blank,'undo restores LCD for '+type);
  cases+=3;
}

// Off state, contrast settings, and the physical presentation canvas.
assert.ok(!hasInk(draw(makeState([],{power:false}))));
cases++;
for(let contrast=0;contrast<=9;contrast++){
  const frame=draw(makeState([makeNode('squareRoot')],{contrast}));
  assert.ok(hasInk(frame),'contrast '+contrast);
  cases++;
}
let image=null;
const canvas={
  width:960,height:310,
  getContext:()=>({
    createImageData:(w,h)=>image={width:w,height:h,data:new Uint8ClampedArray(w*h*4)},
    putImageData:()=>{}
  })
};
lcd.draw(canvas,makeState([makeNode('squareRoot')]));
assert.equal(image.width,960);
assert.equal(image.height,310);
const colorAt=(x,y)=>Array.from(image.data.slice((y*960+x)*4,(y*960+x)*4+4));
assert.deepEqual(colorAt(85,135),colorAt(89,139),
  'individual lit pixels must not have artificial 5x5 edge stripes');
cases++;
console.log('PASS: '+cases+' LCD input and display cases, '+Object.keys(fieldsByType).length+' structured input types.');
