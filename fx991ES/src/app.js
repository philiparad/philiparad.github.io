(function(){'use strict';
const K=window.FX991,$=id=>document.getElementById(id);
const SESSION=window.FX991_SESSION;const smokeMode=new URLSearchParams(location.search).has('smoke');let localStore=null;try{localStore=smokeMode?null:window.localStorage}catch(e){}const recovered=SESSION.recover(localStore);let state=recovered||K.createState('standard');const E=window.FX991_EDITOR;let lastAnnouncement='';
const labels={EXP10:'×10ˣ',RECIP:'x⁻¹',DMS:'°′″',HYP:'hyp',LEFT:'◀',UP:'▲',DOWN:'▼',RIGHT:'▶',SQ:'x²',POW:'x^□',SQRT:'√',SIN:'sin',COS:'cos',TAN:'tan',LP:'(',RP:')',DIV:'÷',MUL:'×',SUB:'−',ADD:'+',NEG:'(-)',ANS:'Ans',PI:'π','S-D':'S⇔D',FRAC:'a/b',LOG:'log',LN:'ln',RCL:'RCL',MODE:'MODE'};
const keypadLayout=window.FX991_KEYPAD_LAYOUT;
if(!keypadLayout)throw Error('Physical keypad layout module missing');
function keyEvent(key){state=K.dispatchKey(state,key);render();if(state.view==='result'||state.view==='error')announce((state.view==='error'?'Error: ':'Result: ')+(state.error||state.result))}
function announce(message){if(message!==lastAnnouncement){lastAnnouncement=message;$('announcements').textContent=message}}
for(const [groupName,items] of Object.entries(keypadLayout)){
 const group=document.createElement('div');group.className='keypad-group keypad-'+groupName;group.setAttribute('role','group');
 group.setAttribute('aria-label',groupName+' calculator controls');
 for(const item of items){
  const cell=document.createElement('div');cell.className='key-cell';
  if(!item.key){cell.classList.add('key-spacer');cell.setAttribute('aria-hidden','true');group.append(cell);continue}
  const alternative=document.createElement('div');alternative.className='alt';alternative.textContent=item.legend||' ';
  const button=document.createElement('button');button.type='button';button.className='key '+item.tone;
  button.textContent=labels[item.key]||item.key;
  button.setAttribute('aria-label',item.key+' calculator key'+(item.enabled?'':' (not implemented)'));
  if(!item.enabled){button.disabled=true;button.title='Not implemented — teaching panel may provide a separate operation';}
  else button.addEventListener('click',()=>keyEvent(item.key==='RCL'&&!state.shift?'RCL_MENU':item.key));
  cell.append(alternative,button);group.append(cell);
 }
 $('keypad').append(group);
}
function drawLCD(pixels){const ctx=$('lcd').getContext('2d'),data=ctx.createImageData(96,31);for(let i=0;i<pixels.length;i++){const pos=i*4,on=pixels[i];data.data[pos]=on?32:203;data.data[pos+1]=on?45:213;data.data[pos+2]=on?31:189;data.data[pos+3]=255}ctx.putImageData(data,0,0)}
function renderNatural(){
 const el=$('natural-preview'),info=$('natural-info');
 if(state.mode!=='COMP'){el.textContent='Available in COMP mode';info.textContent='';return}if(K.effectiveDisplayStyle(state.setup,state.mode)==='LineIO'){el.textContent=state.expression||' ';info.textContent='Linear input mode';el.setAttribute('aria-label','Linear expression '+(state.expression||'empty'));return}
 if(!state.document){el.textContent='Editor unavailable';return}
 el.innerHTML=E.renderHTML(state.document);
 const missing=E.invalidSlots(state.document),stats=E.inspect(state.document);
 el.setAttribute('aria-label','Expression '+(E.screenText(state.document)||'empty')+'; '+missing.length+' missing fields');
 info.textContent=stats.nodes+' nodes / '+missing.length+' empty fields';
 el.classList.toggle('invalid',missing.length>0);
}
function render(){const semantic=K.semanticScreen(state);drawLCD(K.rasterizeScreen(semantic));$('lcd').setAttribute('aria-label','Calculator: '+semantic.mode+'; expression '+semantic.expression+'; result '+semantic.result);$('wizard-detail').textContent=state.view==='workflow-menu'?'Choose operation using digit keys; DOWN switches the menu page.':state.view==='coefficient'&&state.ui?.wizard?'Field '+(state.ui.wizard.index+1)+'/'+state.ui.wizard.fields.length+': '+state.ui.wizard.fields[state.ui.wizard.index]+' = '+state.ui.wizard.buffer+' | Press = to confirm, LEFT/RIGHT to navigate.':state.view==='result'&&state.ui?.lastWizard?'Completed '+state.ui.lastWizard.mode+' '+state.ui.lastWizard.kind+'; UP/DOWN browse result rows when available.':state.view==='register-menu'?'Choose 1=A, 2=B or 3=C to edit a persistent register.':state.view==='register-editor'?'Enter values, = or RIGHT to advance; SIZE switches dimensions.':state.view==='register-summary'?'OP calculates; EDIT revises values; REGS chooses another register.':state.view==='register-operation'?'Select operation 1–5, OTHER swaps second register B/C.':state.view==='stat-grid'?'= enters a cell; PAIR changes dataset type; ADDROW/DELROW edit rows; STATS calculates.':'Keypad workflows: MODE → EQN, MATRIX, VECTOR, STAT, TABLE.'; $('semantic').textContent='Mode: '+state.mode+'    State: '+state.view+'\nExpression: '+state.expression+'\nResult: '+(state.view==='error'?state.error:state.result)+'\nCursor: '+state.cursor+'    Indicators: '+semantic.indicators.join(', ')+'\nEditing: '+(state.ui?.insertMode===false?'OVERWRITE':'INSERT')+'\nFrame hash: '+K.frameHash(K.rasterizeScreen(semantic));$('expression').value=state.expression;$('model').value=state.model;$('display-style').value=K.effectiveDisplayStyle(state.setup,'COMP');$('angle').value=state.setup.angle;$('format').value=state.setup.format;$('digits').value=String(state.setup.digits);$('register-value').value=K.valueToString(state.memory[$('register').value]);renderNatural();syncModePanel();SESSION.store(localStore,state);const hist=$('history');hist.textContent='';if(!state.history.length)hist.textContent='No calculations yet.';for(const h of state.history){let b=document.createElement('button');b.type='button';b.textContent=h.expression+' = '+h.display;b.onclick=()=>{state={...state,view:'edit',expression:h.expression,cursor:h.expression.length,document:E.fromSource(h.expression),result:h.display};render()};hist.append(b)}}
function setSource(text){state={...state,expression:text,cursor:text.length,document:E.fromSource(text),view:'edit',result:'',error:null};render()}
const toolbar=[['REGS','Matrix/vector registers'],['DATA','STAT data editor'],['SIZE','Change dimensions'],['OP','Register operations'],['EDIT','Edit register'],['OTHER','Other register B/C'],['PAIR','STAT pair mode'],['ADDROW','Add STAT row'],['DELROW','Delete STAT row'],['STATS','Calculate STAT'],['RCL','Recall → register'],['SHIFT','SHIFT modifier'],['ALPHA','ALPHA modifier'],['FDEL','Delete forward'],['INS','Insert/overwrite'],['FRAC','Fraction'],['MIXIN','Mixed fraction (whole / numerator / denominator)'],['POW','Power'],['SQRT','Square root'],['NROOT','Nth root'],['SIN','sin( )'],['COS','cos( )'],['TAN','tan( )'],['SQ','Square'],['LOG','log( )'],['PI','π (teaching shortcut)'],['LP','( )'],['RIGHT','Next slot →'],['DOWN','Slot ↓'],['DEL','Delete']];
for(const [key,label] of toolbar){const b=document.createElement('button');b.type='button';b.className='button secondary';b.textContent=label;b.setAttribute('aria-label','Insert or navigate: '+label);b.onclick=()=>keyEvent(key);$('natural-toolbar').append(b)}
$('expression').addEventListener('input',e=>setSource(e.target.value));$('calculate').onclick=()=>keyEvent('=');$('model').onchange=e=>{state=K.createState(e.target.value);render();$('mode-source').value='';announce('Model changed to '+(e.target.value==='c'?'C edition':'standard edition'))};$('angle').onchange=e=>{state={...state,setup:{...state.setup,angle:e.target.value}};render()};$('display-style').onchange=e=>{state={...state,setup:{...state.setup,displayStyle:e.target.value},ui:{...state.ui,displayStyle:e.target.value}};
 if(state.lastValue&&state.view==='result'){state.decimalView=false;state.result=K.valueDisplay(state.lastValue,state.setup,false,state.mode)}
 render();announce('Display style '+e.target.value)};
$('format').onchange=e=>{state={...state,setup:{...state.setup,format:e.target.value}};if(state.lastValue)state.result=K.valueDisplay(state.lastValue,state.setup,state.decimalView,state.mode);render()};$('digits').onchange=e=>{state={...state,setup:{...state.setup,digits:Number(e.target.value)}};if(state.lastValue)state.result=K.valueDisplay(state.lastValue,state.setup,state.decimalView,state.mode);render()};$('register').onchange=render;
$('store').onclick=()=>{state={...state,selectedRegister:$('register').value};keyEvent('STO')};$('recall').onclick=()=>{state={...state,selectedRegister:$('register').value};keyEvent('RCL')};$('reset').onclick=()=>{state=K.createState(state.model);render();announce('Calculator reset')};$('sample').onclick=()=>{setSource(window.FX991_CMODES.SAMPLES[state.mode]||window.FX991_MODES.SAMPLES[state.mode]||'1+2')};
function download(name,text,type){let url=URL.createObjectURL(new Blob([text],{type}));let a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
$('trace-export').onclick=()=>download('fx991-key-trace.json',JSON.stringify({model:state.model,trace:state.trace},null,2),'application/json');$('export').onclick=()=>{let c=document.createElement('canvas');c.width=960;c.height=310;let x=c.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage($('lcd'),0,0,960,310);c.toBlob(blob=>{if(!blob)return;let u=URL.createObjectURL(blob),a=document.createElement('a');a.download='fx991-lcd.png';a.href=u;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)})};$('copy').onclick=()=>{if(navigator.clipboard?.writeText)navigator.clipboard.writeText(state.result).catch(()=>{})};
// Milestone 11: numerical operations share the kernel state and typed memory.
function showNumericalFields(){const operation=$('num-operation').value;for(const [id,show] of [['guess',operation==='SOLVE'],['at',operation==='DIFF'],['lower',operation==='INTEGRAL'||operation==='SUM'],['upper',operation==='INTEGRAL'||operation==='SUM'],['tolerance',operation==='INTEGRAL']]){$('num-'+id+'-box').hidden=!show}}
$('num-operation').onchange=showNumericalFields;
$('num-copy-source').onclick=()=>{$('num-source').value=state.expression};
$('num-run').onclick=()=>{
    const operation=$('num-operation').value, source=$('num-source').value;
    const params={guess:$('num-guess').value,at:$('num-at').value,lower:$('num-lower').value,upper:$('num-upper').value,tolerance:$('num-tolerance').value};
    state=window.FX991_NUM.execute(state,operation,source,params);render();
    const info=state.numericalDetails||{};
    $('num-details').textContent=state.error?state.error:('Result: '+state.result+'\n'+Object.entries(info).filter(([k,v])=>!['operation','source'].includes(k)&&v!==null).map(([k,v])=>k+': '+v).join('\n'));
};

// Milestone 13: dispatch standard and C-edition modes through the same kernel and history.
const modeHints={COMP:'Arithmetic and scientific functions.',CMPLX:'ADD|SUB|MUL|DIV: a,b|c,d; ABS|ARG|CONJ: a,b; POLAR: r,angle; RECT: re,im.',STAT:'1VAR: 1,2,3; LINEAR|QUAD|LOG|EEXP|ABEXP|POWER|INVERSE: x,y;x,y;...', 'BASE-N':'BIN|OCT|DEC|HEX: value [AND|OR|XOR|XNOR|+|-|*|/ value] or NOT(value), NEG(value).', EQN:'QUAD:a,b,c or CUBIC:a,b,c,d or LINEAR:matrix rows|constants. Example LINEAR:2,1;1,-1|5,1.',MATRIX:'DET|INV|TRANS|ABS|POW2|POW3: rows;...  or ADD|SUB|MUL:matrixA|matrixB.',TABLE:'f(X)|start|end|step. C model supports f(X);g(X)|start|end|step (maximum 20 rows).',VECTOR:'DOT|CROSS|ADD|SUB|ANGLE:vectorA|vectorB; ABS:vector; MUL:vector|scalar.',INEQ:'Quadratic or cubic inequality: LT|LE|GT|GE: coefficients a,b,c[,d]. Example LT:1,2,-3.',VERIF:'Comparison chain: 4*sqrt(9)=12; e.g. 1<2<3. TRUE stores Ans=1, FALSE stores Ans=0.',DIST:'Normal NPD:x,sigma,mu; NCD:lower,upper,sigma,mu; INV:p,sigma,mu. Discrete BPD|BCD:x,n,p; PPD|PCD:x,lambda. Lists: BPD:x1;x2|n,p or PPD:x1;x2|lambda.'};
function syncModePanel(){
 $('mode-picker').querySelectorAll('option').forEach(o=>o.disabled=(state.model!=='c'&&['INEQ','VERIF','DIST'].includes(o.value)));
 $('mode-picker').value=state.mode;
 $('mode-help').textContent=modeHints[state.mode]||'Choose the C model to use the C-edition extension modes.';
}
function switchMode(next){
 if(state.model!=='c'&&['INEQ','VERIF','DIST'].includes(next))return;
 state={...state,mode:next,view:'edit',expression:'',cursor:0,document:E.create(),result:'',error:null,history:[],historyCursor:-1};
 $('mode-source').value=window.FX991_CMODES.SAMPLES[next]||window.FX991_MODES.SAMPLES[next]||'';
 setSource($('mode-source').value);syncModePanel();
}
$('mode-picker').onchange=e=>{switchMode(e.target.value);announce('Mode '+state.mode)};
$('mode-example').onclick=()=>{let val=window.FX991_CMODES.SAMPLES[state.mode]||window.FX991_MODES.SAMPLES[state.mode]||'';$('mode-source').value=val;setSource(val)};
$('mode-evaluate').onclick=()=>{setSource($('mode-source').value);keyEvent('=');$('mode-detail').textContent=state.view==='error'?state.error:state.result};

// Milestone 14 accessible register standby confirmation.
const registerConfirm=document.createElement('button');
registerConfirm.type='button';registerConfirm.className='button secondary';
registerConfirm.textContent='Confirm register key';
registerConfirm.setAttribute('aria-label','Confirm selected register');
registerConfirm.onclick=()=>keyEvent($('register').value);
$('register').closest('.panel').querySelector('.actions').append(registerConfirm);
document.addEventListener('keydown',e=>{if(state.view==='register-prompt'&&/^[A-FMXY]$/i.test(e.key)&&!e.ctrlKey&&!e.altKey){e.preventDefault();keyEvent(e.key.toUpperCase())}});
// Milestone 29: recovery is strictly opt-in. Imports are validated before changing state.
$('session-recovery').checked=SESSION.enabled(localStore);if(recovered)$('session-status').textContent='Recovered '+recovered.mode+' session from this browser; active editing workflows are preserved when valid.';
$('session-recovery').onchange=e=>{const on=e.target.checked;if(!SESSION.enable(localStore,on)){e.target.checked=!on;$('session-status').textContent='Browser storage is unavailable.';return}if(on)SESSION.store(localStore,state);$('session-status').textContent=on?'Recovery enabled for this browser.':'Recovery disabled; saved session cleared.'};
$('session-export').onclick=()=>{try{download('fx991-session.json',SESSION.exportJSON(state),'application/json');$('session-status').textContent='Session exported.'}catch(e){$('session-status').textContent=e.message}};
$('session-import').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{if(f.size>90000)throw Error('Session file exceeds 90 KB');const restored=SESSION.importJSON(await f.text());state=restored;render();announce('Session imported');$('session-status').textContent=restored.view==='edit'?'Session restored. Results and temporary modifiers were cleared.':'Session restored with active '+restored.mode+' editing workflow.'}catch(err){$('session-status').textContent='Import rejected: '+err.message}finally{e.target.value=''}};
$('session-clear').onclick=()=>{SESSION.clear(localStore);$('session-status').textContent='Saved recovery data cleared (current calculator unchanged).'};
showNumericalFields();
$('a11y-audit').onclick=()=>{const r=window.FX991_DIFFERENTIAL.auditAccessibility(document);$('a11y-audit-result').textContent=r.controls+' controls checked; '+r.keyLabels+' calculator keys named; '+r.issues.length+' issues: '+r.issues.map(i=>i.type+(i.label?' ('+i.label+')':'')).join(', ');};
$('run-tests').onclick=()=>{const report=window.FX991_TESTS.run();$('test-summary').textContent=report.passed+'/'+report.total+' passed; '+report.failed+' failed. See detailed runner for cases.'};
document.addEventListener('keydown',event=>{const mapped=window.FX991_KEYBOARD.keyFor(event,document.activeElement);if(mapped){event.preventDefault();keyEvent(mapped)}});
render();
})();
