/* Milestone 16: independent black-box compatibility harness. No proprietary device data included. */
(function(global){'use strict';
const K=()=>global.FX991;
const KINDS=Object.freeze(['internal','manual','physical','official-emulator']);
const MODELS=Object.freeze(['standard','c']);
const ERRORS=Object.freeze({SCHEMA:'Reference schema error',MISMATCH:'Reference mismatch'});
const MAX_CASES=300,MAX_EVENTS=500;
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
function assert(ok,message){if(!ok)throw Error(ERRORS.SCHEMA+': '+message)}
function isObj(v){return !!v&&typeof v==='object'&&!Array.isArray(v)}
function validate(record){
 assert(isObj(record),'case must be an object');
 assert(typeof record.caseId==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,79}$/.test(record.caseId),'caseId must be a safe unique identifier');
 assert(MODELS.includes(record.model),'model must be standard or c');
 assert(isObj(record.source)&&KINDS.includes(record.source.kind),'source.kind must identify the origin');
 assert(Array.isArray(record.events)&&record.events.length<=MAX_EVENTS&&record.events.every(k=>typeof k==='string'&&k.length>0&&k.length<=30),'events must be an array of semantic keys (up to 500)');
 assert(isObj(record.expected)&&Object.keys(record.expected).length>0,'expected fields required');
 const allowed=['mode','view','expression','result','error','frameHash','indicators','ans'];
 for(const [field,value] of Object.entries(record.expected)){
  assert(allowed.includes(field),'unexpected field '+field);
  if(field==='indicators')assert(Array.isArray(value)&&value.every(v=>typeof v==='string'),'indicators must be strings');
  else if(field==='error')assert(value===null||typeof value==='string','error must be null/string');
  else assert(typeof value==='string','expected.'+field+' must be text');
 }
 if(record.setup!==undefined){assert(isObj(record.setup),'setup must be an object');
  for(const [key,value] of Object.entries(record.setup)){
   assert(['angle','format','digits'].includes(key),'unknown setup field '+key);
   if(key==='angle')assert(['DEG','RAD','GRAD'].includes(value),'invalid angle');
   if(key==='format')assert(['Norm1','Norm2','Fix','Sci'].includes(value),'invalid format');
   if(key==='digits')assert(Number.isInteger(value)&&value>=0&&value<=10,'invalid digits');
  }
 }
 if(['physical','official-emulator'].includes(record.source.kind)){
  assert(typeof record.source.device==='string'&&record.source.device.trim().length>=3,'observed reference must identify device/model');
  assert(typeof record.source.observedAt==='string'&&/^\d{4}-\d\d-\d\d/.test(record.source.observedAt),'observed reference requires observation date');
 }
 return record;
}
function normalizeCase(record){validate(record);return JSON.parse(JSON.stringify(record))}
function importCorpus(input){const raw=typeof input==='string'?JSON.parse(input):input;
 const rows=Array.isArray(raw)?raw:raw?.cases;
 assert(Array.isArray(rows),'expected an array or object with cases array');
 assert(rows.length<=MAX_CASES,'too many cases');
 const ids=new Set(),cases=rows.map(r=>{let item=normalizeCase(r);assert(!ids.has(item.caseId),'duplicate caseId '+item.caseId);ids.add(item.caseId);return item});
 return {schema:'fx991-reference-v1',cases};
}
function execute(record,opts={}){
 validate(record);
 let state=K().createState(record.model);state.setup={...state.setup,...record.setup};
 const states=[];
 for(let i=0;i<record.events.length;i++){
  state=K().dispatchKey(state,record.events[i]);
  if(opts.trace===true){const screen=K().semanticScreen(state);states.push({step:i+1,key:record.events[i],mode:state.mode,view:state.view,expression:state.expression,result:state.result,error:state.error,frameHash:K().frameHash(K().rasterizeScreen(screen))});}
 }
 const screen=K().semanticScreen(state);
 const actual={mode:state.mode,view:state.view,expression:state.expression,result:state.result,error:state.error??null,frameHash:K().frameHash(K().rasterizeScreen(screen)),indicators:screen.indicators.slice(),ans:K().valueToString(state.ans)};
 const checks=Object.keys(record.expected).map(field=>{
  let expected=record.expected[field],observed=actual[field];
  const match=field==='indicators'?JSON.stringify(expected)===JSON.stringify(observed):expected===observed;
  return {field,expected,actual:observed,match};
 });
 return {caseId:record.caseId,sourceKind:record.source.kind,passed:checks.every(x=>x.match),checks,actual,...(opts.trace===true?{steps:states}:{})};
}
function runCorpus(corpus,opts={}){
 const rows=importCorpus(corpus).cases;
 const results=rows.map(rec=>{try{return execute(rec,opts)}catch(e){return {caseId:rec.caseId,sourceKind:rec.source.kind,passed:false,error:String(e.message),checks:[]}}});
 const counts={total:results.length,passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length,observed:results.filter(x=>['physical','official-emulator'].includes(x.sourceKind)).length,observedPassed:results.filter(x=>x.passed&&['physical','official-emulator'].includes(x.sourceKind)).length};
 return {schema:'fx991-reference-results-v1',counts,results};
}
function makeObservation(options){
 const base={caseId:options.caseId,model:options.model||'standard',setup:options.setup||{},events:options.events||[],source:{kind:options.kind||'physical',device:options.device,observedAt:options.observedAt,notes:options.notes||''},expected:options.expected};
 return normalizeCase(base);
}
const SEEDED=Object.freeze({schema:'fx991-reference-v1',cases:[
 {caseId:'manual-comp-add',model:'standard',source:{kind:'manual',device:'documented example; NOT observed'},events:['2','ADD','3','='],expected:{mode:'COMP',result:'5',view:'result'}},
 {caseId:'manual-negative-power',model:'standard',source:{kind:'manual',device:'documented precedence; NOT observed'},events:['NEG','2','POW','2','='],expected:{result:'-4'}},
 {caseId:'manual-shift-indicator',model:'standard',source:{kind:'manual',device:'documented key behavior; NOT observed'},events:['SHIFT'],expected:{indicators:['D','S']}},
 {caseId:'manual-shift-oneshot',model:'standard',source:{kind:'manual',device:'documented key behavior; NOT observed'},events:['SHIFT','7'],expected:{indicators:['D'],expression:'7'}},
 {caseId:'manual-c-modes',model:'c',source:{kind:'manual',device:'documented mode list; NOT observed'},events:['MODE','DOWN','DOWN','1'],expected:{mode:'INEQ'}},
 {caseId:'manual-error-divzero',model:'standard',source:{kind:'manual',device:'documented error category; NOT observed'},events:['1','DIV','0','='],expected:{view:'error',error:'Math ERROR'}}
]});
const API=Object.freeze({KINDS,ERRORS,validate,importCorpus,execute,runCorpus,makeObservation,SEEDED});
global.FX991_REFERENCE=API;
})(typeof window!=='undefined'?window:globalThis);
