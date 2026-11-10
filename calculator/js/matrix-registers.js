/* REA-053 — named MatA/MatB/MatC registers, dimensions, editing and MatAns. */
(function(g){'use strict';
const NAMES=Object.freeze(['MatA','MatB','MatC']),MAX_HISTORY=30;
function fail(message='Math ERROR'){throw Error(message)}
function number(x){const v=Number(x);if(!Number.isFinite(v)||Math.abs(v)>9.999999999e99)fail('Argument ERROR');return v}
function dims(rows,cols){if(!Number.isInteger(rows)||!Number.isInteger(cols)||rows<1||cols<1||rows>3||cols>3)fail('Dimension ERROR')}
function create(rows,cols,data=null){
 dims(rows,cols);
 const cells=Array.from({length:rows},(_,r)=>Array.from({length:cols},(_,c)=>data?number(data[r]?.[c]):0));
 return {rows,cols,data:cells};
}
function clone(m){if(!m)return null;return create(m.rows,m.cols,m.data)}
function store(){return {MatA:null,MatB:null,MatC:null,MatAns:null,history:[]}}
function ensureName(name){if(!NAMES.includes(name))fail('Argument ERROR')}
function set(state,name,m){ensureName(name);state[name]=clone(m);return state[name]}
function get(state,name){if(![...NAMES,'MatAns'].includes(name)||!state[name])fail('Dimension ERROR');return clone(state[name])}
function editor(state,name,rows=null,cols=null){
 ensureName(name);
 const current=state[name];
 const m=rows!==null?create(rows,cols):current?clone(current):create(2,2);
 return {name,matrix:m,row:0,col:0,buffer:String(m.data[0][0]),editing:false,error:''};
}
function current(e){return e.matrix.data[e.row][e.col]}
function load(e){e.buffer=String(current(e));e.editing=false;e.error='';return e}
function parse(s){
 const input=String(s).trim();
 if(!input||input.length>28||!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(input))fail('Syntax ERROR');
 return number(input);
}
function commit(e){
 if(e.editing){e.matrix.data[e.row][e.col]=parse(e.buffer);e.editing=false}
 return load(e);
}
function type(e,token){
 const t=String(token);if(!/^[0-9Ee.+-]$/.test(t))fail('Syntax ERROR');
 if(!e.editing){e.buffer='';e.editing=true}
 if(e.buffer.length>=28)fail('Input limit');
 e.buffer+=t;e.error='';return e;
}
function sign(e){if(!e.editing){e.buffer=String(current(e));e.editing=true}e.buffer=e.buffer.startsWith('-')?e.buffer.slice(1):'-'+e.buffer;return e}
function backspace(e){if(!e.editing){e.buffer=String(current(e));e.editing=true}e.buffer=e.buffer.slice(0,-1);return e}
function move(e,dy,dx){
 commit(e);
 if(dx){let pos=e.row*e.matrix.cols+e.col+dx;pos=Math.max(0,Math.min(e.matrix.rows*e.matrix.cols-1,pos));e.row=Math.floor(pos/e.matrix.cols);e.col=pos%e.matrix.cols}
 else e.row=Math.max(0,Math.min(e.matrix.rows-1,e.row+dy));
 return load(e);
}
function next(e){commit(e);if(e.row===e.matrix.rows-1&&e.col===e.matrix.cols-1)return true;move(e,0,1);return false}
function clear(e){for(const row of e.matrix.data)row.fill(0);e.row=0;e.col=0;return load(e)}
function resize(e,rows,cols){const next=create(rows,cols);for(let r=0;r<Math.min(rows,e.matrix.rows);r++)for(let c=0;c<Math.min(cols,e.matrix.cols);c++)next.data[r][c]=e.matrix.data[r][c];e.matrix=next;e.row=Math.min(e.row,rows-1);e.col=Math.min(e.col,cols-1);return load(e)}
function add(a,b){if(a.rows!==b.rows||a.cols!==b.cols)fail('Dimension ERROR');return create(a.rows,a.cols,a.data.map((row,i)=>row.map((v,j)=>number(v+b.data[i][j]))))}
function multiply(a,b){if(a.cols!==b.rows)fail('Dimension ERROR');return create(a.rows,b.cols,Array.from({length:a.rows},(_,r)=>Array.from({length:b.cols},(_,c)=>number(a.data[r].reduce((sum,v,k)=>sum+v*b.data[k][c],0)))))}
function det(a){
 if(a.rows!==a.cols)fail('Dimension ERROR');const d=a.data;
 if(a.rows===1)return d[0][0];
 if(a.rows===2)return number(d[0][0]*d[1][1]-d[0][1]*d[1][0]);
 return number(d[0][0]*(d[1][1]*d[2][2]-d[1][2]*d[2][1])-d[0][1]*(d[1][0]*d[2][2]-d[1][2]*d[2][0])+d[0][2]*(d[1][0]*d[2][1]-d[1][1]*d[2][0]));
}
function subtract(a,b){
 if(a.rows!==b.rows||a.cols!==b.cols)fail('Dimension ERROR');
 return create(a.rows,a.cols,a.data.map((row,r)=>row.map((v,c)=>number(v-b.data[r][c]))));
}
function transpose(a){
 return create(a.cols,a.rows,Array.from({length:a.cols},(_,c)=>Array.from({length:a.rows},(_,r)=>a.data[r][c])));
}
function scalar(a,k){
 const factor=number(k);
 return create(a.rows,a.cols,a.data.map(row=>row.map(v=>number(v*factor))));
}
function identity(n){dims(n,n);return create(n,n,Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>r===c?1:0)))}
function inverse(a){
 if(a.rows!==a.cols)fail('Dimension ERROR');
 const n=a.rows;
 const A=a.data.map((row,i)=>[...row,...identity(n).data[i]]);
 const scale=Math.max(...a.data.flat().map(x=>Math.abs(x)));
 if(scale===0)fail('Math ERROR');
 // Gaussian elimination with scaled partial pivot selection; non-invertible
 // matrices cause Math ERROR and cannot update MatAns/history.
 for(let c=0;c<n;c++){
  let pivot=c;
  for(let row=c+1;row<n;row++)if(Math.abs(A[row][c])>Math.abs(A[pivot][c]))pivot=row;
  if(Math.abs(A[pivot][c])<=1e-12*scale)fail('Math ERROR');
  [A[c],A[pivot]]=[A[pivot],A[c]];
  const div=A[c][c];
  for(let j=0;j<2*n;j++)A[c][j]/=div;
  for(let row=0;row<n;row++)if(row!==c){
   const factor=A[row][c];
   for(let j=0;j<2*n;j++)A[row][j]-=factor*A[c][j];
  }
 }
 const result=create(n,n,A.map(row=>row.slice(n)));
 const product=multiply(a,result);
 for(let r=0;r<n;r++)for(let c=0;c<n;c++){
  const target=r===c?1:0;
  if(!Number.isFinite(product.data[r][c])||Math.abs(product.data[r][c]-target)>1e-8)fail('Math ERROR');
 }
 return result;
}
function power(a,exponent){
 if(a.rows!==a.cols)fail('Dimension ERROR');
 if(!Number.isInteger(exponent)||Math.abs(exponent)>99)fail('Argument ERROR');
 let result=identity(a.rows),factor=exponent<0?inverse(a):clone(a),n=Math.abs(exponent);
 while(n){
  if(n%2===1)result=multiply(result,factor);
  n=Math.floor(n/2);
  if(n)factor=multiply(factor,factor);
 }
 return result;
}
function absolute(a){return Math.abs(det(a))}
function record(state,operator,aName,bName=null,parameter=null){
 const a=get(state,aName);
 const binary=['add','subtract','multiply'].includes(operator);
 const b=binary?get(state,bName):null;
 let result;
 switch(operator){
 case 'add':result=add(a,b);break;
 case 'subtract':result=subtract(a,b);break;
 case 'multiply':result=multiply(a,b);break;
 case 'transpose':result=transpose(a);break;
 case 'inverse':result=inverse(a);break;
 case 'power':result=power(a,parameter);break;
 case 'scalar':result=scalar(a,parameter);break;
 case 'det':result=det(a);break;
 case 'abs':result=absolute(a);break;
 default:fail('Argument ERROR');
 }
 // Mutate history and MatAns only after a successful calculation.
 if(typeof result==='object')state.MatAns=clone(result);
 const entry={operator,aName,bName:binary?bName:null,parameter:operator==='power'||operator==='scalar'?parameter:null,
  operandA:a,operandB:b,output:typeof result==='object'?clone(result):result};
 state.history.push(entry);
 if(state.history.length>MAX_HISTORY)state.history.shift();
 return result;
}
function copy(state,from,to){ensureName(to);return set(state,to,get(state,from))}
const API=Object.freeze({NAMES,MAX_HISTORY,create,clone,store,set,get,editor,current,load,parse,commit,type,sign,backspace,move,next,clear,resize,add,subtract,multiply,transpose,scalar,identity,inverse,power,det,absolute,record,copy});
g.FreshMatrixRegisters=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
