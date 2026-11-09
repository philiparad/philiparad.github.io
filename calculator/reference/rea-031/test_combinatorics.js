/* REA-031 — CASIO factorial, nPr and nCr domain and precision regression. */
'use strict';
const assert=require('node:assert/strict');
const M=require('../../js/math-engine.js');
let count=0;
function approx(actual,expected,title,relative=2e-14){
 assert.ok(Number.isFinite(actual),title+' finite');
 assert.ok(Math.abs(actual-expected)<=relative*Math.max(1,Math.abs(expected)),
  title+': '+actual+' expected '+expected);
 count++;
}
const allowed=[
 ['0!',1],['1!',1],['5!',120],['6!',720],
 ['10nPr4',5040],['10nCr4',210],
 ['0nPr0',1],['0nCr0',1],
 ['5nCr2',10],['5nPr2',20],
 ['1000nCr2',499500],['1000nCr999',1000],
 ['100nCr50',1.008913445455642e29],
 ['9999999999nCr0',1],['9999999999nCr1',9999999999],
 ['9999999999nCr9999999998',9999999999],
 ['9999999999nPr2',99999999970000000000],
 ['2+5nCr2*3',32],['5nCr2^2',5],
 ['2^3!',64],['-3!',-6],['(3!)^2',36],
 ['5!+4!',144],['100nPr0',1],['500nCr499',500]
];
for(const [source,want]of allowed)approx(M.evaluate(source),want,source);
approx(M.factorial(69),1.711224524281413e98,'69!');
approx(M.evaluate('69!'),1.711224524281413e98,'69! expression');
approx(M.permutation(69,69),M.factorial(69),'69P69');
assert.equal(M.factorial(0),1);count++;
assert.equal(M.combination(10,4),210);count++;
assert.equal(M.permutation(10,4),5040);count++;
for(const expression of [
 '70!','(-1)!','2.5!','(-0.5)!',
 '10.1nCr2','10nCr2.5','10.5nPr2','10nPr2.5',
 '10nPr11','10nCr11','10nCr-1',
 '10000000000nCr1','10000000000nPr0',
 '100nPr99','99nPr99','1000nCr500','9999999999nCr100',
 '3nCr(1/0)','(-1)nPr0'
]){
 assert.throws(()=>M.evaluate(expression),/Math ERROR/,expression);count++;
}
for(const [fn,args] of [
 [M.factorial,[70]],[M.factorial,[-1]],[M.factorial,[2.5]],
 [M.permutation,[10,11]],[M.permutation,[1e10,0]],
 [M.permutation,[10,2.5]],[M.combination,[10,-1]],
 [M.combination,[1e10,1]],[M.combination,[10,11]]
]){
 assert.throws(()=>fn(...args),/Math ERROR/,fn.name+' '+args);count++;
}
const a=M.combination(9999999999,2);
approx(a,4.9999999985e19,'large nC2');
assert.ok(!Number.isNaN(M.permutation(9999999999,2)));count++;
console.log('REA-031: '+count+' factorial/permutation/combination assertions passed');
