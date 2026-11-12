'use strict';
const assert=require('node:assert/strict');
const M=require('../../js/math-engine.js');
const MODELS=require('../../js/model-profiles.js');
const restricted=['GCD(12,18)','LCM(4,6)','Int(3.7)','Intg(-3.2)','Π(X,1,4)','Prod(X,1,4)','Product(X,1,4)'];
for(const model of ['fx-991es','fx-991es-plus']){
 for(const expr of restricted){
  assert.throws(()=>M.evaluate(expr,{model}),/Argument ERROR/,
   model+' should not expose PLUS C-only command '+expr);
 }
 assert.equal(MODELS.supports(model,'INEQ'),false);
 assert.equal(MODELS.supports(model,'VERIF'),false);
 assert.equal(MODELS.supports(model,'DIST'),false);
 assert.equal(M.evaluate('2+3*4',{model}),14);
}
const model='fx-991es-plus-c';
for(const [expr,want] of [
 ['GCD(12,18)',6],['GCD(-12,18)',6],['LCM(4,6)',12],
 ['Int(3.7)',3],['Int(-3.7)',-3],
 ['Intg(-3.2)',-4],['Intg(3.2)',3],
 ['Π(X,1,4)',24],['Prod(X,1,4)',24],['Product(X,1,4)',24]
]){
 assert.equal(M.evaluate(expr,{model}),want,expr);
}
assert.throws(()=>M.evaluate('GCD(0,0)',{model}),/Math ERROR/);
assert.throws(()=>M.evaluate('Π(X,4,1)',{model}),/Argument ERROR/);
assert.equal(MODELS.hasFeature(model,'gcd'),true);
assert.equal(MODELS.hasFeature(model,'lcm'),true);
assert.equal(MODELS.hasFeature(model,'finite-product'),true);
assert.equal(MODELS.hasFeature('fx-991es','gcd'),false);
assert.equal(MODELS.hasFeature('fx-991es-plus','gcd'),false);
assert.equal(M.evaluate('sqrt(9)',{model}),3);
assert.equal(M.evaluate('5 nCr 2',{model}),10);
// Web-only core API has historically supported direct calls with no
// model supplied; do not break unit tests outside device-mode routing.
assert.equal(M.evaluate('GCD(12,18)'),6);
assert.equal(M.evaluate('Π(X,1,4)'),24);
console.log('CASIO edition-only math command gates passed');
