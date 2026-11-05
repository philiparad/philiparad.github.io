/* Independent, deterministic Milestone 14 state-machine extension. */
(function(global){'use strict';
const base=global.FX991, E=global.FX991_EDITOR;
const configs={
EQN:{menu:['QUAD','CUBIC','LINEAR2','LINEAR3'],fields:{QUAD:['a','b','c'],CUBIC:['a','b','c','d'],LINEAR2:['a11','a12','b1','a21','a22','b2'],LINEAR3:['a11','a12','a13','b1','a21','a22','a23','b2','a31','a32','a33','b3']}},
MATRIX:{menu:['DET2','DET3'],fields:{DET2:['a11','a12','a21','a22'],DET3:['a11','a12','a13','a21','a22','a23','a31','a32','a33']}},
VECTOR:{menu:['DOT2','DOT3','CROSS3'],fields:{DOT2:['ax','ay','bx','by'],DOT3:['ax','ay','az','bx','by','bz'],CROSS3:['ax','ay','az','bx','by','bz']}},
STAT:{menu:['1VAR'],fields:{'1VAR':['x1','x2','x3']}},
TABLE:{menu:['SINGLE'],fields:{SINGLE:['start','end','step']}}
};
function decorate(s){if(!s.ui)s.ui={pending:null,setupSection:null,wizard:null};return s}
function record(s,key){s.trace=[...s.trace,{key,mode:s.mode,view:s.view,expression:s.expression,result:s.result}].slice(-200);return s}
function sync(s){if(s.mode==='COMP')s.document=E.fromSource(s.expression);s.cursor=Math.max(0,Math.min(s.cursor,s.expression.length))}
function enterWizard(s,mode){const conf=configs[mode];if(conf){s.ui.wizard={mode,kind:null,fields:[],values:[],index:0,buffer:''};s.view='workflow-menu';s.menuPage=0}return s}
function selectWizard(s,index){let w=s.ui.wizard,conf=configs[w.mode];if(!conf.menu[index])return s;w.kind=conf.menu[index];w.fields=conf.fields[w.kind];w.values=[];w.index=0;w.buffer='';s.view='coefficient';s.expression='';s.cursor=0;return s}
function wizardExpression(w){const v=w.values;
if(w.mode==='EQN'){if(w.kind==='QUAD')return 'QUAD:'+v.join(',');if(w.kind==='CUBIC')return 'CUBIC:'+v.join(',');let n=w.kind==='LINEAR2'?2:3;let rows=[];for(let i=0;i<n;i++)rows.push(v.slice(i*(n+1),i*(n+1)+n).join(','));return 'LINEAR:'+rows.join(';')+'|'+Array.from({length:n},(_,i)=>v[i*(n+1)+n]).join(',')}
if(w.mode==='MATRIX'){let n=w.kind==='DET2'?2:3;return 'DET:'+Array.from({length:n},(_,i)=>v.slice(i*n,i*n+n).join(',')).join(';')}
if(w.mode==='VECTOR'){let n=w.kind==='DOT2'?2:3;return (w.kind==='CROSS3'?'CROSS':'DOT')+':'+v.slice(0,n).join(',')+'|'+v.slice(n).join(',')}
if(w.mode==='STAT')return '1VAR:'+v.join(',');
if(w.mode==='TABLE')return 'X^2|'+v.join('|');
throw new base.CalcError(base.ERROR.ARGUMENT)}
function finishWizard(s){let w=s.ui.wizard;try{let source=wizardExpression(w),v=base.calculateExpression(w.mode,source,s);s.expression=source;s.cursor=source.length;s.lastValue=v;s.ans=v.kind==='mode-result'?v.ans:v.kind==='complex'?v.re:v.kind==='base'?base.rat(v.value):v;s.result=base.valueDisplay(v,s.setup,s.decimalView);s.view='result';s.error=null;s.history=[{expression:source,display:s.result},...s.history].slice(0,50);s.historyCursor=-1;s.ui.wizard=null}catch(e){s.error=e.code||base.ERROR.MATH;s.errorPos=s.cursor;s.view='error';s.result=s.error;s.ui.wizard=null}return s}
function dispatchKey(state,key){
let s=decorate({...state,ui:state.ui?structuredClone(state.ui):undefined,history:state.history.slice(),memory:{...state.memory},trace:state.trace.slice(),setup:{...state.setup}});
const end=()=>record(s,key);
if(key==='ON'){s.power=true;if(s.view==='off')s.view='edit';return end()}
if(!s.power)return end();
if(key==='SHIFT'){s.shift=!s.shift;s.alpha=false;return end()}
if(key==='ALPHA'){s.alpha=!s.alpha;s.shift=false;return end()}
if(key==='AC'&&s.shift){s.power=false;s.view='off';s.shift=false;return end()}
if(key==='MODE'&&s.shift){s.shift=false;s.alpha=false;s.view='setup';s.ui.setupSection=null;return end()}
if(s.view==='setup'){
if(key==='AC'){s.view='edit';s.ui.setupSection=null;return end()}
if(s.ui.setupSection==='Fix'||s.ui.setupSection==='Sci'){if(/^\d$/.test(key)){s.setup.format=s.ui.setupSection;s.setup.digits=Number(key);s.ui.setupSection=null;s.view='edit'}return end()}
if(['1','2','3'].includes(key)){s.setup.angle={1:'DEG',2:'RAD',3:'GRAD'}[key];s.view='edit';return end()}
if(key==='4'||key==='5'){s.ui.setupSection=key==='4'?'Fix':'Sci';return end()}
if(key==='6'||key==='7'){s.setup.format=key==='6'?'Norm1':'Norm2';s.view='edit';return end()}
return end()}
if(s.view==='mode'){let prev=s.mode;s=decorate(base.dispatchKey(s,key));if(s.view==='edit'&&s.mode!==prev)enterWizard(s,s.mode);return s}
if(key==='MODE'){s=decorate(base.dispatchKey(s,key));return s}
if(s.view==='workflow-menu'){
if(key==='AC'){s.ui.wizard=null;s.view='edit';return end()}
if(key==='UP'||key==='DOWN'){s.menuPage=Math.max(0,Math.min(2,s.menuPage+(key==='DOWN'?1:-1)));return end()}
if(/^[1-9]$/.test(key))selectWizard(s,s.menuPage*4+Number(key)-1);
return end()}
if(s.view==='coefficient'){
const w=s.ui.wizard;
if(key==='AC'){w.buffer='';return end()}
if(key==='DEL'){w.buffer=w.buffer.slice(0,-1);return end()}
if(key==='LEFT'&&w.index>0){if(w.buffer)w.values[w.index]=w.buffer;w.index--;w.buffer=w.values[w.index]||'';return end()}
if(key==='RIGHT'&&w.index<w.fields.length-1){if(w.buffer)w.values[w.index]=w.buffer;w.index++;w.buffer=w.values[w.index]||'';return end()}
if(key==='='||key==='DOWN'){if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(w.buffer)){s.error=base.ERROR.ARGUMENT;s.view='error';return end()}w.values[w.index]=w.buffer;if(w.index+1===w.fields.length)return finishWizard(s);w.index++;w.buffer=w.values[w.index]||'';return end()}
if(/^[0-9.]$/.test(key))w.buffer+=key;
if(key==='NEG'||key==='SUB')w.buffer=w.buffer.startsWith('-')?w.buffer.slice(1):'-'+w.buffer;
return end()}
if(s.view==='register-prompt'){
if(key==='AC'){s.ui.pending=null;s.view='edit';return end()}
if(/^[A-FMXY]$/.test(key)){if(s.ui.pending==='STO')s.memory[key]=s.lastValue||s.ans;else {s.expression=s.expression.slice(0,s.cursor)+key+s.expression.slice(s.cursor);s.cursor++;sync(s)}s.ui.pending=null;s.view='edit';s.shift=false;s.alpha=false;return end()}return end()}
if(s.view==='error'&&['LEFT','RIGHT'].includes(key)){s.view='edit';s.cursor=Math.max(0,Math.min(s.expression.length,s.errorPos));sync(s);s.error=null;return end()}
if(key==='RCL'&&s.shift){s.shift=false;s.ui.pending='STO';s.view='register-prompt';return end()}
if(key==='RCL'&&s.alpha){s.alpha=false;s.ui.pending='RCL';s.view='register-prompt';return end()}
return decorate(base.dispatchKey(s,key))}
function semanticScreen(s){let screen=base.semanticScreen(s);if(!s.ui)return screen;
if(s.view==='workflow-menu'){let w=s.ui.wizard,c=configs[w.mode].menu;screen.expression='SELECT '+w.mode;screen.result=c.slice(s.menuPage*4,s.menuPage*4+4).map((v,i)=>(i+s.menuPage*4+1)+':'+v).join(' ')}
if(s.view==='coefficient'){let w=s.ui.wizard;screen.expression=w.fields[w.index]+' = '+w.buffer;screen.result=(w.index+1)+'/'+w.fields.length}
if(s.view==='register-prompt'){screen.expression=s.ui.pending+' REG';screen.result='A-F M X Y'}
if(s.view==='setup'){screen.expression=s.ui.setupSection?s.ui.setupSection+' DIGITS':'SETUP';screen.result=s.ui.setupSection?'0-9':'1:D 2:R 3:G 4:FIX 5:SCI 6:N1 7:N2'}
return screen}
function createState(model='standard'){return decorate(base.createState(model))}
function runTrace(t){let s=createState(t.model||'standard');for(let k of t.events)s=dispatchKey(s,k);let screen=semanticScreen(s),pixels=base.rasterizeScreen(screen);return {state:s,screen,pixels,hash:base.frameHash(pixels)}}
global.FX991=Object.freeze({...base,createState,dispatchKey,semanticScreen,runTrace});
})(typeof window!=='undefined'?window:globalThis);
