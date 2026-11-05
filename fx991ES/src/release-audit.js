/* Milestone 18 — deterministic release checks; no telemetry or network. */
(function(global){'use strict';
const MAX_INPUT=100000;
const EXPECTED_ASSETS=Object.freeze([
 'styles.css','src/natural-editor.js','src/decimal15.js','src/display.js','src/kernel.js',
 'src/numerical.js','src/state-machine.js','src/modes.js','src/c-edition.js','src/reference.js',
 'src/differential.js','src/release-audit.js','src/release-candidate.js','src/app.js','tests/cases.js',
 'tests/acceptance.html','tests/reference.html','tests/differential.html','tests/release.html','tests/rc.html'
]);
function inspectInput(s){if(typeof s!=='string')return {ok:false,reason:'not-a-string'};if(s.length>MAX_INPUT)return {ok:false,reason:'too-long'};if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s))return {ok:false,reason:'control-character'};return {ok:true,reason:null}}
function auditDocument(doc){const issues=[];let ids=new Set();const all=[...doc.querySelectorAll('[id]')];for(let e of all){if(ids.has(e.id))issues.push({rule:'duplicate-id',value:e.id});ids.add(e.id)}
 const c=doc.querySelector('#lcd');if(!c||c.width!==96||c.height!==31||c.getAttribute('role')!=='img')issues.push({rule:'lcd-geometry-or-label'});
 const live=doc.querySelector('#announcements');if(!live||live.getAttribute('aria-live')!=='polite')issues.push({rule:'announcements-missing'});
 const skip=doc.querySelector('.skip-link');if(!skip||!doc.querySelector(skip.getAttribute('href')))issues.push({rule:'skip-link'});
 const controls=[...doc.querySelectorAll('input,select,button,textarea')];for(let e of controls){let id=e.id, label=e.getAttribute('aria-label')|| (id?doc.querySelector('label[for="'+id+'"]')?.textContent:'')||e.textContent;if(!String(label||'').trim())issues.push({rule:'unnamed-control',value:id||e.tagName})}
 return {passed:issues.length===0,issues,controlCount:controls.length,uniqueIds:ids.size}}
function auditViewport(doc){const width=doc.documentElement.clientWidth,overflow=doc.documentElement.scrollWidth>width+2;return {passed:!overflow,viewportWidth:width,documentWidth:doc.documentElement.scrollWidth}}
function auditRuntime(win){let problems=[];for(let k of ['FX991','FX991_EDITOR','FX991_DISPLAY','FX991_TESTS','FX991_DIFFERENTIAL'])if(!win[k])problems.push('Missing '+k);if(win.FX991){let state=win.FX991.createState();let pixels=win.FX991.rasterizeScreen(win.FX991.semanticScreen(state));if(pixels.length!==2976)problems.push('LCD raster size incorrect')}
 return {passed:problems.length===0,problems}}
function csvSafe(value){let s=String(value??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
const API=Object.freeze({MAX_INPUT,EXPECTED_ASSETS,inspectInput,auditDocument,auditViewport,auditRuntime,csvSafe});
global.FX991_RELEASE=API;
})(typeof window!=='undefined'?window:globalThis);