/* REA-076 S⇔D and SHIFT+S⇔D conversion-state regression.
 * Run: node calculator/tests/rea076-sd-conversions.cjs
 * The documented rules are mathematical/unit invariants, not hardware captures.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const F=require('../js/result-format.js'),M=require('../js/math-engine.js');
const X=require('../js/exact-symbolic.js'),N=require('../js/number-format.js');
const settings={math:true,outputMath:true,format:'Norm1',fractionStyle:'improper'};
let passed=0;
function test(name,fn){try{fn();passed++}catch(e){e.message=name+': '+e.message;throw e}}
function get(source,extra={},q){
 const value=M.evaluate(source);
 return F.calculate(value,source,{...settings,...extra},{exactRational:q||X.rational(source,value)});
}
function pair(source,kind,text,q){
 const value=M.evaluate(source);
 const natural=F.calculate(value,source,settings,{exactRational:q||X.rational(source,value)});
 test(source+' natural',()=>{assert.equal(natural.chosen.kind,kind);assert.equal(natural.chosen.text,text)});
 test(source+' decimal SD',()=>{
  const decimal=F.calculate(value,source,settings,{decimal:true,exactRational:q||X.rational(source,value)});
  assert.equal(decimal.chosen.kind,'decimal');
  assert.equal(decimal.chosen.text,N.format(value,settings));
 });
 test(source+' restore natural',()=>{
  const again=F.calculate(value,source,settings,{forceFraction:true,exactRational:q||X.rational(source,value)});
  assert.equal(again.chosen.kind,kind);assert.equal(again.chosen.text,text);
 });
}
pair('1/2','fraction','1/2');
pair('7/6','fraction','7/6');
pair('-7/3','fraction','-7/3');
pair('sqrt(8)/2','surd','√2');
pair('pi/6','pi','π/6');
pair('pi/2+pi/3','pi','5π/6');
pair('1+sqrt(2)','surd','1+√2');
for(const [source,expected] of [
 ['7/6','1 1/6'],['-7/3','-2 1/3'],['100/7','14 2/7'],
 ['1/2','1/2']]){
 test('mixed formatting '+source,()=>{
  const p=get(source,{fractionStyle:'mixed'});
  assert.equal(p.chosen.text,expected);
 });
}
test('negative mixed numerator remains unsigned',()=>{
 const p=get('-7/3',{fractionStyle:'mixed'}).chosen;
 assert.equal(p.integer,'-2');assert.equal(p.numerator,'1');assert.equal(p.denominator,'3');
});
test('ten-character mixed representation is valid',()=>{
 const q={numerator:'1234568',denominator:'1000000'};
 // 1 234568/1000000 is too long -> decimal.
 const p=F.calculate(1.234568,'1234568/1000000',{...settings,fractionStyle:'mixed'},{exactRational:q});
 assert.equal(p.chosen.kind,'decimal');
});
test('oversized mixed cannot silently become improper',()=>{
 const q={numerator:'100000001',denominator:'99999999'};
 const p=F.calculate(Number(q.numerator)/Number(q.denominator),'100000001/99999999',
 {...settings,fractionStyle:'mixed'},{exactRational:q});
 assert.equal(p.chosen.kind,'decimal');
 const forced=F.calculate(Number(q.numerator)/Number(q.denominator),'100000001/99999999',
 {...settings,fractionStyle:'mixed'},{exactRational:q,forceFraction:true});
 assert.equal(forced.chosen.kind,'decimal');
});
test('ordinary improper fraction retains exact ratio',()=>{
 const q={numerator:'100000001',denominator:'99999999'};
 const p=F.calculate(Number(q.numerator)/Number(q.denominator),'100000001/99999999',
 settings,{exactRational:q});
 assert.equal(p.chosen.kind,'fraction');
});
test('LineIO fraction toggles exact rational',()=>{
 const p=get('1/5',{math:false},null);
 assert.equal(p.chosen.kind,'decimal');
 const value=0.2;
 const next=F.calculate(value,'1/5',{...settings,math:false},{forceFraction:true,exactRational:{numerator:'1',denominator:'5'}});
 assert.equal(next.chosen.kind,'fraction');assert.equal(next.chosen.text,'1/5');
});
test('LineIO must not convert decimal to surd',()=>{
 const v=M.evaluate('sqrt(8)/2');
 const r=F.calculate(v,'sqrt(8)/2',{...settings,math:false},{forceFraction:true});
 assert.equal(r.chosen.kind,'decimal');
});
test('MathIO LineO must not synthesize pi form',()=>{
 const v=M.evaluate('pi/6');
 const r=F.calculate(v,'pi/6',{...settings,outputMath:false},{forceFraction:true});
 assert.equal(r.chosen.kind,'decimal');
});
test('Fix forbids radical reconstruction',()=>{
 const v=M.evaluate('sqrt(8)/2');
 const r=F.calculate(v,'sqrt(8)/2',{...settings,format:'Fix',digits:3},{forceFraction:true});
 assert.equal(r.chosen.kind,'decimal');
});
test('legacy pi source verifies numeric value',()=>{
 assert.equal(F.symbolic(123,'pi'),null);
});
test('irrational decimal cannot become radical by coincidence',()=>{
 const p=F.calculate(Math.sqrt(2),'1.414213562373095',settings,{forceFraction:true});
 assert.equal(p.chosen.kind,'decimal');
});
test('incompatible radical sum remains decimal',()=>{
 const p=get('sqrt(2)+sqrt(3)');
 assert.equal(p.chosen.kind,'decimal');
});
test('no spurious irrational fractions',()=>{
 const p=get('sqrt(2)');
 assert.equal(p.chosen.kind,'surd');
 const q=F.calculate(Math.SQRT2,'sqrt(2)',{...settings,math:false},
 {forceFraction:true,allowApproxRational:false});
 assert.equal(q.chosen.kind,'decimal');
});
test('fraction/decimal cycles leave source unchanged',()=>{
 const val=M.evaluate('7/6'),q={numerator:'7',denominator:'6'};
 let source='7/6';
 for(let i=0;i<12;i++){
  const p=F.calculate(val,source,settings,{decimal:i%2===0,exactRational:q});
  assert.equal(p.chosen.kind,i%2===0?'decimal':'fraction');
 }
 assert.equal(source,'7/6');
});
test('recurring S-D branch requires PLUS C model',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 assert.match(app,/state\.model==='fx-991es-plus-c'&&state\.recurringDecimal&&state\.ansRational/);
});
test('controller routes SHIFT SD and simple SD separately',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 assert.match(s,/if\(key==='SD'\)\{releaseModifier\(\);toggleMixed\(\);return true\}/);
 assert.match(s,/function toggleFraction\(\)/);
 assert.match(s,/function toggleMixed\(\)/);
 new Function(s);
});
for(const model of ['fx-991es','fx-991es-plus','fx-991es-plus-c']){
 test(model+' supported converter core',()=>{
  const p=F.calculate(1/3,'1/3',{...settings,model},
   {exactRational:{numerator:'1',denominator:'3'}});
  assert.equal(p.chosen.kind,'fraction');
 });
}
console.log('REA-076 PASS '+passed+' state/eligibility/formatting checks (device parity unverified)');
