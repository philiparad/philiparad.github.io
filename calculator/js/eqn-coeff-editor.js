/* REA-052 — EQN LCD coefficient matrix editor, independent of DOM. */
(function(global){'use strict';
const FIELDS={
 LINEAR2:[['a1','b1','c1'],['a2','b2','c2']],
 LINEAR3:[['a1','b1','c1','d1'],['a2','b2','c2','d2'],['a3','b3','c3','d3']],
 QUAD:[['a','b','c']],
 CUBIC:[['a','b','c','d']]
};
function fault(message='Argument ERROR'){throw Error(message)}
function create(type){
 if(!Object.prototype.hasOwnProperty.call(FIELDS,type))fault();
 return {type,rows:FIELDS[type].map(row=>row.slice()),values:Object.fromEntries(FIELDS[type].flat().map(k=>[k,0])),
  row:0,col:0,buffer:'0',editing:false,error:''};
}
function current(e){return e.rows[e.row][e.col]}
function load(e){e.buffer=String(e.values[current(e)]);e.editing=false;e.error='';return e}
function parse(text){
 const src=String(text).trim();
 if(!src||src.length>24||!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[Ee][+-]?\d+)?$/.test(src))fault('Syntax ERROR');
 const n=Number(src);
 if(!Number.isFinite(n)||Math.abs(n)>9.999999999e99)fault('Math ERROR');
 return n;
}
function commit(e){
 if(e.editing){e.values[current(e)]=parse(e.buffer);e.editing=false}
 e.buffer=String(e.values[current(e)]);e.error='';return e;
}
function enter(e,s){
 const text=String(s);
 if(!/^[0-9Ee.+-]$/.test(text))fault('Syntax ERROR');
 if(!e.editing){e.buffer='';e.editing=true}
 if(e.buffer.length>=24)fault('Input limit');
 e.buffer+=text;e.error='';return e;
}
function sign(e){
 if(!e.editing){e.buffer=String(e.values[current(e)]);e.editing=true}
 e.buffer=e.buffer.startsWith('-')?e.buffer.slice(1):'-'+e.buffer;
 e.error='';return e;
}
function backspace(e){
 if(!e.editing){e.buffer=String(e.values[current(e)]);e.editing=true}
 e.buffer=e.buffer.slice(0,-1);e.error='';return e;
}
function next(e){
 commit(e);if(e.col+1<e.rows[e.row].length){e.col++}
 else if(e.row+1<e.rows.length){e.row++;e.col=0}
 else return true;
 load(e);return false;
}
function move(e,dr,dc){
 commit(e);
 if(dc){
  const flat=e.rows.flat(),index=flat.indexOf(current(e));
  const target=flat[Math.max(0,Math.min(flat.length-1,index+dc))];
  for(let r=0;r<e.rows.length;r++){const c=e.rows[r].indexOf(target);if(c>=0){e.row=r;e.col=c;break}}
 }else e.row=Math.max(0,Math.min(e.rows.length-1,e.row+dr));
 e.col=Math.min(e.col,e.rows[e.row].length-1);
 return load(e);
}
function clear(e){for(const k of e.rows.flat())e.values[k]=0;e.row=0;e.col=0;return load(e)}
function restore(e){e.row=0;e.col=0;return load(e)}
const API=Object.freeze({FIELDS,create,current,load,parse,commit,enter,sign,backspace,next,move,clear,restore});
global.FreshEquationEditor=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
