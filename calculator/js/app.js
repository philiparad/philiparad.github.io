/* A new, independent browser calculator controller. No imported project code. */
(function(){'use strict';
const COORD=window.FreshCoordinates;
if(!COORD)throw Error('Missing coordinate conversion module');
const FACT=window.FreshFactorization;
if(!FACT)throw Error('Missing prime-factorization module');
const SPECIAL=window.FreshSpecial;
if(!SPECIAL)throw Error('Missing special arithmetic module');
const CALCS=window.FreshCalcSubstitution;
if(!CALCS)throw Error('Missing CALC substitution module');
const SOLVES=window.FreshSolveSession;
if(!SOLVES)throw Error('Missing SOLVE session module');
const INLINE=window.FreshInlineCalculus;
if(!INLINE)throw Error('Missing inline calculus module');
const MENUS=window.FreshMenuModel;
if(!MENUS)throw Error('Missing model-specific CASIO menu rules');
const M=window.FreshMath, STAT=window.FreshStatEditor, REG=window.FreshStatRegression, BASE=window.FreshBaseN, EQN=window.FreshEquation, INEQ=window.FreshInequality, INEQDISPLAY=window.FreshInequalityDisplay, VERIFY=window.FreshVerify, DIST=window.FreshDistribution, DISTLIST=window.FreshDistList, CONST=window.FreshScientificConstants, CONV=window.FreshConversions, EQEDIT=window.FreshEquationEditor, EQEX=window.FreshEquationExact, MATRIX=window.FreshMatrixRegisters, VECTOR=window.FreshVectorRegisters, TABLE=window.FreshTable, COMPLEX=window.FreshComplex, K=window.FreshKeypad, LCD=window.FreshLCD, MODELS=window.FreshModels, STRUCT=window.FreshStructured, RESULTS=window.FreshResults, SETUP=window.FreshSetup, VIEW=window.FreshViewport, ERRORS=window.FreshErrors;
const LEGENDS=window.FreshLegendAudit;
const STATN=window.FreshStatNormal;
if(!STATN)throw Error('Missing STAT standard normal module');
const STATPARAM=window.FreshStatParameters;
if(!STATPARAM)throw Error('Missing STAT parameter module');
if(!LEGENDS)throw Error('Missing modifier legend audit module');
if(!ERRORS)throw Error('Missing calculator error handling module');
if(!COMPLEX)throw Error('Missing complex expression module');
if(!STAT)throw Error('Missing STAT table editor');
if(!REG)throw Error('Missing STAT regression engine');
if(!BASE)throw Error('Missing BASE-N integer engine');
if(!EQN)throw Error('Missing EQN solving engine');
if(!INEQ)throw Error('Missing INEQ interval solver');
if(!INEQDISPLAY)throw Error('Missing INEQ result display module');
if(!VERIFY)throw Error('Missing chained VERIFY module');
if(!DIST)throw Error('Missing seven-type DIST calculation module');
if(!DISTLIST)throw Error('Missing DIST List data editor');
if(!CONST)throw Error('Missing model scientific-constants catalog');
if(!CONV)throw Error('Missing metric conversion catalog');
if(!EQEDIT)throw Error('Missing EQN coefficient editor');
if(!EQEX)throw Error('Missing EQN exact-output formatter');
if(!MATRIX)throw Error('Missing MATRIX registers module');
if(!VECTOR)throw Error('Missing VECTOR registers module');
if(!TABLE)throw Error('Missing TABLE model');
if(!VIEW)throw Error('Missing two-dimensional LCD viewport');
if(!SETUP)throw Error('Missing model-specific SETUP menu');
if(!RESULTS)throw Error('Missing natural-result formatter');
if(!STRUCT)throw Error('Structured textbook editor unavailable');
if(!MODELS)throw Error('Missing CASIO model profile definitions');
const $=(id)=>document.getElementById(id);
const requestedModel=new URLSearchParams(location.search).get('model');
const initialModel=MODELS.profiles[requestedModel]?requestedModel:MODELS.defaultModel;
const modeNames=MODELS.get(initialModel).modes;
const state={power:true,model:initialModel,mode:'COMP',editor:STRUCT.create(),viewport:{inputX:0,inputY:0,resultX:0,flowX:0},resultPresentation:null,pendingMemory:null,factorization:null,coordinateResult:null,resultDMS:false,multiStatements:null,remainderResult:null,resultFractionStyle:null,ansRational:null,preAnsRational:null,...SETUP.defaults,engShift:0,shift:false,alpha:false,hyp:false,captureTemplate:false,calcSession:null,solveSession:null,input:'',cursor:0,
 screen:'edit',result:'',raw:0,ans:0,preAns:0,history:[],memory:{A:0,B:0,C:0,D:0,E:0,F:0,M:0,X:0,Y:0},complexAns:{re:0,im:0},complexMemory:{},complexResultLines:[],complexDisplayFormat:null,
 matrices:MATRIX.store(),matrixEditor:null,matrixView:null,matrixParameter:null,vectors:VECTOR.store(),vectorEditor:null,vectorView:null,vectorParameter:null,vectorScalarInfo:null,statTable:null,tableData:null,tableDraft:null,distType:null,distDraft:null,distList:null,distListParams:null,constantCode:null,conversionCode:null,eqnSession:null,eqnEditor:null,ineqEditor:null,ineqSession:null,baseRadix:'DEC',baseValue:0,insert:true,error:'',errorOffset:null,errorSource:'',info:'',menu:[],menuTitle:'',menuEntries:[],menuPage:0,flow:null,outputLines:[],outputPage:0,decimal:false,recording:false,keylog:[],storedInputs:[],replayDraft:null,batterySimulation:'normal',powerOffReason:null};
// REA-068: numerical calculations run away from the UI thread.
let numericJob=null;
const NUMERIC_WALL_MS=6000;
function cancelNumeric(){
 if(!numericJob)return false;
 const job=numericJob;numericJob=null;
 clearTimeout(job.timer);job.worker.terminate();
 job.reject(Error('Cancelled'));return true;
}
function runNumeric(kind,data){
 if(typeof Worker!=='function')return Promise.reject(Error('Worker unavailable'));
 cancelNumeric();
 return new Promise((resolve,reject)=>{
  const worker=new Worker('js/numeric-worker.js');
  const job={worker,reject,timer:null};numericJob=job;
  const finish=(err,value)=>{
   if(numericJob!==job)return;
   numericJob=null;clearTimeout(job.timer);worker.terminate();
   if(err)reject(Error(err));else resolve(value);
  };
  worker.onmessage=e=>{
   const result=e.data||{};
   if(result.ok)finish(null,result);else finish(result.error||'Math ERROR');
  };
  worker.onerror=()=>finish('Math ERROR');
  job.timer=setTimeout(()=>finish('Time Out'),NUMERIC_WALL_MS);
  try{worker.postMessage({id:1,task:{kind,data,settings:{
   model:state.model,angle:state.angle,format:state.format,digits:state.digits,math:state.math,
   ans:state.ans,preAns:state.preAns,memory:{...state.memory,...(data.memory||{})}
  }}})}catch(e){finish('Argument ERROR')}
 });
}
const registerAllowed=name=>MODELS.hasRegister(state.model,name);
const registerNames=()=>MODELS.registers(state.model).join(', ');
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
 K.applyContext($('keys'),state,LEGENDS,MODELS);
 LCD.draw($('lcd'),state);
 // REA-016: derive all annunciators from current state, including
 // STO/RCL standby and history/menu replay cues.
 const flags=window.FreshIndicators.render(state,$);
 if(!$('lcd-panel').hidden){const ctx=$('lcd-large').getContext('2d');if(ctx){ctx.imageSmoothingEnabled=false;ctx.drawImage($('lcd'),0,0,$('lcd-large').width,$('lcd-large').height)}}
 $('lcd').setAttribute('aria-label',state.screen==='menu'?'LCD menu '+state.menuTitle+', page '+(state.menuPage+1)+', '+state.menu.map(x=>x.number+' '+x.label).join('; '):state.screen==='prompt'?'LCD prompt '+state.flow.title+', '+(state.flow.index+1)+' of '+state.flow.fields.length+', '+state.flow.fields[state.flow.index].label+' equals '+state.flow.buffer:state.screen==='flow-result'?'LCD result '+state.outputLines.join('; '):state.screen==='matrix-table'&&state.matrixEditor?'MATRIX editor '+state.matrixEditor.name+', '+state.matrixEditor.matrix.rows+' by '+state.matrixEditor.matrix.cols+', selected row '+(state.matrixEditor.row+1)+' column '+(state.matrixEditor.col+1)+' value '+state.matrixEditor.buffer:state.screen==='matrix-result'&&state.matrixView?'MATRIX '+state.matrixView.name+' result, '+state.matrixView.matrix.rows+' by '+state.matrixView.matrix.cols+', value '+state.matrixView.matrix.data[state.matrixView.row][state.matrixView.col]:state.screen==='conversion-code'&&state.conversionCode?'CONV code '+state.conversionCode.buffer+' of 01 to 40':state.screen==='constant-code'&&state.constantCode?'Scientific constant code '+state.constantCode.buffer+' of 01 through 40':state.screen==='dist-list'&&state.distList?'DIST List row '+(state.distList.row+1)+' of '+state.distList.samples.length+', '+(state.distList.column===0?'X':'Ans')+', value '+DISTLIST.format(DISTLIST.active(state.distList)):state.screen==='table-grid'&&state.tableData?'TABLE row '+(state.tableData.row+1)+' of '+state.tableData.rows.length+', column '+state.tableData.columns[state.tableData.col]+', value '+TABLE.format(TABLE.active(state.tableData)):state.screen==='vector-parameter'&&state.vectorParameter?'VECTOR scalar parameter for '+state.vectorParameter.name+', value '+state.vectorParameter.buffer+(state.vectorParameter.error?', '+state.vectorParameter.error:''):state.screen==='vector-scalar'?'VECTOR scalar result '+state.result+', '+(state.vectorScalarInfo||''):state.screen==='vector-table'&&state.vectorEditor?'VECTOR editor '+state.vectorEditor.name+', '+state.vectorEditor.vector.dimension+' dimensions, component '+(state.vectorEditor.index+1)+' value '+state.vectorEditor.buffer:state.screen==='vector-result'&&state.vectorView?'VECTOR '+state.vectorView.name+' result, component '+(state.vectorView.index+1)+' value '+state.vectorView.vector.data[state.vectorView.index]:state.screen==='ineq-coeff'&&state.ineqEditor?'INEQ '+state.ineqEditor.degree+' '+state.ineqEditor.operator+' zero, coefficient '+EQEDIT.current(state.ineqEditor.coefficients)+' equals '+state.ineqEditor.coefficients.buffer+', position '+(state.ineqEditor.coefficients.col+1):state.screen==='ineq-result'&&state.ineqSession?'INEQ result '+(state.ineqSession.index+1)+' of '+state.ineqSession.pages.length+', '+state.ineqSession.pages[state.ineqSession.index].text:state.screen==='eqn-coeff'&&state.eqnEditor?'EQN coefficient editor, '+state.eqnEditor.type+', selected '+EQEDIT.current(state.eqnEditor)+' equals '+state.eqnEditor.buffer+', row '+(state.eqnEditor.row+1)+', column '+(state.eqnEditor.col+1):state.screen==='eqn-result'&&state.eqnSession?'EQN result '+(state.eqnSession.index+1)+' of '+state.eqnSession.solutions.length+', '+state.result:state.screen==='stat-table'&&state.statTable?'STAT data table row '+(state.statTable.row+1)+' of '+state.statTable.rows.length+', '+STAT.active(state.statTable)+' equals '+state.statTable.buffer+', '+(state.statTable.paired?'paired data':'one variable')+', frequency '+(state.statTable.frequency?'on':'off'):state.screen==='error'?'LCD error '+state.error+', press left or right to correct, or AC to cancel':'Calculator '+state.mode+', '+state.angle+', expression '+state.input+', result '+state.result);
 const faceIds={'fx-991es':'fx-991ES','fx-991es-plus':'fx-991ES PLUS','fx-991es-plus-c':'fx-991ES PLUS C'};
 const face=$('face');
 face.dataset.model=state.model;
 document.querySelector('.case-model-id').textContent=faceIds[state.model];
 document.querySelector('.case-model-series').textContent=state.model==='fx-991es'?'NATURAL DISPLAY':'NATURAL-V.P.A.M.';
 document.querySelector('.edition-mark').textContent=state.model==='fx-991es'?'TWO WAY POWER':'2nd edition';
 $('model-label').textContent=MODELS.get(state.model).label;
 $('mode-label').textContent=state.mode==='BASE-N'?'BASE-N '+state.baseRadix:state.mode;$('angle-label').textContent=state.angle;$('format-label').textContent=state.format==='Fix'||state.format==='Sci'?state.format+' '+state.digits:state.format;
 $('memory-label').textContent='M = '+(state.mode==='CMPLX'&&state.complexMemory.M?COMPLEX.format(state.complexMemory.M,state.angle,state.complexFormat):M.format(state.memory.M,{...state,math:false}));
 $('expression-text').textContent=state.screen==='conversion-code'?'CONV 01-40: '+state.conversionCode.buffer:state.screen==='constant-code'?'CONST 01-40: '+state.constantCode.buffer:state.screen==='dist-list'&&state.distList?'DIST List '+state.distList.type+' X['+(state.distList.row+1)+']':state.screen==='table-grid'&&state.tableData?'TABLE '+state.tableData.columns[state.tableData.col]+' ('+(state.tableData.row+1)+'/'+state.tableData.rows.length+')':state.screen==='vector-table'&&state.vectorEditor?'VECTOR '+state.vectorEditor.name+' ['+(state.vectorEditor.index+1)+'] = '+state.vectorEditor.buffer:state.screen==='vector-result'&&state.vectorView?'VECTOR '+state.vectorView.name:state.screen==='ineq-coeff'&&state.ineqEditor?'INEQ '+state.ineqEditor.degree+' '+state.ineqEditor.operator+' '+EQEDIT.current(state.ineqEditor.coefficients)+' = '+state.ineqEditor.coefficients.buffer:state.screen==='ineq-result'&&state.ineqSession?'INEQ '+state.ineqSession.degree+' '+state.ineqSession.operator+' 0':state.screen==='eqn-coeff'&&state.eqnEditor?'EQN '+EQEDIT.current(state.eqnEditor)+' = '+state.eqnEditor.buffer:state.screen==='eqn-result'&&state.eqnSession?'EQN '+state.eqnSession.type:state.screen==='stat-table'&&state.statTable?'STAT row '+(state.statTable.row+1)+' '+STAT.active(state.statTable)+' = '+state.statTable.buffer:state.screen==='prompt'?state.flow.fields[state.flow.index].label+' = '+state.flow.buffer:state.screen==='menu'?state.menuTitle:state.input||'Ready';$('answer-text').textContent=state.screen==='dist-list'&&state.distList?(state.distList.error||DISTLIST.format(DISTLIST.active(state.distList))):state.screen==='table-grid'&&state.tableData?TABLE.detail(state.tableData):state.screen==='flow-result'?state.outputLines.slice(state.outputPage*3,state.outputPage*3+3).join(' / '):state.result||'0';
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
function setComplexResult(value,source,formatOverride=null){
 const z=COMPLEX.value(value);
 state.complexAns=z;state.raw=z.im===0?z.re:NaN;state.resultSource=source;
 state.ansRational=null;state.resultFractionStyle=null;state.remainderResult=null;
 state.factorization=null;state.coordinateResult=null;state.decimal=false;
 const style=formatOverride||state.complexFormat;
 const text=COMPLEX.format(z,state.angle,style);
 state.complexDisplayFormat=style;
 // CASIO LineIO presents rectangular parts (or polar r and θ) on two lines.
 state.complexResultLines=state.math?[]:COMPLEX.components(z,state.angle,style);
 const item={kind:'complex',text,style};
 state.resultPresentation={chosen:item,natural:item,decimal:item};
 state.result=text;state.viewport.resultX=Math.max(0,text.length-23);
 state.screen='result';state.error='';state.errorOffset=null;state.errorSource='';
 state.history.unshift({source,value:z,mode:'CMPLX',angle:state.angle});
 if(state.history.length>80)state.history.pop();clearReplay();
 notify('Complex calculation completed');paint();
}
function evaluateSegment(source){
 if(state.mode==='CMPLX'){
  const command=COMPLEX.splitDisplayCommand(source);
  const z=COMPLEX.evaluate(command.expression,{angle:state.angle,ans:state.complexAns,
   memory:{...state.memory,...state.complexMemory},model:state.model});
  setComplexResult(z,source,command.format);return;
 }
 const parsed=COORD.parse(source);
 if(parsed){
  const coordinate=COORD.evaluate(source,state,
   (part,opts)=>M.evaluate(part,{...opts,ans:state.ans,preAns:state.preAns,memory:state.memory}));
  // Compute the entire pair before modifying memory or Ans.
  setResult(coordinate.first,source,null);
  state.memory.X=coordinate.first;delete state.complexMemory.X;
  state.memory.Y=coordinate.second;delete state.complexMemory.Y;
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
 let value=Number.isFinite(exactValue)&&Math.abs(exactValue)<=9.999999999e99?
  exactValue:M.evaluate(expression,{...state,ans:state.ans,preAns:state.preAns,memory:state.memory});
 // REA-075: the exact-rational fast path must obey the same documented
 // numeric range floor as base-10 arithmetic; discard out-of-range metadata.
 if(value!==0&&Number.isFinite(value)&&Math.abs(value)<1e-99){
  value=0;exactRational=null;
 }
 // A radical expression may cancel to an exact rational, even though the
 // rational-only parser cannot parse sqrt(...). Retain exact provenance.
 if(!exactRational&&window.FreshExactSymbolic&&state.mode==='COMP')
  exactRational=window.FreshExactSymbolic.rational(expression,value);
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
 const calculus=INLINE.parse(source);
 if(calculus){executeInlineCalculus(calculus);return}
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
 const hasInlineCalculus=state.editor.root.some(n=>['derivative','integral','summation'].includes(n.type));
 if(state.editor.root.some(n=>n.type!=='char')&&(state.math||hasInlineCalculus)){
  const position=VIEW.follow(state.editor,{x:state.viewport.inputX,y:state.viewport.inputY},12,!state.math);
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
 state.calcSession=null;
 if(state.screen!=='edit'){state.complexResultLines=[];state.complexDisplayFormat=null}
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
 if(state.captureTemplate){
  state.captureTemplate=false;
  if(!STRUCT.incorporate(state.editor,type)){
   releaseModifier();notify('INS: move the caret before an operand, then select a template',true);paint();
   return;
  }
 }else STRUCT.template(state.editor,type,!state.insert);
 syncEditor();releaseModifier();notify('Use arrow keys to move between placeholders');paint();
}
function loadExpression(text){
 clearReplay();state.captureTemplate=false;state.calcSession=null;state.solveSession=null;
 state.editor=STRUCT.fromString(text);
 syncEditor();state.screen='edit';state.result='';state.factorization=null;state.coordinateResult=null;state.multiStatements=null;state.remainderResult=null;state.error='';state.errorOffset=null;state.errorSource='';releaseModifier();paint();
}
function reset(mode='all'){
 state.complexResultLines=[];state.complexDisplayFormat=null;state.statTable=null;state.tableData=null;state.tableDraft=null;state.distType=null;state.distDraft=null;state.distList=null;state.distListParams=null;state.constantCode=null;state.conversionCode=null;state.eqnSession=null;state.eqnEditor=null;state.ineqEditor=null;state.ineqSession=null;state.matrixEditor=null;state.matrixView=null;state.matrixParameter=null;state.vectorEditor=null;state.vectorView=null;state.vectorParameter=null;state.vectorScalarInfo=null;
 clearReplay();
 state.menuEntries=[];state.menuPageSize=6;state.menuKind='normal';state.menuReturnScreen='edit';state.flow=null;state.menu=[];state.outputLines=[];state.viewport={inputX:0,inputY:0,resultX:0,flowX:0};state.resultPresentation=null;state.factorization=null;state.coordinateResult=null;state.resultDMS=false;state.multiStatements=null;state.remainderResult=null;state.resultFractionStyle=null;state.resultSource='';state.engShift=0;state.ansRational=null;state.preAnsRational=null;state.editor=STRUCT.create();state.input='';state.cursor=0;state.result='';state.ans=0;state.preAns=0;state.raw=0;state.screen='edit';state.error='';state.errorOffset=null;state.errorSource='';state.decimal=false;state.hyp=false;state.insert=true;state.captureTemplate=false;state.calcSession=null;state.solveSession=null;releaseModifier();
 if(mode==='all'){state.mode='COMP';state.baseRadix='DEC';state.baseValue=0;Object.assign(state,SETUP.defaults);state.memory=Object.fromEntries(Object.keys(state.memory).map(k=>[k,0]));state.complexMemory={};state.complexAns={re:0,im:0};state.history=[];state.matrices=MATRIX.store();state.vectors=VECTOR.store();state.power=true}
 notify('Calculator reset');paint()
}
// REA-043: memory and settings persist across an ordinary OFF/ON cycle.
function clearTransientDisplay(){
 state.complexResultLines=[];state.complexDisplayFormat=null;
 state.pendingMemory=null;state.flow=null;state.menuEntries=[];state.menu=[];
 state.menuTitle='';state.menuPage=0;state.outputLines=[];state.outputPage=0;
 state.factorization=null;state.coordinateResult=null;state.multiStatements=null;
 state.remainderResult=null;state.resultPresentation=null;state.resultSource='';
 state.resultDMS=false;state.error='';state.errorOffset=null;state.errorSource='';
 state.info='';state.screen='edit';state.result='';state.editor=STRUCT.create();
 state.input='';state.cursor=0;state.viewport={inputX:0,inputY:0,resultX:0,flowX:0};
 state.hyp=false;state.captureTemplate=false;state.calcSession=null;state.solveSession=null;releaseModifier();clearReplay();
}
function clearSetup(){
 // CLR 1: setup defaults and calculation history, but no change to memory.
 Object.assign(state,SETUP.defaults);state.history=[];
 clearTransientDisplay();state.engShift=0;state.decimal=false;
 state.resultFractionStyle=null;notify('Setup initialized');paint();
}
function powerOff(reason='manual'){
 cancelNumeric();
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
  if(state.screen!=='menu')state.menuReturnScreen=state.screen;
 state.menuKind=options.kind||'normal';state.menuPageSize=options.pageSize||MENUS.rule(state.menuKind).size;
 state.screen='menu';showMenu();
}
function showMenu(){
 const size=state.menuPageSize||6;
 state.menu=state.menuEntries.slice(state.menuPage*size,state.menuPage*size+size).map((e,i)=>({
  label:e.label,
  // MODE and SETUP use the printed number on the current hardware page.
  number:(state.menuKind==='mode'||state.menuKind==='setup'||size===10)&&e.key!==undefined?
   String(e.key):(e.key==='='?'=':String(i+1))
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
  if(output&&typeof output.then==='function'){
   state.screen='calculating';state.info='';
   notify('Calculating… AC cancels; MODE changes mode');paint();
   output.then(value=>{if(state.flow===f)finishFlow(value)})
    .catch(e=>{
     if(state.flow!==f||state.screen!=='calculating')return;
     state.screen='prompt';state.info=String(e.message||'Math ERROR').slice(0,23);
     notify(state.info,true);paint();
    });
   return;
  }
  finishFlow(output);
 }catch(e){state.info=String(e.message||'Math ERROR').slice(0,23);notify(state.info,true);paint()}
}
function finishFlow(output){
 try{
  if(output&&output.kind==='stat-original-estimate'){
   state.flow=null;
   setResult(output.value,output.source,null);
   return;
  }
  if(output&&output.kind==='stat-normal'){
   // Preserve the user-entered distribution expression for the LCD and
   // make Ans available immediately for the documented P(Ans) sequence.
   state.flow=null;state.raw=output.value;state.ans=output.value;
   state.ansRational=null;state.result=REG.format(output.value);
   state.outputLines=[output.source,'= '+state.result];state.outputPage=0;
   state.viewport.flowX=0;state.screen='flow-result';state.info='';
   releaseModifier();notify('STAT Distr: AC data; SHIFT 1 menu');paint();return;
  }
  if(output&&output.kind==='solve-continue'){
   // No X/register/Ans updates until an actual root converges.
   state.flow=null;state.solveSession={...output.session,pending:true};
   state.outputLines=['Continue: [=]','AC: cancel'];state.outputPage=0;
   state.viewport.flowX=0;state.screen='flow-result';state.info='';
   releaseModifier();notify('SOLVE: = continue, AC cancel');paint();return;
  }
  if(output&&output.kind==='solve'){
   // SOLVE commits only its successfully computed X and supplied registers.
   // No premature Ans or memory writes while prompting or iterating.
   for(const [name,value] of Object.entries(output.changes||{})){
    state.memory[name]=value;delete state.complexMemory[name];
   }
   state.memory.X=output.value;delete state.complexMemory.X;
   state.solveSession={source:output.source,initial:output.initial,
    value:output.value,residual:output.residual};
   state.flow=null;state.outputLines=output.lines;state.outputPage=0;
   state.viewport.flowX=0;state.raw=output.value;
   state.result=output.lines[1];state.screen='flow-result';state.info='';
   releaseModifier();notify('SOLVE: X and L-R; AC exits; = solves again');paint();return;
  }
  if(output&&output.kind==='calc-substitution'){
   // All inputs and the complete calculation have been validated; commit
   // the prompted registers atomically, never during intermediate prompts.
   for(const [name,value] of Object.entries(output.changes)){
    if(output.mode==='CMPLX'){
     const z=COMPLEX.value(value);state.complexMemory[name]=z;
     if(z.im===0)state.memory[name]=z.re;
    }else{state.memory[name]=value;delete state.complexMemory[name]}
   }
   // Retain named equality outputs and every multi-statement result for
   // CALC replay and diagnostic inspection without assigning output labels.
   state.calcSession={source:output.source,mode:output.mode,
    statementResults:output.statementResults};
   state.flow=null;
   if(output.mode==='CMPLX')setComplexResult(output.value,output.source,output.formatOverride);
   else setResult(output.value,output.source,null);
   return;
  }
   if(state.mode==='DIST'&&state.screen==='dist-list'&&state.distList){
    state.flow=null;state.info='';paint();return;
   }
   if(state.mode==='TABLE'&&state.tableData){
    state.flow=null;state.screen='table-grid';state.info='';
    notify('TABLE: UP/DOWN rows, LEFT/RIGHT columns, AC inputs');paint();return;
   }
   if(state.mode==='EQN'&&state.eqnSession){
    state.flow=null;state.screen='eqn-result';state.info='';
    const first=state.eqnSession.solutions[0];
    state.result=first?first.text:state.eqnSession.status;
    state.raw=first&&typeof first.value==='number'?first.value:NaN;
    notify('EQN: = next; AC coefficients');paint();return;
   }
  const lines=String(output??state.result??'0').split(/\n/).flatMap(line=>{
    return [line];
  });
  state.flow=null;state.outputLines=lines;state.outputPage=0;state.viewport.flowX=0;state.screen='flow-result';state.info='';
  notify('Calculation completed. UP/DOWN: scroll; AC: exit');paint();
 }catch(e){state.info=String(e.message||'Math ERROR').slice(0,23);notify(state.info,true);paint()}
}
function flowHandle(key){
 const f=state.flow;if(!f)return false;
 if(key==='MODE'&&state.shift){releaseModifier();setupMenu();return true;}
 if(key==='AC'){state.flow=null;state.calcSession=null;state.screen='edit';releaseModifier();state.info='';paint();return true}
 if(f.title.startsWith('VERIF ')){
  if(key==='CALC'){verifyRelationMenu();return true}
  if(state.shift&&/^[1-6]$/.test(key)){
   const op=['=','!=','<','<=','>','>='][Number(key)-1];
   verifyInsertRelation(op);return true;
  }
  if(key==='MODE'){modeMenu();return true}
 }
 if(key==='EQUAL'||key==='DOWN'){releaseModifier();flowNext();return true}
 if(key==='UP'){
  if(f.index>0){f.values[flowField().id]=f.buffer;f.index--;f.buffer=f.values[flowField().id]??String(flowField().value??'');f.cursor=f.buffer.length;f.editing=false}
  paint();return true
 }
 const field=flowField();const choices=field.id==='variable'?MODELS.registers(state.model).filter(x=>x!=='M'):(field.choices||OPTION_CHOICES[field.id]);
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
 else if(state.alpha&&vars[key]){
  if(!registerAllowed(vars[key])){releaseModifier();notify('Register unavailable on this model',true);paint();return true}
  addition=vars[key];
 }
 else if(state.shift&&key==='RP')addition=',';
 else if(state.shift&&key==='DOT')addition=',';
 else if(state.shift&&key==='MUL')addition='*';
 else if(state.shift&&key==='DIV')addition='/';
 else if(/^\d$/.test(key))addition=key;
 else if(key==='DOT')addition='.';
 else if(key==='COMMA')addition=',';
 // REA-078: CMPLX CALC's prompted values accept the calculator's
 // native i and polar-angle keys, not just decimal digits and operators.
 else if(state.mode==='CMPLX'&&state.shift&&key==='NEG')addition='∠';
 else if(state.mode==='CMPLX'&&key==='ENG')addition='i';
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
 if(key==='AC'){const back=state.menuReturnScreen||'edit';state.menuEntries=[];state.menu=[];state.menuPageSize=6;state.menuKind='normal';state.screen=back;state.info='';paint();return true}
 const size=state.menuPageSize||6;
 if(key==='DOWN'||key==='UP'){
  const next=MENUS.navigate(state.menuPage,key,state.menuEntries.length,size);
  if(next!==state.menuPage){state.menuPage=next;showMenu()}
  return true;
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
// REA-077: use the stored expression for every CALC run. There is one
// prompt for each referenced register, in first-occurrence order.
function startCalc(){
 if(state.mode!=='COMP'&&state.mode!=='CMPLX'){
  notify('CALC is available in COMP and CMPLX only',true);paint();return;
 }
 const source=state.screen==='result'&&state.calcSession?.mode===state.mode?
  state.calcSession.source:STRUCT.serialize(state.editor,true);
 try{
  const session=CALCS.prepare(source,MODELS.registers(state.model),state.mode,
   {...state.memory,...Object.fromEntries(Object.entries(state.complexMemory)
    .map(([name,z])=>[name,COMPLEX.format(z,state.angle,'rectangular')]))});
  if(!session.names.length){notify('CALC requires at least one variable',true);paint();return}
  const run=(inputs)=>CALCS.evaluate(session,inputs,{
   ...state,math:M,complex:COMPLEX
  });
  fieldForm('CALC '+session.source,session.fields,run);
 }catch(e){notify(e.message||'Syntax ERROR',true);paint()}
}
function solveProgress(session,params,reply){
 const current={source:session.source,initial:params.guess,
  changes:params.changes,request:{
   expression:params.expression,guess:String(params.guess),memory:params.memory
  }};
 if(reply.continue)return {kind:'solve-continue',session:{
  ...current,resume:reply.resume,iterations:reply.iterations
 }};
 return {...SOLVES.result(session.source,reply.value,reply.residual,
  number=>RESULTS.decimal(number,{...state,math:false})),
  changes:params.changes,initial:params.guess};
}
function continueSolve(){
 const active=state.solveSession;
 if(!active?.pending)return;
 state.screen='calculating';state.info='';releaseModifier();paint();
 runNumeric('SOLVE',{...active.request,resume:active.resume})
  .then(reply=>{
   if(state.solveSession!==active||state.screen!=='calculating')return;
   const params={guess:active.initial,changes:active.changes,
    expression:active.request.expression,memory:active.request.memory};
   finishFlow(solveProgress({source:active.source},params,reply));
  }).catch(e=>{
   if(state.solveSession!==active||state.screen!=='calculating')return;
   state.screen='flow-result';state.outputLines=[String(e.message||"Can't Solve")];
   state.info='';notify('SOLVE failed; AC to exit',true);paint();
  });
}
function startSolve(){
 if(state.mode!=='COMP'){notify('SOLVE requires COMP mode',true);paint();return}
 const source=state.screen==='flow-result'&&state.solveSession?
  state.solveSession.source:STRUCT.serialize(state.editor,true);
 try{
  const session=SOLVES.prepare(source,MODELS.registers(state.model),
   state.memory,CALCS.scan);
  const run=data=>{
   const params=SOLVES.resolve(session,data,M,{
    ...state,memory:{...state.memory}
   });
   return runNumeric('SOLVE',{
    expression:params.expression,guess:String(params.guess),memory:params.memory
   }).then(reply=>{
    if(!state.flow||state.screen!=='calculating')throw Error('Cancelled');
    return solveProgress(session,params,reply);
   });
  };
  fieldForm('SOLVE '+session.source,session.fields,run);
 }catch(e){notify(e.message||'Syntax ERROR',true);paint()}
}
function executeInlineCalculus(calculus){
 if(state.mode!=='COMP')throw Error('Argument ERROR');
 state.screen='calculating';state.info='';releaseModifier();paint();
 runNumeric(calculus.kind,calculus.data).then(({value})=>{
  if(state.screen!=='calculating')return; // OFF, AC, MODE cancel worker.
  setResult(value,calculus.source,null);
 }).catch(err=>{
  if(state.screen!=='calculating')return;
  error(err.message||'Math ERROR',calculus.source);
 });
}
function insertCalculusTemplate(type){
 if(state.mode!=='COMP'){
  releaseModifier();notify('Calculus templates require COMP mode',true);paint();return;
 }
 // SHIFT+DEL incorporation is defined for operand templates, not integrals.
 state.captureTemplate=false;
 insertTemplate(type);
}
function numericalFlow(kind){
 if(kind==='SOLVE'){startSolve();return}
 if(state.mode!=='COMP'){error('Argument ERROR');return}
 const modes={SOLVE:'SOLVE — numerical root',DERIVATIVE:'d/dx — derivative at X',INTEGRAL:'∫ — definite integral',SUM:'Σ — finite sum',PRODUCT:'Π — finite product'};
 const fields=[{id:'expression',label:'Expression in X',value:state.input||'X^2-2'}];
 if(kind==='DERIVATIVE')fields.push({id:'at',label:'At X',value:'2'});
 if(kind==='SOLVE')fields.push({id:'guess',label:'Initial X',value:'1'});
 if(kind==='INTEGRAL'||kind==='SUM'||kind==='PRODUCT')fields.push({id:'a',label:'Lower bound',value:'0'},{id:'b',label:'Upper bound',value:'1'});
 if(kind==='DERIVATIVE'||kind==='INTEGRAL')fields.push({id:'tol',label:'Tolerance (≥ 1E-14)',value:kind==='DERIVATIVE'?'1E-10':'1E-5'});
 if(kind==='PRODUCT')fields.push({id:'step',label:'Positive integer step (web extension)',value:'1'});
 fieldForm(modes[kind],fields,data=>runNumeric(kind,data).then(({value,residual})=>{
  if(!state.flow||state.screen!=='calculating')throw Error('Cancelled');
  setResult(value,data.expression,null);
  if(kind==='SOLVE')return 'X = '+M.format(value,{...state,math:false})+'\nL-R = '+M.format(residual,{...state,math:false});
  return M.format(value,state);
 }));
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
 if(text===null){notify('DMS conversion out of range',true);paint();return}
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
 if(!registerAllowed(name))throw Error('Variable ERROR');
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
 if(!registerAllowed(name)){notify('Register unavailable: '+name,true);paint();return}
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
 releaseModifier();notify(state.pendingMemory+' — select '+registerNames());paint();
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
 state.complexResultLines=[];state.complexDisplayFormat=null;
 for(const name of Object.keys(state.memory))state.memory[name]=0;
 state.ans=0;state.preAns=0;state.raw=0;state.ansRational=null;state.preAnsRational=null;state.complexAns={re:0,im:0};state.complexMemory={};
 state.pendingMemory=null;state.resultPresentation=null;state.result='';state.resultSource='';
 state.error='';state.errorOffset=null;state.errorSource='';state.history=[];clearReplay();
 state.screen='edit';state.editor=STRUCT.create();state.viewport={inputX:0,inputY:0,resultX:0,flowX:0};syncEditor();
 notify('Memory cleared');paint();
}
function setupChoose(id,value){
 if(!SETUP.setting(state.model,id))throw Error('Argument ERROR');
 if(!SETUP.options(id).some(choice=>choice.value===value))throw Error('Argument ERROR');
 if(state.factorization)exitFactorization();
 switch(id){
 case 'mthio':
  state.math=true;state.outputMath=value==='matho';
  if(state.mode==='TABLE'){state.tableData=null;state.tableDraft=null}
  break;
 case 'norm':state.format=value==='norm1'?'Norm1':'Norm2';break;
 case 'complex':state.complexFormat=value;break;
 case 'stat':{const enabled=value==='on';if(state.statTable){STAT.toggleFrequency(state.statTable,enabled);if(state.mode==='STAT')state.screen='stat-table'}state.statFrequency=enabled;break}
 case 'table':state.tableFunctions=TABLE.dualEnabled(state.model,value==='double'?2:1)?2:1;state.tableData=null;state.tableDraft=null;break;
 case 'recurring':state.recurringDecimal=value==='on';break;
 case 'disp':state.decimalSeparator=value;break;
 }
 notify('SETUP '+id+': '+value);paint();
}
function setupSetting(id){
 if(!SETUP.setting(state.model,id))throw Error('Argument ERROR');
 if(state.factorization)exitFactorization();
 if(id==='lineio'){
  state.math=false;state.outputMath=false;
  if(state.mode==='TABLE'){state.tableData=null;state.tableDraft=null}
  paint();return;
 }
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
 optionDialog('SETUP',SETUP.entries(state.model).map(e=>({
  key:e.key,label:e.key+'. '+e.label,action:()=>setupSetting(e.id)
 })),{pageSize:8,kind:'setup'});
}
function modeMenu(){
 optionDialog('MODE',MENUS.modeEntries(state.model).map(entry=>({
  key:entry.key,label:entry.key+'. '+entry.label,
  action:()=>setMode(entry.label)
 })),{kind:'mode',pageSize:8});
}
function setMode(mode){if(!MODELS.supports(state.model,mode)){notify('Not available for '+MODELS.get(state.model).label,true);return}
 if(mode!=='STAT')state.statTable=null;
 state.tableData=null;state.tableDraft=null;state.distType=null;state.distDraft=null;state.distList=null;state.distListParams=null;state.constantCode=null;
 state.eqnSession=null;state.eqnEditor=null;state.ineqEditor=null;state.ineqSession=null;state.matrixEditor=null;state.matrixView=null;state.matrixParameter=null;state.vectorEditor=null;state.vectorView=null;state.vectorParameter=null;state.vectorScalarInfo=null;
 if(mode==='BASE-N'){state.baseRadix='DEC';state.baseValue=0}
 state.complexResultLines=[];state.complexDisplayFormat=null;
 if(state.mode==='COMP'&&mode!=='COMP'){state.preAns=0;state.preAnsRational=null}
 clearReplay();state.pendingMemory=null;state.captureTemplate=false;state.calcSession=null;state.solveSession=null;state.editor=STRUCT.create();state.mode=mode;state.input='';state.cursor=0;state.result='';state.screen='edit';releaseModifier();notify(mode+' mode');paint();if(mode!=='COMP')advancedMode(mode)}
function setModel(id){
 cancelNumeric();
 if(!MODELS.profiles[id])return false;
 state.model=id;
 reset('all');
 state.model=id;
 state.mode='COMP';
 $('model-selector').value=id;
 K.applyModel($('keys'),id);
 notify('Model: '+MODELS.get(id).label+' · only supported modes are shown');
 paint();
 return true;
}
function parseCsv(text){return M.parseNumbers(text)}
function normalCDF(x,mu=0,sigma=1){if(sigma<=0)throw Error('Argument ERROR');const z=(x-mu)/(sigma*Math.SQRT2);const sign=Math.sign(z),a=Math.abs(z),t=1/(1+0.3275911*a);const erf=sign*(1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-a*a));return (1+erf)/2}
// REA-047: all STAT data are edited on the calculator LCD.
function statModeMenu(){
 optionDialog('STAT type',REG.TYPES.map((t,i)=>({
  key:String(i+1),label:(i+1)+'. '+t.label,action:()=>startStat(t.id)
 })),{pageSize:8,kind:'stat-type'});
}
function startStat(type){
 const selected=REG.TYPES.find(t=>t.id===type);
 if(!selected)throw Error('Argument ERROR');
 const old=state.statTable;
 state.statTable=old&&old.paired===selected.paired?old:STAT.create(selected.paired,state.statFrequency);
 state.statTable.regressionType=type;state.screen='stat-table';
 state.info='';releaseModifier();notify('STAT '+selected.label+' data editor');paint();
}
function statSafe(fn){
 try{return fn()}catch(e){
  state.statTable.error=String(e.message||'Math ERROR');
  state.screen='stat-table';releaseModifier();notify(state.statTable.error,true);paint();
  return null;
 }
}
function statShow(lines,title){
 state.outputLines=lines;state.outputPage=0;state.viewport.flowX=0;
 state.screen='flow-result';state.info='';releaseModifier();
 notify('STAT '+title+'; AC returns to data');paint();
}
function statSummary(){STAT.commit(state.statTable);return REG.summary(state.statTable)}
function statFit(){STAT.commit(state.statTable);return REG.fit(state.statTable,state.statTable.regressionType||'LIN')}
function statMenuResult(title,lines){
 optionDialog('STAT '+title,lines.map((line,i)=>({
  key:String(i+1),label:(i+1)+'. '+line.split(' = ')[0],
  action:()=>statSafe(()=>{
   const raw=Number(line.split(' = ')[1]);
   if(!Number.isFinite(raw))throw Error('Math ERROR');
   state.raw=raw;state.ans=raw;state.ansRational=null;state.result=REG.format(raw);
   statShow([line],title);
  })
 })),{pageSize:8});
}
function statEstimate(which){
 fieldForm('STAT estimate '+which,[{id:'value',label:which==='y'?'Given X':'Given Y',value:'1'}],d=>{
  const number=Number(d.value);
  if(!Number.isFinite(number))throw Error('Argument ERROR');
  const model=statFit(),out=which==='y'?[REG.estimateY(model,number)]:REG.estimateX(model,number);
  state.raw=out[0];state.ans=out[0];state.ansRational=null;state.result=REG.format(out[0]);
  return out.map((v,i)=>(which==='y'?'yHat':'xHat'+(out.length>1?i+1:''))+' = '+REG.format(v)).join('\\n');
 });
}
// REA-084 — original fx-991ES single-variable STAT → 7: Distr.
// P(t), Q(t), R(t) use the standard-normal integral. x▶t is computed
// from the current STAT editor's population SD (xσn), never sample SD.
function statDistr(){
 if(state.model!=='fx-991es'||!state.statTable||
   state.statTable.paired||state.statTable.regressionType!=='1VAR'){
  notify('STAT Distr requires original 1-VAR',true);paint();return;
 }
 releaseModifier();
 optionDialog('STAT Distr',[
  {key:'1',label:'1. P(',action:()=>statDistrInput('P')},
  {key:'2',label:'2. Q(',action:()=>statDistrInput('Q')},
  {key:'3',label:'3. R(',action:()=>statDistrInput('R')},
  {key:'4',label:'4. ▶t',action:()=>statDistrInput('t')}
 ],{pageSize:4,kind:'stat-distr'});
}
function statDistrInput(kind){
 // For P/Q/R a subsequent P(Ans) is a documented native workflow.
 // For normalized ▶t, the first use defaults to the stored X value if
 // available; it is still explicitly entered/confirmed in the prompt.
 const label=kind==='t'?'▶t':kind+'(';
 fieldForm('STAT '+label,[{
  id:'value',label:kind==='t'?'Sample X':'Standard variate t',
  value:String(Number.isFinite(state.ans)?state.ans:0)
 }],values=>{
  if(state.model!=='fx-991es'||state.mode!=='STAT'||!state.statTable||
     state.statTable.paired||state.statTable.regressionType!=='1VAR')
   throw Error('Argument ERROR');
  // No changes to Ans or the STAT table until complete validation.
  const raw=String(values.value??'').trim();
  if(!raw)throw Error('Syntax ERROR');
  STAT.commit(state.statTable);
  const arg=M.evaluate(raw,{...state,ans:state.ans,preAns:state.preAns,
   memory:state.memory});
  if(!Number.isFinite(arg))throw Error('Math ERROR');
  const summary=kind==='t'?REG.summary(state.statTable):null;
  const result=STATN.calculate(kind,arg,summary);
  const expression=kind==='t'?REG.format(arg)+'▶t':kind+'('+raw+')';
  return {kind:'stat-normal',source:expression,value:result};
 });
}
function originalStatEstimate(item){
 const which=item.estimate;
 fieldForm('STAT '+item.label,[{
  id:'value',label:which==='x'?'Given Y':'Given X',value:'0'
 }],values=>{
  if(state.model!=='fx-991es'||state.mode!=='STAT'||!state.statTable||
     !state.statTable.paired)throw Error('Argument ERROR');
  const source=String(values.value??'').trim();
  if(!source)throw Error('Syntax ERROR');
  const number=M.evaluate(source,{...state,math:false,
   memory:{...state.memory,...STATPARAM.resolve(source,state.statTable,REG)}});
  const fit=statFit();
  const results=which==='y'?[REG.estimateY(fit,number)]:REG.estimateX(fit,number);
  if(item.root!==undefined&&item.root>=results.length)throw Error('Math ERROR');
  const output=results[item.root??0];
  if(!Number.isFinite(output))throw Error('Math ERROR');
  return {kind:'stat-original-estimate',value:output,
   source:item.label+'('+source+')'};
 });
}
function originalStatParameterMenu(group){
 const t=state.statTable;
 if(state.model!=='fx-991es'||state.mode!=='STAT'||!t)
  throw Error('Argument ERROR');
 const options=STATPARAM.entries(group,t.paired,t.regressionType);
 optionDialog('STAT '+group,options.map(item=>({
  key:item.key,label:item.key+'. '+item.label,
  action:()=>{
   if(item.estimate){originalStatEstimate(item);return}
   // The command inserts a symbolic token, not a premature numeric answer.
   // The menu dispatcher has already switched screen to edit. Respect
   // its recorded origin: selecting from the data or result screen starts
   // a fresh expression, while selecting during editing inserts at caret.
   if(['stat-table','result','flow-result'].includes(state.menuReturnScreen)){
    state.screen='edit';state.editor=STRUCT.create();syncEditor();
   }
   insert(item.token);
  }
 })),{pageSize:8,kind:'stat-'+group.toLowerCase()});
}
function statMenu(){
 if(!state.statTable){statModeMenu();return}
 if(state.model==='fx-991es'){
  releaseModifier();
  optionDialog('STAT',[
   {key:'1',label:'1. Type',action:statModeMenu},
   {key:'2',label:'2. Data',action:()=>{state.screen='stat-table';paint()}},
   {key:'3',label:'3. Edit',action:()=>optionDialog('STAT Edit',[
    {key:'1',label:'1. Ins',action:()=>statSafe(()=>{STAT.insert(state.statTable);state.screen='stat-table';paint()})},
    {key:'2',label:'2. Del',action:()=>statSafe(()=>{STAT.remove(state.statTable);state.screen='stat-table';paint()})},
    {key:'3',label:'3. Del-A',action:()=>{const t=state.statTable;t.rows=[{X:null,Y:null,FREQ:1}];t.row=0;t.col=0;STAT.load(t);state.screen='stat-table';paint()}}
   ],{pageSize:4,kind:'stat-edit'})},
   {key:'4',label:'4. Sum',action:()=>originalStatParameterMenu('Sum')},
   {key:'5',label:'5. Var',action:()=>originalStatParameterMenu('Var')},
   {key:'6',label:'6. MinMax',action:()=>originalStatParameterMenu('MinMax')},
   {key:'7',label:state.statTable.paired?'7. Reg':'7. Distr',
    action:()=>state.statTable.paired?originalStatParameterMenu('Reg'):statDistr()}
  ],{pageSize:8,kind:'stat-menu'});
  return;
 }
 releaseModifier();
 optionDialog('STAT',[
  {key:'1',label:'1. Type',action:statModeMenu},
  {key:'2',label:'2. Data',action:()=>{state.screen='stat-table';paint()}},
  {key:'3',label:'3. Edit',action:()=>optionDialog('STAT Edit',[
   {key:'1',label:'1. Ins',action:()=>statSafe(()=>{STAT.insert(state.statTable);state.screen='stat-table';paint()})},
   {key:'2',label:'2. Del',action:()=>statSafe(()=>{STAT.remove(state.statTable);state.screen='stat-table';paint()})},
   {key:'3',label:'3. Del-A',action:()=>{const t=state.statTable;t.rows=[{X:null,Y:null,FREQ:1}];t.row=0;t.col=0;STAT.load(t);state.screen='stat-table';paint()}}
  ],{kind:'stat-edit',pageSize:4})},
  {key:'4',label:'4. Sum',action:()=>statSafe(()=>statMenuResult('Sum',REG.sumLines(statSummary(),state.statTable.paired)))},
  {key:'5',label:'5. Var',action:()=>statSafe(()=>statMenuResult('Var',REG.varLines(statSummary(),state.statTable.paired)))},
  {key:'6',label:'6. MinMax',action:()=>statSafe(()=>statMenuResult('MinMax',REG.minMaxLines(statSummary(),state.statTable.paired)))},
  {key:'7',label:state.model==='fx-991es'&&!state.statTable.paired?'7. Distr':'7. Reg',
   action:()=>state.model==='fx-991es'&&!state.statTable.paired?
    statDistr():statSafe(()=>statMenuResult('Reg',REG.regLines(statFit())))},
  ...(state.statTable.paired?[{key:'8',label:'8. Estimate',action:()=>optionDialog('STAT estimate',[
   {key:'1',label:'1. yHat',action:()=>statSafe(()=>statEstimate('y'))},
   {key:'2',label:'2. xHat',action:()=>statSafe(()=>statEstimate('x'))}
  ])}]:[])
 ],{pageSize:8,kind:'stat-menu'});
}
function statAdvance(){
 const t=state.statTable;STAT.commit(t);
 const cols=STAT.columns(t.paired,t.frequency);
 if(t.col<cols.length-1)STAT.move(t,0,1);
 else if(t.row===t.rows.length-1)STAT.insert(t);
 else{t.col=0;STAT.move(t,1,0)}
}
function statResults(){
 statSafe(()=>{
  const t=state.statTable,summary=statSummary();
  state.raw=summary.meanX;state.ans=summary.meanX;state.ansRational=null;state.result=REG.format(summary.meanX);
  const lines=[...REG.varLines(summary,t.paired),...REG.sumLines(summary,t.paired),...REG.minMaxLines(summary,t.paired)];
  if(t.paired){
   try{lines.push(...REG.regLines(statFit()))}
   catch(e){lines.push('Reg: '+String(e.message||'Math ERROR'))}
  }
  statShow(lines,'summary');
 });
}
function statTableHandle(key){
 const t=state.statTable;if(!t)return;
 try{
  if(key==='SHIFT'){state.shift=!state.shift;state.alpha=false;paint();return}
  if(key==='ALPHA'){state.alpha=!state.alpha;state.shift=false;paint();return}
  if(state.shift&&key==='1'){statMenu();return}
  if(state.shift&&key==='UP'){STAT.insert(t);releaseModifier();paint();return}
  if(state.shift&&key==='DOWN'){STAT.remove(t);releaseModifier();paint();return}
  if(state.shift&&key==='MODE'){releaseModifier();setupMenu();return}
  if(key==='MODE'){releaseModifier();modeMenu();return}
  if(key==='AC'){releaseModifier();state.screen='edit';state.info='';paint();return}
  if(key==='CALC'){statResults();return}
  if(key==='EQUAL'){statAdvance();releaseModifier();paint();return}
  if(key==='UP'){STAT.move(t,-1,0);releaseModifier();paint();return}
  if(key==='DOWN'){STAT.move(t,1,0);releaseModifier();paint();return}
  if(key==='LEFT'){STAT.move(t,0,-1);releaseModifier();paint();return}
  if(key==='RIGHT'){STAT.move(t,0,1);releaseModifier();paint();return}
  if(key==='DEL'){if(t.editing)t.buffer=t.buffer.slice(0,-1);else {t.buffer='';t.editing=true}t.error='';releaseModifier();paint();return}
  let content=null;
  if(/^[0-9]$/.test(key))content=key;
  else if(key==='DOT')content='.';
  else if(key==='NEG'||key==='SUB')content='-';
  else if(key==='ADD')content='+';
  else if(key==='EXP')content='E';
  else if(key.startsWith('TEXT:'))content=key.slice(5);
  if(content!==null){STAT.type(t,content,!state.insert);releaseModifier();paint();return}
 }catch(e){
  t.error=String(e.message||'Argument ERROR');
  releaseModifier();notify(t.error,true);paint();return;
 }
 notify('STAT editor: arrows, =, CALC, SHIFT UP/DOWN',true);paint();
}
// REA-049: calculator-key BASE-N editor, with signed ranges by model.
const BASE_SELECT=Object.freeze({SQUARE:'DEC',RECIP:'HEX',LOG:'BIN',LN:'OCT'});
const HEX_KEYS=Object.freeze({NEG:'A',DMS:'B',HYP:'C',SIN:'D',COS:'E',TAN:'F'});
function baseSetInput(text){
 state.input=text;state.cursor=text.length;state.editor=STRUCT.fromString(text);
 state.screen='edit';state.result='';releaseModifier();paint();
}
function baseSwitch(radix){
 // Convert the stored numeric result; never reinterpret its old digit string.
 if(state.screen==='result'){
  const text=BASE.convert(state.baseValue,radix,state.model);
  state.baseRadix=radix;state.result=text;state.raw=state.baseValue;
  state.resultPresentation=null;releaseModifier();
  notify('BASE-N '+radix+' conversion');paint();return;
 }
 if(state.input){
  state.baseRadix=radix;baseSetInput('');
  notify('BASE-N '+radix+' — previous input cleared');return;
 }
 state.baseRadix=radix;releaseModifier();
 notify('BASE-N '+radix+' selected');paint();
}
function baseAppend(token){
 const next=state.screen==='result'?token:state.input+token;
 if(next.length>100)throw Error('Syntax ERROR');
 baseSetInput(next);
}
function baseCalculate(){
 const expression=state.input;
 const n=expression?BASE.evaluate(expression,state.baseRadix,state.model):BigInt(state.baseValue);
 const output=BASE.format(n,state.baseRadix,state.model);
 state.baseValue=Number(n);state.raw=Number(n);state.ans=Number(n);
 state.ansRational=null;state.resultPresentation=null;
 state.result=output;state.screen='result';releaseModifier();
 notify('BASE-N '+state.baseRadix+' calculation');paint();
}
function baseLogicMenu(){
 const fromResult=state.screen==='result';
 const previous=fromResult?BASE.format(state.baseValue,state.baseRadix,state.model):null;
 const entries=[
  {key:'1',label:'1. and',token:'and',binary:true},
  {key:'2',label:'2. or',token:'or',binary:true},
  {key:'3',label:'3. xor',token:'xor',binary:true},
  {key:'4',label:'4. xnor',token:'xnor',binary:true},
  {key:'5',label:'5. Not(',token:'Not(',binary:false},
  {key:'6',label:'6. Neg(',token:'Neg(',binary:false},
  {key:'1',label:'1. d: (decimal)',token:'d:',literal:true},
  {key:'2',label:'2. h: (hex)',token:'h:',literal:true},
  {key:'3',label:'3. b: (binary)',token:'b:',literal:true},
  {key:'4',label:'4. o: (octal)',token:'o:',literal:true}
 ];
 releaseModifier();
 optionDialog('BASE logic',entries.map(item=>({
  key:item.key,label:item.label,action:()=>{
   // Choosing an infix operator after a result retains the displayed operand.
   if(item.binary){
    const source=fromResult?previous:state.input;
    if(!source||/[+*/(-]\\s*$/.test(source))throw Error('Syntax ERROR');
    baseSetInput(source+' '+item.token+' ');
   }else if(item.literal){
    // An explicit radix marker belongs to the expression, not to baseRadix.
    const source=fromResult?'':state.input;
    if(source&&!/[+*/(-]\\s*$/.test(source))throw Error('Syntax ERROR');
    baseSetInput(source+item.token);
   }else baseSetInput((fromResult?'':state.input)+item.token);
   notify('BASE-N '+item.token+' inserted');
  }
 })),{pageSize:6,kind:'base-logic'});
}
function baseHandle(key){
 if(key==='SHIFT'){state.shift=!state.shift;state.alpha=false;paint();return}
 if(key==='ALPHA'){state.alpha=!state.alpha;state.shift=false;paint();return}
 if(state.shift&&key==='AC'){powerOff();return}
 if(state.shift&&key==='MODE'){releaseModifier();setupMenu();return}
 if(state.shift&&key==='9'){releaseModifier();clearMenu();return}
 if(state.shift&&key==='3'){baseLogicMenu();return}
 if(key==='MODE'){releaseModifier();modeMenu();return}
 if(state.shift||state.alpha){releaseModifier();notify('BASE-N modified key unavailable',true);paint();return}
 if(BASE_SELECT[key]){baseSwitch(BASE_SELECT[key]);return}
 const activeRadix=BASE.inputRadix(state.screen==='result'?'':state.input,state.baseRadix);
 const hex=HEX_KEYS[key];
 if(hex&&activeRadix==='HEX'){baseAppend(hex);return}
 if(key==='NEG'&&state.baseRadix==='DEC'){baseAppend('-');return}
 if(key.startsWith('TEXT:')&&activeRadix==='HEX'&&/^[a-f]$/i.test(key.slice(5))){
  baseAppend(key.slice(5).toUpperCase());return;
 }
 if(key==='AC'){state.baseValue=0;baseSetInput('');notify('BASE-N cleared input');return}
 if(key==='DEL'){
  if(state.screen==='result')baseSetInput('');
  else baseSetInput(state.input.slice(0,-1));
  return;
 }
 if(key==='EQUAL'){baseCalculate();return}
 const ops={ADD:'+',SUB:'-',MUL:'*',DIV:'/',LP:'(',RP:')'};
 if(ops[key]){baseAppend(ops[key]);return}
 if(/^[0-9]$/.test(key)){
  if(Number(key)>=BASE.BASES[activeRadix]){notify('Invalid '+activeRadix+' digit',true);return}
  baseAppend(key);return;
 }
 notify('BASE-N key unavailable in this radix',true);paint();
}
// REA-051: four EQN types, existing coefficient prompts and real result paging.
function eqnTypeMenu(){
 optionDialog('EQN type',EQN.TYPES.map((t,i)=>({
  key:String(i+1),label:(i+1)+'. '+t.label,action:()=>eqnStart(t.id)
 })),{pageSize:6,kind:'eqn-type'});
}
function eqnStart(type,previous=null){
 const def=EQN.TYPES.find(t=>t.id===type);if(!def)throw Error('Argument ERROR');
 // Selecting a new equation type starts with a zero-filled coefficient table.
 state.eqnEditor=EQEDIT.create(type);
 state.eqnSession=null;
 if(previous){for(const key of def.fields)if(previous[key]!==undefined)state.eqnEditor.values[key]=Number(previous[key])}
 EQEDIT.restore(state.eqnEditor);
 state.screen='eqn-coeff';state.result='';state.info='';releaseModifier();
 notify('EQN coefficients: arrows navigate; = next / solve; AC clears');paint();
}
function eqnSolve(){
 const e=state.eqnEditor;EQEDIT.commit(e);
 // On any failed solve, retain the entire editor and current coefficient.
 const fields=EQN.TYPES.find(type=>type.id===e.type).fields;
 const solved=EQEX.decorate(EQN.solve(e.type,e.values),fields.map(k=>e.values[k]));
 state.eqnSession={type:e.type,values:{...e.values},solutions:solved.solutions,
  status:solved.status,nonRealCount:solved.nonRealCount||0,index:0};
 const first=solved.solutions[0];
 state.result=first?first.label+' = '+EQEX.display(first,state.math):solved.status;
 state.raw=first&&typeof first.value==='number'?first.value:NaN;
 state.screen='eqn-result';state.info='';releaseModifier();
 notify('EQN: = or DOWN next; AC returns to coefficients');paint();
}
function eqnCoeffHandle(key){
 const e=state.eqnEditor;if(!e)return;
 try{
  if(key==='MODE'){releaseModifier();modeMenu();return}
  if(key==='SHIFT'){state.shift=!state.shift;state.alpha=false;paint();return}
  if(key==='ALPHA'){state.alpha=!state.alpha;state.shift=false;paint();return}
  if(key==='AC'){EQEDIT.clear(e);releaseModifier();notify('All EQN coefficients cleared');paint();return}
  if(key==='UP'){EQEDIT.move(e,-1,0);releaseModifier();paint();return}
  if(key==='DOWN'){EQEDIT.move(e,1,0);releaseModifier();paint();return}
  if(key==='LEFT'){EQEDIT.move(e,0,-1);releaseModifier();paint();return}
  if(key==='RIGHT'){EQEDIT.move(e,0,1);releaseModifier();paint();return}
  if(key==='DEL'){EQEDIT.backspace(e);releaseModifier();paint();return}
  if(key==='EQUAL'){
   const done=EQEDIT.next(e);releaseModifier();
   if(done)eqnSolve();else paint();
   return;
  }
  if(key==='NEG'){EQEDIT.sign(e);releaseModifier();paint();return}
  let token=null;
  if(/^[0-9]$/.test(key))token=key;
  else if(key==='DOT')token='.';
  else if(key==='EXP')token='E';
  else if(key==='SUB')token='-';
  else if(key==='ADD')token='+';
  else if(key.startsWith('TEXT:')&&/^[0-9.Ee+-]$/.test(key.slice(5)))token=key.slice(5);
  if(token!==null){EQEDIT.enter(e,token);releaseModifier();paint();return}
  releaseModifier();notify('Unsupported EQN coefficient operation',true);paint();
 }catch(err){
  e.error=String(err.message||'Math ERROR');
  releaseModifier();notify(e.error,true);paint();
 }
}
function eqnPage(delta,exitAtEnd=false){
 const e=state.eqnSession;if(!e)return;
 if(!e.solutions.length){
  if(exitAtEnd){EQEDIT.restore(state.eqnEditor);state.screen='eqn-coeff';state.info='';paint()}
  return;
 }
 // On the original fx-991ES, = at the final solution returns to the
 // coefficient grid; arrow keys only scroll between available solutions.
 if(exitAtEnd&&e.index+delta>=e.solutions.length){
  EQEDIT.restore(state.eqnEditor);state.screen='eqn-coeff';state.info='';paint();return;
 }
 e.index=Math.max(0,Math.min(e.solutions.length-1,e.index+delta));
 state.result=e.solutions[e.index].label+' = '+EQEX.display(e.solutions[e.index],state.math);
 state.raw=typeof e.solutions[e.index].value==='number'?e.solutions[e.index].value:NaN;
 state.info='';paint();
}
function eqnResultHandle(key){
 const e=state.eqnSession;if(!e)return;
 if(key==='AC'){EQEDIT.restore(state.eqnEditor);state.screen='eqn-coeff';state.info='';paint();return}
 if(key==='EQUAL'){eqnPage(1,true);return}
 if(key==='DOWN'||key==='RIGHT'){eqnPage(1);return}
 if(key==='UP'||key==='LEFT'){eqnPage(-1);return}
 if(key==='MODE'){modeMenu();return}
 notify('EQN: = next/finish; arrows scroll; AC coefficients');paint();
}

const MATRIX_DIMS=[[1,1],[1,2],[1,3],[2,1],[2,2],[2,3],[3,1],[3,2],[3,3]];
function matrixRegisterMenu(kind){
 optionDialog('MATRIX '+kind,MATRIX.NAMES.map((name,i)=>({
  label:(i+1)+'. '+name,action:()=>kind==='Dim'?matrixDimensionMenu(name):matrixEdit(name)
 })),{pageSize:6,kind:'matrix'});
}
function matrixDimensionMenu(name){
 optionDialog(name+' Dimension',MATRIX_DIMS.map(([rows,cols],i)=>({
  key:String(i+1),label:(i+1)+'. '+rows+'x'+cols,
  action:()=>{MATRIX.set(state.matrices,name,MATRIX.create(rows,cols));matrixEdit(name)}
 })),{pageSize:8,kind:'matrix'});
}
function matrixEdit(name){
 if(!state.matrices[name]){matrixDimensionMenu(name);return}
 state.matrixEditor=MATRIX.editor(state.matrices,name);
 state.matrixView=null;state.screen='matrix-table';releaseModifier();
 notify(name+' matrix editor; arrows move, = enter, AC exit');paint();
}
function matrixCommit(){
 if(!state.matrixEditor)return;
 MATRIX.commit(state.matrixEditor);
 MATRIX.set(state.matrices,state.matrixEditor.name,state.matrixEditor.matrix);
}
function matrixClose(){
 matrixCommit();state.matrixEditor=null;state.screen='edit';releaseModifier();
 notify('MATRIX registers saved; SHIFT 4 menu');paint();
}
function matrixShow(name,value=null){
 if(!value&&!state.matrices[name]){
  releaseModifier();notify(name+' has no data; use Dim first',true);
  if(MATRIX.NAMES.includes(name))matrixDimensionMenu(name);
  else matrixMenu();
  return;
 }
 const matrix=value?MATRIX.clone(value):MATRIX.get(state.matrices,name);
 state.matrixView={name,matrix,row:0,col:0};
 state.matrixEditor=null;state.screen='matrix-result';releaseModifier();
 notify(name+'; arrows inspect, AC back');paint();
}
function matrixRun(op,a,b=null,parameter=null){
 try{
  const value=MATRIX.record(state.matrices,op,a,b,parameter);
  if(typeof value==='number'){
   state.matrixView=null;state.screen='matrix-scalar';
   state.raw=value;state.result=String(Number(value.toPrecision(12)));
   notify(op+' '+a+' = '+state.result);paint();
  }else matrixShow('MatAns',value);
 }catch(err){notify(String(err.message||'Math ERROR'),true);matrixMenu()}
}
function matrixParameterStart(op,name){
 state.matrixParameter={operator:op,name,buffer:'2',editing:false,error:''};
 state.screen='matrix-parameter';releaseModifier();
 notify('MATRIX '+op+' '+name+'; = calculate; AC cancel');paint();
}
function matrixParameterHandle(key){
 const p=state.matrixParameter;if(!p)return;
 if(key==='AC'){state.matrixParameter=null;matrixMenu();return}
 if(key==='MODE'){state.matrixParameter=null;modeMenu();return}
 if(key==='SHIFT'){state.shift=!state.shift;paint();return}
 if(key==='DEL'){if(!p.editing){p.buffer='';p.editing=true}else p.buffer=p.buffer.slice(0,-1);p.error='';paint();return}
 if(key==='NEG'){
  if(!p.editing){p.buffer='-';p.editing=true}
  else p.buffer=p.buffer.startsWith('-')?p.buffer.slice(1):'-'+p.buffer;
  p.error='';paint();return;
 }
 if(key==='EQUAL'){
  try{
   const value=MATRIX.parse(p.buffer);
   if(p.operator==='power'&&!Number.isInteger(value))throw Error('Argument ERROR');
   const result=MATRIX.record(state.matrices,p.operator,p.name,null,value);
   state.matrixParameter=null;
   if(typeof result==='number'){
    state.screen='matrix-scalar';state.raw=result;state.result=String(result);paint();
   }else matrixShow('MatAns',result);
  }catch(err){p.error=String(err.message||'Math ERROR');notify(p.error,true);paint()}
  return;
 }
 let token=null;
 if(/^[0-9]$/.test(key))token=key;
 else if(key==='DOT')token='.';
 else if(key==='EXP')token='E';
 else if(key==='SUB')token='-';
 else if(key==='ADD')token='+';
 else if(key.startsWith('TEXT:')&&/^[0-9.Ee+-]$/.test(key.slice(5)))token=key.slice(5);
 if(token!==null){
  if(!p.editing){p.buffer='';p.editing=true}
  if(p.buffer.length<28)p.buffer+=token;
  p.error='';paint();return;
 }
 notify('Enter a numeric MATRIX parameter',true);paint();
}
function matrixOperandMenu(op,a=null){
 const names=MATRIX.NAMES.filter(name=>state.matrices[name]);
 if(!names.length){matrixRegisterMenu('Dim');return}
 optionDialog('MATRIX '+op+' '+(a||''),names.map(name=>({
  label:name,action:()=>a?matrixRun(op,a,name):['det','abs'].includes(op)?matrixRun(op,name,null):['scalar','power'].includes(op)?matrixParameterStart(op,name):['inverse','transpose'].includes(op)?matrixRun(op,name,null):matrixOperandMenu(op,name)
 })),{pageSize:6,kind:'matrix'});
}
function matrixCopy(from=null){
 if(!from){
  const names=[...MATRIX.NAMES,'MatAns'].filter(name=>state.matrices[name]);
  if(!names.length){matrixRegisterMenu('Dim');return}
  optionDialog('Copy from',names.map(name=>({label:name,action:()=>matrixCopy(name)})),{pageSize:6,kind:'matrix'});
  return;
 }
 optionDialog('Copy '+from+' to',MATRIX.NAMES.filter(name=>name!==from).map(name=>({
  label:name,action:()=>{
   MATRIX.copy(state.matrices,from,name);matrixEdit(name);
  }
 })),{pageSize:6,kind:'matrix'});
}
function matrixHistoryMenu(){
 const entries=state.matrices.history.slice().reverse();
 if(!entries.length){notify('No matrix history',true);matrixMenu();return}
 optionDialog('MATRIX History',entries.map((entry,i)=>({
  label:(i+1)+'. '+entry.operator+' '+entry.aName+(entry.bName?' '+entry.bName:''),
  action:()=>{
   if(typeof entry.output==='number'){
    state.matrixView=null;state.screen='matrix-scalar';
    state.result=String(entry.output);state.raw=entry.output;paint();
   }else{
    state.matrices.MatAns=MATRIX.clone(entry.output);
    matrixShow('MatAns',entry.output);
   }
  }
 })),{pageSize:8,kind:'matrix'});
}
function matrixMenu(){
 releaseModifier();
 optionDialog('MATRIX',[
  {key:'1',label:'1. Dim',action:()=>matrixRegisterMenu('Dim')},
  {key:'2',label:'2. Data',action:()=>matrixRegisterMenu('Data')},
  ...MATRIX.NAMES.map((name,i)=>({key:String(i+3),label:(i+3)+'. '+name,action:()=>matrixShow(name)})),
  {key:'6',label:'6. MatAns',action:()=>matrixShow('MatAns')},
  {key:'7',label:'7. Copy',action:()=>matrixCopy()},
  {key:'8',label:'8. Calc',action:()=>optionDialog('MATRIX Calc',[
   {label:'1. Add',action:()=>matrixOperandMenu('add')},
   {label:'2. Multiply',action:()=>matrixOperandMenu('multiply')},
   {label:'3. Det',action:()=>matrixOperandMenu('det')},
   {label:'4. Subtract',action:()=>matrixOperandMenu('subtract')},
   {label:'5. Inverse',action:()=>matrixOperandMenu('inverse')},
   {label:'6. Transpose',action:()=>matrixOperandMenu('transpose')},
   {label:'7. Power',action:()=>matrixOperandMenu('power')},
   {label:'8. Scalar',action:()=>matrixOperandMenu('scalar')},
   {key:'9',label:'9. AbsDet',action:()=>matrixOperandMenu('abs')}
  ],{pageSize:8,kind:'matrix'})},
  {key:'9',label:'History',action:matrixHistoryMenu},
  {key:'0',label:'Expression',action:()=>matrixExpressionInput('')}
 ],{pageSize:8,kind:'matrix'});
}

function matrixTableHandle(key){
 const e=state.matrixEditor;if(!e)return;
 try{
  if(key==='SHIFT'){state.shift=!state.shift;state.alpha=false;paint();return}
  if(key==='ALPHA'){state.alpha=!state.alpha;state.shift=false;paint();return}
  if(state.shift&&key==='4'){matrixCommit();matrixMenu();return}
  if(key==='MODE'){matrixCommit();modeMenu();return}
  if(key==='AC'){matrixClose();return}
  if(key==='DEL'){MATRIX.backspace(e);releaseModifier();paint();return}
  if(key==='NEG'){MATRIX.sign(e);releaseModifier();paint();return}
  if(key==='EQUAL'){
   const done=MATRIX.next(e);MATRIX.set(state.matrices,e.name,e.matrix);
   releaseModifier();if(done)matrixClose();else paint();return;
  }
  if(['UP','DOWN','LEFT','RIGHT'].includes(key)){
   MATRIX.move(e,key==='UP'?-1:key==='DOWN'?1:0,key==='LEFT'?-1:key==='RIGHT'?1:0);
   MATRIX.set(state.matrices,e.name,e.matrix);
   releaseModifier();paint();return;
  }
  let token=null;
  if(/^[0-9]$/.test(key))token=key;
  else if(key==='DOT')token='.';
  else if(key==='EXP')token='E';
  else if(key==='SUB')token='-';
  else if(key==='ADD')token='+';
  else if(key.startsWith('TEXT:')&&/^[0-9.Ee+-]$/.test(key.slice(5)))token=key.slice(5);
  if(token!==null){MATRIX.type(e,token);releaseModifier();paint();return}
  notify('Unsupported matrix editor key',true);paint();
 }catch(err){e.error=String(err.message||'Math ERROR');releaseModifier();notify(e.error,true);paint()}
}
// REA-090: text-based native MATRIX calculation screen and chained MatAns.
function matrixExpressionInput(source){
 state.input=source;state.cursor=source.length;state.editor=STRUCT.fromString(source);
 state.screen='matrix-expression';state.matrixView=null;
 state.result='';releaseModifier();paint();
}
function matrixExpressionInsert(token){
 const source=state.input||'';
 if(source.length+token.length>100)throw Error('Syntax ERROR');
 matrixExpressionInput(source+token);
}
function matrixExpressionCalculate(){
 try{
  const source=state.input;
  const result=MATRIX.expression(state.matrices,source);
  if(typeof result==='number'){
   state.matrixView=null;state.raw=result;state.result=String(result);
   state.screen='matrix-scalar';state.info='';releaseModifier();paint();
  }else matrixShow('MatAns',result);
 }catch(e){error(e.message||'Math ERROR',state.input)}
}
function matrixExpressionSymbols(){
 optionDialog('MATRIX symbols',[
  ...['MatA','MatB','MatC','MatAns'].map((token,i)=>({
   key:String(i+1),label:(i+1)+'. '+token,
   action:()=>matrixExpressionInsert(token)
  })),
  {key:'5',label:'5. det(',action:()=>matrixExpressionInsert('det(')},
  {key:'6',label:'6. Trn(',action:()=>matrixExpressionInsert('Trn(')},
  {key:'7',label:'7. Abs(',action:()=>matrixExpressionInsert('Abs(')}
 ],{pageSize:6,kind:'matrix-symbols'});
}
function matrixExpressionHandle(key){
 if(key==='SHIFT'){state.shift=!state.shift;state.alpha=false;paint();return}
 if(key==='ALPHA'){state.alpha=!state.alpha;state.shift=false;paint();return}
 if(state.shift&&key==='4'){releaseModifier();matrixExpressionSymbols();return}
 if(key==='MODE'){releaseModifier();modeMenu();return}
 if(key==='AC'){matrixExpressionInput('');return}
 if(key==='DEL'){matrixExpressionInput(state.input.slice(0,-1));return}
 if(key==='EQUAL'){matrixExpressionCalculate();return}
 if(state.shift||state.alpha){releaseModifier();notify('Unsupported MATRIX modifier',true);paint();return}
 const ops={ADD:'+',SUB:'-',MUL:'*',POWER:'^',LP:'(',RP:')',DOT:'.',NEG:'-'};
 if(ops[key]){matrixExpressionInsert(ops[key]);return}
 if(/^[0-9]$/.test(key)){matrixExpressionInsert(key);return}
 notify('MATRIX expression: SHIFT 4 symbols, = calculate',true);paint();
}
function matrixResultHandle(key){
 if(key==='SHIFT'){state.shift=!state.shift;paint();return}
 if(state.shift&&key==='4'){matrixMenu();return}
 if(key==='MODE'){modeMenu();return}
 if(key==='AC'){state.matrixView=null;state.screen='edit';releaseModifier();paint();return}
 // A matrix result is an expression operand. Arithmetic starts from MatAns.
 const chaining={ADD:'+',SUB:'-',MUL:'*',POWER:'^'};
 if(chaining[key]&&state.matrixView){
  matrixExpressionInput(state.matrixView.name+chaining[key]);return;
 }
 if(chaining[key]&&state.screen==='matrix-scalar'&&Number.isFinite(state.raw)){
  matrixExpressionInput('('+String(state.raw)+')'+chaining[key]);return;
 }
 if(key==='EQUAL'&&state.matrixView){matrixExpressionInput(state.matrixView.name);return}
 const view=state.matrixView;
 if(view&&['UP','DOWN','LEFT','RIGHT'].includes(key)){
  view.row=Math.max(0,Math.min(view.matrix.rows-1,view.row+(key==='UP'?-1:key==='DOWN'?1:0)));
  view.col=Math.max(0,Math.min(view.matrix.cols-1,view.col+(key==='LEFT'?-1:key==='RIGHT'?1:0)));
  paint();return;
 }
 notify('MATRIX: arrows browse; SHIFT 4 options',true);paint();
}

/* REA-055: named VECTOR data editor, VctAns and memory selection. */
function vectorRegisterMenu(kind){
 optionDialog('VECTOR '+kind,VECTOR.NAMES.map((name,i)=>({
  label:(i+1)+'. '+name,action:()=>kind==='Dim'?vectorDimensionMenu(name):vectorEdit(name)
 })),{pageSize:6,kind:'vector'});
}
function vectorDimensionMenu(name){
 optionDialog(name+' Dimension',[2,3].map((size,i)=>({
  label:(i+1)+'. '+size+'D',action:()=>{VECTOR.set(state.vectors,name,VECTOR.create(size));vectorEdit(name)}
 })),{pageSize:6,kind:'vector'});
}
function vectorEdit(name){
 if(!state.vectors[name]){vectorDimensionMenu(name);return}
 state.vectorEditor=VECTOR.editor(state.vectors,name);
 state.vectorView=null;state.screen='vector-table';releaseModifier();
 notify(name+' vector editor: arrows, = advance, AC save');paint();
}
function vectorPersist(){
 const e=state.vectorEditor;if(!e)return;
 VECTOR.commit(e);VECTOR.set(state.vectors,e.name,e.vector);
}
function vectorClose(){
 vectorPersist();state.vectorEditor=null;state.screen='edit';releaseModifier();
 notify('VECTOR saved; SHIFT 5 options');paint();
}
function vectorShow(name,value=null){
 if(!value&&!state.vectors[name]){
  releaseModifier();notify(name+' undefined; choose Dim',true);
  if(VECTOR.NAMES.includes(name))vectorDimensionMenu(name);
  else vectorMenu();
  return;
 }
 const vector=value?VECTOR.clone(value):VECTOR.get(state.vectors,name);
 state.vectorView={name,vector,index:0};
 state.vectorEditor=null;state.screen='vector-result';releaseModifier();
 notify(name+' vector; arrows inspect; AC return');paint();
}
function vectorRun(op,a,b=null,parameter=null){
 try{
  const result=VECTOR.record(state.vectors,op,a,b,op==='angle'?state.angle:parameter);
  if(typeof result==='number'){
   state.vectorView=null;state.screen='vector-scalar';
   state.raw=result;state.result=String(Number(result.toPrecision(12)));
   const suffix=op==='angle'?(state.angle==='RAD'?' rad':state.angle==='GRA'||state.angle==='GRAD'?' grad':' deg'):'';
   const details=op==='angle'?VECTOR.geometry(VECTOR.get(state.vectors,a),VECTOR.get(state.vectors,b)).relation:'';
   state.vectorScalarInfo=op==='angle'?'Angle'+suffix+' · '+details:op==='abs'?'Magnitude':'Dot product';
   releaseModifier();notify('VECTOR '+op+' '+a+(b?' '+b:'')+' = '+state.result+suffix+(details?' ('+details+')':''));paint();
  }else{state.vectorScalarInfo=null;vectorShow('VctAns',result)}
 }catch(err){releaseModifier();notify(String(err.message||'Math ERROR'),true);vectorMenu()}
}
function vectorScalarStart(name){
 state.vectorParameter={name,buffer:'2',editing:false,error:''};
 state.screen='vector-parameter';releaseModifier();
 notify('VECTOR scalar for '+name+': enter value and press =');paint();
}
function vectorParameterHandle(key){
 const p=state.vectorParameter;if(!p)return;
 if(key==='AC'){state.vectorParameter=null;vectorMenu();return}
 if(key==='MODE'){state.vectorParameter=null;modeMenu();return}
 if(key==='SHIFT'){state.shift=!state.shift;paint();return}
 if(key==='DEL'){if(!p.editing){p.buffer='';p.editing=true}else p.buffer=p.buffer.slice(0,-1);p.error='';paint();return}
 if(key==='NEG'){
  if(!p.editing){p.buffer='-';p.editing=true}
  else p.buffer=p.buffer.startsWith('-')?p.buffer.slice(1):'-'+p.buffer;
  p.error='';paint();return;
 }
 if(key==='EQUAL'){
  try{
   const k=VECTOR.parse(p.buffer);
   const value=VECTOR.record(state.vectors,'scalar',p.name,null,k);
   state.vectorParameter=null;state.vectorScalarInfo=null;vectorShow('VctAns',value);
  }catch(err){p.error=String(err.message||'Math ERROR');notify(p.error,true);paint()}
  return;
 }
 let token=null;
 if(/^[0-9]$/.test(key))token=key;
 else if(key==='DOT')token='.';
 else if(key==='EXP')token='E';
 else if(key==='SUB')token='-';
 else if(key==='ADD')token='+';
 else if(key.startsWith('TEXT:')&&/^[0-9Ee.+-]$/.test(key.slice(5)))token=key.slice(5);
 if(token!==null){
  if(!p.editing){p.buffer='';p.editing=true}
  if(p.buffer.length<28)p.buffer+=token;
  p.error='';paint();return;
 }
 notify('Enter a numeric scalar',true);paint();
}
function vectorOperandMenu(op,a=null){
 const names=VECTOR.NAMES.filter(name=>!!state.vectors[name]);
 if(!names.length){vectorRegisterMenu('Dim');return}
 optionDialog('VECTOR '+op+' '+(a||''),names.map(name=>({
  label:name,action:()=>a?vectorRun(op,a,name):op==='abs'?vectorRun(op,name):op==='scalar'?vectorScalarStart(name):vectorOperandMenu(op,name)
 })),{pageSize:6,kind:'vector'});
}
function vectorCopy(from=null){
 if(!from){
  const names=[...VECTOR.NAMES,'VctAns'].filter(name=>!!state.vectors[name]);
  if(!names.length){vectorRegisterMenu('Dim');return}
  optionDialog('Vector copy from',names.map(name=>({label:name,action:()=>vectorCopy(name)})),
   {pageSize:6,kind:'vector'});
  return;
 }
 optionDialog('Copy '+from+' to',VECTOR.NAMES.filter(name=>name!==from).map(name=>({
  label:name,action:()=>{VECTOR.copy(state.vectors,from,name);vectorEdit(name)}
 })),{pageSize:6,kind:'vector'});
}
function vectorHistoryMenu(){
 const h=state.vectors.history.slice().reverse();
 if(!h.length){notify('No VECTOR history',true);vectorMenu();return}
 optionDialog('VECTOR History',h.map((entry,i)=>({
  label:(i+1)+'. '+entry.operator+' '+entry.aName+(entry.bName?' '+entry.bName:''),
  action:()=>{
   if(typeof entry.output==='number'){
    state.vectorView=null;state.screen='vector-scalar';
    state.raw=entry.output;state.result=String(entry.output);paint();
   }else{
    state.vectors.VctAns=VECTOR.clone(entry.output);
    vectorShow('VctAns',entry.output);
   }
  }
 })),{pageSize:8,kind:'vector'});
}
function vectorMenu(){
 releaseModifier();
 optionDialog('VECTOR',[
  {key:'1',label:'1. Dim',action:()=>vectorRegisterMenu('Dim')},
  {key:'2',label:'2. Data',action:()=>vectorRegisterMenu('Data')},
  ...VECTOR.NAMES.map((name,i)=>({key:String(i+3),label:(i+3)+'. '+name,action:()=>vectorShow(name)})),
  {key:'6',label:'6. VctAns',action:()=>vectorShow('VctAns')},
  {key:'7',label:'7. Copy',action:()=>vectorCopy()},
  {key:'8',label:'8. Calc',action:()=>optionDialog('VECTOR Calc',[
   {label:'1. Dot',action:()=>vectorOperandMenu('dot')},
   {label:'2. Cross',action:()=>vectorOperandMenu('cross')},
   {label:'3. Abs',action:()=>vectorOperandMenu('abs')},
   {label:'4. Add',action:()=>vectorOperandMenu('add')},
   {label:'5. Subtract',action:()=>vectorOperandMenu('subtract')},
   {label:'6. Scalar',action:()=>vectorOperandMenu('scalar')},
   {label:'7. Angle',action:()=>vectorOperandMenu('angle')}
  ],{pageSize:8,kind:'vector'})},
  {key:'9',label:'9. History',action:vectorHistoryMenu}
 ],{pageSize:8,kind:'vector'});
}
function vectorTableHandle(key){
 const e=state.vectorEditor;if(!e)return;
 try{
  if(key==='SHIFT'){state.shift=!state.shift;state.alpha=false;paint();return}
  if(key==='ALPHA'){state.alpha=!state.alpha;state.shift=false;paint();return}
  if(state.shift&&key==='5'){vectorPersist();vectorMenu();return}
  if(key==='MODE'){vectorPersist();modeMenu();return}
  if(key==='AC'){vectorClose();return}
  if(key==='DEL'){VECTOR.backspace(e);releaseModifier();paint();return}
  if(key==='NEG'){VECTOR.sign(e);releaseModifier();paint();return}
  if(key==='EQUAL'){
   const done=VECTOR.next(e);VECTOR.set(state.vectors,e.name,e.vector);
   releaseModifier();if(done)vectorClose();else paint();return;
  }
  if(['UP','DOWN','LEFT','RIGHT'].includes(key)){
   VECTOR.move(e,key==='UP'||key==='LEFT'?-1:1);
   VECTOR.set(state.vectors,e.name,e.vector);
   releaseModifier();paint();return;
  }
  let token=null;
  if(/^[0-9]$/.test(key))token=key;
  else if(key==='DOT')token='.';
  else if(key==='EXP')token='E';
  else if(key==='SUB')token='-';
  else if(key==='ADD')token='+';
  else if(key.startsWith('TEXT:')&&/^[0-9.Ee+-]$/.test(key.slice(5)))token=key.slice(5);
  if(token!==null){VECTOR.type(e,token);releaseModifier();paint();return}
  notify('Unsupported vector editor key',true);paint();
 }catch(err){e.error=String(err.message||'Math ERROR');releaseModifier();notify(e.error,true);paint()}
}
function vectorResultHandle(key){
 if(key==='SHIFT'){state.shift=!state.shift;paint();return}
 if(state.shift&&key==='5'){vectorMenu();return}
 if(key==='MODE'){modeMenu();return}
 if(key==='AC'){state.vectorView=null;state.screen='edit';releaseModifier();paint();return}
 const view=state.vectorView;
 if(view&&['UP','DOWN','LEFT','RIGHT'].includes(key)){
  view.index=Math.max(0,Math.min(view.vector.dimension-1,view.index+(key==='UP'||key==='LEFT'?-1:1)));
  paint();return;
 }
 notify('VECTOR result: arrows browse, SHIFT 5 options',true);paint();
}
// REA-057: synchronized two-function TABLE with native LCD grid.
function tableStart(previous=null){
 const dual=TABLE.dualEnabled(state.model,state.tableFunctions);
 const defaults=previous||state.tableDraft||{};
 const fields=[
  {id:'expression',label:'f(X)',value:defaults.expression??'X^2-2'},
  ...(dual?[{id:'expression2',label:'g(X)',value:defaults.expression2??'X+1'}]:[]),
  {id:'start',label:'Start',value:defaults.start??'1'},
  {id:'end',label:'End',value:defaults.end??'5'},
  {id:'step',label:'Step',value:defaults.step??'1'}
 ];
 state.tableData=null;
 fieldForm('TABLE '+(dual?'f(X),g(X)':'f(X)'),fields,data=>{
  // Validate excluded function families before evaluating table cells.
  const expression=TABLE.validateExpression(data.expression);
  const expression2=dual?TABLE.validateExpression(data.expression2):null;
  const rangeValue=source=>{
   // The original TABLE prompts accept numeric calculations as range values.
   const v=M.evaluate(String(source),{...state,math:false,ans:state.ans,
    memory:{...state.memory}});
   if(typeof v!=='number'||!Number.isFinite(v))throw Error('Argument ERROR');
   return v;
  };
  const start=rangeValue(data.start),end=rangeValue(data.end),step=rangeValue(data.step);
  const fn=functionFor(expression);
  const gn=dual?functionFor(expression2):null;
  const table=TABLE.generate({model:state.model,count:dual?2:1,start,end,
   step,f:fn,g:gn});
  // Failed validation or generation never overwrites X, table or the draft.
  state.tableData=table;
  state.tableDraft={...data};
  state.memory.X=table.rows[table.rows.length-1].x;
  delete state.complexMemory.X;
  return '';
 });
}
function tableHandle(key){
 const t=state.tableData;if(!t)return;
 if(key==='MODE'){modeMenu();return}
 if(key==='AC'||key==='EQUAL'){tableStart({...state.tableDraft});return}
 if(['UP','DOWN','LEFT','RIGHT'].includes(key)){
  TABLE.navigate(t,key==='UP'?-1:key==='DOWN'?1:0,
   key==='LEFT'?-1:key==='RIGHT'?1:0);
  state.info='';paint();return;
 }
 notify('TABLE: arrows navigate; AC edits input',true);paint();
}
// REA-059: dedicated INEQ coefficient editor and special-case result paging.
function ineqTypeMenu(){
 optionDialog('INEQ degree',[
  {key:'1',label:'1. Quadratic',action:()=>ineqRelationMenu(2)},
  {key:'2',label:'2. Cubic',action:()=>ineqRelationMenu(3)}
 ],{pageSize:6,kind:'ineq-type'});
}
function ineqRelationMenu(degree){
 const ops=['>','<','>=','<='];
 optionDialog('INEQ '+degree+' relation',ops.map((op,i)=>({
  key:String(i+1),label:(i+1)+'. f(X) '+op+' 0',
  action:()=>ineqStart(degree,op)
 })),{pageSize:6,kind:'ineq-relation'});
}
function ineqStart(degree,op,previous=null){
 if(![2,3].includes(degree)||!INEQ.OPS.includes(op))throw Error('Argument ERROR');
 const coefficients=EQEDIT.create(degree===2?'QUAD':'CUBIC');
 if(previous){for(const name of coefficients.rows.flat())if(previous[name]!==undefined)coefficients.values[name]=Number(previous[name])}
 else coefficients.values.a=1;
 EQEDIT.restore(coefficients);
 state.ineqEditor={degree,operator:op,coefficients};
 state.ineqSession=null;
 state.screen='ineq-coeff';state.result='';state.info='';releaseModifier();
 notify('INEQ coefficients: arrows navigate; = next / solve; AC clears');paint();
}
function ineqSolve(){
 const e=state.ineqEditor;if(!e)return;
 const c=e.coefficients;EQEDIT.commit(c);
 const fields=c.rows.flat(),values=fields.map(name=>c.values[name]);
 const solved=INEQ.solve(values,e.operator);
 const snapshot=Object.fromEntries(fields.map(name=>[name,c.values[name]]));
 state.ineqSession=INEQDISPLAY.session(e.degree,e.operator,snapshot,solved,state.math);
 state.result=state.ineqSession.pages[0].text;
 state.raw=NaN;state.screen='ineq-result';state.info='';releaseModifier();
 notify('INEQ: = or DOWN next; AC returns coefficients');paint();
}
function ineqCoeffHandle(key){
 const parent=state.ineqEditor;if(!parent)return;
 const e=parent.coefficients;
 try{
  if(key==='MODE'){modeMenu();return}
  if(key==='SHIFT'){state.shift=!state.shift;state.alpha=false;paint();return}
  if(key==='ALPHA'){state.alpha=!state.alpha;state.shift=false;paint();return}
  if(key==='AC'){EQEDIT.clear(e);releaseModifier();notify('INEQ coefficients cleared');paint();return}
  if(key==='UP'){EQEDIT.move(e,-1,0);releaseModifier();paint();return}
  if(key==='DOWN'){EQEDIT.move(e,1,0);releaseModifier();paint();return}
  if(key==='LEFT'){EQEDIT.move(e,0,-1);releaseModifier();paint();return}
  if(key==='RIGHT'){EQEDIT.move(e,0,1);releaseModifier();paint();return}
  if(key==='DEL'){EQEDIT.backspace(e);releaseModifier();paint();return}
  if(key==='EQUAL'){
   const done=EQEDIT.next(e);releaseModifier();
   if(done)ineqSolve();else paint();return;
  }
  if(key==='NEG'){EQEDIT.sign(e);releaseModifier();paint();return}
  let token=null;
  if(/^[0-9]$/.test(key))token=key;
  else if(key==='DOT')token='.';
  else if(key==='EXP')token='E';
  else if(key==='SUB')token='-';
  else if(key==='ADD')token='+';
  else if(key.startsWith('TEXT:')&&/^[0-9.Ee+-]$/.test(key.slice(5)))token=key.slice(5);
  if(token!==null){EQEDIT.enter(e,token);releaseModifier();paint();return}
  releaseModifier();notify('Unsupported INEQ coefficient key',true);paint();
 }catch(err){e.error=String(err.message||'Math ERROR');releaseModifier();notify(e.error,true);paint()}
}
function ineqResultHandle(key){
 const session=state.ineqSession,e=state.ineqEditor;
 if(!session||!e)return;
 if(key==='MODE'){modeMenu();return}
 if(key==='AC'){EQEDIT.restore(e.coefficients);state.screen='ineq-coeff';state.info='';releaseModifier();paint();return}
 if(['EQUAL','DOWN','RIGHT'].includes(key)){
  if(session.index+1>=session.pages.length){
   EQEDIT.restore(e.coefficients);state.screen='ineq-coeff';state.info='';paint();return;
  }
  INEQDISPLAY.page(session,1,state.math);
 }else if(['UP','LEFT'].includes(key))INEQDISPLAY.page(session,-1,state.math);
 else{notify('INEQ: = next; AC coefficients');paint();return}
 state.result=session.pages[session.index].text;state.info='';paint();
}
// REA-060: one editable chained relation with relational-key insertions.
function verifyStart(initial='1<2<3'){
 fieldForm('VERIF chained relations',[{id:'expression',label:'Relation chain',value:initial}],d=>{
  const evaluated=VERIFY.evaluate(d.expression,part=>M.evaluate(part,{
   ...state,memory:{...state.memory},ans:state.ans
  }));
  applyAdvancedResult(evaluated.result?1:0,'VERIF '+d.expression);
  return evaluated.text;
 });
}
function verifyInsertRelation(operator){
 const f=state.flow;
 if(state.mode!=='VERIF'||!f||f.fields[f.index].id!=='expression')return;
 if(!VERIFY.OPERATORS.includes(operator))return;
 if(!f.editing){f.buffer='';f.cursor=0;f.editing=true}
 const at=f.cursor??f.buffer.length;
 const rest=state.insert?f.buffer.slice(at):f.buffer.slice(at+operator.length);
 if(f.buffer.length+operator.length>170){notify('Input limit',true);return}
 f.buffer=f.buffer.slice(0,at)+operator+rest;
 f.cursor=at+operator.length;
 state.screen='prompt';state.info='';releaseModifier();paint();
}
function verifyRelationMenu(){
 const operators=['=','!=','<','<=','>','>='];
 optionDialog('VERIF Relations',operators.map((operator,index)=>({
  key:String(index+1),label:(index+1)+'. '+operator,
  action:()=>verifyInsertRelation(operator)
 })),{pageSize:6,kind:'verify-relations'});
}
// REA-061 — seven scalar DIST types in the documented CASIO order.
function distMenu(){
 optionDialog('DIST type',DIST.TYPES.map((spec,i)=>({
  label:(i+1)+'. '+spec.label,action:()=>DISTLIST.supported(spec.id)?distInputMenu(spec.id):distStart(spec.id)
 })),{pageSize:4,kind:'dist-type'});
}
// REA-062: CASIO Var/List selection for the four discrete distributions.
function distInputMenu(type){
 optionDialog('DIST '+type+' input',[
  {key:'1',label:'1. Var',action:()=>distStart(type)},
  {key:'2',label:'2. List',action:()=>distListStart(type)}
 ],{pageSize:6,kind:'dist-input'});
}
function distListStart(type){
 if(!DISTLIST.supported(type))throw Error('Argument ERROR');
 const previous=state.distList;
 state.distList=previous&&previous.type===type?previous:DISTLIST.create(type);
 state.distType=type;state.distListParams=null;
 state.screen='dist-list';state.flow=null;state.info='';releaseModifier();
 notify('DIST List: enter X, = next; CALC calculate; SHIFT 1 Edit');paint();
}
function distListEditMenu(){
 optionDialog('DIST Edit',[
  {key:'1',label:'1. Ins',action:()=>{
   try{DISTLIST.insert(state.distList);state.screen='dist-list';paint()}
   catch(e){state.screen='dist-list';notify(e.message,true);paint()}
  }},
  {key:'2',label:'2. Del-A',action:()=>{DISTLIST.clear(state.distList);state.screen='dist-list';paint()}},
  {key:'3',label:'3. Type',action:distMenu},
  {key:'4',label:'4. Calc',action:distListCalculate}
 ],{pageSize:6,kind:'dist-edit'});
}
function distListCalculate(){
 const editor=state.distList;if(!editor)return;
 try{
  if(editor.inserting)DISTLIST.commitInsertion(editor);
  else DISTLIST.save(editor);
  if(!editor.samples.length)throw Error('Argument ERROR');
  const spec=DIST.TYPES.find(x=>x.id===editor.type);
  const params=spec.params.filter(name=>name!=='x');
  const old=state.distListParams||{};
  fieldForm('DIST List '+spec.label,params.map(name=>({
   id:name,label:{n:'N',p:'p',mu:'μ'}[name],
   value:old[name]??spec.defaults[spec.params.indexOf(name)]
  })),data=>{
   const numeric={};
   for(const name of params){
    if(!String(data[name]??'').trim())throw Error('Argument ERROR');
    numeric[name]=M.evaluate(String(data[name]),{...state,math:false,memory:{...state.memory},ans:state.ans});
   }
   // Parameter errors invalidate the whole calculation; row errors are
   // shown as ERROR in Ans, without discarding other valid rows.
   // Validate distribution parameters independently from each list sample.
   // Invalid sample X values produce individual ERROR cells.
   DIST.calculate(editor.type,{...numeric,x:0});
   DISTLIST.evaluate(editor,numeric,DIST);
   state.distListParams={...data};
   state.screen='dist-list';state.flow=null;
   notify('DIST List results: X / Ans; arrows navigate');paint();
   return '';
  });
 }catch(e){editor.error=String(e.message||'Math ERROR');state.screen='dist-list';notify(editor.error,true);paint()}
}
function distListHandle(key){
 const e=state.distList;if(!e)return;
 try{
  if(key==='MODE'){modeMenu();return}
  if(key==='SHIFT'){state.shift=!state.shift;paint();return}
  if(state.shift&&key==='1'){releaseModifier();distListEditMenu();return}
  if(key==='CALC'){distListCalculate();return}
  if(key==='AC'){
   if(e.inserting){DISTLIST.cancelInsertion(e);paint();return}
   if(e.editing){DISTLIST.load(e);paint();return}
   distInputMenu(e.type);return;
  }
  if(key==='DEL'){
   if(e.inserting){DISTLIST.backspace(e);paint();return}
   if(e.editing){DISTLIST.backspace(e);paint();return}
   DISTLIST.remove(e);paint();return;
  }
  if(key==='NEG'){DISTLIST.sign(e);paint();return}
  if(key==='EQUAL'){
   if(e.inserting)DISTLIST.commitInsertion(e);
   else DISTLIST.next(e);
   paint();return;
  }
  if(['UP','DOWN','LEFT','RIGHT'].includes(key)){
   if(e.inserting)DISTLIST.commitInsertion(e);
   DISTLIST.move(e,key==='UP'?-1:key==='DOWN'?1:0,
      key==='LEFT'?-1:key==='RIGHT'?1:0);
   paint();return;
  }
  let token=null;
  if(/^[0-9]$/.test(key))token=key;
  else if(key==='DOT')token='.';
  else if(key==='EXP')token='E';
  else if(key==='SUB')token='-';
  else if(key==='ADD')token='+';
  else if(key.startsWith('TEXT:')&&/^[0-9Ee.+-]$/.test(key.slice(5)))token=key.slice(5);
  if(token!==null){
   if(e.column===1)e.column=0;
   DISTLIST.edit(e,token);paint();return;
  }
  notify('DIST List: = save; DEL remove; CALC calculate',true);paint();
 }catch(err){e.error=String(err.message||'Math ERROR');releaseModifier();notify(e.error,true);paint()}
}
function distStart(type,previous=null){
 const spec=DIST.TYPES.find(item=>item.id===type);if(!spec)throw Error('Argument ERROR');
 state.distType=type;
 const restored=previous||{};
 fieldForm('DIST '+spec.label,spec.params.map((param,i)=>({
  id:param,label:({x:'x',sigma:'σ',mu:'μ',lower:'Lower',upper:'Upper',area:'Area',n:'N',p:'p'}[param]),
  value:restored[param]??spec.defaults[i]
 })),data=>{
  // Expressions are evaluated using the same calculator arithmetic settings,
  // then checked by the distribution engine for the selected type/domain.
  const values={};
  for(const param of spec.params){
   if(!String(data[param]??'').trim())throw Error('Argument ERROR');
   values[param]=M.evaluate(String(data[param]),{...state,math:false,memory:{...state.memory},ans:state.ans});
  }
  const result=DIST.calculate(type,values);
  // No side effects until the full computation has succeeded.
  state.distDraft={type,values:{...data}};
  applyAdvancedResult(result,'DIST '+spec.label);
  return M.format(result,{...state,math:false});
 });
}
function distFlowHandle(key){
 if(key==='MODE'&&state.shift){releaseModifier();setupMenu();return true}
 if(key==='MODE'){modeMenu();return true}
 if(key==='SHIFT'){state.shift=!state.shift;paint();return true}
 if(state.shift&&key==='1'){releaseModifier();distMenu();return true}
 return false;
}
function advancedMode(mode){
 if(mode==='STAT')return statModeMenu();
 if(mode==='CMPLX'){notify('Enter expressions; ALPHA + ENG inserts i');paint();return}
 if(mode==='BASE-N'){state.baseRadix='DEC';state.baseValue=0;state.screen='edit';notify('BASE-N Dec · x² DEC; x⁻¹ HEX; log BIN; ln OCT');paint();return}
  if(mode==='EQN')return eqnTypeMenu();
  if(mode==='MATRIX')return matrixRegisterMenu('Dim');
  if(mode==='VECTOR')return vectorRegisterMenu('Dim');
  if(mode==='TABLE')return tableStart();
  if(mode==='INEQ')return ineqTypeMenu();
  if(mode==='VERIF')return verifyStart();
  if(mode==='DIST')return distMenu();
}
function alphaKey(key){
 if(key==='INTEGRAL')return insert('Prod(');
 if(key==='LOGBASE'){numericalFlow('PRODUCT');return true}
 if(key==='FRAC')return insert('÷R');
 if(key==='SQRT'){
  if(!state.math||!state.input.endsWith('.')){notify('Use decimal point before recurring digits',true);paint();return true}
  return insertTemplate('recurring');
 }
 if(key==='ENG')return insert(':'); // ALPHA ENG is colon; plain CMPLX ENG inserts i
 if(key==='MUL')return insert('GCD(');
 if(key==='DIV')return insert('LCM(');
 if(key==='ADD')return insert('Int(');
 if(key==='SUB')return insert('Intg(');
 const variables={NEG:'A',DMS:'B',HYP:'C',SIN:'D',COS:'E',TAN:'F',LP:'X',RP:'Y',MPLUS:'M'};
 if(variables[key]){
  if(!registerAllowed(variables[key])){notify('Register unavailable on this model',true);paint();return true}
  return insert(variables[key]);
 }
 if(key==='EXP')return insert('e');if(key==='DOT')return insert('RanInt#(');
 if(key==='ANS'){
  if(state.mode!=='COMP'){notify('PreAns requires COMP mode',true);paint();return true}
  return insert('PreAns');
 }
 if(key==='CALC')return insert('=');return null
}
function complexMenu(){
 // SHIFT 2: match the documented CMPLX function ordering.
 const fromResult=state.screen==='result';
 const emit=(text,command=false)=>{
  // Opening a new CMPLX function from a displayed result must not append
  // the function name to the old calculation. Suffixes can convert Ans.
  if(fromResult)loadExpression(command?'Ans'+text:text);
  else insert(text);
 };
 releaseModifier();optionDialog('CMPLX',[
  {key:'1',label:'1. arg',action:()=>emit('arg(')},
  {key:'2',label:'2. Conjg',action:()=>emit('conj(')},
  {key:'3',label:'3. ►r∠θ',action:()=>emit('►r∠θ',true)},
  {key:'4',label:'4. ►a+bi',action:()=>emit('►a+bi',true)}
 ]);
}
// REA-063: physical SHIFT+7, then two-digit 01-40 constant code.
function constantStart(){
 if(state.mode==='BASE-N'){
  releaseModifier();notify('Scientific constants unavailable in BASE-N',true);paint();return;
 }
 state.constantCode=CONST.codeEditor();
 state.screen='constant-code';releaseModifier();
 notify('CONST 01-40: enter a two-digit manufacturer code');paint();
}
function constantCodeHandle(key){
 const editor=state.constantCode;if(!editor)return;
 if(key==='MODE'){state.constantCode=null;modeMenu();return}
 if(key==='AC'){state.constantCode=null;state.screen='edit';releaseModifier();paint();return}
 if(key==='DEL'||key==='LEFT'){CONST.backspace(editor);paint();return}
 if(['RIGHT','UP','DOWN'].includes(key)){notify('Enter two decimal digits (01-40)',true);paint();return}
 if(/^[0-9]$/.test(key)){
  try{
   const item=CONST.type(editor,key,state.model);
   if(!item){paint();return}
   const literal=CONST.literal(item);
   state.constantCode=null;state.screen='edit';releaseModifier();
   insert(literal);
   notify('CONST '+item.code+' '+item.symbol+' = '+item.value+' '+item.unit);
  }catch(error){
   editor.error=String(error.message||'Argument ERROR');
   editor.buffer='';notify('CONST: '+editor.error+' (01-40)',true);paint();
  }
  return;
 }
 notify('CONST: choose digits 01-40',true);paint();
}
// REA-064: SHIFT+8 CONV, two digit manufacturer code, then postfix transform.
function conversionStart(){
 if(state.mode==='BASE-N'||state.mode==='TABLE'){
  releaseModifier();notify('CONV unavailable in BASE-N / TABLE',true);paint();return;
 }
 if(state.screen!=='edit'&&state.screen!=='result'){
  releaseModifier();notify('CONV requires an expression',true);paint();return;
 }
 state.conversionCode=CONV.editor();
 state.conversionCode.source=state.input;
 state.conversionCode.position=state.cursor;
 state.conversionCode.origin=state.screen;
 state.screen='conversion-code';releaseModifier();
 notify('CONVERSION 01-40: enter two-digit code');paint();
}
function conversionCodeHandle(key){
 const editor=state.conversionCode;if(!editor)return;
 if(key==='MODE'){state.conversionCode=null;modeMenu();return}
 if(key==='AC'){
  state.screen=editor.origin;state.conversionCode=null;releaseModifier();paint();return;
 }
 if(key==='DEL'||key==='LEFT'){CONV.backspace(editor);paint();return}
 if(/^[0-9]$/.test(key)){
  try{
   const command=CONV.digit(editor,key,state.model);
   if(!command){paint();return}
   if(state.editor.path.length)throw Error('Syntax ERROR');
   const original=editor.source;
   const position=editor.origin==='result'?original.length:Math.max(0,Math.min(original.length,editor.position));
   const leading=original.slice(0,position),trailing=original.slice(position);
   const replacement=CONV.insert(leading,command)+trailing;
   // Atomically replace the expression; invalid entry leaves the source untouched.
   state.editor=STRUCT.fromString(replacement);
   state.screen='edit';state.conversionCode=null;releaseModifier();
   syncEditor();notify('CONV '+command.code+' '+command.from+' → '+command.to);paint();
  }catch(e){editor.error=String(e.message||'Syntax ERROR');editor.buffer='';notify('CONV: '+editor.error+' (01-40)',true);paint()}
  return;
 }
 notify('CONV: choose a code 01-40',true);paint();
}
// DRG▶ specifies the unit of the preceding operand; the global SETUP
// angle setting is intentionally unchanged. 1: degrees, 2: radians,
// 3: grads. MENU cancellation retains the editor/result and unit.
function drgMenu(){
 if(state.mode!=='COMP'){
  releaseModifier();notify('DRG requires COMP mode',true);paint();return;
 }
 const fromResult=state.screen==='result';
 const append=suffix=>{
  // When invoked from a displayed result, use Ans as a complete operand.
  // A postfix on a bare identifier would otherwise tokenize as "Ansr".
  if(fromResult)loadExpression('(Ans)');
  insert(suffix);
 };
 releaseModifier();
 optionDialog('DRG▶',[
  {key:'1',label:'1. ° (Deg)',action:()=>append('°')},
  {key:'2',label:'2. r (Rad)',action:()=>append('r')},
  {key:'3',label:'3. g (Gra)',action:()=>append('g')}
 ],{kind:'normal',pageSize:3});
}
function shifted(key){
 if(state.mode==='CMPLX'&&key==='2'){complexMenu();return true}
 if(state.mode==='CMPLX'&&key==='NEG'){releaseModifier();insert('∠');return true}
 if(state.hyp&&['SIN','COS','TAN'].includes(key)){
  const map={SIN:'asinh(',COS:'acosh(',TAN:'atanh('};
  state.hyp=false;releaseModifier();insert(map[key]);return true;
 }
 const n=Number(key);
 if(key==='AC'){powerOff();return true}
 if(key==='MODE'){releaseModifier();setupMenu();return true}
 if(key==='RCL'){releaseModifier();memoryDialog(true);return true}
 if(key==='DEL'){
  if(state.math&&state.mode==='COMP'){
   state.captureTemplate=!state.captureTemplate;
   releaseModifier();notify(state.captureTemplate?
    'MathIO INS: place cursor before an operand, then choose fraction/root':
    'MathIO INS cancelled');paint();return true;
  }
  state.insert=!state.insert;releaseModifier();
  notify(state.insert?'Insert mode':'Overwrite mode');paint();return true;
 }
 if(key==='9'){clearMenu();return true}
 if(key==='7'){constantStart();return true}
 if(key==='8'){conversionStart();return true}
 if(key==='CALC'){releaseModifier();numericalFlow('SOLVE');return true}
 if(key==='INTEGRAL'){releaseModifier();insertCalculusTemplate('derivative');return true}
 if(key==='LOGBASE'){releaseModifier();insertCalculusTemplate('summation');return true}
 if(key==='FRAC'){releaseModifier();insertTemplate('mixed');return true}
 if(key==='SQRT'){releaseModifier();insertTemplate('cubeRoot');return true}
 if(key==='POWER'){releaseModifier();insertTemplate('nthRoot');return true}
 const insertions={RECIP:'!',SQUARE:'^3',LOG:'10^(',LN:'exp(',SIN:'asin(',COS:'acos(',TAN:'atan(',EXP:'pi',
  HYP:'abs(',NEG:'',DMS:'',SD:'',MPLUS:'',ENG:'',LP:'%',RP:',',ANS:'',MUL:'',DIV:'',ADD:'',SUB:'',DOT:''};
 if(key==='MPLUS'){accumulateMemory(-1);return true}
 if(key==='SD'){releaseModifier();toggleMixed();return true}
 if(key==='ENG'){releaseModifier();if(state.screen==='result')showEngineering(1);return true}
 if(key==='DMS'){releaseModifier();if(state.screen==='result')factorResult();return true}
 if(key==='ANS'){drgMenu();return true}
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
 // Rdec S⇔D cycling is exclusive to the PLUS C model.
 // Original ES and standard PLUS always use ordinary fraction/decimal.
 const recurring=state.model==='fx-991es-plus-c'&&state.recurringDecimal&&state.ansRational?
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
 if(state.screen==='calculating'){
  if(key==='AC'||key==='MODE'||key==='ON'){
   cancelNumeric();state.flow=null;state.solveSession=null;
   state.screen='edit';state.info='';releaseModifier();
   if(key==='MODE')modeMenu();
   else if(key==='ON')powerOn();
   else{notify('Calculation cancelled');paint()}
  }
  return;
 }
 if(state.pendingMemory){
  if(key==='AC'){state.pendingMemory=null;releaseModifier();notify('Memory selection cancelled');paint();return}
  const name=MEMORY_KEYS[key]||(/^[A-FMXY]$/.test(key)?key:null);
  if(name){memorySelect(name);return}
  notify('Choose '+registerNames(),true);paint();return;
 }
 if(key==='ON'){powerOn();return}
 if(!state.power)return;
 // REA-073: scoped browser Ctrl+Z. No invented physical CASIO key.
 if(key==='UNDO'){
  if(state.screen==='edit'&&STRUCT.undo(state.editor)){
   clearReplay();syncEditor();releaseModifier();
   notify('Last textbook edit undone');paint();
  }else{notify('Nothing to undo');paint()}
  return;
 }
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
 if(state.screen==='conversion-code'){conversionCodeHandle(key);return}
 if(state.screen==='constant-code'){constantCodeHandle(key);return}
 if(state.screen==='menu'){menuHandle(key);return}
 if(state.mode==='TABLE'&&state.screen==='table-grid'){tableHandle(key);return}
 if(state.mode==='VECTOR'&&state.screen==='vector-table'){vectorTableHandle(key);return}
 if(state.mode==='VECTOR'&&state.screen==='vector-parameter'){vectorParameterHandle(key);return}
 if(state.mode==='VECTOR'&&['vector-result','vector-scalar'].includes(state.screen)){vectorResultHandle(key);return}
 if(state.mode==='VECTOR'&&state.screen==='edit'){
  if(key==='SHIFT'){state.shift=!state.shift;paint();return}
  if(state.shift&&key==='5'){vectorMenu();return}
  if(key==='MODE'){modeMenu();return}
  if(key==='AC'){state.result='';releaseModifier();paint();return}
  vectorMenu();return;
 }
 if(state.mode==='MATRIX'&&state.screen==='matrix-expression'){matrixExpressionHandle(key);return}
 if(state.mode==='MATRIX'&&state.screen==='matrix-table'){matrixTableHandle(key);return}
 if(state.mode==='MATRIX'&&state.screen==='matrix-parameter'){matrixParameterHandle(key);return}
 if(state.mode==='MATRIX'&&['matrix-result','matrix-scalar'].includes(state.screen)){matrixResultHandle(key);return}
 if(state.mode==='MATRIX'&&state.screen==='edit'){
  if(key==='SHIFT'){state.shift=!state.shift;paint();return}
  if(state.shift&&key==='4'){matrixMenu();return}
  if(key==='MODE'){modeMenu();return}
  if(key==='AC'){state.result='';releaseModifier();paint();return}
  if(key==='EQUAL'){matrixExpressionInput('MatAns');return}
  matrixMenu();return;
 }
 if(state.screen==='ineq-result'){ineqResultHandle(key);return}
 if(state.screen==='ineq-coeff'){ineqCoeffHandle(key);return}
 if(state.screen==='eqn-result'){eqnResultHandle(key);return}
 if(state.screen==='eqn-coeff'){eqnCoeffHandle(key);return}
 if(state.mode==='BASE-N'){baseHandle(key);return}
 if(state.screen==='stat-table'){statTableHandle(key);return}
 if(state.mode==='DIST'&&state.screen==='dist-list'){distListHandle(key);return}
 if(state.mode==='DIST'&&state.screen==='prompt'&&state.flow.title.startsWith('DIST List')&&key==='AC'){
  state.flow=null;state.screen='dist-list';releaseModifier();paint();return;
 }
 if(state.mode==='DIST'&&state.screen==='prompt'&&distFlowHandle(key))return;
 if(state.screen==='prompt'){flowHandle(key);return}
 if(state.screen==='flow-result'){
  if(state.solveSession&&state.mode==='COMP'){
   if(key==='EQUAL'&&state.solveSession.pending){continueSolve();return}
   if(key==='EQUAL'||key==='CALC'){startSolve();return}
   if(key==='AC'){
    state.solveSession=null;state.screen='edit';state.outputLines=[];
    state.outputPage=0;state.viewport.flowX=0;releaseModifier();paint();return;
   }
  }
  if(state.mode==='DIST'){
   if(key==='MODE'){modeMenu();return}
   if(key==='SHIFT'){state.shift=!state.shift;paint();return}
   if(state.shift&&key==='1'){releaseModifier();distMenu();return}
   if((key==='EQUAL'||key==='AC')&&state.distDraft){distStart(state.distDraft.type,state.distDraft.values);return}
  }
  if(state.mode==='STAT'&&state.statTable&&key==='SHIFT'){state.shift=!state.shift;paint();return}
  if(state.mode==='STAT'&&state.statTable&&state.shift&&key==='1'){statMenu();return}
  if(key==='UP'||key==='DOWN'){
   state.outputPage=Math.max(0,Math.min(VIEW.pageCount(state.outputLines)-1,state.outputPage+(key==='DOWN'?1:-1)));
   state.viewport.flowX=0;paint();return;
  }
  if(key==='LEFT'||key==='RIGHT'){
   const view=VIEW.scrollLine(state.outputLines,state.outputPage,state.viewport.flowX);
   state.viewport.flowX=Math.max(0,Math.min(view.max,state.viewport.flowX+(key==='RIGHT'?4:-4)));
   paint();return;
  }
  if(key==='AC'){state.screen=state.mode==='STAT'&&state.statTable?'stat-table':'edit';state.outputLines=[];state.viewport.flowX=0;state.info='';paint();return}
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
 // The STAT calculation screen must use SHIFT+1 for its STAT command
 // menu, not the general COMP-mode shortcut for selecting STAT again.
 // This route preserves the entered observations and their frequency.
 if(state.mode==='STAT'&&state.statTable&&state.shift&&key==='1'&&
    ['edit','result'].includes(state.screen)){
  releaseModifier();statMenu();return;
 }
 // REA-081: never execute a SHIFT/ALPHA action missing from the selected
 // model legend or restricted by this physical mode/result context.
 if((state.shift||state.alpha)&&!['SHIFT','ALPHA'].includes(key)&&
   ['edit','result'].includes(state.screen)){
  const physical=K.keysForModel(state.model).find(item=>item.id===key);
  if(physical){
   const modifier=state.shift?'SHIFT':'ALPHA';
   const action=LEGENDS.classify(physical,modifier,state.mode,state.screen,
    state.model,MODELS.supports);
   if(action.status==='blocked'||action.status==='unlabelled'){
    releaseModifier();notify(modifier+' '+key+': '+action.reason,true);paint();return;
   }
  }
 }
 if(state.shift&&shifted(key))return;
 if(state.alpha){state.alpha=false;if(alphaKey(key)!==null)return}
 if(key==='MODE'){releaseModifier();modeMenu();return}
  if(key.startsWith('TEXT:')&&state.mode==='CMPLX'&&/^[A-Za-z]$/.test(key.slice(5))){insert(key.slice(5));return}
 if(key==='AC'){clearReplay();state.calcSession=null;state.solveSession=null;state.captureTemplate=false;state.pendingMemory=null;state.factorization=null;state.multiStatements=null;state.remainderResult=null;state.editor=STRUCT.create();state.viewport={inputX:0,inputY:0,resultX:0,flowX:0};state.input='';state.cursor=0;state.screen='edit';state.result='';state.error='';state.errorOffset=null;state.errorSource='';state.info='';releaseModifier();notify('Cleared input');paint();return}
 if(key==='DEL'){
  state.solveSession=null;
  if(state.screen==='error'){state.screen='edit';state.error=''}
  if(state.screen==='result')state.screen='edit';
  STRUCT.backspace(state.editor);syncEditor();releaseModifier();paint();return;
 }
 if(key==='LEFT'||key==='RIGHT'){clearReplay();state.solveSession=null;if(state.screen==='result'){state.screen='edit'}STRUCT.navigate(state.editor,key);syncEditor();paint();return}
 if(key==='UP'||key==='DOWN'){if(!state.storedInputs.length&&state.screen==='edit'&&STRUCT.navigate(state.editor,key)){syncEditor();paint();return}replayHistory(key);return}
 if(key==='EQUAL'&&state.screen==='result'&&state.calcSession&&
    state.calcSession.source===state.resultSource&&state.calcSession.mode===state.mode){
   startCalc();return;
 }
 if(key==='EQUAL'){
  clearReplay();
  if(state.mode==='STAT'&&state.model==='fx-991es'&&state.statTable){
   try{
    const source=STRUCT.serialize(state.editor,true);
    if(!source)throw Error('Syntax ERROR');
    STAT.commit(state.statTable);
    const bound=STATPARAM.resolve(source,state.statTable,REG);
    const value=M.evaluate(source,{...state,math:false,ans:state.ans,
     memory:{...state.memory,...bound}});
    setResult(value,source,null);
   }catch(e){error(e.message||'Math ERROR')}
   return;
  }
  if(state.mode!=='COMP'&&state.mode!=='CMPLX'){advancedMode(state.mode);return}
  if(state.screen==='result'&&advanceStatements())return;
  evaluate();return;
 }
 if(key==='RCL'){memoryDialog(false);return}
 if(key==='MPLUS'){accumulateMemory(1);return}
 if(key==='SD'){if(state.mode==='CMPLX')return;toggleFraction();return}
 if(key==='CALC'){startCalc();return}
 if(key==='INTEGRAL'){insertCalculusTemplate('integral');return}
 if(key==='LOGBASE'){insertTemplate('logBase');return}
 if(key==='ENG'){if(state.mode==='CMPLX'){insert('i');return}if(state.screen==='result'){showEngineering(-1);return}notify('Calculate first');paint();return}
 if(key==='DMS'){
  if(state.mode!=='COMP'){
   notify('Sexagesimal entry requires COMP mode',true);paint();return;
  }
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
 ['INEQ quadratic inside',()=>INEQ.format(INEQ.solve([1,-3,2],'<'))==='1 < X < 2'],
 ['INEQ quadratic endpoints',()=>INEQ.format(INEQ.solve([1,-3,2],'<='))==='1 ≤ X ≤ 2'],
 ['INEQ negative leading',()=>INEQ.format(INEQ.solve([-1,3,-2],'>'))==='1 < X < 2'],
 ['INEQ no solution',()=>INEQ.format(INEQ.solve([1,0,1],'<'))==='No solution'],
 ['INEQ all real',()=>INEQ.format(INEQ.solve([1,0,1],'>='))==='All real X'],
 ['INEQ tangent root',()=>INEQ.format(INEQ.solve([1,-2,1],'<='))==='X = 1'],
 ['INEQ tangent strict exterior',()=>INEQ.format(INEQ.solve([1,-2,1],'>'))==='X < 1 OR X > 1'],
 ['INEQ cubic 3 roots',()=>INEQ.format(INEQ.solve([1,-2,-1,2],'>'))==='-1 < X < 1 OR X > 2'],
 ['INEQ cubic double root',()=>INEQ.format(INEQ.solve([1,0,-3,2],'<='))==='X ≤ -2 OR X = 1'],
 ['INEQ cubic triple root',()=>INEQ.format(INEQ.solve([1,0,0,0],'>='))==='X ≥ 0'],
 ['INEQ CASIO double zero',()=>INEQ.format(INEQ.solve([2,-3,0,0],'>='))==='X = 0 OR X ≥ 1.5'],
 ['INEQ cubic one real root',()=>INEQ.format(INEQ.solve([1,0,0,1],'<'))==='X < -1'],
 ['INEQ reject leading zero',()=>{try{INEQ.solve([0,1,2],'<');return false}catch{return true}}],
 ['INEQ reject operator',()=>{try{INEQ.solve([1,0,1],'!=');return false}catch{return true}}],
 ['INEQ native coefficient editor',()=>{const e=EQEDIT.create('QUAD');e.values.a=1;EQEDIT.restore(e);EQEDIT.enter(e,'2');EQEDIT.next(e);return e.values.a===2&&e.col===1}],
 ['INEQ native cubic dimensions',()=>EQEDIT.create('CUBIC').rows[0].length===4],
 ['INEQ native result fraction',()=>INEQDISPLAY.pages(INEQ.solve([2,-3,0],'>'),true).map(x=>x.text).join('|')==='X < 0|X > 3/2'],
 ['INEQ LineIO decimals',()=>INEQDISPLAY.pages(INEQ.solve([2,-3,0],'>'),false).map(x=>x.text).join('|')==='X < 0|X > 1.5'],
 ['INEQ natural radical',()=>INEQDISPLAY.pages(INEQ.solve([1,0,-2],'<'),true)[0].text==='-√2 < X < √2'],
 ['INEQ nontrivial radical',()=>INEQDISPLAY.pages(INEQ.solve([1,-3,1],'<'),true)[0].text==='3/2-√5/2 < X < 3/2+√5/2'],
 ['INEQ special empty',()=>INEQDISPLAY.pages(INEQ.solve([1,0,1],'<'))[0].kind==='empty'],
 ['INEQ special all-real',()=>INEQDISPLAY.pages(INEQ.solve([1,0,1],'>'))[0].kind==='all'],
 ['INEQ repeated singleton',()=>INEQDISPLAY.pages(INEQ.solve([1,0,-3,2],'<='),true).map(x=>x.text).join('|')==='X ≤ -2|X = 1'],
 ['INEQ result paging',()=>{const q=INEQ.solve([1,-3,2],'>');const e=INEQDISPLAY.session(2,'>',{a:1,b:-3,c:2},q);INEQDISPLAY.page(e,1);return e.index===1&&e.pages[1].text==='X > 2'}],
 ['INEQ MathIO switch',()=>{const r=INEQ.solve([2,-3,0],'>'),e=INEQDISPLAY.session(2,'>',{},r,true);INEQDISPLAY.updateMath(e,false);return e.pages[1].text==='X > 1.5'}],
 ['quadratic roots',()=>M.quadratic(1,-3,2).length===2],['matrix solve',()=>M.matrixSolve([[2,1,5],[1,-1,1]]).every(Number.isFinite)],
  ['MATRIX registers',()=>{const t=MATRIX.store();return MATRIX.NAMES.length===3&&t.MatAns===null}],
  ['MATRIX dimension 3x3',()=>{const m=MATRIX.create(3,3);return m.data.length===3&&m.data[2].length===3}],
  ['MATRIX editing and persistence',()=>{const t=MATRIX.store();MATRIX.set(t,'MatA',MATRIX.create(2,2));const e=MATRIX.editor(t,'MatA');MATRIX.type(e,'7');MATRIX.commit(e);MATRIX.set(t,'MatA',e.matrix);return t.MatA.data[0][0]===7}],
  ['MATRIX independent copies',()=>{const t=MATRIX.store();MATRIX.set(t,'MatA',MATRIX.create(1,1,[[3]]));MATRIX.copy(t,'MatA','MatB');t.MatB.data[0][0]=9;return t.MatA.data[0][0]===3}],
  ['MATRIX MatAns multiply',()=>{const t=MATRIX.store();MATRIX.set(t,'MatA',MATRIX.create(2,2,[[2,1],[1,1]]));MATRIX.set(t,'MatB',MATRIX.create(2,2,[[2,-1],[-1,2]]));MATRIX.record(t,'multiply','MatA','MatB');return t.MatAns.data.flat().join(',')==='3,0,1,1'}],
  ['MATRIX history preserved',()=>{const t=MATRIX.store();MATRIX.set(t,'MatA',MATRIX.create(1,1,[[3]]));MATRIX.record(t,'det','MatA');return t.history.length===1&&t.history[0].output===3}],
  ['MATRIX rejects dimension mismatch',()=>{try{MATRIX.multiply(MATRIX.create(2,2),MATRIX.create(3,3));return false}catch{return true}}],
  ['MATRIX subtraction',()=>{const a=MATRIX.create(2,2,[[4,7],[2,6]]),b=MATRIX.create(2,2,[[1,2],[3,4]]);return MATRIX.subtract(a,b).data.flat().join(',')==='3,5,-1,2'}],
  ['MATRIX transpose rectangular',()=>MATRIX.transpose(MATRIX.create(2,3,[[1,2,3],[4,5,6]])).data.flat().join(',')==='1,4,2,5,3,6'],
  ['MATRIX inverse 2x2',()=>{const v=MATRIX.inverse(MATRIX.create(2,2,[[4,7],[2,6]])).data.flat();return v.every((x,i)=>Math.abs(x-[.6,-.7,-.2,.4][i])<1e-10)}],
  ['MATRIX inverse singular',()=>{try{MATRIX.inverse(MATRIX.create(2,2,[[1,2],[2,4]]));return false}catch{return true}}],
  ['MATRIX powers',()=>{const a=MATRIX.create(2,2,[[4,7],[2,6]]);return MATRIX.power(a,0).data.flat().join(',')==='1,0,0,1'&&MATRIX.power(a,2).data.flat().join(',')==='30,70,20,50'}],
  ['MATRIX negative power',()=>Math.abs(MATRIX.power(MATRIX.create(2,2,[[4,7],[2,6]]),-1).data[0][0]-.6)<1e-10],
  ['MATRIX scalar',()=>MATRIX.scalar(MATRIX.create(1,2,[[4,-6]]),-.5).data[0].join(',')==='-2,3'],
  ['MATRIX abs determinant',()=>MATRIX.absolute(MATRIX.create(2,2,[[1,2],[3,4]]))===2],
  ['MATRIX failure preserves MatAns and history',()=>{const t=MATRIX.store();MATRIX.set(t,'MatA',MATRIX.create(2,2,[[1,2],[2,4]]));MATRIX.set(t,'MatB',MATRIX.create(2,2,[[1,0],[0,1]]));MATRIX.record(t,'add','MatA','MatB');const a=JSON.stringify(t.MatAns),h=t.history.length;try{MATRIX.record(t,'inverse','MatA');return false}catch{return a===JSON.stringify(t.MatAns)&&h===t.history.length}}],
  ['VECTOR named registers',()=>{const v=VECTOR.store();return VECTOR.NAMES.join(',')==='VctA,VctB,VctC'&&v.VctAns===null}],
  ['VECTOR dimensions 2D and 3D',()=>VECTOR.create(2).dimension===2&&VECTOR.create(3).dimension===3],
  ['VECTOR rejects 4D',()=>{try{VECTOR.create(4);return false}catch{return true}}],
  ['VECTOR dot',()=>VECTOR.dot(VECTOR.create(3,[1,2,3]),VECTOR.create(3,[4,5,6]))===32],
  ['VECTOR cross',()=>VECTOR.cross(VECTOR.create(3,[1,2,3]),VECTOR.create(3,[4,5,6])).data.join(',')==='-3,6,-3'],
  ['VECTOR magnitude',()=>Math.abs(VECTOR.magnitude(VECTOR.create(2,[3,4]))-5)<1e-12],
  ['VECTOR editor re-entry',()=>{const st=VECTOR.store();VECTOR.set(st,'VctA',VECTOR.create(3,[1,2,3]));const e=VECTOR.editor(st,'VctA');VECTOR.type(e,'7');VECTOR.next(e);VECTOR.move(e,-1);return e.vector.data[0]===7&&e.buffer==='7'}],
  ['VECTOR independent VctAns copy',()=>{const st=VECTOR.store();VECTOR.set(st,'VctA',VECTOR.create(3,[1,0,0]));VECTOR.set(st,'VctB',VECTOR.create(3,[0,1,0]));VECTOR.record(st,'cross','VctA','VctB');VECTOR.copy(st,'VctAns','VctC');st.VctC.data[2]=9;return st.VctAns.data[2]===1}],
  ['VECTOR failure preserves VctAns history',()=>{const st=VECTOR.store();VECTOR.set(st,'VctA',VECTOR.create(3,[1,0,0]));VECTOR.set(st,'VctB',VECTOR.create(3,[0,1,0]));VECTOR.record(st,'cross','VctA','VctB');const old=JSON.stringify(st.VctAns),h=st.history.length;try{VECTOR.record(st,'bad','VctA');return false}catch{return JSON.stringify(st.VctAns)===old&&st.history.length===h}}],
   ['VECTOR addition',()=>VECTOR.add(VECTOR.create(3,[1,2,3]),VECTOR.create(3,[4,5,6])).data.join(',')==='5,7,9'],
   ['VECTOR subtraction',()=>VECTOR.subtract(VECTOR.create(2,[1,2]),VECTOR.create(2,[5,3])).data.join(',')==='-4,-1'],
   ['VECTOR scalar negative',()=>VECTOR.scalar(VECTOR.create(2,[3,-4]),-2).data.join(',')==='-6,8'],
   ['VECTOR angle degree',()=>Math.abs(VECTOR.angle(VECTOR.create(2,[1,0]),VECTOR.create(2,[0,1]),'DEG')-90)<1e-10],
   ['VECTOR angle radians',()=>Math.abs(VECTOR.angle(VECTOR.create(2,[1,0]),VECTOR.create(2,[0,1]),'RAD')-Math.PI/2)<1e-10],
   ['VECTOR angle gradians',()=>Math.abs(VECTOR.angle(VECTOR.create(2,[1,0]),VECTOR.create(2,[0,1]),'GRA')-100)<1e-10],
   ['VECTOR perpendicular geometry',()=>VECTOR.geometry(VECTOR.create(2,[1,0]),VECTOR.create(2,[0,1])).relation==='perpendicular'],
   ['VECTOR invalid zero angle',()=>{try{VECTOR.angle(VECTOR.create(2),VECTOR.create(2,[1,0]));return false}catch(e){return e.message==='Math ERROR'}}],
   ['VECTOR incompatible dimensions',()=>{try{VECTOR.add(VECTOR.create(2),VECTOR.create(3));return false}catch(e){return e.message==='Dimension ERROR'}}],
   ['VECTOR scalar result memory',()=>{const st=VECTOR.store();VECTOR.set(st,'VctA',VECTOR.create(2,[3,-2]));VECTOR.record(st,'scalar','VctA',null,-3);return st.VctAns.data.join(',')==='-9,6'}],
   ['VECTOR angle retains memory',()=>{const st=VECTOR.store();VECTOR.set(st,'VctA',VECTOR.create(2,[3,0]));VECTOR.set(st,'VctB',VECTOR.create(2,[0,4]));VECTOR.record(st,'add','VctA','VctB');VECTOR.record(st,'angle','VctA','VctB','DEG');return st.VctAns.data.join(',')==='3,4'&&st.history[1].geometry.relation==='perpendicular'}],
 ['TABLE C dual setup',()=>TABLE.dualEnabled('fx-991es-plus-c',2)&&!TABLE.dualEnabled('fx-991es-plus',2)],
  ['TABLE single row limit 30',()=>TABLE.maxRows('fx-991es-plus',1)===30&&TABLE.maxRows('fx-991es-plus-c',1)===30],
  ['TABLE dual row limit 20',()=>TABLE.maxRows('fx-991es-plus-c',2)===20],
  ['TABLE dual limit enforcement',()=>{try{TABLE.generate({model:'fx-991es-plus-c',count:2,start:0,end:20,step:1,f:x=>x,g:x=>x*x});return false}catch(e){return e.message==='Insufficient MEM'}}],
  ['TABLE 30 single rows',()=>TABLE.generate({model:'fx-991es-plus',count:1,start:0,end:29,step:1,f:x=>x}).rows.length===30],
  ['TABLE single over limit',()=>{try{TABLE.generate({model:'fx-991es-plus',count:1,start:0,end:30,step:1,f:x=>x});return false}catch(e){return e.message==='Insufficient MEM'}}],
  ['TABLE rejects zero increment',()=>{try{TABLE.generate({model:'fx-991es-plus-c',count:2,start:0,end:5,step:0,f:x=>x,g:x=>x});return false}catch(e){return e.message==='Argument ERROR'}}],
  ['TABLE rejects reversed range',()=>{try{TABLE.generate({model:'fx-991es-plus-c',count:2,start:5,end:1,step:1,f:x=>x,g:x=>x});return false}catch(e){return e.message==='Argument ERROR'}}],
  ['TABLE aligned dual columns',()=>{const t=TABLE.generate({model:'fx-991es-plus-c',count:2,start:-1,end:1,step:.5,f:x=>x*x,g:x=>x+1});return t.rows.length===5&&t.rows.every(r=>Math.abs(r.f-r.x*r.x)<1e-10&&Math.abs(r.g-r.x-1)<1e-10)}],
  ['TABLE synchronized row navigation',()=>{const t=TABLE.generate({model:'fx-991es-plus-c',count:2,start:1,end:5,step:1,f:x=>x*x,g:x=>x+1});TABLE.navigate(t,2,2);return t.row===2&&t.col===2&&TABLE.active(t)===4}],
  ['TABLE model prevents dual',()=>{const t=TABLE.generate({model:'fx-991es-plus',count:2,start:1,end:5,step:1,f:x=>x,g:x=>x+1});return !t.dual&&t.columns.length===2}],
  ['TABLE invalid function cell',()=>{const t=TABLE.generate({model:'fx-991es-plus-c',count:1,start:1,end:3,step:1,f:x=>x===2?NaN:x});return t.rows[1].f===null&&TABLE.format(t.rows[1].f)==='ERROR'}],
  ['VERIF chained true',()=>VERIFY.evaluate('1<2<3',Number).result],
  ['VERIF chained false',()=>!VERIFY.evaluate('1<3<2',Number).result],
  ['VERIF mixed inclusive',()=>VERIFY.evaluate('1<=1<2!=3',Number).result],
  ['VERIF exact equality',()=>!VERIFY.compare(0.1+0.2,0.3,'=')],
  ['VERIF not equal',()=>VERIFY.compare(0.1+0.2,0.3,'!=')],
  ['VERIF Unicode relations',()=>VERIFY.evaluate('1≤2≠3',Number).result],
  ['VERIF expression arithmetic',()=>VERIFY.evaluate('1+2=3<4',part=>M.evaluate(part,state)).result],
  ['VERIF rejects missing operator',()=>{try{VERIFY.evaluate('123',Number);return false}catch(e){return e.message==='Syntax ERROR'}}],
  ['VERIF rejects missing term',()=>{try{VERIFY.evaluate('1<<2',Number);return false}catch(e){return e.message==='Syntax ERROR'}}],
  ['VERIF rejects unbalanced input',()=>{try{VERIFY.evaluate('(1<2',Number);return false}catch(e){return e.message==='Syntax ERROR'}}],
  ['VERIF rejects invalid number',()=>{try{VERIFY.evaluate('1<2',part=>part==='2'?Infinity:1);return false}catch(e){return e.message==='Math ERROR'}}],
  ['VERIF evaluates each term once',()=>{let count=0;const out=VERIFY.evaluate('1<2<3',part=>{count++;return Number(part)});return out.result&&count===3}],
  ['DIST seven mode types',()=>DIST.TYPES.map(x=>x.label).join(',')==='Normal PD,Normal CD,Inverse Normal,Binomial PD,Binomial CD,Poisson PD,Poisson CD'],
 ['DIST normal PD ordered inputs',()=>DIST.TYPES[0].params.join(',')==='x,sigma,mu'],
 ['DIST normal CD ordered inputs',()=>DIST.TYPES[1].params.join(',')==='lower,upper,sigma,mu'],
 ['DIST inverse ordered inputs',()=>DIST.TYPES[2].params.join(',')==='area,sigma,mu'],
 ['DIST binomial input order',()=>DIST.TYPES[3].params.join(',')==='x,n,p'&&DIST.TYPES[4].params.join(',')==='x,n,p'],
 ['DIST poisson input order',()=>DIST.TYPES[5].params.join(',')==='x,mu'&&DIST.TYPES[6].params.join(',')==='x,mu'],
 ['DIST official Normal PD',()=>Math.abs(DIST.calculate('normal-pd',{x:36,sigma:2,mu:35})-.1760326634)<1e-10],
 ['DIST Normal CD',()=>Math.abs(DIST.calculate('normal-cd',{lower:-1,upper:1,sigma:1,mu:0})-.6826894921370859)<1e-10],
 ['DIST inverse normal',()=>Math.abs(DIST.calculate('inverse-normal',{area:.975,sigma:1,mu:0})-1.959963984540054)<1e-9],
 ['DIST binomial PD',()=>Math.abs(DIST.calculate('binomial-pd',{x:10,n:15,p:.6})-.185937844764672)<1e-10],
 ['DIST binomial CD',()=>Math.abs(DIST.calculate('binomial-cd',{x:2,n:5,p:.5})-.5)<1e-11],
 ['DIST poisson PD',()=>Math.abs(DIST.calculate('poisson-pd',{x:3,mu:2})-Math.exp(-2)*8/6)<1e-10],
 ['DIST poisson CD',()=>Math.abs(DIST.calculate('poisson-cd',{x:3,mu:2})-.857123460498547)<1e-10],
 ['DIST sigma rejected',()=>{try{DIST.calculate('normal-pd',{x:0,sigma:0,mu:0});return false}catch(e){return e.message==='Argument ERROR'}}],
 ['DIST binomial probability rejected',()=>{try{DIST.calculate('binomial-pd',{x:1,n:5,p:2});return false}catch(e){return e.message==='Argument ERROR'}}],
 ['DIST poisson negative mean rejected',()=>{try{DIST.calculate('poisson-cd',{x:1,mu:-1});return false}catch(e){return e.message==='Argument ERROR'}}],
 ['DIST deep normal tail',()=>Math.abs(DIST.normalCDF(-8)-6.22096057427174e-16)<1e-19],
 ['DIST List eligible types',()=>DISTLIST.LIST_TYPES.join(',')==='binomial-pd,binomial-cd,poisson-pd,poisson-cd'],
  ['DIST List max 25',()=>DISTLIST.MAX===25],
  ['DIST List reject sample 26',()=>{try{DISTLIST.create('poisson-pd',Array(26).fill(2));return false}catch(e){return e.message==='Argument ERROR'}}],
  ['DIST List reject unsupported',()=>{try{DISTLIST.create('normal-pd');return false}catch{return true}}],
  ['DIST List insert atomic',()=>{const e=DISTLIST.create('binomial-pd',[10,12]);e.row=1;DISTLIST.insert(e);DISTLIST.edit(e,'1');DISTLIST.edit(e,'1');DISTLIST.commitInsertion(e);return e.samples.join(',')==='10,11,12'}],
  ['DIST List insertion cancel',()=>{const e=DISTLIST.create('poisson-pd',[1,2]);DISTLIST.insert(e);DISTLIST.cancelInsertion(e);return e.samples.join(',')==='1,2'}],
  ['DIST List delete',()=>{const e=DISTLIST.create('poisson-pd',[1,2,3]);e.row=1;DISTLIST.remove(e);return e.samples.join(',')==='1,3'}],
  ['DIST List clear-all',()=>{const e=DISTLIST.create('poisson-pd',[1,2]);DISTLIST.clear(e);return e.samples.length===0}],
  ['DIST List binomial answers',()=>{const e=DISTLIST.create('binomial-pd',[10,11,12,13,14]);DISTLIST.evaluate(e,{n:15,p:.6},DIST);return e.answers.length===5&&Math.abs(e.answers[0]-.185937844764672)<1e-10&&e.answers.every(Number.isFinite)}],
  ['DIST List poisson answers',()=>{const e=DISTLIST.create('poisson-cd',[0,1,2,3]);DISTLIST.evaluate(e,{mu:2},DIST);return Math.abs(e.answers[3]-.857123460498547)<1e-10}],
  ['DIST List invalid row is ERROR',()=>{const e=DISTLIST.create('binomial-pd',[2,2.5,3]);DISTLIST.evaluate(e,{n:5,p:.5},DIST);return Number.isFinite(e.answers[0])&&e.answers[1]===null&&DISTLIST.format(e.answers[1])==='ERROR'&&Number.isFinite(e.answers[2])}],
  ['DIST List edit invalidates results',()=>{const e=DISTLIST.create('poisson-pd',[1,2]);DISTLIST.evaluate(e,{mu:2},DIST);DISTLIST.edit(e,'3');DISTLIST.save(e);return e.answers.length===0&&!e.calculated}],
  ['DIST List navigator',()=>{const e=DISTLIST.create('poisson-pd',[1,2,3]);DISTLIST.move(e,2,1);return e.row===2&&e.column===1}],
  ['DIST List full insertion rejected',()=>{const e=DISTLIST.create('poisson-pd',Array(25).fill(0));try{DISTLIST.insert(e);return false}catch(e){return e.message==='Insufficient MEM'}}],
  ['DIST List invalid insert preserves rows',()=>{const e=DISTLIST.create('poisson-pd',[2,3]);DISTLIST.insert(e);DISTLIST.edit(e,'-');try{DISTLIST.commitInsertion(e);return false}catch{return e.samples.join(',')==='2,3'}}],
  ['DIST List scalar engine unchanged',()=>Math.abs(DIST.calculate('binomial-pd',{x:10,n:15,p:.6})-.185937844764672)<1e-10],
  ['CONST 40 codes',()=>CONST.ITEMS.length===40],
  ['CONST sequential codes',()=>CONST.ITEMS.every((x,i)=>x.code===String(i+1).padStart(2,'0'))],
  ['CONST all named and positive/negative finite',()=>CONST.ITEMS.every(x=>x.name&&x.symbol&&Number.isFinite(x.values[2002])&&Number.isFinite(x.values[2014]))],
  ['CONST C0 code 28',()=>CONST.select('fx-991es-plus','28').value===299792458],
  ['CONST Planck code 06',()=>CONST.select('fx-991es-plus','06').value===6.62607004e-34],
  ['CONST Boltzmann code 25',()=>CONST.select('fx-991es-plus-c','25').value===1.38064852e-23],
  ['CONST gravitation period difference',()=>CONST.select('fx-991es','39').value===6.6742e-11&&CONST.select('fx-991es-plus','39').value===6.67408e-11],
  ['CONST rejected 00',()=>{try{CONST.select('fx-991es-plus','00');return false}catch{return true}}],
  ['CONST rejected 41',()=>{try{CONST.select('fx-991es-plus','41');return false}catch{return true}}],
  ['CONST two digit entry',()=>{const e=CONST.codeEditor();return CONST.type(e,'2','fx-991es-plus')===null&&CONST.type(e,'8','fx-991es-plus').value===299792458}],
  ['CONST DEL removes digit',()=>{const e=CONST.codeEditor();CONST.type(e,'1','fx-991es-plus');CONST.backspace(e);return e.buffer===''}],
  ['CONST 120 model/catalog expression results',()=>Object.keys(CONST.MODELS).every(model=>CONST.ITEMS.every(x=>{const e=CONST.select(model,x.code);try{const value=M.evaluate(CONST.literal(e),{...state,ans:0,memory:{}});return Math.abs(value-e.value)<=Math.max(1e-99,Math.abs(e.value)*1e-12)}catch{return false}}))],
  ['CONV 40 documented codes',()=>CONV.ITEMS.length===40&&CONV.ITEMS.every((x,i)=>x.code===String(i+1).padStart(2,'0'))],
  ['CONV reverse-pair names',()=>CONV.ITEMS.every((x,i)=>i%2===0?x.from===CONV.ITEMS[i+1].to&&x.to===CONV.ITEMS[i+1].from:true)],
  ['CONV 5cm to inch',()=>Math.abs(CONV.convert(5,CONV.select('fx-991es','02'))-1.968503937007874)<1e-10],
  ['CONV 100g to oz',()=>Math.abs(CONV.convert(100,CONV.select('fx-991es','22'))-3.527396584)<1e-7],
  ['CONV minus31C to F',()=>Math.abs(CONV.convert(-31,CONV.select('fx-991es','38'))+23.8)<1e-10],
  ['CONV 212F to C',()=>Math.abs(CONV.convert(212,CONV.select('fx-991es','37'))-100)<1e-10],
  ['CONV 15C calorie',()=>CONV.select('fx-991es','40').factor===1/4.1858],
  ['CONV postfix operand',()=>CONV.insert('2+5',CONV.select('fx-991es','02'))==='2+((5)/2.54)'],
  ['CONV unary negative',()=>CONV.insert('-31',CONV.select('fx-991es','38'))==='(((-31)*1.8)+32)'],
  ['CONV parentheses as operand',()=>CONV.suffix('2+(5+3)').operand==='(5+3)'],
  ['CONV incomplete expression fails',()=>{try{CONV.insert('2+',CONV.select('fx-991es','02'));return false}catch{return true}}],
  ['CONV invalid 00',()=>{try{CONV.select('fx-991es','00');return false}catch{return true}}],
  ['CONV invalid 41',()=>{try{CONV.select('fx-991es','41');return false}catch{return true}}],
  ['CONV inverse of all 20 pairs',()=>Object.keys(CONV.ITEMS).every(k=>{const i=Number(k);if(i%2)return true;const a=CONV.select('fx-991es',CONV.ITEMS[i].code),b=CONV.select('fx-991es',CONV.ITEMS[i+1].code);return Math.abs(CONV.convert(CONV.convert(2,a),b)-2)<1e-8})],
  ['CONV all codes expression-compatible',()=>['fx-991es','fx-991es-plus','fx-991es-plus-c'].every(model=>CONV.ITEMS.every(item=>{try{const c=CONV.select(model,item.code);const output=M.evaluate(CONV.insert('2',c),{...state,memory:{},ans:0});return Math.abs(output-CONV.convert(2,c))<1e-10*Math.max(1,Math.abs(output))}catch{return false}}))],
  ['MENU original eight modes',()=>MENUS.modeEntries('fx-991es').map(x=>x.label).join(',')==='COMP,CMPLX,STAT,BASE-N,EQN,MATRIX,TABLE,VECTOR'],
  ['MENU PLUS eight modes',()=>MENUS.modeEntries('fx-991es-plus').length===8],
  ['MENU PLUS C eleven modes',()=>MENUS.modeEntries('fx-991es-plus-c').length===11],
  ['MENU PLUS C local second keys',()=>MENUS.modeEntries('fx-991es-plus-c').slice(8).map(x=>x.number).join(',')==='1,2,3'],
  ['MENU PLUS C second page labels',()=>MENUS.page(MENUS.modeEntries('fx-991es-plus-c'),1,8).entries.map(x=>x.label).join(',')==='INEQ,VERIF,DIST'],
  ['MENU MODE first screen eight',()=>MENUS.rule('mode').size===8],
  ['MENU SETUP two-page layout',()=>SETUP.pages('fx-991es-plus-c').length===2&&SETUP.pages('fx-991es-plus-c')[0].length===8&&SETUP.pages('fx-991es-plus-c')[1].length===8],
  ['MENU SETUP period-specific',()=>SETUP.pages('fx-991es')[1].length===6&&SETUP.pages('fx-991es-plus')[1].length===6],
  ['MENU UP previous page',()=>MENUS.navigate(1,'UP',11,8)===0],
  ['MENU DOWN next page',()=>MENUS.navigate(0,'DOWN',11,8)===1],
  ['MENU RIGHT does not change page',()=>MENUS.navigate(0,'RIGHT',11,8)===0],
  ['MENU STAT types eight per page',()=>MENUS.rule('stat-type').size===8],
  ['MENU DIST four per page',()=>MENUS.rule('dist-type').size===4],
  ['MENU MATRIX and VECTOR eight per page',()=>MENUS.rule('matrix').size===8&&MENUS.rule('vector').size===8],
  ['MENU memory register display',()=>MENUS.rule('memory').columns===3],
  ['MENU LCD 96x31',()=>LCD.rasterize({...state,power:true,mode:'COMP',screen:'menu',menuTitle:'MODE',menuKind:'mode',menuPage:0,menuPageSize:8,menuEntries:MENUS.modeEntries('fx-991es'),menu:MENUS.modeEntries('fx-991es')}).length===2976],
  ['MENU page one no lower page for ES',()=>!MENUS.page(MENUS.modeEntries('fx-991es'),0,8).below],
  ['MENU page flags for PLUS C',()=>MENUS.page(MENUS.modeEntries('fx-991es-plus-c'),1,8).above&&!MENUS.page(MENUS.modeEntries('fx-991es-plus-c'),1,8).below],
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
  ['complex polar',()=>COMPLEX.format({re:0,im:1},'DEG','polar').includes('∠90')],
  ['CMPLX polar input',()=>{const z=COMPLEX.evaluate('2∠45',{angle:'DEG'});return Math.abs(z.re-Math.SQRT2)<1e-12&&Math.abs(z.im-Math.SQRT2)<1e-12}],
  ['CMPLX command parsing',()=>COMPLEX.splitDisplayCommand('2∠45►a+bi').format==='rectangular'],
  ['CMPLX angle normalization',()=>COMPLEX.format({re:-2,im:0},'DEG','polar')==='2∠180'],
  ['CMPLX LineIO components',()=>COMPLEX.components({re:3,im:-2},'DEG','rectangular').join('|')==='3|-2i'],
   ['STAT weighted count',()=>{const t=STAT.create(false,true);t.rows=[{X:2,Y:null,FREQ:3},{X:4,Y:null,FREQ:1}];return STAT.calculate(t).n===4&&STAT.calculate(t).meanX===2.5}],
   ['STAT paired slope',()=>{const t=STAT.create(true,false);t.rows=[{X:1,Y:2,FREQ:1},{X:2,Y:4,FREQ:1}];return STAT.calculate(t).slope===2}],
   ['STAT row delete',()=>{const t=STAT.create();STAT.insert(t);STAT.remove(t);return t.rows.length===1}],
   ['STAT frequency columns',()=>STAT.columns(true,true).join(',')==='X,Y,FREQ'],
   ['STAT full table limit',()=>{const t=STAT.create();t.rows=Array.from({length:STAT.MAX_ROWS},()=>({X:1,Y:null,FREQ:1}));t.row=t.rows.length-1;try{STAT.insert(t);return false}catch{return true}}],
   ['STAT rejects invalid weights',()=>{const t=STAT.create(false,true);t.col=1;t.buffer='-2';t.editing=true;try{STAT.commit(t);return false}catch{return true}}],
   // REA-048: textbook regression forms, weighted sums, sample spread & estimates.
   ['STAT 8 types',()=>REG.TYPES.length===8],
   ['STAT linear fit',()=>{const t=STAT.create(true);t.rows=[{X:1,Y:3,FREQ:1},{X:2,Y:5,FREQ:1},{X:3,Y:7,FREQ:1}];const m=REG.fit(t,'LIN');return Math.abs(m.A-1)<1e-10&&Math.abs(m.B-2)<1e-10}],
   ['STAT quadratic fit',()=>{const t=STAT.create(true);t.rows=[{X:0,Y:1,FREQ:1},{X:1,Y:2,FREQ:1},{X:2,Y:7,FREQ:1}];const m=REG.fit(t,'QUAD');return Math.abs(m.C-2)<1e-10}],
   ['STAT logarithmic fit',()=>{const t=STAT.create(true);t.rows=[{X:1,Y:2,FREQ:1},{X:Math.E,Y:5,FREQ:1},{X:Math.E**2,Y:8,FREQ:1}];return Math.abs(REG.fit(t,'LOG').B-3)<1e-9}],
   ['STAT exponential fit',()=>{const t=STAT.create(true);t.rows=[{X:0,Y:2,FREQ:1},{X:1,Y:2*Math.E,FREQ:1},{X:2,Y:2*Math.E**2,FREQ:1}];return Math.abs(REG.fit(t,'EXP').A-2)<1e-9}],
   ['STAT ab-exp fit',()=>{const t=STAT.create(true);t.rows=[{X:0,Y:3,FREQ:1},{X:1,Y:6,FREQ:1},{X:2,Y:12,FREQ:1}];return Math.abs(REG.fit(t,'ABEXP').B-2)<1e-9}],
   ['STAT power fit',()=>{const t=STAT.create(true);t.rows=[{X:1,Y:3,FREQ:1},{X:2,Y:12,FREQ:1},{X:4,Y:48,FREQ:1}];return Math.abs(REG.fit(t,'POWER').B-2)<1e-9}],
   ['STAT inverse fit',()=>{const t=STAT.create(true);t.rows=[{X:1,Y:7,FREQ:1},{X:2,Y:5,FREQ:1},{X:4,Y:4,FREQ:1}];return Math.abs(REG.fit(t,'INV').B-4)<1e-9}],
   ['STAT sample sd',()=>{const t=STAT.create();t.rows=[{X:1,Y:null,FREQ:1},{X:2,Y:null,FREQ:1},{X:3,Y:null,FREQ:1}];return Math.abs(REG.summary(t).sampleSDX-1)<1e-10}],
   ['STAT manual row limits',()=>[STAT.create(),STAT.create(false,true),STAT.create(true,false),STAT.create(true,true)].map(STAT.rowCapacity).join(',')==='80,40,40,26'],
   ['STAT invalid log domain',()=>{const t=STAT.create(true);t.rows=[{X:0,Y:2,FREQ:1},{X:1,Y:3,FREQ:1}];try{REG.fit(t,'LOG');return false}catch{return true}}],
  ['BASE-N binary signed',()=>BASE.evaluate('1111111111111111','BIN',state.model)===-1n],
  ['BASE-N hex conversion',()=>BASE.format(-1n,'HEX',state.model)==='FFFFFFFF'],
  ['BASE-N decimal minimum',()=>BASE.evaluate('-2147483648','DEC',state.model)===-2147483648n],
  ['BASE-N binary range guard',()=>{try{BASE.format(-32769n,'BIN',state.model);return false}catch{return true}}],
  ['BASE-N octal signed',()=>BASE.evaluate('37777777777','OCT',state.model)===-1n],
  ['BASE-N 16-bit min',()=>BASE.evaluate('1000000000000000','BIN',state.model)===-32768n],
  ['BASE-N signed conversion',()=>BASE.convert(-1n,'HEX',state.model)==='FFFFFFFF'&&BASE.convert(-1n,'BIN',state.model)==='1111111111111111'],
  ['BASE-N padded octal',()=>BASE.format(8n,'OCT',state.model)==='00000000010'],
  ['BASE-N HEX F digit',()=>BASE.evaluate('1F+1','HEX',state.model)===32n],
  ['BASE-N rejects bad BIN digit',()=>{try{BASE.evaluate('102','BIN',state.model);return false}catch{return true}}],
  ['BASE-N 32-bit overflow',()=>{try{BASE.evaluate('2147483647+1','DEC',state.model);return false}catch{return true}}],
  ['BASE-N logic and',()=>BASE.evaluate('1010 and 1100','BIN',state.model)===8n],
  ['BASE-N logic or',()=>BASE.evaluate('1011 or 11010','BIN',state.model)===27n],
  ['BASE-N logic xor',()=>BASE.evaluate('1010 xor 1100','BIN',state.model)===6n],
  ['BASE-N logic xnor',()=>BASE.format(BASE.evaluate('1111 xnor 101','BIN',state.model),'BIN',state.model)==='1111111111110101'],
  ['BASE-N logic Not',()=>BASE.format(BASE.evaluate('Not(1010)','BIN',state.model),'BIN',state.model)==='1111111111110101'],
  ['BASE-N logic Neg',()=>BASE.format(BASE.evaluate('Neg(101101)','BIN',state.model),'BIN',state.model)==='1111111111010011'],
  ['BASE-N logic width',()=>BASE.evaluate('Not(0)','DEC',state.model)===-1n&&BASE.evaluate('Not(0)','BIN',state.model)===-1n],
  ['BASE-N logic precedence',()=>BASE.evaluate('1010 or 1100 and 101','BIN',state.model)===14n],
  ['EQN types',()=>EQN.TYPES.length===4],
  ['EQN cubic',()=>EQN.cubic([1,-2,-1,2]).solutions.every((v,i)=>Math.abs(v.value-[-1,2,1][i])<1e-8)],
  ['EQN 3 unknowns',()=>EQN.systems([[1,-1,1,2],[1,1,-1,0],[-1,1,1,4]]).solutions.every((v,i)=>Math.abs(v.value-[1,2,3][i])<1e-8)],
  ['EQN inconsistent',()=>EQN.systems([[1,1,2],[2,2,5]]).status==='No Solution'],
  ['EQN infinite',()=>EQN.systems([[1,1,2],[2,2,4]]).status==='Infinite Solutions'],
  ['EQN nonreal',()=>EQN.quadratic([1,0,1]).solutions.length===2&&Math.abs(EQN.quadratic([1,0,1]).solutions[0].complex.im-1)<1e-8],
  ['EQN cubic complex',()=>EQN.cubic([1,0,0,1]).solutions.length===3&&Math.abs(EQN.cubic([1,0,0,1]).solutions[1].complex.im-Math.sqrt(3)/2)<1e-8],
  ['EQN repeated roots',()=>EQN.cubic([1,0,-3,2]).solutions.length===2],
  ['EQN coefficient editor',()=>EQEDIT.create('LINEAR3').rows.flat().length===12],
  ['EQN coefficient navigation',()=>{const e=EQEDIT.create('QUAD');EQEDIT.enter(e,'2');EQEDIT.next(e);EQEDIT.move(e,0,-1);return e.values.a===2&&EQEDIT.current(e)==='a'}],
  ['EQN coefficient AC',()=>{const e=EQEDIT.create('QUAD');EQEDIT.enter(e,'3');EQEDIT.commit(e);EQEDIT.clear(e);return e.values.a===0&&e.values.b===0}],
  ['EQN coefficient reject expression',()=>{try{EQEDIT.parse('2+3');return false}catch{return true}}],
  ['EQN exact surd',()=>{const v=EQEX.decorate(EQN.quadratic([1,0,-2]),[1,0,-2]);return v.solutions.map(s=>s.exact).join(',')==='-√2,√2'}],
  ['EQN exact complex',()=>{const v=EQEX.decorate(EQN.quadratic([1,0,1]),[1,0,1]);return v.solutions.map(s=>s.exact).join(',')==='i,-i'}],
  ['EQN exact rational',()=>{const v=EQEX.decorate(EQN.quadratic([2,1,-3]),[2,1,-3]);return v.solutions[0].exact==='-3/2'}]
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
K.mount($('keys'),press,state.model);
$('model-selector').value=state.model;
$('model-selector').addEventListener('change',e=>setModel(e.target.value));
$('run-checks').addEventListener('click',runChecks);
$('export-legends').addEventListener('click',()=>download('rea081-key-modifier-inventory.json',
 JSON.stringify({schema:'rea081-key-legends-v1',scope:'independent web calculator',
  manufacturerHardwareVerified:false,rows:LEGENDS.inventory(K,MODELS)},null,2),'application/json'));
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
window.FreshCalculator=Object.freeze({press,runChecks,loadExpression,setModel,
 legendInventory:(options)=>LEGENDS.inventory(K,MODELS,options),
 legendStatus:(key,modifier='normal',mode=state.mode,screen=state.screen,model=state.model)=>{
  const physical=K.keysForModel(model).find(item=>item.id===key);
  return LEGENDS.classify(physical,modifier,mode,screen,model,MODELS.supports);
 },modelProfiles:MODELS.profiles,setSimulatedBattery,getStructured:()=>structuredClone(state.editor),getState:()=>{const {menuEntries,flow,...snapshot}=state;return structuredClone({...snapshot,flow:flow?{title:flow.title,index:flow.index,buffer:flow.buffer,cursor:flow.cursor??flow.buffer.length,editing:flow.editing,fieldId:flow.fields[flow.index]?.id,fieldCount:flow.fields.length,values:{...flow.values}}:null,menuEntries:menuEntries.map(x=>x.label)})}});
})();
