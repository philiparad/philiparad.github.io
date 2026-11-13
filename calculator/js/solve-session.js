/* REA-079: independent SOLVE prompt/result session rules.
 * Manufacturer-inspired UI, not manufacturer Newton iteration firmware.
 */
(function(global){'use strict';
function prepare(source,registers,memory={},scanner){
 const text=String(source).trim();
 if(!text)throw Error('Syntax ERROR');
 const matches=text.match(/=/g)||[];
 if(matches.length>1)throw Error('Syntax ERROR');
 const parts=text.split('=').map(x=>x.trim());
 if(parts.some(x=>!x))throw Error('Syntax ERROR');
 if(/(?:[ΠΣ∫]|÷R|d\/dx|\b(?:Pol|Rec|Prod|Product|Sum|Sigma|Integral|Diff)\s*\()/i.test(text))
  throw Error('Syntax ERROR');
 const allowed=new Set(registers);
 if(!allowed.has('X'))throw Error('Variable ERROR');
 const names=scanner(text,registers).filter(name=>name!=='X');
 if(!scanner(text,registers).includes('X'))throw Error('Variable ERROR: X');
 const fields=names.map(id=>({id,label:id+'?',value:String(memory[id]??0)}));
 fields.push({id:'guess',label:'Solve for X',value:String(memory.X??0)});
 return {source:text,fields,names,parts,solveFor:'X'};
}
function resolve(session,data,math,context={}){
 const memory={...(context.memory||{})},changes={};
 for(const name of session.names){
  const expr=String(data[name]??'').trim();
  if(!expr)throw Error('Argument ERROR');
  const value=math.evaluate(expr,{...context,memory});
  if(!Number.isFinite(value)||Math.abs(value)>=1e10)throw Error('Argument ERROR');
  memory[name]=value;changes[name]=value;
 }
 const guessExpression=String(data.guess??'').trim();
 if(!guessExpression)throw Error('Argument ERROR');
 const guess=math.evaluate(guessExpression,{...context,memory});
 if(!Number.isFinite(guess)||Math.abs(guess)>=1e10)throw Error('Argument ERROR');
 return {expression:session.source,guess,memory,changes,
  solveFor:'X',source:session.source};
}
// Web Newton iteration with resumable chunks. CASIO's exact iteration
// thresholds are not published; these are independent bounded choices.
function iterate(fn,math,start,previous=null,steps=20){
 if(!Number.isFinite(start)||Math.abs(start)>=1e10)throw Error('Argument ERROR');
 let x=previous?.x??start,fx=previous?.fx??fn(x);
 let lastStep=previous?.lastStep??Infinity,iterations=previous?.iterations??0;
 if(!Number.isFinite(fx))throw Error('Math ERROR');
 const threshold=1e-10;
 // Equation residual is f(X), not X: scaling tolerance by |X|
 // previously allowed a residual of 0.05 at X=1e9 to pass immediately.
 // Keep a conservative absolute residual; hardware thresholds unverified.
 const good=y=>Math.abs(y)<=threshold;
 for(let index=0;index<steps;index++){
  if(good(fx,x)&&(iterations===0||lastStep<=Math.sqrt(threshold)*Math.max(1,Math.abs(x)))){
   return {status:'solved',value:x,residual:fx,iterations};
  }
  if(iterations>=100)throw Error("Can't Solve");
  let slope;
  try{slope=math.derivative(fn,x,1e-9)}catch{slope=NaN}
  let proposal=Number.isFinite(slope)&&Math.abs(slope)>1e-14?x-fx/slope:NaN;
  if(!Number.isFinite(proposal)||Math.abs(proposal)>1e10)
   proposal=x+Math.max(.1,Math.abs(x)*.1)*(fx>0?-1:1);
  let accepted=false;
  for(let j=0;j<22;j++){
   const next=x+(proposal-x)*Math.pow(.5,j);
   if(next===x)break;
   try{
    const candidate=fn(next);
    if(Number.isFinite(candidate)&&(Math.abs(candidate)<Math.abs(fx)||good(candidate,next))){
     lastStep=Math.abs(next-x);x=next;fx=candidate;accepted=true;break;
    }
   }catch{}
  }
  if(!accepted)throw Error("Can't Solve");
  iterations++;
 }
 return {status:'continue',resume:{x,fx,lastStep,iterations},iterations};
}
function result(source,solution,residual,format){
 if(!Number.isFinite(solution)||!Number.isFinite(residual))throw Error('Math ERROR');
 const xText=format(solution),lrText=format(residual);
 return {kind:'solve',source,value:solution,residual,
  lines:[source,'X= '+xText,'L-R= '+lrText],
  variable:'X'};
}
const api=Object.freeze({prepare,resolve,iterate,result});
global.FreshSolveSession=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
