/* REA-033 — Pol/Rec conversion, angle normalization and syntax tests. */
'use strict';
const assert=require('node:assert/strict');
require('../../js/decimal-core.js');
require('../../js/sexagesimal.js');
const MathEngine=require('../../js/math-engine.js');
const Coordinates=require('../../js/coordinates.js');
let assertions=0;
function eq(actual,expected,msg){assert.equal(actual,expected,msg);assertions++}
function approx(actual,expected,msg){
 assert.ok(Math.abs(actual-expected)<=3e-12*Math.max(1,Math.abs(expected)),msg+': '+actual+' expected '+expected);
 assertions++;
}
function calc(source,angle='DEG',memory={}){
 return Coordinates.evaluate(source,{angle,memory},(part,opt)=>MathEngine.evaluate(part,opt));
}
for(const [source,operation,args] of [
 ['Pol(1,1)','Pol',['1','1']],
 ['Rec(sqrt(2),45)','Rec',['sqrt(2)','45']],
 [' Pol( sin(30), cos(60) ) ','Pol',['sin(30)','cos(60)']],
 ['Rec(2,atan(1))','Rec',['2','atan(1)']]
]){
 const parsed=Coordinates.parse(source);
 eq(parsed.operation,operation,'parse operation '+source);
 eq(parsed.arguments.join('|'),args.join('|'),'parse arguments '+source);
}
eq(Coordinates.parse('1+2'),null,'ordinary expression');
for(const [source,kind] of [
 ['Pol(1)','Syntax ERROR'],
 ['Pol(1,2,3)','Syntax ERROR'],
 ['Rec(,3)','Syntax ERROR'],
 ['Pol(1,)','Syntax ERROR'],
 ['Pol(1,2','Syntax ERROR'],
 ['Pol(1,2)+1','Syntax ERROR'],
 ['Pol(sin(1,2)','Syntax ERROR']
]){
 assert.throws(()=>calc(source),/Syntax ERROR/,source);assertions++;
}
const ref=calc('Pol(sqrt(2),sqrt(2))');
eq(ref.firstLabel,'r','Pol label r');
eq(ref.secondLabel,'θ','Pol label theta');
approx(ref.first,2,'Pol manual radius');
approx(ref.second,45,'Pol manual theta');
const reverse=calc('Rec(sqrt(2),45)');
approx(reverse.first,1,'Rec manual X');
approx(reverse.second,1,'Rec manual Y');
for(const [a,b,deg] of [
 [1,0,0],[0,1,90],[-1,0,180],[0,-1,-90],
 [-1,-1,-135],[-1,1,135],[1,-1,-45],[0,0,0]
]){
 const p=Coordinates.coordinate('Pol',a,b,'DEG');
 approx(p.second,deg,'Pol degree quadrant '+a+','+b);
 approx(p.first,Math.hypot(a,b),'Pol radius '+a+','+b);
}
const rad=calc('Pol(1,1)','RAD');
approx(rad.second,Math.PI/4,'radian theta');
const grad=calc('Pol(1,1)','GRAD');
approx(grad.second,50,'gradian theta');
approx(calc('Pol(-1,0)','RAD').second,Math.PI,'negative x axis normalized radians');
approx(calc('Pol(-1,0)','GRAD').second,200,'negative x axis normalized grad');
for(const [unit,theta]of [['DEG',45],['RAD',Math.PI/4],['GRAD',50]]){
 const result=Coordinates.coordinate('Rec',Math.sqrt(2),theta,unit);
 approx(result.first,1,'Rec x '+unit);
 approx(result.second,1,'Rec y '+unit);
}
const signed=Coordinates.coordinate('Rec',-2,30,'DEG');
approx(signed.first,-Math.sqrt(3),'signed radius x');
approx(signed.second,-1,'signed radius y');
approx(calc('Rec(2,45°)','RAD').first,Math.sqrt(2),'degree-marked angle interpreted in RAD');
for(const [name,a,b]of [
 ['Rec',Infinity,10],['Pol',Infinity,1],['Rec',1,Infinity],
 ['Pol',1e100,1],['Rec',1e100,1]
]){
 assert.throws(()=>Coordinates.coordinate(name,a,b,'DEG'),/Math ERROR/,name+' domain');assertions++;
}
assert.throws(()=>Coordinates.coordinate('Pol',1,1,'UNKNOWN'),/Math ERROR/);assertions++;
const mem={X:4,Y:5};
approx(calc('Pol(X,Y)','DEG',mem).first,Math.hypot(4,5),'register argument');
console.log('REA-033: '+assertions+' coordinate assertions passed');
