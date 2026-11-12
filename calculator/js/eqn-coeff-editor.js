/* PLUS-006 — fx-991ES PLUS EQN coefficient expression editor.
 * Calculator functions are parsed by FreshMath; no eval or Function execution.
 */
(function(global){'use strict';
const FIELDS=Object.freeze({
 LINEAR2:[['a1','b1','c1'],['a2','b2','c2']],
 LINEAR3:[['a1','b1','c1','d1'],['a2','b2','c2','d2'],['a3','b3','c3','d3']],
 QUAD:[['a','b','c']],
 CUBIC:[['a','b','c','d']]
});
const MAX=80;
function fault(message='Argument ERROR'){throw Error(message)}
function create(type){
 if(!Object.prototype.hasOwnProperty.call(FIELDS,type))fault();
 return {type,rows:FIELDS[type].map(row=>row.slice()),
  values:Object.fromEntries(FIELDS[type].flat().map(k=>[k,0])),
  row:0,col:0,buffer:'0',cursor:1,editing:false,error:''};
}
function current(e){return e.rows[e.row][e.col]}
function load(e){e.buffer=String(e.values[current(e)]);e.cursor=e.buffer.length;e.editing=false;e.error='';return e}
function closed(source){
 let depth=0;
 for(const c of source){if(c==='(')depth++;if(c===')'&&--depth<0)fault('Syntax ERROR')}
 return source+')'.repeat(depth);
}
function parse(text,options={}){
 const input=String(text).trim();
 if(!input||input.length>MAX||!/^[a-zA-Z0-9_.+*\/^(),\s-]+$/.test(input))fault('Syntax ERROR');
 let n;
 if(/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[Ee][+-]?\d+)?$/.test(input))n=Number(input);
 else{
  const calculator=global.FreshMath;
  if(!calculator||typeof calculator.evaluate!=='function')fault('Argument ERROR');
  n=calculator.evaluate(closed(input),{...options,math:false});
 }
 if(typeof n!=='number'||!Number.isFinite(n)||Math.abs(n)>9.999999999e99)fault('Math ERROR');
 return n;
}
function commit(e,options={}){
 if(e.editing){e.values[current(e)]=parse(e.buffer,options);e.editing=false}
 e.buffer=String(e.values[current(e)]);e.cursor=e.buffer.length;e.error='';return e;
}
function enter(e,token){
 const value=String(token);
 if(!/^(?:[0-9Ee.+\-*/^(),]|sqrt\(|cbrt\(|sin\(|cos\(|tan\(|log\(|ln\(|exp\(|Ans|pi|e|\^2|\^\(-1\))$/.test(value))fault('Syntax ERROR');
 if(!e.editing){e.buffer='';e.cursor=0;e.editing=true}
 if(e.buffer.length+value.length>MAX)fault('Input limit');
 const pos=Number.isInteger(e.cursor)?e.cursor:e.buffer.length;
 e.buffer=e.buffer.slice(0,pos)+value+e.buffer.slice(pos);
 e.cursor=pos+value.length;e.error='';return e;
}
function sign(e){
 if(!e.editing){e.buffer=String(e.values[current(e)]);e.cursor=e.buffer.length;e.editing=true}
 if(e.buffer.startsWith('-')){e.buffer=e.buffer.slice(1);e.cursor=Math.max(0,e.cursor-1)}
 else{e.buffer='-'+e.buffer;e.cursor++}
 e.error='';return e;
}
function caret(e,direction){
 if(!e.editing)return false;
 const old=e.cursor??e.buffer.length;
 const next=Math.max(0,Math.min(e.buffer.length,old+direction));
 if(old===next)return false;
 e.cursor=next;e.error='';return true;
}
function backspace(e){
 if(!e.editing){e.buffer=String(e.values[current(e)]);e.cursor=e.buffer.length;e.editing=true}
 const pos=e.cursor??e.buffer.length;
 if(pos>0){e.buffer=e.buffer.slice(0,pos-1)+e.buffer.slice(pos);e.cursor=pos-1}
 e.error='';return e;
}
function next(e,options={}){
 commit(e,options);
 if(e.col+1<e.rows[e.row].length)e.col++;
 else if(e.row+1<e.rows.length){e.row++;e.col=0}
 else return true;
 load(e);return false;
}
function move(e,dr,dc,options={}){
 commit(e,options);
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
const API=Object.freeze({FIELDS,create,current,load,parse,commit,enter,sign,caret,backspace,next,move,clear,restore});
global.FreshEquationEditor=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
