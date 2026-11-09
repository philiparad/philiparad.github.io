/* REA-035: GCD, LCM, Int and Intg domain/keyboard arithmetic regression. */
'use strict';
const assert=require('node:assert/strict');
const M=require('../../js/math-engine.js');
const K=require('../../js/keypad.js');
let assertions=0;
function eq(actual,want,label){assert.equal(actual,want,label);assertions++}
function near(actual,want,label){
 assert.ok(Math.abs(actual-want)<=2e-14*Math.max(1,Math.abs(want)),label+': '+actual+' vs '+want);
 assertions++;
}
for(const [expression,expected] of [
 ['GCD(28,35)',7],['LCM(9,15)',45],
 ['Int(-3.5)',-3],['Intg(-3.5)',-4],['Int(3.5)',3],['Intg(3.5)',3],
 ['GCD(-28,35)',7],['GCD(28,-35)',7],['GCD(-28,-35)',7],
 ['GCD(0,8)',8],['GCD(8,0)',8],['GCD(12,18)',6],
 ['LCM(0,5)',0],['LCM(5,0)',0],['LCM(0,0)',0],
 ['LCM(9,15)+GCD(28,35)',52],
 ['LCM(6,8)',24],['GCD(8*3,6*6)',12],
 ['Int(-3.5)+Intg(-3.5)',-7],
 ['Intg(-2.00001)',-3],['Int(-2.00001)',-2],
 ['Int(0)',0],['Intg(0)',0],['Int(8)',8],['Intg(-8)',-8],
 ['GCD(9999999999,9999999998)',1],['GCD(0,9999999999)',9999999999],
 ['LCM(9999999999,1)',9999999999],
 ['GCD(9999999996,9999999998)',2],
 ['gcd(28,35)',7],['lcm(9,15)',45],['int(-3.5)',-3],['intg(-3.5)',-4]
])eq(M.evaluate(expression),expected,expression);
near(M.evaluate('LCM(9999999999,9999999998)'),9.999999997e19,'large LCM rounded at 15 digits');
for(const source of [
 'GCD(1.5,2)','GCD(2,1.5)','LCM(1.5,2)','LCM(2,1.5)',
 'GCD(10000000000,1)','GCD(-10000000000,1)',
 'LCM(10000000000,1)','LCM(-1,2)','LCM(2,-1)',
 'GCD(Infinity,1)','GCD(28,35,7)','Int()','Intg(1,2)'
]){
 assert.throws(()=>M.evaluate(source),/Math ERROR|Syntax ERROR|Variable ERROR/,source);assertions++;
}
for(const [key,label]of [
 ['MUL','GCD'],['DIV','LCM'],['ADD','Int'],['SUB','Intg']
]){
 const original=K.keys.find(k=>k.id===key);
 assert.ok(original,label+' physical button exists');assertions++;
}
const integer=M.evaluate('GCD(28,35)');
eq(M.evaluate('Int(-3.5)+GCD(28,35)'),4,'compound integer expression');
eq(integer,7,'standalone gcd');
console.log('REA-035: '+assertions+' GCD/LCM/integer assertions passed');
