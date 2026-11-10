/* REA-080 — inline calculus templates, source parser, 2D/LineIO LCD and worker.
 * Run: node calculator/tests/rea080-inline-calculus.cjs
 * Manufacturer firmware and physical LCD parity are NOT asserted.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const E=require('../js/structured-editor.js');
const V=require('../js/lcd-viewport.js');
const LCD=require('../js/display.js');
const I=require('../js/inline-calculus.js');
const M=require('../js/math-engine.js');
let count=0;
function check(label,fn){try{fn();count++}catch(e){e.message=label+': '+e.message;throw e}}
function close(a,b,tol=1e-7){assert.ok(Math.abs(a-b)<tol*Math.max(1,Math.abs(b)),a+' != '+b)}
function editor(type,inputs){
 const e=E.create();E.template(e,type);
 for(let i=0;i<inputs.length;i++){
  E.insert(e,inputs[i]);
  if(i<inputs.length-1)E.navigate(e,'RIGHT');
 }
 return e;
}
function numerical(source){
 const p=I.parse(source);
 const opts={memory:{X:0},angle:'DEG'};
 const f=x=>M.evaluate(p.data.expression,{...opts,memory:{...opts.memory,X:x}});
 const arg=s=>M.evaluate(s,opts);
 return p.kind==='DERIVATIVE'?M.derivative(f,arg(p.data.at),arg(p.data.tol)):
  p.kind==='INTEGRAL'?M.integrate(f,arg(p.data.a),arg(p.data.b),arg(p.data.tol)):
  M.summation(f,arg(p.data.a),arg(p.data.b));
}
for(const [type,inputs,source,want] of [
 ['derivative',['X^2','3'],'Diff(X^2,3)',6],
 ['integral',['X^2','0','2'],'Integral(X^2,0,2)',8/3],
 ['summation',['X^2','0','2'],'Sum(X^2,0,2)',5],
 ['derivative',['sin(X)','0'],'Diff(sin(X),0)',Math.PI/180],
 ['integral',['X','0','1'],'Integral(X,0,1)',.5],
 ['summation',['X','1','4'],'Sum(X,1,4)',10]
]){
 check(type+' serializes '+source,()=>{
  const e=editor(type,inputs);
  assert.equal(E.serialize(e,true),source);
  assert.equal(E.isComplete(e),true);
  assert.deepEqual(I.parse(source).fields,inputs);
 });
 check(type+' computes '+source,()=>close(numerical(source),want,type==='derivative'?1e-5:1e-7));
 check(type+' has two renderings with active cursors',()=>{
  const e=editor(type,inputs),state={power:true,mode:'COMP',
   screen:'edit',editor:e,input:E.serialize(e),viewport:{inputX:0,inputY:0},info:''};
  const math=LCD.rasterize({...state,math:true});
  const linear=LCD.rasterize({...state,math:false});
  assert.equal(math.length,96*31);assert.equal(linear.length,96*31);
  assert.notDeepEqual(Array.from(math),Array.from(linear));
  assert.ok(math.some(Boolean)&&linear.some(Boolean));
  for(const v of [V.follow(e,{},12,false),V.follow(e,{},12,true)]){
   assert.ok(Number.isFinite(v.frame.cursor.x));
   assert.ok(Number.isFinite(v.frame.cursor.y));
   assert.ok(v.frame.width>20);
  }
 });
}
for(const [input,kind,expected] of [
 ['Diff(X^2,3)','DERIVATIVE','1E-10'],
 ['Diff(X^2,3,1E-8)','DERIVATIVE','1E-8'],
 ['Integral(X^2,0,2)','INTEGRAL','1E-5'],
 ['Integral(X^2,0,2,1E-7)','INTEGRAL','1E-7'],
 ['Sum(X^2,0,2)','SUM',undefined],
 ['Integral((X+1)^2,0,(1+1))','INTEGRAL','1E-5']
]){
 check(input+' parses source fields/tolerance',()=>{
  const p=I.parse(input);
  assert.equal(p.kind,kind);assert.equal(p.data.tol,expected);
 });
}
for(const input of [
 'Diff(X^2,)','Diff(,2)','Diff(X,1,2,3)',
 'Integral(X,0,)','Integral(X,,2)','Integral(X,0,1,2,3)',
 'Sum(X,0)','Sum(X,0,1,2)','Diff(X,1)junk',
 'Integral((X+1,0,2)','Integral(X,0,2))',
 'Sum(X,0,?)','Diff(X,?)'
]){
 check('reject incomplete inline source '+input,()=>{
  assert.throws(()=>I.parse(input),/Syntax ERROR/);
 });
}
check('not a calculus expression leaves ordinary arithmetic untouched',()=>{
 assert.equal(I.parse('X^2+3'),null);
 assert.equal(I.parse('sqrt(X)'),null);
});
for(const type of ['derivative','integral','summation']){
 check(type+' starts with empty required template',()=>{
  const e=E.create();E.template(e,type);
  assert.equal(E.isComplete(e),false);
  assert.throws(()=>E.serialize(e,true),/Syntax ERROR/);
  assert.equal(E.cursor(e).path.at(-1).field,'expression');
 });
 check(type+' navigate through editable fields',()=>{
  const e=E.create();E.template(e,type);
  const steps=type==='derivative'?['expression','at']:['expression','lower','upper'];
  for(let i=0;i<steps.length;i++){
   assert.equal(E.cursor(e).path.at(-1).field,steps[i]);
   if(i+1<steps.length)assert.equal(E.navigate(e,'RIGHT'),true);
  }
  assert.equal(E.navigate(e,'RIGHT'),true);
  assert.equal(E.cursor(e).path.length,0);
 });
 check(type+' undo template insertion',()=>{
  const e=E.create();E.template(e,type);
  assert.equal(E.undo(e),true);
  assert.equal(E.serialize(e,true),'');
 });
 check(type+' nested scalar fraction survives',()=>{
  const e=E.create();E.template(e,type);
  E.template(e,'fraction');E.insert(e,'1');E.navigate(e,'RIGHT');E.insert(e,'2');
  assert.ok(E.serialize(e).includes('((1)/(2))'));
 });
}
check('original / PLUS / C keep same physical 50-key contract',()=>{
 const keypad=require('../js/keypad.js');
 for(const model of ['fx-991es','fx-991es-plus','fx-991es-plus-c']){
  assert.equal(keypad.keysForModel(model).length,50);
 }
});
check('calc source uses physical shifted derivative and sigma, primary integral',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 assert.match(app,/if\(key==='INTEGRAL'\)\{releaseModifier\(\);insertCalculusTemplate\('derivative'\)/);
 assert.match(app,/if\(key==='LOGBASE'\)\{releaseModifier\(\);insertCalculusTemplate\('summation'\)/);
 assert.match(app,/if\(key==='INTEGRAL'\)\{insertCalculusTemplate\('integral'\)/);
 assert.match(app,/const calculus=INLINE\.parse\(source\)/);
 assert.match(app,/runNumeric\(calculus\.kind,calculus\.data\)/);
 assert.match(app,/if\(state\.screen!=='calculating'\)return/);
 new Function(app);
});
check('line entry is still on calculator face without extra keys',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.ok(html.indexOf('js/inline-calculus.js')>=0);
 assert.ok(html.indexOf('js/inline-calculus.js')<html.indexOf('js/app.js'));
});
check('worker retains integrated derivative integral and sum modes',()=>{
 const worker=fs.readFileSync(path.join(__dirname,'../js/numeric-worker.js'),'utf8');
 assert.match(worker,/M\.derivative\(f,number\(data\.at\),number\(data\.tol\)\)/);
 assert.match(worker,/M\.integrate\(f,number\(data\.a\),number\(data\.b\),number\(data\.tol\)\)/);
 assert.match(worker,/M\.summation\(f,number\(data\.a\),number\(data\.b\)\)/);
});
check('line and math LCD fields are glyph-backed',()=>{
 assert.ok(LCD.FONT['∫']&&LCD.FONT['Σ']&&LCD.FONT['∂']);
});
console.log('REA-080 PASS '+count+' inline MathIO/LineIO parser, arithmetic, LCD, undo and key checks');
