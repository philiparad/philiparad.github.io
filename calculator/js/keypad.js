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
 ['CALC','CALC','SOLVE','='],['INTEGRAL','∫','d/dx',''],null,
 null,['RECIP','x⁻¹','x!',''],['LOGBASE','log□','Σ',''],
 ['FRAC','▤','▣','÷R'],['SQRT','√','³√','Rdec'],['SQUARE','x²','x³',''],['POWER','x^□','ⁿ√',''],['LOG','log','10ˣ',''],['LN','ln','eˣ',''],
 ['NEG','(−)','∠','A'],['DMS','°′″','←','B'],['HYP','hyp','Abs','C'],['SIN','sin','sin⁻¹','D'],['COS','cos','cos⁻¹','E'],['TAN','tan','tan⁻¹','F'],
 ['RCL','RCL','STO',''],['ENG','ENG','←',':'],['LP','(','%','X'],['RP',')',',','Y'],['SD','S⇔D','▣',''],['MPLUS','M+','M−','M']
];
const numericSpec=[
 ['7','7','CONST',''],['8','8','CONV',''],['9','9','CLR',''],['DEL','DEL','INS',''],['AC','AC','OFF',''],
 ['4','4','MATRIX',''],['5','5','VECTOR',''],['6','6','VERIFY',''],['MUL','×','nPr',''],['DIV','÷','nCr',''],
 ['1','1','STAT',''],['2','2','CMPLX',''],['3','3','BASE',''],['ADD','+','Pol',''],['SUB','−','Rec',''],
 ['0','0','Rnd',''],['DOT','.','Ran#','RanInt'],['EXP','×10ˣ','π','e'],['ANS','Ans','DRG▶','PreAns'],['EQUAL','=','','']
];
const pct=(n)=>((100*n).toFixed(4))+'%';
const newKey=(data,cx,cy,w,h,group,angle)=>Object.freeze({id:data[0],label:data[1],shift:data[2],alpha:data[3],cx,cy,w,h,group,angle:angle||null});
const topCenters=[[39.83,220.67],[75.60,220.60],[108.21,238.61],[136.38,219.65],[136.46,257.52],[164.48,238.54],[196.81,220.66],[232.60,220.60]];
const scienceCols=[40.6,78.8,117,155.4,193.5,231.6],scienceRows=[265.6,298.5,331.5,364.3];
const numCols=[44,90,136,182.1,228.4],numRows=[406.6,446,486,525.4];
const keys=[];
topSpec.forEach((data,i)=>{const sizes=i===2||i===5?[30,20]:i===3||i===4?[20,28]:[22,22];keys.push(newKey(data,...topCenters[i],...sizes,data[3]==='dpad'?'dpad':'top',{LEFT:'135deg',UP:'225deg',RIGHT:'315deg',DOWN:'45deg'}[data[0]]))});
scienceSpec.forEach((data,i)=>{if(!data)return;keys.push(newKey(data,scienceCols[i%6],scienceRows[Math.floor(i/6)],32,20,'scientific'))});
numericSpec.forEach((data,i)=>keys.push(newKey(data,numCols[i%5],numRows[Math.floor(i/5)],39,i>=5&&i<15?29:28,'numeric')));
if(keys.length!==50)throw Error('Expected 50 physical buttons; received '+keys.length);
function mount(root,handler){if(!root)return;root.textContent='';const fragment=document.createDocumentFragment();
 for(const key of keys){const wrap=document.createElement('div');wrap.className='key-unit '+key.group+' button-'+key.id;
  wrap.style.setProperty('--x',pct(key.cx/274));wrap.style.setProperty('--y',pct(key.cy/580));
  wrap.style.setProperty('--w',pct(key.w/274));wrap.style.setProperty('--h',pct(key.h/580));
  if(key.angle)wrap.style.setProperty('--angle',key.angle);
  if(key.shift){const tag=document.createElement('span');tag.className='shift-label';tag.textContent=key.shift;wrap.append(tag)}
  if(key.alpha&&key.group!=='top'&&key.group!=='dpad'&&key.alpha!==key.id){const tag=document.createElement('span');tag.className='alpha-label';tag.textContent=key.alpha;wrap.append(tag)}
  const b=document.createElement('button');b.type='button';b.dataset.key=key.id;b.textContent=key.label;
  b.className=(key.label.length>4?'small-label':'');
  b.setAttribute('aria-label',key.id+' '+(key.shift?'SHIFT: '+key.shift:'')+(key.alpha?' ALPHA: '+key.alpha:''));
  b.addEventListener('click',()=>handler(key.id));wrap.append(b);fragment.append(wrap)
 }
 root.append(fragment);
}
const API=Object.freeze({keys,mount,topSpec,scienceSpec,numericSpec});global.FreshKeypad=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
