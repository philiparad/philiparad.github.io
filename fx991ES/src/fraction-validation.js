/* Phase 16: hardware-validation *instructions*, not hardware readings.
   Key sequences are simulator semantic IDs, not authenticated CASIO physical buttons. */
(function(global){'use strict';
const raw=[
 ['F16-01','Simple MathO fraction',['FRAC','1','RIGHT','2','='],[1,3,4,5]],
 ['F16-02','Simple LineIO fraction',['FRAC','1','RIGHT','2','='],[1,3,4,5],'LineIO'],
 ['F16-03','Mixed fraction entry',['SHIFT','FRAC','2','RIGHT','3','RIGHT','4','='],[2,3,5,6,8]],
 ['F16-04','Mixed fraction result toggle',['SHIFT','FRAC','2','RIGHT','3','RIGHT','4','=','SHIFT','FRAC'],[2,3,5,7,9]],
 ['F16-05','Mixed fraction negative sign',['NEG','SHIFT','FRAC','2','RIGHT','3','RIGHT','4','='],[1,3,5,7]],
 ['F16-06','Fraction cursor return',['FRAC','1','RIGHT','2','LEFT','3'],[1,3,4,5,6]],
 ['F16-07','Mixed cursor return',['SHIFT','FRAC','2','RIGHT','3','RIGHT','4','LEFT','LEFT'],[2,3,5,7,8,9]],
 ['F16-08','Fraction denominator deletion',['FRAC','1','RIGHT','2','DEL','='],[1,3,4,5,6]],
 ['F16-09','Mixed missing denominator',['SHIFT','FRAC','2','RIGHT','3','='],[2,3,5,6]],
 ['F16-10','Mixed improper numerator',['SHIFT','FRAC','2','RIGHT','5','RIGHT','4','='],[2,3,5,7]],
 ['F16-11','Long fraction result scrolling',['FRAC',...'12345678901234567890123456789'.split(''),'RIGHT','3','1','=','RIGHT','RIGHT','LEFT'],[1,10,20,31,32,33,34,35]],
 ['F16-12','Fraction decimal toggle',['FRAC','1','RIGHT','5','=','S-D'],[1,3,4,5,6]]
];
const CASES=Object.freeze(raw.map(([id,title,keys,steps,style])=>Object.freeze({
 id,title,model:'standard',setup:Object.freeze({angle:'DEG',format:'Norm2',digits:3,displayStyle:style||'MathO'}),
 keys:Object.freeze(keys),checkpoints:Object.freeze(steps.filter(n=>n>=1&&n<=keys.length)),
 status:'unobserved-plan',deviceObservation:null,physicalKeyMappingVerified:false
})));
function get(id){return CASES.find(c=>c.id===id)||null}
function blank(id){
 const c=get(id);if(!c)throw Error('Unknown hardware validation plan');
 return {schema:'fx991-fraction-observation-sheet-v1',planId:id,title:c.title,
  semanticKeyPlan:[...c.keys],setup:{...c.setup},physicalKeySequence:'',
  modelAndEdition:'',date:'',operator:'',actualLCD:'',
  checkpoints:c.checkpoints.map(step=>({step,semanticKey:c.keys[step-1],
     observedLCD:'',actualPhysicalKey:'',photoFile:''})),
  discrepancyNotes:'',independentlyReviewed:false};
}
function progress(records){
 const items=Array.isArray(records)?records:[],valid=new Set(items.filter(r=>r&&
  get(r.scenarioId)&&typeof r.observed?.result==='string'&&r.observed.result.length>0)
  .map(r=>r.scenarioId));
 return {planned:CASES.length,recorded:CASES.filter(c=>valid.has(c.id)).length,
  physicalParityCertified:false,independentlyAuthenticated:false};
}
global.FX991_FRACTION_VALIDATION=Object.freeze({CASES,get,blank,progress});
})(typeof window!=='undefined'?window:globalThis);
