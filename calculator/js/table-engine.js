/* REA-057: native TABLE data model, CASIO row limits and synchronized cursor. */
(function(g){'use strict';
const C_MODEL='fx-991es-plus-c';
function fail(message){throw Error(message)}
function dualCapable(model){return model===C_MODEL}
function dualEnabled(model,requested){return dualCapable(model)&&requested===2}
function maxRows(model,count){return dualEnabled(model,count)?20:30}
function countRows(start,end,step,limit){
 if(![start,end,step].every(Number.isFinite))fail('Argument ERROR');
 if(step<=0||end<=start)fail('Argument ERROR');
 const ratio=(end-start)/step;
 if(!Number.isFinite(ratio))fail('Insufficient MEM');
 // Inclusive X, with an allowance only for floating point arithmetic near an integer.
 const count=Math.floor(ratio+1e-11*Math.max(1,Math.abs(ratio)))+1;
 if(!Number.isSafeInteger(count)||count<2||count>limit)fail('Insufficient MEM');
 return count;
}
function numeric(value,label){
 const n=Number(value);
 if(String(value).trim()===''||!Number.isFinite(n))fail('Argument ERROR');
 return n;
}
function generate({model,count=1,start,end,step,f,g=null}){
 const dual=dualEnabled(model,count);
 if(typeof f!=='function'||(dual&&typeof g!=='function'))fail('Argument ERROR');
 const a=numeric(start),b=numeric(end),h=numeric(step);
 const limit=maxRows(model,count),size=countRows(a,b,h,limit);
 const rows=[];
 for(let i=0;i<size;i++){
  const x=i===size-1&&Math.abs(a+i*h-b)<=1e-11*Math.max(1,Math.abs(b))?b:a+i*h;
  if(!Number.isFinite(x))fail('Argument ERROR');
  const value=(fn)=>{
   try{const y=fn(x);return typeof y==='number'&&Number.isFinite(y)?y:null}
   catch{return null}
  };
  rows.push({x,f:value(f),...(dual?{g:value(g)}:{})});
 }
 return {model,dual,columns:dual?['X','F(X)','G(X)']:['X','F(X)'],
  rows,row:0,col:0,start:a,end:b,step:h,maxRows:limit};
}
function navigate(table,dr,dc){
 if(!table||!Array.isArray(table.rows)||!table.rows.length)fail('Argument ERROR');
 table.row=Math.max(0,Math.min(table.rows.length-1,table.row+dr));
 table.col=Math.max(0,Math.min(table.columns.length-1,table.col+dc));
 return table;
}
function active(table){return table.rows[table.row][['x','f','g'][table.col]]}
function format(value){
 if(value===null||value===undefined||!Number.isFinite(value))return 'ERROR';
 return String(Number(value.toPrecision(12)));
}
function detail(table){return table.columns[table.col]+' = '+format(active(table))}
const API=Object.freeze({dualCapable,dualEnabled,maxRows,countRows,generate,navigate,active,format,detail});
g.FreshTable=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
