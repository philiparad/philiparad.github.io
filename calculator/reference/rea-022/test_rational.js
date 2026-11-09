/* REA-022 exact rational regression, runnable with Node.js. */
'use strict';
const assert=require('node:assert/strict');
const R=require('../../js/rational.js');
require('../../js/decimal-core.js');
const M=require('../../js/math-engine.js');
const F=require('../../js/result-format.js');
let count=0;
const cases=[
 ['1/3+1/6','1','2'],['(1/2)/(3/4)','2','3'],
 ['2/4+3/6','1','1'],['-1/4+1/6','-1','12'],
 ['1/7*7','1','1'],['1/3/2','1','6'],
 ['(3/4)^-2','16','9'],['2^3^2','512','1'],
 ['-2^2','-4','1'],['(-2)^2','4','1'],
 ['(1/2)^3','1','8'],['1.25/0.5','5','2'],
 ['0.1+0.2','3','10'],['4/-2','-2','1'],
 ['1/999999999+1/999999999','2','999999999'],
 ['0.000000000000000001','1','1000000000000000000']
];
for(const [source,n,d] of cases){
 const exact=R.serialize(R.evaluate(source));
 assert.deepEqual(exact,{numerator:n,denominator:d},source);
 const view=F.calculate(R.toNumber(R.evaluate(source)),source,
  {math:true,format:'Norm2',fractionStyle:'improper'},{exactRational:exact});
 assert.equal(view.chosen.text,d==='1'?n:n+'/'+d,'display '+source);
 count+=2;
}
const prev=R.serialize(R.evaluate('1/3'));
const chain=R.serialize(R.evaluate('Ans+1/6',{ansRational:prev}));
assert.deepEqual(chain,{numerator:'1',denominator:'2'});count++;
const preAns=R.serialize(R.evaluate('PreAns+1/6',{preAnsRational:prev}));
assert.deepEqual(preAns,chain);count++;
const mixed=F.calculate(7/3,'7/3',{math:true,format:'Norm2',fractionStyle:'mixed'},
 {exactRational:{numerator:'7',denominator:'3'}});
assert.equal(mixed.chosen.text,'2 1/3');count++;
const negativeMixed=F.calculate(-7/3,'-7/3',{math:true,format:'Norm2',fractionStyle:'mixed'},
 {exactRational:{numerator:'-7',denominator:'3'}});
assert.equal(negativeMixed.chosen.text,'-2 1/3');count++;
const toggle=F.calculate(1/3,'1/3',{math:true,format:'Norm2'},
 {decimal:true,exactRational:{numerator:'1',denominator:'3'}});
assert.equal(toggle.chosen.kind,'decimal');
assert.equal(toggle.natural.text,'1/3');count+=2;
assert.equal(R.evaluate('sin(30)'),null);count++;
assert.equal(R.evaluate('2^0.5'),null);count++;
assert.throws(()=>R.evaluate('1/0'),/Math ERROR/);count++;
assert.throws(()=>R.evaluate('2+'),/Syntax ERROR/);count++;
for(const [source,want]of [
 ['0.1+0.2',0.3],['10/3*3',10],['2^3^2',512],
 ['sin(30)',0.5],['2^0.5',Math.sqrt(2)]
]){
 const got=M.evaluate(source);
 assert.ok(Math.abs((got-want)/(want||1))<1e-13,source);
 count++;
}
console.log('REA-022:',count,'assertions passed');
