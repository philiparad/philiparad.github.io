/* REA-105 — model-specific precedence and fast/general parser compatibility.
 * Run: node calculator/tests/rea105-decimal-precedence.cjs
 * Device/LCD parity is not implied by these source-level checks.
 */
'use strict';
const assert=require('node:assert/strict');
const DEC=require('../js/decimal-core.js'),M=require('../js/math-engine.js');
const fs=require('node:fs'),path=require('node:path');
let checks=0;
function test(label,fn){try{fn();checks++}catch(e){e.message=label+': '+e.message;throw e}}
function close(a,b){assert.ok(typeof a==='number'&&Number.isFinite(a)&&Math.abs(a-b)<=1e-10*Math.max(1,Math.abs(b)),a+' != '+b)}
function general(expr,settings){
 const old=globalThis.FreshDecimal;
 globalThis.FreshDecimal=null;
 try{return M.evaluate(expr,settings)}
 finally{globalThis.FreshDecimal=old}
}
const samples=[
 ['8/2(2+2)',16,1],
 ['12/3(1+3)',16,1],
 ['18/3(2+1)',18,2],
 ['16/4(2+2)',16,1],
 ['6/3(1+1)',4,1],
 ['3/2(4+2)',9,0.25],
 ['6/3(1+2)^2',18,2/9],
 ['8/(2(2+2))',1,1],
 ['8/2*4',16,16],
 ['(1+2)3',9,9],
 ['(1+2)(3+4)',21,21],
 ['2(3+4)',14,14],
 ['(1+2)3(4+5)',81,81],
 ['2+3(4+1)',17,17],
 ['-2^2',-4,-4],
 ['(-2)^2',4,4],
 ['-2(1+2)',-6,-6],
 ['2^3^2',512,512],
 ['2^-3',0.125,0.125],
 ['(0.1+0.2)*10',3,3],
 ['2.4/0.3',8,8],
 ['1.2(3.4+5.6)',10.8,10.8],
 ['1e-2*20',0.2,0.2],
 ['(0.5+0.25)4',3,3],
 ['2/2pi',Math.PI,1/Math.PI],
 ['2pi/2',Math.PI,Math.PI],
 ['2^3!',64,64],
 ['5nPr2',20,20],
 ['5nCr2',10,10]
];
for(const model of ['fx-991es','fx-991es-plus','fx-991es-plus-c']){
 const opts={model,mode:'COMP'};
 for(const [expr,original,plus] of samples){
  const want=model==='fx-991es'?original:plus;
  test(model+' fast: '+expr,()=>close(M.evaluate(expr,opts),want));
  test(model+' general: '+expr,()=>close(general(expr,opts),want));
  test(model+' parity: '+expr,()=>close(M.evaluate(expr,opts),general(expr,opts)));
 }
 for(const expr of ['1/0','1/(2-2)','sqrt(-1)'])
  test(model+' Math ERROR '+expr,()=>{
   assert.throws(()=>M.evaluate(expr,opts),/Math ERROR/);
   assert.throws(()=>general(expr,opts),/Math ERROR/);
  });
 for(const expr of ['-'.repeat(25)+'1','+'.repeat(25)+'1',
  '1^'.repeat(25)+'1','('.repeat(25)+'1'+')'.repeat(25)])
  test(model+' Stack ERROR '+expr.slice(0,18),()=>{
   assert.throws(()=>M.evaluate(expr,opts),/Stack ERROR/);
   assert.throws(()=>general(expr,opts),/Stack ERROR/);
  });
}
for(const model of ['fx-991es','fx-991es-plus','fx-991es-plus-c']){
 const opts={model,mode:'COMP'};
 const expected=model==='fx-991es'?16:1;
 test(model+' direct decimal implicit tier',()=>close(DEC.evaluate('8/2(2+2)',opts),expected));
 test(model+' direct decimal adjacent factor',()=>close(DEC.evaluate('(1+2)3',opts),9));
 test(model+' direct decimal explicit multiplication',()=>close(DEC.evaluate('8/2*4',opts),16));
}
test('exact decimal path retained',()=>{
 assert.equal(M.evaluate('0.1+0.2',{model:'fx-991es'}),0.3);
 assert.notEqual(general('0.1+0.2',{model:'fx-991es'}),0.3);
});
test('functions fall back from decimal path',()=>{
 assert.equal(DEC.evaluate('sqrt(9)',{model:'fx-991es'}),null);
 close(M.evaluate('sqrt(9)',{model:'fx-991es'}),3);
});
test('source passes model and guards fast arithmetic',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../js/math-engine.js'),'utf8');
 assert.match(src,/FreshDecimal\.evaluate\(source,opts\)/);
 assert.match(src,/const implicitPriority=opts\.model===/);
 assert.match(src,/const fastSafe=/);
});
console.log('REA-105 PASS '+checks+' source-level precedence, precision, errors and backend-consistency checks');
