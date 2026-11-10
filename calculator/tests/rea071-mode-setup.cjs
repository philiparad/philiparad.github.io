/* REA-071 - original/PLUS/PLUS C MODE and SETUP page number fidelity.
 * Run: node calculator/tests/rea071-mode-setup.cjs
 * Official original: fx-115ES/fx-991ES manual E-7 through E-10;
 * PLUS: fx-570ESPLUS/fx-991ESPLUS manual E-10 onward;
 * PLUS C: fx-115ESPLUS/fx-991ESPLUSC manual "Calculation Modes and Calculator Setup".
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const MODE=require('../js/menu-model.js');
const SETUP=require('../js/setup.js');
const PROFILES=require('../js/model-profiles.js');
let checks=0;const eq=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++};
const ok=(actual,label)=>{assert.ok(actual,label);checks++};
const original=['COMP','CMPLX','STAT','BASE-N','EQN','MATRIX','TABLE','VECTOR'];
const cSecond=['INEQ','VERIF','DIST'];
const setupFirst=['MthIO','LineIO','Deg','Rad','Gra','Fix','Sci','Norm'];
const setupSecondNormal=['ab/c','d/c','CMPLX','STAT','Disp','CONT'];
const setupSecondC=['ab/c','d/c','CMPLX','STAT','TABLE','Rdec','Disp','CONT'];
for(const model of Object.keys(PROFILES.profiles)){
 const modes=MODE.modePages(model),setup=SETUP.pages(model),isC=model==='fx-991es-plus-c';
 eq(modes.length,isC?2:1,model+' MODE page count');
 eq(MODE.modeEntries(model).map(x=>x.label),isC?[...original,...cSecond]:original,model+' available modes');
 eq(modes[0].map(x=>x.key),['1','2','3','4','5','6','7','8'],model+' first mode local keys');
 eq(modes.length===2?modes[1].map(x=>x.key):[],isC?['1','2','3']:[],model+' second mode keys reset');
 for(const entry of modes.flat())eq(MODE.modeSelection(model,entry.page,entry.key).label,entry.label,model+' select '+entry.label);
 eq(MODE.modeSelection(model,1,'4'),null,model+' unavailable mode key');
 eq(MODE.navigate(0,'DOWN',MODE.modeEntries(model).length,8),isC?1:0,model+' mode page down');
 eq(MODE.navigate(1,'UP',MODE.modeEntries(model).length,8),0,model+' mode page up');
 eq(setup.length,2,model+' setup page count');
 eq(setup[0].map(x=>x.label),setupFirst,model+' setup page 1');
 eq(setup[1].map(x=>x.label),isC?setupSecondC:setupSecondNormal,model+' setup page 2');
 for(let page=0;page<setup.length;page++)for(const entry of setup[page]){
  eq(SETUP.selection(model,page,entry.key).id,entry.id,model+' setup '+page+':'+entry.key);
  eq(SETUP.setting(model,entry.id).id,entry.id,model+' setup valid '+entry.id);
 }
 eq(SETUP.selection(model,1,'9'),null,model+' invalid setup key');
 eq(Boolean(SETUP.setting(model,'table')),isC,model+' TABLE setup isolation');
 eq(Boolean(SETUP.setting(model,'recurring')),isC,model+' Rdec setup isolation');
 eq(SETUP.selection(model,1,isC?'7':'5').id,'disp',model+' Disp number');
 eq(SETUP.selection(model,1,isC?'8':'6').id,'contrast',model+' contrast number');
}
eq(SETUP.options('mthio').map(x=>[x.key,x.value]),[['1','matho'],['2','lineo']],'MthIO submenu numbering');
eq(SETUP.options('norm').map(x=>[x.key,x.value]),[['1','norm1'],['2','norm2']],'Norm submenu numbering');
eq(SETUP.options('stat').map(x=>[x.key,x.value]),[['1','on'],['2','off']],'STAT FREQ submenu numbering');
eq(SETUP.options('table').map(x=>[x.key,x.value]),[['1','single'],['2','double']],'C TABLE submenu numbering');
eq(SETUP.options('disp').map(x=>[x.key,x.value]),[['1','dot'],['2','comma']],'Disp submenu numbering');
const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
new Function(app);
ok(app.includes('SETUP.entries(state.model).map'),'UI uses model-specific numbered SETUP pages');
ok(app.includes('MENUS.modeEntries(state.model).map'),'UI uses model-specific numbered MODE pages');
ok(app.includes("if(!SETUP.setting(state.model,id))throw Error('Argument ERROR')"),'unsupported settings rejected');
ok(app.includes("state.menuKind==='mode'||state.menuKind==='setup'"),'printed local key used in UI');
ok(app.includes('K.applyModel($(\'keys\'),id)'),'model switch updates keypad');
console.log('REA-071 PASS '+checks+' source/menu/regression checks (not device hardware parity)');
