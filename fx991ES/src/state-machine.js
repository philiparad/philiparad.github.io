/* Milestone 14: deterministic, browser-only state-machine extension.
 * Input events are semantic key codes. Device-specific screen/key parity
 * remains subject to black-box reference validation.
 */
(function(global){'use strict';
const base=global.FX991;
const E=global.FX991_EDITOR;const KEYS=global.FX991_KEYS;
const SETUP=[['Angle','DEG','RAD','GRAD'],['Format','Norm1','Norm2','Fix','Sci']];
const wizardConfigs={
 EQN:{menu:['QUAD','CUBIC','LINEAR2','LINEAR3'],fields:{QUAD:['a','b','c'],CUBIC:['a','b','c','d'],LINEAR2:['a11','a12','b1','a21','a22','b2'],LINEAR3:['a11','a12','a13','b1','a21','a22','a23','b2','a31','a32','a33','b3']}},
 MATRIX:{menu:['DET2','DET3','INV2','TRANS2','MUL2'],fields:{DET2:['a11','a12','a21','a22'],DET3:['a11','a12','a13','a21','a22','a23','a31','a32','a33'],INV2:['a11','a12','a21','a22'],TRANS2:['a11','a12','a21','a22'],MUL2:['a11','a12','a21','a22','b11','b12','b21','b22']}},
 VECTOR:{menu:['DOT2','DOT3','CROSS3','ADD2','ANGLE2'],fields:{DOT2:['ax','ay','bx','by'],DOT3:['ax','ay','az','bx','by','bz'],CROSS3:['ax','ay','az','bx','by','bz'],ADD2:['ax','ay','bx','by'],ANGLE2:['ax','ay','bx','by']}},
 STAT:{menu:['1VAR','1VAR5','LINEAR3'],fields:{'1VAR':['x1','x2','x3'],'1VAR5':['x1','x2','x3','x4','x5'],LINEAR3:['x1','y1','x2','y2','x3','y3']}},
 TABLE:{menu:['SINGLE','FUNCTION','DUAL'],fields:{SINGLE:['start','end','step'],FUNCTION:['f(X)','start','end','step'],DUAL:['f(X)','g(X)','start','end','step']}}
};
function decorate(s){if(!s.ui)s.ui={page:0,pending:null,setupSection:null,wizard:null,insertMode:true};if(s.ui.insertMode===undefined)s.ui.insertMode=true;return s}
function syncInput(s){if(s.mode==='COMP'){s.document=E.fromSource(s.expression)}s.cursor=Math.min(s.expression.length,Math.max(0,s.cursor))}
function record(s,key){s.trace=[...s.trace,{key,mode:s.mode,view:s.view,expression:s.expression,result:s.result}].slice(-200);return s}
function enterWizard(s,mode){let config=wizardConfigs[mode];if(!config)return s;s.ui.wizard={mode,kind:null,fields:[],values:[],index:0,buffer:''};s.view='workflow-menu';s.menuPage=0;return s}
function selectWizard(s,i){let w=s.ui.wizard,config=wizardConfigs[w.mode],kind=config.menu[i];if(!kind||(w.mode==='TABLE'&&kind==='DUAL'&&s.model!=='c'))return s;w.kind=kind;w.fields=config.fields[kind];w.values=[];w.index=0;w.buffer='';w.resultPage=0;s.view='coefficient';s.expression='';s.cursor=0;return s}
function wizardExpression(w){const v=w.values;
 if(w.mode==='EQN'){if(w.kind==='QUAD')return 'QUAD:'+v.join(',');if(w.kind==='CUBIC')return 'CUBIC:'+v.join(',');let n=w.kind==='LINEAR2'?2:3,rows=[];for(let i=0;i<n;i++)rows.push(v.slice(i*(n+1),i*(n+1)+n).join(','));return 'LINEAR:'+rows.join(';')+'|'+Array.from({length:n},(_,i)=>v[i*(n+1)+n]).join(',')}
 if(w.mode==='MATRIX'){let n=w.kind==='DET3'?3:2,mat=x=>Array.from({length:n},(_,i)=>x.slice(i*n,i*n+n).join(',')).join(';');if(w.kind==='MUL2')return 'MUL:'+mat(v.slice(0,4))+'|'+mat(v.slice(4));return (w.kind==='INV2'?'INV':w.kind==='TRANS2'?'TRANS':'DET')+':'+mat(v)}
 if(w.mode==='VECTOR'){let n=['DOT2','ADD2','ANGLE2'].includes(w.kind)?2:3,op=w.kind==='CROSS3'?'CROSS':w.kind==='ADD2'?'ADD':w.kind==='ANGLE2'?'ANGLE':'DOT';return op+':'+v.slice(0,n).join(',')+'|'+v.slice(n).join(',')}
 if(w.mode==='STAT')return w.kind==='LINEAR3'?'LINEAR:'+Array.from({length:3},(_,i)=>v.slice(i*2,i*2+2).join(',')).join(';'):'1VAR:'+v.join(',');
 if(w.mode==='TABLE')return (w.kind==='SINGLE'?'X^2':w.kind==='DUAL'?v.slice(0,2).join(';'):v[0])+'|'+(w.kind==='SINGLE'?v.join('|'):v.slice(w.kind==='DUAL'?2:1).join('|'));
 throw new base.CalcError(base.ERROR.ARGUMENT)}
function safeNumber(t){if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(t))throw new base.CalcError(base.ERROR.ARGUMENT);return t}
function safeFunction(t){if(!t||t.length>96||!/^[A-Za-z0-9.+\-*/^() ]+$/.test(t))throw new base.CalcError(base.ERROR.ARGUMENT);try{base.parse(t)}catch(e){throw new base.CalcError(e.code||base.ERROR.SYNTAX)}return t}
function acceptField(w){let field=w.fields[w.index],value=/^[fg]\(X\)$/.test(field)?safeFunction(w.buffer):safeNumber(w.buffer);w.values[w.index]=value;return value}
function pushBuffer(w,k){if(k==='NEG'){w.buffer=w.buffer.startsWith('-')?w.buffer.slice(1):'-'+w.buffer;return}let map={ADD:'+',SUB:'-',MUL:'*',DIV:'/',LP:'(',RP:')',POW:'^',SQ:'^2',PI:'pi',ANS:'Ans'};if(/^[0-9.]$/.test(k)||(/^[X]$/.test(k)&&/^[fg]\(X\)$/.test(w.fields[w.index])))w.buffer+=k;else if(/^[fg]\(X\)$/.test(w.fields[w.index])&&map[k])w.buffer+=map[k]}
function finishWizard(s){let w=s.ui.wizard;try{let expression=wizardExpression(w),value=base.calculateExpression(w.mode,expression,s);s.expression=expression;s.cursor=expression.length;s.lastValue=value;s.ans=value.kind==='mode-result'?value.ans:value.kind==='complex'?value.re:value.kind==='base'?base.rat(value.value):value;s.result=base.valueDisplay(value,s.setup,s.decimalView);s.view='result';s.error=null;s.history=[{expression,display:s.result},...s.history].slice(0,50);s.historyCursor=-1;s.ui.lastWizard={mode:w.mode,kind:w.kind,fields:[...w.fields],values:[...w.values],resultPage:0};s.ui.wizard=null}catch(e){s.error=e.code||base.ERROR.MATH;s.errorPos=s.cursor;s.view='error';s.result=s.error;s.ui.wizard=null}return s}
function dispatchKey(state,key){let s=decorate({...state,ui:state.ui?structuredClone(state.ui):undefined,history:state.history.slice(),memory:{...state.memory},trace:state.trace.slice(),setup:{...state.setup}});
 const end=()=>record(s,key);
 if(key==='ON'){s.power=true;if(s.view==='off')s.view='edit';return end()}
 if(!s.power)return end();
 if(key==='SHIFT'){s.shift=!s.shift;s.alpha=false;return end()}
 if(key==='ALPHA'){s.alpha=!s.alpha;s.shift=false;return end()}
 if(key==='AC'&&s.shift){s.power=false;s.view='off';s.shift=false;return end()}
 // Printed INS alternate: SHIFT+DEL toggles between insert and overwrite.
 // The state is independent of the structural cursor position.
 if((key==='DEL'&&s.shift)||key==='INS'){
  s.ui.insertMode=!s.ui.insertMode;s.shift=false;s.alpha=false;return end();
 }
 // ALPHA is one-shot and resolves printed letter legends before evaluation.
 // Explicit A-F/M/X/Y keys remain available for teacher-mode input.
 if(s.alpha&&!['mode','setup','coefficient','register-prompt','workflow-menu'].includes(s.view)){
  let letter=KEYS.resolve(s.model,key,'alpha');
  if(letter){key=letter;s.alpha=false}
 }
 // Resolve mode-specific physical legends before the generic expression editor.
 // The MODE/SETUP/coefficient/register screens keep precedence over expression entry.
 if(s.view==='edit'||s.view==='result'){
  if(s.mode==='BASE-N'&&!s.shift&&!s.alpha){
   const command=KEYS.resolve(s.model,key,'none','BASE-N');
   if(['BIN','OCT','DEC','HEX'].includes(command)){
    const suffix=s.expression.replace(/^(?:BIN|OCT|DEC|HEX):/,'');
    s.expression=command+':'+suffix;s.cursor=s.expression.length;
    s.result='';s.view='edit';s.document=E.fromSource('');
    return end();
   }
   if(command!==key){key=command}
  }
  if(s.shift){
   let action=KEYS.resolve(s.model,key,'shift',s.mode);
   if(action==='CUBE'||action==='POW10'||action==='EXP'){
    let value={CUBE:'^3',POW10:'10^(',EXP:'exp('}[action];
    if(s.mode==='COMP'&&s.document){
     if(s.view==='result')s.document=E.create();
     if(action==='POW10'){s.document=E.insertToken(s.document,'10');s.document=E.template(s.document,'Power')}
     else if(action==='EXP')s.document=E.template(s.document,'Function','exp');
     else s.document=E.insertToken(s.document,value);
     s.expression=E.serialize(s.document);s.cursor=E.sourceCursor(s.document);
    }else{
     if(s.view==='result'){s.expression='';s.cursor=0}
     s.expression=s.expression.slice(0,s.cursor)+value+s.expression.slice(s.cursor);s.cursor+=value.length;
    }
    s.shift=false;s.alpha=false;s.result='';s.view='edit';return end();
   }
  }
 }
 // Inverse trigonometric keys use the underlying structural template engine.

 // SHIFT + MODE enters a hierarchical SETUP menu. Direct setting keys are
 // also accepted to keep the prior controller and reference traces stable.
 if(key==='MODE'&&s.shift){s.shift=false;s.alpha=false;s.view='setup';s.ui.setupSection=null;return end()}
 if(s.view==='setup'){
  if(key==='AC'){s.view='edit';s.ui.setupSection=null;return end()}
  if(s.ui.setupSection==='Fix'||s.ui.setupSection==='Sci'){
   if(/^\d$/.test(key)){s.setup.format=s.ui.setupSection;s.setup.digits=Number(key);s.ui.setupSection=null;s.view='edit'}return end()
  }
  if(key==='1'||key==='2'||key==='3'){s.setup.angle={1:'DEG',2:'RAD',3:'GRAD'}[key];s.view='edit';return end()}
  if(key==='4'||key==='5'){s.ui.setupSection=key==='4'?'Fix':'Sci';return end()}
  if(key==='6'||key==='7'){s.setup.format=key==='6'?'Norm1':'Norm2';s.view='edit';return end()}
  return end();
 }
 // Existing MODE menu dispatch remains the source of truth for descriptors.
 if(s.view==='mode'){
  const next=base.dispatchKey(s,key);s=decorate(next);
  if(next.view==='edit'&&next.mode!==state.mode)enterWizard(s,next.mode);
  return s;
 }
 if(key==='MODE'){s=decorate(base.dispatchKey(s,key));return s}
 if(s.view==='workflow-menu'){
  if(key==='AC'){s.ui.wizard=null;s.view='edit';return end()}
  if(key==='UP'||key==='DOWN'){s.menuPage=Math.max(0,Math.min(2,s.menuPage+(key==='DOWN'?1:-1)));return end()}
  if(/^[1-9]$/.test(key)){selectWizard(s,s.menuPage*4+Number(key)-1);return end()}
  return end();
 }
 if(s.view==='coefficient'){
  let w=s.ui.wizard;
  if(key==='AC'){w.buffer='';return end()}
  if(key==='DEL'){w.buffer=w.buffer.slice(0,-1);return end()}
  if(key==='LEFT'&&w.index>0){if(w.buffer){try{acceptField(w)}catch(e){s.error=e.code||base.ERROR.ARGUMENT;s.view='error';return end()}}w.index--;w.buffer=w.values[w.index]||'';return end()}
  if(key==='RIGHT'&&w.index<w.fields.length-1){if(w.buffer){try{acceptField(w)}catch(e){s.error=e.code||base.ERROR.ARGUMENT;s.view='error';return end()}}w.index++;w.buffer=w.values[w.index]||'';return end()}
  if(key==='='||key==='DOWN'){
   try{acceptField(w);if(w.index+1===w.fields.length)return endAfter(finishWizard(s),key);w.index++;w.buffer=w.values[w.index]||''}catch(e){s.error=e.code||base.ERROR.ARGUMENT;s.errorPos=s.cursor;s.view='error'}return end()
  }
  pushBuffer(w,key);
  return end();
 }
 if(s.view==='result'&&s.ui.lastWizard&&['UP','DOWN'].includes(key)){let w=s.ui.lastWizard;let pages=s.lastValue?.data?.rows||s.lastValue?.data?.roots;if(Array.isArray(pages)&&pages.length){w.resultPage=Math.max(0,Math.min(pages.length-1,w.resultPage+(key==='DOWN'?1:-1)));return end()}}
 if(s.view==='register-prompt'){
  if(key==='AC'){s.ui.pending=null;s.view='edit';return end()}
  if(/^[A-FMXY]$/.test(key)){
   if(s.ui.pending==='STO')s.memory[key]=s.lastValue||s.ans;
   else {s.expression=s.expression.slice(0,s.cursor)+key+s.expression.slice(s.cursor);s.cursor++;syncInput(s)}
   s.ui.pending=null;s.shift=false;s.alpha=false;s.view='edit';return end()
  }return end();
 }
 if(s.view==='error'&&['LEFT','RIGHT'].includes(key)){
  s.view='edit';
  if(s.mode==='COMP'&&s.document){
   s.document=E.seekSource(s.document,s.errorPos);
   s.expression=E.serialize(s.document);
   s.cursor=E.sourceCursor(s.document);
  }else s.cursor=Math.max(0,Math.min(s.expression.length,s.errorPos));
  s.error=null;return end()
 }
 if(key==='RCL'&&s.shift){s.shift=false;s.ui.pending='STO';s.view='register-prompt';return end()}
 if(key==='RCL'&&s.alpha){s.alpha=false;s.ui.pending='RCL';s.view='register-prompt';return end()}
 if(key==='RCL_MENU'&&!s.shift&&(s.view==='edit'||s.view==='result')){s.ui.pending='RCL';s.view='register-prompt';return end()}
 if(key==='FDEL'&&s.view==='edit'&&s.mode==='COMP'&&s.document){
  s.document=E.delForward(s.document);s.expression=E.serialize(s.document);s.cursor=E.sourceCursor(s.document);
  s.result='';return end();
 }
 if(s.ui.insertMode===false&&s.view==='edit'&&s.mode==='COMP'&&s.document&&/^[0-9.]$/.test(key)){
  s.document=E.overwriteToken(s.document,key);s.expression=E.serialize(s.document);s.cursor=E.sourceCursor(s.document);
  s.result='';s.shift=false;s.alpha=false;return end();
 }
 // Support explicit RCL/STO keys for existing prototypes and tests.
 // A physical layout can use SHIFT+RCL for STO standby.
 s=decorate(base.dispatchKey(s,key));return s;
}
function endAfter(s,key){return s} // finishWizard records current dispatch event exactly once
function semanticScreen(s){if(!s.ui)return base.semanticScreen(s);let screen=base.semanticScreen(s);if(s.view==='workflow-menu'){let w=s.ui.wizard,choices=wizardConfigs[w.mode].menu;screen.result=choices.slice(s.menuPage*4,s.menuPage*4+4).map((c,i)=>(i+s.menuPage*4+1)+':'+c).join(' ');screen.expression='SELECT '+w.mode}
 if(s.view==='coefficient'){let w=s.ui.wizard;screen.expression=w.fields[w.index]+' = '+w.buffer;screen.result=(w.index+1)+'/'+w.fields.length}
 if(s.view==='result'&&s.ui.lastWizard){let w=s.ui.lastWizard,rows=s.lastValue?.data?.rows||s.lastValue?.data?.roots;if(Array.isArray(rows)&&rows.length){let index=w.resultPage||0;screen.expression=w.mode+' '+(index+1)+'/'+rows.length;screen.result=Array.isArray(rows[index])?rows[index].join(', '):String(rows[index])}}
 if(s.view==='register-prompt'){screen.expression=s.ui.pending+' REG';screen.result='A-F M X Y'}
 if(s.ui.insertMode===false)screen.indicators=[...screen.indicators,'OVR'];
 if(s.view==='setup'){screen.expression=s.ui.setupSection?s.ui.setupSection+' DIGITS':'SETUP';screen.result=s.ui.setupSection?'0-9':'1:D 2:R 3:G 4:FIX 5:SCI 6:N1 7:N2'}return screen}
function runTrace(test){let s=createState(test.model||'standard');for(let k of test.events)s=dispatchKey(s,k);let screen=semanticScreen(s),pixels=base.rasterizeScreen(screen);return {state:s,screen,pixels,hash:base.frameHash(pixels)}}
function createState(model='standard'){return decorate(base.createState(model))}
global.FX991=Object.freeze({...base,createState,dispatchKey,semanticScreen,runTrace});
})(typeof window!=='undefined'?window:globalThis);