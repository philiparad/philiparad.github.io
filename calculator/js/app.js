/* A new, independent browser calculator controller. No imported project code. */
(function(){'use strict';
const M=window.FreshMath, K=window.FreshKeypad, LCD=window.FreshLCD, MODELS=window.FreshModels, STRUCT=window.FreshStructured;
if(!STRUCT)throw Error('Structured textbook editor unavailable');
if(!MODELS)throw Error('Missing CASIO model profile definitions');
const $=(id)=>document.getElementById(id);
const requestedModel=new URLSearchParams(location.search).get('model');
const initialModel=MODELS.profiles[requestedModel]?requestedModel:MODELS.defaultModel;
const modeNames=MODELS.get(initialModel).modes;
const state={power:true,model:initialModel,mode:'COMP',editor:STRUCT.create(),angle:'DEG',format:'Norm2',digits:3,math:true,shift:false,alpha:false,hyp:false,input:'',cursor:0,
 screen:'edit',result:'',raw:0,ans:0,preAns:0,history:[],memory:{A:0,B:0,C:0,D:0,E:0,F:0,M:0,X:0,Y:0},
 insert:true,error:'',info:'',menu:[],menuTitle:'',menuEntries:[],menuPage:0,flow:null,outputLines:[],outputPage:0,decimal:false,recording:false,keylog:[],storedInputs:[]};
const maxEntries=300;
const releaseModifier=()=>{state.shift=false;state.alpha=false};
const notify=(text,isError=false)=>{const el=$('notice');el.textContent=text;el.classList.toggle('error',isError)};
function paint(){
 LCD.draw($('lcd'),state);
 $('lcd-shift').textContent=state.shift?'S':'';$('lcd-alpha').textContent=state.alpha?'A':'';
 $('lcd-angle').textContent=state.angle==='DEG'?'D':state.angle==='RAD'?'R':'G';$('lcd-math').textContent=state.mode==='COMP'?'Math':state.mode;
 if(!$('lcd-panel').hidden){const ctx=$('lcd-large').getContext('2d');if(ctx){ctx.imageSmoothingEnabled=false;ctx.drawImage($('lcd'),0,0,$('lcd-large').width,$('lcd-large').height)}}
 $('lcd').setAttribute('aria-label',state.screen==='menu'?'LCD menu '+state.menuTitle+', page '+(state.menuPage+1)+', '+state.menu.map(x=>x.number+' '+x.label).join('; '):state.screen==='prompt'?'LCD prompt '+state.flow.title+', '+(state.flow.index+1)+' of '+state.flow.fields.length+', '+state.flow.fields[state.flow.index].label+' equals '+state.flow.buffer:state.screen==='flow-result'?'LCD result '+state.outputLines.join('; '):'Calculator '+state.mode+', '+state.angle+', expression '+state.input+', result '+state.result);
 $('model-label').textContent=MODELS.get(state.model).label;
 $('mode-label').textContent=state.mode;$('angle-label').textContent=state.angle;$('format-label').textContent=state.format==='Fix'||state.format==='Sci'?state.format+' '+state.digits:state.format;
 $('memory-label').textContent='M = '+M.format(state.memory.M,{...state,math:false});
 $('expression-text').textContent=state.screen==='prompt'?state.flow.fields[state.flow.index].label+' = '+state.flow.buffer:state.screen==='menu'?state.menuTitle:state.input||'Ready';$('answer-text').textContent=state.screen==='flow-result'?state.outputLines.slice(state.outputPage*3,state.outputPage*3+3).join(' / '):state.result||'0';
 document.querySelectorAll('.key-unit').forEach(el=>{
  const id=el.querySelector('button').dataset.key;
  el.classList.toggle('lit',(id==='SHIFT'&&state.shift)||(id==='ALPHA'&&state.alpha));
 });
}
function setResult(value,source=state.input){
 state.preAns=state.ans;state.ans=value;state.raw=value;state.decimal=false;
 state.result=M.format(value,state,state.math&&source.includes('/'));state.screen='result';state.error='';
 state.history.unshift({source,value,mode:state.mode,angle:state.angle});if(state.history.length>80)state.history.pop();
 notify('Calculated successfully');paint();
}
function error(message){state.error=message.includes('ERROR')||message==='Cannot Solve'?message:'Math ERROR';state.screen='error';releaseModifier();notify(message,true);paint()}
function evaluate(){try{
 const source=STRUCT.serialize(state.editor,true);
 if(!source)throw new M.MathFault('Syntax ERROR');
 const result=M.evaluate(source,{...state,ans:state.ans,preAns:state.preAns,memory:state.memory});
 setResult(result);
}catch(e){error(e.message||'Math ERROR')}}
function syncEditor(){
 state.input=STRUCT.serialize(state.editor);
 state.cursor=state.editor.path.length?state.input.length:state.editor.offset;
}
function beginEdit(){
 if(state.screen!=='edit'){
  state.screen='edit';state.input='';state.cursor=0;state.result='';state.error='';
  state.editor=STRUCT.create();
 }
}
function insert(text){
 if(!state.power)return;
 beginEdit();
 if(state.input.length+text.length>220){error('Input limit');return}
 STRUCT.insert(state.editor,text);
 syncEditor();releaseModifier();notify('Editing textbook expression');paint();
}
function insertTemplate(type){
 if(!state.power)return;
 beginEdit();
 if(state.input.length>210){error('Input limit');return}
 STRUCT.template(state.editor,type);
 syncEditor();releaseModifier();notify('Use arrow keys to move between placeholders');paint();
}
function loadExpression(text){
 state.editor=STRUCT.fromString(text);
 syncEditor();state.screen='edit';state.result='';releaseModifier();paint();
}
function reset(mode='all'){
 state.menuEntries=[];state.flow=null;state.menu=[];state.outputLines=[];state.editor=STRUCT.create();state.input='';state.cursor=0;state.result='';state.ans=0;state.preAns=0;state.raw=0;state.screen='edit';state.error='';state.decimal=false;state.hyp=false;releaseModifier();
 if(mode==='all'){state.mode='COMP';state.angle='DEG';state.format='Norm2';state.digits=3;state.math=true;state.memory=Object.fromEntries(Object.keys(state.memory).map(k=>[k,0]));state.history=[]}
 notify('Calculator reset');paint()
}
// All calculation interactions use the calculator's 96 x 31 LCD and 50 keys.
// The companion panels are read-only; they never collect a mathematical value.
function optionDialog(title,entries){
 state.menuTitle=title;state.menuEntries=entries;state.menuPage=0;state.screen='menu';
 showMenu();
}
function showMenu(){
 state.menu=state.menuEntries.slice(state.menuPage*6,state.menuPage*6+6).map((e,i)=>({
  label:e.label,number:i+1
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
 state.flow={title,fields:prepared,index:0,values:{},buffer:String(fields[0]?.value??''),editing:false,run};
 state.screen='prompt';releaseModifier();state.info='';paint();
}
function flowField(){return state.flow.fields[state.flow.index]}
function flowNext(){
 const f=state.flow,field=flowField();f.values[field.id]=f.buffer;
 if(f.index<f.fields.length-1){f.index++;f.buffer=String(flowField().value??'');f.editing=false;state.info='';paint();return}
 try{
  const output=f.run({...f.values});
  const lines=String(output??state.result??'0').split(/\n/).flatMap(line=>{
    if(line.length<=22)return [line];
    const parts=[];for(let i=0;i<line.length;i+=22)parts.push(line.slice(i,i+22));return parts;
  });
  state.flow=null;state.outputLines=lines;state.outputPage=0;state.screen='flow-result';state.info='';
  notify('Calculation completed. UP/DOWN: scroll; AC: exit');paint();
 }catch(e){state.info=String(e.message||'Math ERROR').slice(0,23);notify(state.info,true);paint()}
}
function flowHandle(key){
 const f=state.flow;if(!f)return false;
 if(key==='AC'){state.flow=null;state.screen='edit';releaseModifier();state.info='';paint();return true}
 if(key==='EQUAL'){releaseModifier();flowNext();return true}
 if(key==='UP'){
  if(f.index>0){f.values[flowField().id]=f.buffer;f.index--;f.buffer=f.values[flowField().id]??String(flowField().value??'');f.editing=false}
  paint();return true
 }
 const field=flowField();const choices=field.choices||OPTION_CHOICES[field.id];
 if(choices&&(key==='LEFT'||key==='RIGHT')){
  const at=Math.max(0,choices.indexOf(f.buffer));f.buffer=choices[(at+(key==='RIGHT'?1:choices.length-1))%choices.length];f.editing=false;paint();return true;
 }
 if(key==='DEL'){f.buffer=f.buffer.slice(0,-1);f.editing=true;paint();return true}
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
 else if(key==='NEG'||key==='SUB')addition='-';
 else if(key==='ADD')addition='+';
 else if(key==='MUL')addition='*';
 else if(key==='DIV')addition='/';
 else if(key==='LP')addition='(';
 else if(key==='RP')addition=')';
 else if(key==='POWER')addition='^';
 else if(key==='SQUARE')addition='^2';
 else if(key==='EXP')addition='e';
 else if(key==='FRAC')addition='/';
 else if(key==='SQRT')addition='sqrt(';
 else if(key==='SIN')addition='sin(';
 else if(key==='COS')addition='cos(';
 else if(key==='TAN')addition='tan(';
 else if(key==='LOG')addition='log(';
 else if(key==='LN')addition='ln(';
 else if(key==='ANS')addition='Ans';
 if(addition!==null){
  if(f.editing===false){f.buffer='';f.editing=true}
  if(f.buffer.length+addition.length<=170)f.buffer+=addition;
  releaseModifier();paint();return true;
 }
 return true;
}
function menuHandle(key){
 if(key==='AC'){state.menuEntries=[];state.menu=[];state.screen='edit';state.info='';paint();return true}
 if(key==='RIGHT'||key==='DOWN'){
  if((state.menuPage+1)*6<state.menuEntries.length){state.menuPage++;showMenu()}return true
 }
 if(key==='LEFT'||key==='UP'){
  if(state.menuPage>0){state.menuPage--;showMenu()}return true
 }
 if(/^[1-6]$/.test(key)){
  const item=state.menuEntries[state.menuPage*6+Number(key)-1];
  if(item){state.menuEntries=[];state.menu=[];state.screen='edit';item.action();paint()}
  return true;
 }
 return true;
}
function applyAdvancedResult(value,description){if(typeof value==='number'){state.ans=value;state.raw=value;state.result=M.format(value,state);state.screen='result';state.input=description||state.input;state.cursor=state.input.length;paint()}}
function functionFor(expr){return x=>M.evaluate(expr,{...state,ans:state.ans,memory:{...state.memory,X:x},math:false})}
function numericalFlow(kind){
 const modes={SOLVE:'SOLVE — numerical root',DERIVATIVE:'d/dx — derivative at X',INTEGRAL:'∫ — definite integral',SUM:'Σ — finite sum'};
 const fields=[{id:'expression',label:'Expression in X',value:state.input||'X^2-2'}];
 if(kind==='DERIVATIVE')fields.push({id:'at',label:'At X',value:'2'});
 if(kind==='SOLVE')fields.push({id:'guess',label:'Initial X',value:'1'});
 if(kind==='INTEGRAL'||kind==='SUM')fields.push({id:'a',label:'Lower bound',value:'0'},{id:'b',label:'Upper bound',value:'1'});
 fieldForm(modes[kind],fields,data=>{const f=functionFor(data.expression);let x;
  if(kind==='DERIVATIVE')x=M.derivative(f,Number(data.at));
  if(kind==='INTEGRAL')x=M.integrate(f,Number(data.a),Number(data.b));
  if(kind==='SOLVE')x=M.solve(f,Number(data.guess));
  if(kind==='SUM'){const a=Number(data.a),b=Number(data.b);if(!Number.isInteger(a)||!Number.isInteger(b)||b-a>20000||b<a)throw Error('Argument ERROR');x=0;for(let k=a;k<=b;k++)x+=f(k)}
  applyAdvancedResult(x,data.expression);return M.format(x,state);
 })
}
function formatDMS(value){const sign=value<0?'-':'';let n=Math.abs(value);const d=Math.floor(n);n=(n-d)*60;const m=Math.floor(n);const s=Number(((n-m)*60).toFixed(8));return sign+d+'°'+m+'′'+s+'″'}
function memoryDialog(store=false){optionDialog(store?'STO — select register':'RCL — select register',Object.keys(state.memory).map(r=>({label:r+' = '+M.format(state.memory[r],{...state,math:false}),action:()=>{
  if(store){state.memory[r]=state.ans;notify('Stored Ans in '+r);paint()}else insert(r)
 }})))}
function setupMenu(){optionDialog('SETUP — angle and display',[
 {label:'DEG',action:()=>{state.angle='DEG';paint()}},{label:'RAD',action:()=>{state.angle='RAD';paint()}},{label:'GRAD',action:()=>{state.angle='GRAD';paint()}},
 {label:'MathIO',action:()=>{state.math=true;paint()}},{label:'LineIO',action:()=>{state.math=false;paint()}},
 {label:'Norm 1',action:()=>{state.format='Norm1';paint()}},{label:'Norm 2',action:()=>{state.format='Norm2';paint()}},
 {label:'Fix digits',action:()=>digitOption('Fix')},{label:'Sci digits',action:()=>digitOption('Sci')}
 ])}
function digitOption(kind){optionDialog(kind+' — decimal digits',Array.from({length:10},(_,i)=>({label:String(i),action:()=>{state.format=kind;state.digits=i;paint()}})))}
function modeMenu(){optionDialog('MODE',MODELS.get(state.model).modes.map((mode,i)=>({label:(i+1)+'. '+mode,action:()=>setMode(mode)})))}
function setMode(mode){if(!MODELS.supports(state.model,mode)){notify('Not available for '+MODELS.get(state.model).label,true);return}
 state.editor=STRUCT.create();state.mode=mode;state.input='';state.cursor=0;state.result='';state.screen='edit';releaseModifier();notify(mode+' mode');paint();if(mode!=='COMP')advancedMode(mode)}
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
 if(mode==='STAT')return fieldForm('STAT — one-variable statistics',[{id:'data',label:'Observations, separated by commas',value:'1,2,3,4,5'}],d=>{
  const s=M.descriptiveStats(parseCsv(d.data));applyAdvancedResult(s.mean,'STAT mean');return Object.entries(s).map(([k,v])=>k+' = '+(v===null?'N/A':M.format(v,{...state,math:false}))).join('\n')});
 if(mode==='CMPLX')return fieldForm('CMPLX — complex arithmetic',[{id:'z1',label:'First complex number (a,b)',value:'2,3'},{id:'z2',label:'Second complex number (c,d)',value:'4,5'},{id:'op',label:'Operation: +, -, *, /, abs, arg',value:'+'}],d=>{
  const [a,b]=parseCsv(d.z1),[c,e]=parseCsv(d.z2),op=d.op.trim();if([a,b,c,e].some(x=>!Number.isFinite(x)))throw Error('Argument ERROR');let r,k;
  if(op==='+'){r=a+c;k=b+e}else if(op==='-'){r=a-c;k=b-e}else if(op==='*'){r=a*c-b*e;k=a*e+b*c}
  else if(op==='/'){const den=c*c+e*e;if(!den)throw Error('Math ERROR');r=(a*c+b*e)/den;k=(b*c-a*e)/den}
  else if(op==='abs'){r=Math.hypot(a,b);k=0}else if(op==='arg'){r=M.fromRadians(Math.atan2(b,a),state.angle);k=0}
  else throw Error('Operation must be + - * / abs arg');applyAdvancedResult(r,op+' complex');return M.format(r,state)+(k<0?' - ':' + ')+M.format(Math.abs(k),state)+'i'
 });
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
 if(mode==='TABLE')return fieldForm('TABLE — values of f(X)',[{id:'expression',label:'f(X)',value:'X^2-2'},{id:'start',label:'Start',value:'-3'},{id:'end',label:'End',value:'3'},{id:'step',label:'Step',value:'1'}],d=>{
  const a=+d.start,b=+d.end,h=+d.step;if(h<=0||b<a||(b-a)/h>60)throw Error('Argument ERROR');const fn=functionFor(d.expression);const rows=[];for(let x=a;x<=b+h/1e6;x+=h)rows.push(M.format(x,{math:false})+'  →  '+M.format(fn(x),state));return rows.join('\n')
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
function alphaKey(key){const variables={NEG:'A',DMS:'B',HYP:'C',SIN:'D',COS:'E',TAN:'F',LP:'X',RP:'Y',MPLUS:'M'};
 if(variables[key])return insert(variables[key]);
 if(key==='EXP')return insert('e');if(key==='DOT')return insert('RanInt(');if(key==='CALC')return insert('=');return null
}
function shifted(key){
 const n=Number(key);
 if(key==='AC'){state.power=false;state.screen='edit';state.input='';state.result='';releaseModifier();notify('Calculator off — press ON');paint();return true}
 if(key==='MODE'){releaseModifier();setupMenu();return true}
 if(key==='RCL'){releaseModifier();memoryDialog(true);return true}
 if(key==='DEL'){state.insert=!state.insert;releaseModifier();notify(state.insert?'Insert mode':'Overwrite mode');paint();return true}
 if(key==='9'){releaseModifier();optionDialog('CLR — choose data to reset',[
  {label:'1. Memory',action:()=>{Object.keys(state.memory).forEach(r=>state.memory[r]=0);paint()}},
  {label:'2. Setup',action:()=>{state.angle='DEG';state.format='Norm2';state.digits=3;paint()}},
  {label:'3. All',action:()=>reset('all')}]);return true}
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
 if(key==='MPLUS'){state.memory.M-=state.ans;releaseModifier();paint();return true}
 if(key==='SD'){releaseModifier();toggleFraction();return true}
 if(key==='DMS'){releaseModifier();notify('Decimal-to-DMS function available with °′″');paint();return true}
 if(key==='ANS'){state.angle=state.angle==='DEG'?'RAD':state.angle==='RAD'?'GRAD':'DEG';releaseModifier();paint();return true}
 if(key==='DOT'){releaseModifier();insert('rand');return true}
 if(key==='0'){releaseModifier();state.ans=Number(state.ans.toFixed(state.digits));state.result=M.format(state.ans,state);paint();return true}
 if(key==='MUL'){releaseModifier();insert('nPr');return true}
 if(key==='DIV'){releaseModifier();insert('nCr');return true}
 if(key==='ADD'||key==='SUB'){releaseModifier();insert(key==='ADD'?',':',');return true}
 if(insertions[key]!==undefined){releaseModifier();if(insertions[key])insert(insertions[key]);else notify('Function requires a result or an input');paint();return true}
 if(['1','2','3','4','5','6'].includes(key)){releaseModifier();const mapped={'1':'STAT','2':'CMPLX','3':'BASE-N','4':'MATRIX','5':'VECTOR','6':'VERIF'};setMode(mapped[key]);return true}
 return false
}
function toggleFraction(){if(state.screen!=='result'||!Number.isFinite(state.raw)){notify('Calculate first');return}
 state.decimal=!state.decimal;state.result=M.format(state.raw,{...state,math:!state.decimal},true);paint()}
function press(key){
 const before={mode:state.mode,shift:state.shift,alpha:state.alpha,screen:state.screen,input:state.input};
 try{handle(key)}catch(e){error(e.message||'Math ERROR')}
 if(state.recording){state.keylog.push({key,before,after:{mode:state.mode,screen:state.screen,result:state.result}});if(state.keylog.length>maxEntries)state.keylog.shift();if(!$('keylog-panel').hidden)renderKeylog()}
}
function handle(key){
 if(key==='ON'){state.power=true;state.screen='edit';releaseModifier();notify('Calculator on');paint();return}
 if(!state.power)return;
 if(state.screen==='menu'){menuHandle(key);return}
 if(state.screen==='prompt'){flowHandle(key);return}
 if(state.screen==='flow-result'){if(key==='UP'||key==='DOWN'){state.outputPage=Math.max(0,Math.min(Math.ceil(state.outputLines.length/3)-1,state.outputPage+(key==='DOWN'?1:-1)));paint();return}if(key==='AC'){state.screen='edit';state.outputLines=[];state.info='';paint();return}if(key==='MODE'){modeMenu();return}state.screen='edit'}
 if(key==='SHIFT'){state.shift=!state.shift;state.alpha=false;paint();return}
 if(key==='ALPHA'){state.alpha=!state.alpha;state.shift=false;paint();return}
 if(state.shift&&shifted(key))return;
 if(state.alpha){state.alpha=false;if(alphaKey(key)!==null)return}
 if(key==='MODE'){releaseModifier();modeMenu();return}
 if(key==='AC'){state.editor=STRUCT.create();state.input='';state.cursor=0;state.screen='edit';state.result='';state.error='';state.info='';releaseModifier();notify('Cleared input');paint();return}
 if(key==='DEL'){if(state.screen==='error'){state.screen='edit';state.error=''}if(state.screen==='result')state.screen='edit';STRUCT.backspace(state.editor);syncEditor();releaseModifier();paint();return}
 if(key==='LEFT'||key==='RIGHT'){if(state.screen==='result'){state.screen='edit'}STRUCT.navigate(state.editor,key);syncEditor();paint();return}
 if(key==='UP'||key==='DOWN'){if(state.screen==='edit'&&STRUCT.navigate(state.editor,key)){syncEditor();paint();return}const items=state.history;if(!items.length)return;let idx=state.storedInputs.length?state.storedInputs[0]:-1;idx=Math.max(0,Math.min(items.length-1,idx+(key==='UP'?1:-1)));state.storedInputs=[idx];state.editor=STRUCT.fromString(items[idx].source);syncEditor();state.screen='edit';paint();return}
 if(key==='EQUAL'){if(state.mode!=='COMP'){advancedMode(state.mode);return}evaluate();return}
 if(key==='RCL'){memoryDialog(false);return}
 if(key==='MPLUS'){state.memory.M+=state.screen==='result'?state.raw:state.ans;notify('Added to M');paint();return}
 if(key==='SD'){toggleFraction();return}
 if(key==='CALC'){fieldForm('CALC — substitute a variable',[{id:'variable',label:'Variable name (A-F, X, Y)',value:'X'},{id:'value',label:'Value for variable',value:'2'}],d=>{
  const k=d.variable.toUpperCase();if(!Object.prototype.hasOwnProperty.call(state.memory,k))throw Error('Unknown variable');state.memory[k]=Number(d.value);const n=M.evaluate(state.input,{...state,memory:state.memory,ans:state.ans});applyAdvancedResult(n,state.input);return M.format(n,state)
 });return}
 if(key==='INTEGRAL'){numericalFlow('INTEGRAL');return}
 if(key==='LOGBASE'){insert('log(');return}
 if(key==='ENG'){if(state.screen==='result'){state.result=state.raw.toExponential(8);paint();return}insert('e');return}
 if(key==='DMS'){if(state.screen==='result'){state.result=formatDMS(state.raw);paint();return}insert('°');return}
 if(key==='HYP'){state.hyp=!state.hyp;notify(state.hyp?'Hyperbolic trig selected':'Ordinary trig selected');paint();return}
 if(key==='NEG'){insert('-');return}
 const funcs={SIN:'sin(',COS:'cos(',TAN:'tan(',SQRT:'sqrt(',LOG:'log(',LN:'ln('};
 if(key==='FRAC'){insertTemplate('fraction');return}
 if(key==='POWER'){insertTemplate('power');return}
 if(key==='SQRT'&&!state.hyp){insertTemplate('squareRoot');return}
 if(funcs[key]){const text=state.hyp?{SIN:'sinh(',COS:'cosh(',TAN:'tanh('}[key]||funcs[key]:funcs[key];state.hyp=false;insert(text);return}
 const ops={MUL:'*',DIV:'/',ADD:'+',SUB:'-',LP:'(',RP:')',DOT:'.',RECIP:'^(-1)',SQUARE:'^2',EXP:'e',ANS:'Ans'};
 if(Object.prototype.hasOwnProperty.call(ops,key)){insert(ops[key]);return}
 if(/^\d$/.test(key)){insert(key);return}
 notify('This key is not available in the current state',true);paint();
}
function renderKeylog(){const list=$('keylog-list');list.textContent='';const frag=document.createDocumentFragment();for(const entry of state.keylog){const el=document.createElement('li');el.textContent=(entry.before.shift?'SHIFT+':entry.before.alpha?'ALPHA+':'')+entry.key+' ('+entry.before.mode+') → '+entry.after.screen+(entry.after.result?' ['+entry.after.result+']':'');frag.append(el)}list.append(frag);$('keylog-count').textContent=(state.recording?'Recording on':'Recording off')+' — '+state.keylog.length+' / '+maxEntries+' entries';$('record-keylog').textContent=state.recording?'Stop recording':'Start recording'}
function download(name,content,type){const blob=content instanceof Blob?content:new Blob([content],{type});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}
function runChecks(){const checks=[
 ['precedence',()=>M.evaluate('2+3*4')===14],['power precedence',()=>M.evaluate('-2^2')===-4],['right-associative powers',()=>M.evaluate('2^3^2')===512],
 ['fraction',()=>M.evaluate('1/3+1/6')===.5],['degrees',()=>Math.abs(M.evaluate('sin(30)',{angle:'DEG'})-.5)<1e-12],
 ['radians',()=>Math.abs(M.evaluate('sin(pi/2)',{angle:'RAD'})-1)<1e-12],['combinations',()=>M.evaluate('5nCr2')===10],
 ['factorial',()=>M.evaluate('5!')===120],['negative roots rejected',()=>{try{M.evaluate('sqrt(-1)');return false}catch{return true}}],
 ['implicit multiplication',()=>Math.abs(M.evaluate('2pi')-2*Math.PI)<1e-12],['variables',()=>M.evaluate('X^2',{memory:{X:3}})===9],
 ['quadratic roots',()=>M.quadratic(1,-3,2).length===2],['matrix solve',()=>M.matrixSolve([[2,1,5],[1,-1,1]]).every(Number.isFinite)],
 ['numerical derivative',()=>Math.abs(M.derivative(x=>x*x,2)-4)<1e-9],['numerical integral',()=>Math.abs(M.integrate(x=>x*x,0,1)-1/3)<1e-9],
 ['physical keys',()=>K.keys.length===50],['degree postfix',()=>Math.abs(M.evaluate('sin(30°)',{angle:'RAD'})-.5)<1e-12],['LCD buffer',()=>LCD.rasterize(state).length===96*31]
 ];const results=checks.map(([label,fn])=>{try{return {label,pass:!!fn()}}catch(e){return {label,pass:false,error:e.message}}});const passed=results.filter(x=>x.pass).length;
 const el=$('test-result');el.className='test-result '+(passed===checks.length?'good':'bad');el.textContent=passed+'/'+checks.length+' tests passed'+(passed===checks.length?'':': '+results.filter(x=>!x.pass).map(x=>x.label).join(', '));return results}
function keyboard(e){if(e.ctrlKey||e.altKey||e.metaKey||e.isComposing)return;const target=e.target;if(target.matches('input,textarea,select,[contenteditable]'))return;
 if(state.screen==='prompt'&&e.key.length===1&&/^[a-zA-Z,=<>!\s]$/.test(e.key)){e.preventDefault();press('TEXT:'+e.key);return}
 const map={Enter:'EQUAL',Backspace:'DEL',Delete:'DEL',Escape:'AC',ArrowLeft:'LEFT',ArrowRight:'RIGHT',ArrowUp:'UP',ArrowDown:'DOWN','+':'ADD','-':'SUB','*':'MUL','/':'DIV','(':'LP',')':'RP','.':'DOT','^':'POWER'};
 const key=map[e.key]||(/^\d$/.test(e.key)?e.key:null);if(key){e.preventDefault();press(key)}}
K.mount($('keys'),press);
$('model-selector').value=state.model;
$('model-selector').addEventListener('change',e=>setModel(e.target.value));
$('run-checks').addEventListener('click',runChecks);
$('enlarge').addEventListener('click',()=>{$('lcd-panel').hidden=!$('lcd-panel').hidden;paint()});
$('capture').addEventListener('click',()=>$('lcd').toBlob(blob=>{if(blob)download('independent-calculator-lcd.png',blob,'image/png')}));
$('keylog-toggle').addEventListener('click',()=>{$('keylog-panel').hidden=!$('keylog-panel').hidden;renderKeylog()});
$('record-keylog').addEventListener('click',()=>{state.recording=!state.recording;renderKeylog()});$('clear-keylog').addEventListener('click',()=>{state.keylog=[];renderKeylog()});
$('export-keylog').addEventListener('click',()=>download('independent-calculator-keylog.json',JSON.stringify({schema:'fresh-calculator-1',entries:state.keylog},null,2),'application/json'));
document.addEventListener('keydown',keyboard);
paint();
window.FreshCalculator=Object.freeze({press,runChecks,loadExpression,setModel,modelProfiles:MODELS.profiles,getStructured:()=>structuredClone(state.editor),getState:()=>{const {menuEntries,flow,...snapshot}=state;return structuredClone({...snapshot,flow:flow?{title:flow.title,index:flow.index,buffer:flow.buffer,values:{...flow.values}}:null,menuEntries:menuEntries.map(x=>x.label)})}});
})();
