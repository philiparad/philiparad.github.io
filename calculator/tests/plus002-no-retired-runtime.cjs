/* PLUS-002 — enforce the supported-model boundary across published runtime. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sourceScripts=[...index.matchAll(/<script src="(js\/[^"]+\.js)"\s*><\/script>/g)].map(m=>m[1]);
assert.equal(sourceScripts.length,40,'All live JS modules must be listed explicitly');
assert.equal(new Set(sourceScripts).size,sourceScripts.length,'Duplicate module');
const files=['index.html','styles.css','js/numeric-worker.js','parity-lab.html',
 'fx991_fresh_standalone.html',...sourceScripts];
const retired=/(?:fx-991es-plus-c|fx-991es(?![- ]plus)|PLUS\s*C\b|\bINEQ\b|\bVERIF\b|\bDIST\b|model-selector)/i;
for(const filename of files){
 const content=fs.readFileSync(path.join(root,filename),'utf8');
 assert.doesNotMatch(content,retired,filename+' contains retired-model code or labels');
}
const keySource=fs.readFileSync(path.join(root,'js/keypad.js'),'utf8');
assert.doesNotMatch(keySource,/\['6','6','VERIFY'/);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'reference/rea-008/capabilities.json'),'utf8'));
assert.deepEqual([...new Set(manifest.features.flatMap(f=>f.models))],['fx-991es-plus']);
console.log('PLUS-002 PASS: '+files.length+' live files contain no retired-model behavior');
