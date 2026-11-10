/* REA-011: result representations on an independent educational calculator.
 * Only demonstrably simple symbolic classes are converted; unknown numbers
 * remain decimals instead of guessing a fraction/pi/root identity.
 */
(function(global){'use strict';
const DEFAULTS={math:true,format:'Norm2',digits:3,fractionStyle:'improper',decimalSeparator:'dot'};
const gcd=(a,b)=>{a=Math.abs(a);b=Math.abs(b);while(b){const r=a%b;a=b;b=r}return a||1};
function reduced(n,d){
 if(!Number.isSafeInteger(n)||!Number.isSafeInteger(d)||d===0)return null;
 if(d<0){n=-n;d=-d}
 const g=gcd(n,d);return {numerator:n/g,denominator:d/g};
}
function rational(value,maxD=10000){
 if(!Number.isFinite(value)||Math.abs(value)>1e10)return null;
 // Approximation only; do not infer irrational symbolic forms from decimals.
 for(let d=1;d<=maxD;d++){
  const n=Math.round(value*d);
  if(Number.isSafeInteger(n)&&Math.abs(n/d-value)<1e-12*Math.max(1,Math.abs(value))){
   return reduced(n,d);
  }
 }
 return null;
}
function parseSimpleFraction(source){
 const text=String(source).replace(/\s+/g,'');
 const m=/^\(?\(?(-?\d+)\)?\/\(?(-?\d+)\)?\)?$/.exec(text);
 if(!m)return null;
 return reduced(Number(m[1]),Number(m[2]));
}
function symbolic(value,source){
 if(!Number.isFinite(value))return null;
 const compact=String(source||'').replace(/\s+/g,'').replace(/π/g,'pi');
 // Only known symbolic source expressions can create a symbolic result.
 if(compact==='pi'&&Math.abs(value-Math.PI)<1e-10)return {kind:'pi',coefficient:reduced(1,1),text:'π'};
 let m=/^(?:\(?([-+]?\d+)\)?\*?)?pi(?:\/\(?([-+]?\d+)\)?)?$/.exec(compact);
 if(m){
  const q=reduced(Number(m[1]||1),Number(m[2]||1));
  if(q&&Math.abs(q.numerator/q.denominator*Math.PI-value)<1e-10){
   const a=q.numerator,d=q.denominator;
   return {kind:'pi',coefficient:q,text:(a===1&&d===1?'':d===1?String(a):a+'/'+d)+'π'};
  }
 }
 m=/^sqrt\(?(\d+)\)?$/.exec(compact);
 if(m){
  let n=Number(m[1]);
  if(Number.isSafeInteger(n)&&n>=0&&Math.abs(Math.sqrt(n)-value)<1e-12){
   let k=1,r=n;
   for(let i=2;i*i<=r;i++)while(r%(i*i)===0){r/=i*i;k*=i}
   if(r>1)return {kind:'surd',coefficient:k,radicand:r,text:(k===1?'':k)+'√'+r};
  }
 }
 return null;
}
function sci(value,digits){
 return global.FreshNumberFormat.sci(value,digits===0?10:digits);
}
function decimal(value,settings={}){
 const cfg={...DEFAULTS,...settings};
 return global.FreshNumberFormat.format(value,cfg);
}
function fractionText(q,style='improper'){
 const n=q.numerator,d=q.denominator;
 if(d===1)return String(n);
 if(style==='mixed'&&Math.abs(n)>d){
  const integer=Math.trunc(n/d),remainder=Math.abs(n)%d;
  // Count integer, numerator, denominator and two separator positions.
  if(remainder){
   const text=integer+' '+remainder+'/'+d;
   return text.length<=10?text:null;
  }
 }
 return n+'/'+d;
}
function fractionParts(q,style){
 const n=q.numerator,d=q.denominator;
 if(d===1)return {kind:'decimal',text:String(n)};
 const text=fractionText(q,style);
 if(text===null)return null;
 if(text.includes(' ')){
  const [integer,ratio]=text.split(' ');
  const [numerator,denominator]=ratio.split('/');
  return {kind:'mixed',text,integer,numerator,denominator};
 }
 return {kind:'fraction',text,numerator:String(n),denominator:String(d)};
}
function exactFractionParts(q,style){
 const n=BigInt(q.numerator),d=BigInt(q.denominator);
 if(d<=0n)return null;
 if(d===1n)return {kind:'decimal',text:n.toString()};
 if(style==='mixed'&& (n<0n?-n:n)>d){
  const whole=n/d,remainder=(n<0n?-n:n)%d;
  if(remainder){
   const text=whole.toString()+' '+remainder.toString()+'/'+d.toString();
   if(text.length<=10)return {kind:'mixed',text,integer:whole.toString(),numerator:remainder.toString(),denominator:d.toString()};
   return null; // Mixed form too wide; no silent improper substitution.
  }
 }
 const text=n.toString()+'/'+d.toString();
 return {kind:'fraction',text,numerator:n.toString(),denominator:d.toString()};
}
function calculate(value,source,settings={},options={}){
 const cfg={...DEFAULTS,...settings},digits=cfg.digits;
 const decimalText=decimal(value,cfg);
 const preferred=(!!cfg.math&&cfg.outputMath!==false&&['Norm1','Norm2'].includes(cfg.format))||options.forceFraction===true;
 const exact=options.exactRational||parseSimpleFraction(source);
 const exactFromEngine=options.exactRational&&/^[-]?\d+$/.test(String(exact.numerator))&&/^\d+$/.test(String(exact.denominator));
 const fraction=exactFromEngine?exact:
  exact&&Math.abs(exact.numerator/exact.denominator-value)<=1e-12*Math.max(1,Math.abs(value))?
  exact:options.allowApproxRational?rational(value):null;
 // REA-074: derive exact radical/pi combinations from a bounded source
 // expression tree, never from an approximate decimal identity.
 // Force-fraction is used for S⇔D in LineIO. It must not also enable
 // a radical/pi identity: those forms require a genuine MathO source result.
 const symbolicCandidate=preferred&&!!cfg.math&&cfg.outputMath!==false&&
  ['Norm1','Norm2'].includes(cfg.format)?
  (global.FreshExactSymbolic?.symbolic(source,value)||symbolic(value,source)):null;
 let natural={kind:'decimal',text:decimalText};
 if(preferred&&symbolicCandidate)natural=symbolicCandidate;
 else if(preferred&&fraction){
  // A large exact integer should keep its standard scientific LCD presentation.
  // Exact numerator/denominator metadata is still retained for Ans chaining.
  const hugeInteger=exactFromEngine&&BigInt(fraction.denominator)===1n&&
   String(fraction.numerator).replace('-','').length>10;
  if(!hugeInteger){
   const candidate=exactFromEngine?
    exactFractionParts(fraction,cfg.fractionStyle):fractionParts(fraction,cfg.fractionStyle);
   if(candidate)natural=candidate;
  }
 }
 const chosen=options.decimal?{kind:'decimal',text:decimalText}:natural;
 return {natural,decimal:{kind:'decimal',text:decimalText},chosen,hasAlternate:chosen.kind!=='decimal',
  fraction,exactRational:!!fraction&&!!exact,symbolic:symbolicCandidate};
}
function engineeringPlain(value){
 const rounded=Number(value.toPrecision(10));
 if(rounded===0)return '0';
 const sign=rounded<0?'-':'';
 const [mantissa,eText]=Math.abs(rounded).toExponential(9).split('e');
 const figures=mantissa.replace('.','').replace(/0+$/,'');
 const position=Number(eText)+1;
 if(position<=0)return sign+'0.'+'0'.repeat(-position)+figures;
 if(position>=figures.length)return sign+figures+'0'.repeat(position-figures.length);
 return sign+figures.slice(0,position)+'.'+figures.slice(position);
}
function engineering(value,shift=0,settings={}){
 if(!Number.isFinite(value)||!Number.isInteger(shift))return null;
 const magnitude=Math.abs(value);
 const base=value===0?0:Math.floor(Math.floor(Math.log10(magnitude))/3)*3;
 const exponent=base+3*shift;
 if(exponent>99||exponent< -99)return null;
 const mantissa=value===0?0:value/10**exponent;
 if(!Number.isFinite(mantissa))return null;
 const number=engineeringPlain(mantissa);
 const text=(settings.decimalSeparator==='comma'?number.replace('.',','):number)+'×10^'+exponent;
 return {kind:'engineering',text,mantissa,exponent,shift};
}
const api=Object.freeze({calculate,decimal,sci,rational,reduced,parseSimpleFraction,
 fractionText,fractionParts,symbolic,engineering});
global.FreshResults=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
