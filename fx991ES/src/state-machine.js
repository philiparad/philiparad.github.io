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
function decorate(s){if(!s.ui)s.ui={page:0,pending:null,setupSection:null,wizard:null,insertMode:true};if(s.ui.insertMode===undefined)s.ui.insertMode=true;if(!base.DISPLAY_STYLES.includes(s.setup.displayStyle))s.setup.displayStyle=base.DISPLAY_STYLES.includes(s.ui.displayStyle)?s.ui.displayStyle:'MathO';s.ui.displayStyle=s.setup.displayStyle;
 if(!s.ui.modeMemory)s.ui.modeMemory={matrix:{A:null,B:null,C:null},vector:{A:null,B:null,C:null},stat:{kind:'1VAR',rows:[]}};
 return s}
// Milestone 27 persistent mode-memory: plain numeric arrays only; no executable text.
function cloneCells(rows){return rows.map(row=>row.slice())}
function registerCategory(mode){return mode==='MATRIX'?'matrix':mode==='VECTOR'?'vector':null}
function ensureReg(s,category,name){let r=s.ui.modeMemory[category][name];if(!r){r=category==='matrix'?[[0,0],[0,0]]:[0,0];s.ui.modeMemory[category][name]=r}return r}
function startRegister(s){let category=registerCategory(s.mode);if(!category)return s;
 s.ui.registerFlow={category,name:null,other:'B',size:2,field:0,buffer:'',operation:null};s.view='register-menu';return s}
function regValues(flow,store){let data=ensureReg(store,flow.category,flow.name);return flow.category==='matrix'?data.flat():data.slice()}
function saveRegValue(s){let flow=s.ui.registerFlow,v=flow.buffer;if(v==='')return;
 if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(v)||!Number.isFinite(Number(v)))throw new base.CalcError(base.ERROR.ARGUMENT);
 let data=ensureReg(s,flow.category,flow.name),n=flow.category==='matrix'?data.length:1,i=flow.field;
 if(flow.category==='matrix')data[Math.floor(i/n)][i%n]=Number(v);else data[i]=Number(v);
 flow.buffer='';}
function regExpression(s,op){let flow=s.ui.registerFlow,cat=flow.category,one=s.ui.modeMemory[cat][flow.name],two=s.ui.modeMemory[cat][flow.other];
 const matrixText=a=>a.map(row=>row.join(',')).join(';'),vectorText=a=>a.join(',');
 let unary=cat==='matrix'?['DET','INV','TRANS']:['ABS'];let binary=cat==='matrix'?['ADD','MUL']:['DOT','ADD','CROSS','ANGLE'];
 if(!unary.includes(op)&&!binary.includes(op))throw new base.CalcError(base.ERROR.ARGUMENT);
 if(!one||((!unary.includes(op))&&!two))throw new base.CalcError(base.ERROR.ARGUMENT);
 let encode=cat==='matrix'?matrixText:vectorText;
 return op+':'+encode(one)+(unary.includes(op)?'':'|'+encode(two));}
function regResult(s,op){try{let expression=regExpression(s,op),value=base.calculateExpression(s.mode,expression,s);
 s.expression=expression;s.cursor=expression.length;s.resultScrollX=0;s.mixedView=false;s.lastValue=value;s.ans=value.kind==='mode-result'?value.ans:value;s.result=base.valueDisplay(value,s.setup,s.decimalView,s.mode);s.error=null;s.view='result';s.ui.registerFlow=null;
 s.history=[{expression,display:s.result},...s.history].slice(0,50);
 s.ui.lastWizard={mode:s.mode,kind:op,fields:[],values:[],resultPage:0};}
 catch(e){s.error=e.code||base.ERROR.ARGUMENT;s.view='error';s.result=s.error}return s}
function editStat(s){let data=s.ui.modeMemory.stat;s.ui.statFlow={field:0,buffer:data.rows[0]?.[0]===undefined?'':String(data.rows[0][0])};s.view='stat-grid';return s}
function statFields(s){return s.ui.modeMemory.stat.rows.flat()}
function statAccept(s){let f=s.ui.statFlow,stat=s.ui.modeMemory.stat,v=f.buffer;if(v==='')return;
 if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(v)||!Number.isFinite(Number(v)))throw new base.CalcError(base.ERROR.ARGUMENT);
 let cols=stat.kind==='LINEAR'?2:1,row=Math.floor(f.field/cols),col=f.field%cols;
 while(stat.rows.length<=row)stat.rows.push(Array(cols).fill(0));stat.rows[row][col]=Number(v);f.buffer='';}
function statNavigate(s,step){let f=s.ui.statFlow,stat=s.ui.modeMemory.stat,cols=stat.kind==='LINEAR'?2:1;
 statAccept(s);f.field=Math.max(0,Math.min((stat.rows.length+1)*cols-1,f.field+step));let row=Math.floor(f.field/cols),col=f.field%cols;f.buffer=stat.rows[row]?.[col]===undefined?'':String(stat.rows[row][col])}
function statResult(s){try{statAccept(s);let stat=s.ui.modeMemory.stat,rows=stat.rows;
 if(!rows.length||(stat.kind==='LINEAR'&&rows.length<2))throw new base.CalcError(base.ERROR.ARGUMENT);
 let expression=stat.kind+':'+(stat.kind==='LINEAR'?rows.map(row=>row.join(',')).join(';'):rows.map(r=>r[0]).join(','));
 let value=base.calculateExpression('STAT',expression,s);s.expression=expression;s.cursor=expression.length;s.resultScrollX=0;s.mixedView=false;s.lastValue=value;s.ans=value.ans;s.result=value.text;s.view='result';s.error=null;
 s.history=[{expression,display:s.result},...s.history].slice(0,50);s.ui.statFlow=null;}
 catch(e){s.error=e.code||base.ERROR.ARGUMENT;s.view='error';s.result=s.error}return s}

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
function finishWizard(s){let w=s.ui.wizard;try{let expression=wizardExpression(w),value=base.calculateExpression(w.mode,expression,s);s.expression=expression;s.cursor=expression.length;s.lastValue=value;s.ans=value.kind==='mode-result'?value.ans:value.kind==='complex'?value.re:value.kind==='base'?base.rat(value.value):value;s.result=base.valueDisplay(value,s.setup,s.decimalView,s.mode);s.view='result';s.error=null;s.history=[{expression,display:s.result},...s.history].slice(0,50);s.historyCursor=-1;s.ui.lastWizard={mode:w.mode,kind:w.kind,fields:[...w.fields],values:[...w.values],resultPage:0};s.ui.wizard=null}catch(e){s.error=e.code||base.ERROR.MATH;s.errorPos=s.cursor;s.view='error';s.result=s.error;s.ui.wizard=null}return s}
function dispatchKey(state,key){let s=decorate({...state,ui:state.ui?structuredClone(state.ui):undefined,history:state.history.slice(),memory:{...state.memory},trace:state.trace.slice(),setup:{...state.setup}});
 const end=()=>record(s,key);
 // Persistent matrix/vector registers and editable STAT data are intentionally
 // separate from COMP scalar memory. MODE switches preserve them until reset.
 if(key==='REGS'&&registerCategory(s.mode)){startRegister(s);return end()}
 if(key==='DATA'&&s.mode==='STAT'){editStat(s);return end()}
 if(s.view==='register-menu'){
  if(key==='AC'){s.view='edit';s.ui.registerFlow=null;return end()}
  if(['1','2','3'].includes(key)){
   const f=s.ui.registerFlow;f.name=['A','B','C'][Number(key)-1];let data=ensureReg(s,f.category,f.name);f.size=f.category==='matrix'?data.length:data.length;
   f.field=0;f.buffer='';s.view='register-editor';return end()}
  return end();
 }
 if(s.view==='register-editor'){
  const f=s.ui.registerFlow;
  if(key==='AC'){s.view='register-menu';return end()}
  if(key==='OP'){try{saveRegValue(s);s.view='register-operation'}catch(e){s.error=e.code||base.ERROR.ARGUMENT;s.view='error'}return end()}
  if(key==='SIZE'){
   let n=f.size===2?3:2;f.size=n;f.field=0;f.buffer='';s.ui.modeMemory[f.category][f.name]=f.category==='matrix'?Array.from({length:n},()=>Array(n).fill(0)):Array(n).fill(0);return end()}
  if(key==='DEL'){f.buffer=f.buffer.slice(0,-1);return end()}
  if(key==='NEG'){f.buffer=f.buffer.startsWith('-')?f.buffer.slice(1):'-'+f.buffer;return end()}
  if(/^[0-9.]$/.test(key)){if(f.buffer.length<24)f.buffer+=key;return end()}
  if(['=','RIGHT','LEFT'].includes(key)){
   try{saveRegValue(s);let count=f.category==='matrix'?f.size*f.size:f.size;
    if(key==='LEFT')f.field=Math.max(0,f.field-1);
    else if(f.field+1<count)f.field++;
    else {s.view='register-summary';return end()}
    f.buffer='';}
   catch(e){s.error=e.code||base.ERROR.ARGUMENT;s.view='error'}return end()}
  return end();
 }
 if(s.view==='register-summary'){
  if(key==='AC'){s.view='edit';s.ui.registerFlow=null;return end()}
  if(key==='CLRREG'){s.ui.modeMemory[s.ui.registerFlow.category][s.ui.registerFlow.name]=null;s.view='register-menu';return end()}
  if(key==='COPY'){const f=s.ui.registerFlow,source=s.ui.modeMemory[f.category][f.name];if(source){s.ui.modeMemory[f.category][f.other]=structuredClone(source)}return end()}
  if(key==='EDIT'){s.view='register-editor';s.ui.registerFlow.field=0;s.ui.registerFlow.buffer='';return end()}
  if(key==='OP'){s.view='register-operation';return end()}
  if(key==='REGS'){s.view='register-menu';return end()}
  return end();
 }
 if(s.view==='register-operation'){
  let f=s.ui.registerFlow,ops=f.category==='matrix'?['DET','INV','TRANS','ADD','MUL']:['ABS','DOT','ADD','CROSS','ANGLE'];
  if(key==='AC'){s.view='register-summary';return end()}
  if(key==='OTHER'){f.other=f.other==='B'?'C':'B';return end()}
  if(/^[1-5]$/.test(key)){regResult(s,ops[Number(key)-1]);return end()}
  return end();
 }
 if(s.view==='stat-grid'){
  let f=s.ui.statFlow,stat=s.ui.modeMemory.stat;
  if(key==='AC'){s.view='edit';s.ui.statFlow=null;return end()}
  if(key==='PAIR'){stat.kind=stat.kind==='1VAR'?'LINEAR':'1VAR';stat.rows=[];f.field=0;f.buffer='';return end()}
  if(key==='DELROW'){stat.rows.splice(Math.floor(f.field/(stat.kind==='LINEAR'?2:1)),1);f.field=0;f.buffer=stat.rows[0]?.[0]===undefined?'':String(stat.rows[0][0]);return end()}
  if(key==='ADDROW'){try{statAccept(s);if(stat.rows.length>=80)throw new base.CalcError(base.ERROR.MEM);stat.rows.push(Array(stat.kind==='LINEAR'?2:1).fill(0));f.field=(stat.rows.length-1)*(stat.kind==='LINEAR'?2:1);f.buffer=''}catch(e){s.error=e.code||base.ERROR.ARGUMENT;s.view='error'}return end()}
  if(key==='STATS'){statResult(s);return end()}
  if(key==='DEL'){f.buffer=f.buffer.slice(0,-1);return end()}
  if(key==='NEG'){f.buffer=f.buffer.startsWith('-')?f.buffer.slice(1):'-'+f.buffer;return end()}
  if(/^[0-9.]$/.test(key)){if(f.buffer.length<24)f.buffer+=key;return end()}
  if(['=','RIGHT','LEFT','DOWN','UP'].includes(key)){
   try{statNavigate(s,['LEFT','UP'].includes(key)?-1:1)}catch(e){s.error=e.code||base.ERROR.ARGUMENT;s.view='error'}return end()}
  return end();
 }

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
 // In TABLE function-entry fields, ALPHA+LP is a physical-key route to X.
 if(s.alpha&&s.view==='coefficient'&&s.ui.wizard&&/^[fg]\(X\)$/.test(s.ui.wizard.fields[s.ui.wizard.index])){
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
   if(action==='MIX'){key=s.view==='edit'?'MIXIN':'MIX';s.shift=false;s.alpha=false}
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
 if(key==='MODE'&&s.shift){s.shift=false;s.alpha=false;s.view='setup';s.ui.setupSection=null;s.ui.setupPage=0;return end()}
 if(s.view==='setup'){
  if(key==='AC'){s.view='edit';s.ui.setupSection=null;s.ui.setupPage=0;return end()}
  if(s.ui.setupSection){
   if(s.ui.setupSection==='Fix'||s.ui.setupSection==='Sci'){
    if(/^[0-9]$/.test(key)){s.setup.format=s.ui.setupSection;s.setup.digits=Number(key);s.ui.setupSection=null;s.view='edit'}return end()
   }
   if(s.ui.setupSection==='Norm'&&['1','2'].includes(key)){
    s.setup.format=key==='1'?'Norm1':'Norm2';s.ui.setupSection=null;s.view='edit';return end()
   }
   if(s.ui.setupSection==='MthIO'&&['1','2'].includes(key)){
    // Record the preferred output layout; exact firmware raster/output is unverified.
    s.ui.displayStyle=key==='1'?'MathO':'LineO';s.setup.displayStyle=s.ui.displayStyle;s.ui.setupSection=null;s.view='edit';return end()
   }
   return end();
  }
  if(key==='UP'||key==='DOWN'){s.ui.setupPage=key==='DOWN'?1:0;return end()}
  if(s.ui.setupPage===1){
   // Secondary firmware choices are visible for reference; do not claim a
   // working capability when fraction, complex, STAT and contrast policies
   // have not yet been independently verified against device observations.
   return end();
  }
  if(key==='1'){s.ui.setupSection='MthIO';return end()}
  if(key==='2'){s.ui.displayStyle='LineIO';s.setup.displayStyle='LineIO';s.view='edit';return end()}
  if(['3','4','5'].includes(key)){s.setup.angle={3:'DEG',4:'RAD',5:'GRAD'}[key];s.view='edit';return end()}
  if(key==='6'||key==='7'){s.ui.setupSection=key==='6'?'Fix':'Sci';return end()}
  if(key==='8'){s.ui.setupSection='Norm';return end()}
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
 // Educational EXP10 key: enter a power-of-ten template after a coefficient.
 // This is mathematically equivalent to coefficient × 10^exponent, but does
 // not claim exact physical CASIO keypress/raster behavior.
 if(key==='EXP10'&&s.mode==='COMP'&&(s.view==='edit'||s.view==='result')){
  if(s.view==='result'){s.document=E.create();s.expression='';s.cursor=0}
  if(s.document){
   const before=E.serialize(s.document).slice(0,E.sourceCursor(s.document));
   // A coefficient (digit or closing group) must precede ×10^.
   if(/[0-9)]$/.test(before)){
    s.document=E.insertToken(s.document,'*10');
    s.document=E.template(s.document,'Power');
    s.expression=E.serialize(s.document);s.cursor=E.sourceCursor(s.document);
    s.view='edit';s.result='';s.shift=false;s.alpha=false;
   }
  }
  return end();
 }
 // Support explicit RCL/STO keys for existing prototypes and tests.
 // A physical layout can use SHIFT+RCL for STO standby.
 s=decorate(base.dispatchKey(s,key));return s;
}
function endAfter(s,key){return s} // finishWizard records current dispatch event exactly once
function semanticScreen(s){if(!s.ui)return base.semanticScreen(s);let screen=base.semanticScreen(s);
 if(s.view==='mode'){
  let modes=base.modeList(s);
  screen.menuItems=s.menuPage===0?modes.slice(0,8).map((name,i)=>(i+1)+':'+name):modes.slice(8).map((name,i)=>(i+1)+':'+name);
  screen.menuPage=s.menuPage;
  screen.hasMore=s.menuPage===0&&modes.length>8;
 }if(s.view==='workflow-menu'){let w=s.ui.wizard,choices=wizardConfigs[w.mode].menu;screen.result=choices.slice(s.menuPage*4,s.menuPage*4+4).map((c,i)=>(i+s.menuPage*4+1)+':'+c).join(' ');screen.expression='SELECT '+w.mode}
 if(s.view==='coefficient'){let w=s.ui.wizard;screen.expression=w.fields[w.index]+' = '+w.buffer;screen.result=(w.index+1)+'/'+w.fields.length}
 if(s.view==='result'&&s.ui.lastWizard){let w=s.ui.lastWizard,rows=s.lastValue?.data?.rows||s.lastValue?.data?.roots;if(Array.isArray(rows)&&rows.length){let index=w.resultPage||0;screen.expression=w.mode+' '+(index+1)+'/'+rows.length;screen.result=Array.isArray(rows[index])?rows[index].join(', '):String(rows[index])}}
 if(s.view==='register-menu'){screen.expression=s.mode+' REGISTERS';screen.result='1:A 2:B 3:C'}
 if(['register-editor','register-summary','register-operation'].includes(s.view)){
  let f=s.ui.registerFlow,reg=s.ui.modeMemory[f.category][f.name],count=f.category==='matrix'?reg.length*reg.length:reg.length;
  if(s.view==='register-editor'){screen.expression=(f.category==='matrix'?'Mat':'Vct')+f.name+' '+(f.field+1)+'/'+count;screen.result=f.buffer||String(regValues(f,s)[f.field]);}
  else if(s.view==='register-summary'){screen.expression=(f.category==='matrix'?'Mat':'Vct')+f.name+' SAVED';screen.result='OP EDIT REGS';}
  else{screen.expression=(f.category==='matrix'?'MATRIX':'VECTOR')+' OP';screen.result=f.category==='matrix'?'1:DET 2:INV 3:T 4:+ 5:*':'1:ABS 2:DOT 3:+ 4:X 5:ANGLE';}
 }
 if(s.view==='stat-grid'){let f=s.ui.statFlow,stat=s.ui.modeMemory.stat;screen.expression=stat.kind+' DATA '+(f.field+1);screen.result=f.buffer||'0';}
 if(s.view==='register-prompt'){screen.expression=s.ui.pending+' REG';screen.result='A-F M X Y'}
 if(s.ui.insertMode===false)screen.indicators=[...screen.indicators,'OVR'];
 if(s.view==='setup'){
  const section=s.ui.setupSection;
  screen.expression='SETUP';
  screen.result=section==='MthIO'?'1:MathO 2:LineO':section==='Norm'?'1:Norm1 2:Norm2':section==='Fix'||section==='Sci'?section+' 0-9':s.ui.setupPage===1?'SECONDARY OPTIONS (not active)':'1:MthIO 2:LineIO 3:Deg 4:Rad 5:Gra 6:Fix 7:Sci 8:Norm';
  screen.menuItems=section?null:s.ui.setupPage===1?['1:ab/c','2:d/c','3:CMPLX','4:STAT','5:Disp','6:CONT']:['1:MthIO','2:LineIO','3:Deg','4:Rad','5:Gra','6:Fix','7:Sci','8:Norm'];
  screen.menuPage=s.ui.setupPage||0;
 }
 return screen}
function runTrace(test){let s=createState(test.model||'standard');for(let k of test.events)s=dispatchKey(s,k);let screen=semanticScreen(s),pixels=base.rasterizeScreen(screen);return {state:s,screen,pixels,hash:base.frameHash(pixels)}}
function createState(model='standard'){return decorate(base.createState(model))}
global.FX991=Object.freeze({...base,createState,dispatchKey,semanticScreen,runTrace});
})(typeof window!=='undefined'?window:globalThis);
