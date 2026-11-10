/* REA-061 — seven CASIO fx-991ES PLUS C distributions, scalar/Var path. */
(function(global){'use strict';
const TYPES=Object.freeze([
 {id:'normal-pd',label:'Normal PD',params:['x','sigma','mu'],defaults:['36','2','35']},
 {id:'normal-cd',label:'Normal CD',params:['lower','upper','sigma','mu'],defaults:['-1','1','1','0']},
 {id:'inverse-normal',label:'Inverse Normal',params:['area','sigma','mu'],defaults:['0.95','1','0']},
 {id:'binomial-pd',label:'Binomial PD',params:['x','n','p'],defaults:['10','15','0.6']},
 {id:'binomial-cd',label:'Binomial CD',params:['x','n','p'],defaults:['10','15','0.6']},
 {id:'poisson-pd',label:'Poisson PD',params:['x','mu'],defaults:['3','2']},
 {id:'poisson-cd',label:'Poisson CD',params:['x','mu'],defaults:['3','2']}
]);
function fail(message='Argument ERROR'){throw Error(message)}
function val(v){if(v===null||v===undefined||String(v).trim()==='')fail();const n=Number(v);if(!Number.isFinite(n)||Math.abs(n)>9.999999999e99)fail();return n}
function integer(n){if(n<0||!Number.isSafeInteger(n))fail('Argument ERROR');return n}
function probability(p){if(p<0||p>1)fail('Argument ERROR');return p}
function sigma(s){if(s<=0)fail('Argument ERROR');return s}
function clamp(p){return Math.max(0,Math.min(1,p))}
const GAUSS=Math.sqrt(2*Math.PI);
function normalPDF(x,s,mu){const z=(x-mu)/sigma(s);return Math.exp(-z*z/2)/(s*GAUSS)}
function normalTail(z){
 // Integrate the positive Gaussian tail directly to avoid cancellation
 // (0.5 - integral) at z >= 8. The omitted part beyond z+12 is tiny.
 if(z>=40)return 0;
 const pdf=t=>Math.exp(-t*t/2)/GAUSS,end=z+12;
 function simp(a,b,fa,fm,fb){return (b-a)*(fa+4*fm+fb)/6}
 function integrate(a,b,fa,fm,fb,whole,tol,depth){
  const mid=(a+b)/2,leftMid=(a+mid)/2,rightMid=(mid+b)/2;
  const f1=pdf(leftMid),f2=pdf(rightMid);
  const first=simp(a,mid,fa,f1,fm),second=simp(mid,b,fm,f2,fb);
  if(depth===0||Math.abs(first+second-whole)<=15*tol)
   return first+second+(first+second-whole)/15;
  return integrate(a,mid,fa,f1,fm,first,tol/2,depth-1)+
    integrate(mid,b,fm,f2,fb,second,tol/2,depth-1);
 }
 const fa=pdf(z),fb=pdf(end),fm=pdf((z+end)/2);
 return integrate(z,end,fa,fm,fb,simp(z,end,fa,fm,fb),
   Math.max(1e-300,fa*1e-13),26);
}
function normalCDF(x,s=1,mu=0){
 const z=(x-mu)/sigma(s);
 if(!Number.isFinite(z))return z<0?0:1;
 const tail=normalTail(Math.abs(z));
 return clamp(z<0?tail:1-tail);
}
function normalCD(lower,upper,s,mu){
 sigma(s);if(lower>upper)fail('Argument ERROR');if(lower===upper)return 0;
 return clamp(normalCDF(upper,s,mu)-normalCDF(lower,s,mu));
}
function inverseNormal(area,s,mu){
 probability(area);sigma(s);if(area===0||area===1)fail('Math ERROR');
 // Monotone bracketed solve, avoiding unstable Newton derivatives in tails.
 let low=-40,high=40;
 for(let i=0;i<62;i++){
  const mid=(low+high)/2;
  if(normalCDF(mid)<area)low=mid;else high=mid;
 }
 return mu+s*(low+high)/2;
}
const COF=[0.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-0.13857109526572012,9.984369578019572e-6,1.5056327351493116e-7];
function logGamma(z){
 if(z<=0)fail('Argument ERROR');
 if(z<.5)return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-logGamma(1-z);
 let x=COF[0];z-=1;
 for(let i=1;i<COF.length;i++)x+=COF[i]/(z+i);
 const t=z+7.5;
 return .5*Math.log(2*Math.PI)+(z+.5)*Math.log(t)-t+Math.log(x);
}
function logFact(k){return logGamma(k+1)}
function binomialPD(x,n,p){
 integer(n);integer(x);probability(p);
 if(x>n)return 0;
 if(p===0)return x===0?1:0;
 if(p===1)return x===n?1:0;
 return Math.exp(logFact(n)-logFact(x)-logFact(n-x)+x*Math.log(p)+(n-x)*Math.log1p(-p));
}
function binomialCD(x,n,p){
 integer(n);integer(x);probability(p);
 if(x>=n)return 1;if(p===0)return 1;if(p===1)return 0;
 // Sum from the cheaper tail with ratios, stopping when terms underflow.
 if(x<n*p){
  let term=binomialPD(x,n,p),total=term;
  for(let k=x,steps=0;k>0;k--){if(++steps>100000)fail('Time Out Error');term*=k/(n-k+1)*(1-p)/p;total+=term;if(term===0)break}
  return clamp(total);
 }
 let term=binomialPD(x+1,n,p),tail=term;
 for(let k=x+1,steps=0;k<n;k++){if(++steps>100000)fail('Time Out Error');term*=(n-k)/(k+1)*p/(1-p);tail+=term;if(term===0)break}
 return clamp(1-tail);
}
function poissonPD(x,mu){
 integer(x);if(mu<0)fail('Argument ERROR');if(mu===0)return x===0?1:0;
 return Math.exp(-mu+x*Math.log(mu)-logFact(x));
}
function poissonCD(x,mu){
 integer(x);if(mu<0)fail('Argument ERROR');if(mu===0)return 1;
 if(x<mu){
  let term=poissonPD(x,mu),sum=term;
  for(let k=x,steps=0;k>0;k--){if(++steps>100000)fail('Time Out Error');term*=k/mu;sum+=term;if(term===0)break}
  return clamp(sum);
 }
 let term=poissonPD(x+1,mu),tail=term;
 for(let k=x+1,steps=0;k<Math.max(x+30,mu+1000);k++){
  if(++steps>100000)fail('Time Out Error');
  term*=mu/(k+1);tail+=term;
  if(term===0||term<1e-16*Math.max(tail,1e-100))break;
 }
 return clamp(1-tail);
}
function calculate(type,raw){
 const spec=TYPES.find(t=>t.id===type);if(!spec)fail();
 const d={};for(const key of spec.params)d[key]=val(raw[key]);
 let result;
 if(type==='normal-pd')result=normalPDF(d.x,d.sigma,d.mu);
 else if(type==='normal-cd')result=normalCD(d.lower,d.upper,d.sigma,d.mu);
 else if(type==='inverse-normal')result=inverseNormal(d.area,d.sigma,d.mu);
 else if(type==='binomial-pd')result=binomialPD(d.x,d.n,d.p);
 else if(type==='binomial-cd')result=binomialCD(d.x,d.n,d.p);
 else if(type==='poisson-pd')result=poissonPD(d.x,d.mu);
 else result=poissonCD(d.x,d.mu);
 if(!Number.isFinite(result))fail('Math ERROR');
 return result;
}
global.FreshDistribution=Object.freeze({TYPES,calculate,normalPDF,normalCDF,normalCD,inverseNormal,binomialPD,binomialCD,poissonPD,poissonCD});
if(typeof module!=='undefined'&&module.exports)module.exports=global.FreshDistribution;
})(typeof window!=='undefined'?window:globalThis);
