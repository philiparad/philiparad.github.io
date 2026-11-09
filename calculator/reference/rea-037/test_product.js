/* REA-037 — finite product Π regression, manual examples, bounds and step extension. */
'use strict';
const assert=require('node:assert/strict');
const M=require('../../js/math-engine.js');
let passed=0;
function eq(expr,expected,opts={}){
 const actual=M.evaluate(expr,opts);
 assert.ok(Math.abs(actual-expected)<1e-11*Math.max(1,Math.abs(expected)),
  expr+': expected '+expected+' but got '+actual);
 passed++;
}
for(const [expression,expected]of [
 ['Prod(X+1,1,5)',720],['Prod(X,1,5)',120],
 ['Prod(X,3,3)',3],['Prod(X,-3,-1)',-6],
 ['Prod(X,0,4)',0],['Prod(X^2,1,3)',36],
 ['Prod(X,2,8,2)',384],['Prod(X,1,5,2)',15],
 ['Prod(X+1,1,5,2)',48],['Prod(1/X,1,5)',1/120],
 ['Prod(sqrt(X),1,3)',Math.sqrt(6)],
 ['Prod(X^2+1,-2,2)',100],
 ['Prod(X,1,1)',1],['Prod(2,1,20)',1048576],
 ['Prod(2,1,100)',2**100],['Prod(1,1,20000)',1],
 ['Prod(X,1,4)',24],['Product(X+1,1,5)',720],
 ['Π(X+1,1,5)',720],
 ['Prod(A+X,1,4)',360]
])eq(expression,expected,{memory:{A:2,X:9999}});
for(const [expression,expected]of [
 ['Prod(sin(X),30,90,30)',Math.sin(30*Math.PI/180)*Math.sin(60*Math.PI/180)],
 ['Prod(X,1,3,2)',3]
])eq(expression,expected,{angle:'DEG'});
for(const source of [
 'Prod(X,5,1)','Prod(X,1,5,0)','Prod(X,1,5,-1)',
 'Prod(X,1,5,.5)','Prod(X,1.5,5)',
 'Prod(X,-10000000000,3)','Prod(X,1,10000000000)',
 'Prod(X,1,20001)','Prod(X,1,2,10000000000)',
 'Prod(X,1,5,2,3)','Prod(X,1)','Prod(X,1,5',
 'Prod(X,1,,3)','Prod(1/X,0,4)','Prod(100,1,51)',
 'Prod(Pol(1,2),1,3)','Prod(Rec(1,2),1,3)',
 'Prod(X÷R2,1,3)','Prod(Prod(X,1,3),1,3)',
 'Prod(X,Prod(2,1,3),5)',
 'Prod(X,1,3,Prod(1,1,3))'
]){
 assert.throws(()=>M.evaluate(source),/Argument ERROR|Syntax ERROR|Math ERROR/,source);
 passed++;
}
const parsed=M.parseProduct('Prod((X+1)*(X+2),2,5,2)');
assert.equal(parsed.expression,'(X+1)*(X+2)');passed++;
assert.equal(parsed.a,'2');passed++;
assert.equal(parsed.b,'5');passed++;
assert.equal(parsed.step,'2');passed++;
eq('Prod((X+1)*(X+2),2,5,2)',12*30);
const referenceMemory={X:121,A:4};
eq('Prod(X+A,1,3)',5*6*7,{memory:referenceMemory});
assert.equal(referenceMemory.X,121,'must not modify X');passed++;
assert.equal(referenceMemory.A,4,'must not modify A');passed++;
assert.equal(M.parseProduct('2+2'),null,'unrelated expression');passed++;
console.log('REA-037: '+passed+' product assertions passed');
