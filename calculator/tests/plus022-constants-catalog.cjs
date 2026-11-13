#!/usr/bin/env node
/* PLUS-022: manufacturer fx-991ES PLUS 2nd edition CONST code and value contract.
 * CASIO user guide: https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/function_calculations/scientific_constants.html
 * Printed values/device glyph parity still require a physical capture.
 */
'use strict';
const A=require('node:assert/strict');
const C=require('../js/scientific-constants.js');
const M=require('../js/math-engine.js');
const model='fx-991es-plus';
const names=[
 'proton mass','neutron mass','electron mass','muon mass','Bohr radius',
 'Planck constant','nuclear magneton','Bohr magneton','reduced Planck constant',
 'fine-structure constant','classical electron radius','Compton wavelength',
 'proton gyromagnetic ratio','proton Compton wavelength','neutron Compton wavelength',
 'Rydberg constant','atomic mass constant','proton magnetic moment',
 'electron magnetic moment','neutron magnetic moment','muon magnetic moment',
 'Faraday constant','elementary charge','Avogadro constant','Boltzmann constant',
 'molar volume of ideal gas','molar gas constant','speed of light in vacuum',
 'first radiation constant','second radiation constant','Stefan-Boltzmann constant',
 'electric constant','magnetic constant','magnetic flux quantum',
 'standard acceleration of gravity','conductance quantum',
 'characteristic impedance of vacuum','Celsius temperature offset',
 'Newtonian constant of gravitation','standard atmosphere'
];
const reference=[
 1.672621898e-27,1.674927471e-27,9.10938356e-31,1.883531594e-28,
 5.2917721067e-11,6.62607004e-34,5.050783699e-27,9.274009994e-24,
 1.0545718e-34,0.0072973525664,2.8179403227e-15,2.4263102367e-12,
 267522190,1.32140985396e-15,1.31959090481e-15,10973731.568508,
 1.66053904e-27,1.4106067873e-26,-9.28476462e-24,-9.662365e-27,
 -4.49044826e-26,96485.33289,1.6021766208e-19,6.022140857e23,
 1.38064852e-23,0.022710947,8.3144598,299792458,
 3.74177179e-16,0.0143877736,5.670367e-8,8.854187817e-12,
 1.2566370614359173e-6,2.067833831e-15,9.80665,
 7.748091731e-5,376.730313461,273.15,6.67408e-11,101325
];
A.equal(C.ITEMS.length,40);A.equal(names.length,40);
A.equal(reference.length,40);A.deepEqual(Object.keys(C.MODELS),[model]);
A.equal(C.MODELS[model],2014);
let checks=5;
for(let i=0;i<40;i++){
 const code=String(i+1).padStart(2,'0');
 const item=C.select(model,code);
 A.equal(item.code,code,code+' order');
 A.equal(item.name,names[i],code+' name');
 A.equal(item.year,2014);
 A.equal(item.value,reference[i],code+' stored CODATA 2014 value');
 A.ok(item.symbol&&item.unit!==undefined,code+' identifier');
 const literal=C.literal(item);
 const computed=M.evaluate(literal,{mode:'COMP',angle:'DEG',math:false,ans:0,memory:{}});
 A.ok(Number.isFinite(computed),code+' finite evaluation');
 A.ok(Math.abs(computed-item.value)<=Math.max(1e-99,Math.abs(item.value)*1e-12),
  code+' literal precision: '+computed+' vs '+item.value);
 const editor=C.codeEditor();
 A.equal(C.type(editor,code[0],model),null);
 A.equal(C.type(editor,code[1],model).code,code);
 checks+=9;
}
for(const invalid of ['00','41','99','ABC','-1'])
 {A.throws(()=>C.select(model,invalid),/Argument ERROR/);checks++;}
A.throws(()=>C.select('unsupported','28'),/Argument ERROR/);checks++;
const ed=C.codeEditor();
C.type(ed,'2',model);
C.backspace(ed);A.equal(ed.buffer,'');checks++;
C.type(ed,'2',model);
A.equal(C.type(ed,'8',model).value,299792458);checks++;
A.throws(()=>C.type(ed,'0',model),/Syntax ERROR/);checks++;
A.throws(()=>C.type(C.codeEditor(),'X',model),/Argument ERROR/);checks++;
const light=C.select(model,'28');
A.equal(light.value,299792458);checks++;
A.equal(C.select(model,'38').value,273.15);checks++;
A.equal(C.select(model,'40').value,101325);checks++;
console.log('PLUS-022 PASS: '+checks+' checks covering all 40 CONSTANT codes, ordering, stored values, numeric evaluation and code editing (simulation only)');
