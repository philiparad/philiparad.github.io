/* Generate the full, machine-readable 50-key × 3 modifiers × modes × screens
 * × models inventory. Run from repo root:
 * node calculator/reference/rea-081/generate_inventory.cjs
 * This writes rea081-inventory.json alongside the generator.
 * Generated statuses describe an independent web app, not native firmware.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const K=require(path.join(root,'js/keypad.js'));
const L=require(path.join(root,'js/legend-audit.js'));
const M=require(path.join(root,'js/model-profiles.js'));
const rows=L.inventory(K,M);
const expected=L.MODELS.length*L.MODES.length*L.SCREENS.length*
 L.MODIFIERS.length*50;
if(rows.length!==expected)throw Error('Incomplete legend inventory');
const payload={
 schema:'rea081-key-legends-v1',
 scope:'independent web calculator',
 manufacturerHardwareVerified:false,
 dimensions:{models:L.MODELS,modes:L.MODES,screens:L.SCREENS,
  modifiers:L.MODIFIERS,keysPerModel:50},
 statuses:{
  available:'Supported web action in the recorded context',
  blocked:'Explicitly unavailable, without normal-key fallback',
  delegated:'Dedicated screen/mode handler owns key; not audited as a scientific shortcut',
  unlabelled:'No corresponding printed legend on this selected model',
  'unlabelled-control':'A web modifier+navigation operation without printed legend'
 },
 count:rows.length,
 rows
};
const destination=path.join(__dirname,'rea081-inventory.json');
fs.writeFileSync(destination,JSON.stringify(payload,null,2)+'\n');
console.log('REA-081 generated '+rows.length+' records at '+destination);
