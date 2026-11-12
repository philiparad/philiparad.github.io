/* Single-device capability definition: CASIO fx-991ES PLUS (2nd edition).
 * Hardware parity remains subject to physical-key and LCD verification.
 */
(function(global){'use strict';
const MODEL='fx-991es-plus';
const MODES=Object.freeze(['COMP','CMPLX','STAT','BASE-N','EQN','MATRIX','TABLE','VECTOR']);
const REGISTERS=Object.freeze(['A','B','C','D','E','F','X','Y','M']);
const FEATURES=Object.freeze({[MODEL]:Object.freeze(['ran','ranint','basic-stat'])});
const profiles=Object.freeze({
 [MODEL]:Object.freeze({id:MODEL,label:'fx-991ES PLUS (2nd edition)',edition:'2nd edition',
  modes:MODES,manual:'https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/',hardwareVerified:false})
});
function get(){return profiles[MODEL]}
function supports(_id,mode){return MODES.includes(mode)}
function registers(){return REGISTERS}
function hasRegister(_id,name){return REGISTERS.includes(name)}
function hasFeature(_id,feature){return FEATURES[MODEL].includes(feature)}
const api=Object.freeze({MODEL,profiles,defaultModel:MODEL,get,supports,registers,hasRegister,FEATURES,hasFeature});
global.FreshModels=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
