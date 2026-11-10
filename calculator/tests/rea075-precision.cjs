/* REA-075 - bounded display precision and decimal arithmetic regression.
 * Run from calculator/: node tests/rea075-precision.cjs
 * Casio internal precision is 15 digits; native firmware is NOT validated.
 */
'use strict';
const assert=require('node:assert/strict');
const F=require('../js/number-format.js'),D=require('../js/decimal-core.js');
const M=require('../js/math-engine.js'),S=require('../js/setup.js');
let count=0;const run=(label,fn)=>{try{fn();count++}catch(e){e.message=label+': '+e.message;throw e}};
const fmt=(v,kind,digits=3,separator='dot')=>F.format(v,{format:kind,digits,decimalSeparator:separator});
const equal=(a,b)=>assert.equal(a,b);
run('15 digit decimal precision',()=>equal(D.PRECISION,15));
run('decimal addition carry',()=>equal(D.evaluate('9999999999+1'),10000000000));
run('decimal 15 digit boundary',()=>equal(D.evaluate('1.234567890123455'),1.23456789012346));
run('decimal upward carry',()=>equal(D.evaluate('9.999999999999995'),10));
run('decimal min valid',()=>equal(D.evaluate('1e-99'),1e-99));
run('decimal under-range result zero',()=>equal(D.evaluate('1e-100'),0));
run('decimal under-range division zero',()=>equal(D.evaluate('1e-99/10'),0));
run('decimal overflow throws',()=>assert.throws(()=>D.evaluate('1e100'),/Math ERROR/));
run('decimal multiplication overflow throws',()=>assert.throws(()=>D.evaluate('9.999999999e99*10'),/Math ERROR/));
run('decimal upper bound accepted',()=>equal(D.evaluate('9.999999999e99'),9.999999999e99));
run('math engine uses decimal range floor when loaded',()=>equal(M.evaluate('1e-100'),0));
run('negative zero normalize',()=>equal(fmt(-0,'Norm1'),'0'));
run('fixed zero does not display -0',()=>equal(fmt(-0,'Fix',4),'0.0000'));
run('zero scientific stable',()=>equal(fmt(0,'Sci',3),'0.00×10^0'));
run('Norm1 0.01 regular',()=>equal(fmt(0.01,'Norm1'),'0.01'));
run('Norm1 below 0.01 exponential',()=>equal(fmt(0.0099,'Norm1'),'9.9×10^-3'));
run('Norm2 1e-9 normal',()=>equal(fmt(1e-9,'Norm2'),'0.000000001'));
run('Norm2 below 1e-9 exponential',()=>equal(fmt(1e-10,'Norm2'),'1×10^-10'));
run('Norm1 negative tiny scientific',()=>equal(fmt(-1e-10,'Norm1'),'-1×10^-10'));
run('Norm1 positive 1e10 scientific',()=>equal(fmt(1e10,'Norm1'),'1×10^10'));
run('norm carry to 10',()=>equal(fmt(9.9999999996,'Norm1'),'10'));
run('Norm2 carry changes display boundary',()=>equal(fmt(9.9999999996e-10,'Norm2'),'0.000000001'));
run('upper range Norm1 exponent capped',()=>equal(fmt(9.999999999e99,'Norm1'),'9.999999999×10^99'));
run('upper range Sci3 exponent capped',()=>equal(fmt(9.999999999e99,'Sci',3),'9.999999999×10^99'));
run('upper range Sci0 exponent capped',()=>equal(fmt(9.999999999e99,'Sci',0),'9.999999999×10^99'));
run('Fix0 positive rounding',()=>equal(fmt(2.5,'Fix',0),'3'));
run('Fix0 negative rounding',()=>equal(fmt(-2.5,'Fix',0),'-3'));
run('Fix2 decimal tie',()=>equal(fmt(2.345,'Fix',2),'2.35'));
run('Fix2 negative decimal tie',()=>equal(fmt(-2.345,'Fix',2),'-2.35'));
run('Fix2 tiny rounds to zero',()=>equal(fmt(-1e-20,'Fix',2),'0.00'));
run('Fix2 carry into integer',()=>equal(fmt(999.995,'Fix',2),'1000.00'));
run('Fix2 11 integer digits falls back',()=>equal(fmt(1e10,'Fix',2),'1.000000000×10^10'));
run('Fix2 10 integer + 2 decimals overflows mantissa',()=>equal(fmt(9999999999.9,'Fix',2),'1.000000000×10^10'));
run('Fix9 one digit integer permitted',()=>equal(fmt(1.25,'Fix',9),'1.250000000'));
run('Fix0 10 integer digits permitted',()=>equal(fmt(1234567890,'Fix',0),'1234567890'));
run('Fix0 11 integer digits falls back',()=>equal(fmt(12345678901,'Fix',0),'1.234567890×10^10'));
run('Sci3 ordinary',()=>equal(fmt(123.456,'Sci',3),'1.23×10^2'));
run('Sci0 treated as 10 significant digits',()=>equal(fmt(123.456,'Sci',0),'1.234560000×10^2'));
run('Sci3 rounds exponent carry',()=>equal(fmt(999.995,'Sci',3),'1.00×10^3'));
run('Sci3 negative',()=>equal(fmt(-12.345,'Sci',3),'-1.23×10^1'));
run('display comma only',()=>equal(fmt(12.345,'Fix',2,'comma'),'12,35'));
run('scientific comma mantissa only',()=>equal(fmt(1.25e-8,'Sci',3,'comma'),'1,25×10^-8'));
for(const digit of [0,1,2,3,4,5,6,7,8,9]){
 run('Fix digit '+digit,()=>{
  const x=fmt(1.23456789,'Fix',digit);
  assert.ok(!x.includes('×10^'));
  equal(x.split('.')[1]?.length||0,digit);
 });
 run('Sci digit '+digit,()=>{
  const x=fmt(1.23456789,'Sci',digit);
  const mantissa=x.split('×10^')[0];
  equal(mantissa.replace('.','').length,digit===0?10:digit);
 });
}
for(const model of ['fx-991es','fx-991es-plus','fx-991es-plus-c']){
 run(model+' settings support Fix',()=>assert.ok(S.setting(model,'fix')));
 run(model+' settings support Sci',()=>assert.ok(S.setting(model,'sci')));
 run(model+' settings support Norm',()=>assert.ok(S.setting(model,'norm')));
 run(model+' Norm choice keys',()=>assert.deepEqual(S.options('norm').map(x=>x.key),['1','2']));
}
console.log('REA-075 PASS '+count+' display and numerical-boundary checks; native precision not certified');
