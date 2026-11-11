/* REA-016 — LCD status indicators derived from actual calculator state.
 * Labels follow published CASIO ES PLUS manuals. Pixel positions and all
 * manufacturer firmware transitions are NOT hardware-verified.
 */
(function(global){'use strict';
const LINE_MODES=Object.freeze(['STAT','BASE-N','MATRIX','VECTOR']);
const MODE_LABELS=Object.freeze({STAT:'STAT',CMPLX:'CMPLX',MATRIX:'MAT',VECTOR:'VCT'});
function derive(state){
 const empty={shift:'',alpha:'',memory:'',pending:'',mode:'',angle:'',format:'',math:'',replay:'',disp:''};
 if(!state||!state.power)return empty;
 const screen=state.screen||'edit';
 const entries=state.menuEntries||[];
 const maxMenu=Math.max(0,entries.length);
 const menuSize=state.menuPageSize||6;
 const menuPage=state.menuPage||0;
 const resultCount=(state.outputLines||[]).length;
 const resultPage=state.outputPage||0;
 const history=state.history||[];
 const historySelection=Array.isArray(state.storedInputs)&&state.storedInputs.length?
  state.storedInputs[0]:-1;
 const mode=state.mode||'COMP';
 const pending=state.pendingMemory||(screen==='menu'&&state.menuTitle?.startsWith('STO')?'STO':
  screen==='menu'&&state.menuTitle?.startsWith('RCL')?'RCL':'');
 // Replay arrows also serve as a cue for another page of menu/results.
 let replayUp=false,replayDown=false;
 if(screen==='menu'){
  replayUp=menuPage>0;
  replayDown=(menuPage+1)*menuSize<maxMenu;
 }else if(screen==='flow-result'){
  replayUp=resultPage>0;
  replayDown=(resultPage+1)*3<resultCount;
 }else if((screen==='edit'||screen==='result')&&
           ['COMP','CMPLX','BASE-N'].includes(mode)){
  // Calculation-history indicators exist only in the three original
  // modes supporting replay (original manual E-24).
  replayUp=history.length>0&&(historySelection<0||historySelection<history.length-1);
  replayDown=historySelection>0;
 }
 const format=state.format==='Fix'?'FIX':state.format==='Sci'?'SCI':'';
 const math=state.math&&!LINE_MODES.includes(mode)?'Math':'';
 return {
  shift:state.shift?'S':'',
  alpha:state.alpha?'A':'',
  memory:(state.mode==='CMPLX'&&state.complexMemory?.M?
   (state.complexMemory.M.re!==0||state.complexMemory.M.im!==0):
   (Number(state.memory?.M)!==0&&Number.isFinite(Number(state.memory?.M))))?'M':'',
  pending,
  mode:MODE_LABELS[mode]||'',
  angle:state.angle==='DEG'?'D':state.angle==='RAD'?'R':'G',
  format,
  math,
  replay:(replayUp?'▲':'')+(replayDown?'▼':''),
  disp:screen==='intermediate'?'Disp':''
 };
}
const IDS=Object.freeze({shift:'lcd-shift',alpha:'lcd-alpha',memory:'lcd-memory',
 pending:'lcd-pending',mode:'lcd-mode',angle:'lcd-angle',format:'lcd-format',
 math:'lcd-math',replay:'lcd-replay',disp:'lcd-disp'});
function render(state,lookup){
 const flags=derive(state);
 for(const [name,id] of Object.entries(IDS)){
  const node=lookup(id);
  if(node)node.textContent=flags[name];
 }
 return flags;
}
const api=Object.freeze({derive,render,ids:IDS});
global.FreshIndicators=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
