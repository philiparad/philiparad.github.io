/* Browser-only BigInt decimal formatting/compatibility primitives.
 * Independent educational implementation; no claims of identical firmware rounding.
 * Exact rational input; 15 significant-digit quantization on approximate values.
 */
(function(global){'use strict';
const TEN=10n,POW=[1n];
function pow10(n){if(!Number.isInteger(n)||n<0||n>10000)throw Error('Decimal exponent out of range');while(POW.length<=n)POW.push(POW[POW.length-1]*TEN);return POW[n]}
function digits(n){return (n<0n?-n:n).toString().length}
function quotientRounded(n,d){if(d<=0n)throw Error('Invalid denominator');let negative=n<0n;if(negative)n=-n;let q=n/d,r=n%d;if(2n*r>=d)q++;return negative?-q:q} // nearest, ties away from zero
function order10(n,d){if(n===0n)return 0;if(n<0n)n=-n;let e=digits(n)-digits(d);if(e>=0){if(n<d*pow10(e))e--}else if(n*pow10(-e)<d)e--;return e}
function significant(n,d,precision=10){if(d<=0n)throw Error('Invalid denominator');if(n===0n)return {coefficient:0n,exponent:0,precision};let e=order10(n,d),shift=precision-1-e;let c=shift>=0?quotientRounded(n*pow10(shift),d):quotientRounded(n,d*pow10(-shift));if(digits(c)>precision){c/=10n;e++}return {coefficient:c,exponent:e,precision}}
function fixed(n,d,places=3){if(!Number.isInteger(places)||places<0||places>9)throw Error('Invalid Fix places');let scaled=quotientRounded(n*pow10(places),d),sign=scaled<0n?'-':'',raw=(scaled<0n?-scaled:scaled).toString().padStart(places+1,'0');return sign+(places?raw.slice(0,-places)+'.'+raw.slice(-places):raw)}
function scientific(n,d,precision=10,compact=false){let s=significant(n,d,precision),c=s.coefficient;let sign=c<0n?'-':'',raw=(c<0n?-c:c).toString().padStart(precision,'0');let mantissa=raw[0]+(precision>1?'.'+raw.slice(1):'');if(compact)mantissa=mantissa.replace(/\.?0+$/,'');return sign+mantissa+'e'+(s.exponent>=0?'+':'')+s.exponent}
function plain(n,d,precision=10){let s=significant(n,d,precision);if(s.coefficient===0n)return '0';let neg=s.coefficient<0n?'-':'',c=(s.coefficient<0n?-s.coefficient:s.coefficient).toString().padStart(precision,'0');let decimalPosition=s.exponent+1;let out;if(decimalPosition<=0)out='0.'+'0'.repeat(-decimalPosition)+c;else if(decimalPosition>=c.length)out=c+'0'.repeat(decimalPosition-c.length);else out=c.slice(0,decimalPosition)+'.'+c.slice(decimalPosition);return neg+out.replace(/(\.\d*?)0+$/,'$1').replace(/\.$/,'')}
function format(n,d,setup={}){let mode=setup.format||'Norm2',precision=10;if(mode==='Fix')return fixed(n,d,setup.digits??3);if(mode==='Sci')return scientific(n,d,Math.max(1,Math.min(10,setup.digits??3)),false);if(mode!=='Norm1'&&mode!=='Norm2')throw Error('Invalid format');if(n===0n)return '0';let exp=order10(n,d),cutoff=mode==='Norm1'?-2:-9;if(exp<cutoff||exp>=10)return scientific(n,d,precision,true);return plain(n,d,precision)}
// Interpret a decimal string without passing its digits through binary64.
function parseDecimal(s){s=String(s).trim();let m=s.match(/^([+-]?)(\d*\.?\d+)(?:[eE]([+-]?\d+))?$/);if(!m)throw Error('Invalid decimal');let parts=m[2].split('.'),fractionLength=(parts[1]||'').length,n=BigInt((parts[0]||'0')+(parts[1]||''))*(m[1]==='-'?-1n:1n),exponent=Number(m[3]||0)-fractionLength;if(Math.abs(exponent)>10000)throw Error('Exponent too large');return exponent>=0?{n:n*pow10(exponent),d:1n}:{n,d:pow10(-exponent)}}
function quantize(n,d,p=15){let s=significant(n,d,p);if(s.coefficient===0n)return {n:0n,d:1n};let e=s.exponent-(p-1);return e>=0?{n:s.coefficient*pow10(e),d:1n}:{n:s.coefficient,d:pow10(-e)}}
const api=Object.freeze({format,fixed,scientific,plain,significant,parseDecimal,quantize,order10,pow10});global.FX991_DECIMAL=api;
})(typeof window!=='undefined'?window:globalThis);
