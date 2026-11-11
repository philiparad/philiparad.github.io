/* REA-099 — fail-closed public evidence and per-model capture planning.
 * Run: node calculator/tests/rea099-evidence-integrity.cjs
 * Assertions cover metadata/source only; no hardware evidence is generated.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const load=p=>fs.readFileSync(path.join(root,p),'utf8');
const manifest=JSON.parse(load('reference/rea-008/capabilities.json'));
const plan=JSON.parse(load('reference/rea-099/evidence-plan.json'));
const html=load('fx991_fresh_standalone.html');
const ui=load('js/capability-ui.js'),gate=load('reference/rea-008/gate.py');
let checks=0;
function test(name,fn){try{fn();checks++}catch(e){e.message=name+': '+e.message;throw e}}
test('unchanged public schema',()=>assert.equal(manifest.schema,'fx991-rea008-capability-gate-v1'));
test('versioned evidence plan schema',()=>assert.equal(plan.schema,'fx991-rea099-evidence-plan-v1'));
test('source-only parity state',()=>assert.equal(manifest.policy.parity_claims_allowed,false));
test('25 public feature records',()=>assert.equal(manifest.features.length,25));
test('capture plan covers every feature/model pair',()=>assert.equal(
 plan.cases.length,manifest.features.reduce((a,f)=>a+f.models.length,0)));
const ids=new Set();
for(const feature of manifest.features){
 test(feature.id+' unique ID',()=>{assert.ok(!ids.has(feature.id));ids.add(feature.id)});
 test(feature.id+' is not hardware-verified',()=>{
  assert.notEqual(feature.status,'hardware-verified');
  assert.equal(feature.hardware_verified,false);
  assert.deepEqual(feature.native_evidence_ids,[]);
  assert.deepEqual(feature.verified_models,[]);
 });
 for(const model of feature.models){
  const candidates=plan.cases.filter(c=>c.feature_id===feature.id&&c.model_id===model);
  test(feature.id+'/'+model+' exactly one capture plan',()=>assert.equal(candidates.length,1));
  test(feature.id+'/'+model+' is explicitly pending',()=>{
   const c=candidates[0];
   assert.equal(c.status,'PENDING_DEVICE_CAPTURE');
   assert.deepEqual(c.keys,[]);
   assert.deepEqual(c.lcd_frames,[]);
   assert.equal(c.device.capture_date,null);
   assert.equal(c.web_comparison.status,'NOT_RUN');
  });
 }
}
test('no feature/model capture duplicates',()=>assert.equal(
 new Set(plan.cases.map(c=>c.feature_id+'|'+c.model_id)).size,plan.cases.length));
test('standalone embeds exact canonical manifest',()=>{
 const match=html.match(/<script type="application\/json" id="capability-manifest">\s*([\s\S]*?)\s*<\/script>/);
 assert.ok(match);
 assert.deepEqual(JSON.parse(match[1]),manifest);
});
for(const source of [ui,html])test('public renderer fails closed on missing native evidence',()=>{
 assert.ok(source.includes('Unverified — missing model-specific native evidence'));
 assert.ok(source.includes('item.verified_models.includes(model)'));
});
for(const phrase of ['def matching_evidence','case.get("feature_id") != feature_id',
 'case.get("model_id") != model','verified_models must match advertised models',
 'missing independently reviewed native comparison',
 'review.get("reviewer")==capture.get("operator")'])
 test('gate includes '+phrase,()=>assert.ok(gate.includes(phrase)));
console.log('REA-099 PASS '+checks+' integrity checks: no physical captures or hardware parity certified');
