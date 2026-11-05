(function(){'use strict';
const K=window.FX991,$=id=>document.getElementById(id);
let state=K.createState('standard');const E=window.FX991_EDITOR;let lastAnnouncement='';
const keyrows=[
[['SHIFT','gold'],['ALPHA','gold'],['LEFT','dark'],['UP','dark'],['DOWN','dark'],['RIGHT','dark']],
[['MODE','dark','SETUP'],['ON','orange'],['RCL','dark'],['STO','dark'],['DEL','orange','INS'],['AC','orange','OFF']],
[['SQ','dark','x³'],['POW','dark'],['SQRT','dark','³√'],['SIN','dark','asin'],['COS','dark','acos'],['TAN','dark','atan']],
[['FRAC','dark'],['NROOT','dark'],['LOG','dark'],['LN','dark'],['LP','dark'],['RP','dark']],
[['7',''],['8',''],['9',''],['LP','dark'],['RP','dark'],['DIV','dark']],
[['4',''],['5',''],['6',''],['MUL','dark'],['SUB','dark'],['ADD','dark']],
[['1',''],['2',''],['3',''],['NEG','dark'],['ANS','dark'],['=','orange']],
[['0',''],['.',''],['PI','dark'],['S-D','dark'],['MODE','dark'],['AC','orange']]
];
const labels={FDEL:'DEL →',INS:'INS',LEFT:'◀',UP:'▲',DOWN:'▼',RIGHT:'▶',SQ:'x²',POW:'x^□',SQRT:'√',SIN:'sin',COS:'cos',TAN:'tan',LP:'(',RP:')',DIV:'÷',MUL:'×',SUB:'−',ADD:'+',NEG:'(-)',ANS:'Ans',PI:'π','S-D':'S⇔D',FRAC:'a/b',NROOT:'ⁿ√',LOG:'log',LN:'ln'};
function keyEvent(key){state=K.dispatchKey(state,key);render();if(state.view==='result'||state.view==='error')announce((state.view==='error'?'Error: ':'Result: ')+(state.error||state.result))}
function announce(message){if(message!==lastAnnouncement){lastAnnouncement=message;$('announcements').textContent=message}}
for(const row of keyrows)for(const [key,style,alt] of row){const cell=document.createElement('div');cell.className='key-cell';const alternative=document.createElement('div');alternative.className='alt';alternative.textContent=alt||(window.FX991_KEYS.profiles.standard.alpha[key]||' ');const button=document.createElement('button');button.type='button';button.className='key '+style;button.textContent=labels[key]||key;button.setAttribute('aria-label',key+' calculator key');button.addEventListener('click',()=>keyEvent(key));cell.append(alternative,button);$('keypad').append(cell)}
function drawLCD(pixels){const ctx=$('lcd').getContext('2d'),data=ctx.createImageData(96,31);for(let i=0;i<pixels.length;i++){const pos=i*4,on=pixels[i];data.data[pos]=on?32:203;data.data[pos+1]=on?45:213;data.data[pos+2]=on?31:189;data.data[pos+3]=255}ctx.putImageData(data,0,0)}
function renderNatural(){
 const el=$('natural-preview'),info=$('natural-info');
 if(state.mode!=='COMP'){el.textContent='Available in COMP mode';info.textContent='';return}
 if(!state.document){el.textContent='Editor unavailable';return}
 el.innerHTML=E.renderHTML(state.document);
 const missing=E.invalidSlots(state.document),stats=E.inspect(state.document);
 el.setAttribute('aria-label','Expression '+(E.screenText(state.document)||'empty')+'; '+missing.length+' missing fields');
 info.textContent=stats.nodes+' nodes / '+missing.length+' empty fields';
 el.classList.toggle('invalid',missing.length>0);
}
function render(){const semantic=K.semanticScreen(state);drawLCD(K.rasterizeScreen(semantic));$('lcd').setAttribute('aria-label','Calculator: '+semantic.mode+'; expression '+semantic.expression+'; result '+semantic.result);$('semantic').textContent='Mode: '+state.mode+'    State: '+state.view+'\nExpression: '+state.expression+'\nResult: '+(state.view==='error'?state.error:state.result)+'\nCursor: '+state.cursor+'    Indicators: '+semantic.indicators.join(', ')+'\nEditing: '+(state.ui?.insertMode===false?'OVERWRITE':'INSERT')+'\nFrame hash: '+K.frameHash(K.rasterizeScreen(semantic));$('expression').value=state.expression;$('model').value=state.model;$('angle').value=state.setup.angle;$('format').value=state.setup.format;$('digits').value=String(state.setup.digits);$('register-value').value=K.valueToString(state.memory[$('register').value]);renderNatural();syncModePanel();const hist=$('history');hist.textContent='';if(!state.history.length)hist.textContent='No calculations yet.';for(const h of state.history){let b=document.createElement('button');b.type='button';b.textContent=h.expression+' = '+h.display;b.onclick=()=>{state={...state,view:'edit',expression:h.expression,cursor:h.expression.length,document:E.fromSource(h.expression),result:h.display};render()};hist.append(b)}}
function setSource(text){state={...state,expression:text,cursor:text.length,document:E.fromSource(text),view:'edit',result:'',error:null};render()}
const toolbar=[['FDEL','Delete forward'],['INS','Insert/overwrite'],['FRAC','Fraction'],['POW','Power'],['SQRT','Square root'],['NROOT','Nth root'],['SIN','sin( )'],['COS','cos( )'],['TAN','tan( )'],['LOG','log( )'],['LP','( )'],['RIGHT','Next slot →'],['DOWN','Slot ↓'],['DEL','Delete']];
for(const [key,label] of toolbar){const b=document.createElement('button');b.type='button';b.className='button secondary';b.textContent=label;b.setAttribute('aria-label','Insert or navigate: '+label);b.onclick=()=>keyEvent(key);$('natural-toolbar').append(b)}
$('expression').addEventListener('input',e=>setSource(e.target.value));$('calculate').onclick=()=>keyEvent('=');$('model').onchange=e=>{state=K.createState(e.target.value);render();$('mode-source').value='';announce('Model changed to '+(e.target.value==='c'?'C edition':'standard edition'))};$('angle').onchange=e=>{state={...state,setup:{...state.setup,angle:e.target.value}};render()};$('format').onchange=e=>{state={...state,setup:{...state.setup,format:e.target.value}};if(state.lastValue){state.result=K.format(state.lastValue,state.setup,state.decimalView);if(state.lastValue.kind==='complex'||state.lastValue.kind==='base'||state.lastValue.kind==='mode-result')state.result=K.valueDisplay(state.lastValue,state.setup,state.decimalView)}render()};$('digits').onchange=e=>{state={...state,setup:{...state.setup,digits:Number(e.target.value)}};if(state.lastValue&&state.lastValue.kind!=='complex'&&state.lastValue.kind!=='base'&&state.lastValue.kind!=='mode-result')state.result=K.format(state.lastValue,state.setup,state.decimalView);render()};$('register').onchange=render;
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
showNumericalFields();
$('a11y-audit').onclick=()=>{const r=window.FX991_DIFFERENTIAL.auditAccessibility(document);$('a11y-audit-result').textContent=r.controls+' controls checked; '+r.keyLabels+' calculator keys named; '+r.issues.length+' issues: '+r.issues.map(i=>i.type+(i.label?' ('+i.label+')':'')).join(', ');};
$('run-tests').onclick=()=>{const report=window.FX991_TESTS.run();$('test-summary').textContent=report.passed+'/'+report.total+' passed; '+report.failed+' failed. See detailed runner for cases.'};
document.addEventListener('keydown',event=>{if(event.ctrlKey||event.metaKey||event.altKey||event.isComposing)return;if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(document.activeElement?.tagName))return;let mapped={Enter:'=',Escape:'AC',Backspace:'DEL',ArrowLeft:'LEFT',ArrowRight:'RIGHT',ArrowUp:'UP',ArrowDown:'DOWN','+':'ADD','-':'SUB','*':'MUL','/':'DIV','(':'LP',')':'RP','^':'POW'}[event.key]||event.key;if(/^[0-9.]$/.test(mapped)||['=','AC','DEL','LEFT','RIGHT','UP','DOWN','ADD','SUB','MUL','DIV','LP','RP','POW'].includes(mapped)){event.preventDefault();keyEvent(mapped)}});
render();
})();