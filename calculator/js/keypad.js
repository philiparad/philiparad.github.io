/* Independently drawn 50-key face; geometry measured from user reference screenshot.
 * 274 x 580 pixel body at the reference scale. No image-backed hit targets.
 */
(function(global){'use strict';
const topSpec=[
 ['SHIFT','','SHIFT','top'],['ALPHA','','ALPHA','top'],['LEFT','◀','','dpad'],
 ['UP','▲','','dpad'],['DOWN','▼','','dpad'],['RIGHT','▶','','dpad'],
 ['MODE','','MODE · SETUP','top'],['ON','','ON','top']
];
const scienceSpec=[
 ['CALC','CALC','SOLVE','='],['INTEGRAL','∫','d/dx','Π'],null,
 null,['RECIP','x⁻¹','x!',''],['LOGBASE','log□','Σ','Π flow'],
 ['FRAC','▤','▣','÷R'],['SQRT','√','³√','Rdec'],['SQUARE','x²','x³',''],['POWER','x^□','ⁿ√',''],['LOG','log','10ˣ',''],['LN','ln','eˣ',''],
 ['NEG','(−)','∠','A'],['DMS','°′″','FACT','B'],['HYP','hyp','Abs','C'],['SIN','sin','sin⁻¹','D'],['COS','cos','cos⁻¹','E'],['TAN','tan','tan⁻¹','F'],
 ['RCL','RCL','STO',''],['ENG','ENG','←',':'],['LP','(','%','X'],['RP',')',',','Y'],['SD','S⇔D','▣',''],['MPLUS','M+','M−','M']
];
const numericSpec=[
 ['7','7','CONST',''],['8','8','CONV',''],['9','9','CLR',''],['DEL','DEL','INS',''],['AC','AC','OFF',''],
 ['4','4','MATRIX',''],['5','5','VECTOR',''],['6','6','',''],['MUL','×','nPr',''],['DIV','÷','nCr',''],
 ['1','1','STAT',''],['2','2','CMPLX',''],['3','3','BASE',''],['ADD','+','Pol',''],['SUB','−','Rec',''],
 ['0','0','Rnd',''],['DOT','.','Ran#','RanInt'],['EXP','×10ˣ','π','e'],['ANS','Ans','DRG▶','PreAns'],['EQUAL','=','','']
];
// Single physical key-label inventory for the fx-991ES PLUS.
// Geometry remains screenshot-derived and is NOT an original hardware measurement.
const MODEL_LEGENDS=Object.freeze({
 'fx-991es-plus':Object.freeze({
  INTEGRAL:{alpha:''},LOGBASE:{alpha:''},
  SQRT:{alpha:''},ANS:{alpha:''},DOT:{alpha:'RanInt'},
  DMS:{shift:'FACT'}
 })
});
function keyForModel(key,model){
 const overrides=MODEL_LEGENDS['fx-991es-plus'][key.id];
 return overrides?Object.freeze({...key,...overrides}):key;
}
function keysForModel(model='fx-991es-plus'){if(model!=='fx-991es-plus')throw Error('Unsupported calculator model');return Object.freeze(keys.map(key=>keyForModel(key,model)))}
const pct=(n)=>((100*n).toFixed(4))+'%';
const newKey=(data,cx,cy,w,h,group,angle)=>Object.freeze({id:data[0],label:data[1],shift:data[2],alpha:data[3],cx,cy,w,h,group,angle:angle||null});
const topCenters=[[39.83,222.67],[75.60,222.60],[108.21,240.61],[136.38,221.65],[136.46,259.52],[164.48,240.54],[196.81,222.66],[232.60,222.60]];
const scienceCols=[40.6,78.8,117,155.4,193.5,231.6],scienceRows=[268.6,301.5,334.5,367.3];
const numCols=[44,90,136,182.1,228.4],numRows=[410.6,450,490,529.4];
const keys=[];
topSpec.forEach((data,i)=>{const sizes=i===2||i===5?[30,20]:i===3||i===4?[20,28]:[22,22];keys.push(newKey(data,...topCenters[i],...sizes,data[3]==='dpad'?'dpad':'top',{LEFT:'135deg',UP:'225deg',RIGHT:'315deg',DOWN:'45deg'}[data[0]]))});
scienceSpec.forEach((data,i)=>{if(!data)return;keys.push(newKey(data,scienceCols[i%6],scienceRows[Math.floor(i/6)],32,20,'scientific'))});
numericSpec.forEach((data,i)=>keys.push(newKey(data,numCols[i%5],numRows[Math.floor(i/5)],40,i>=5&&i<15?29:28,'numeric')));
if(keys.length!==50)throw Error('Expected 50 physical buttons; received '+keys.length);
const spoken={LEFT:'Left arrow',RIGHT:'Right arrow',UP:'Up arrow',DOWN:'Down arrow',
 LP:'Open parenthesis',RP:'Close parenthesis',EQUAL:'Equals',DEL:'Delete',
 AC:'All clear',ON:'Power on',NEG:'Negative sign',MUL:'Multiply',DIV:'Divide',
 ADD:'Plus',SUB:'Minus',DOT:'Decimal point',EXP:'Times ten to the power',
 FRAC:'Fraction',RECIP:'Reciprocal',SQRT:'Square root',SQUARE:'Square',
 POWER:'Power',INTEGRAL:'Integral',SD:'Standard decimal conversion',
 DMS:'Degrees minutes seconds',MPLUS:'Memory plus'};
// VIS-001: independent vector glyphs for four Windows-emulator key faces.
// Preserve the physical key IDs and accessible names; SVG is decoration only.
const FACE_GLYPHS=Object.freeze({
 FRAC:'<svg viewBox="0 0 38 24" aria-hidden="true"><rect x="17" y="3" width="9" height="6" fill="none" stroke="white" stroke-width="1.6"/><path d="M4 12H34" fill="none" stroke="white" stroke-width="2"/><rect x="17" y="15" width="9" height="6" fill="none" stroke="white" stroke-width="1.6"/></svg>',
 INTEGRAL:'<svg viewBox="0 0 40 25" aria-hidden="true"><text x="2" y="21" font-size="25" font-family="Georgia,serif" fill="white">∫</text><text x="15" y="10" font-size="12" font-weight="bold" font-family="Georgia,serif" fill="white">d</text><path d="M15 13H27" stroke="white" stroke-width="1.4"/><text x="15" y="23" font-size="12" font-family="Georgia,serif" fill="white">x</text><rect x="29" y="13" width="8" height="8" fill="none" stroke="white" stroke-width="1.3"/></svg>',
 LOGBASE:'<svg viewBox="0 0 50 26" aria-hidden="true"><text x="1" y="20" font-size="22" font-weight="bold" font-family="Arial,sans-serif" fill="white">log</text><rect x="37" y="14" width="10" height="9" fill="none" stroke="white" stroke-width="1.5"/></svg>',
 POWER:'<svg viewBox="0 0 42 25" aria-hidden="true"><text x="5" y="22" font-size="25" font-style="italic" font-weight="bold" font-family="Georgia,serif" fill="white">x</text><rect x="22" y="2" width="11" height="11" fill="none" stroke="white" stroke-width="1.7"/></svg>'
});
const BASE_LEGENDS=Object.freeze({SQUARE:'DEC',POWER:'HEX',LOG:'BIN',LN:'OCT'});
function renderLegend(wrap,key){
 for(const old of [...wrap.querySelectorAll('.shift-label,.alpha-label,.base-label')])old.remove();
 const button=wrap.querySelector('button');
 if(!button)throw Error('Key missing for '+key.id);
 if(key.shift){
  const tag=document.createElement('span');tag.className=key.id==='ALPHA'?'shift-label alpha-label':'shift-label';tag.textContent=key.shift;
  if(key.id==='MODE'){tag.textContent='';const mode=document.createElement('span');mode.className='mode-legend';mode.textContent='MODE';const setup=document.createElement('span');setup.className='setup-legend';setup.textContent='SETUP';tag.append(mode,document.createTextNode(' '),setup);}
  wrap.insertBefore(tag,button);
 }
 if(key.alpha&&key.group!=='top'&&key.group!=='dpad'&&key.alpha!==key.id){
  const tag=document.createElement('span');tag.className='alpha-label';tag.textContent=key.alpha;
  wrap.insertBefore(tag,button);
 }
 button.textContent=key.label;
 if(FACE_GLYPHS[key.id]){const span=document.createElement('span');span.className='face-glyph';span.innerHTML=FACE_GLYPHS[key.id];button.textContent='';button.appendChild(span);}
 button.className=key.label.length>4?'small-label':'';
 if(BASE_LEGENDS[key.id]){const base=document.createElement('span');base.className='base-label';base.textContent=BASE_LEGENDS[key.id];wrap.insertBefore(base,button);}
 const primary=spoken[key.id]||key.label||key.id;
 const legends=[];
 if(key.shift&&key.shift!==key.id)legends.push('Shift: '+key.shift);
 if(key.alpha&&key.alpha!==key.id&&key.alpha!==key.group)legends.push('Alpha: '+key.alpha);
 const accessible=primary+(legends.length?'. '+legends.join('. '):'');
 button.setAttribute('aria-label',accessible);
 button.setAttribute('title',primary+(legends.length?' | '+legends.join(' | '):''));
}
function applyModel(root,model){
 if(!root)return;
 const list=keysForModel(model);
 for(const key of list){
  const wrap=[...root.querySelectorAll('.key-unit')].find(el=>el.querySelector('button')?.dataset.key===key.id);
  if(wrap)renderLegend(wrap,key);
 }
 root.dataset.model=model;
}
// REA-081: a visible native legend is not an always-active shortcut.
// Keep physical keys clickable so an unavailable action can explain itself.
function applyContext(root,state,policy,profiles){
 if(!root||!policy||!profiles)return;
 const modifier=state.shift?'SHIFT':state.alpha?'ALPHA':'normal';
 const model=state.model,keys=keysForModel(model);
 const wrappers=new Map([...root.querySelectorAll('.key-unit')].map(el=>
  [el.querySelector('button')?.dataset.key,el]));
 for(const key of keys){
  const wrap=wrappers.get(key.id);
  if(!wrap)continue;
  const action=policy.classify(key,modifier,state.mode,state.screen,model,profiles.supports);
  const unavailable=action.status==='blocked'||action.status==='unlabelled';
  wrap.classList.toggle('legend-unavailable',unavailable);
  wrap.dataset.legendStatus=action.status;
  const button=wrap.querySelector('button');
  if(!button)continue;
  button.setAttribute('aria-description',unavailable?
   modifier+' unavailable: '+action.reason:
   modifier+' '+(action.legend||key.label)+': '+action.reason);
 }
}
function mount(root,handler,model='fx-991es-plus'){
 if(!root)return;
 root.textContent='';const fragment=document.createDocumentFragment();
 for(const key of keysForModel(model)){
  const wrap=document.createElement('div');
  wrap.className='key-unit '+key.group+' button-'+key.id;
  wrap.style.setProperty('--x',pct(key.cx/274));wrap.style.setProperty('--y',pct(key.cy/580));
  wrap.style.setProperty('--w',pct(key.w/274));wrap.style.setProperty('--h',pct(key.h/580));
  if(key.angle)wrap.style.setProperty('--angle',key.angle);
  const b=document.createElement('button');b.type='button';b.dataset.key=key.id;
  b.addEventListener('click',()=>handler(key.id));wrap.append(b);
  renderLegend(wrap,key);fragment.append(wrap);
 }
 root.append(fragment);root.dataset.model=model;
}

const API=Object.freeze({keys,mount,applyModel,keysForModel,applyContext,MODEL_LEGENDS,topSpec,scienceSpec,numericSpec});global.FreshKeypad=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
