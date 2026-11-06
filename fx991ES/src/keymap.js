/* Milestone 25: independently-authored model/mode key resolution.
 * Unverified physical legends remain implementation policies.
 */
(function(global){'use strict';
const alpha=Object.freeze({EXP10:'EULER',NEG:'A',DMS:'B',HYP:'C',SIN:'D',COS:'E',TAN:'F',LP:'X',RP:'Y',MPLUS:'M'});
const shift=Object.freeze({0:'RND',EXP10:'PI',HYP:'ABS',RECIP:'FACTORIAL',MUL:'NPR',DIV:'NCR',DEL:'INS',MODE:'SETUP',SQRT:'NROOT',FRAC:'MIX',SIN:'ASIN',COS:'ACOS',TAN:'ATAN',SQ:'CUBE',LOG:'POW10',LN:'EXP',AC:'OFF'});
const baseDigits=Object.freeze({NEG:'A',DMS:'B',HYP:'C',SIN:'D',COS:'E',TAN:'F'});
const radixSelectors=Object.freeze({SQ:'DEC',RECIP:'HEX',LOG:'BIN',LN:'OCT'});
const profiles=Object.freeze({standard:Object.freeze({id:'fx991esplus-2',alpha,shift,baseDigits,radixSelectors}),c:Object.freeze({id:'fx991esplus-c-2',alpha,shift,baseDigits,radixSelectors})});
function resolve(model,key,modifier,mode='COMP'){
 const d=profiles[model]||profiles.standard;
 if(mode==='BASE-N'&&modifier!=='shift'&&modifier!=='alpha'&&d.baseDigits[key])return d.baseDigits[key];
 if(mode==='BASE-N'&&modifier==='none'&&d.radixSelectors[key])return d.radixSelectors[key];
 if(modifier==='alpha')return d.alpha[key]||null;
 if(modifier==='shift')return d.shift[key]||null;
 return key;
}
function keyLegend(model,key,mode='COMP'){let d=profiles[model]||profiles.standard;return Object.freeze({normal:resolve(model,key,'none',mode),shift:d.shift[key]||null,alpha:d.alpha[key]||null,baseDigit:mode==='BASE-N'?d.baseDigits[key]||null:null})}
global.FX991_KEYS=Object.freeze({profiles,resolve,keyLegend});
})(typeof window!=='undefined'?window:globalThis);
