/* REA-055 — named VECTOR registers and VctAns, independent of the DOM. */
(function(g){'use strict';
const NAMES=Object.freeze(['VctA','VctB','VctC']),MAX_HISTORY=30;
function fail(message='Math ERROR'){throw Error(message)}
function finite(v){const n=Number(v);if(!Number.isFinite(n)||Math.abs(n)>9.999999999e99)fail('Math ERROR');return n}
function create(dimension,values=null){
 if(dimension!==2&&dimension!==3)fail('Dimension ERROR');
 if(values!==null&&(!Array.isArray(values)||values.length!==dimension))fail('Dimension ERROR');
 return {dimension,data:values===null?Array(dimension).fill(0):values.map(finite)};
}
function clone(v){return v?create(v.dimension,v.data):null}
function store(){return {VctA:null,VctB:null,VctC:null,VctAns:null,history:[]}}
function set(state,name,v){if(!NAMES.includes(name))fail('Argument ERROR');state[name]=clone(v);return clone(state[name])}
function get(state,name){
 if(![...NAMES,'VctAns'].includes(name)||!state[name])fail('Dimension ERROR');
 return clone(state[name]);
}
function editor(state,name,dimension=null){
 if(!NAMES.includes(name))fail('Argument ERROR');
 const current=state[name],v=dimension===null?(current?clone(current):create(2)):create(dimension);
 return {name,vector:v,index:0,buffer:String(v.data[0]),editing:false,error:''};
}
function parse(raw){
 const s=String(raw).trim();
 if(!s||s.length>28||!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(s))fail('Syntax ERROR');
 return finite(Number(s));
}
function load(e){e.buffer=String(e.vector.data[e.index]);e.editing=false;e.error='';return e}
function commit(e){if(e.editing){e.vector.data[e.index]=parse(e.buffer);e.editing=false}return load(e)}
function type(e,t){
 if(!/^[0-9Ee.+-]$/.test(t))fail('Syntax ERROR');
 if(!e.editing){e.buffer='';e.editing=true}
 if(e.buffer.length>=28)fail('Input limit');
 e.buffer+=t;e.error='';return e;
}
function sign(e){if(!e.editing){e.buffer=String(e.vector.data[e.index]);e.editing=true}e.buffer=e.buffer.startsWith('-')?e.buffer.slice(1):'-'+e.buffer;return e}
function backspace(e){if(!e.editing){e.buffer=String(e.vector.data[e.index]);e.editing=true}e.buffer=e.buffer.slice(0,-1);return e}
function move(e,delta){commit(e);e.index=Math.max(0,Math.min(e.vector.dimension-1,e.index+delta));return load(e)}
function next(e){commit(e);if(e.index===e.vector.dimension-1)return true;move(e,1);return false}
function clear(e){e.vector.data.fill(0);e.index=0;return load(e)}
function dot(a,b){if(a.dimension!==b.dimension)fail('Dimension ERROR');return finite(a.data.reduce((sum,v,i)=>sum+v*b.data[i],0))}
function cross(a,b){
 if(a.dimension!==3||b.dimension!==3)fail('Dimension ERROR');
 const [x,y,z]=a.data,[u,v,w]=b.data;
 return create(3,[finite(y*w-z*v),finite(z*u-x*w),finite(x*v-y*u)]);
}
function magnitude(a){return finite(Math.hypot(...a.data))}
function record(state,operator,aName,bName=null){
 const a=get(state,aName),binary=operator==='dot'||operator==='cross',b=binary?get(state,bName):null;
 let output;
 if(operator==='dot')output=dot(a,b);
 else if(operator==='cross')output=cross(a,b);
 else if(operator==='abs')output=magnitude(a);
 else fail('Argument ERROR');
 if(typeof output==='object')state.VctAns=clone(output);
 state.history.push({operator,aName,bName:binary?bName:null,operandA:a,operandB:b,
  output:typeof output==='object'?clone(output):output});
 if(state.history.length>MAX_HISTORY)state.history.shift();
 return output;
}
function copy(state,from,to){if(!NAMES.includes(to))fail('Argument ERROR');return set(state,to,get(state,from))}
g.FreshVectorRegisters=Object.freeze({NAMES,MAX_HISTORY,create,clone,store,set,get,editor,parse,load,commit,type,sign,backspace,move,next,clear,dot,cross,magnitude,record,copy});
if(typeof module!=='undefined'&&module.exports)module.exports=g.FreshVectorRegisters;
})(typeof window!=='undefined'?window:globalThis);
