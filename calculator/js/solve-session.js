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
function result(source,solution,residual,format){
 if(!Number.isFinite(solution)||!Number.isFinite(residual))throw Error('Math ERROR');
 const xText=format(solution),lrText=format(residual);
 return {kind:'solve',source,value:solution,residual,
  lines:[source,'X= '+xText,'L-R= '+lrText],
  variable:'X'};
}
const api=Object.freeze({prepare,resolve,result});
global.FreshSolveSession=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
