/* REA-081 — physical 50-key legend capability inventory.
 * Every row is keyed by model, key, normal/SHIFT/ALPHA, mode, and screen.
 * This is a source-grounded WEB-model audit, not a CASIO firmware audit.
 */
(function(global){'use strict';
const MODELS=['fx-991es','fx-991es-plus','fx-991es-plus-c'];
const MODES=['COMP','CMPLX','STAT','BASE-N','EQN','MATRIX','TABLE','VECTOR','INEQ','VERIF','DIST'];
const SCREENS=['edit','result','prompt','menu','flow-result','error','calculating',
 'contrast','constant-code','conversion-code','stat-table','eqn-coeff','eqn-result',
 'ineq-coeff','ineq-result','matrix-table','matrix-expression','matrix-parameter',
 'matrix-result','matrix-scalar','vector-table','vector-parameter','vector-result',
 'vector-scalar','table-grid','dist-list'];
const MODIFIERS=['normal','SHIFT','ALPHA'];
const NORMAL_MODES=new Set(['COMP','CMPLX']);
const FUNCTIONS=new Set(['CALC','INTEGRAL','LOGBASE','FRAC','SQRT','SQUARE','POWER',
 'LOG','LN','NEG','DMS','HYP','SIN','COS','TAN','RECIP','MPLUS','SD','ENG',
 'RCL','ANS','EXP','DOT','MUL','DIV','ADD','SUB','LP','RP']);
const ALPHA_EDITOR=new Set(['CALC','INTEGRAL','LOGBASE','FRAC','SQRT','NEG','DMS','HYP',
 'SIN','COS','TAN','ENG','LP','RP','MPLUS','EXP','DOT','ANS','MUL','DIV','ADD','SUB']);
const SHIFT_EDITOR=new Set(['INTEGRAL','LOGBASE','FRAC','SQRT','SQUARE','POWER','RECIP',
 'LOG','LN','NEG','HYP','SIN','COS','TAN','LP','RP','MUL','DIV','ADD','SUB','EXP',
 'DOT','0']);
const SHIFT_RESULT=new Set(['SD','ENG','DMS']);
const GLOBAL_SHIFT=new Set(['AC','MODE','RCL','DEL','7','8','9','1','2','3','4','5','6','CALC','ANS','MPLUS']);
const MODE_CHANGE={'1':'STAT','2':'CMPLX','3':'BASE-N','4':'MATRIX','5':'VECTOR','6':'VERIF'};
function legend(key,modifier){
 // Top-row and d-pad 'alpha' metadata in the physical geometry describes
 // their key group, not an ALPHA legend (REA-070 legacy key shape).
 if(modifier==='ALPHA'&&(key.group==='top'||key.group==='dpad'))return '';
 if(modifier==='SHIFT'&&key.group==='dpad')return '';
 return modifier==='SHIFT'?key.shift:modifier==='ALPHA'?key.alpha:key.label;
}
function context(key,modifier,mode,screen,model,supports){
 const label=legend(key,modifier);
 if(screen==='edit'||screen==='result'){
  if(modifier==='SHIFT'&&['LEFT','RIGHT','UP','DOWN'].includes(key.id))
   return {status:'unlabelled-control',reason:'Viewport pan uses SHIFT with directional control'};
 }
 if(!label)return {status:'unlabelled',reason:'No printed legend for this model'};
 if(key.id==='SHIFT'||key.id==='ALPHA'){
  return {status:modifier==='normal'?'available':'blocked',reason:'Modifier key state is handled separately'};
 }
 if(screen==='calculating')return {status:key.id==='AC'||key.id==='MODE'||key.id==='ON'?
  'available':'blocked',reason:'Numerical worker running'};
 if(screen==='error')return {status:key.id==='AC'||key.id==='LEFT'||key.id==='RIGHT'?
  'available':'blocked',reason:'Error recovery only'};
 if(screen!=='edit'&&screen!=='result'){
  // A dedicated menu/form handler consumes the physical event. Its SHIFT
  // and ALPHA interpretations are not the printed scientific shortcuts.
  // Distinguish ordinary navigation from unavailable modifier legends.
  if(modifier!=='normal')return {status:'blocked',
   reason:'Modifier legend unavailable in '+screen+' screen'};
  return {status:'delegated',reason:'Dedicated '+screen+' handler owns key events'};
 }
 if(modifier==='normal'){
  if(key.id==='ON'||key.id==='MODE'||key.id==='AC')return {status:'available',reason:'System key'};
  if(!NORMAL_MODES.has(mode))return {status:'delegated',reason:mode+' mode-specific key handler'};
  if(key.id==='INTEGRAL'||key.id==='LOGBASE'){
   return {status:mode==='COMP'||key.id==='LOGBASE'?'available':'blocked',
    reason:'Integral requires COMP; log template is editable'};
  }
  if(key.id==='CALC')return {status:'available',reason:mode+' CALC'};
  if(key.id==='RCL')return {status:'available',reason:'Recall register selection'};
  if(key.id==='ENG'&&mode==='CMPLX')return {status:'available',reason:'Imaginary unit input'};
  if(key.id==='INTEGRAL'&&mode==='CMPLX')return {status:'blocked',reason:'Integration requires COMP'};
  if(key.id==='SD'&&mode==='CMPLX')return {status:'blocked',reason:'S⇔D not active for CMPLX'};
  if(key.id==='DMS'&&mode==='CMPLX')return {status:'blocked',reason:'Sexagesimal limited to real mode'};
  return {status:'available',reason:'Normal physical input or result action'};
 }
 if(modifier==='SHIFT'){
  if(['LEFT','RIGHT','UP','DOWN'].includes(key.id))
   return {status:'unlabelled-control',reason:'Viewport pan without printed shifted legend'};
  if(Object.prototype.hasOwnProperty.call(MODE_CHANGE,key.id)){
   const target=MODE_CHANGE[key.id];
   return {status:supports(model,target)?'available':'blocked',
    reason:supports(model,target)?'Mode shortcut':'Mode not supported by selected model'};
  }
  if(key.id==='6')return {status:model==='fx-991es-plus-c'?'available':'blocked',reason:'VERIF is PLUS C only'};
  if(key.id==='CALC'||key.id==='INTEGRAL'||key.id==='LOGBASE'){
   return {status:mode==='COMP'?'available':'blocked',reason:'COMP-only SOLVE/calculus'};
  }
  if(key.id==='ANS')return {status:mode==='COMP'?'available':'blocked',
   reason:'DRG▶ operand unit suffix menu requires COMP'};
  if(key.id==='DMS'||key.id==='SD'||key.id==='ENG'){
   return {status:screen==='result'?'available':'blocked',reason:'Displayed result required'};
  }
  if(key.id==='NEG')return {status:mode==='CMPLX'?'available':'blocked',
   reason:'Polar angle input is CMPLX-only'};
  if(key.id==='7'||key.id==='8')return {status:mode==='BASE-N'||mode==='TABLE'?
   'blocked':'available',reason:'CONST/CONV context restriction'};
  if(key.id==='DEL')return {status:screen==='edit'?'available':'blocked',reason:'INS edit only'};
  if(GLOBAL_SHIFT.has(key.id))return {status:'available',reason:'System or setup command'};
  if(SHIFT_EDITOR.has(key.id))return {status:NORMAL_MODES.has(mode)?'available':'blocked',
   reason:'Scientific editor shortcut'};
  return {status:'blocked',reason:'No implemented shifted action'};
 }
 if(modifier==='ALPHA'){
  if(key.id==='CALC')return {status:mode==='COMP'||mode==='CMPLX'?'available':'blocked',
   reason:'Equation input in COMP/CMPLX'};
  if(key.id==='INTEGRAL'||key.id==='LOGBASE')return {status:mode==='COMP'?'available':'blocked',
   reason:'Product input in COMP'};
  if(key.id==='SQRT')return {status:mode==='COMP'&&screen==='edit'?'available':'blocked',
   reason:'Recurring decimal requires MathIO edit ending in decimal point'};
  if(key.id==='FRAC'||key.id==='DOT'||key.id==='ANS'||key.id==='MUL'||
     key.id==='DIV'||key.id==='ADD'||key.id==='SUB'){
   return {status:mode==='COMP'?'available':'blocked',reason:'COMP function or register'};
  }
  if(['COS','TAN','NEG','DMS','HYP','SIN','LP','RP','MPLUS'].includes(key.id)){
   const register={COS:'E',TAN:'F',NEG:'A',DMS:'B',HYP:'C',SIN:'D',LP:'X',RP:'Y',MPLUS:'M'}[key.id];
   return {status:model==='fx-991es'&&['E','F'].includes(register)?'blocked':'available',
    reason:'Register '+register};
  }
  if(ALPHA_EDITOR.has(key.id))return {status:NORMAL_MODES.has(mode)?'available':'blocked',
   reason:'ALPHA scientific input'};
  return {status:'blocked',reason:'No implemented ALPHA action'};
 }
 return {status:'blocked',reason:'Unknown modifier'};
}
function classify(key,modifier,mode,screen,model,supports){
 if(!key||!MODELS.includes(model)||!MODIFIERS.includes(modifier)||!MODES.includes(mode)||
  !SCREENS.includes(screen))throw Error('Argument ERROR');
 const r=supports(model,mode)?
  context(key,modifier,mode,screen,model,supports):
  {status:'blocked',reason:'Mode '+mode+' is not supported by '+model};
 return Object.freeze({model,mode,screen,key:key.id,modifier,
  legend:legend(key,modifier)||'',status:r.status,reason:r.reason});
}
function inventory(keypad,profiles,options={}){
 const models=options.models||MODELS,modes=options.modes||MODES,
  screens=options.screens||SCREENS,modifiers=options.modifiers||MODIFIERS;
 const rows=[];
 for(const model of models){
  const keys=keypad.keysForModel(model);
  for(const mode of modes)for(const screen of screens)for(const key of keys)
   for(const modifier of modifiers)
    rows.push(classify(key,modifier,mode,screen,model,profiles.supports));
 }
 return rows;
}
const API=Object.freeze({MODELS,MODES,SCREENS,MODIFIERS,classify,inventory});
global.FreshLegendAudit=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
