/* REA-060: chained VERIFY relations with exact pairwise comparisons. */
(function(global){'use strict';
const OPERATORS=Object.freeze(['=','!=','<','<=','>','>=']);
const CANONICAL=Object.freeze({'≤':'<=','≥':'>=','≠':'!=','==':'=','<>':'!='});
function fault(message='Syntax ERROR'){throw Error(message)}
function parse(input){
 const source=String(input??'').trim().replace(/[≤≥≠]/g,sign=>CANONICAL[sign]);
 if(!source||source.length>170)fault();
 const terms=[],operators=[];
 let start=0,depth=0;
 for(let i=0;i<source.length;i++){
  const ch=source[i];
  if(ch==='('){depth++;continue}
  if(ch===')'){if(--depth<0)fault();continue}
  if(depth!==0)continue;
  if(ch==='<'||ch==='>'||ch==='='||ch==='!'){
   let op=ch;
   if(source[i+1]==='='){op+='=';i++}
   else if(ch==='<'&&source[i+1]==='>'){op='!=';i++}
   if(op==='==')op='=';
   if(!OPERATORS.includes(op))fault();
   const term=source.slice(start,i-op.length+1).trim();
   if(!term)fault();
   terms.push(term);
   operators.push(op);
   start=i+1;
  }
 }
 if(depth!==0)fault();
 const last=source.slice(start).trim();
 if(!last||!operators.length)fault();
 terms.push(last);
 return {source,terms,operators};
}
function compare(a,b,op){
 if(!Number.isFinite(a)||!Number.isFinite(b))fault('Math ERROR');
 switch(op){
 case '=':return a===b;
 case '!=':return a!==b;
 case '<':return a<b;
 case '<=':return a<=b;
 case '>':return a>b;
 case '>=':return a>=b;
 default:fault();
 }
}
function evaluate(input,evaluator){
 const parsed=parse(input);
 if(typeof evaluator!=='function')fault('Argument ERROR');
 // Evaluate each sub-expression exactly once, including both sides of a chain.
 const values=parsed.terms.map(term=>{
  const n=evaluator(term);
  if(typeof n!=='number'||!Number.isFinite(n))fault('Math ERROR');
  return n;
 });
 const comparisons=parsed.operators.map((operator,i)=>({
  left:values[i],right:values[i+1],operator,
  result:compare(values[i],values[i+1],operator)
 }));
 return {...parsed,values,comparisons,result:comparisons.every(x=>x.result),
   text:comparisons.every(x=>x.result)?'TRUE':'FALSE'};
}
global.FreshVerify=Object.freeze({OPERATORS,parse,compare,evaluate});
if(typeof module!=='undefined'&&module.exports)module.exports=global.FreshVerify;
})(typeof window!=='undefined'?window:globalThis);
