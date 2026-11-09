/* REA-030: prime factorization numerical and boundary regression. */
'use strict';
const assert=require('node:assert/strict');
const FACT=require('../../js/factorization.js');
const LCD=require('../../js/display.js');
const Keypad=require('../../js/keypad.js');
let checks=0;
for(const [value,expected] of [
 [1,'1'],[2,'2'],[3,'3'],[12,'2²×3'],[225,'3²×5²'],
 [1014,'2×3×13²'],[4104676,'2²×(1026169)'],
 [2036162,'2×(1018081)'],[1018081,'(1018081)'],
 [997,'997'],[1009,'(1009)'],
 [1000000000,'2^9×5^9'],[9999999967,'(9999999967)']
]){
 const result=FACT.factorize(value);
 assert.equal(result.text,expected,String(value));checks++;
 assert.equal(result.kind,'factorization');checks++;
 const reconstruction=result.factors.reduce((n,[p,k])=>n*BigInt(p)**BigInt(k),1n)*BigInt(result.residual||1);
 assert.equal(reconstruction,BigInt(value),String(value)+' reconstruction');checks++;
}
for(const value of [-1,-1234,0,1.5,Math.PI,NaN,Infinity,10000000000,1e20]){
 assert.throws(()=>FACT.factorize(value),/Math ERROR/,String(value));checks++;
}
for(const restriction of [{mode:'MATRIX'},{mode:'COMP',remainder:true},{disallowed:true}]){
 assert.throws(()=>FACT.factorize(1014,restriction),/Math ERROR/);checks++;
}
assert.equal(FACT.factorize(1014,{mode:'COMP'}).text,'2×3×13²');checks++;
const dms=Keypad.keys.find(key=>key.id==='DMS');
assert.equal(dms.shift,'FACT');checks++;
assert.ok(LCD.FONT['²']&&LCD.FONT['³']);checks++;
const original=1014;
const presentation={chosen:FACT.factorize(original)};
const pixels=LCD.rasterize({
 power:true,math:false,mode:'COMP',input:'1014',
 editor:{root:[],path:[],offset:0},screen:'result',result:presentation.chosen.text,
 resultPresentation:presentation,viewport:{inputX:0,inputY:0,resultX:0},contrast:5
});
assert.ok(pixels.reduce((x,y)=>x+y,0)>20);checks++;
console.log('REA-030: '+checks+' factorization assertions passed');
