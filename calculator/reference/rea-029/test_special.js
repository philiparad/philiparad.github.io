/* REA-029: quotient/remainder, repeating and multi-statement regression. */
'use strict';
const assert=require('node:assert/strict');
const Special=require('../../js/special-arithmetic.js');
const Rational=require('../../js/rational.js');
require('../../js/decimal-core.js');
const MathEngine=require('../../js/math-engine.js');
let assertions=0;
function eq(got,want,label){assert.equal(got,want,label);assertions++}
function close(got,want,label){assert.ok(Math.abs(got-want)<1e-12,label);assertions++}
for(const [source,expression,q,r] of [
 ['5÷R2','2',2,1],['10÷R3','3',3,1],['10+17÷R6','10+2',null,null],
 ['5.5÷R2','2',2,1.5],['-5÷R2','(-5/2)',null,null],
 ['20000000000÷R17','(20000000000/17)',null,null]
]){
 const data=Special.remainderExpression(source);
 eq(data.expression,expression,source+' expression');
 eq(data.remainder?.quotient??null,q,source+' quotient');
 eq(data.remainder?.remainder??null,r,source+' remainder');
 if(data.remainder===null)close(MathEngine.evaluate(data.expression),MathEngine.evaluate(expression),source+' fallback');
}
assert.throws(()=>Special.remainderExpression('5÷R0'),/Math ERROR/);assertions++;
eq(Special.expandRecurring('0.RPT(3)'),'(3/9)','one-digit repeat');
eq(Special.expandRecurring('1.RPT(021)'),'(1020/999)','leading zero repeat');
eq(Special.expandRecurring('0.RPT(90)'),'(90/99)','two-digit repeat');
eq(Special.expandRecurring('0.RPT(123456789012345)'),'0.123456789012345','overlong terminating');
const fraction=Rational.evaluate(Special.expandRecurring('0.RPT(3)'));
eq(Rational.serialize(fraction).numerator,'1','rational numerator');
eq(Rational.serialize(fraction).denominator,'3','rational denominator');
const added=Rational.evaluate(Special.expandRecurring('1.RPT(021)+2.RPT(312)'));
eq(Rational.serialize(added).numerator,'10','manual sum numerator');
eq(Rational.serialize(added).denominator,'3','manual sum denominator');
assert.throws(()=>Special.expandRecurring('0.RPT()'),/Syntax ERROR/);assertions++;
for(const [fractionData,text] of [
 [{numerator:'1',denominator:'3'},'0.(3)'],
 [{numerator:'1',denominator:'7'},'0.(142857)'],
 [{numerator:'10',denominator:'3'},'3.(3)'],
 [{numerator:'-1',denominator:'6'},'-0.1(6)']
])eq(Special.recurringOf(fractionData).text,text,'repeating output');
eq(Special.recurringOf({numerator:'1',denominator:'2'}),null,'terminating not repeated');
eq(Special.splitStatements('3+3:3*3').length,2,'two statements');
eq(Special.splitStatements('1:(2+3):4').length,3,'nested statements');
eq(Special.splitStatements('(2:3)')[0], '(2:3)', 'nested colon not split');
assert.throws(()=>Special.splitStatements('1::2'),/Syntax ERROR/);assertions++;
assert.throws(()=>Special.splitStatements(':1'),/Syntax ERROR/);assertions++;
console.log('REA-029: '+assertions+' special-operation assertions passed');
