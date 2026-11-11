/* REA-101 — original fx-991ES STAT P(t) lower-tail validation.
 * Run: node calculator/tests/rea101-original-stat-p.cjs
 * Unit/reference checks do not certify physical CASIO LCD precision.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const normal=require('../js/stat-normal.js');
const model=require('../js/model-profiles.js');
let passed=0;
function test(label,callback){
 try{callback();passed++}catch(error){error.message=label+': '+error.message;throw error}
}
function near(a,b,tolerance=2e-13){
 assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=tolerance*Math.max(Math.abs(b),1e-30),
  String(a)+' differs from '+String(b));
}
// Reference CDF values evaluated independently from the integral definition
// and high-precision normal-distribution tables, not browser-rendered snapshots.
for(const [t,p] of [
 [0,0.5],[-0,0.5],
 [-1,0.1586552539314570514],[1,0.8413447460685429486],
 [-2,0.0227501319481792072],[2,0.9772498680518207928],
 [-3,0.0013498980316300945],[3,0.9986501019683699055],
 [-4,0.00003167124183311992],[4,0.99996832875816688],
 [-6,9.865876450376981e-10],[-8,6.22096057427178e-16],
 [-10,7.61985302416047e-24],[-12,1.77648211207768e-33],
 [6,0.9999999990134124],[10,1]
]){
 test('original P('+t+')',()=>near(normal.calculate('P',t),p));
 test('P lowerTail consistency at '+t,()=>assert.equal(
  normal.calculate('P',t),normal.lowerTail(t)));
}
for(const t of [0,0.2,0.5,1,2,3,4,5,6,8,10]){
 test('symmetry '+t,()=>near(normal.calculate('P',t)+normal.calculate('P',-t),1));
 test('monotonic '+t,()=>assert.ok(normal.calculate('P',t)>=normal.calculate('P',-t)));
}
test('P(-100) rounds to zero within double precision',()=>assert.equal(normal.calculate('P',-100),0));
test('P(100) rounds to one',()=>assert.equal(normal.calculate('P',100),1));
test('P rejection of NaN',()=>assert.throws(()=>normal.calculate('P',NaN),/Math ERROR/));
test('P rejection of Infinity',()=>assert.throws(()=>normal.calculate('P',Infinity),/Math ERROR/));
test('P rejection of -Infinity',()=>assert.throws(()=>normal.calculate('P',-Infinity),/Math ERROR/));
test('P rejection beyond calculator finite range',()=>assert.throws(()=>normal.calculate('P',1e100),/Math ERROR/));
test('wrong probability operation rejected',()=>assert.throws(()=>normal.calculate('Z',0),/Argument ERROR/));
test('other STAT operations remain callable',()=>{
 assert.equal(normal.calculate('Q',0),0);
 assert.equal(normal.calculate('R',0),0.5);
});
const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
test('original STAT menu has 7 Distr',()=>assert.match(app,
 /key:'7',label:state\.statTable\.paired\?'7\. Reg':'7\. Distr'/));
test('STAT Distr P is option 1',()=>assert.match(app,/key:'1',label:'1\. P\(',action:\(\)=>statDistrInput\('P'\)/));
test('STAT Distr requires original 1VAR only',()=>{
 const segment=app.slice(app.indexOf('function statDistr(){'),app.indexOf('function originalStatEstimate(',app.indexOf('function statDistr(){')));
 assert.match(segment,/state\.model!=='fx-991es'/);
 assert.match(segment,/state\.statTable\.paired/);
 assert.match(segment,/state\.statTable\.regressionType!=='1VAR'/);
});
test('STAT P evaluates variable expressions before changing Ans',()=>{
 const segment=app.slice(app.indexOf('function statDistrInput(kind){'),app.indexOf('function originalStatEstimate(',app.indexOf('function statDistrInput(kind){')));
 assert.ok(segment.indexOf('M.evaluate(raw,')<segment.indexOf('STATN.calculate(kind,arg,summary)'));
 assert.ok(segment.includes("kind+'('+raw+')'"));
});
test('STAT P result displays source and makes Ans available',()=>{
 const segment=app.slice(app.indexOf("if(output&&output.kind==='stat-normal')"),app.indexOf("if(output&&output.kind==='solve-continue')"));
 assert.match(segment,/state\.ans=output\.value/);
 assert.match(segment,/state\.outputLines=\[output\.source,'= '\+state\.result\]/);
});
for(const candidate of ['fx-991es','fx-991es-plus','fx-991es-plus-c']){
 test('model '+candidate+' supports STAT',()=>assert.equal(model.supports(candidate,'STAT'),true));
 test('model '+candidate+' does not require C-only DIST for STAT P',()=>assert.equal(
  model.supports(candidate,'DIST'),candidate==='fx-991es-plus-c'));
}
console.log('REA-101 PASS '+passed+' unit/source checks; original physical CASIO parity unverified');
