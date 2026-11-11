/* REA-083: input, normalization, arithmetic and display of degree/minute/
 * second values. Independent educational approximation, not CASIO firmware.
 */
(function(global){'use strict';
const MAX_DEGREES=9999999;
const MAX_SECONDS=MAX_DEGREES*3600+59*60+59;
const NUMBER='(?:\\d+(?:\\.\\d*)?|\\.\\d+)';
const DMS_FULL=new RegExp('('+NUMBER+')°('+NUMBER+')′('+NUMBER+')″','g');
function parseComponents(degrees,minutes,seconds){
 const d=Number(degrees),m=Number(minutes),s=Number(seconds);
 if(![d,m,s].every(Number.isFinite)||d<0||m<0||s<0||
    !Number.isInteger(d)||!Number.isInteger(m)||m>=60||s>=60)
  throw new RangeError('Argument ERROR');
 // The physical CASIO conversion range ends at 9999999°59′59″.
 if(d>MAX_DEGREES||d*3600+m*60+s>MAX_SECONDS)
  throw new RangeError('Argument ERROR');
 return d+m/60+s/3600;
}
function normalize(expression){
 const original=String(expression);
 // Match complete, contiguous DMS tokens. Negative values are expressed
 // by the surrounding unary minus: -2°30′0″ means -2.5 degrees.
 const source=original.replace(DMS_FULL,(_,d,m,s,offset)=>{
  // Do not replace an interior substring of a name or longer numeric token.
  const before=original[offset-1]||'';
  if(/[A-Za-z_0-9.]/.test(before))throw new SyntaxError('Syntax ERROR');
  const value=parseComponents(d,m,s);
  return '('+Number(value.toPrecision(15)).toString()+')';
 });
 if(/[′″]/.test(source))throw new SyntaxError('Syntax ERROR');
 // A standalone degree postfix belongs to DRG▶, but an incomplete DMS
 // group such as 2°30 or 2°30′ must not silently multiply by 30.
 if(/°\s*(?:\d|\.)/.test(source))throw new SyntaxError('Syntax ERROR');
 return source;
}
function hasDMS(source){
 DMS_FULL.lastIndex=0;
 return DMS_FULL.test(String(source));
}
function format(value){
 if(!Number.isFinite(value)||Math.abs(value)>MAX_SECONDS/3600)return null;
 const negative=value<0;
 let magnitude=Math.abs(value);
 let degrees=Math.floor(magnitude);
 let minutesDecimal=(magnitude-degrees)*60;
 let minutes=Math.floor(minutesDecimal);
 let seconds=(minutesDecimal-minutes)*60;
 // Keep six seconds decimals for moderate values; avoid the >2^53
 // integer-microsecond overflow of the older implementation.
 seconds=Math.round(seconds*1e6)/1e6;
 if(seconds>=60){seconds=0;minutes++}
 if(minutes>=60){minutes=0;degrees++}
 if(degrees>MAX_DEGREES)return null;
 let sec=Number(seconds.toFixed(6)).toString();
 if(seconds===0)sec='0';
 return (negative?'-':'')+degrees+'°'+minutes+'′'+sec+'″';
}
function nextSeparator(input){
 const source=String(input).trim();
 // A DMS field always ends in the actual number entered immediately before
 // pressing the physical °′″ key. No missing minutes may be auto-filled.
 const end=/(?:\d+(?:\.\d*)?|\.\d+)$/.exec(source);
 if(!end)return null;
 const prefix=source.slice(0,end.index);
 // Work only within the currently edited arithmetic operand.
 const boundary=Math.max(prefix.lastIndexOf('+'),prefix.lastIndexOf('-'),
  prefix.lastIndexOf('*'),prefix.lastIndexOf('/'),prefix.lastIndexOf('('),
  prefix.lastIndexOf(','),prefix.lastIndexOf(':'));
 const term=source.slice(boundary+1);
 if(/″/.test(term))return null;
 if(/′/.test(term))return '″';
 if(/°/.test(term))return '′';
 return '°';
}
const api=Object.freeze({parseComponents,normalize,hasDMS,format,nextSeparator,MAX_DEGREES});
global.FreshSexagesimal=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
