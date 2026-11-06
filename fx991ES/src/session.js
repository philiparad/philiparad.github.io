/* M28: validated, versioned session portability and opt-in local recovery.
 * JSON only; never evaluate imported expressions or execute imported content.
 * Browser runtime has no dependencies. Restore returns to a safe editing screen.
 */
(function(global){'use strict';
const K=global.FX991, E=global.FX991_EDITOR;
const SCHEMA='fx991-session', VERSION=2, KEY='fx991.educational.session.v1', OPT='fx991.educational.recovery.opt-in';
const REGS='ABCDEFMXY', MODES=['COMP','CMPLX','STAT','BASE-N','EQN','MATRIX','TABLE','VECTOR','INEQ','VERIF','DIST'];
function bad(why){throw new Error('Invalid session: '+why)}
function plain(x){return x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype}
function sizeString(x,max,field){if(typeof x!=='string'||x.length>max)bad(field);return x}
function number(x,field){if(typeof x!=='number'||!Number.isFinite(x))bad(field);return x}
function integer(x,min,max,field){if(!Number.isInteger(x)||x<min||x>max)bad(field);return x}
function bigintText(x,field){if(typeof x!=='string'||x.length>130||!(/^-?(?:0|[1-9]\d*)$/).test(x))bad(field);return BigInt(x)}
function readonlyObject(x,field){if(!plain(x))bad(field);for(const k of Object.keys(x))if(k==='__proto__'||k==='prototype'||k==='constructor')bad(field+' forbidden property');return x}
function serializeValue(v,depth=0){if(depth>4||!plain(v))bad('numeric value');
 if(v.kind==='rational')return {kind:'rational',n:String(v.n),d:String(v.d)};
 if(v.kind==='decimal')return {kind:'decimal',value:number(v.value,'decimal'),n:v.n===undefined?null:String(v.n),d:v.d===undefined?null:String(v.d)};
 if(v.kind==='pi')return {kind:'pi',coefficient:serializeValue(v.coefficient,depth+1)};
 if(v.kind==='radical')return {kind:'radical',coefficient:serializeValue(v.coefficient,depth+1),radicand:String(v.radicand)};
 if(v.kind==='radical-sum'){if(!Array.isArray(v.radicals)||v.radicals.length<1||v.radicals.length>8)bad('radical terms');return {kind:'radical-sum',scalar:serializeValue(v.scalar,depth+1),radicals:v.radicals.map(t=>({radicand:String(t.radicand),coefficient:serializeValue(t.coefficient,depth+1)}))}};
 if(v.kind==='complex')return {kind:'complex',re:serializeValue(v.re,depth+1),im:serializeValue(v.im,depth+1)};
 if(v.kind==='base')return {kind:'base',value:String(v.value),radix:v.radix,text:String(v.text||'')};
 bad('unsupported numeric kind');}
function restoreValue(v,depth=0){if(depth>4)bad('value nesting');readonlyObject(v,'number');
 if(v.kind==='rational'){const n=bigintText(v.n,'numerator'),d=bigintText(v.d,'denominator');if(d<=0n)bad('denominator');return K.rat(n,d)}
 if(v.kind==='decimal'){let val=number(v.value,'decimal');if((v.n===null||v.n===undefined)&&(v.d===null||v.d===undefined))return {kind:'decimal',value:val};const n=bigintText(v.n,'decimal numerator'),d=bigintText(v.d,'decimal denominator');if(d<=0n)bad('decimal denominator');return {kind:'decimal',value:val,n,d}}
 if(v.kind==='pi')return {kind:'pi',coefficient:restoreValue(v.coefficient,depth+1)};
 if(v.kind==='radical'){let radical=bigintText(v.radicand,'radicand');if(radical<0n)bad('radicand');return {kind:'radical',coefficient:restoreValue(v.coefficient,depth+1),radicand:radical}}
 if(v.kind==='radical-sum'){
  if(!Array.isArray(v.radicals)||v.radicals.length<1||v.radicals.length>8)bad('radical term count');
  const scalar=restoreValue(v.scalar,depth+1);if(scalar.kind!=='rational')bad('radical scalar');
  const terms=v.radicals.map(t=>{readonlyObject(t,'radical term');let radicand=bigintText(t.radicand,'radicand');if(radicand<=1n||radicand>1000000000000n)bad('radicand range');
   const coefficient=restoreValue(t.coefficient,depth+1);if(coefficient.kind!=='rational'||coefficient.n===0n)bad('radical coefficient');
   return {kind:'radical',radicand,coefficient}
  });
  const normalized=K.radicalSum([scalar,...terms]);
  if(normalized.kind!=='radical-sum'||normalized.radicals.length!==terms.length||
     terms.some((t,i)=>t.radicand!==normalized.radicals[i].radicand))bad('noncanonical radical sum');
  return normalized
 }
 if(v.kind==='complex')return {kind:'complex',re:restoreValue(v.re,depth+1),im:restoreValue(v.im,depth+1)};
 if(v.kind==='base'){let rad=integer(v.radix,2,16,'radix');if(![2,8,10,16].includes(rad))bad('radix');return {kind:'base',value:bigintText(v.value,'base value'),radix:rad,text:sizeString(v.text,100,'base text')}}
 bad('unknown value kind');}
function validateArray(xs,max,field){if(!Array.isArray(xs)||xs.length>max)bad(field);return xs}
function numericArray(row,field){validateArray(row,3,field);if(row.length<2)bad(field+' dimensions');return row.map((n,i)=>number(n,field+i))}
function shapeMatrix(m,field){if(m===null)return null;validateArray(m,3,field);if(![2,3].includes(m.length))bad(field+' size');const rows=m.map((r,i)=>numericArray(r,field+i));if(rows.some(r=>r.length!==rows.length))bad(field+' square');return rows}
function shapeVector(v,field){if(v===null)return null;return numericArray(v,field)}
function shapeStat(stat){readonlyObject(stat,'statistics');if(!['1VAR','LINEAR'].includes(stat.kind))bad('stat kind');let cols=stat.kind==='1VAR'?1:2;return {kind:stat.kind,rows:validateArray(stat.rows,80,'stat rows').map((r,i)=>{validateArray(r,cols,'stat row');if(r.length!==cols)bad('stat row width');return r.map((n,j)=>number(n,'stat'+i+'.'+j))})}}
// M29: lossless structural document round trip, with a bounded tree and
// validated semantic cursor. Never trust object prototypes or node IDs.
const MAX_NODES=620, MAX_DEPTH=20;
function cleanDocument(doc,expression){
 readonlyObject(doc,'document');readonlyObject(doc.root,'document root');readonlyObject(doc.anchor,'document anchor');
 let seen=new Set(),count=0;
 function walk(n,depth){
  readonlyObject(n,'document node');if(depth>MAX_DEPTH||++count>MAX_NODES)bad('document complexity');
  const nodeId=sizeString(n.id,48,'node id');if(!/^nd[1-9]\d{0,11}$/.test(nodeId)||seen.has(nodeId))bad('duplicate or invalid node id');seen.add(nodeId);
  const kind=n.kind, out={kind,id:nodeId};
  if(kind==='Sequence'){
   out.children=validateArray(n.children,512,'sequence').map(child=>walk(child,depth+1));
  }else if(kind==='Token'){
   out.value=sizeString(n.value,24,'token');if(!out.value||/[\u0000-\u001f]/.test(out.value))bad('token character');
  }else if(kind==='Fraction'){
   out.numerator=walk(n.numerator,depth+1);out.denominator=walk(n.denominator,depth+1);
  }else if(kind==='MixedFraction'){
   out.whole=walk(n.whole,depth+1);out.numerator=walk(n.numerator,depth+1);out.denominator=walk(n.denominator,depth+1);
  }else if(kind==='Power')out.exponent=walk(n.exponent,depth+1);
  else if(kind==='Root'){
   out.radicand=walk(n.radicand,depth+1);out.degree=n.degree===null||n.degree===undefined?null:walk(n.degree,depth+1);
  }else if(kind==='Function'){
   if(!['sin','cos','tan','asin','acos','atan','log','ln','exp'].includes(n.name))bad('function name');
   out.name=n.name;out.argument=walk(n.argument,depth+1);
  }else if(kind==='Group')out.body=walk(n.body,depth+1);
  else bad('node type');
  if(kind!=='Sequence'&&kind!=='Token')for(const sub of ['whole','numerator','denominator','exponent','radicand','degree','argument','body'])if(out[sub]!==undefined&&out[sub]!==null&&out[sub].kind!=='Sequence')bad('slot type');
  return out;
 }
 const root=walk(doc.root,0);if(root.kind!=='Sequence')bad('root type');
 const sequenceId=sizeString(doc.anchor.sequenceId,48,'anchor id');integer(doc.anchor.offset,0,512,'anchor offset');
 const clean={root,anchor:{sequenceId,offset:doc.anchor.offset}};
 if(!E.inspect(clean).anchorValid)bad('anchor missing');
 if(E.serialize(clean)!==expression)bad('document differs from expression');
 // Verify the anchor offset is within the actual sequence, not merely 0..512.
 const found=E.locate(root,sequenceId);if(!found||clean.anchor.offset>found.sequence.children.length)bad('anchor offset');
 return clean;
}
const WIZARDS={
 EQN:{QUAD:['a','b','c'],CUBIC:['a','b','c','d'],LINEAR2:['a11','a12','b1','a21','a22','b2'],LINEAR3:['a11','a12','a13','b1','a21','a22','a23','b2','a31','a32','a33','b3']},
 MATRIX:{DET2:['a11','a12','a21','a22'],DET3:['a11','a12','a13','a21','a22','a23','a31','a32','a33'],INV2:['a11','a12','a21','a22'],TRANS2:['a11','a12','a21','a22'],MUL2:['a11','a12','a21','a22','b11','b12','b21','b22']},
 VECTOR:{DOT2:['ax','ay','bx','by'],DOT3:['ax','ay','az','bx','by','bz'],CROSS3:['ax','ay','az','bx','by','bz'],ADD2:['ax','ay','bx','by'],ANGLE2:['ax','ay','bx','by']},
 STAT:{'1VAR':['x1','x2','x3'],'1VAR5':['x1','x2','x3','x4','x5'],LINEAR3:['x1','y1','x2','y2','x3','y3']},
 TABLE:{SINGLE:['start','end','step'],FUNCTION:['f(X)','start','end','step'],DUAL:['f(X)','g(X)','start','end','step']}
};
function cleanWizard(w,mode,model,view){
 readonlyObject(w,'wizard');if(w.mode!==mode||!WIZARDS[mode])bad('wizard mode');
 const kind=w.kind;if(view==='workflow-menu'){
  if(kind!==null||!Array.isArray(w.values)||w.values.length||!Array.isArray(w.fields)||w.fields.length)bad('wizard menu');
  return {mode,kind:null,fields:[],values:[],index:0,buffer:''};
 }
 const canonical=WIZARDS[mode][kind];if(!canonical||(kind==='DUAL'&&model!=='c'))bad('wizard kind');
 if(JSON.stringify(w.fields)!==JSON.stringify(canonical))bad('wizard fields');
 integer(w.index,0,canonical.length-1,'wizard index');
 let values=validateArray(w.values,canonical.length,'wizard values');
 if(values.length>w.index+1)bad('wizard progress');
 for(let i=0;i<values.length;i++){
  if(values[i]===undefined||values[i]===null)continue;
  const x=sizeString(values[i],96,'wizard value');
  if(/^[fg]\(X\)$/.test(canonical[i])){
   if(!/^[A-Za-z0-9.+\-*/^() ]+$/.test(x))bad('wizard expression');
  }else if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(x))bad('wizard number');
 }
 const buffer=sizeString(w.buffer,96,'wizard buffer');
 if(/^[fg]\(X\)$/.test(canonical[w.index])){
  if(!/^[A-Za-z0-9.+\-*/^() ]*$/.test(buffer))bad('wizard expression buffer');
 }else if(!/^-?(?:\d*(?:\.\d*)?)?$/.test(buffer))bad('wizard number buffer');
 return {mode,kind,fields:[...canonical],values:[...values],index:w.index,buffer,resultPage:0};
}
function cleanWorkflow(w,mode,model,mem){
 if(w===null||w===undefined)return null;
 readonlyObject(w,'workflow');if(w.view==='workflow-menu'||w.view==='coefficient'){return {view:w.view,wizard:cleanWizard(w.wizard,mode,model,w.view)};}if(w.view==='register-menu'||w.view==='register-editor'||w.view==='register-summary'||w.view==='register-operation'){
  if(!['MATRIX','VECTOR'].includes(mode))bad('register workflow mode');
  readonlyObject(w.registerFlow,'register workflow');const f=w.registerFlow;
  const cat=mode==='MATRIX'?'matrix':'vector';if(f.category!==cat)bad('register category');
  if(f.name!==null&&!'ABC'.includes(f.name))bad('register name');
  if(f.name===null&&w.view!=='register-menu')bad('register selection');
  if(!'ABC'.includes(f.other))bad('second register');
  integer(f.size,2,3,'register size');integer(f.field,0,f.size*f.size-1,'register field');
  if(cat==='vector'&&f.field>=f.size)bad('vector field');
  if(!/^-?(?:\d{0,20}(?:\.\d{0,12})?|\.\d{0,12})?$/.test(sizeString(f.buffer,36,'register buffer')))bad('register buffer');
  if(f.operation!==null&&typeof f.operation!=='string')bad('register operation');
  return {view:w.view,registerFlow:{category:cat,name:f.name,other:f.other,size:f.size,field:f.field,buffer:f.buffer,operation:null}};
 }
 if(w.view==='stat-grid'){
  if(mode!=='STAT')bad('statistics workflow mode');readonlyObject(w.statFlow,'stat workflow');const f=w.statFlow;
  integer(f.field,0,159,'statistics field');
  if(!/^-?(?:\d{0,20}(?:\.\d{0,12})?|\.\d{0,12})?$/.test(sizeString(f.buffer,36,'statistics buffer')))bad('statistics buffer');
  return {view:'stat-grid',statFlow:{field:f.field,buffer:f.buffer}};
 }
 bad('unsupported workflow');
}
function extractWorkflow(state){
 if(['register-menu','register-editor','register-summary','register-operation'].includes(state.view)&&state.ui.registerFlow){try{return cleanWorkflow({view:state.view,registerFlow:state.ui.registerFlow},state.mode,state.model,state.ui.modeMemory)}catch(e){return null}}
 if(['workflow-menu','coefficient'].includes(state.view)&&state.ui.wizard){try{return cleanWorkflow({view:state.view,wizard:state.ui.wizard},state.mode,state.model,state.ui.modeMemory)}catch(e){return null}}
 if(state.view==='stat-grid'&&state.ui.statFlow){try{return cleanWorkflow({view:'stat-grid',statFlow:state.ui.statFlow},state.mode,state.model,state.ui.modeMemory)}catch(e){return null}}
 return null;
}
function extract(state){if(!plain(state)||!plain(state.ui)||!plain(state.ui.modeMemory))bad('state');const m=state.ui.modeMemory;
 const mem={};for(const k of REGS)mem[k]=serializeValue(state.memory[k]);
 const matrix={},vector={};for(const k of 'ABC'){matrix[k]=shapeMatrix(m.matrix[k]??null,'Mat'+k);vector[k]=shapeVector(m.vector[k]??null,'Vct'+k)}
 const mode=state.mode; if(!MODES.includes(mode))bad('mode');
 const setup={angle:state.setup.angle,format:state.setup.format,digits:state.setup.digits,displayStyle:K.effectiveDisplayStyle(state.setup,'COMP')};
 let hist=validateArray(state.history,50,'history').map(h=>({expression:sizeString(h.expression,512,'history expression'),display:sizeString(h.display,512,'history display')}));
 const payload={schema:SCHEMA,version:VERSION,model:state.model,mode,setup,document:state.mode==='COMP'&&state.document?cleanDocument(state.document,state.expression):null,workflow:extractWorkflow(state),expression:sizeString(state.expression,512,'expression'),cursor:state.cursor,decimalView:!!state.decimalView,insertMode:state.ui.insertMode!==false,memory:mem,ans:serializeValue(state.ans),modeMemory:{matrix,vector,stat:shapeStat(m.stat)},history:hist};
 validate(payload);return payload;}
function validate(p){readonlyObject(p,'root');if(p.schema!==SCHEMA||![1,VERSION].includes(p.version))bad('schema/version');if(!['standard','c'].includes(p.model))bad('model');if(!MODES.includes(p.mode)||(p.model!=='c'&&['INEQ','VERIF','DIST'].includes(p.mode)))bad('mode');
 readonlyObject(p.setup,'setup');if(!['DEG','RAD','GRAD'].includes(p.setup.angle)||!['Norm1','Norm2','Fix','Sci'].includes(p.setup.format))bad('setup');integer(p.setup.digits,0,9,'digits');if(p.setup.displayStyle!==undefined&&!['MathO','LineO','LineIO'].includes(p.setup.displayStyle))bad('display style');
 sizeString(p.expression,512,'expression');integer(p.cursor,0,p.expression.length,'cursor');if(typeof p.decimalView!=='boolean'||typeof p.insertMode!=='boolean')bad('flags');
 readonlyObject(p.memory,'memory');const memory={};for(const r of REGS)memory[r]=restoreValue(p.memory[r]);
 const ans=restoreValue(p.ans);
 readonlyObject(p.modeMemory,'modeMemory');readonlyObject(p.modeMemory.matrix,'matrix');readonlyObject(p.modeMemory.vector,'vector');let matrix={},vector={};for(const r of 'ABC'){matrix[r]=shapeMatrix(p.modeMemory.matrix[r]??null,'Mat'+r);vector[r]=shapeVector(p.modeMemory.vector[r]??null,'Vct'+r)}
 const stat=shapeStat(p.modeMemory.stat);
 const document=p.version===2&&p.document!==null&&p.document!==undefined?cleanDocument(p.document,p.expression):null;
 const workflow=p.version===2?cleanWorkflow(p.workflow,p.mode,p.model,{matrix,vector,stat}):null;
 const history=validateArray(p.history,50,'history').map(h=>{readonlyObject(h,'history row');return {expression:sizeString(h.expression,512,'history expression'),display:sizeString(h.display,512,'history display')}});
 return {memory,ans,matrix,vector,stat,history,document,workflow};}
function exportJSON(state){return JSON.stringify(extract(state),null,2)}
function importJSON(raw){if(typeof raw!=='string'||raw.length>90000)bad('file size');let obj;try{obj=JSON.parse(raw)}catch(e){bad('JSON syntax')};const clean=validate(obj);let s=K.createState(obj.model);s.mode=obj.mode;s.setup={angle:obj.setup.angle,format:obj.setup.format,digits:obj.setup.digits,displayStyle:obj.setup.displayStyle||'MathO'};s.ui.displayStyle=s.setup.displayStyle;s.expression=obj.expression;s.cursor=obj.cursor;s.document=clean.document?E.reserveIds(clean.document):E.fromSource(s.expression);s.decimalView=obj.decimalView;s.ui.insertMode=obj.insertMode;s.ui.modeMemory={matrix:clean.matrix,vector:clean.vector,stat:clean.stat};s.memory=clean.memory;s.ans=clean.ans;s.history=clean.history;
 // Only validated register/stat workflows can resume; execution results are never restored.
 s.view='edit';s.lastValue=null;s.result='';s.error=null;s.errorPos=0;s.shift=false;s.alpha=false;s.trace=[];s.ui.pending=null;s.ui.wizard=null;s.ui.registerFlow=null;s.ui.statFlow=null;s.ui.lastWizard=null;
 if(clean.workflow){s.view=clean.workflow.view;s.ui.registerFlow=clean.workflow.registerFlow||null;s.ui.statFlow=clean.workflow.statFlow||null;s.ui.wizard=clean.workflow.wizard||null;}
 return s;}
function storageGet(storage,key){try{return storage.getItem(key)}catch(e){return null}}
function enabled(storage){return storageGet(storage,OPT)==='yes'}
function enable(storage,on){try{if(on)storage.setItem(OPT,'yes');else {storage.removeItem(OPT);storage.removeItem(KEY)}return true}catch(e){return false}}
function store(storage,state){if(!enabled(storage))return false;try{storage.setItem(KEY,exportJSON(state));return true}catch(e){return false}}
function recover(storage){if(!enabled(storage))return null;const raw=storageGet(storage,KEY);if(!raw)return null;try{return importJSON(raw)}catch(e){return null}}
function clear(storage){try{storage.removeItem(KEY);return true}catch(e){return false}}
global.FX991_SESSION=Object.freeze({SCHEMA,VERSION,KEY,OPT,extract,validate,exportJSON,importJSON,enabled,enable,store,recover,clear});
})(typeof window!=='undefined'?window:globalThis);
