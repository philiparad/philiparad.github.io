/* REA-059 — INEQ solution pages and conservative exact-bound formatting. */
(function(g){'use strict';
function number(n,math){
 if(!Number.isFinite(n))return n<0?'-∞':'∞';
 if(math&&g.FreshEquationExact){
  const fraction=g.FreshEquationExact.rational(n);
  if(fraction!==null)return fraction;
 }
 return String(Number(n.toPrecision(12)));
}
function rootExpressions(result,math){
 const map=new Map();
 if(!math||!g.FreshEquationExact||!g.FreshEquation)return map;
 const coeff=result.values;
 // MathIO uses conservative exact fractions and the simple
 // sqrt form verified by the existing EQN exact formatter.
 const degree=coeff.length-1;
 if(degree===2){
  try{
   const eq=g.FreshEquationExact.decorate(g.FreshEquation.quadratic(coeff),coeff);
   for(const root of eq.solutions)if(typeof root.value==='number'&&root.exact)
    map.set(root.value,root.exact);
  }catch{}
 }
 return map;
}
function pages(result,math=true){
 const expressions=rootExpressions(result,math);
 const fmt=n=>{
  if(!Number.isFinite(n))return n<0?'-∞':'∞';
  for(const [value,text] of expressions)
   if(Math.abs(n-value)<=1e-10*Math.max(1,Math.abs(n),Math.abs(value)))return text;
  return number(n,math);
 };
 if(result.empty)return [{label:'No Solution',text:'No Solution',kind:'empty'}];
 if(result.allReal)return [{label:'All Real',text:'All Real Numbers',kind:'all'}];
 return result.intervals.map((part,index)=>{
  const lo=part.lo,hi=part.hi;
  let text;
  if(lo===hi)text='X = '+fmt(lo);
  else if(lo===-Infinity)text='X '+(part.hiClosed?'≤':'<')+' '+fmt(hi);
  else if(hi===Infinity)text='X '+(part.loClosed?'≥':'>')+' '+fmt(lo);
  else text=fmt(lo)+' '+(part.loClosed?'≤':'<')+' X '+(part.hiClosed?'≤':'<')+' '+fmt(hi);
  return {label:'Solution '+(index+1),text,kind:lo===hi?'point':'interval'};
 });
}
function session(degree,operator,values,result,math=true){
 if(![2,3].includes(degree))throw Error('Argument ERROR');
 const items=pages(result,math);
 return {degree,operator,values:{...values},solution:result,pages:items,index:0};
}
function page(state,delta,math=true){
 if(!state)return null;
 state.index=Math.max(0,Math.min(state.pages.length-1,state.index+delta));
 return state.pages[state.index];
}
function updateMath(state,math){
 state.pages=pages(state.solution,math);
 state.index=Math.max(0,Math.min(state.index,state.pages.length-1));
 return state;
}
g.FreshInequalityDisplay=Object.freeze({number,pages,session,page,updateMath});
if(typeof module!=='undefined'&&module.exports)module.exports=g.FreshInequalityDisplay;
})(typeof window!=='undefined'?window:globalThis);
