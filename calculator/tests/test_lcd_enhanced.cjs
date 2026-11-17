/* High-resolution LCD structural and drawing regression.
 * node calculator/tests/test_lcd_enhanced.cjs
 */
'use strict';
const assert=require('node:assert/strict');
require('../js/lcd-viewport.js');
const legacy=require('../js/display.js');
const editor=require('../js/structured-editor.js');
const lcd=require('../js/lcd-enhanced.js');
const fields={
 fraction:['numerator','denominator'],mixed:['integer','numerator','denominator'],
 squareRoot:['radicand'],cubeRoot:['radicand'],nthRoot:['index','radicand'],
 power:['exponent'],exp10:['exponent'],recurring:['period'],
 logBase:['base','argument'],derivative:['expression','at'],
 integral:['expression','lower','upper'],summation:['expression','lower','upper']
};
const node=(type,filled=false)=>({type,parts:Object.fromEntries(fields[type].map(key=>[key,filled?[{type:'char',value:'2'}]:[]]))});
const state=(root,options={})=>({
 power:true,mode:'COMP',screen:'edit',math:true,contrast:5,
 editor:{root,path:[],offset:0},viewport:{inputX:0,inputY:0},
 input:'',result:'0',...options
});
const makeCanvas=()=>{
 const ops=[];
 const ctx={
  createImageData:(w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4)}),
  putImageData:()=>ops.push('legacy'),save:()=>ops.push('save'),
  restore:()=>ops.push('restore'),scale:()=>{},beginPath:()=>{},
  rect:()=>{},clip:()=>{},fillRect:()=>ops.push('fill'),
  moveTo:()=>{},lineTo:()=>{},stroke:()=>ops.push('vector'),
  fillText:()=>ops.push('text'),strokeRect:()=>ops.push('slot'),
  bezierCurveTo:()=>ops.push('curve')
 };
 return {width:960,height:310,getContext:()=>ctx,ops};
};
let tested=0;
for(const type of Object.keys(fields)){
 for(const filled of [false,true]){
  const exp=[node(type,filled)];
  const s=state(exp),layout=lcd.measureNodes(exp);
  assert.ok(layout.width>0&&layout.ascent>=0&&layout.descent>=0,type);
  assert.ok(Number.isFinite(layout.width)&&Number.isFinite(layout.ascent),type);
  assert.equal(lcd.supported(s),true,type);
  const canvas=makeCanvas();
  assert.equal(lcd.draw(canvas,s),'enhanced',type);
  assert.ok(canvas.ops.includes('legacy')&&canvas.ops.includes('fill')&&canvas.ops.includes('vector')||
    canvas.ops.includes('legacy')&&canvas.ops.includes('fill')&&canvas.ops.includes('text'),type);
  tested++;
 }
 const ed=editor.create();
 editor.template(ed,type);
 const blank=lcd.measureNodes(ed.root);
 editor.insert(ed,'7');
 const entered=lcd.measureNodes(ed.root);
 assert.ok(entered.width>0&&blank.width>0,type);
 const draw=makeCanvas();
 assert.equal(lcd.draw(draw,state(ed.root,{editor:ed})),'enhanced');
 tested++;
}
const nested=node('fraction');
nested.parts.numerator=[node('squareRoot',true)];
nested.parts.denominator=[node('integral',true)];
for(const inputY of [0,4,10,20]){
 const canvas=makeCanvas();
 assert.equal(lcd.draw(canvas,state([nested],{viewport:{inputX:0,inputY}})),'enhanced');
 tested++;
}
for(const mode of ['COMP','CMPLX','STAT','BASE-N','EQN','MATRIX','TABLE','VECTOR']){
 const canvas=makeCanvas();
 const s=state([node('fraction')],{mode});
 assert.equal(lcd.draw(canvas,s),lcd.supported(s)||legacy.getTextRuns(s).length?'enhanced':'authentic');
 tested++;
}
for(const screen of ['menu','prompt','error','table-grid','flow-result']){
 const canvas=makeCanvas();
 const fallback=state([node('squareRoot')],{
  screen,menu:[],menuEntries:[],menuPage:0,menuPageSize:6,menuTitle:'MODE',
  flow:{title:'TEST',fields:[{id:'value',label:'X'}],index:0,buffer:''},
  error:'Math ERROR',outputLines:[],outputPage:0
 });
 assert.equal(lcd.draw(canvas,fallback),legacy.getTextRuns(fallback).length?'enhanced':'authentic');
 tested++;
}
// High-resolution answer line is independent of whether the input
// expression contains a structured editor node. This guards the 4√6 case.
for(const chosen of [
 {kind:'surd',text:'4√6'},
 {kind:'surd',text:'√2+3√5'},
 {kind:'pi',text:'2π'},
 {kind:'decimal',text:'12345.6789'},
 {kind:'fraction',text:'7/12',numerator:'7',denominator:'12'},
 {kind:'mixed',text:'2 1/3',integer:'2',numerator:'1',denominator:'3'},
 {kind:'recurring',text:'0.123',initial:'0.1',period:'23'}
]){
 const answer=state([],{screen:'result',result:chosen.text,
   resultPresentation:{chosen},editor:{root:[],path:[],offset:0}});
 assert.ok(lcd.resultModel(answer),'result recognized: '+chosen.text);
 const surface=makeCanvas();
 assert.equal(lcd.draw(surface,answer),'enhanced',chosen.text);
 assert.ok(surface.ops.includes('fill')&&surface.ops.includes('text'),
   'result raster overlay and vector text: '+chosen.text);
 if(chosen.kind==='surd'||chosen.kind==='fraction')
  assert.ok(surface.ops.includes('vector'),'vector geometry: '+chosen.text);
 tested++;
}
// Unsupported mathematical result models keep their original layout, while
// the shared high-resolution text layer still replaces visible glyphs.
for(const extra of [
 {result:'1234567890123456789012345',resultPresentation:null},
 {result:'3√2',viewport:{inputX:0,inputY:0,resultX:3}},
 {result:'8',mode:'BASE-N'},
 {result:'8',math:false}
]){
 const fallback=state([],{screen:'result',...extra});
 assert.equal(lcd.resultModel(fallback),null);
 const surface=makeCanvas();
 assert.equal(lcd.draw(surface,fallback),legacy.getTextRuns(fallback).length?'enhanced':'authentic');
 tested++;
}
// Nested caret traversal: instrument vectors and verify the caret follows
// the current field/offset, not the start of the complete expression.
{
 const editorState=editor.create();
 editor.template(editorState,'fraction');
 editor.insert(editorState,'3');
 const points=[];
 const canvas=makeCanvas();
 const context=canvas.getContext();
 context.moveTo=(x,y)=>points.push([x,y]);
 const rendering=state(editorState.root,{editor:editorState});
 assert.equal(lcd.draw(canvas,rendering),'enhanced');
 assert.ok(points.some(p=>p[0]>0),'nested caret drawn at field coordinate');
 tested++;
}
// Legacy viewport offsets must map into measured glyph coordinates without
// switching away from the enhanced renderer during horizontal scrolling.
{
 const many=[...Array.from({length:40},()=>({type:'char',value:'8'})),node('fraction')];
 const original=makeCanvas();
 assert.equal(lcd.draw(original,state(many,{viewport:{inputX:30,inputY:0}})),'enhanced');
 tested++;
}
// For unequal browser glyph widths, ensure monotonic piecewise mapping at
// every character boundary, including a multi-field fraction after text.
{
 const root=[{type:'char',value:'W'},{type:'char',value:'i'},node('fraction',true)];
 const canvas=makeCanvas(),ctx=canvas.getContext();
 ctx.measureText=c=>({width:c==='W'?7:c==='i'?2:5});
 assert.equal(lcd.scrollOffset(root,0,ctx),0);
 assert.ok(Math.abs(lcd.scrollOffset(root,4,ctx)-7)<1e-6);
 assert.ok(Math.abs(lcd.scrollOffset(root,8,ctx)-9)<1e-6);
 const offsets=[0,2,4,6,8,10,12,16].map(x=>lcd.scrollOffset(root,x,ctx));
 assert.ok(offsets.every(Number.isFinite),'finite scroll mapping');
 assert.ok(offsets.every((v,i)=>i===0||v>=offsets[i-1]),
  'scroll offsets remain monotone across node boundaries');
 tested+=4;
}
// The actual first vector glyph must move by the mapped scroll distance.
// Measuring only the helper would miss draw() accidentally ignoring it.
{
 const root=[{type:'char',value:'W'},{type:'char',value:'i'},node('fraction',true)];
 const positions=[];
 for(const oldOffset of [0,4,8]){
  const canvas=makeCanvas(),ctx=canvas.getContext(),glyphs=[];
  ctx.measureText=value=>({width:value==='W'?7:value==='i'?2:5});
  ctx.fillText=(value,x)=>glyphs.push({value,x});
  const view=state(root,{viewport:{inputX:oldOffset,inputY:0,manualPan:true}});
  assert.equal(lcd.draw(canvas,view),'enhanced');
  const first=glyphs.findLast(v=>v.value==='W');
  assert.ok(first,'first glyph is present in measured layout');
  positions.push(first.x);
 }
 assert.ok(Math.abs(positions[0]-positions[1]-7)<1e-6,
  'first scroll moves text by measured first glyph width');
 assert.ok(Math.abs(positions[1]-positions[2]-2)<1e-6,
  'second scroll moves text by measured second glyph width');
 tested+=2;
}
// Clip-safe baseline is finite for deeply nested expressions.
{
 let deep=node('squareRoot');
 for(let i=0;i<7;i++) {
  const parent=node('squareRoot');
  parent.parts.radicand=[deep];
  deep=parent;
 }
 const canvas=makeCanvas();
 assert.equal(lcd.draw(canvas,state([deep])),'enhanced');
 tested++;
}
// Fraction measurement must include the actual numerator and denominator
// baseline offsets; otherwise nested fraction tops can be clipped.
{
 const fraction=node('fraction',true);
 const m=lcd.measure(fraction);
 const num=lcd.measureNodes(fraction.parts.numerator);
 const den=lcd.measureNodes(fraction.parts.denominator);
 assert.ok(m.ascent>=4+num.ascent+num.descent,
   'fraction ascent covers numerator glyph bounds');
 assert.ok(m.descent>=4+den.ascent+den.descent,
   'fraction descent covers denominator glyph bounds');
 tested+=2;
}
// Result numerator is higher than an ordinary answer. Assert the fraction
// overlay clips high enough to preserve it, without lifting decimal results.
for(const chosen of [
 {kind:'fraction',text:'7/12',numerator:'7',denominator:'12',maxTop:15},
 {kind:'mixed',text:'2 1/3',integer:'2',numerator:'1',denominator:'3',maxTop:15},
 {kind:'decimal',text:'45',maxTop:18}
]){
 const canvas=makeCanvas(),ctx=canvas.getContext();
 const regions=[];
 ctx.rect=(x,y,w,h)=>regions.push({x,y,w,h});
 const resultState=state([],{screen:'result',result:chosen.text,
  resultPresentation:{chosen}});
 assert.equal(lcd.draw(canvas,resultState),'enhanced');
 assert.ok(regions.some(r=>r.y<=chosen.maxTop&&r.y>=14),
  'result crop must accommodate '+chosen.kind);
 tested++;
}
// Layout must honor the actual Canvas font metrics where available, rather
// than assuming all Windows browsers use the same fixed-width glyph advance.
{
 const surface=makeCanvas(),ctx=surface.getContext();
 const measured=[],painted=[];
 ctx.measureText=value=>{measured.push(String(value));return {width:String(value).length*5.5}};
 ctx.fillText=(value,x,y)=>painted.push({value:String(value),x,y});
 const sample=state([],{screen:'result',result:'123.45',
  resultPresentation:{chosen:{kind:'decimal',text:'123.45'}}});
 assert.equal(lcd.draw(surface,sample),'enhanced');
 assert.ok(measured.includes('123.45'),'Canvas measures real displayed result');
 const rendered=painted.find(x=>x.value==='123.45');
 assert.ok(rendered&&Math.abs(rendered.x-(96-6*5.5-1.5))<0.001,
  'result aligns to the actual measured text width');
 tested++;
}
// Input text must use active Canvas metrics, including the root-level caret
// and neighboring structured nodes; static fallback metrics remain available.
{
 const glyphs=[{type:'char',value:'W'},{type:'char',value:'i'},node('squareRoot',true)];
 const surface=makeCanvas(),ctx=surface.getContext();
 const seen=[],strokes=[];
 ctx.measureText=value=>({width:value==='W'?7:value==='i'?2:String(value).length*5});
 ctx.fillText=(value,x,y)=>seen.push({value:String(value),x,y});
 ctx.moveTo=(x,y)=>strokes.push({x,y});
 const ed={root:glyphs,path:[],offset:2};
 assert.equal(lcd.draw(surface,state(glyphs,{editor:ed})),'enhanced');
 const w=seen.findLast(v=>v.value==='W'),i=seen.findLast(v=>v.value==='i');
 assert.ok(w&&i&&Math.abs(i.x-(w.x+7))<0.0001,
  'second glyph follows measured seven-unit first glyph');
 assert.ok(strokes.some(p=>Math.abs(p.x-9)<0.0001),
  'root caret follows measured glyph widths');
 assert.ok(Math.abs(lcd.measureNodes(glyphs,0,ctx).width-
   (7+2+lcd.measure(glyphs[2],0,ctx).width))<0.0001,
  'structured expression measurement uses the same live font metrics');
 tested+=3;
}
// The enhanced viewport must independently follow long nested-field cursors
// after measuring real glyph advances. The controller may still provide its
// legacy scroll offset, including zero for a freshly inserted expression.
{
 const letters=Array.from({length:30},()=>({type:'char',value:'8'}));
 const root=[{type:'squareRoot',parts:{radicand:letters}}];
 const surface=makeCanvas(),ctx=surface.getContext(),movements=[];
 ctx.measureText=()=>({width:5.4});
 ctx.moveTo=(x,y)=>movements.push({x,y});
 const ed={root,path:[{index:0,field:'radicand'}],offset:letters.length};
 assert.equal(lcd.draw(surface,state(root,{editor:ed,
  viewport:{inputX:0,inputY:0}})),'enhanced');
 assert.ok(surface.ops.filter(op=>op==='fill').length>=2,
  'long nested cursor triggers a corrected second draw pass');
 const cursor=movements[movements.length-1];
 assert.ok(cursor.x>=5&&cursor.x<=90,
  'nested insertion caret remains inside the safe visible LCD region');
 tested+=2;
}
for(const item of [
 {scroll:30,caret:95,width:180,expected:35},
 {scroll:60,caret:1,width:180,expected:56},
 {scroll:0,caret:70,width:80,expected:0},
 {scroll:20,caret:30,width:180,expected:20}
]){
 assert.ok(Math.abs(lcd.followCaret(item.scroll,item.caret,item.width)-item.expected)<0.0001,
  'cursor following respects viewport boundaries');
 tested++;
}
// SHIFT-arrow manual pan must remain independent of automatic caret follow.
// A user can intentionally move the display away from the insertion point.
{
 const root=[...Array.from({length:30},()=>({type:'char',value:'8'})),node('fraction',true)];
 const manuallyPanned=makeCanvas(),ctx=manuallyPanned.getContext(),glyphs=[];
 ctx.fillText=(value,x)=>glyphs.push({value,x});
 const viewport={inputX:48,inputY:0,manualPan:true};
 const ed={root,path:[],offset:0};
 assert.equal(lcd.draw(manuallyPanned,state(root,{editor:ed,viewport})),'enhanced');
 const first=glyphs.filter(g=>g.value==='8').reduce((left,g)=>!left||g.x<left.x?g:left,null);
 assert.ok(first&&Math.abs(first.x+lcd.scrollOffset(root,48,ctx))<0.0001,
  'manual pan retains its requested viewport offset');
 assert.equal(viewport.manualPan,true,'rendering does not mutate user pan state');
 tested+=2;
}
// Root-index glyphs must remain inside their computed radical box.
for(const type of ['cubeRoot','nthRoot']){
 const exp=node(type,true),box=lcd.measure(exp);
 const surface=makeCanvas(),ctx=surface.getContext();
 const glyphs=[],lines=[];
 ctx.fillText=(value,x,y)=>glyphs.push({value:String(value),x,y});
 ctx.moveTo=(x,y)=>lines.push({x,y});
 const view=state([exp],{editor:{root:[exp],path:[],offset:1}});
 assert.equal(lcd.draw(surface,view),'enhanced');
 const index=glyphs.find(g=>g.value==='3'||g.value==='2');
 assert.ok(index,'root index glyph is rendered');
 // The first roof line is at the top of the box; the index must not begin
 // above it, allowing one logical pixel of anti-alias margin.
 const roof=lines.find(p=>p.y<30);
 assert.ok(Number.isFinite(box.ascent)&&box.ascent>10);
 assert.ok(index.y-5.9>=-0.5,
  'root index is not clipped by the LCD top edge');
 tested++;
}
// Sum/integral vertical extents must cover upper and lower field baselines.
for(const type of ['integral','summation']){
 const exp=node(type,true),b=lcd.measure(exp);
 const up=lcd.measureNodes(exp.parts.upper),low=lcd.measureNodes(exp.parts.lower);
 assert.ok(b.ascent>=12+up.ascent,'upper limit bounds are measured');
 assert.ok(b.descent>=12+low.descent,'lower limit bounds are measured');
 tested++;
}
// The enhanced ink palette must exactly match the legacy LCD's approved
// contrast mapping (including its level-five default).
for(let level=0;level<=9;level++){
 const base=[29,40,34],pale=[135,151,134],dark=[7,17,12];
 const from=level<=5?pale:base,to=level<=5?base:dark;
 const ratio=level<=5?level/5:(level-5)/4;
 const expected='rgb('+from.map((v,i)=>Math.round(v+(to[i]-v)*ratio)).join(',')+')';
 assert.equal(lcd.ink(null,{contrast:level}),expected,
  'vector contrast matches legacy palette at level '+level);
 tested++;
}
assert.equal(lcd.ink(null,{}),'rgb(29,40,34)');
tested++;
// Engineering notation must use a raised, smaller Canvas exponent, not a
// literal caret in the LCD answer line. Reject malformed variants safely.
for(const notation of [
 {text:'1.23×10^4',body:'1.23×10',exponent:'4'},
 {text:'-2.5×10^-3',body:'-2.5×10',exponent:'-3'},
 {text:'1,4×10^12',body:'1,4×10',exponent:'12'}
]){
 const chosen={kind:'engineering',text:notation.text};
 const resultState=state([],{screen:'result',result:notation.text,
  resultPresentation:{chosen}});
 const model=lcd.resultModel(resultState);
 assert.ok(model&&model.exponentText===notation.exponent,
  'engineering exponent parsed');
 const surface=makeCanvas(),ctx=surface.getContext();
 const glyphs=[];
 ctx.measureText=value=>({width:String(value).length*4.1});
 ctx.fillText=(value,x,y)=>glyphs.push({value:String(value),x,y,font:ctx.font});
 assert.equal(lcd.draw(surface,resultState),'enhanced');
 const base=glyphs.find(g=>g.value===notation.body);
 const exponent=glyphs.find(g=>g.value===notation.exponent);
 assert.ok(base&&exponent,'mantissa and exponent are drawn separately');
 assert.ok(exponent.y<base.y-3,'scientific exponent is raised');
 assert.ok(exponent.font.includes('5.1px')&&base.font.includes('6.8px'),
  'exponent typography uses smaller font');
 assert.ok(!glyphs.some(g=>g.value.includes('^')),
  'literal caret is not used in rendered engineering result');
 tested+=4;
}
{
 const text='3×10^wrong';
 const resultState=state([],{screen:'result',result:text,
  resultPresentation:{chosen:{kind:'engineering',text}}});
 assert.equal(lcd.resultModel(resultState),null);
 assert.equal(lcd.draw(makeCanvas(),resultState),'authentic');
 tested++;
}
const plain=makeCanvas();
assert.equal(lcd.draw(plain,state([{type:'char',value:'2'}])),'authentic');
tested++;
const poweredOff=makeCanvas();
assert.equal(lcd.draw(poweredOff,state([node('fraction')],{power:false})),'authentic');
tested++;
assert.equal(typeof legacy.draw,'function');
console.log('PASS: '+tested+' enhanced LCD layout and drawing cases');
