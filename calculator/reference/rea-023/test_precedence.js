/* REA-023 precedence/syntax regression; no external test dependencies. */
'use strict';
const assert=require('node:assert/strict');
const Rational=require('../../js/rational.js');
const Decimal=require('../../js/decimal-core.js');
const MathEngine=require('../../js/math-engine.js');
const cases=[
 ['addition and multiplication','2+3*4',14],
 ['parentheses','(2+3)*4',20],
 ['power right associative','2^3^2',512],
 ['negative before power','-2^2',-4],
 ['parenthesized negative power','(-2)^2',4],
 ['negative exponent','2^-3',0.125],
 ['postfix factorial','3!^2',36],
 ['factorial on exponent','2^3!',64],
 ['factorial right exponent','3^2!',9],
 ['combination','5nCr2',10],
 ['permutation','5nPr2',20],
 ['power before combination','5nCr2^2',5],
 ['signless multiplication over division','6/2(1+2)',1],
 ['explicit multiplication and division left to right','6/2*3',9],
 ['signless multiplication chained','2(3)(4)',24],
 ['fraction with signless multiplication','1/2(3)',1/6],
 ['nested fractions','(1/2)/(3/4)',2/3],
 ['unary plus','+(2+3)',5],
 ['scientific constant','2pi',2*Math.PI],
 ['function implicit multiplication','2sin(30)',1],
 ['power and logarithm','2^log(100)',4]
];
const invalid=['2..3','3.4.5','1 2','2.3.4','1/','2+','3()','5nCr','(2+3'];
let count=0;
for(const [title,expression,expected]of cases){
 const engines=[['scientific',MathEngine.evaluate(expression)]];
 if(!/(?:pi|sin|log|nCr|nPr|!)/.test(expression)){
  engines.push(['decimal',Decimal.evaluate(expression)]);
  const fraction=Rational.evaluate(expression);
  if(fraction!==null)engines.push(['rational',Rational.toNumber(fraction)]);
 }
 for(const [name,got]of engines){
  if(got===null)continue;
  assert.ok(Math.abs(got-expected)<1e-10,
   title+' ['+name+']: '+expression+' got '+got+' expected '+expected);
  count++;
 }
}
for(const expression of invalid){
 for(const [name,engine] of [
  ['scientific',MathEngine],['decimal',Decimal],['rational',Rational]
 ]){
  if(expression==='5nCr'&&name!=='scientific'){
   assert.equal(engine.evaluate(expression),null);
  }else{
   assert.throws(()=>engine.evaluate(expression),
    /Syntax ERROR/,name+' should reject '+expression);
  }
  count++;
 }
}
assert.equal(Rational.evaluate('sin(30)'),null);count++;
assert.equal(Decimal.evaluate('sin(30)'),null);count++;
console.log('REA-023: '+count+' precedence and syntax assertions passed');
