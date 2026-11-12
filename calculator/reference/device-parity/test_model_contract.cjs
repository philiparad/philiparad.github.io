'use strict';
const assert=require('node:assert/strict');
const models=require('../../js/model-profiles.js');
const menus=require('../../js/menu-model.js');
const keypad=require('../../js/keypad.js');
const cases=require('./cases.json');
const ids=Object.keys(cases.models);
assert.deepEqual(ids,['fx-991es','fx-991es-plus','fx-991es-plus-c']);
assert.equal(cases.hardwareVerified,false);
assert.equal(cases.scenarios.length,18);
const usedIds=new Set();
for(const c of cases.scenarios){
 assert.ok(c.id);
 assert.ok(!usedIds.has(c.id),'duplicate scenario');
 usedIds.add(c.id);
 assert.ok(Array.isArray(c.keys)&&c.keys.length>0);
 for(const key of c.keys)assert.ok(keypad.keys.some(k=>k.id===key),'unknown key '+key);
 assert.ok(c.manualArea);
 assert.ok(Object.keys(c.expect).length>0);
}
const modes=cases.models['fx-991es'].modes;
for(const model of ids){
 const profile=cases.models[model];
 assert.equal(models.get(model).id,model);
 assert.equal(models.supports(model,'COMP'),true);
 assert.deepEqual([...models.registers(model)],profile.registers);
 assert.deepEqual([...models.get(model).modes],profile.modes);
 assert.equal(menus.modeEntries(model).length,profile.modes.length);
 assert.deepEqual(menus.modeEntries(model).map(entry=>entry.label),profile.modes);
 assert.equal(keypad.keysForModel(model).length,50);
 assert.equal(models.get(model).hardwareVerified,false);
 const active=cases.scenarios.filter(c=>
  (!c.onlyModels||c.onlyModels.includes(model))&&
  (!c.excludeModels||!c.excludeModels.includes(model)));
 assert.ok(active.length>=17);
 for(const c of active){
  for(const label of c.expect.menuContains||[]){
   assert.ok(menus.modeEntries(model).some(e=>e.key+'. '+e.label===label),
    model+' must expose menu '+label);
  }
  for(const label of c.expect.menuAbsent||[]){
   assert.ok(!menus.modeEntries(model).some(e=>e.key+'. '+e.label===label),
    model+' must not expose menu '+label);
  }
 }
}
assert.equal(modes.length,8);
assert.equal(cases.models['fx-991es-plus-c'].modes.length,11);
for(const id of ['fx-991es','fx-991es-plus']){
 for(const mode of ['INEQ','VERIF','DIST'])assert.equal(models.supports(id,mode),false);
}
for(const mode of ['INEQ','VERIF','DIST'])assert.equal(models.supports('fx-991es-plus-c',mode),true);
assert.equal(models.hasRegister('fx-991es','E'),false);
assert.equal(models.hasRegister('fx-991es','F'),false);
assert.equal(models.hasRegister('fx-991es-plus','E'),true);
assert.equal(models.hasRegister('fx-991es-plus-c','F'),true);
assert.equal(keypad.keysForModel('fx-991es').find(k=>k.id==='COS').alpha,'');
assert.equal(keypad.keysForModel('fx-991es-plus').find(k=>k.id==='COS').alpha,'E');
assert.equal(keypad.keysForModel('fx-991es-plus-c').find(k=>k.id==='6').shift,'VERIFY');
assert.ok(!keypad.keysForModel('fx-991es').find(k=>k.id==='6').shift);
console.log('Three-model manual-derived parity contract passed');
