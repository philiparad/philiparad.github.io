/* REA-074 — exact provenance for radicals, pi and rational cancellations.
 * Run from calculator/: node tests/rea074-exact-symbolic.cjs
 * This is mathematical web-model correctness, NOT physical-device parity.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const S=require('../js/exact-symbolic.js'),R=require('../js/result-format.js');
const M=require('../js/math-engine.js');
let total=0;
function check(label,fn){try{fn();total++}catch(e){e.message=label+': '+e.message;throw e}}
const settings={math:true,outputMath:true,format:'Norm1',fractionStyle:'improper'};
function show(expression,expected,kind){
 check(expression,()=>{
  const value=M.evaluate(expression);
  const result=R.calculate(value,expression,settings);
  assert.equal(result.chosen.text,expected);
  if(kind)assert.equal(result.chosen.kind,kind);
  assert.ok(Math.abs(value-result.symbolic?.numeric)<=2e-10*Math.max(1,Math.abs(value)));
  assert.equal(R.calculate(value,expression,settings,{decimal:true}).chosen.kind,'decimal');
  assert.equal(R.calculate(value,expression,{...settings,math:false}).chosen.kind,'decimal');
  assert.equal(R.calculate(value,expression,{...settings,format:'Fix',digits:3}).chosen.kind,'decimal');
 });
}
for(const [expression,expected,kind] of [
 ['pi','π','pi'],['-pi','-π','pi'],['pi/2','π/2','pi'],
 ['2*pi/3','2π/3','pi'],['pi/2+pi/3','5π/6','pi'],
 ['2*pi/3+pi/6','5π/6','pi'],['3*pi-pi','2π','pi'],
 ['2+pi/3','2+π/3','pi'],['3-pi/2','3-π/2','pi'],
 ['sqrt(2)','√2','surd'],['sqrt(8)','2√2','surd'],
 ['sqrt(18)','3√2','surd'],['sqrt(50)','5√2','surd'],
 ['sqrt(8)/2','√2','surd'],['sqrt(2)+sqrt(2)','2√2','surd'],
 ['sqrt(12)-sqrt(3)','√3','surd'],
 ['sqrt(2)*sqrt(3)','√6','surd'],['sqrt(6)/sqrt(2)','√3','surd'],
 ['sqrt(3)/sqrt(2)','√6/2','surd'],
 ['sqrt(2)+1','1+√2','surd'],['2-sqrt(2)','2-√2','surd'],
 ['(1+sqrt(2))^2','3+2√2','surd'],
 ['sqrt(2)/(1+sqrt(2))','2-√2','surd']
])show(expression,expected,kind);
for(const expression of [
 'sqrt(2)+sqrt(3)','pi*pi','1/pi','sqrt(-1)','sin(30)',
 'sqrt(2)+pi','sqrt(2)*pi','sqrt(123456789)',
 'sqrt(2)/(sqrt(2)-sqrt(2))','pi/sqrt(2)',
 'sqrt(2)^13','1/(pi+1)','sqrt(2)+sqrt(3)+sqrt(5)'
]){
 check('unsupported or invalid '+expression,()=>{
  const result=S.evaluate(expression);
  assert.equal(result,null);
 });
}
for(const [expression,expected] of [
 ['sqrt(0)','0'],['sqrt(4)+1','3'],['sqrt(2)^2','2'],
 ['sqrt(3)*sqrt(12)','6'],['sqrt(8)*sqrt(2)','4'],
 ['(sqrt(2)+sqrt(2))^2','8'],['pi-pi','0'],['sqrt(2)-sqrt(2)','0']
]){
 check('exact rational '+expression,()=>{
  const value=M.evaluate(expression),ratio=S.rational(expression,value);
  assert.ok(ratio,'missing exact rational');
  assert.equal(Number(ratio.numerator)/Number(ratio.denominator),Number(expected));
 });
}
for(let n=2;n<=64;n++){
 check('square root normalization '+n,()=>{
  const exp='sqrt('+n+')',value=M.evaluate(exp),exact=S.symbolic(exp,value);
  const perfect=Number.isInteger(Math.sqrt(n));
  assert.equal(Boolean(exact),!perfect);
  if(exact)assert.ok(Math.abs(exact.numeric-value)<1e-12);
 });
}
for(let n=1;n<=24;n++){
 check('pi coefficient reduction '+n,()=>{
  const exp=n+'*pi/12',v=M.evaluate(exp),result=S.symbolic(exp,v);
  assert.equal(result.kind,'pi');
  assert.ok(result.text.endsWith('π')||result.text.includes('π/'));
  assert.ok(Math.abs(result.numeric-v)<1e-12);
 });
}
check('no spurious decimal-to-pi identity',()=>{
 assert.equal(S.symbolic('3.141592653589793',Math.PI),null);
 assert.equal(R.calculate(Math.PI,'3.141592653589793',settings).chosen.kind,'decimal');
});
check('preserves forced decimal conversion',()=>{
 const v=M.evaluate('sqrt(8)/2');
 assert.equal(R.calculate(v,'sqrt(8)/2',settings,{decimal:true}).chosen.kind,'decimal');
});
check('no direct identity guess from wrong numerical value',()=>{
 assert.equal(S.symbolic('sqrt(2)',1.5),null);
});
check('screen size/bound in symbolic text',()=>{
 for(const expr of ['1000000*pi','sqrt(999999)','100000000000*pi']){
  const f=S.evaluate(expr),out=S.formatted(f);
  assert.ok(!out||out.text.length<=22);
 }
});
// Special-angle trigonometry: display exact values, then S⇔D converts.
const trigExpected={
 sin:['0','1/2','√2/2','√3/2','1'],
 cos:['1','√3/2','√2/2','1/2','0'],
 tan:['0','√3/3','1','√3',null]
};
const angles=[0,30,45,60,90];
for(const name of ['sin','cos','tan'])for(let i=0;i<angles.length;i++){
 const angle=angles[i],expected=trigExpected[name][i];
 if(expected===null){
  check('tan(90) remains undefined',()=>{
   assert.throws(()=>M.evaluate('tan(90)',{angle:'DEG'}));
  });
  continue;
 }
 check('special-angle '+name+'('+angle+')',()=>{
  const expression=name+'('+angle+')';
  const value=M.evaluate(expression,{angle:'DEG'});
  const natural=R.calculate(value,expression,{...settings,angle:'DEG'});
  assert.equal(natural.chosen.text,expected);
  const converted=R.calculate(value,expression,{...settings,angle:'DEG'},
   {decimal:true});
  assert.equal(converted.chosen.kind,'decimal');
  assert.equal(converted.chosen.text,R.decimal(value,{...settings,angle:'DEG'}));
  assert.equal(R.calculate(value,expression,{...settings,angle:'DEG'}).chosen.text,
   expected,'S⇔D must toggle back to exact form');
 });
}
for(const [expression,expected] of [
 ['sin(150)','1/2'],['cos(120)','-1/2'],['tan(135)','-1'],
 ['sin(-30)','-1/2'],['cos(360)','1'],['tan(210)','√3/3']
]){
 check('special-angle signs '+expression,()=>{
  const value=M.evaluate(expression,{angle:'DEG'});
  assert.equal(R.calculate(value,expression,{...settings,angle:'DEG'}).chosen.text,expected);
 });
}
check('special-angle lookup requires matching provenance',()=>{
 const cfg={...settings,angle:'DEG'};
 assert.equal(R.calculate(.6,'sin(30)',cfg).chosen.kind,'decimal');
 assert.equal(R.calculate(Math.sin(Math.PI/6),'0.5',cfg).chosen.kind,'decimal');
 assert.equal(R.calculate(Math.sin(Math.PI/6),'sin(30)',{...cfg,angle:'RAD'}).chosen.kind,'decimal');
 assert.equal(R.calculate(Math.sin(23*Math.PI/180),'sin(23)',cfg).chosen.kind,'decimal');
});
check('script order and app result wiring',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const format=fs.readFileSync(path.join(__dirname,'../js/result-format.js'),'utf8');
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 const symbolIndex=html.indexOf('js/exact-symbolic.js');
 assert.ok(symbolIndex>=0&&symbolIndex<html.indexOf('js/result-format.js'));
 assert.match(format,/FreshExactSymbolic\?\.symbolic\(source,value\)/);
 assert.match(app,/FreshExactSymbolic\.rational\(expression,value\)/);
 new Function(format);new Function(app);
});
console.log('REA-074 PASS: '+total+' exact symbolic source/result tests (hardware not tested)');
