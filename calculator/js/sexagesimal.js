/* REA-028: decimal-degree / degrees-minutes-seconds conversion.
 * Independent educational implementation, not manufacturer firmware.
 */
(function(global){'use strict';
const DMS_FULL=/(\d+(?:\.\d+)?|\.\d+)°(\d+(?:\.\d+)?|\.\d+)′(\d+(?:\.\d+)?|\.\d+)″/g;
function parseComponents(degrees,minutes,seconds){
 const d=Number(degrees),m=Number(minutes),s=Number(seconds);
 if(![d,m,s].every(Number.isFinite)||d<0||m<0||s<0||m>=60||s>=60)
  throw new RangeError('Argument ERROR');
 return d+m/60+s/3600;
}
function normalize(expression){
 const original=String(expression);
 const source=original.replace(DMS_FULL,(_,d,m,s)=>{
  const value=parseComponents(d,m,s);
  return '('+Number(value.toPrecision(15)).toString()+')';
 });
 // Isolated degree postfix (for example sin(30°)) belongs to the existing
 // angle-unit evaluator. However, unfinished DMS sequences must not fall
 // through into an unrelated postfix calculation.
 if(/[′″]/.test(source))throw new SyntaxError('Syntax ERROR');
 if(/°(?:\d|\.)/.test(source))throw new SyntaxError('Syntax ERROR');
 return source;
}
function hasDMS(source){DMS_FULL.lastIndex=0;return DMS_FULL.test(String(source))}
function format(value){
 if(!Number.isFinite(value))return null;
 const sign=value<0?'-':'';
 // Round at the final display precision before carrying seconds/minutes.
 const units=Math.round(Math.abs(value)*3600*1e6);
 if(!Number.isSafeInteger(units))return null;
 const degrees=Math.floor(units/(3600*1e6));
 const rem=units-degrees*3600*1e6;
 const minutes=Math.floor(rem/(60*1e6));
 const micros=rem-minutes*60*1e6;
 let seconds=micros/1e6;
 if(Math.abs(seconds-Math.round(seconds))<1e-9)seconds=Math.round(seconds);
 const sec=Number(seconds.toFixed(6)).toString();
 return sign+degrees+'°'+minutes+'′'+sec+'″';
}
function nextSeparator(input){
 const source=String(input);
 const term=source.slice(Math.max(source.lastIndexOf('+'),source.lastIndexOf('-'),source.lastIndexOf('*'),source.lastIndexOf('/'),source.lastIndexOf('('))+1);
 if(!/\d(?:\.\d*)?$/.test(term))return null;
 if(term.includes('″'))return null;
 if(term.includes('′'))return '″';
 if(term.includes('°'))return '′';
 return '°';
}
const api=Object.freeze({parseComponents,normalize,hasDMS,format,nextSeparator});
global.FreshSexagesimal=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
