/* Milestone 13: independent C-edition educational mode engines.
   All expressions are parsed with the existing FX991 AST; no eval/Function. */
(function(global){'use strict';
const K=global.FX991, E=K.ERROR;
const fail=(code=E.ARGUMENT)=>{throw new K.CalcError(code)};
const num=t=>{if(typeof t!=='string'||!t.trim())fail();let n=Number(t.trim());if(!Number.isFinite(n))fail();return n};
const fmt=x=>{if(!Number.isFinite(x))fail(E.MATH);if(Math.abs(x)<1e-13)x=0;return Number(x.toPrecision(11)).toString()};
const result=(text,numeric=0,data=null)=>({kind:'mode-result',text:String(text),ans:K.dec(numeric),data});
const coeffs=s=>{let a=s.split(/[\s,]+/).filter(Boolean).map(num);if(![3,4].includes(a.length)||a[0]===0)fail(E.ARGUMENT);return a};
function polynomial(a,x){let v=a[0];for(let i=1;i<a.length;i++)v=v*x+a[i];return v}
function dedupe(values){let sorted=values.filter(Number.isFinite).sort((a,b)=>a-b),out=[];for(let x of sorted){if(!out.length||Math.abs(x-out[out.length-1])>2e-8*Math.max(1,Math.abs(x))){out.push(x)}}return out}
function quadraticRoots(a){let [A,B,C]=a,d=B*B-4*A*C,eps=1e-12*Math.max(1,Math.abs(B*B),Math.abs(4*A*C));if(d < -eps)return [];if(Math.abs(d)<=eps)return [-B/(2*A)];let sd=Math.sqrt(d),q=-.5*(B+Math.sign(B||1)*sd);return dedupe([q/A,C/q]);}
function realRoots(a){if(a.length===3)return quadraticRoots(a);
 let [A,B,C,D]=a;
 let critical=quadraticRoots([3*A,2*B,C]);
 let bound=1+Math.max(Math.abs(B/A),Math.abs(C/A),Math.abs(D/A));
 if(!Number.isFinite(bound))fail(E.MATH);
 let points=[-bound,...critical.filter(x=>x>-bound&&x<bound),bound].sort((x,y)=>x-y),roots=[];
 for(let x of critical){let v=polynomial(a,x),scale=Math.max(1,...a.map(Math.abs));if(Math.abs(v)<=1e-10*scale*Math.max(1,Math.abs(x)**3))roots.push(x)}
 for(let i=0;i<points.length-1;i++){
  let lo=points[i],hi=points[i+1],flo=polynomial(a,lo),fhi=polynomial(a,hi);
  if(flo===0){roots.push(lo);continue}if(fhi===0){roots.push(hi);continue}if(Math.sign(flo)===Math.sign(fhi))continue;
  for(let iter=0;iter<110;iter++){let mid=(lo+hi)/2,fmid=polynomial(a,mid);if(fmid===0||Math.abs(hi-lo)<1e-13*Math.max(1,Math.abs(mid))){lo=hi=mid;break}if(Math.sign(fmid)===Math.sign(flo)){lo=mid;flo=fmid}else hi=mid}
  roots.push((lo+hi)/2);
 }
 return dedupe(roots);
}
function intervals(a,relation){let roots=realRoots(a),isWeak=relation==='LE'||relation==='GE',positive=relation==='GT'||relation==='GE';
 let spans=[],ends=[-Infinity,...roots,Infinity];for(let i=0;i<ends.length-1;i++){
  let l=ends[i],r=ends[i+1],sample=Number.isFinite(l)&&Number.isFinite(r)?l+(r-l)/2:Number.isFinite(l)?l+Math.max(1,Math.abs(l)*.5):Number.isFinite(r)?r-Math.max(1,Math.abs(r)*.5):0;
  let v=polynomial(a,sample);if(positive?v>0:v<0)spans.push({lo:l,hi:r,loClosed:false,hiClosed:false});
 }
 if(isWeak){for(let r of roots){let touching=spans.filter(s=>s.hi===r||s.lo===r);if(touching.length===2){let left=touching.find(s=>s.hi===r),right=touching.find(s=>s.lo===r);spans=spans.filter(s=>s!==left&&s!==right);spans.push({lo:left.lo,hi:right.hi,loClosed:left.loClosed,hiClosed:right.hiClosed})}
  else if(touching.length===1){let s=touching[0];if(s.lo===r)s.loClosed=true;else s.hiClosed=true}
  else spans.push({lo:r,hi:r,loClosed:true,hiClosed:true});
 }}
 spans.sort((x,y)=>x.lo-y.lo);
 let show=spans.map(s=>s.lo===s.hi?'{'+fmt(s.lo)+'}':(s.loClosed?'[':'(')+(s.lo===-Infinity?'-∞':fmt(s.lo))+', '+(s.hi===Infinity?'∞':fmt(s.hi))+(s.hiClosed?']':')'));
 return {roots,spans,text:show.length?show.join(' ∪ '):'No Solution'};
}
function inequality(source){const m=String(source).trim().match(/^(LT|LE|GT|GE)\s*:\s*(.*)$/i);if(!m)fail(E.SYNTAX);let relation=m[1].toUpperCase(),a=coeffs(m[2]),out=intervals(a,relation);return result(out.text,0,{degree:a.length-1,relation,coefficients:a,roots:out.roots,intervals:out.spans})}
function verification(source,ctx){let s=String(source).trim();if(!s)fail(E.SYNTAX);let terms=[],ops=[],last=0,depth=0;
 // Valid chain: allow only one relation direction (all < or <=, all > or >=, or all = / !=).
 for(let i=0;i<s.length;i++){
  let c=s[i];if(c==='(')depth++;if(c===')'){depth--;if(depth<0)fail(E.SYNTAX)}
  if(depth===0&&/[<>=!≤≥≠]/.test(c)){
   let op=s.slice(i).match(/^(<=|>=|!=|==|≤|≥|≠|=|<|>)/)?.[0];if(!op)fail(E.SYNTAX);
   terms.push(s.slice(last,i).trim());ops.push(op);i+=op.length-1;last=i+1;
  }
 }
 if(depth!==0)fail(E.SYNTAX);terms.push(s.slice(last).trim());if(ops.length<1||terms.some(x=>!x))fail(E.SYNTAX);
 if(ops.length>3)fail(E.SYNTAX);
 const category=o=>(o==='<'||o==='≤'||o==='<=')?'less':(o==='>'||o==='≥'||o==='>=')?'greater':'equal';
 if(new Set(ops.map(category)).size>1)fail(E.SYNTAX);
 const values=terms.map(t=>K.numeric(K.evaluate(K.parse(t),ctx)));
 const compare=(a,b,op)=>{
  // Display-oriented equality of numerical results is approximate; hardware behavior is pending characterization.
  let eq=Math.abs(a-b)<=1e-10*Math.max(1,Math.abs(a),Math.abs(b));
  if(op==='='||op==='==')return eq;if(op==='!='||op==='≠')return !eq;
  if(op==='<' )return a<b&&!eq;if(op==='>' )return a>b&&!eq;
  if(op==='≤'||op==='<=')return a<b||eq;if(op==='≥'||op==='>=')return a>b||eq;
  fail(E.SYNTAX);
 };
 let truth=ops.every((op,i)=>compare(values[i],values[i+1],op));return result(truth?'TRUE':'FALSE',truth?1:0,{truth,values,relations:ops});
}
function normalPD(x,sd,mu){if(sd<=0)fail(E.ARGUMENT);let z=(x-mu)/sd;return Math.exp(-.5*z*z)/(sd*Math.sqrt(2*Math.PI))}
function normalCDF(x){if(x===Infinity)return 1;if(x===-Infinity)return 0;
 // Independently implemented 5-term erfc approximation (max absolute error ~7.5e-8).
 let z=x/Math.SQRT2,t=1/(1+.3275911*Math.abs(z)),p=(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t;
 let erf=1-p*Math.exp(-z*z);return Math.max(0,Math.min(1,.5*(1+(z<0?-erf:erf))))
}
function inverseNormal(p){if(!(p>0&&p<1))fail(E.ARGUMENT);
 // Acklam's rational inverse-CDF approximation with one Newton refinement.
 const a=[-39.69683028665376,220.9460984245205,-275.9285104469687,138.357751867269,-30.66479806614716,2.506628277459239],b=[-54.47609879822406,161.5858368580409,-155.6989798598866,66.80131188771972,-13.28068155288572];
 const c=[-.007784894002430293,-.3223964580411365,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783],d=[.007784695709041462,.3224671290700398,2.445134137142996,3.754408661907416];
 let x,q,r;if(p<.02425||p>1-.02425){q=Math.sqrt(-2*Math.log(p<.5?p:1-p));x=(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);if(p>.5)x=-x}
 else{q=p-.5;r=q*q;x=(((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1)}
 // Our approximate CDF has ~1e-7 error; do not refine against it (would worsen tail precision).
 return x;
}
function logGamma(z){if(z<=0)fail(E.ARGUMENT);const p=[.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.6150291621406,12.507343278686905,-.13857109526572012,9.984369578019572e-6,1.5056327351493116e-7];if(z<.5)return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-logGamma(1-z);z--;let x=p[0];for(let i=1;i<p.length;i++)x+=p[i]/(z+i);let t=z+7.5;return .5*Math.log(2*Math.PI)+(z+.5)*Math.log(t)-t+Math.log(x)}
function binomialPD(k,n,p){if(k<0||k>n)return 0;if(p===0)return k===0?1:0;if(p===1)return k===n?1:0;return Math.exp(logGamma(n+1)-logGamma(k+1)-logGamma(n-k+1)+k*Math.log(p)+(n-k)*Math.log1p(-p))}
function poissonPD(k,lambda){if(k<0)return 0;if(lambda===0)return k===0?1:0;return Math.exp(-lambda+k*Math.log(lambda)-logGamma(k+1))}
function finiteProbability(p){if(!Number.isFinite(p)||p<0||p>1)fail(E.ARGUMENT);return p}
function distribution(source){let m=String(source).trim().match(/^(NPD|NCD|INV|BPD|BCD|PPD|PCD)\s*:\s*(.*)$/i);if(!m)fail(E.SYNTAX);
 const op=m[1].toUpperCase(),body=m[2];
 if(['NPD','NCD','INV'].includes(op)){
  let a=body.split(',').map(num),v;
  if(op==='NPD'){if(a.length!==3)fail();v=normalPD(a[0],a[1],a[2])}
  if(op==='NCD'){if(a.length!==4&&a.length!==3)fail();let [lo,hi,sd,mu]=a.length===4?a:[-Infinity,...a];if(sd<=0||lo>hi)fail();v=normalCDF((hi-mu)/sd)-normalCDF((lo-mu)/sd)}
  if(op==='INV'){if(a.length!==3||a[1]<=0)fail();v=inverseNormal(a[0])*a[1]+a[2]}
  return result(fmt(v),v,{operation:op,value:v});
 }
 // Scalar x or semicolon-separated list of up to 25 discrete x values.
 let parts=body.split('|'),xs,params;
 if(parts.length===1){let all=parts[0].split(',').map(num);let required=op.startsWith('B')?3:2;if(all.length!==required)fail();xs=[all[0]];params=all.slice(1)}
 else if(parts.length===2){xs=parts[0].split(';').map(num);params=parts[1].split(',').map(num);if(xs.length>25||!xs.length)fail(E.MEM);if(params.length!==(op.startsWith('B')?2:1))fail()}
 else fail(E.SYNTAX);
 if(xs.some(k=>!Number.isInteger(k)||k<0))fail(E.ARGUMENT);
 let values;
 if(op.startsWith('B')){let [n,p]=params;if(!Number.isInteger(n)||n<0||n>100000||p<0||p>1)fail();values=xs.map(k=>{
  if(op==='BPD')return binomialPD(k,n,p);
  if(k>=n)return 1;
  // Sum the shorter tail, using complement above the distribution mode when useful.
  if(k>n*p){let upper=0;for(let j=k+1;j<=n;j++)upper+=binomialPD(j,n,p);return Math.max(0,1-upper)}
  let total=0;for(let j=0;j<=k;j++)total+=binomialPD(j,n,p);return Math.min(1,total)
 })}
 else{let lambda=params[0];if(lambda<0||lambda>100000)fail();values=xs.map(k=>{
  if(op==='PPD')return poissonPD(k,lambda);
  if(k>lambda){let tail=0,j=k+1,term=poissonPD(j,lambda);while(j<Math.max(k+100,lambda+20*Math.sqrt(lambda+1))&&term>1e-15){tail+=term;j++;term*=lambda/j}return Math.max(0,1-tail)}
  let total=0;for(let j=0;j<=k;j++)total+=poissonPD(j,lambda);return Math.min(1,total)
 })}
 values=values.map(v=>Math.min(1,Math.max(0,v)));
 return result(values.map(fmt).join(' ; '),values[0],{operation:op,x:xs,values});
}
function calculate(mode,source,ctx){if(ctx.model!=='c')fail(E.UNSUPPORTED);if(mode==='INEQ')return inequality(source);if(mode==='VERIF')return verification(source,ctx);if(mode==='DIST')return distribution(source);fail(E.UNSUPPORTED)}
const SAMPLES=Object.freeze({INEQ:'LT:1,2,-3',VERIF:'4*sqrt(9)=12',DIST:'NPD:36,2,35'});
global.FX991_CMODES=Object.freeze({calculate,SAMPLES,inequality,verification,distribution,realRoots,normalCDF,inverseNormal,binomialPD,poissonPD});
})(typeof window!=='undefined'?window:globalThis);
