/* REA-068: off-main-thread numerical calculation; terminable by AC/MODE/OFF.
 * Uses independent calculator engine, not CASIO ROM/firmware.
 * Error classifications and iteration ceilings remain in math-engine.js.
 */
'use strict';
importScripts('decimal-core.js','number-format.js','sexagesimal.js','math-engine.js','solve-session.js');
const M=self.FreshMath;
function compute(task){
 const {kind,data,settings}=task;
 if(!['SOLVE','DERIVATIVE','INTEGRAL','SUM','PRODUCT'].includes(kind))throw Error('Argument ERROR');
 const expression=String(data.expression||'').trim();
 const parts=expression.split('=');
 if(parts.length>2||parts.some(s=>!s.trim())||(kind!=='SOLVE'&&parts.length>1))
  throw Error('Syntax ERROR');
 if(kind==='SOLVE'&&!/(?:^|[^A-Za-z0-9_])X(?:$|[^A-Za-z0-9_])/.test(expression))
  throw Error('Variable ERROR');
 if(/\b(?:Pol|Rec|Prod|Product)\s*\(|[ΠΣ∫]|÷R|d\/dx|\b(?:Sum|Sigma|Integral|Diff)\s*\(/i.test(expression))
  throw Error('Syntax ERROR');
 for(const [field,source] of Object.entries(data)){
  if(field!=='expression'&&/\b(?:Pol|Rec|Prod|Product|Sum|Sigma|Integral|Diff)\s*\(|[ΠΣ∫]|÷R|d\/dx/i.test(String(source)))
   throw Error('Syntax ERROR');
 }
 const opts={...settings,memory:{...(settings.memory||{})}};
 const number=value=>{
  if(!String(value).trim())throw Error('Argument ERROR');
  const n=M.evaluate(String(value),opts);
  if(!Number.isFinite(n))throw Error('Math ERROR');
  return n;
 };
 const f=x=>{
  const scoped={...opts,memory:{...opts.memory,X:x},math:false};
  const left=M.evaluate(parts[0],scoped);
  return parts.length===2?left-M.evaluate(parts[1],scoped):left;
 };
 let value;
 if(kind==='DERIVATIVE')value=M.derivative(f,number(data.at),number(data.tol));
 if(kind==='INTEGRAL')value=M.integrate(f,number(data.a),number(data.b),number(data.tol));
 if(kind==='SOLVE'){
  const progress=self.FreshSolveSession.iterate(f,M,number(data.guess),data.resume||null);
  if(progress.status==='continue')return {continue:true,resume:progress.resume,
   iterations:progress.iterations};
  value=progress.value;
 }
 if(kind==='SUM')value=M.summation(f,number(data.a),number(data.b));
 if(kind==='PRODUCT')value=M.finiteProduct({
  expression,a:data.a,b:data.b,step:data.step
 },opts);
 if(!Number.isFinite(value)||Math.abs(value)>9.999999999e99)throw Error('Math ERROR');
 const residual=kind==='SOLVE'?f(value):null;
 return {value,residual};
}
self.onmessage=function(event){
 const {id,task}=event.data||{};
 try{self.postMessage({id,ok:true,...compute(task)})}
 catch(error){self.postMessage({id,ok:false,error:String(error.message||'Math ERROR')})}
};
