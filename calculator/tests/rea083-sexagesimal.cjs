/* REA-083: sexagesimal editing, signed arithmetic and display ranges.
 * Run node calculator/tests/rea083-sexagesimal.cjs
 * Independent mathematical web model, NOT physical CASIO parity.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const D=require('../js/sexagesimal.js'),M=require('../js/math-engine.js');
const K=require('../js/keypad.js'),L=require('../js/legend-audit.js');
const MODELS=require('../js/model-profiles.js');
let passed=0;
const test=(name,fn)=>{try{fn();passed++}catch(e){e.message=name+': '+e.message;throw e}};
function near(a,b,eps=1e-10){assert.ok(Math.abs(a-b)<=eps*Math.max(1,Math.abs(b)),a+' != '+b)}
const calc=(source,angle='DEG')=>M.evaluate(source,{angle,model:'fx-991es-plus-c'});
for(const [input,want] of [
 ['2°15′18″',2.255],['2°20′30″+0°39′30″',3],
 ['-2°30′0″',-2.5],['(-2°30′0″)',-2.5],
 ['2°30′0″-3°0′0″',-.5],['2°30′0″*2',5],['2*2°30′0″',5],
 ['2°30′0″/2',1.25],['(2°0′0″+0°30′0″)*3',7.5],
 ['0°0′30″+0°0′30″',1/60],
 ['0°0′0.5″',.5/3600],
 ['sin(30°)',.5],['sin(0°30′0″)',Math.sin(Math.PI/360)],
 ['1°30′0″+15°0′0″',16.5],
 ['1°0′0″-2°0′0″',-1],
 ['2°30′0″/0°30′0″',5]
]){
 test('arithmetic '+input,()=>near(calc(input),want,1e-9));
}
for(const [input,want] of [
 [0,'0°0′0″'],[2.255,'2°15′18″'],[-2.5,'-2°30′0″'],
 [-.5,'-0°30′0″'],[1,'1°0′0″'],
 [59.9999999/3600,'0°1′0″'],[3599.9999999/3600,'1°0′0″'],
 [1+59.9999999/3600,'1°1′0″'],
 [9999999+59/60+59/3600,'9999999°59′59″'],
 [9999999.5,'9999999°30′0″']
]){
 test('display/carry '+want,()=>assert.equal(D.format(input),want));
}
for(const source of [
 '2°15′18″','-2°30′0″','0°0′30″',
 '1°2′3″+4°5′6″','(1°2′3″)*2'
]){
 test('normalized complete input '+source,()=>{
  const normalized=D.normalize(source);
  assert.ok(!/[′″]/.test(normalized));
  near(calc(source),calc(normalized));
  assert.equal(D.hasDMS(source),true);
 });
}
for(const source of ['90°','sin(90°)','3+5','2g']){
 test('non-DMS remains untouched '+source,()=>{
  assert.equal(D.normalize(source),source);
  assert.equal(D.hasDMS(source),false);
 });
}
for(const source of [
 '2°30′','2°30','2°′30″','2°20′″','2°30′2',
 '2°30′0″′','2°30′0″″',
 '1°60′0″','1°0′60″','1°-2′0″','1°0′-2″',
 '10000000°0′0″','9999999°59′59.1″',
 '2°30′0″3′','2°30′0″.4'
]){
 test('invalid syntax/range '+source,()=>assert.throws(()=>D.normalize(source),/Syntax ERROR|Argument ERROR/));
}
for(const [src,want] of [
 ['2','°'],['2°20','′'],['2°20′30','″'],
 ['-2','°'],['-2°20','′'],['-2°20′30','″'],
 ['2°20′30″+3','°'],['2°20′30″+3°1','′'],
 ['2°20′30″+3°1′2','″'],
 ['sin(2','°'],['(2°20′30″)*3','°']
]){
 test('physical DMS next separator '+src,()=>assert.equal(D.nextSeparator(src),want));
}
for(const src of ['','1°','1°20′','1°20′30″','1+','1°20′30″+','X','sin(']){
 test('incomplete physical DMS key '+src,()=>assert.equal(D.nextSeparator(src),null));
}
test('minutes may not be fractional',()=>assert.throws(()=>D.parseComponents(2,.5,0),/Argument ERROR/));
test('degree component must be integer',()=>assert.throws(()=>D.parseComponents(2.5,0,0),/Argument ERROR/));
test('negative sign belongs to expression, not component',()=>assert.throws(()=>D.parseComponents(-2,0,0),/Argument ERROR/));
test('format disallows out-of-range',()=>{
 assert.equal(D.format(10000000),null);
 assert.equal(D.format(Infinity),null);
 assert.equal(D.format(NaN),null);
});
test('does not misnormalize a DRG degree suffix',()=>near(calc('sin(90°)'),1));
test('global angle option does not affect DMS arithmetic',()=>{
 for(const unit of ['DEG','RAD','GRAD'])
  near(calc('2°30′0″+1°15′0″',unit),3.75);
});
test('DMS result and toggle preserve independent numeric Ans',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 assert.match(app,/state\.resultDMS=!!\(window\.FreshSexagesimal&&window\.FreshSexagesimal\.hasDMS\(source\)\)/);
 assert.match(app,/function toggleDMS\(\)/);
 assert.match(app,/state\.resultDMS=asDMS/);
 assert.doesNotMatch(app.slice(app.indexOf('function toggleDMS()'),app.indexOf('const MEMORY_KEYS')),/state\.ans\s*=/);
});
test('normal DMS and shifted DMS routed independently',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 assert.match(app,/const separator=window\.FreshSexagesimal\.nextSeparator\(state\.input\)/);
 assert.match(app,/if\(key==='DMS'\)\{releaseModifier\(\);if\(state\.screen==='result'\)factorResult\(\)/);
});
test('key face has DMS on three models',()=>{
 for(const model of ['fx-991es','fx-991es-plus','fx-991es-plus-c']){
  const key=K.keysForModel(model).find(k=>k.id==='DMS');
  assert.ok(key);
  assert.equal(L.classify(key,'normal','COMP','edit',model,MODELS.supports).status,'available');
  assert.equal(L.classify(key,'normal','CMPLX','edit',model,MODELS.supports).status,'blocked');
 }
});
console.log('REA-083 PASS '+passed+' DMS arithmetic/rounding/key/validation checks; native parity unverified');
