/* REA-025 — deterministic display-format regression (Node.js). */
'use strict';
const assert=require('node:assert/strict');
const NumberFormat=require('../../js/number-format.js');
const MathEngine=require('../../js/math-engine.js');
const Results=require('../../js/result-format.js');
let assertions=0;
const cases=[
 [1.005,{format:'Fix',digits:2},'1.01'],
 [2.675,{format:'Fix',digits:2},'2.68'],
 [-1.005,{format:'Fix',digits:2},'-1.01'],
 [9.995,{format:'Sci',digits:3},'1.00×10^1'],
 [1.9995,{format:'Sci',digits:4},'2.000×10^0'],
 [100/7,{format:'Fix',digits:3},'14.286'],
 [100/7,{format:'Fix',digits:2},'14.29'],
 [1/7,{format:'Sci',digits:5},'1.4286×10^-1'],
 [1/7,{format:'Sci',digits:4},'1.429×10^-1'],
 [1/7,{format:'Sci',digits:0},'1.428571429×10^-1'],
 [0,{format:'Sci',digits:5},'0.0000×10^0'],
 [1,{format:'Sci',digits:4},'1.000×10^0'],
 [0,{format:'Fix',digits:3},'0.000'],
 [-0,{format:'Fix',digits:3},'0.000'],
 [-0.00001,{format:'Fix',digits:2},'0.00'],
 [0.005,{format:'Norm1'},'5×10^-3'],
 [0.005,{format:'Norm2'},'0.005'],
 [0.01,{format:'Norm1'},'0.01'],
 [1e-9,{format:'Norm2'},'0.000000001'],
 [9.99e-10,{format:'Norm2'},'9.99×10^-10'],
 [1e-14,{format:'Norm2'},'1×10^-14'],
 [1e10,{format:'Norm2'},'1×10^10'],
 [-2.35,{format:'Fix',digits:1},'-2.4'],
 [1.25,{format:'Fix',digits:1,decimalSeparator:'comma'},'1,3'],
 [0.000001,{format:'Norm2'},'0.000001'],
 [1e-8,{format:'Norm2'},'0.00000001'],
 [2e-7,{format:'Norm2'},'0.0000002'],
 [1000,{format:'Norm1'},'1000'],
 [9.999999999e9,{format:'Norm2'},'9999999999']
];
for(const [value,settings,expected] of cases){
 for(const [name,formatter] of [
  ['number format',NumberFormat.format],
  ['math engine',MathEngine.format],
  ['result formatter',Results.decimal]
 ]){
  assert.equal(formatter(value,settings),expected,name+': '+value+' '+JSON.stringify(settings));
  assertions++;
 }
}
assert.equal(Results.calculate(1/3,'1/3',{format:'Fix',digits:3,math:true},
 {exactRational:{numerator:'1',denominator:'3'}}).chosen.text,'0.333'); assertions++;
assert.equal(Results.calculate(1/3,'1/3',{format:'Norm2',math:true},
 {exactRational:{numerator:'1',denominator:'3'}}).chosen.text,'1/3'); assertions++;
assert.equal(Results.calculate(1/3,'1/3',{format:'Norm2',math:true},
 {decimal:true,exactRational:{numerator:'1',denominator:'3'}}).chosen.text,'0.3333333333'); assertions++;
assert.equal(NumberFormat.format(Infinity,{format:'Norm2'}),'Math ERROR');assertions++;
assert.equal(NumberFormat.format(NaN,{format:'Fix',digits:3}),'Math ERROR');assertions++;
console.log('REA-025: '+assertions+' formatter assertions passed');
