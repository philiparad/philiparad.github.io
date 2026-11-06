/* Milestone 54: reference-photo-informed physical-key arrangement.
 * Glyphs/legends are independently authored; no Casio artwork or firmware.
 * Unsupported keys are visibly disabled until the command is implemented.
 * This is a layout target, not certification of physical keypad parity.
 */
(function(global){'use strict';
const button=(key,legend='',tone='dark',enabled=true)=>Object.freeze({key,legend,tone,enabled});
const top=Object.freeze([
 button('SHIFT','','gold'),button('ALPHA','','gold'),button('LEFT'),button('UP'),
 button('DOWN'),button('RIGHT'),button('MODE','SETUP'),button('ON','','orange')
]);
const scientific=Object.freeze([
 button('CALC','SOLVE','dark'),button('DIFF','∫','dark',false),
 button(null),button('RECIP','x!'),button('LOGBASE','Σ','dark',false),button(null),
 button('FRAC','a b/c'),button('SQRT','³√'),button('SQ','x³'),button('POW','ⁿ√'),button('LOG','10ˣ'),button('LN','eˣ'),
 button('NEG'),button('DMS'),button('HYP'),button('SIN','sin⁻¹'),button('COS','cos⁻¹'),button('TAN','tan⁻¹'),
 button('RCL','STO'),button('ENG','','dark',false),button('LP'),button('RP'),button('S-D'),button('MPLUS','','dark',false)
]);
const numeric=Object.freeze([
 button('7','CONST','number'),button('8','CONV','number'),button('9','CLR','number'),button('DEL','INS','green'),button('AC','OFF','green'),
 button('4','MATRIX','number'),button('5','VECTOR','number'),button('6','','number'),button('MUL','','number'),button('DIV','','number'),
 button('1','STAT','number'),button('2','CMPLX','number'),button('3','BASE','number'),button('ADD','','number'),button('SUB','','number'),
 button('0','Rnd','number'),button('.','Ran#','number'),button('EXP10','π','number'),button('ANS','DRG▶','number'),button('=','','number')
]);
const groups=Object.freeze({top,scientific,numeric});
for(const group of Object.values(groups))Object.freeze(group);
global.FX991_KEYPAD_LAYOUT=groups;
})(typeof window!=='undefined'?window:globalThis);
