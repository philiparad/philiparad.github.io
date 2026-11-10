/* REA-070: model-specific visible face and printed legends.
 * Usage: node calculator/tests/rea070-face-profiles.cjs
 * Source-only assertions; photographic hardware parity is not certified.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const K=require('../js/keypad.js');
const modelIds=['fx-991es','fx-991es-plus','fx-991es-plus-c'];
const byId=(items,id)=>items.find(item=>item.id===id);
let count=0;
const check=(message,fn)=>{fn();count++};
check('50 unique physical keys',()=>{
 assert.equal(K.keys.length,50);
 assert.equal(new Set(K.keys.map(k=>k.id)).size,50);
});
const expected={
 'fx-991es':{COS:{alpha:''},TAN:{alpha:''},'6':{shift:''},DOT:{alpha:''}},
 'fx-991es-plus':{COS:{alpha:'E'},TAN:{alpha:'F'},'6':{shift:''},DOT:{alpha:'RanInt'}},
 'fx-991es-plus-c':{COS:{alpha:'E'},TAN:{alpha:'F'},'6':{shift:'VERIFY'},DOT:{alpha:'RanInt'}}
};
for(const model of modelIds){
 const keys=K.keysForModel(model);
 check(model+' exactly 50 keys',()=>assert.equal(keys.length,50));
 check(model+' preserves key IDs',()=>assert.deepEqual(keys.map(x=>x.id),K.keys.map(x=>x.id)));
 check(model+' preserves measured baseline geometry',()=>{
  for(let i=0;i<keys.length;i++){
   for(const coord of ['cx','cy','w','h'])assert.equal(keys[i][coord],K.keys[i][coord],keys[i].id+': '+coord);
  }
 });
 for(const [id,legends] of Object.entries(expected[model]))
  for(const [field,value] of Object.entries(legends))
   check(model+' '+id+' '+field,()=>assert.equal(byId(keys,id)[field],value));
}
check('original vs C shift VERIF differs',()=>assert.notEqual(byId(K.keysForModel('fx-991es'),'6').shift,byId(K.keysForModel('fx-991es-plus-c'),'6').shift));
const css=fs.readFileSync(path.join(__dirname,'../styles.css'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
for(const model of modelIds){
 check(model+' has own face CSS',()=>assert.ok(css.includes('.face[data-model="'+model+'"]')));
}
check('switch model applies live key legends',()=>assert.match(app,/K\.applyModel\(\$\('keys'\),id\)/));
check('mount uses requested initial model',()=>assert.match(app,/K\.mount\(\$\('keys'\),press,state\.model\)/));
check('render drives selected model',()=>assert.match(app,/face\.dataset\.model=state\.model/));
check('original edition line replaced',()=>assert.match(app,/'TWO WAY POWER'/));
console.log('REA-070 PASS '+count+' model face/legend/source invariants');
