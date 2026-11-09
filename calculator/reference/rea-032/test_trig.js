/* REA-032: trigonometric, inverse and hyperbolic domain/angle regression. */
'use strict';
const assert=require('node:assert/strict');
require('../../js/decimal-core.js');
const M=require('../../js/math-engine.js');
let count=0;
function near(actual,expected,label,tolerance=2e-10){
 assert.ok(Number.isFinite(actual),label+' must be finite');
 assert.ok(Math.abs(actual-expected)<=tolerance*Math.max(1,Math.abs(expected)),label+': '+actual+' != '+expected);
 count++;
}
for(const [expr,angle,want] of [
 ['sin(30)','DEG',.5],['sin(-30)','DEG',-.5],
 ['sin(0)','DEG',0],['sin(90)','DEG',1],['sin(180)','DEG',0],
 ['sin(270)','DEG',-1],['sin(360)','DEG',0],
 ['cos(0)','DEG',1],['cos(90)','DEG',0],['cos(180)','DEG',-1],
 ['cos(270)','DEG',0],['cos(360)','DEG',1],
 ['tan(0)','DEG',0],['tan(45)','DEG',1],['tan(180)','DEG',0],
 ['sin(pi/2)','RAD',1],['cos(pi/2)','RAD',0],['tan(pi/4)','RAD',1],
 ['sin(pi)','RAD',0],['cos(pi)','RAD',-1],
 ['sin(100)','GRAD',1],['cos(100)','GRAD',0],
 ['cos(200)','GRAD',-1],['tan(50)','GRAD',1],
 ['asin(1)','DEG',90],['asin(-1)','DEG',-90],
 ['acos(1)','DEG',0],['acos(-1)','DEG',180],
 ['atan(1)','DEG',45],['atan(-1)','DEG',-45],
 ['asin(.5)','RAD',Math.asin(.5)],['acos(0)','RAD',Math.PI/2],
 ['atan(1)','GRAD',50],['acos(0)','GRAD',100],
 ['sin(1E-12)','RAD',1e-12],['tan(1E-12)','RAD',1e-12],
 ['sin(1000)','DEG',Math.sin(1000*Math.PI/180)]
])near(M.evaluate(expr,{angle}),want,expr+' '+angle);
for(const [expr,want] of [
 ['sinh(0)',0],['sinh(1)',Math.sinh(1)],
 ['cosh(0)',1],['cosh(1)',Math.cosh(1)],
 ['tanh(1)',Math.tanh(1)],['tanh(-1)',Math.tanh(-1)],
 ['asinh(1)',Math.asinh(1)],['acosh(1)',0],
 ['acosh(2)',Math.acosh(2)],['atanh(.5)',Math.atanh(.5)],
 ['atanh(-.5)',Math.atanh(-.5)]
]){
 for(const angle of ['DEG','RAD','GRAD'])near(M.evaluate(expr,{angle}),want,expr+' angle independent '+angle);
}
for(const [expr,angle] of [
 ['tan(90)','DEG'],['tan(-90)','DEG'],['tan(270)','DEG'],
 ['tan(pi/2)','RAD'],['tan(-pi/2)','RAD'],
 ['tan(100)','GRAD'],['tan(300)','GRAD'],
 ['sin(9000000000)','DEG'],['cos(9000000000)','DEG'],
 ['sin(157079632.7)','RAD'],['sin(10000000000)','GRAD'],
 ['asin(1.000001)','DEG'],['asin(-1.000001)','DEG'],
 ['acos(1.000001)','RAD'],['acos(-1.000001)','GRAD'],
 ['sinh(231)','DEG'],['cosh(231)','RAD'],
 ['acosh(.999)','DEG'],['acosh(-2)','RAD'],
 ['atanh(1)','DEG'],['atanh(-1)','RAD'],
 ['atanh(.99999999999)','DEG'],['asinh(5E99)','DEG']
]){
 assert.throws(()=>M.evaluate(expr,{angle}),/Math ERROR/,expr+' '+angle);count++;
}
near(M.evaluate('asin(0)',{angle:'GRAD'}),0,'inverse zero');
near(M.evaluate('cosh(1)',{angle:'DEG'}),M.evaluate('cosh(1)',{angle:'RAD'}),'unit independence');
console.log('REA-032: '+count+' trigonometric and hyperbolic assertions passed');
