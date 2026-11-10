/* REA-062 — DIST list editor, 25 independent samples and result cells. */
(function(g){'use strict';
const MAX=25;
const LIST_TYPES=Object.freeze(['binomial-pd','binomial-cd','poisson-pd','poisson-cd']);
const fail=(message='Argument ERROR')=>{throw Error(message)};
const supported=type=>LIST_TYPES.includes(type);
function create(type,samples=[]){
 if(!supported(type)||!Array.isArray(samples)||samples.length>MAX)fail();
 const data=samples.map(x=>parse(String(x)));
 return {type,samples:data,answers:[],row:0,column:0,buffer:data.length?String(data[0]):'',
   editing:false,error:'',calculated:false,parameters:null};
}
function parse(text){
 const s=String(text).trim();
 if(!s||s.length>24||!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[Ee][+-]?\d+)?$/.test(s))fail('Syntax ERROR');
 const x=Number(s);if(!Number.isFinite(x)||Math.abs(x)>9.999999999e99)fail('Math ERROR');
 return x;
}
function load(e){e.buffer=e.row<e.samples.length?String(e.samples[e.row]):'';e.editing=false;e.error='';return e}
function edit(e,t){
 if(!/^[0-9Ee.+-]$/.test(String(t)))fail('Syntax ERROR');
 if(!e.editing){e.buffer='';e.editing=true}
 if(e.buffer.length>=24)fail('Input limit');
 e.buffer+=t;e.error='';return e;
}
function sign(e){
 if(!e.editing){e.buffer=e.row<e.samples.length?String(e.samples[e.row]):'';e.editing=true}
 e.buffer=e.buffer.startsWith('-')?e.buffer.slice(1):'-'+e.buffer;return e;
}
function backspace(e){
 if(!e.editing){e.buffer=e.row<e.samples.length?String(e.samples[e.row]):'';e.editing=true}
 e.buffer=e.buffer.slice(0,-1);return e;
}
function save(e){
 if(!e.editing)return e;
 const value=parse(e.buffer);
 if(e.row===e.samples.length){
  if(e.samples.length>=MAX)fail('Insufficient MEM');
  e.samples.push(value);
 }else e.samples[e.row]=value;
 e.answers=[];e.calculated=false;e.parameters=null;return load(e);
}
function next(e){
 save(e);
 if(e.row<e.samples.length&&e.row<MAX-1)e.row++;
 return load(e);
}
function move(e,dr,dc){
 save(e);
 e.row=Math.max(0,Math.min(e.samples.length<MAX?e.samples.length:MAX-1,e.row+dr));
 e.column=Math.max(0,Math.min(1,e.column+dc));
 return load(e);
}
function remove(e){
 if(e.row>=e.samples.length)return load(e);
 e.samples.splice(e.row,1);
 e.row=Math.min(e.row,e.samples.length);
 e.answers=[];e.parameters=null;e.calculated=false;
 return load(e);
}
function insert(e){
 if(e.samples.length>=MAX)fail('Insufficient MEM');
 // A real entry is added only after the replacement number is accepted.
 // Existing samples are not modified if the new input is invalid/cancelled.
 e.inserting=true;e.editing=true;e.buffer='';e.error='';return e;
}
function commitInsertion(e){
 if(!e.inserting)return save(e);
 const value=parse(e.buffer);
 if(e.samples.length>=MAX)fail('Insufficient MEM');
 e.samples.splice(e.row,0,value);
 e.inserting=false;e.answers=[];e.parameters=null;e.calculated=false;
 return load(e);
}
function cancelInsertion(e){e.inserting=false;return load(e)}
function clear(e){
 e.samples=[];e.answers=[];e.parameters=null;e.calculated=false;e.row=0;e.column=0;
 e.inserting=false;return load(e);
}
function evaluate(e,params,engine){
 if(!e.samples.length)fail('Argument ERROR');
 const answers=e.samples.map(x=>{
  try{return engine.calculate(e.type,{...params,x})}catch{return null}
 });
 e.answers=answers;e.parameters={...params};e.calculated=true;e.column=1;
 e.row=Math.min(e.row,e.samples.length-1);
 e.error='';
 return answers.slice();
}
function active(e){return e.column===0?(e.samples[e.row]??null):(e.answers[e.row]??null)}
function format(value){return value===null||value===undefined?'ERROR':String(Number(value.toPrecision(10)))}
g.FreshDistList=Object.freeze({MAX,LIST_TYPES,supported,create,parse,load,edit,sign,backspace,save,next,move,remove,insert,commitInsertion,cancelInsertion,clear,evaluate,active,format});
if(typeof module!=='undefined'&&module.exports)module.exports=g.FreshDistList;
})(typeof window!=='undefined'?window:globalThis);
