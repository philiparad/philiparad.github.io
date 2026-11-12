#!/usr/bin/env node
/* REA-113: complete 50-key × 3-modifier × PLUS mode/screen legend contract.
 * A legend audit must never throw Argument ERROR for an operational screen.
 */
'use strict';
const assert=require('node:assert/strict');
require('../js/keypad.js');
require('../js/model-profiles.js');
require('../js/legend-audit.js');
const K=global.FreshKeypad, M=global.FreshModels, L=global.FreshLegendAudit;
const models=Object.keys(M.profiles);
const activeScreens=['edit','result','prompt','menu','flow-result','error','calculating',
 'contrast','constant-code','conversion-code','stat-table','eqn-coeff','eqn-result',
 'matrix-table','matrix-expression','matrix-parameter',
 'matrix-result','matrix-scalar','vector-table','vector-parameter','vector-result',
 'vector-scalar','table-grid'];
assert.equal(K.keys.length,50);
assert.equal(new Set(K.keys.map(k=>k.id)).size,50);
for(const screen of activeScreens) assert(L.SCREENS.includes(screen), 'Missing screen '+screen);
let checks=0;
for(const model of models){
 for(const mode of M.get(model).modes){
  for(const screen of [...activeScreens,'future-specialized-screen']){
   for(const key of K.keysForModel(model)){
    for(const modifier of ['normal','SHIFT','ALPHA']){
     const info=L.classify(key,modifier,mode,screen,model,M.supports);
     assert.equal(info.key,key.id);
     assert.equal(info.screen,screen);
     assert.equal(typeof info.status,'string');
     assert(info.status.length>0);
     if(screen==='future-specialized-screen'&&modifier==='normal')
      assert.equal(info.status,'delegated');
     checks++;
    }
   }
  }
 }
}
console.log('REA-113: '+checks+' key/model/mode/screen/modifier classifications PASS');
