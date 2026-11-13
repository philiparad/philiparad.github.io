#!/usr/bin/env node
/* PLUS-026: complete fx-991ES PLUS source-policy matrix, not firmware keylogs. */
'use strict';
const A=require('node:assert/strict');
require('../js/model-profiles.js');
require('../js/keypad.js');
require('../js/legend-audit.js');
const P=global.FreshModels,K=global.FreshKeypad,L=global.FreshLegendAudit;
const model=P.MODEL,keys=K.keysForModel(model),screens=L.SCREENS;
const modes=P.get(model).modes,modifiers=L.MODIFIERS;
const allowed=new Set(['available','blocked','unlabelled','delegated','unlabelled-control']);
A.equal(model,'fx-991es-plus');
A.equal(Object.keys(P.profiles).length,1);
A.equal(keys.length,50);A.equal(new Set(keys.map(k=>k.id)).size,50);
A.deepEqual(modifiers,['normal','SHIFT','ALPHA']);
A.equal(modes.length,8);A.equal(screens.length,24);
const expected=keys.length*modes.length*screens.length*modifiers.length;
const rows=L.inventory(K,P);
A.equal(rows.length,expected);
const seen=new Set();
for(const row of rows){
 const id=[row.model,row.mode,row.screen,row.key,row.modifier].join('/');
 A.equal(row.model,model,id);A.ok(!seen.has(id),'duplicate '+id);seen.add(id);
 A.ok(allowed.has(row.status),'unknown status '+id);
 A.ok(typeof row.reason==='string'&&row.reason.length>0,'reason '+id);
 A.equal(typeof row.legend,'string',id);
 const key=keys.find(k=>k.id===row.key);A.ok(key,'unknown key '+id);
 A.deepEqual(row,L.classify(key,row.modifier,row.mode,row.screen,model,P.supports),id);
 if(row.screen==='error'&&row.modifier==='normal'&&
    !['AC','LEFT','RIGHT'].includes(row.key)&&row.legend)
  A.equal(row.status,'blocked',id);
 if(row.screen==='calculating'&&row.modifier==='normal'&&
    !['AC','MODE','ON'].includes(row.key)&&row.legend)
  A.equal(row.status,'blocked',id);
}
A.equal(seen.size,expected);
for(const mode of modes)for(const screen of screens)for(const modifier of modifiers)
 A.equal(rows.filter(r=>r.mode===mode&&r.screen===screen&&r.modifier===modifier).length,
  50,'incomplete '+mode+'/'+screen+'/'+modifier);
const numbered=keys.find(k=>k.id==='1');
A.equal(L.classify(numbered,'normal','COMP','future-specialized-screen',model,P.supports).status,'delegated');
A.throws(()=>L.classify(numbered,'BAD','COMP','edit',model,P.supports),/Argument ERROR/);
A.throws(()=>L.classify(numbered,'normal','BAD','edit',model,P.supports),/Argument ERROR/);
A.throws(()=>L.classify(null,'normal','COMP','edit',model,P.supports),/Argument ERROR/);
console.log('PLUS-026 PASS: '+expected+' complete 50-key × 3-modifier × 8-mode × 24-screen policy cells (unit-only)');
