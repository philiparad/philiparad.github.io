/* REA-030: bounded factorization of positive ten-digit calculation results. */
(function(global){'use strict';
const MAX=9999999999;
function formatGroups(factors,residual){
 const parts=factors.map(([p,k])=>String(p)+(k>1?(k===2?'²':k===3?'³':'^'+k):''));
 if(residual>1)parts.push('('+residual+')');
 return parts.join('×')||'1';
}
function factorize(value,context={}){
 if(context.mode&&context.mode!=='COMP')throw new RangeError('Math ERROR');
 if(context.remainder||context.disallowed)throw new RangeError('Math ERROR');
 if(!Number.isSafeInteger(value)||value<1||value>MAX)throw new RangeError('Math ERROR');
 let rest=value;
 const factors=[];
 for(let divisor=2;divisor<=997&&divisor*divisor<=rest;divisor+=divisor===2?1:2){
  let count=0;
  while(rest%divisor===0){rest/=divisor;count++}
  if(count)factors.push([divisor,count]);
 }
 // A leftover prime up to three digits can be shown explicitly.
 // Factors above 997 are held as one parenthesized unfactored component,
 // matching the documented 4104676 = 2² × (1026169) example.
 if(rest<=997&&rest>1){factors.push([rest,1]);rest=1}
 const text=formatGroups(factors,rest);
 return Object.freeze({kind:'factorization',value,factors:factors.map(pair=>Object.freeze(pair)),
  residual:rest>1?rest:null,text});
}
const API=Object.freeze({factorize,formatGroups,MAX});
global.FreshFactorization=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
