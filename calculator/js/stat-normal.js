/* REA-084: original fx-991ES STAT/Distr standard normal functions.
 * Deterministic independent implementation, not proprietary firmware.
 */
(function(global){'use strict';
const LIMIT=9.999999999e99;
const finite=x=>{if(!Number.isFinite(x)||Math.abs(x)>LIMIT)throw Error('Math ERROR');return x};
function area(z){
 finite(z);
 const a=Math.abs(z);
 if(a===0)return 0;
 if(a>=12)return 0.5;
 const f=x=>Math.exp(-x*x/2)/Math.sqrt(2*Math.PI);
 function simpson(a,b,fa,fc,fb){return (b-a)*(fa+4*fc+fb)/6}
 function refine(left,right,fa,fc,fb,total,tol,remaining){
  const mid=(left+right)/2,l=(left+mid)/2,r=(mid+right)/2;
  const fl=f(l),fr=f(r);
  const first=simpson(left,mid,fa,fl,fc),last=simpson(mid,right,fc,fr,fb);
  if(remaining<=0||Math.abs(first+last-total)<=15*tol)
   return first+last+(first+last-total)/15;
  return refine(left,mid,fa,fl,fc,first,tol/2,remaining-1)+
   refine(mid,right,fc,fr,fb,last,tol/2,remaining-1);
 }
 const fa=f(0),fb=f(a),fc=f(a/2);
 return Math.min(.5,Math.max(0,refine(0,a,fa,fc,fb,
  simpson(0,a,fa,fc,fb),2e-14,22)));
}
// REA-101: normal lower-tail P(t) must avoid subtracting nearly equal
// halves for t << 0. The Gaussian Mills-ratio continued fraction evaluates
// the small tail directly, with 100 terms for stable double precision.
function lowerTail(t){
 const x=finite(t);
 if(x===0)return 0.5;
 const a=Math.abs(x);
 let tail;
 if(a>=4){
  if(a>=39)tail=0; // below IEEE-754 normal representable output range
  else{
   let fraction=0;
   for(let k=100;k>=1;k--)fraction=k/(a+fraction);
   tail=Math.exp(-a*a/2)/Math.sqrt(2*Math.PI)/(a+fraction);
  }
 }else tail=0.5-area(a);
 return x<0?tail:1-tail;
}
function probabilities(t){
 const x=finite(Number(t)),half=area(x),signed=x<0?-half:half;
 const P=lowerTail(x),Q=signed,R=.5-signed;
 return {P,Q,R};
}
function normalized(x,summary){
 const value=finite(Number(x));
 if(!summary||!Number.isFinite(summary.meanX)||
  !Number.isFinite(summary.sdX)||summary.sdX<=0)
  throw Error('Math ERROR');
 return finite((value-summary.meanX)/summary.sdX);
}
function calculate(kind,x,summary){
 if(!['P','Q','R','t'].includes(kind))throw Error('Argument ERROR');
 const value=kind==='t'?normalized(x,summary):
  kind==='P'?lowerTail(x):probabilities(x)[kind];
 return finite(value);
}
const API=Object.freeze({area,lowerTail,probabilities,normalized,calculate});
global.FreshStatNormal=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
