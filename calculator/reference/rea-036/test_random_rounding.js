/* REA-036 — reproducible Ran#, RanInt# and setup-dependent Rnd regression. */
'use strict';
const assert=require('node:assert/strict');
const M=require('../../js/math-engine.js');
require('../../js/number-format.js');
let count=0;
function equal(actual,expected,label){assert.equal(actual,expected,label);count++}
function approx(actual,expected,label){
 assert.ok(Math.abs(actual-expected)<1e-12*Math.max(1,Math.abs(expected)),label+': '+actual+' != '+expected);
 count++;
}
for(const seed of [0,1,42,1234,4294967295]){
 const a=M.createSeededRandom(seed),b=M.createSeededRandom(seed);
 for(let i=0;i<50;i++)equal(a(),b(),'deterministic seed '+seed+' step '+i);
}
assert.throws(()=>M.createSeededRandom(1.2),/Argument ERROR/);count++;
for(const sample of [0,0.0001,0.1239999,0.9999999999]){
 const rnd=()=>sample;
 const value=M.evaluate('Ran#',{random:rnd});
 equal(value,Math.floor(sample*1000)/1000,'Ran# '+sample);
 const scaled=M.evaluate('1000Ran#',{random:rnd});
 equal(scaled,Math.floor(sample*1000),'1000Ran# '+sample);
}
const sequence=[.0779,.4329,.9352,.5181,.0012];
let index=0;
const rng=()=>sequence[index++];
equal(M.evaluate('Ran#',{random:rng}),.077,'first sample');
equal(M.evaluate('Ran#',{random:rng}),.432,'second sample');
equal(M.evaluate('RanInt#(1,6)',{random:rng}),6,'die upper boundary sample');
equal(M.evaluate('RanInt#(-3,-1)',{random:rng}),-2,'signed integer');
equal(M.evaluate('RanInt#(1,6)',{random:rng}),1,'die lower sample');
equal(index,5,'one random sample per use');
for(const [sample,want] of [[0,1],[.2,2],[.499,3],[.9999999,6]]){
 equal(M.evaluate('RanInt#(1,6)',{random:()=>sample}),want,'integer range '+sample);
}
for(const [expression,value]of [
 ['RanInt#(-3,-1)',-3],['RanInt#(-1,1)',-1],
 ['RanInt#(-9999999999,-9999999998)',-9999999999],
 ['RanInt#(0,9999999999)',0]
])equal(M.evaluate(expression,{random:()=>0}),value,expression);
for(const expression of [
 'RanInt#(1,1)','RanInt#(2,1)','RanInt#(1.5,4)',
 'RanInt#(1,4.5)','RanInt#(-10000000000,0)',
 'RanInt#(0,10000000000)','RanInt#(-9999999999,1)'
]){
 assert.throws(()=>M.evaluate(expression,{random:()=>.5}),/Argument ERROR/,expression);
 count++;
}
for(const bad of [-.1,1,Infinity,NaN,'0.5']){
 assert.throws(()=>M.evaluate('Ran#',{random:()=>bad}),/Math ERROR/,'invalid random '+bad);count++;
}
const formatCases=[
 ['Fix',3,'Rnd(10/3)',3.333],
 ['Fix',3,'Rnd(10/3)*3',9.999],
 ['Fix',3,'Rnd(-10/3)',-3.333],
 ['Fix',0,'Rnd(10/3)',3],
 ['Fix',2,'Rnd(1234.567)',1234.57],
 ['Sci',3,'Rnd(12345.678)',12300],
 ['Sci',3,'Rnd(1/3)',.333],
 ['Sci',1,'Rnd(98765)',100000],
 ['Norm1',3,'Rnd(1/3)',.3333333333],
 ['Norm2',3,'Rnd(1/3)',.3333333333],
 ['Norm1',3,'Rnd(100/7)',14.28571429],
 ['Norm2',3,'Rnd(100/7)',14.28571429]
];
for(const [format,digits,expr,expected] of formatCases)
 approx(M.evaluate(expr,{format,digits}),expected,format+' '+expr);
equal(M.evaluate('Rnd(1.255)',{format:'Fix',digits:2}),1.26,'decimal half-up');
assert.throws(()=>M.evaluate('Rnd()',{format:'Fix',digits:3}),/Syntax ERROR/);count++;
assert.throws(()=>M.evaluate('Rnd(1,2)',{format:'Fix',digits:3}),/Syntax ERROR/);count++;
console.log('REA-036: '+count+' random and rounding assertions passed');
