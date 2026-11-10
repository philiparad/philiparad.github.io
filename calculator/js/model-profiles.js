/* REA-007: explicit CASIO model profiles grounded in model-specific manuals.
 * This is a capability/menu inventory, not a statement of numeric emulator parity.
 * Native DLL emulator version and scan codes are not verified.
 */
(function(global){'use strict';
const common=Object.freeze(['COMP','CMPLX','STAT','BASE-N','EQN','MATRIX','TABLE','VECTOR']);
const extended=Object.freeze([...common,'INEQ','VERIF','DIST']);
// REA-069: six ordinary registers plus independent M on the original fx-991ES.
const REGISTERS=Object.freeze({
 'fx-991es':Object.freeze(['A','B','C','D','X','Y','M']),
 'fx-991es-plus':Object.freeze(['A','B','C','D','E','F','X','Y','M']),
 'fx-991es-plus-c':Object.freeze(['A','B','C','D','E','F','X','Y','M'])
});
function registers(model){return REGISTERS[model]||REGISTERS['fx-991es-plus-c']}
function hasRegister(model,name){return registers(model).includes(name)}

const profiles=Object.freeze({
 'fx-991es':Object.freeze({id:'fx-991es',label:'fx-991ES',edition:'original',
   modes:common,manual:'https://support.casio.com/pdf/004/fx-115ES_991ES_Eng.pdf',
   hardwareVerified:false}),
 'fx-991es-plus':Object.freeze({id:'fx-991es-plus',label:'fx-991ES PLUS (2nd edition)',
   edition:'2nd edition',modes:common,
   manual:'https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/calculation_calculator/calculation_modes.html',
   hardwareVerified:false}),
 'fx-991es-plus-c':Object.freeze({id:'fx-991es-plus-c',label:'fx-991ES PLUS C (2nd edition)',
   edition:'2nd edition C',modes:extended,
   manual:'https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/calculation_calculator/calculation_modes.html',
   hardwareVerified:false})
});
function get(id){return profiles[id]||profiles['fx-991es-plus-c']}
function supports(id,mode){return get(id).modes.includes(mode)}
const api=Object.freeze({profiles,defaultModel:'fx-991es-plus-c',get,supports,registers,hasRegister});
global.FreshModels=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
