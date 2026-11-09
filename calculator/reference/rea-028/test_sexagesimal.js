/* REA-028 — sexagesimal entry, arithmetic, conversion and validation. */
'use strict';
const assert=require('node:assert/strict');
const Sex=require('../../js/sexagesimal.js');
require('../../js/decimal-core.js');
const M=require('../../js/math-engine.js');
let count=0;
const close=(a,b,msg)=>assert.ok(Math.abs(a-b)<=1e-11*Math.max(1,Math.abs(b)),msg+': '+a+' != '+b);
for(const [input,want,display]of [
 ['2°15′18″',2.255,'2°15′18″'],
 ['2°20′30″+0°39′30″',3,'3°0′0″'],
 ['-2°15′18″',-2.255,'-2°15′18″'],
 ['0°0′30″',1/120,'0°0′30″'],
 ['2°15′18″*2',4.51,'4°30′36″'],
 ['2°15′18″/2',1.1275,'1°7′39″'],
 ['-2°30′0″+0°45′0″',-1.75,'-1°45′0″'],
 ['1°0′0″-2°30′0″',-1.5,'-1°30′0″'],
 ['2°15′18″+1.5',3.755,'3°45′18″']
]){
 const actual=M.evaluate(input);
 close(actual,want,input);count++;
 assert.equal(Sex.format(actual),display,input+' format');count++;
 assert.equal(Sex.hasDMS(input),true,input+' DMS tag');count++;
}
for(const [input,want]of [
 ['sin(30°)',0.5],
 ['3+2*4',11],
 ['1/2+1/4',0.75]
]){
 close(M.evaluate(input),want,input);count++;
}
for(const input of ['2°60′0″','2°0′60″','2°-2′10″']){
 assert.throws(()=>M.evaluate(input),/Argument ERROR|Syntax ERROR/,input);count++;
}
for(const input of ['2°15′','2°15′18','2°15′+1']){
 assert.throws(()=>M.evaluate(input),/Syntax ERROR/,input);count++;
}
for(const [input,want]of [
 ['2','°'],['2°15','′'],['2°15′18','″'],
 ['-2°15′18','″'],['2°15′18″',null],
 ['2°',null],['2°15′',null],['2°15′18″+0','°'],
 ['2°15′18″+0°39','′']
]){
 assert.equal(Sex.nextSeparator(input),want,input+' next key');count++;
}
for(const [input,want]of [
 [2.255,'2°15′18″'],[-2.255,'-2°15′18″'],
 [0,'0°0′0″'],[3,'3°0′0″'],
 [2+59/60+59.9999999/3600,'3°0′0″']
]){assert.equal(Sex.format(input),want);count++}
const decimal=M.evaluate('2°15′18″');
assert.equal(decimal,2.255);count++;
assert.equal(Sex.format(decimal),'2°15′18″');count++;
console.log('REA-028: '+count+' sexagesimal assertions passed');
