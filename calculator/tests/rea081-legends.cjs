/* REA-081: exhaustive source inventory of model/key/modifier/mode/screen contexts.
 * Run from calculator/: node tests/rea081-legends.cjs
 * Labels/availability are WEB MODEL classifications, not CASIO hardware traces.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const K=require('../js/keypad.js'),P=require('../js/model-profiles.js');
const A=require('../js/legend-audit.js');
let passed=0;
function test(title,fn){try{fn();passed++}catch(e){e.message=title+': '+e.message;throw e}}
const row=(model,modifier,key,mode='COMP',screen='edit')=>{
 const button=K.keysForModel(model).find(b=>b.id===key);
 assert.ok(button,'Missing key '+key);
 return A.classify(button,modifier,mode,screen,model,P.supports);
};
test('physical key inventory has three profiles and 50 keys each',()=>{
 assert.equal(A.MODELS.length,3);
 for(const model of A.MODELS){
  const keys=K.keysForModel(model);
  assert.equal(keys.length,50);
  assert.equal(new Set(keys.map(k=>k.id)).size,50);
 }
});
test('full inventory exactly covers every dimension',()=>{
 const all=A.inventory(K,P);
 assert.equal(all.length,3*50*3*11*7);
 const signatures=new Set(all.map(r=>[r.model,r.key,r.modifier,r.mode,r.screen].join('|')));
 assert.equal(signatures.size,all.length);
 for(const r of all){
  assert.ok(['available','blocked','unlabelled','unlabelled-control','delegated'].includes(r.status),JSON.stringify(r));
  assert.ok(r.reason&&typeof r.reason==='string');
  assert.ok(A.MODELS.includes(r.model)&&A.MODES.includes(r.mode)&&A.SCREENS.includes(r.screen));
 }
});
test('inventory can be narrowed to a single subset without hard-coded records',()=>{
 const all=A.inventory(K,P,{models:['fx-991es'],modes:['COMP'],
  screens:['edit'],modifiers:['SHIFT','ALPHA']});
 assert.equal(all.length,100);
});
test('no unsupported model ALPHA label is treated as available',()=>{
 for(const model of A.MODELS)for(const mode of A.MODES){
  for(const key of K.keysForModel(model)){
   const r=row(model,'ALPHA',key.id,mode);
   if(!r.legend)assert.ok(['unlabelled','blocked','unlabelled-control'].includes(r.status),JSON.stringify(r));
  }
 }
});
test('top-row and d-pad geometry fields are never ALPHA labels',()=>{
 for(const model of A.MODELS){
  for(const key of ['SHIFT','ALPHA','LEFT','UP','DOWN','RIGHT','MODE','ON']){
   assert.equal(row(model,'ALPHA',key).legend,'');
  }
 }
});
test('SHIFT plus directional arrows is a preserved pan control',()=>{
 for(const model of A.MODELS)for(const key of ['LEFT','UP','DOWN','RIGHT']){
  assert.equal(row(model,'SHIFT',key).status,'unlabelled-control');
 }
});
test('original hidden SHIFT VERIFY is unavailable',()=>{
 assert.equal(row('fx-991es','SHIFT','6').status,'unlabelled');
 assert.equal(row('fx-991es-plus','SHIFT','6').status,'unlabelled');
 assert.equal(row('fx-991es-plus-c','SHIFT','6').status,'available');
});
test('original lacks ALPHA CALC equation equals',()=>{
 assert.equal(row('fx-991es','ALPHA','CALC').status,'unlabelled');
 assert.equal(row('fx-991es-plus','ALPHA','CALC').status,'available');
 assert.equal(row('fx-991es-plus-c','ALPHA','CALC').status,'available');
});
test('PLUS C-only ALPHA product/recurring paths',()=>{
 for(const key of ['INTEGRAL','LOGBASE','SQRT','FRAC','ANS']){
  assert.equal(row('fx-991es-plus-c','ALPHA',key).status,'available',key);
  assert.equal(row('fx-991es','ALPHA',key).status,'unlabelled',key);
 }
});
test('original E and F register legends absent',()=>{
 assert.equal(row('fx-991es','ALPHA','COS').status,'unlabelled');
 assert.equal(row('fx-991es','ALPHA','TAN').status,'unlabelled');
 assert.equal(row('fx-991es-plus','ALPHA','COS').status,'available');
 assert.equal(row('fx-991es-plus-c','ALPHA','TAN').status,'available');
});
test('original hidden FACT is not callable',()=>{
 assert.equal(row('fx-991es','SHIFT','DMS','COMP','result').status,'unlabelled');
 assert.equal(row('fx-991es-plus','SHIFT','DMS','COMP','result').status,'available');
});
test('SHIFT result-only functions blocked in editor',()=>{
 for(const key of ['SD','DMS','ENG']){
  assert.equal(row('fx-991es-plus-c','SHIFT',key,'COMP','edit').status,'blocked',key);
  assert.equal(row('fx-991es-plus-c','SHIFT',key,'COMP','result').status,'available',key);
 }
});
test('COMP-only calculus and SOLVE functions',()=>{
 for(const key of ['CALC','INTEGRAL','LOGBASE']){
  assert.equal(row('fx-991es-plus-c','SHIFT',key,'COMP','edit').status,'available');
  assert.equal(row('fx-991es-plus-c','SHIFT',key,'CMPLX','edit').status,'blocked');
 }
});
test('SHIFT polar input only in CMPLX',()=>{
 assert.equal(row('fx-991es-plus-c','SHIFT','NEG','CMPLX').status,'available');
 assert.equal(row('fx-991es-plus-c','SHIFT','NEG','COMP').status,'blocked');
});
test('COMP-only ALPHA arithmetic function routes',()=>{
 for(const key of ['MUL','DIV','ADD','SUB','DOT','ANS','INTEGRAL','LOGBASE']){
  assert.equal(row('fx-991es-plus-c','ALPHA',key,'COMP').status,'available',key);
  assert.equal(row('fx-991es-plus-c','ALPHA',key,'CMPLX').status,'blocked',key);
 }
});
test('mode-specific shortcuts respect available modes',()=>{
 assert.equal(row('fx-991es','SHIFT','6').status,'unlabelled');
 assert.equal(row('fx-991es-plus-c','SHIFT','6').status,'available');
 assert.equal(row('fx-991es','SHIFT','4').status,'available');
});
test('calculating screen permits only cancellation and power routes',()=>{
 for(const model of A.MODELS){
  for(const key of ['AC','MODE','ON'])
   assert.equal(row(model,'normal',key,'COMP','calculating').status,'available');
  assert.equal(row(model,'normal','SIN','COMP','calculating').status,'blocked');
 }
});
test('error screen offers AC and cursor correction only',()=>{
 for(const model of A.MODELS){
  for(const key of ['AC','LEFT','RIGHT'])
   assert.equal(row(model,'normal',key,'COMP','error').status,'available');
  assert.equal(row(model,'normal','EQUAL','COMP','error').status,'blocked');
 }
});
test('other mode editors explicitly delegated',()=>{
 for(const mode of ['STAT','BASE-N','EQN','MATRIX','TABLE','VECTOR','INEQ','VERIF','DIST']){
  if(!P.supports('fx-991es',mode))continue;
  assert.equal(row('fx-991es','normal','7',mode,'edit').status,'delegated');
 }
});
test('menu prompts use dedicated handlers',()=>{
 for(const screen of ['prompt','menu','flow-result']){
  assert.equal(row('fx-991es-plus-c','SHIFT','SIN','COMP',screen).status,'delegated');
 }
});
test('unlabelled ALPHA key cannot fall back to its normal action',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 assert.match(source,/action\.status==='blocked'\|\|action\.status==='unlabelled'/);
 assert.match(source,/releaseModifier\(\);notify\(modifier\+' '\+key/);
 assert.match(source,/if\(state\.shift&&shifted\(key\)\)return/);
 assert.match(source,/if\(state\.alpha\)\{state\.alpha=false;if\(alphaKey\(key\)!==null\)return\}/);
});
test('audit drives visible context styling and accessibility',()=>{
 const keypad=fs.readFileSync(path.join(__dirname,'../js/keypad.js'),'utf8');
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../styles.css'),'utf8');
 assert.match(keypad,/function applyContext\(root,state,policy,profiles\)/);
 assert.match(keypad,/legend-unavailable/);
 assert.match(keypad,/aria-description/);
 assert.match(css,/\.key-unit\.legend-unavailable/);
 assert.match(app,/K\.applyContext\(\$\('keys'\),state,LEGENDS,MODELS\)/);
});
test('browser download and programmatic inventory exports are wired',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 assert.ok(html.indexOf('js/legend-audit.js')>html.indexOf('js/keypad.js'));
 assert.ok(html.indexOf('js/legend-audit.js')<html.indexOf('js/app.js'));
 assert.match(html,/id="export-legends"/);
 assert.match(app,/legendInventory:\(options\)=>LEGENDS\.inventory\(K,MODELS,options\)/);
 assert.match(app,/rea081-key-modifier-inventory\.json/);
 new Function(app);
});
test('bad inventory requests are rejected',()=>{
 assert.throws(()=>row('fx-991es','invalid','SIN'),/Argument ERROR/);
 assert.throws(()=>row('fx-991es','SHIFT','SIN','INVALID'),/Argument ERROR/);
});
console.log('REA-081 PASS '+passed+' source assertions across 34,650 model/key/modifier/mode/screen records (hardware unverified)');
