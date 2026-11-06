/* Milestone 11: COMP-only numerical operations using the common AST and typed values.
 * Independently implemented educational algorithms; not a firmware port. */
(function(global){'use strict';
const K=global.FX991;
const OPERATIONS=Object.freeze(['SOLVE','DIFF','INTEGRAL','SUM']);
function fail(code,reason='unspecified',details={}){let e=new K.CalcError(code);e.numericalReason=reason;e.numericalDetails=details;throw e}
function finite(x){if(!Number.isFinite(x))fail(K.ERROR.MATH,'nonfinite_value');return x}
function sample(f,x,context){try{return finite(f(x))}catch(e){if(e.code===K.ERROR.TIME_OUT)throw e;fail(K.ERROR.MATH,'domain_sample',{context,x})}}
function astFor(source){return K.buildAst(K.buildDocument(String(source)))}
function evaluator(state,source){
 if(state.mode!=='COMP')fail(K.ERROR.UNSUPPORTED);
 const ast=astFor(source),memory={...state.memory};
 const exact=x=>K.evaluate(ast,{setup:state.setup,ans:state.ans,memory:{...memory,X:x}});
 const numeric=x=>K.numeric(exact(K.dec(x)));
 return {ast,exact,numeric};
}
function derivative(f,x){
 finite(x);sample(f,x,'derivative_center');let h=Math.max(1e-4,Math.abs(x)*1e-4),prev=null,best=0;
 for(let i=0;i<12;i++){
  let a=(sample(f,x+h,'derivative_right')-sample(f,x-h,'derivative_left'))/(2*h),b=(sample(f,x+h/2,'derivative_right')-sample(f,x-h/2,'derivative_left'))/h;
  best=finite((4*b-a)/3);
  if(prev!==null&&Math.abs(best-prev)<1e-9*Math.max(1,Math.abs(best))){
   const probe=Math.max(1e-6,Math.abs(x)*1e-6),center=sample(f,x,'derivative_center');
   const left=finite((center-sample(f,x-probe,'derivative_left'))/probe);
   const right=finite((sample(f,x+probe,'derivative_right')-center)/probe);
   if(Math.abs(left-right)>1e-4*Math.max(1,Math.abs(left),Math.abs(right)))fail(K.ERROR.MATH,'non_differentiable',{x,left,right});
   return {value:best,iterations:i+1,errorEstimate:Math.abs(best-prev)};
  }
  prev=best;h/=2;
 }
 // A symmetric difference can appear converged at a cusp (e.g. abs(X) at 0).
 // Compare one-sided secants; refuse to certify a nonexistent derivative.
 const probe=Math.max(1e-6,Math.abs(x)*1e-6);
 const center=sample(f,x,'derivative_center');
 const left=finite((center-sample(f,x-probe,'derivative_left'))/probe);
 const right=finite((sample(f,x+probe,'derivative_right')-center)/probe);
 if(Math.abs(left-right)>1e-4*Math.max(1,Math.abs(left),Math.abs(right)))fail(K.ERROR.MATH,'non_differentiable',{x,left,right});
 fail(K.ERROR.TIME_OUT,'derivative_not_converged',{x,iterations:12,lastEstimate:best});
}
function solve(f,start){
 finite(start);let x=start;
 for(let k=0;k<80;k++){
  let fx=sample(f,x,'solve_iteration');if(Math.abs(fx)<=1e-11)return {value:x,iterations:k+1,residual:fx};
  let df=derivative(f,x).value;
  if(!Number.isFinite(df)||Math.abs(df)<1e-14)fail(K.ERROR.CANT_SOLVE,'near_zero_slope',{x});
  let step=fx/df,accepted=false;
  for(let j=0;j<25;j++){
   let trial=x-step,ty;
   try{ty=f(trial)}catch(e){ty=Infinity}
   if(Number.isFinite(ty)&&Math.abs(ty)<Math.abs(fx)){x=trial;accepted=true;break}
   step/=2;
  }
  if(!accepted)fail(K.ERROR.CANT_SOLVE,'no_residual_improvement',{x,iteration:k+1});
 }
 fail(K.ERROR.CANT_SOLVE,'iteration_limit',{iterations:80});
}
const GK_X=[0,0.20778495500789847,0.40584515137739717,0.58608723546769113,0.74153118559939446,0.8648644233597691,0.9491079123427585,0.9914553711208126];
const GK_W=[0.20948214108472783,0.20443294007529889,0.19035057806478542,0.1690047266392679,0.14065325971552592,0.10479001032225018,0.06309209262997855,0.02293532201052922];
const G_W={0:0.4179591836734694,2:0.3818300505051189,4:0.27970539148927664,6:0.1294849661688697};
function panel(f,a,b){let m=(a+b)/2,h=(b-a)/2,g=G_W[0]*f(m),k=GK_W[0]*f(m);
 for(let i=1;i<8;i++){let v=f(m-h*GK_X[i])+f(m+h*GK_X[i]);k+=GK_W[i]*v;if(G_W[i]!==undefined)g+=G_W[i]*v}
 return {value:finite(k*h),error:finite(Math.abs((k-g)*h))};
}
function integrate(f,lower,upper,tolerance=1e-5){
 finite(lower);finite(upper);if(!(tolerance>=1e-14&&tolerance<=1))fail(K.ERROR.ARGUMENT,'invalid_tolerance');
 if(lower===upper)return {value:0,errorEstimate:0,intervals:0,evaluations:0};
 let sign=1;if(upper<lower){[lower,upper]=[upper,lower];sign=-1}
 let intervals=0,evaluations=0;
 function guarded(x){evaluations++;if(evaluations>100000)fail(K.ERROR.TIME_OUT,'evaluation_budget',{evaluations});return sample(f,x,'integration_sample')}
 // This engine handles proper integrals only. Inspect both boundaries and a
 // deterministic interior grid so common poles are not hidden by quadrature.
 // A finite probe does NOT prove continuity or exclude every singularity.
 for(let i=0;i<=64;i++){
  const x=lower+(upper-lower)*(i/64);
  guarded(x);
 }
 function visit(a,b,depth,budget){intervals++;if(intervals>7000)fail(K.ERROR.TIME_OUT,'interval_budget',{intervals});
  let z=panel(guarded,a,b);if(z.error<=budget+1e-11*Math.abs(z.value))return z;
  if(depth>=18)fail(K.ERROR.TIME_OUT,'quadrature_not_converged',{depth,intervals,errorEstimate:z.error,budget});
  let m=(a+b)/2,l=visit(a,m,depth+1,budget/2),r=visit(m,b,depth+1,budget/2);
  return {value:l.value+r.value,error:l.error+r.error};
 }
 const r=visit(lower,upper,0,tolerance);
 return {value:sign*r.value,errorEstimate:r.error,intervals,evaluations};
}
function sum(exact,a,b){
 if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||b<a||b-a>10000)fail(K.ERROR.ARGUMENT);
 let out=K.rat(0n);for(let k=a;k<=b;k++)out=K.add(out,exact(K.rat(BigInt(k))));
 return {value:out,terms:b-a+1};
}
function numberParameter(value){if(String(value).trim()==='')fail(K.ERROR.ARGUMENT);return finite(Number(value))}
function run(state,operation,source,params={}){
 if(!OPERATIONS.includes(operation))fail(K.ERROR.ARGUMENT);
 const E=evaluator(state,source);
 if(operation==='SUM'){
  let a=numberParameter(params.lower),b=numberParameter(params.upper),r=sum(E.exact,a,b);
  return {value:r.value,metadata:{operation,source,...r,value:undefined}};
 }
 if(operation==='DIFF'){
  let x=numberParameter(params.at),r=derivative(E.numeric,x);
  return {value:K.dec(r.value),metadata:{operation,source,at:x,iterations:r.iterations,errorEstimate:r.errorEstimate}};
 }
 if(operation==='INTEGRAL'){
  let a=numberParameter(params.lower),b=numberParameter(params.upper),tol=params.tolerance===undefined?1e-5:numberParameter(params.tolerance);
  let r=integrate(E.numeric,a,b,tol);
  return {value:K.dec(r.value),metadata:{operation,source,lower:a,upper:b,tolerance:tol,intervals:r.intervals,evaluations:r.evaluations,errorEstimate:r.errorEstimate}};
 }
 let guess=numberParameter(params.guess),r=solve(E.numeric,guess);
 return {value:K.dec(r.value),metadata:{operation,source,guess,iterations:r.iterations,residual:r.residual}};
}
function execute(state,operation,source,params){
 let s={...state,memory:{...state.memory},history:state.history.slice(),trace:state.trace.slice()};
 try{
  let r=run(s,operation,source,params);
  s.lastValue=r.value;s.ans=r.value;
  if(operation==='SOLVE')s.memory.X=r.value;
  s.decimalView=operation!=='SUM';s.result=K.valueDisplay(r.value,s.setup,s.decimalView);
  s.expression=String(source);s.cursor=s.expression.length;
  if(global.FX991_EDITOR)s.document=global.FX991_EDITOR.fromSource(s.expression);
  s.view='result';s.error=null;s.numericalDetails=r.metadata;
  s.history.unshift({expression:operation+'('+source+')',display:s.result});s.history=s.history.slice(0,50);
 }catch(e){s.error=e.code||K.ERROR.MATH;s.result=s.error;s.view='error';s.errorPos=s.cursor;s.numericalDetails={operation,error:s.error,reason:e.numericalReason||'evaluation_error',diagnostic:e.numericalDetails||null}}
 s.trace.push({key:'NUM_'+operation,mode:s.mode,view:s.view,expression:s.expression,result:s.result});if(s.trace.length>200)s.trace.shift();
 return s;
}
global.FX991_NUM=Object.freeze({OPERATIONS,astFor,evaluator,derivative,solve,integrate,sum,run,execute});
})(typeof window!=='undefined'?window:globalThis);
