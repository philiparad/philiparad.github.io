/* M28: validated, versioned session portability and opt-in local recovery.
 * JSON only; never evaluate imported expressions or execute imported content.
 * Browser runtime has no dependencies. Restore returns to a safe editing screen.
 */
(function(global){'use strict';
const K=global.FX991, E=global.FX991_EDITOR;
const SCHEMA='fx991-session', VERSION=1, KEY='fx991.educational.session.v1', OPT='fx991.educational.recovery.opt-in';
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
 if(v.kind==='complex')return {kind:'complex',re:serializeValue(v.re,depth+1),im:serializeValue(v.im,depth+1)};
 if(v.kind==='base')return {kind:'base',value:String(v.value),radix:v.radix,text:String(v.text||'')};
 bad('unsupported numeric kind');}
function restoreValue(v,depth=0){if(depth>4)bad('value nesting');readonlyObject(v,'number');
 if(v.kind==='rational'){const n=bigintText(v.n,'numerator'),d=bigintText(v.d,'denominator');if(d<=0n)bad('denominator');return K.rat(n,d)}
 if(v.kind==='decimal'){let val=number(v.value,'decimal');if((v.n===null||v.n===undefined)&&(v.d===null||v.d===undefined))return {kind:'decimal',value:val};const n=bigintText(v.n,'decimal numerator'),d=bigintText(v.d,'decimal denominator');if(d<=0n)bad('decimal denominator');return {kind:'decimal',value:val,n,d}}
 if(v.kind==='pi')return {kind:'pi',coefficient:restoreValue(v.coefficient,depth+1)};
 if(v.kind==='radical'){let radical=bigintText(v.radicand,'radicand');if(radical<0n)bad('radicand');return {kind:'radical',coefficient:restoreValue(v.coefficient,depth+1),radicand:radical}}
 if(v.kind==='complex')return {kind:'complex',re:restoreValue(v.re,depth+1),im:restoreValue(v.im,depth+1)};
 if(v.kind==='base'){let rad=integer(v.radix,2,16,'radix');if(![2,8,10,16].includes(rad))bad('radix');return {kind:'base',value:bigintText(v.value,'base value'),radix:rad,text:sizeString(v.text,100,'base text')}}
 bad('unknown value kind');}
function validateArray(xs,max,field){if(!Array.isArray(xs)||xs.length>max)bad(field);return xs}
function numericArray(row,field){validateArray(row,3,field);if(row.length<2)bad(field+' dimensions');return row.map((n,i)=>number(n,field+i))}
function shapeMatrix(m,field){if(m===null)return null;validateArray(m,3,field);if(![2,3].includes(m.length))bad(field+' size');const rows=m.map((r,i)=>numericArray(r,field+i));if(rows.some(r=>r.length!==rows.length))bad(field+' square');return rows}
function shapeVector(v,field){if(v===null)return null;return numericArray(v,field)}
function shapeStat(stat){readonlyObject(stat,'statistics');if(!['1VAR','LINEAR'].includes(stat.kind))bad('stat kind');let cols=stat.kind==='1VAR'?1:2;return {kind:stat.kind,rows:validateArray(stat.rows,80,'stat rows').map((r,i)=>{validateArray(r,cols,'stat row');if(r.length!==cols)bad('stat row width');return r.map((n,j)=>number(n,'stat'+i+'.'+j))})}}
function extract(state){if(!plain(state)||!plain(state.ui)||!plain(state.ui.modeMemory))bad('state');const m=state.ui.modeMemory;
 const mem={};for(const k of REGS)mem[k]=serializeValue(state.memory[k]);
 const matrix={},vector={};for(const k of 'ABC'){matrix[k]=shapeMatrix(m.matrix[k]??null,'Mat'+k);vector[k]=shapeVector(m.vector[k]??null,'Vct'+k)}
 const mode=state.mode; if(!MODES.includes(mode))bad('mode');
 const setup={angle:state.setup.angle,format:state.setup.format,digits:state.setup.digits};
 let hist=validateArray(state.history,50,'history').map(h=>({expression:sizeString(h.expression,512,'history expression'),display:sizeString(h.display,512,'history display')}));
 const payload={schema:SCHEMA,version:VERSION,model:state.model,mode,setup,expression:sizeString(state.expression,512,'expression'),cursor:state.cursor,decimalView:!!state.decimalView,insertMode:state.ui.insertMode!==false,memory:mem,ans:serializeValue(state.ans),modeMemory:{matrix,vector,stat:shapeStat(m.stat)},history:hist};
 validate(payload);return payload;}
function validate(p){readonlyObject(p,'root');if(p.schema!==SCHEMA||p.version!==VERSION)bad('schema/version');if(!['standard','c'].includes(p.model))bad('model');if(!MODES.includes(p.mode)||(p.model!=='c'&&['INEQ','VERIF','DIST'].includes(p.mode)))bad('mode');
 readonlyObject(p.setup,'setup');if(!['DEG','RAD','GRAD'].includes(p.setup.angle)||!['Norm1','Norm2','Fix','Sci'].includes(p.setup.format))bad('setup');integer(p.setup.digits,0,9,'digits');
 sizeString(p.expression,512,'expression');integer(p.cursor,0,p.expression.length,'cursor');if(typeof p.decimalView!=='boolean'||typeof p.insertMode!=='boolean')bad('flags');
 readonlyObject(p.memory,'memory');const memory={};for(const r of REGS)memory[r]=restoreValue(p.memory[r]);
 const ans=restoreValue(p.ans);
 readonlyObject(p.modeMemory,'modeMemory');readonlyObject(p.modeMemory.matrix,'matrix');readonlyObject(p.modeMemory.vector,'vector');let matrix={},vector={};for(const r of 'ABC'){matrix[r]=shapeMatrix(p.modeMemory.matrix[r]??null,'Mat'+r);vector[r]=shapeVector(p.modeMemory.vector[r]??null,'Vct'+r)}
 const stat=shapeStat(p.modeMemory.stat);
 const history=validateArray(p.history,50,'history').map(h=>{readonlyObject(h,'history row');return {expression:sizeString(h.expression,512,'history expression'),display:sizeString(h.display,512,'history display')}});
 return {memory,ans,matrix,vector,stat,history};}
function exportJSON(state){return JSON.stringify(extract(state),null,2)}
function importJSON(raw){if(typeof raw!=='string'||raw.length>90000)bad('file size');let obj;try{obj=JSON.parse(raw)}catch(e){bad('JSON syntax')};const clean=validate(obj);let s=K.createState(obj.model);s.mode=obj.mode;s.setup={angle:obj.setup.angle,format:obj.setup.format,digits:obj.setup.digits};s.expression=obj.expression;s.cursor=obj.cursor;s.document=E.fromSource(s.expression);s.decimalView=obj.decimalView;s.ui.insertMode=obj.insertMode;s.ui.modeMemory={matrix:clean.matrix,vector:clean.vector,stat:clean.stat};s.memory=clean.memory;s.ans=clean.ans;s.history=clean.history;
 // Do not trust any saved active workflow, result or error. Re-enter in edit mode.
 s.view='edit';s.lastValue=null;s.result='';s.error=null;s.errorPos=0;s.shift=false;s.alpha=false;s.trace=[];s.ui.pending=null;s.ui.wizard=null;s.ui.registerFlow=null;s.ui.statFlow=null;s.ui.lastWizard=null;return s;}
function storageGet(storage,key){try{return storage.getItem(key)}catch(e){return null}}
function enabled(storage){return storageGet(storage,OPT)==='yes'}
function enable(storage,on){try{if(on)storage.setItem(OPT,'yes');else {storage.removeItem(OPT);storage.removeItem(KEY)}return true}catch(e){return false}}
function store(storage,state){if(!enabled(storage))return false;try{storage.setItem(KEY,exportJSON(state));return true}catch(e){return false}}
function recover(storage){if(!enabled(storage))return null;const raw=storageGet(storage,KEY);if(!raw)return null;try{return importJSON(raw)}catch(e){return null}}
function clear(storage){try{storage.removeItem(KEY);return true}catch(e){return false}}
global.FX991_SESSION=Object.freeze({SCHEMA,VERSION,KEY,OPT,extract,validate,exportJSON,importJSON,enabled,enable,store,recover,clear});
})(typeof window!=='undefined'?window:globalThis);
