/* Milestone 20: observed-device comparison queue, discrepancy triage, reproducible evidence. */
(function(global){'use strict';
const REF=()=>global.FX991_REFERENCE;
const DIFF=()=>global.FX991_DIFFERENTIAL;
const MAX=300;
const PRESETS=Object.freeze([
 {id:'arith-precedence',model:'standard',keys:['NEG','2','POW','2','='],manual:'-4',area:'precedence'},
 {id:'fraction-add',model:'standard',keys:['1','DIV','3','ADD','1','DIV','6','='],manual:'1/2',area:'exact'},
 {id:'trig-deg',model:'standard',keys:['SIN','3','0','RP','='],manual:'0.5',area:'trigonometry'},
 {id:'division-zero',model:'standard',keys:['1','DIV','0','='],manual:'Math ERROR',area:'errors'},
 {id:'base-bin',model:'standard',keys:['MODE','4'],manual:null,area:'modes'},
 {id:'c-ineq-menu',model:'c',keys:['MODE','DOWN','DOWN','1'],manual:'INEQ',area:'c-edition'},
 {id:'one-shot-shift',model:'standard',keys:['SHIFT','7'],manual:null,area:'keypad'},
 {id:'setup-radian',model:'standard',keys:['SHIFT','MODE','2'],manual:null,area:'setup'}
]);
function check(ok,msg){if(!ok)throw Error('Device evidence error: '+msg)}
function isObj(v){return v!==null&&typeof v==='object'&&!Array.isArray(v)}
function validate(entry){
 check(isObj(entry),'record must be an object');
 check(typeof entry.id==='string'&&/^[A-Za-z0-9][\w.-]{0,79}$/.test(entry.id),'invalid ID');
 check(['standard','c'].includes(entry.model),'invalid model');
 check(['physical','official-emulator'].includes(entry.kind),'a real observed reference is required');
 check(typeof entry.device==='string'&&entry.device.trim().length>=3&&entry.device.length<=120,'identify the actual device/version');
 check(typeof entry.observedAt==='string'&&/^\d{4}-\d\d-\d\d$/.test(entry.observedAt)&&!Number.isNaN(Date.parse(entry.observedAt+'T00:00:00Z')),'valid observation date required');
 check(Array.isArray(entry.keys)&&entry.keys.length>0&&entry.keys.length<=500&&entry.keys.every(x=>typeof x==='string'&&x.length>=1&&x.length<=30),'invalid semantic keys');
 check(isObj(entry.observed)&&Object.keys(entry.observed).length>0,'enter actual observed fields');
 for(let [k,v] of Object.entries(entry.observed)){
  check(['result','mode','view','error','expression','ans'].includes(k),'unsupported observed field '+k);
  check((k==='error'&&v===null)||(typeof v==='string'&&v.length<=200),'invalid observed field '+k);
 }
 check(typeof entry.notes==='string'&&entry.notes.length<=2000,'invalid notes');
 return JSON.parse(JSON.stringify(entry));
}
function importEvidence(input){let v=typeof input==='string'?JSON.parse(input):input;check(isObj(v)&&v.schema==='fx991-device-evidence-v1','unsupported evidence schema');check(Array.isArray(v.records)&&v.records.length<=MAX,'invalid records');let ids=new Set();return {schema:v.schema,records:v.records.map(x=>{let r=validate(x);check(!ids.has(r.id),'duplicate ID '+r.id);ids.add(r.id);return r})}}
function empty(){return {schema:'fx991-device-evidence-v1',records:[]}}
function add(raw,entry){let e=importEvidence(raw),r=validate(entry);check(!e.records.some(x=>x.id===r.id),'duplicate ID '+r.id);e.records.push(r);return importEvidence(e)}
function classify(field){return ({result:'numeric-or-format',ans:'numeric',mode:'mode-state',view:'workflow',error:'error-class',expression:'editor'})[field]||'other'}
function compare(entry){let r=validate(entry);let reference={caseId:r.id,model:r.model,source:{kind:r.kind,device:r.device,observedAt:r.observedAt,notes:r.notes},events:r.keys,expected:r.observed};let out=REF().execute(reference,{trace:true});let diff=DIFF().compare(reference);let issues=out.checks.filter(x=>!x.match).map(x=>({field:x.field,category:classify(x.field),expected:x.expected,actual:x.actual}));return {id:r.id,model:r.model,kind:r.kind,passed:out.passed,issues,firstDivergence:diff.firstDivergence?diff.firstDivergence.step:null,actual:out.actual,steps:out.steps};}
function review(corpus){let evidence=importEvidence(corpus);let results=evidence.records.map(compare);let failures=results.filter(x=>!x.passed);let byCategory={};for(let r of failures)for(let i of r.issues)byCategory[i.category]=(byCategory[i.category]||0)+1;let covered={standard:0,c:0};for(let r of evidence.records)covered[r.model]++;return {schema:'fx991-device-review-v1',totals:{records:results.length,passed:results.length-failures.length,failed:failures.length},coverage:covered,byCategory,results,certified:false};}
function scenario(id){let p=PRESETS.find(x=>x.id===id);check(!!p,'unknown scenario');return {id:p.id,model:p.model,keys:[...p.keys],manual:p.manual,area:p.area}}
const API=Object.freeze({PRESETS,MAX,empty,validate,importEvidence,add,compare,review,scenario,classify});
global.FX991_DEVICE=API;
})(typeof window!=='undefined'?window:globalThis);