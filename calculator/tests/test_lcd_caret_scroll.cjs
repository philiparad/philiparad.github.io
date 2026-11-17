/* CAL-018: measured nested caret coordinates and 2D viewport regression. */
'use strict';
const assert=require('node:assert/strict');
require('../js/lcd-viewport.js');
require('../js/display.js');
const lcd=require('../js/lcd-enhanced.js');
const templates={
 fraction:['numerator','denominator'],mixed:['integer','numerator','denominator'],
 squareRoot:['radicand'],cubeRoot:['radicand'],nthRoot:['index','radicand'],
 power:['exponent'],exp10:['exponent'],recurring:['period'],
 logBase:['base','argument'],derivative:['expression','at'],
 integral:['expression','lower','upper'],summation:['expression','lower','upper']
};
const ch=value=>({type:'char',value});
const node=(type,content=[ch('8'),ch('3')])=>({
 type,parts:Object.fromEntries(templates[type].map(key=>[key,content]))
});
const fakeCanvas=()=>{
 const moves=[],ctx={
  font:'',save(){},restore(){},scale(){},beginPath(){},rect(){},clip(){},
  fillRect(){},strokeRect(){},fillText(){},stroke(){},lineTo(){},
  moveTo(x,y){moves.push({x,y})},bezierCurveTo(){},
  createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)}},
  putImageData(){},measureText(value){
   return {width:[...String(value)].reduce((n,c)=>n+(c==='W'?7:c==='i'?2:5.4),0)};
  }
 };return {width:960,height:310,moves,getContext(){return ctx}};
};
const state=(root,path,offset,viewport={inputX:0,inputY:0})=>({
 power:true,mode:'COMP',math:true,screen:'edit',contrast:5,
 input:'',result:'',editor:{root,path,offset},viewport
});
const near=(a,b,description)=>assert.ok(Math.abs(a-b)<.02,
 description+': '+a+' != '+b);
let passed=0;
for(const type of Object.keys(templates)){
 const root=[ch('W'),node(type),ch('i')],ctx=fakeCanvas().getContext();
 for(const field of templates[type]){
  const path=[{index:1,field}];
  for(const offset of [0,1,2]){
   const editor={root,path,offset};
   const expected=lcd.locateCaret(ctx,root,editor);
   assert.ok(expected&&Number.isFinite(expected.x)&&Number.isFinite(expected.y),
    type+'/'+field+' caret must resolve');
   const canvas=fakeCanvas();
   assert.equal(lcd.draw(canvas,state(root,path,offset)),'enhanced');
   const last=canvas.moves.at(-1);
   assert.ok(last,'caret must draw as the last vector path');
   const box=lcd.measureNodes(root,0,ctx);
   const fits=box.ascent+box.descent<=27;
   const preferred=Math.max(box.ascent+1,11);
   let baseline=fits?Math.min(29.2-box.descent,
    Math.max(2.2+box.ascent,preferred)):preferred;
   if(!fits)baseline=lcd.followCaretVertical(baseline,expected.y);
   const scroll=lcd.followCaret(0,expected.x,box.width);
   near(last.x,expected.x-scroll,type+'/'+field+' x');
   near(last.y+5.5,expected.y+baseline,type+'/'+field+' y');
   passed++;
  }
 }
}
const thirty=Array.from({length:30},()=>ch('8'));
const root=[ch('W'),node('squareRoot',thirty),ch('i')];
for(const offset of [0,1,5,15,25,30]){
 const editor={root,path:[{index:1,field:'radicand'}],offset};
 const viewport={inputX:offset*3,inputY:0};
 const canvas=fakeCanvas();
 assert.equal(lcd.draw(canvas,state(root,editor.path,offset,viewport)),'enhanced');
 const caret=canvas.moves.at(-1);
 assert.ok(caret.x>=4.9&&caret.x<=90.1,
  'long radicand caret '+offset+' should follow horizontally: '+caret.x);
 passed++;
}
for(const type of ['fraction','integral','summation']){
 const root=[node(type)];
 const fields=templates[type];
 for(const field of fields){
  const editor={root,path:[{index:0,field}],offset:1};
  const verticalCanvas=fakeCanvas();
  lcd.draw(verticalCanvas,state(root,editor.path,editor.offset));
  const anchor=verticalCanvas.moves.at(-1);
  assert.ok(anchor.y>=2.0&&anchor.y+6.7<=29.6,
   'field '+type+'/'+field+' caret stroke must fit within LCD: '+JSON.stringify(anchor));
  passed++;
 }
}
// A deeply nested field can exceed the screen height; auto follow must bring
// its caret back, without mutating the controller's legacy viewport.
let deep=node('fraction');
for(let i=0;i<4;i++)deep=node('squareRoot',[deep]);
const deepPath=[{index:0,field:'radicand'},{index:0,field:'radicand'},
 {index:0,field:'radicand'},{index:0,field:'radicand'},
 {index:0,field:'denominator'}];
const tall=[deep],viewport={inputX:0,inputY:0};
const tallCanvas=fakeCanvas();
lcd.draw(tallCanvas,state(tall,deepPath,0,viewport));
const vertical=tallCanvas.moves.at(-1);
assert.ok(vertical.y-5.5>=2.0&&vertical.y+1.2<=29.6,
 'deep nested denominator caret auto follows vertically');
assert.equal(viewport.inputY,0,'renderer may not modify viewport state');
passed++;
// SHIFT+arrow panning is intentional; never auto-snap back to insertion.
const manual={inputX:48,inputY:10,manualPan:true};
const manualCanvas=fakeCanvas();
lcd.draw(manualCanvas,state(root,[{index:1,field:'radicand'}],30,manual));
const manualCaret=manualCanvas.moves.at(-1);
assert.ok(manualCaret.x>90,'manual pan keeps insertion caret off-screen');
assert.equal(manual.manualPan,true);
passed++;
// Very deep/malformed paths fail safely rather than inventing positions.
assert.equal(lcd.locateCaret(fakeCanvas().getContext(),[ch('8')],
 {root:[ch('8')],path:[{index:0,field:'radicand'}],offset:0}),null);
passed++;
console.log('PASS: '+passed+' CAL-018 nested caret, vertical follow, manual pan and scroll cases');
