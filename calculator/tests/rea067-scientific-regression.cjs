/* REA-067: independent scientific regression library.
 * Run: node tests/rea067-scientific-regression.cjs
 * Web-model mathematical oracles only; no physical-device parity claims.
 */
'use strict';
const assert=require('node:assert/strict');
const M=require('../js/math-engine.js'),F=require('../js/number-format.js');
const C=require('../js/complex-engine.js'),K=require('../js/keyboard.js');
const E=require('../js/error-handling.js'),D=require('../js/sexagesimal.js');
const S=require('../js/special-arithmetic.js');
let total=0;const failures=[];
function test(id,fn){total++;try{fn()}catch(e){failures.push(id+': '+e.message)}}
function near(actual,expected){
 assert.ok(Number.isFinite(actual),'non-finite actual');
 assert.ok(Math.abs(actual-expected)<=1e-9*Math.max(1,Math.abs(expected)),
  'actual '+actual+' expected '+expected);
}
function eq(expr,want,opts={}){test('evaluate '+expr+' '+JSON.stringify(opts),()=>near(M.evaluate(expr,opts),want))}
function bad(expr,category='Math ERROR',opts={}){
 test('error '+expr,()=>assert.throws(()=>M.evaluate(expr,opts),
  e=>E.classify(e.message)===category));
}
// Arithmetic, associativity, and numerical boundaries, fixed enumeration.
for(let a=-12;a<=12;a++)for(const b of [1,2,3,5,7]){
 eq('('+a+')+'+b,a+b);eq('('+a+')-'+b,a-b);
 eq('('+a+')*'+b,a*b);eq('('+a+')/'+b,a/b);
}
for(let n=0;n<=16;n++){
 eq('('+n+')^2',n*n);eq('('+n+')^3',n*n*n);
 eq('sqrt('+n*n+')',n);eq('cbrt('+n*n*n+')',n);
}
for(let n=0;n<=20;n++){
 eq(n+'nCr0',1);if(n>=1)eq(n+'nCr1',n);
 if(n>=2)eq(n+'nCr2',n*(n-1)/2);
}
for(let n=0;n<=12;n++){
 let fac=1;for(let k=2;k<=n;k++)fac*=k;
 eq(n+'!',fac);
}
// Angle-mode independent mathematical reference values, including poles.
for(const unit of ['DEG','RAD','GRAD']){
 const quarter=unit==='DEG'?90:unit==='RAD'?Math.PI/2:100;
 for(let k=-8;k<=8;k++){
  const x=k*quarter,cyc=((k%4)+4)%4;
  eq('sin('+x+')',[0,1,0,-1][cyc],{angle:unit});
  eq('cos('+x+')',[1,0,-1,0][cyc],{angle:unit});
  if(k%2)bad('tan('+x+')','Math ERROR',{angle:unit});
  else eq('tan('+x+')',0,{angle:unit});
 }
 for(let k=-8;k<=8;k++){
  const x=unit==='DEG'?k*15:unit==='RAD'?k*Math.PI/12:k*200/12;
  const rad=unit==='DEG'?x*Math.PI/180:unit==='RAD'?x:x*Math.PI/200;
  eq('sin('+x+')',Math.sin(rad),{angle:unit});
  eq('cos('+x+')',Math.cos(rad),{angle:unit});
 }
 for(const x of [-1,-.75,-.5,0,.5,.75,1]){
  for(const [fn,expected] of [['asin',Math.asin(x)],['acos',Math.acos(x)]]){
   eq(fn+'('+x+')',unit==='DEG'?expected*180/Math.PI:unit==='GRAD'?expected*200/Math.PI:expected,{angle:unit});
  }
 }
}
for(const x of [.001,.01,.1,.25,.5,1,2,5,10,100]){
 eq('log('+x+')',Math.log10(x));eq('ln('+x+')',Math.log(x));
 eq('exp('+Math.log(x)+')',x);
}
for(const x of [-3,-2,-1,-.5,0,.5,1,2,3]){
 for(const [name,expected] of [
  ['abs',Math.abs(x)],['floor',Math.floor(x)],['ceil',Math.ceil(x)],
  ['int',Math.trunc(x)],['intg',Math.floor(x)],
  ['sinh',Math.sinh(x)],['cosh',Math.cosh(x)],['tanh',Math.tanh(x)]
 ])eq(name+'('+x+')',expected);
}
for(const [a,b,g] of [[12,18,6],[7,11,1],[24,36,12],[0,5,5],[50,75,25],[81,27,27]]){
 eq('gcd('+a+','+b+')',g);
 eq('lcm('+a+','+b+')',g?a*b/g:0);
}
for(const [expression,error] of [
 ['1/0','Math ERROR'],['sqrt(-1)','Math ERROR'],['ln(0)','Math ERROR'],
 ['log(-2)','Math ERROR'],['asin(1.0001)','Math ERROR'],
 ['acos(-1.0001)','Math ERROR'],['nthroot(2,-9)','Math ERROR'],
 ['(-1)!','Math ERROR'],['2.5!','Math ERROR'],['70!','Math ERROR'],
 ['2nCr3','Math ERROR'],['2+*3','Syntax ERROR'],
 ['sqrt(2','Syntax ERROR'],['Q+1','Syntax ERROR'],
 ['gcd(0,0)','Math ERROR'],['log(1,10)','Math ERROR'],
 ['tan(90)','Math ERROR']
])bad(expression,error);
eq('X^2+Y',13,{memory:{X:3,Y:4}});
eq('Ans+PreAns',9,{ans:4,preAns:5});
eq('Prod(X,1,5)',120);eq('Prod(X^2,1,3)',36);
eq('(1+2)*(3+4)',21);eq('2^3^2',512);eq('-2^2',-4);
eq('sin(30°)',.5,{angle:'RAD'});
for(const [v,settings,result] of [
 [0,{format:'Norm2'},'0'],[1/8,{format:'Norm2'},'0.125'],
 [2.3456,{format:'Fix',digits:2},'2.35'],
 [-2.3456,{format:'Fix',digits:2},'-2.35'],
 [12.5,{format:'Fix',digits:3},'12.500'],
 [0,{format:'Fix',digits:3},'0.000'],
 [1e-10,{format:'Norm1'},'1×10^-10'],
 [1e-10,{format:'Norm2'},'1×10^-10'],
 [12.5,{format:'Fix',digits:1,decimalSeparator:'comma'},'12,5']
])test('format '+v+' '+JSON.stringify(settings),()=>assert.equal(F.format(v,settings),result));
for(const [expr,re,im] of [
 ['1+i',1,1],['(1+i)*(1-i)',2,0],['conjg(3+4i)',3,-4],
 ['abs(3+4i)',5,0],['i^2',-1,0],['2+3i',2,3]
])test('CMPLX '+expr,()=>{const actual=C.evaluate(expr);near(actual.re,re);near(actual.im,im)});
for(const [key,want] of [['F1','SHIFT'],['F2','ALPHA'],['F3','MODE'],['^','POWER']])
 test('SHIFT/ALPHA keyboard '+key,()=>assert.deepEqual(
  K.translate({key,target:{closest(){return null}}}).keys,[want]));
test('DMS normalization',()=>near(M.evaluate(D.normalize('12°30′0″')),12.5));
test('DMS display',()=>assert.equal(D.format(12.5),'12°30′0″'));
test('repeating fraction',()=>near(M.evaluate(S.expandRecurring('0.RPT(3)')),1/3));
if(total<1000)failures.push('Only '+total+' cases');
if(failures.length){
 console.error('REA-067 FAIL '+failures.length+'/'+total);
 failures.slice(0,40).forEach(e=>console.error(' - '+e));
 process.exitCode=1;
}else console.log('REA-067 PASS '+total+' deterministic checks; device parity not certified');
