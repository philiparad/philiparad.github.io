/* REA-021 standalone Node regression: no third-party dependencies. */
const assert=require('node:assert/strict');
const dec=require('../../js/decimal-core.js');
const M=require('../../js/math-engine.js');
const checks=[
 ['0.1+0.2',0.3],['1/3+1/6',0.5],['10/3*3',10],
 ['0.1+0.2+0.3',0.6],['(0.1+0.2)*10',3],
 ['2^3^2',512],['-2^2',-4],['(-2)^2',4],
 ['1e-8+2e-8',3e-8],['1e20+1',1e20],
 ['1.23456789012345+0.000000000000005',1.23456789012346],
 ['0.0000000001*0.0000000002',2e-20],
 ['12.5/2.5',5],['1/8',0.125],['4/-2',-2],
 ['-(3+4)*2',-14],['2(3+4)',14],['2^-3',0.125],
 ['1e-99',1e-99],['(1+2)*(3+4)',21]
];
for(const [src,want]of checks){
 const got=M.evaluate(src);
 assert.ok(Math.abs((got-want)/(want||1))<1e-13,src+': '+got+' vs '+want)
}
assert.equal(dec.evaluate('sin(30)'),null);
assert.equal(dec.evaluate('2^0.5'),null);
assert.ok(Math.abs(M.evaluate('sin(30)')-0.5)<1e-14);
assert.ok(Math.abs(M.evaluate('2^0.5')-Math.sqrt(2))<1e-14);
assert.throws(()=>M.evaluate('1/0'),/Math ERROR/);
assert.throws(()=>M.evaluate('2+'),/Syntax ERROR/);
console.log('REA-021: '+(checks.length+6)+' decimal and fallback checks passed');
