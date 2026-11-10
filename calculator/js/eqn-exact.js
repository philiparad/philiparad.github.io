/* REA-052 — conservative symbolic EQN root formatting for MathIO. */
(function(g){'use strict';
function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){[a,b]=[b,a%b]}return a||1}
function fraction(n,d){if(d===0)return null;if(d<0){n=-n;d=-d}const h=gcd(n,d);n/=h;d/=h;return d===1?String(n):n+'/'+d}
function rational(x){
 if(!Number.isFinite(x))return null;
 for(let d=1;d<=1000;d++){const n=Math.round(x*d);
  if(Number.isSafeInteger(n)&&Math.abs(n/d-x)<1e-12*Math.max(1,Math.abs(x)))return fraction(n,d)}
 return null;
}
function integerCoefficients(coeff){
 if(coeff.some(n=>!Number.isFinite(n)||Math.abs(n)>1e6))return null;
 for(let scale=1;scale<=1e6;scale*=10){
  const ints=coeff.map(n=>Math.round(n*scale));
  if(ints.every((n,i)=>Number.isSafeInteger(n)&&Math.abs(n/scale-coeff[i])<1e-12)){
   const h=ints.reduce((a,b)=>gcd(a,b),0);return ints.map(n=>n/h)}
 }
 return null;
}
function rootTerm(k,s,d){
 const h=gcd(k,d);k/=h;d/=h;
 if(s===1)return fraction(k,d);
 const term=(k===1?'':k)+'√'+s;
 return d===1?term:term+'/'+d;
}
function quadratic(coeff,solutions){
 const values=integerCoefficients(coeff);if(!values)return;
 const [a,b,c]=values,D=b*b-4*a*c;
 if(!Number.isSafeInteger(D)||Math.abs(D)>1e8||D===0)return;
 let k=1,m=Math.abs(D);
 for(let p=2;p*p<=m;p++)while(m%(p*p)===0){k*=p;m/=p*p}
 if(m===1&&D>0)return; // All roots already reduced to exact rationals.
 const base=fraction(-b,2*a),term=rootTerm(k,m,2*Math.abs(a)),center=-b/(2*a);
 for(const root of solutions){
  if(D<0&&root.complex){
   const imag=term==='1'?'i':term+'i';
   root.exact=(base==='0'?'':base)+(root.complex.im<0?'-':'+')+imag;
  }else if(D>0&&!root.complex){
   root.exact=(base==='0'?'':base)+(root.value<center?'-':'+')+term;
  }
  if(root.exact?.startsWith('+'))root.exact=root.exact.slice(1);
 }
}
function decorate(result,coeff=[]){
 for(const root of result.solutions)if(typeof root.value==='number'){
  const exact=rational(root.value);if(exact)root.exact=exact;
 }
 if(result.type==='QUAD')quadratic(coeff,result.solutions);
 return result;
}
function display(root,math=true){
 if(math&&root.exact)return root.exact;
 const fmt=g.FreshEquation.format;
 if(root.complex)return fmt(root.complex.re)+(root.complex.im<0?'-':'+')+fmt(Math.abs(root.complex.im))+'i';
 return fmt(root.value);
}
g.FreshEquationExact=Object.freeze({gcd,fraction,rational,integerCoefficients,quadratic,decorate,display});
if(typeof module!=='undefined'&&module.exports)module.exports=g.FreshEquationExact;
})(typeof window!=='undefined'?window:globalThis);
