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
function add(a,b){
 if(a.dimension!==b.dimension)fail('Dimension ERROR');
 return create(a.dimension,a.data.map((x,i)=>finite(x+b.data[i])));
}
function subtract(a,b){
 if(a.dimension!==b.dimension)fail('Dimension ERROR');
 return create(a.dimension,a.data.map((x,i)=>finite(x-b.data[i])));
}
function scalar(a,k){const factor=finite(k);return create(a.dimension,a.data.map(x=>finite(x*factor)))}
function angle(a,b,unit='DEG'){
 if(a.dimension!==b.dimension)fail('Dimension ERROR');
 const na=magnitude(a),nb=magnitude(b);
 if(na===0||nb===0)fail('Math ERROR');
 const cosine=dot(a,b)/(na*nb);
 if(!Number.isFinite(cosine))fail('Math ERROR');
 const radians=Math.acos(Math.max(-1,Math.min(1,cosine)));
 if(unit==='DEG')return finite(radians*180/Math.PI);
 if(unit==='RAD')return finite(radians);
 if(unit==='GRA'||unit==='GRAD')return finite(radians*200/Math.PI);
 fail('Argument ERROR');
}
function geometry(a,b){
 if(a.dimension!==b.dimension)fail('Dimension ERROR');
 const na=magnitude(a),nb=magnitude(b);
 if(na===0||nb===0)fail('Math ERROR');
 const cos=Math.max(-1,Math.min(1,dot(a,b)/(na*nb)));
 const relation=Math.abs(cos)<1e-12?'perpendicular':
  Math.abs(cos-1)<1e-12?'parallel, same direction':
  Math.abs(cos+1)<1e-12?'parallel, opposite direction':
  cos>0?'acute':'obtuse';
 return {cosine:cos,relation,normA:na,normB:nb};
}
function record(state,operator,aName,bName=null,parameter=null){
 const a=get(state,aName);
 const binary=['add','subtract','dot','cross','angle'].includes(operator);
 const b=binary?get(state,bName):null;
 let output;
 if(operator==='add')output=add(a,b);
 else if(operator==='subtract')output=subtract(a,b);
 else if(operator==='scalar')output=scalar(a,parameter);
 else if(operator==='dot')output=dot(a,b);
 else if(operator==='cross')output=cross(a,b);
 else if(operator==='abs')output=magnitude(a);
 else if(operator==='angle')output=angle(a,b,parameter||'DEG');
 else fail('Argument ERROR');
 // Failed calculations never alter VctAns or the history.
 if(typeof output==='object')state.VctAns=clone(output);
 const historyItem={operator,aName,bName:binary?bName:null,
  parameter:operator==='scalar'||operator==='angle'?parameter:null,
  operandA:a,operandB:b,output:typeof output==='object'?clone(output):output};
 if(operator==='angle')historyItem.geometry=geometry(a,b);
 state.history.push(historyItem);
 if(state.history.length>MAX_HISTORY)state.history.shift();
 return output;
}
function copy(state,from,to){if(!NAMES.includes(to))fail('Argument ERROR');return set(state,to,get(state,from))}

/* PLUS-011: native-style vector expression parser, without code evaluation. */
function expression(state,source){
 const text=String(source||'');
 if(!text.trim()||text.length>140)fail('Syntax ERROR');
 const tokens=[],scanner=/\s*(VctAns|VctA|VctB|VctC|Abs|(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?|[()+*·/-])\s*/gy;
 let pos=0;
 while(pos<text.length){
  scanner.lastIndex=pos;const match=scanner.exec(text);
  if(!match||match.index!==pos)fail('Syntax ERROR');
  tokens.push(match[1]);pos=scanner.lastIndex;
 }
 let at=0;
 const peek=()=>tokens[at],next=()=>tokens[at++];
 const isVector=x=>x&&typeof x==='object'&&Array.isArray(x.data);
 function atom(){
  const token=next();
  if(token==='+')return atom();
  if(token==='-'){const value=atom();return isVector(value)?scalar(value,-1):finite(-value)}
  if(token==='('){const value=addition();if(next()!==')')fail('Syntax ERROR');return value}
  if(token==='Abs'){
   if(next()!=='(')fail('Syntax ERROR');
   const value=addition();
   if(next()!==')')fail('Syntax ERROR');
   return isVector(value)?magnitude(value):finite(Math.abs(value));
  }
  if(['VctA','VctB','VctC','VctAns'].includes(token))return get(state,token);
  if(token!==undefined&&/^(?:\d|\.)/.test(token))return finite(Number(token));
  fail('Syntax ERROR');
 }
 function product(){
  let left=atom();
  while(['*','/','·'].includes(peek())){
   const op=next(),right=atom(),lv=isVector(left),rv=isVector(right);
   if(op==='·'){if(!lv||!rv)fail('Dimension ERROR');left=dot(left,right)}
   else if(op==='/'){
    if(rv||right===0)fail(rv?'Dimension ERROR':'Math ERROR');
    left=lv?scalar(left,1/right):finite(left/right);
   }else if(lv&&rv)left=cross(left,right);
   else if(lv)left=scalar(left,right);
   else if(rv)left=scalar(right,left);
   else left=finite(left*right);
  }
  return left;
 }
 function addition(){
  let left=product();
  while(peek()==='+'||peek()==='-'){
   const op=next(),right=product(),lv=isVector(left),rv=isVector(right);
   if(lv!==rv)fail('Dimension ERROR');
   left=lv?(op==='+'?add(left,right):subtract(left,right)):finite(op==='+'?left+right:left-right);
  }
  return left;
 }
 const value=addition();
 if(at!==tokens.length)fail('Syntax ERROR');
 const output=isVector(value)?clone(value):finite(value);
 if(isVector(output))state.VctAns=clone(output);
 state.history.push({operator:'expression',aName:text,bName:null,
  output:isVector(output)?clone(output):output});
 if(state.history.length>MAX_HISTORY)state.history.shift();
 return output;
}
g.FreshVectorRegisters=Object.freeze({NAMES,MAX_HISTORY,create,clone,store,set,get,editor,parse,load,commit,type,sign,backspace,move,next,clear,dot,cross,magnitude,add,subtract,scalar,angle,geometry,record,copy,expression});
if(typeof module!=='undefined'&&module.exports)module.exports=g.FreshVectorRegisters;
})(typeof window!=='undefined'?window:globalThis);
