/* A new, independent browser calculator controller. No imported project code. */
(function(){'use strict';
const COORD=window.FreshCoordinates;
if(!COORD)throw Error('Missing coordinate conversion module');
const FACT=window.FreshFactorization;
if(!FACT)throw Error('Missing prime-factorization module');
const SPECIAL=window.FreshSpecial;
if(!SPECIAL)throw Error('Missing special arithmetic module');
const M=window.FreshMath, COMPLEX=window.FreshComplex, K=window.FreshKeypad, LCD=window.FreshLCD, MODELS=window.FreshModels, STRUCT=window.FreshStructured, RESULTS=window.FreshResults, SETUP=window.FreshSetup, VIEW=window.FreshViewport, ERRORS=window.FreshErrors;
if(!ERRORS)throw Error('Missing calculator error handling module');
if(!COMPLEX)throw Error('Missing complex expression module');
if(!VIEW)throw Error('Missing two-dimensional LCD viewport');
if(!SETUP)throw Error('Missing model-specific SETUP menu');
if(!RESULTS)throw Error('Missing natural-result formatter');
if(!STRUCT)throw Error('Structured textbook editor unavailable');
if(!MODELS)throw Error('Missing CASIO model profile definitions');
const $=(id)=>document.getElementById(id);
const requestedModel=new URLSearchParams(location.search).get('model');
const initialModel=MODELS.profiles[requestedModel]?requestedModel:MODELS.defaultModel;
const modeNames=MODELS.get(initialModel).modes;
const state={power:true,model:initialModel,mode:'COMP',editor:STRUCT.create(),viewport:{inputX:0,inputY:0,resultX:0,flowX:0},resultPresentation:null,pendingMemory:null,factorization:null,coordinateResult:null,resultDMS:false,multiStatements:null,remainderResult:null,resultFractionStyle:null,ansRational:null,preAnsRational:null,...SETUP.defaults,engShift:0,shift:false,alpha:false,hyp:false,input:'',cursor:0,
 screen:'edit',result:'',raw:0,ans:0,preAns:0,history:[],memory:{A:0,B:0,C:0,D:0,E:0,F:0,M:0,X:0,Y:0},complexAns:{re:0,im:0},complexMemory:{},
 insert:true,error:'',errorOffset:null,errorSource:'',info:'',menu:[],menuTitle:'',menuEntries:[],menuPage:0,flow:null,outputLines:[],outputPage:0,decimal:false,recording:false,keylog:[],storedInputs:[],replayDraft:null,batterySimulation:'normal',powerOffReason:null};
const maxEntries=300;
// REA-044: browser simulation; all supported ES-family profiles specify
// approximately ten minutes. No physical battery level can be read here.
const AUTO_OFF_MS=Object.freeze({'fx-991es':600000,'fx-991es-plus':600000,'fx-991es-plus-c':600000});
let lastOperationAt=Date.now(),powerTimer=null;
function autoOffDelay(model){return AUTO_OFF_MS[model]??600000}
function inactivityExpired(last,now,limit){return Number.isFinite(last)&&Number.isFinite(now)&&now-last>=limit}
function clearPowerTimer(){if(powerTimer!==null){clearTimeout(powerTimer);powerTimer=null}}
function checkInactivity(){
 if(!state.power){clearPowerTimer();return}
 const remaining=autoOffDelay(state.model)-(Date.now()-lastOperationAt);
 if(remaining<=0){powerOff('automatic');return}
 clearPowerTimer();
 powerTimer=setTimeout(checkInactivity,Math.max(1,remaining));
}
function markOperation(){
 if(!state.power){clearPowerTimer();return}
 lastOperationAt=Date.now();checkInactivity();
}
// This is an explicit simulation control, never a claimed hardware reading.
function setSimulatedBattery(status){
 if(status!=='normal'&&status!=='low')return false;
 state.batterySimulation=status;
 notify(status==='low'?'Simulated battery: low (not measured)':'Simulated battery: normal (not measured)');
 paint();return true;
}
const releaseModifier=()=>{state.shift=false;state.alpha=false};
const notify=(text,isError=false)=>{const el=$('notice');el.textContent=text;el.classList.toggle('error',isError)};
function paint(){
 LCD.draw($('lcd'),state);
 // REA-016: derive all annunciators from current state, including
 // STO/RCL standby and history/menu replay cues.
 const flags=window.FreshIndicators.render(state,$);
 if(!$('lcd-panel').hidden){const ctx=$('lcd-large').getContext('2d');if(ctx){ctx.imageSmoothingEnabled=false;ctx.drawImage($('lcd'),0,0,$('lcd-large').width,$('lcd-large').height)}}
 $('lcd').setAttribute('aria-label',state.screen==='menu'?'LCD menu '+state.menuTitle+', page '+(state.menuPage+1)+', '+state.menu.map(x=>x.number+' '+x.label).join('; '):state.screen==='prompt'?'LCD prompt '+state.flow.title+', '+(state.flow.index+1)+' of '+state.flow.fields.length+', '+state.flow.fields[state.flow.index].label+' equals '+state.flow.buffer:state.screen==='flow-result'?'LCD result '+state.outputLines.join('; '):state.screen==='error'?'LCD error '+state.error+', press left or right to correct, or AC to cancel':'Calculator '+state.mode+', '+state.angle+', expression '+state.input+', result '+state.result);
 const faceIds={'fx-991es':'fx-991ES','fx-991es-plus':'fx-991ES PLUS','fx-991es-plus-c':'fx-991ES PLUS C'};
 document.querySelector('.case-model-id').textContent=faceIds[state.model];
 document.querySelector('.edition-mark').textContent=state.model==='fx-991es'?'':'2nd edition';
 $('model-label').textContent=MODELS.get(state.model).label;
 $('mode-label').textContent=state.mode;$('angle-label').textContent=state.angle;$('format-label').textContent=state.format==='Fix'||state.format==='Sci'?state.format+' '+state.digits:state.format;
 $('memory-label').textContent='M = '+(state.mode==='CMPLX'&&state.complexMemory.M?COMPLEX.format(state.complexMemory.M,state.angle,state.complexFormat):M.format(state.memory.M,{...state,math:false}));
 $('expression-text').textContent=state.screen==='prompt'?state.flow.fields[state.flow.index].label+' = '+state.flow.buffer:state.screen==='menu'?state.menuTitle:state.input||'Ready';$('answer-text').textContent=state.screen==='flow-result'?state.outputLines.slice(state.outputPage*3,state.outputPage*3+3).join(' / '):state.result||'0';
 document.querySelectorAll('.key-unit').forEach(el=>{
  const id=el.querySelector('button').dataset.key;
  el.classList.toggle('lit',(id==='SHIFT'&&state.shift)||(id==='ALPHA'&&state.alpha));
 });
}
function setResult(value,source=state.input,exactRational=null){
 // REA-040: commit answer memories only after a valid numeric calculation.
 if(typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>9.999999999e99)
  throw Error('Math ERROR');
 if(state.mode==='COMP'){
  state.preAns=state.ans;
  state.preAnsRational=state.ansRational;
 }else{
  state.preAns=0;state.preAnsRational=null;
 }
 state.ansRational=exactRational;state.resultFractionStyle=null;state.remainderResult=null;state.factorization=null;state.coordinateResult=null;
 state.ans=value;state.raw=value;state.decimal=false;state.engShift=0;
 state.resultSource=source;
 state.resultPresentation=RESULTS.calculate(value,source,state,{
   exactRational:state.ansRational,
   allowApproxRational:false
 });
 state.resultDMS=!!(window.FreshSexagesimal&&window.FreshSexagesimal.hasDMS(source));
 if(state.resultDMS){
  const text=window.FreshSexagesimal.format(value);
  if(text!==null){
   state.resultPresentation={chosen:{kind:'dms',text},natural:{kind:'dms',text},
    decimal:{kind:'decimal',text:RESULTS.decimal(value,state)}};
  }else state.resultDMS=false;
 }
 state.result=state.resultPresentation.chosen.text;state.viewport.resultX=Math.max(0,state.result.length-23);state.screen='result';state.error='';state.errorOffset=null;state.errorSource='';
 state.history.unshift({source,value,mode:state.mode,angle:state.angle});if(state.history.length>80)state.history.pop();clearReplay();
 notify('Calculated successfully');paint();
}
function error(message,source=state.input){
 const kind=ERRORS.classify(message,state.mode);
 state.error=kind;state.errorSource=String(source||state.input||'');
 state.errorOffset=ERRORS.location(state.errorSource,message);
 state.screen='error';releaseModifier();notify(kind,true);paint();
}
function setComplexResult(value,source){
 const z=COMPLEX.value(value);
 state.complexAns=z;state.raw=z.im===0?z.re:NaN;state.resultSource=source;
 state.ansRational=null;state.resultFractionStyle=null;state.remainderResult=null;
 state.factorization=null;state.coordinateResult=null;state.decimal=false;
 const text=COMPLEX.format(z,state.angle,state.complexFormat);
 const item={kind:'complex',text};
 state.resultPresentation={chosen:item,natural:item,decimal:item};
 state.result=text;state.viewport.resultX=Math.max(0,text.length-23);
 state.screen='result';state.error='';state.errorOffset=null;state.errorSource='';
 state.history.unshift({source,value:z,mode:'CMPLX',angle:state.angle});
 if(state.history.length>80)state.history.pop();clearReplay();
 notify('Complex calculation completed');paint();
}
function evaluateSegment(source){
 if(state.mode==='CMPLX'){
  const z=COMPLEX.evaluate(source,{angle:state.angle,ans:state.complexAns,
   memory:{...state.memory,...state.complexMemory}});
  setComplexResult(z,source);return;
 }
 const parsed=COORD.parse(source);
 if(parsed){
  const coordinate=COORD.evaluate(source,state,
   (part,opts)=>M.evaluate(part,{...opts,ans:state.ans,preAns:state.preAns,memory:state.memory}));
  // Compute the entire pair before modifying memory or Ans.
  setResult(coordinate.first,source,null);
  state.memory.X=coordinate.first;
  state.memory.Y=coordinate.second;
  state.coordinateResult=coordinate;
  const left=RESULTS.decimal(coordinate.first,{...state,math:false});
  const right=RESULTS.decimal(coordinate.second,{...state,math:false});
  const item={...coordinate,text:coordinate.firstLabel+'='+left+'  '+coordinate.secondLabel+'='+right};
  state.resultPresentation={chosen:item,natural:item,decimal:item};
  state.result=item.text;state.viewport.resultX=Math.max(0,item.text.length-23);
  paint();return;
 }
 const recurringExpanded=SPECIAL.expandRecurring(source);
 const div=SPECIAL.remainderExpression(recurringExpanded,state.ans);
 const expression=div.expression;
 let exactRational=null,exactValue=NaN;
 if(window.FreshRational){
  const exact=window.FreshRational.evaluate(expression,{
   ansRational:state.ansRational,preAnsRational:state.preAnsRational
  });
  if(exact){exactRational=window.FreshRational.serialize(exact);exactValue=window.FreshRational.toNumber(exact)}
 }
 const value=Number.isFinite(exactValue)&&Math.abs(exactValue)<=9.999999999e99?
  exactValue:M.evaluate(expression,{...state,ans:state.ans,preAns:state.preAns,memory:state.memory});
 // Native Natural Display presents a standalone Ran# as a fraction
 // representing one of the 1000 possible three-digit outcomes.
 if(/^Ran#$/i.test(source.trim())&&!exactRational){
  const q=RESULTS.reduced(Math.round(value*1000),1000);
  if(q)exactRational={numerator:String(q.numerator),denominator:String(q.denominator)};
 }
 setResult(value,source,exactRational);
 if(div.remainder){
  state.remainderResult=div.remainder;
  const text=String(div.remainder.quotient)+(state.decimalSeparator==='comma'?';':',')+' R='+String(div.remainder.remainder);
  const display={kind:'remainder',text};
  state.resultPresentation={chosen:display,natural:display,decimal:display};
  state.result=text;paint();
 }
}
function evaluate(){let source=state.input;try{
 source=STRUCT.serialize(state.editor,true);
 ERRORS.checkStack(source);
 if(!source)throw new M.MathFault('Syntax ERROR');
 const parts=SPECIAL.splitStatements(source);
 state.multiStatements=parts.length>1?{parts,index:0}:null;
 evaluateSegment(parts[0]);
}catch(e){state.multiStatements=null;error(e.message||'Math ERROR',source)}}
function advanceStatements(){
 if(!state.multiStatements)return false;
 const seq=state.multiStatements;
 if(seq.index>=seq.parts.length-1){state.multiStatements=null;return false}
 seq.index++;
 try{evaluateSegment(seq.parts[seq.index])}
 catch(e){state.multiStatements=null;error(e.message||'Math ERROR',seq.parts[seq.index])}
 if(seq.index>=seq.parts.length-1)state.multiStatements=null;
 return true;
}
function syncEditor(){
 state.input=STRUCT.serialize(state.editor);
 state.cursor=state.editor.path.length?state.input.length:state.editor.offset;
 if(state.editor.root.some(n=>n.type!=='char')&&state.math){
  const position=VIEW.follow(state.editor,{x:state.viewport.inputX,y:state.viewport.inputY});
  state.viewport.inputX=position.x;state.viewport.inputY=position.y;
 }else{
  const position=VIEW.linearWindow(state.input,state.cursor,23);
  state.viewport.inputX=position.start*4;state.viewport.inputY=0;
 }
}
function clearReplay(){state.storedInputs=[];state.replayDraft=null}
function replayHistory(key){
 if(state.mode!=='COMP'&&state.mode!=='CMPLX')return false;
 const entries=state.history.filter(item=>item.mode===state.mode&&typeof item.source==='string'&&item.source.length<=220);
 if(!entries.length)return false;
 const current=state.storedInputs.length?state.storedInputs[0]:-1;
 if(current<0&&key==='DOWN')return false;
 if(current<0)state.replayDraft=state.screen==='result'?(state.resultSource||state.input):state.input;
 const next=key==='UP'?Math.min(entries.length-1,current+1):current-1;
 if(next===current)return true;
 if(next<0){state.editor=STRUCT.fromString(state.replayDraft||'');clearReplay()}
 else{state.storedInputs=[next];state.editor=STRUCT.fromString(entries[next].source)}
 state.screen='edit';state.result='';state.error='';syncEditor();releaseModifier();paint();return true;
}
function beginEdit(continueAns=false){
 if(state.screen!=='edit'){
  state.screen='edit';state.input='';state.cursor=0;state.result='';state.factorization=null;state.coordinateResult=null;state.multiStatements=null;state.remainderResult=null;state.error='';state.errorOffset=null;state.errorSource='';
  state.editor=continueAns?STRUCT.fromString('Ans'):STRUCT.create();
  state.viewport.inputX=0;state.viewport.inputY=0;
  if(continueAns)syncEditor();
 }
}
function insert(text){
 clearReplay();
 if(!state.power)return;
 // A basic arithmetic operator following a result automatically starts with Ans.
 const continueAns=state.screen==='result'&&['+','-','*','/','^','^2','^(-1)'].includes(text);
 beginEdit(continueAns);
 if(state.input.length+text.length>220){error('Input limit');return}
 STRUCT.insert(state.editor,text,!state.insert);
 syncEditor();releaseModifier();notify('Editing textbook expression');paint();
}
function insertTemplate(type){
 clearReplay();
 if(!state.power)return;
 beginEdit();
 if(state.input.length>210){error('Input limit');return}
 STRUCT.template(state.editor,type,!state.insert);
 syncEditor();releaseModifier();notify('Use arrow keys to move between placeholders');paint();
}
function loadExpression(text){
 clearReplay();
 state.editor=STRUCT.fromString(text);
 syncEditor();state.screen='edit';state.result='';state.factorization=null;state.coordinateResult=null;state.multiStatements=null;state.remainderResult=null;state.error='';state.errorOffset=null;state.errorSource='';releaseModifier();paint();
}
function reset(mode='all'){
 clearReplay();
 state.menuEntries=[];state.menuPageSize=6;state.menuKind='normal';state.flow=null;state.menu=[];state.outputLines=[];state.viewport={inputX:0,inputY:0,resultX:0,flowX:0};state.resultPresentation=null;state.factorization=null;state.coordinateResult=null;state.resultDMS=false;state.multiStatements=null;state.remainderResult=null;state.resultFractionStyle=null;state.resultSource='';state.engShift=0;state.ansRational=null;state.preAnsRational=null;state.editor=STRUCT.create();state.input='';state.cursor=0;state.result='';state.ans=0;state.preAns=0;state.raw=0;state.screen='edit';state.error='';state.errorOffset=null;state.errorSource='';state.decimal=false;state.hyp=false;state.insert=true;releaseModifier();
 if(mode==='all'){state.mode='COMP';Object.assign(state,SETUP.defaults);state.memory=Object.fromEntries(Object.keys(state.memory).map(k=>[k,0]));state.complexMemory={};state.complexAns={re:0,im:0};state.history=[];state.power=true}
 notify('Calculator reset');paint()
}
// REA-043: memory and settings persist across an ordinary OFF/ON cycle.
function clearTransientDisplay(){
 state.pendingMemory=null;state.flow=null;state.menuEntries=[];state.menu=[];
 state.menuTitle='';state.menuPage=0;state.outputLines=[];state.outputPage=0;
 state.factorization=null;state.coordinateResult=null;state.multiStatements=null;
 state.remainderResult=null;state.resultPresentation=null;state.resultSource='';
 state.resultDMS=false;state.error='';state.errorOffset=null;state.errorSource='';
 state.info='';state.screen='edit';state.result='';state.editor=STRUCT.create();
 state.input='';state.cursor=0;state.viewport={inputX:0,inputY:0,resultX:0,flowX:0};
 state.hyp=false;releaseModifier();clearReplay();
}
function clearSetup(){
 // CLR 1: setup defaults and calculation history, but no change to memory.
 Object.assign(state,SETUP.defaults);state.history=[];
 clearTransientDisplay();state.engShift=0;state.decimal=false;
 state.resultFractionStyle=null;notify('Setup initialized');paint();
}
function powerOff(reason='manual'){
 // OFF/APO do not erase variables, Ans, PreAns, M, mode, or SETUP.
 clearPowerTimer();clearTransientDisplay();state.history=[];state.power=false;
 state.powerOffReason=reason;
 notify(reason==='automatic'?'Auto Power Off — press ON':'Calculator off — press ON');paint();
}
function powerOn(){
 // The ON key also clears calculation history, not saved memories.
 clearTransientDisplay();state.history=[];state.power=true;state.powerOffReason=null;
 markOperation();notify('Calculator on');paint();
}
function clearMenu(){
 releaseModifier();
 optionDialog('CLR — choose data to reset',[
  {key:'1',label:'1. Setup',action:()=>optionDialog('Clear Setup? = Yes, AC No',[
   {key:'=',label:'Yes',action:()=>clearSetup()}
  ])},
  {key:'2',label:'2. Memory',action:()=>optionDialog('Clear Memory? = Yes, AC No',[
   {key:'=',label:'Yes',action:()=>clearMemory()}
  ])},
  {key:'3',label:'3. All',action:()=>optionDialog('Clear All? = Yes, AC No',[
   {key:'=',label:'Yes',action:()=>reset('all')}
  ])}
 ]);
}
// All calculation interactions use the calculator's 96 x 31 LCD and 50 keys.
// The companion panels are read-only; they never collect a mathematical value.
function optionDialog(title,entries,options={}){
 state.menuTitle=title;state.menuEntries=entries;state.menuPage=0;
 state.menuPageSize=options.pageSize||6;state.menuKind=options.kind||'normal';
 state.screen='menu';showMenu();
}
function showMenu(){
 const size=state.menuPageSize||6;
 state.menu=state.menuEntries.slice(state.menuPage*size,state.menuPage*size+size).map((e,i)=>({
  label:e.label,number:e.key!==undefined?e.key:i+1
 }));
 state.info=state.menuPage?'PAGE '+(state.menuPage+1):'';
 paint();
}
const OPTION_CHOICES={
 op:['+','-','*','/','abs','arg','AND','OR','XOR','NOT','det','add','multiply','dot','cross'],
 operator:['=','!=','<','<=','>','>='],
 kind:['Normal CDF','Normal PDF','Binomial PDF','Binomial CDF'],
 variable:['A','B','C','D','E','F','X','Y']
};
function fieldForm(title,fields,run){
 const selections={
  'CMPLX':['+','-','*','/','abs','arg'],
  'BASE-N':['+','-','AND','OR','XOR','NOT'],
  'MATRIX':['det','add','multiply'],
  'VECTOR':['dot','cross','abs'],
  'INEQ':['<','<=','>','>=']
 };
 const modeSelect=Object.entries(selections).find(([name])=>title.startsWith(name));
 const prepared=fields.map(f=>({...f,...(f.id==='op'&&modeSelect?{choices:modeSelect[1]}:{})}));
 state.flow={title,fields:prepared,index:0,values:{},buffer:String(fields[0]?.value??''),cursor:String(fields[0]?.value??'').length,editing:false,run};
 state.screen='prompt';releaseModifier();state.info='';paint();
}
function flowField(){return state.flow.fields[state.flow.index]}
function flowNext(){
 const f=state.flow,field=flowField();f.values[field.id]=f.buffer;
 if(f.index<f.fields.length-1){f.index++;f.buffer=f.values[flowField().id]??String(flowField().value??'');f.cursor=f.buffer.length;f.editing=false;state.info='';paint();return}
 try{
  const output=f.run({...f.values});
  const lines=String(output??state.result??'0').split(/\n/).flatMap(line=>{
    return [line];
  });
  state.flow=null;state.outputLines=lines;state.outputPage=0;state.viewport.flowX=0;state.screen='flow-result';state.info='';
  notify('Calculation completed. UP/DOWN: scroll; AC: exit');paint();
 }catch(e){state.info=String(e.message||'Math ERROR').slice(0,23);notify(state.info,true);paint()}
}
function flowHandle(key){
 const f=state.flow;if(!f)return false;
 if(key==='AC'){state.flow=null;state.screen='edit';releaseModifier();state.info='';paint();return true}
 if(key==='EQUAL'||key==='DOWN'){releaseModifier();flowNext();return true}
 if(key==='UP'){
  if(f.index>0){f.values[flowField().id]=f.buffer;f.index--;f.buffer=f.values[flowField().id]??String(flowField().value??'');f.cursor=f.buffer.length;f.editing=false}
  paint();return true
 }
 const field=flowField();const choices=field.choices||OPTION_CHOICES[field.id];
 if(choices&&(key==='LEFT'||key==='RIGHT')){
  const at=Math.max(0,choices.indexOf(f.buffer));f.buffer=choices[(at+(key==='RIGHT'?1:choices.length-1))%choices.length];f.cursor=f.buffer.length;f.editing=false;paint();return true;
 }
 if(key==='LEFT'||key==='RIGHT'){
  f.cursor=Math.max(0,Math.min(f.buffer.length,(f.cursor??f.buffer.length)+(key==='LEFT'?-1:1)));
  paint();return true;
 }
 if(key==='DEL'&&state.shift){
  state.insert=!state.insert;releaseModifier();
  notify(state.insert?'Insert mode':'Overwrite mode');paint();return true;
 }
 if(key==='DEL'){
   clearReplay();
  const at=f.cursor??f.buffer.length;
  if(at>0){f.buffer=f.buffer.slice(0,at-1)+f.buffer.slice(at);f.cursor=at-1}
  f.editing=true;state.info='';paint();return true;
 }
 if(key==='SHIFT'){state.shift=!state.shift;state.alpha=false;paint();return true}
 if(key==='ALPHA'){state.alpha=!state.alpha;state.shift=false;paint();return true}
 const vars={NEG:'A',DMS:'B',HYP:'C',SIN:'D',COS:'E',TAN:'F',LP:'X',RP:'Y',MPLUS:'M'};
 let addition=null;
 if(key.startsWith('TEXT:'))addition=key.slice(5);
 else if(state.alpha&&vars[key])addition=vars[key];
 else if(state.shift&&key==='RP')addition=',';
 else if(state.shift&&key==='DOT')addition=',';
 else if(state.shift&&key==='MUL')addition='*';
 else if(state.shift&&key==='DIV')addition='/';
 else if(/^\d$/.test(key))addition=key;
 else if(key==='DOT')addition='.';
 else if(key==='COMMA')addition=',';
 else if(key==='NEG'||key==='SUB')addition='-';
 else if(key==='ADD')addition='+';
 else if(key==='MUL')addition='*';
 else if(key==='DIV')addition='/';
 else if(key==='LP')addition='(';
 else if(key==='RP')addition=')';
 else if(key==='POWER')addition='^';
 else if(key==='SQUARE')addition='^2';
 else if(key==='EXP')addition='E';
 else if(key==='FRAC')addition='/';
 else if(key==='SQRT')addition='sqrt(';
 else if(key==='SIN')addition='sin(';
 else if(key==='COS')addition='cos(';
 else if(key==='TAN')addition='tan(';
 else if(key==='LOG')addition='log(';
 else if(key==='LN')addition='ln(';
 else if(key==='ANS')addition='Ans';
 if(addition!==null){
  if(f.editing===false){f.buffer='';f.cursor=0;f.editing=true}
  if(f.buffer.length+addition.length<=170){
   const at=f.cursor??f.buffer.length;
   const rest=state.insert?f.buffer.slice(at):f.buffer.slice(at+addition.length);
   f.buffer=f.buffer.slice(0,at)+addition+rest;
   f.cursor=at+addition.length;
  }
  releaseModifier();paint();return true;
 }
 return true;
}
function menuHandle(key){
 if(key==='AC'){state.menuEntries=[];state.menu=[];state.menuPageSize=6;state.menuKind='normal';state.screen='edit';state.info='';paint();return true}
 const size=state.menuPageSize||6;
 if(key==='RIGHT'||key==='DOWN'){
  if((state.menuPage+1)*size<state.menuEntries.length){state.menuPage++;showMenu()}return true
 }
 if(key==='LEFT'||key==='UP'){
  if(state.menuPage>0){state.menuPage--;showMenu()}return true
 }
 if(/^[0-9]$/.test(key)||key==='EQUAL'){
  const view=state.menu;
  const pos=view.findIndex(x=>String(x.number)===(key==='EQUAL'?'=':key));
  const entry=pos>=0?state.menuEntries[state.menuPage*size+pos]:null;
  if(entry){
   state.menuEntries=[];state.menu=[];state.menuPageSize=6;
   state.menuKind='normal';state.screen='edit';state.info='';
   entry.action();paint();
  }
  return true;
 }
 return true;
}
function applyAdvancedResult(value,description){
 // Use the ordinary result transition for all scalar advanced-mode calculations.
 if(typeof value!=='number'||!Number.isFinite(value))throw Error('Math ERROR');
 const source=description||state.input;
 if(source){
  state.editor=STRUCT.fromString(source);
  syncEditor();
 }
 setResult(value,source,null);
}
function functionFor(expr,equation=false){
 const expression=String(expr).trim();
 const parts=expression.split('=');
 if(parts.length>2||parts.some(s=>!s.trim())||(!equation&&parts.length>1))
  throw Error('Syntax ERROR');
 const left=parts[0],right=parts.length===2?parts[1]:null;
 if(equation&&!/(?:^|[^A-Za-z0-9_])X(?:$|[^A-Za-z0-9_])/.test(expression))
  throw Error('Variable ERROR');
 return x=>{
  const opts={...state,ans:state.ans,memory:{...state.memory,X:x},math:false};
  const a=M.evaluate(left,opts);
  return right===null?a:a-M.evaluate(right,opts);
 };
}
function numericalFlow(kind){
 if(state.mode!=='COMP'){error('Argument ERROR');return}
 const modes={SOLVE:'SOLVE — numerical root',DERIVATIVE:'d/dx — derivative at X',INTEGRAL:'∫ — definite integral',SUM:'Σ — finite sum',PRODUCT:'Π — finite product'};
 const fields=[{id:'expression',label:'Expression in X',value:state.input||'X^2-2'}];
 if(kind==='DERIVATIVE')fields.push({id:'at',label:'At X',value:'2'});
 if(kind==='SOLVE')fields.push({id:'guess',label:'Initial X',value:'1'});
 if(kind==='INTEGRAL'||kind==='SUM'||kind==='PRODUCT')fields.push({id:'a',label:'Lower bound',value:'0'},{id:'b',label:'Upper bound',value:'1'});
 if(kind==='DERIVATIVE'||kind==='INTEGRAL')fields.push({id:'tol',label:'Tolerance (≥ 1E-14)',value:kind==='DERIVATIVE'?'1E-10':'1E-5'});
 if(kind==='PRODUCT')fields.push({id:'step',label:'Positive integer step (web extension)',value:'1'});
 fieldForm(modes[kind],fields,data=>{
  if(/\b(?:Pol|Rec|Prod|Product)\s*\(|[ΠΣ∫]|÷R|d\/dx|\b(?:Sum|Sigma|Integral|Diff)\s*\(/i.test(data.expression))
   throw Error('Syntax ERROR');
  const f=functionFor(data.expression,kind==='SOLVE');
  if(Object.entries(data).some(([field,expression])=>
   field!=='expression'&&/\b(?:Pol|Rec|Prod|Product|Sum|Sigma|Integral|Diff)\s*\(|[ΠΣ∫]|÷R|d\/dx/i.test(String(expression))))
   throw Error('Syntax ERROR');
  const asNumber=(source)=>{
   if(!String(source).trim())throw Error('Argument ERROR');
   const value=M.evaluate(String(source),{...state,ans:state.ans,memory:state.memory});
   if(!Number.isFinite(value))throw Error('Math ERROR');
   return value;
  };
  let value;
  if(kind==='DERIVATIVE')value=M.derivative(f,asNumber(data.at),asNumber(data.tol));
  if(kind==='INTEGRAL')value=M.integrate(f,asNumber(data.a),asNumber(data.b),asNumber(data.tol));
  if(kind==='SOLVE')value=M.solve(f,asNumber(data.guess));
  if(kind==='SUM')value=M.summation(f,asNumber(data.a),asNumber(data.b));
  if(kind==='PRODUCT')value=M.finiteProduct({expression:data.expression,a:data.a,b:data.b,step:data.step},{...state,memory:state.memory,ans:state.ans,preAns:state.preAns});
  if(!Number.isFinite(value)||Math.abs(value)>9.999999999e99)throw Error('Math ERROR');
  // REA-038: calculation results update Ans/PreAns and history, not just the LCD.
  setResult(value,data.expression,null);
  if(kind==='SOLVE'){
   const residual=f(value);
   return 'X = '+M.format(value,{...state,math:false})+'\nL-R = '+M.format(residual,{...state,math:false});
  }
  return M.format(value,state);
 })
}
function exitFactorization(){
 const saved=state.factorization;
 if(!saved)return false;
 state.factorization=null;
 state.resultPresentation=saved.presentation;
 state.result=saved.result;state.viewport.resultX=Math.max(0,state.result.length-23);
 paint();return true;
}
function factorResult(){
 if(state.screen!=='result')return;
 if(state.factorization){exitFactorization();return}
 const chosen=state.resultPresentation?.chosen;
 // Only a displayed positive integer result is eligible; not a fractional,
 // sexagesimal, repeating, remainder, or engineering result.
 const invalid=chosen&&chosen.kind!=='decimal';
 const fact=FACT.factorize(state.raw,{mode:state.mode,remainder:!!state.remainderResult,disallowed:!!invalid});
 state.factorization={result:state.result,presentation:state.resultPresentation};
 state.resultPresentation={...state.resultPresentation,chosen:fact};
 state.result=fact.text;state.viewport.resultX=Math.max(0,state.result.length-23);
 releaseModifier();paint();
}
function toggleDMS(){
 if(state.screen!=='result'||!Number.isFinite(state.raw))return;
 const asDMS=!state.resultDMS;
 const text=asDMS?window.FreshSexagesimal.format(state.raw):RESULTS.decimal(state.raw,state);
 if(text===null)return;
 state.resultDMS=asDMS;
 const item={kind:asDMS?'dms':'decimal',text};
 state.resultPresentation={chosen:item,natural:item,
  decimal:{kind:'decimal',text:RESULTS.decimal(state.raw,state)}};
 state.result=text;state.viewport.resultX=Math.max(0,text.length-23);
 paint();
}
// REA-039: physical STO/RCL standby and independent memory behavior.
const MEMORY_KEYS=Object.freeze({NEG:'A',DMS:'B',HYP:'C',SIN:'D',COS:'E',TAN:'F',LP:'X',RP:'Y',MPLUS:'M'});
function memoryOperand(){
 if(state.mode==='CMPLX'){
  if(state.screen==='result')return COMPLEX.value(state.complexAns);
  const source=STRUCT.serialize(state.editor,true);
  if(!source)return COMPLEX.value(state.complexAns);
  evaluate();if(state.screen!=='result')throw Error(state.error||'Math ERROR');
  return COMPLEX.value(state.complexAns);
 }
 // CASIO memory keys consume the displayed result, an entered calculation,
 // or Ans when the input line is empty after AC.
 if(state.screen==='result')return state.raw;
 const source=STRUCT.serialize(state.editor,true);
 if(!source){
  if(!Number.isFinite(state.ans))throw Error('Math ERROR');
  setResult(state.ans,'Ans',state.ansRational);
  return state.raw;
 }
 evaluate();
 if(state.screen!=='result')throw Error(state.error||'Math ERROR');
 return state.raw;
}
function assignRegister(name,value){
 if(state.mode==='CMPLX'){
  const z=COMPLEX.value(value);state.complexMemory[name]=z;
  if(z.im===0)state.memory[name]=z.re;
  return;
 }
 if(!Number.isFinite(value)||Math.abs(value)>9.999999999e99)throw Error('Math ERROR');
 state.memory[name]=value;
 delete state.complexMemory[name];
}
function memorySelect(name){
 const kind=state.pendingMemory;state.pendingMemory=null;
 try{
  if(kind==='STO'){
   const value=memoryOperand();assignRegister(name,value);
   notify('Stored '+(state.mode==='CMPLX'?COMPLEX.format(value,state.angle,state.complexFormat):M.format(value,{...state,math:false}))+' in '+name);
  }else if(kind==='RCL'){
   const value=state.mode==='CMPLX'?(state.complexMemory[name]??COMPLEX.value(state.memory[name])):state.memory[name];
    if(state.mode==='CMPLX')setComplexResult(value,name);else setResult(value,name,null);
   notify('Recalled '+name);
  }
 }catch(e){if(state.screen!=='error')error(e.message||'Math ERROR')}
 paint();
}
function memoryDialog(store=false){
 state.pendingMemory=store?'STO':'RCL';
 releaseModifier();notify(state.pendingMemory+' — select A-F, X, Y or M');paint();
}
function memorySum(current,value,sign){
 if(sign!==1&&sign!==-1)throw Error('Argument ERROR');
 const total=current+sign*value;
 if(!Number.isFinite(total)||Math.abs(total)>9.999999999e99)throw Error('Math ERROR');
 return total;
}
function accumulateMemory(sign){
 try{
  const value=memoryOperand();
  if(state.mode==='CMPLX'){
   const previous=state.complexMemory.M??COMPLEX.value(state.memory.M);
   assignRegister('M',sign===1?COMPLEX.add(previous,value):COMPLEX.sub(previous,value));
  }else assignRegister('M',memorySum(state.memory.M,value,sign));
  notify(sign===1?'Added to M':'Subtracted from M');releaseModifier();paint();
 }catch(e){if(state.screen!=='error')error(e.message||'Math ERROR')}
}
function clearMemory(){
 for(const name of Object.keys(state.memory))state.memory[name]=0;
 state.ans=0;state.preAns=0;state.raw=0;state.ansRational=null;state.preAnsRational=null;state.complexAns={re:0,im:0};state.complexMemory={};
 state.pendingMemory=null;state.resultPresentation=null;state.result='';state.resultSource='';
 state.error='';state.errorOffset=null;state.errorSource='';state.history=[];clearReplay();
 state.screen='edit';state.editor=STRUCT.create();state.viewport={inputX:0,inputY:0,resultX:0,flowX:0};syncEditor();
 notify('Memory cleared');paint();
}
function setupChoose(id,value){
 if(state.factorization)exitFactorization();
 switch(id){
 case 'mthio':
  state.math=true;state.outputMath=value==='matho';break;
 case 'norm':state.format=value==='norm1'?'Norm1':'Norm2';break;
 case 'complex':state.complexFormat=value;break;
 case 'stat':state.statFrequency=value==='on';break;
 case 'table':state.tableFunctions=value==='single'?1:2;break;
 case 'recurring':state.recurringDecimal=value==='on';break;
 case 'disp':state.decimalSeparator=value;break;
 }
 notify('SETUP '+id+': '+value);paint();
}
function setupSetting(id){
 if(state.factorization)exitFactorization();
 if(id==='lineio'){state.math=false;state.outputMath=false;paint();return}
 if(id==='deg'||id==='rad'||id==='gra'){
  state.angle=id==='deg'?'DEG':id==='rad'?'RAD':'GRAD';paint();return;
 }
 if(id==='mixed'||id==='improper'){
  state.fractionStyle=id;state.resultFractionStyle=null;paint();return;
 }
 if(id==='fix'||id==='sci'){
  const kind=id==='fix'?'Fix':'Sci';
  optionDialog(kind+' 0-9',Array.from({length:10},(_,i)=>({
   key:String(i),label:String(i),action:()=>{
    state.format=kind;state.digits=i;paint();
   }
  })),{pageSize:10,kind:'setup'});
  return;
 }
 if(id==='contrast'){
  state.screen='contrast';state.info='LIGHT LEFT  RIGHT DARK';
  paint();return;
 }
 const entries=SETUP.options(id);
 if(entries.length){
  optionDialog('SETUP '+id.toUpperCase(),entries.map(e=>({
   key:e.key,label:e.label,action:()=>setupChoose(id,e.value)
  })),{pageSize:8,kind:'setup'});
 }
}
function setupMenu(){
 const pages=SETUP.pages(state.model);
 optionDialog('SETUP',pages.flat().map(e=>({
  key:e.key,label:e.label,action:()=>setupSetting(e.id)
 })),{pageSize:8,kind:'setup'});
}
function modeMenu(){optionDialog('MODE',MODELS.get(state.model).modes.map((mode,i)=>({label:(i+1)+'. '+mode,action:()=>setMode(mode)})))}
function setMode(mode){if(!MODELS.supports(state.model,mode)){notify('Not available for '+MODELS.get(state.model).label,true);return}
 if(state.mode==='COMP'&&mode!=='COMP'){state.preAns=0;state.preAnsRational=null}
 clearReplay();state.pendingMemory=null;state.editor=STRUCT.create();state.mode=mode;state.input='';state.cursor=0;state.result='';state.screen='edit';releaseModifier();notify(mode+' mode');paint();if(mode!=='COMP')advancedMode(mode)}
function setModel(id){
 if(!MODELS.profiles[id])return false;
 state.model=id;
 reset('all');
 state.model=id;
 state.mode='COMP';
 $('model-selector').value=id;
 notify('Model: '+MODELS.get(id).label+' · only supported modes are shown');
 paint();
 return true;
}
function parseCsv(text){return M.parseNumbers(text)}
function normalCDF(x,mu=0,sigma=1){if(sigma<=0)throw Error('Argument ERROR');const z=(x-mu)/(sigma*Math.SQRT2);const sign=Math.sign(z),a=Math.abs(z),t=1/(1+0.3275911*a);const erf=sign*(1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-a*a));return (1+erf)/2}
function advancedMode(mode){
 if(mode==='STAT')return fieldForm('STAT — one-variable statistics',[
  {id:'data',label:'Observations, separated by commas',value:'1,2,3,4,5'},
  ...(state.statFrequency?[{id:'freq',label:'FREQ per observation',value:'1,1,1,1,1'}]:[])
 ],d=>{
  const values=parseCsv(d.data);
  let data=values;
  if(state.statFrequency){
   const freqs=parseCsv(d.freq);
   if(freqs.length!==values.length||freqs.some(n=>!Number.isInteger(n)||n<0))throw Error('Argument ERROR');
   if(freqs.reduce((a,b)=>a+b,0)>100000)throw Error('Argument ERROR');
   data=values.flatMap((x,i)=>Array(freqs[i]).fill(x));
  }
  const summary=M.descriptiveStats(data);applyAdvancedResult(summary.mean,'STAT mean');
  return Object.entries(summary).map(([k,v])=>k+' = '+(v===null?'N/A':M.format(v,{...state,math:false}))).join('\n');
 });
 if(mode==='CMPLX'){notify('Enter expressions; ALPHA + ENG inserts i');paint();return}
 if(mode==='BASE-N')return fieldForm('BASE-N — signed integer and bitwise operations',[{id:'a',label:'First integer',value:'10'},{id:'b',label:'Second integer',value:'12'},{id:'op',label:'Operation (+, -, AND, OR, XOR, NOT)',value:'AND'}],d=>{
  const a=Number(d.a),b=Number(d.b);if(!Number.isInteger(a)||!Number.isInteger(b))throw Error('Argument ERROR');let result;switch(d.op.trim().toUpperCase()){
   case '+':result=a+b;break;case '-':result=a-b;break;case 'AND':result=a&b;break;case 'OR':result=a|b;break;case 'XOR':result=a^b;break;case 'NOT':result=~a;break;default:throw Error('Unsupported operation')}
  applyAdvancedResult(result,'BASE-N');return 'DEC '+result+'\nHEX '+(result>>>0).toString(16).toUpperCase()+'\nBIN '+(result>>>0).toString(2)+'\nOCT '+(result>>>0).toString(8)
 });
 if(mode==='EQN')return optionDialog('EQN — choose equation type',[
  {label:'Quadratic ax²+bx+c=0',action:()=>fieldForm('Quadratic equation',[{id:'a',label:'a',value:'1'},{id:'b',label:'b',value:'-3'},{id:'c',label:'c',value:'2'}],d=>{
   const roots=M.quadratic(+d.a,+d.b,+d.c);if(roots.length)applyAdvancedResult(roots[0],'EQN');return roots.length?roots.map((r,i)=>'X'+(i+1)+' = '+M.format(r,state)).join('\n'):'No real solution'})},
  {label:'Two linear equations',action:()=>fieldForm('2×2 linear system',[{id:'a',label:'First row: a,b,c',value:'2,1,5'},{id:'b',label:'Second row: a,b,c',value:'1,-1,1'}],d=>{
   const rows=[parseCsv(d.a),parseCsv(d.b)];if(rows.some(x=>x.length!==3))throw Error('Expected three numbers per row');const x=M.matrixSolve(rows);applyAdvancedResult(x[0],'EQN');return 'X='+M.format(x[0],state)+'\nY='+M.format(x[1],state)})}
 ]);
 if(mode==='MATRIX')return fieldForm('MATRIX — 2×2 operations',[{id:'a',label:'Matrix A, row-major four entries',value:'1,2,3,4'},{id:'b',label:'Matrix B, row-major four entries',value:'2,0,1,3'},{id:'op',label:'Operation (det, add, multiply)',value:'multiply'}],d=>{
  const a=parseCsv(d.a),b=parseCsv(d.b);if(a.length!==4||b.length!==4)throw Error('Expected 2×2 matrices');let values;
  if(d.op==='det'){const det=a[0]*a[3]-a[1]*a[2];applyAdvancedResult(det,'MatA det');return 'det(A) = '+M.format(det,state)}
  if(d.op==='add')values=a.map((v,i)=>v+b[i]);else if(d.op==='multiply')values=[a[0]*b[0]+a[1]*b[2],a[0]*b[1]+a[1]*b[3],a[2]*b[0]+a[3]*b[2],a[2]*b[1]+a[3]*b[3]];else throw Error('Operation must be det, add or multiply');return values.slice(0,2).join('  ')+'\n'+values.slice(2).join('  ')
 });
 if(mode==='VECTOR')return fieldForm('VECTOR — 2D / 3D vectors',[{id:'a',label:'Vector A',value:'1,2,3'},{id:'b',label:'Vector B',value:'4,5,6'},{id:'op',label:'Operation (dot, cross, abs)',value:'dot'}],d=>{
  const a=parseCsv(d.a),b=parseCsv(d.b);if(a.length!==b.length||![2,3].includes(a.length))throw Error('Vector dimension ERROR');if(d.op==='abs'){const n=Math.hypot(...a);applyAdvancedResult(n,'VECTOR abs');return M.format(n,state)}
  if(d.op==='dot'){const n=a.reduce((acc,v,i)=>acc+v*b[i],0);applyAdvancedResult(n,'VECTOR dot');return M.format(n,state)}
  if(d.op==='cross'&&a.length===3)return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]].join(', ');throw Error('Cross product needs 3D vectors')
 });
 if(mode==='TABLE')return fieldForm('TABLE — values of f(X)',[
  {id:'expression',label:'f(X)',value:'X^2-2'},
  ...(state.tableFunctions===2?[{id:'expression2',label:'g(X)',value:'X+1'}]:[]),
  {id:'start',label:'Start',value:'-3'},{id:'end',label:'End',value:'3'},
  {id:'step',label:'Step',value:'1'}
 ],d=>{
  const a=+d.start,b=+d.end,h=+d.step;
  if(h<=0||b<a||(b-a)/h>60)throw Error('Argument ERROR');
  const fn=functionFor(d.expression),gn=state.tableFunctions===2?functionFor(d.expression2):null;
  const rows=[];
  for(let x=a;x<=b+h/1e6;x+=h){
   rows.push(M.format(x,{math:false})+' : '+M.format(fn(x),state)+(gn?' ; '+M.format(gn(x),state):''));
  }
  return rows.join('\n');
 });
 if(mode==='INEQ')return fieldForm('INEQ — quadratic sign intervals',[{id:'a',label:'a',value:'1'},{id:'b',label:'b',value:'-3'},{id:'c',label:'c',value:'2'},{id:'op',label:'Relation (<, <=, >, >=)',value:'<'}],d=>{
  let a=+d.a,b=+d.b,c=+d.c;if(a===0)throw Error('Only quadratic here');const roots=M.quadratic(a,b,c).sort((x,y)=>x-y);const sign=a>0?'positive':'negative';return 'Roots: '+(roots.length?roots.map(x=>M.format(x,state)).join(', '):'none')+'\nParabola opens '+(a>0?'upward':'downward')+'.\nFor two distinct roots, the sign is '+sign+' outside the roots and opposite inside.\nRelation: '+d.op
 });
 if(mode==='VERIF')return fieldForm('VERIF — numerical equality or inequality',[{id:'left',label:'Left expression',value:'sqrt(9)'},{id:'operator',label:'Comparison (=, !=, <, <=, >, >=)',value:'='},{id:'right',label:'Right expression',value:'3'}],d=>{
  const a=M.evaluate(d.left,{...state,memory:state.memory,ans:state.ans}),b=M.evaluate(d.right,{...state,memory:state.memory,ans:state.ans});const op=d.operator.trim(),eps=1e-10*Math.max(1,Math.abs(a),Math.abs(b));
  const ok=op==='='?Math.abs(a-b)<eps:op==='!='?Math.abs(a-b)>=eps:op==='<'?a<b:op==='>'?a>b:op==='<='?a<=b:op==='>='?a>=b:null;if(ok===null)throw Error('Invalid comparison');applyAdvancedResult(ok?1:0,'VERIF');return ok?'TRUE':'FALSE'
 });
 if(mode==='DIST')return fieldForm('DIST — normal / binomial distribution',[{id:'kind',label:'Normal CDF, Normal PDF, Binomial PDF, Binomial CDF',value:'Normal CDF'},{id:'x',label:'X',value:'1'},{id:'a',label:'μ (normal) or n (binomial)',value:'0'},{id:'b',label:'σ (normal) or p (binomial)',value:'1'}],d=>{
  const x=+d.x,a=+d.a,b=+d.b;let ans;if(d.kind==='Normal CDF')ans=normalCDF(x,a,b);
  else if(d.kind==='Normal PDF')ans=Math.exp(-.5*((x-a)/b)**2)/(b*Math.sqrt(2*Math.PI));
  else if(d.kind==='Binomial PDF')ans=M.combination(a,x)*b**x*(1-b)**(a-x);
  else if(d.kind==='Binomial CDF'){ans=0;for(let i=0;i<=x;i++)ans+=M.combination(a,i)*b**i*(1-b)**(a-i)}
  else throw Error('Invalid distribution');applyAdvancedResult(ans,'DIST');return M.format(ans,{...state,math:false})
 });
}
function alphaKey(key){
 if(key==='INTEGRAL')return insert('Prod(');
 if(key==='LOGBASE'){numericalFlow('PRODUCT');return true}
 if(key==='FRAC')return insert('÷R');
 if(key==='SQRT'){
  if(!state.math||!state.input.endsWith('.')){notify('Use decimal point before recurring digits',true);paint();return true}
  return insertTemplate('recurring');
 }
 if(key==='ENG')return insert(state.mode==='CMPLX'?'i':':');
 if(key==='MUL')return insert('GCD(');
 if(key==='DIV')return insert('LCM(');
 if(key==='ADD')return insert('Int(');
 if(key==='SUB')return insert('Intg(');
 const variables={NEG:'A',DMS:'B',HYP:'C',SIN:'D',COS:'E',TAN:'F',LP:'X',RP:'Y',MPLUS:'M'};
 if(variables[key])return insert(variables[key]);
 if(key==='EXP')return insert('e');if(key==='DOT')return insert('RanInt#(');
 if(key==='ANS'){
  if(state.mode!=='COMP'){notify('PreAns requires COMP mode',true);paint();return true}
  return insert('PreAns');
 }
 if(key==='CALC')return insert('=');return null
}
function shifted(key){
 if(state.hyp&&['SIN','COS','TAN'].includes(key)){
  const map={SIN:'asinh(',COS:'acosh(',TAN:'atanh('};
  state.hyp=false;releaseModifier();insert(map[key]);return true;
 }
 const n=Number(key);
 if(key==='AC'){powerOff();return true}
 if(key==='MODE'){releaseModifier();setupMenu();return true}
 if(key==='RCL'){releaseModifier();memoryDialog(true);return true}
 if(key==='DEL'){state.insert=!state.insert;releaseModifier();notify(state.insert?'Insert mode':'Overwrite mode');paint();return true}
 if(key==='9'){clearMenu();return true}
 if(key==='7'){releaseModifier();optionDialog('Scientific constants',[
  {label:'π',action:()=>insert('pi')},{label:'e',action:()=>insert('e')},{label:'Speed of light (m/s)',action:()=>insert('299792458')},
  {label:'Gravitational constant',action:()=>insert('6.67430*10^-11')},{label:'Avogadro constant',action:()=>insert('6.02214076*10^23')}
 ]);return true}
 if(key==='8'){releaseModifier();optionDialog('Unit conversion shortcuts',[
  {label:'cm → inch',action:()=>insert('/2.54')},{label:'inch → cm',action:()=>insert('*2.54')},
  {label:'°C → °F',action:()=>insert('*9/5+32')},{label:'kg → lb',action:()=>insert('*2.2046226218')}
 ]);return true}
 if(key==='CALC'){releaseModifier();numericalFlow('SOLVE');return true}
 if(key==='INTEGRAL'){releaseModifier();numericalFlow('DERIVATIVE');return true}
 if(key==='LOGBASE'){releaseModifier();numericalFlow('SUM');return true}
 if(key==='FRAC'){releaseModifier();insertTemplate('mixed');return true}
 if(key==='SQRT'){releaseModifier();insertTemplate('cubeRoot');return true}
 if(key==='POWER'){releaseModifier();insertTemplate('nthRoot');return true}
 const insertions={RECIP:'!',SQUARE:'^3',LOG:'10^(',LN:'exp(',SIN:'asin(',COS:'acos(',TAN:'atan(',EXP:'pi',
  HYP:'abs(',NEG:'',DMS:'',SD:'',MPLUS:'',ENG:'',LP:'%',RP:',',ANS:'',MUL:'',DIV:'',ADD:'',SUB:'',DOT:''};
 if(key==='MPLUS'){accumulateMemory(-1);return true}
 if(key==='SD'){releaseModifier();toggleMixed();return true}
 if(key==='ENG'){releaseModifier();if(state.screen==='result')showEngineering(1);return true}
 if(key==='DMS'){releaseModifier();if(state.screen==='result')factorResult();return true}
 if(key==='ANS'){state.angle=state.angle==='DEG'?'RAD':state.angle==='RAD'?'GRAD':'DEG';releaseModifier();paint();return true}
 if(key==='DOT'){releaseModifier();insert('Ran#');return true}
 if(key==='0'){releaseModifier();insert('Rnd(');return true}
 if(key==='ADD'){releaseModifier();insert('Pol(');return true}
 if(key==='SUB'){releaseModifier();insert('Rec(');return true}
 if(key==='MUL'){releaseModifier();insert('nPr');return true}
 if(key==='DIV'){releaseModifier();insert('nCr');return true}
 if(key==='ADD'||key==='SUB'){releaseModifier();insert(key==='ADD'?',':',');return true}
 if(insertions[key]!==undefined){releaseModifier();if(insertions[key])insert(insertions[key]);else notify('Function requires a result or an input');paint();return true}
 if(['1','2','3','4','5','6'].includes(key)){releaseModifier();const mapped={'1':'STAT','2':'CMPLX','3':'BASE-N','4':'MATRIX','5':'VECTOR','6':'VERIF'};setMode(mapped[key]);return true}
 return false
}
function showResult(decimal,forceFraction=false){
 if(state.screen!=='result'||!Number.isFinite(state.raw))return;
 const source=state.resultSource||state.input;
 const presentation=RESULTS.calculate(state.raw,source,
  {...state,fractionStyle:state.resultFractionStyle||state.fractionStyle},{
   decimal,forceFraction,
   exactRational:state.ansRational,
   allowApproxRational:false
  });
 // S⇔D must not manufacture a fraction from a floating-point approximation.
 // A result without a supported alternative remains exactly as displayed.
 if(forceFraction&&presentation.chosen.kind==='decimal')return;
 if(!decimal&&presentation.chosen.kind==='decimal'&&presentation.decimal.text===state.result)return;
 state.resultPresentation=presentation;
 state.decimal=decimal;state.resultDMS=false;state.engShift=0;state.result=presentation.chosen.text;
 state.viewport.resultX=Math.max(0,state.result.length-23);paint();
}
function toggleFraction(){
 if(state.screen!=='result'||!Number.isFinite(state.raw)){notify('Calculate first');return}
 if(state.remainderResult||state.coordinateResult)return;
 const recurring=state.recurringDecimal&&state.ansRational?
  SPECIAL.recurringOf(state.ansRational):null;
 if(recurring){
  const kind=state.resultPresentation?.chosen?.kind;
  if(kind==='fraction'||kind==='mixed'){
   state.resultPresentation={...state.resultPresentation,chosen:recurring};
   state.result=recurring.text;state.viewport.resultX=Math.max(0,state.result.length-23);
   paint();return;
  }
  if(kind==='recurring'){
   const text=RESULTS.decimal(state.raw,state);
   state.resultPresentation={...state.resultPresentation,chosen:{kind:'decimal',text}};
   state.result=text;state.viewport.resultX=Math.max(0,text.length-23);
   paint();return;
  }
 }
 const candidate=RESULTS.calculate(state.raw,state.resultSource||state.input,
  {...state,fractionStyle:state.resultFractionStyle||state.fractionStyle},{
   exactRational:state.ansRational,forceFraction:true,allowApproxRational:false
  });
 if(candidate.chosen.kind==='decimal')return;
 const isDecimal=state.resultPresentation?.chosen?.kind==='decimal';
 showResult(!isDecimal,isDecimal);
}
function toggleMixed(){
 if(state.screen!=='result'||!Number.isFinite(state.raw)){notify('Calculate first');return}
 // SHIFT+S⇔D changes this displayed result, not the global SETUP selection.
 const current=state.resultPresentation?.chosen;
 if(!current||!['fraction','mixed'].includes(current.kind))return;
 const previous=state.resultFractionStyle||state.fractionStyle;
 const next=previous==='mixed'?'improper':'mixed';
 const candidate=RESULTS.calculate(state.raw,state.resultSource||state.input,
  {...state,fractionStyle:next},{
   exactRational:state.ansRational,forceFraction:true,allowApproxRational:false
  });
 if(!['fraction','mixed'].includes(candidate.chosen.kind))return;
 // A conversion to mixed form that exceeds CASIO's 10-character result
 // budget is unavailable. Do not fall back to an invented conversion.
 if(next==='mixed'&&candidate.chosen.kind!=='mixed')return;
 state.resultFractionStyle=next;
 showResult(false,true);
}
function showEngineering(direction=-1){
 if(state.screen!=='result'||!Number.isFinite(state.raw))return;
 const already=state.resultPresentation?.chosen?.kind==='engineering';
 // Initial ENG converts to engineering form. SHIFT+ENG initially shifts left
 // by three places. Further presses move the exponent in opposite directions.
 const nextShift=already?state.engShift+direction:(direction>0?1:0);
 const result=RESULTS.engineering(state.raw,nextShift,state);
 if(!result)return;
 state.engShift=nextShift;
 state.resultPresentation={chosen:result,natural:result,decimal:{kind:'decimal',text:RESULTS.decimal(state.raw,state)}};
 state.result=result.text;state.viewport.resultX=Math.max(0,state.result.length-23);
 state.decimal=false;releaseModifier();paint();
}
function press(key){
 // Enforce expiry even when a background tab's timer has been throttled.
 // ON is the only key allowed to wake the unit after auto-off.
 if(state.power&&inactivityExpired(lastOperationAt,Date.now(),autoOffDelay(state.model)))powerOff('automatic');
 const before={mode:state.mode,shift:state.shift,alpha:state.alpha,screen:state.screen,input:state.input};
 try{handle(key)}catch(e){error(e.message||'Math ERROR')}
 if(state.power&&key!=='ON')markOperation();
 if(state.recording){state.keylog.push({key,before,after:{mode:state.mode,screen:state.screen,result:state.result}});if(state.keylog.length>maxEntries)state.keylog.shift();if(!$('keylog-panel').hidden)renderKeylog()}
}
function handle(key){
 if(state.pendingMemory){
  if(key==='AC'){state.pendingMemory=null;releaseModifier();notify('Memory selection cancelled');paint();return}
  const name=MEMORY_KEYS[key]||(/^[A-FMXY]$/.test(key)?key:null);
  if(name){memorySelect(name);return}
  notify('Choose A-F, X, Y or M',true);paint();return;
 }
 if(key==='ON'){powerOn();return}
 if(!state.power)return;
 if(state.screen==='error'){
  if(key==='LEFT'||key==='RIGHT'){
   const target=Number.isInteger(state.errorOffset)?state.errorOffset:state.input.length;
   state.screen='edit';state.error='';state.info='';
   // Preserve the structured editor tree; place the caret exactly for linear
   // input, or retain its existing structured location when paths differ.
   if(state.editor.path.length===0&&state.editor.root.every(node=>node.type==='char')){
    state.editor.offset=Math.max(0,Math.min(state.editor.root.length,target));
   }
   syncEditor();state.errorOffset=null;state.errorSource='';
   releaseModifier();notify('Edit the calculation and press =');paint();
   return;
  }
  if(key==='AC'){
   state.editor=STRUCT.create();state.input='';state.cursor=0;
   state.error='';state.errorOffset=null;state.errorSource='';
   state.screen='edit';state.info='';
   state.viewport.inputX=0;state.viewport.inputY=0;
   releaseModifier();notify('Error cleared');paint();return;
  }
  // Error display remains until recovery or cancellation.
  return;
 }
 if(state.screen==='contrast'){
  if(key==='LEFT')state.contrast=Math.max(0,state.contrast-1);
  if(key==='RIGHT')state.contrast=Math.min(9,state.contrast+1);
  if(key==='AC'||key==='EQUAL'){state.screen='edit';state.info=''}
  paint();return;
 }
 if(state.screen==='menu'){menuHandle(key);return}
 if(state.screen==='prompt'){flowHandle(key);return}
 if(state.screen==='flow-result'){
  if(key==='UP'||key==='DOWN'){
   state.outputPage=Math.max(0,Math.min(VIEW.pageCount(state.outputLines)-1,state.outputPage+(key==='DOWN'?1:-1)));
   state.viewport.flowX=0;paint();return;
  }
  if(key==='LEFT'||key==='RIGHT'){
   const view=VIEW.scrollLine(state.outputLines,state.outputPage,state.viewport.flowX);
   state.viewport.flowX=Math.max(0,Math.min(view.max,state.viewport.flowX+(key==='RIGHT'?4:-4)));
   paint();return;
  }
  if(key==='AC'){state.screen='edit';state.outputLines=[];state.viewport.flowX=0;state.info='';paint();return}
  if(key==='MODE'){modeMenu();return}
  state.screen='edit';
 }
 if(state.factorization&&['EQUAL','ENG','DMS'].includes(key)){
  exitFactorization();return;
 }
 if(key==='SHIFT'){state.shift=!state.shift;state.alpha=false;paint();return}
 if(key==='ALPHA'){state.alpha=!state.alpha;state.shift=false;paint();return}
 if(state.shift&&['LEFT','RIGHT','UP','DOWN'].includes(key)&&['edit','result'].includes(state.screen)){
  // Panning is independent of the expression caret: SHIFT + arrows scrolls
  // the viewport only; the active mathematical field is unchanged.
  const v=state.viewport,dx=key==='RIGHT'?4:key==='LEFT'?-4:0,
      dy=key==='DOWN'?4:key==='UP'?-4:0;
  if(state.screen==='result'&&dx){
   v.resultX=Math.max(0,Math.min(Math.max(0,state.result.length-23),v.resultX+dx/4));
  }else{
   const frame=VIEW.layout(state.editor,state.screen==='result'?8:12);
   v.inputX=Math.max(0,Math.min(Math.max(0,frame.width-88),v.inputX+dx));
   const minY=Math.min(0,frame.minY-3),maxY=Math.max(0,frame.maxY-24);
   v.inputY=Math.max(minY,Math.min(maxY,v.inputY+dy));
  }
  releaseModifier();paint();return;
 }
 if(state.screen==='result'&&['LEFT','RIGHT'].includes(key)&&state.result.length>23){
  state.viewport.resultX=Math.max(0,Math.min(state.result.length-23,
    state.viewport.resultX+(key==='LEFT'?-4:4)));
  paint();return;
 }
 if(state.shift&&shifted(key))return;
 if(state.alpha){state.alpha=false;if(alphaKey(key)!==null)return}
 if(key==='MODE'){releaseModifier();modeMenu();return}
  if(key.startsWith('TEXT:')&&state.mode==='CMPLX'&&/^[A-Za-z]$/.test(key.slice(5))){insert(key.slice(5));return}
 if(key==='AC'){clearReplay();state.pendingMemory=null;state.factorization=null;state.multiStatements=null;state.remainderResult=null;state.editor=STRUCT.create();state.viewport={inputX:0,inputY:0,resultX:0,flowX:0};state.input='';state.cursor=0;state.screen='edit';state.result='';state.error='';state.errorOffset=null;state.errorSource='';state.info='';releaseModifier();notify('Cleared input');paint();return}
 if(key==='DEL'){
  if(state.screen==='error'){state.screen='edit';state.error=''}
  if(state.screen==='result')state.screen='edit';
  STRUCT.backspace(state.editor);syncEditor();releaseModifier();paint();return;
 }
 if(key==='LEFT'||key==='RIGHT'){clearReplay();if(state.screen==='result'){state.screen='edit'}STRUCT.navigate(state.editor,key);syncEditor();paint();return}
 if(key==='UP'||key==='DOWN'){if(!state.storedInputs.length&&state.screen==='edit'&&STRUCT.navigate(state.editor,key)){syncEditor();paint();return}replayHistory(key);return}
 if(key==='EQUAL'){clearReplay();if(state.mode!=='COMP'&&state.mode!=='CMPLX'){advancedMode(state.mode);return}if(state.screen==='result'&&advanceStatements())return;evaluate();return}
 if(key==='RCL'){memoryDialog(false);return}
 if(key==='MPLUS'){accumulateMemory(1);return}
 if(key==='SD'){if(state.mode==='CMPLX')return;toggleFraction();return}
 if(key==='CALC'){fieldForm('CALC — substitute a variable',[{id:'variable',label:'Variable name (A-F, X, Y)',value:'X'},{id:'value',label:'Value for variable',value:'2'}],d=>{
  const k=String(d.variable).trim().toUpperCase();
  if(!Object.prototype.hasOwnProperty.call(state.memory,k))throw Error('Variable ERROR');
  const v=M.evaluate(String(d.value),{...state,memory:state.memory,ans:state.ans,preAns:state.preAns});
  if(!Number.isFinite(v))throw Error('Math ERROR');
  const memory={...state.memory,[k]:v};
  const result=M.evaluate(state.input,{...state,memory,ans:state.ans,preAns:state.preAns});
  if(!Number.isFinite(result))throw Error('Math ERROR');
  state.memory[k]=v;
  applyAdvancedResult(result,state.input);
  return M.format(result,state);
 });return}
 if(key==='INTEGRAL'){numericalFlow('INTEGRAL');return}
 if(key==='LOGBASE'){insertTemplate('logBase');return}
 if(key==='ENG'){if(state.mode==='CMPLX'){insert('i');return}if(state.screen==='result'){showEngineering(-1);return}notify('Calculate first');paint();return}
 if(key==='DMS'){
  if(state.screen==='result'){toggleDMS();return}
  const separator=window.FreshSexagesimal.nextSeparator(state.input);
  if(!separator){notify('Enter degrees, minutes, then seconds',true);paint();return}
  insert(separator);return;
 }
 if(key==='HYP'){state.hyp=!state.hyp;notify(state.hyp?'Hyperbolic trig selected':'Ordinary trig selected');paint();return}
 if(key==='COMMA'){insert(',');return}
 if(key==='NEG'){insert('-');return}
 const funcs={SIN:'sin(',COS:'cos(',TAN:'tan(',SQRT:'sqrt(',LOG:'log(',LN:'ln('};
 if(key==='FRAC'){insertTemplate('fraction');return}
 if(key==='POWER'){insertTemplate('power');return}
 if(key==='SQRT'&&!state.hyp){insertTemplate('squareRoot');return}
 if(funcs[key]){const text=state.hyp?{SIN:'sinh(',COS:'cosh(',TAN:'tanh('}[key]||funcs[key]:funcs[key];state.hyp=false;insert(text);return}
 if(key==='EXP'){
  // Natural input presents a dedicated ×10^ field. Its serial form is the
  // exponent literal E, not Euler's constant e (ALPHA + EXP).
  const root=state.editor.path.length?null:state.editor.root;
  const before=root&&root[state.editor.offset-1];
  const isMantissa=before?.type==='char'&&/[0-9]/.test(before.value);
  if(!isMantissa){notify('Enter a mantissa before ×10^',true);paint();return}
  insertTemplate('exp10');return;
 }
 const ops={MUL:'*',DIV:'/',ADD:'+',SUB:'-',LP:'(',RP:')',DOT:'.',RECIP:'^(-1)',SQUARE:'^2',ANS:'Ans'};
 if(Object.prototype.hasOwnProperty.call(ops,key)){insert(ops[key]);return}
 if(/^\d$/.test(key)){insert(key);return}
 notify('This key is not available in the current state',true);paint();
}
// REA-019: KeyLog selection is a view-only teaching aid: selecting and
// copying displayed keys must never re-dispatch a calculator key.
const Teaching=window.FreshTeachingTools;
if(!Teaching)throw Error('Missing view-only KeyLog/capture module');
const keylogView={selected:new Set(),anchor:-1,size:19};
function keylogSelectionClear(){keylogView.selected.clear();keylogView.anchor=-1}
function renderKeylog(){
 const list=$('keylog-list');list.textContent='';
 const formatted=Teaching.formattedEntries(state.keylog);
 const fragment=document.createDocumentFragment();
 for(const item of formatted){
  const li=document.createElement('li');
  li.dataset.index=String(item.index);
  const button=document.createElement('button');
  button.type='button';button.className='keylog-entry';
  button.dataset.index=String(item.index);
  button.textContent=item.display;
  button.setAttribute('aria-pressed',String(keylogView.selected.has(item.index)));
  button.setAttribute('aria-label','Select key '+(item.index+1)+': '+item.display);
  button.addEventListener('click',event=>{
   if(event.shiftKey&&keylogView.anchor>=0){
    if(!event.ctrlKey&&!event.metaKey)keylogView.selected.clear();
    const from=Math.min(keylogView.anchor,item.index),to=Math.max(keylogView.anchor,item.index);
    for(let i=from;i<=to;i++)keylogView.selected.add(i);
   }else if(event.ctrlKey||event.metaKey){
    if(keylogView.selected.has(item.index))keylogView.selected.delete(item.index);
    else keylogView.selected.add(item.index);
    keylogView.anchor=item.index;
   }else{
    keylogView.selected.clear();keylogView.selected.add(item.index);
    keylogView.anchor=item.index;
   }
   renderKeylog();
  });
  li.append(button);fragment.append(li);
 }
 list.append(fragment);
 list.style.setProperty('--keylog-size',keylogView.size+'px');
 for(const i of keylogView.selected){
  const b=list.querySelector('button[data-index="'+i+'"]');
  if(b)b.setAttribute('aria-pressed','true');
 }
 $('keylog-count').textContent=(state.recording?'Recording on':'Recording off')+
  ' — '+state.keylog.length+' / '+maxEntries+' entries · '+keylogView.selected.size+' selected';
 $('record-keylog').textContent=state.recording?'Stop recording':'Start recording';
}
function selectedKeyTrace(){
 return Teaching.trace(state.keylog,[...keylogView.selected]);
}
async function copySelectedKeys(){
 if(!keylogView.selected.size){notify('Select KeyLog keys first',true);return}
 const text=selectedKeyTrace();
 try{
  if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
  await navigator.clipboard.writeText(text);
  notify('Copied '+keylogView.selected.size+' selected keys');
 }catch{notify('Clipboard unavailable; use Export JSON',true)}
}
function captureOptions(){
 return Teaching.captureConfig({zoom:Number($('capture-zoom').value),frame:$('capture-frame').checked});
}
function captureCanvas(){
 return Teaching.createImage($('lcd'),captureOptions());
}
function downloadCapture(){
 try{const canvas=captureCanvas();
  canvas.toBlob(blob=>{
   if(blob)download('independent-calculator-lcd.png',blob,'image/png');
   else notify('Screen capture failed',true);
  },'image/png');
 }catch(err){notify('Screen capture failed: '+err.message,true)}
}
async function copyCapture(){
 try{
  if(!navigator.clipboard?.write||typeof ClipboardItem==='undefined')throw Error('Clipboard API unavailable');
  const canvas=captureCanvas();
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  if(!blob)throw Error('Image rendering failed');
  await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
  notify('LCD image copied to clipboard');
 }catch{notify('Clipboard permission denied; use Save LCD instead',true)}
}
function download(name,content,type){const blob=content instanceof Blob?content:new Blob([content],{type});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}
function runChecks(){const checks=[
 ['precedence',()=>M.evaluate('2+3*4')===14],['power precedence',()=>M.evaluate('-2^2')===-4],['right-associative powers',()=>M.evaluate('2^3^2')===512],
 ['fraction',()=>M.evaluate('1/3+1/6')===.5],['degrees',()=>Math.abs(M.evaluate('sin(30)',{angle:'DEG'})-.5)<1e-12],
 ['radians',()=>Math.abs(M.evaluate('sin(pi/2)',{angle:'RAD'})-1)<1e-12],['combinations',()=>M.evaluate('5nCr2')===10],
 ['factorial',()=>M.evaluate('5!')===120],['negative roots rejected',()=>{try{M.evaluate('sqrt(-1)');return false}catch{return true}}],
 ['implicit multiplication',()=>Math.abs(M.evaluate('2pi')-2*Math.PI)<1e-12],['variables',()=>M.evaluate('X^2',{memory:{X:3}})===9],
 ['quadratic roots',()=>M.quadratic(1,-3,2).length===2],['matrix solve',()=>M.matrixSolve([[2,1,5],[1,-1,1]]).every(Number.isFinite)],
 ['numerical derivative',()=>Math.abs(M.derivative(x=>x*x,2)-4)<1e-9],['numerical integral',()=>Math.abs(M.integrate(x=>x*x,0,1)-1/3)<1e-9],
 ['physical keys',()=>K.keys.length===50],['degree postfix',()=>Math.abs(M.evaluate('sin(30°)',{angle:'RAD'})-.5)<1e-12],['LCD buffer',()=>LCD.rasterize(state).length===96*31],
  // REA-042: independent M arithmetic and annunciator are model-state driven.
  ['M+ accumulation',()=>memorySum(0,50,1)===50],
  ['M- accumulation',()=>memorySum(50,15,-1)===35],
  ['M zero crossing',()=>memorySum(15,15,-1)===0],
  ['M overflow rejected',()=>{try{memorySum(9e99,9e99,1);return false}catch{return true}}],
  ['M indicator',()=>window.FreshIndicators.derive({...state,power:true,memory:{...state.memory,M:35}}).memory==='M'&&
    window.FreshIndicators.derive({...state,power:true,memory:{...state.memory,M:0}}).memory===''],
  ['APO all profiles 10min',()=>Object.keys(MODELS.profiles).every(id=>autoOffDelay(id)===600000)],
  ['APO deadline boundaries',()=>!inactivityExpired(1000,600999,600000)&&inactivityExpired(1000,601000,600000)],
  ['APO clock rollback',()=>!inactivityExpired(600000,599999,600000)],
  ['battery state is explicitly simulated',()=>['normal','low'].includes(state.batterySimulation)],
  ['complex product',()=>{const z=COMPLEX.evaluate('(2+3i)*(4-5i)');return z.re===23&&z.im===2}],
  ['complex power',()=>{const z=COMPLEX.evaluate('(1+i)^2');return Math.abs(z.re)<1e-12&&z.im===2}],
  ['complex conjugate',()=>COMPLEX.evaluate('conj(2+3i)').im===-3],
  ['complex magnitude',()=>COMPLEX.evaluate('abs(3+4i)').re===5],
  ['complex argument',()=>COMPLEX.evaluate('arg(i)',{angle:'DEG'}).re===90],
  ['complex Ans/register',()=>{const z=COMPLEX.evaluate('Ans+A',{ans:{re:2,im:3},memory:{A:{re:4,im:-1}}});return z.re===6&&z.im===2}],
  ['complex i squared',()=>COMPLEX.evaluate('i^2').re===-1],
  ['complex zero division',()=>{try{COMPLEX.evaluate('1/(i-i)');return false}catch{return true}}],
  ['complex polar',()=>COMPLEX.format({re:0,im:1},'DEG','polar').includes('∠90')]
 ];const results=checks.map(([label,fn])=>{try{return {label,pass:!!fn()}}catch(e){return {label,pass:false,error:e.message}}});const passed=results.filter(x=>x.pass).length;
 const el=$('test-result');el.className='test-result '+(passed===checks.length?'good':'bad');el.textContent=passed+'/'+checks.length+' tests passed'+(passed===checks.length?'':': '+results.filter(x=>!x.pass).map(x=>x.label).join(', '));return results}
function captureKeyboardLCD(){
 if(!navigator.clipboard?.write||typeof ClipboardItem==='undefined')return false;
 // Initiated by a real Ctrl+C/Insert user gesture. Actual clipboard success
 // is reported only after the browser resolves the write permission.
 copyCapture();return true;
}
function keyboard(event){
 window.FreshKeyboard.dispatch(event,state,press,captureKeyboardLCD);
}
K.mount($('keys'),press);
$('model-selector').value=state.model;
$('model-selector').addEventListener('change',e=>setModel(e.target.value));
$('run-checks').addEventListener('click',runChecks);
$('enlarge').addEventListener('click',()=>{$('lcd-panel').hidden=!$('lcd-panel').hidden;paint()});
$('capture').addEventListener('click',downloadCapture);
$('copy-lcd').addEventListener('click',copyCapture);
$('capture-options-toggle').addEventListener('click',()=>{
 const panel=$('capture-options');panel.hidden=!panel.hidden;
 $('capture-options-toggle').setAttribute('aria-expanded',String(!panel.hidden));
});
$('keylog-toggle').addEventListener('click',()=>{
 $('keylog-panel').hidden=!$('keylog-panel').hidden;renderKeylog();
});
$('record-keylog').addEventListener('click',()=>{state.recording=!state.recording;renderKeylog()});
$('keylog-select-all').addEventListener('click',()=>{
 keylogView.selected=new Set(state.keylog.map((_,i)=>i));
 keylogView.anchor=state.keylog.length-1;renderKeylog();
});
$('keylog-copy').addEventListener('click',copySelectedKeys);
$('keylog-decrease').addEventListener('click',()=>{
 keylogView.size=Math.max(12,keylogView.size-2);renderKeylog();
});
$('keylog-increase').addEventListener('click',()=>{
 keylogView.size=Math.min(36,keylogView.size+2);renderKeylog();
});
$('clear-keylog').addEventListener('click',()=>{
 state.keylog=[];keylogSelectionClear();renderKeylog();
});
$('export-keylog').addEventListener('click',()=>download('independent-calculator-keylog.json',
 JSON.stringify({schema:'fresh-calculator-keylog-v2',entries:state.keylog,
  selectedIndices:[...keylogView.selected].sort((a,b)=>a-b),
  formattedTrace:selectedKeyTrace()},null,2),'application/json'));
document.addEventListener('keydown',keyboard);
// Background tabs can throttle timers: recheck elapsed wall time on return.
document.addEventListener('visibilitychange',()=>{if(state.power)checkInactivity()});
markOperation();
paint();
window.FreshCalculator=Object.freeze({press,runChecks,loadExpression,setModel,modelProfiles:MODELS.profiles,setSimulatedBattery,getStructured:()=>structuredClone(state.editor),getState:()=>{const {menuEntries,flow,...snapshot}=state;return structuredClone({...snapshot,flow:flow?{title:flow.title,index:flow.index,buffer:flow.buffer,cursor:flow.cursor??flow.buffer.length,editing:flow.editing,fieldId:flow.fields[flow.index]?.id,fieldCount:flow.fields.length,values:{...flow.values}}:null,menuEntries:menuEntries.map(x=>x.label)})}});
})();
