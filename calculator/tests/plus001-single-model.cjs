/* PLUS-001: single-model identity and isolation from retired profiles. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const P=require('../js/model-profiles.js');
const model='fx-991es-plus';
assert.equal(P.defaultModel,model);
assert.deepEqual(Object.keys(P.profiles),[model]);
assert.equal(P.get().id,model);
assert.equal(P.get(model).id,model);
assert.deepEqual([...P.get().modes],['COMP','CMPLX','STAT','BASE-N','EQN','MATRIX','TABLE','VECTOR']);
assert.equal(P.get().label,'fx-991ES PLUS (2nd edition)');
for(const id of ['fx-991es','fx-991es-plus-c','unknown','',null]){
 assert.equal(P.get(id),null,id+' must not resolve');
 assert.equal(P.supports(id,'COMP'),false);
 assert.equal(P.hasRegister(id,'X'),false);
 assert.equal(P.hasFeature(id,'ran'),false);
}
assert.equal(P.supports(model,'COMP'),true);
assert.equal(P.supports(model,'DIST'),false);
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const standalone=fs.readFileSync(path.join(root,'fx991_fresh_standalone.html'),'utf8');
const controller=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'reference/rea-008/capabilities.json'),'utf8'));
for(const [name,text] of [['index',index],['standalone',standalone],['controller',controller]]){
 assert.doesNotMatch(text,/model-selector|fx-991es-plus-c|fx-991ES PLUS C/i,name);
}
assert.doesNotMatch(controller,/URLSearchParams\(location\.search\).*model/);
assert.match(controller,/const initialModel=MODELS\.defaultModel;/);
assert.deepEqual([...new Set(manifest.features.flatMap(f=>f.models))],[model]);
console.log('PLUS-001 PASS: one strict model, no switching UI or model query routing');
