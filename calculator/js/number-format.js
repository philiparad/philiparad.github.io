/* REA-025: CASIO-style display digit formatting, independent of arithmetic. */
(function(global){'use strict';
const MAX_DIGITS=10;
// Decimal-digit rounding uses the same 15 significant decimal digits
// available from the JS numeric core, rather than binary toFixed ties.
function digits15(value){
 const [mantissa,exponent]=Math.abs(value).toExponential(14).split('e');
 return {digits:mantissa.replace('.',''),exponent:Number(exponent)};
}
function roundSignificant(digits,exponent,count){
 let n=BigInt(digits.slice(0,count));
 if(Number(digits[count]||'0')>=5)n++;
 let number=n.toString().padStart(count,'0');
 if(number.length>count){exponent++;number=number.slice(0,count)}
 return {number,exponent};
}
function sci(value,significant=10){
 const n=Math.min(MAX_DIGITS,Math.max(1,Number(significant)||MAX_DIGITS));
 const sign=value<0?'-':'';
 const {digits,exponent}=digits15(value);
 const rounded=roundSignificant(digits,exponent,n);
 // Rounding cannot manufacture a 10^100 exponent beyond the ES LCD range.
 // Preserve the highest-representable ten-digit mantissa at the upper edge.
 if(rounded.exponent>99){
  const max=digits15(Math.abs(value));
  const m=max.digits[0]+'.'+max.digits.slice(1,10);
  return sign+m+'×10^'+max.exponent;
 }
 const mantissa=rounded.number[0]+(n>1?'.'+rounded.number.slice(1):'');
 return sign+mantissa+'×10^'+rounded.exponent;
}
function fix(value,places){
 const negative=value<0;
 const {digits,exponent}=digits15(value);
 const scale=digits.length-1-exponent;
 let n=BigInt(digits),shift=places-scale;
 if(shift>=0)n*=10n**BigInt(shift);
 else{
  const denominator=10n**BigInt(-shift);
  const quotient=n/denominator,remainder=n%denominator;
  n=quotient+(2n*remainder>=denominator?1n:0n);
 }
 const str=n.toString().padStart(places+1,'0');
 return (negative&&n!==0n?'-':'')+(places?str.slice(0,-places)+'.'+str.slice(-places):str);
}
function normal(value,format='Norm2'){
 // Round to 10 display-significant digits while retaining numeric Ans.
 const rounded=Number(value.toPrecision(MAX_DIGITS));
 // A carry into 10^100 is beyond the documented two-digit exponent range.
 if(Math.abs(rounded)>=1e100)return sci(value,MAX_DIGITS);
 if(rounded===0)return '0';
 const abs=Math.abs(rounded);
 const threshold=format==='Norm1'?1e-2:1e-9;
 if(abs<threshold||abs>=1e10){
  const [mantissa,exponent]=rounded.toExponential(9).split('e');
  return mantissa.replace(/\.?0+$/,'')+'×10^'+Number(exponent);
 }
 // Preserve small nonzero values instead of suppressing them with an epsilon.
 // Number.toString() uses a shorter exact-decimal representation.
 const text=rounded.toString();
 if(!text.includes('e'))return text;
 const [digits, exponent]=text.split('e');
 const shift=Number(exponent);
 if(shift>=0&&shift<21)return rounded.toFixed(Math.max(0,MAX_DIGITS-1-shift)).replace(/\.?0+$/,'');
 // For small magnitudes < 1e-6 JavaScript's shortest form is scientific;
 // reconstruct conventional decimal digits from the exponential mantissa.
 const sign=rounded<0?'-':'';
 const parts=Math.abs(rounded).toExponential(9).split('e');
 const e=Number(parts[1]),significand=parts[0].replace('.','').replace(/0+$/,'');
 if(e<0&&e>=-9)return sign+'0.'+'0'.repeat(-e-1)+significand;
 return text.replace('e+','×10^').replace('e','×10^');
}
function format(value,settings={}){
 if(typeof value!=='number'||!Number.isFinite(value))return 'Math ERROR';
 if(Object.is(value,-0)||value===0)return settings.format==='Fix'?'0.'+'0'.repeat(Math.max(0,Math.min(9,Number(settings.digits)||0))):
  settings.format==='Sci'?sci(0,settings.digits===0?10:settings.digits):'0';
 const kind=settings.format||'Norm2';
 const digit=Number.isInteger(settings.digits)?Math.max(0,Math.min(9,settings.digits)):3;
 let text;
 if(kind==='Fix'){
  // A ten-digit LCD mantissa cannot show arbitrarily long fixed output.
  // Switch to scientific notation if the fixed integer part overflows.
  if(Math.abs(value)>=1e21)text=sci(value,10);
  else{
   const fixed=fix(value,digit);
   const integerDigits=fixed.split('.')[0].replace('-','').length;
   // Count digits on both sides of the decimal point. A wide fixed
   // result must fall back to a bounded exponential representation.
   text=integerDigits+digit>10?sci(value,10):fixed;
  }
 }else if(kind==='Sci'){
  text=sci(value,digit===0?10:digit);
 }else text=normal(value,kind);
 if(/^-0(?:\.0+)?$/.test(text))text=text.slice(1);
 return settings.decimalSeparator==='comma'?text.replace('.',','):text;
}
const api=Object.freeze({format,sci,normal});
global.FreshNumberFormat=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
