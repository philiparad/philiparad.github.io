/* fx-991ES PLUS 2nd edition: 40 scientific-constant input codes.
 * Values require manufacturer-device parity review; source catalog retained.
 */
(function(global){'use strict';
const MODEL='fx-991es-plus';
const MODELS=Object.freeze({[MODEL]:2014});
const ITEMS=Object.freeze([{"symbol":"mp","name":"proton mass","unit":"kg","value":1.672621898e-27},{"symbol":"mn","name":"neutron mass","unit":"kg","value":1.674927471e-27},{"symbol":"me","name":"electron mass","unit":"kg","value":9.10938356e-31},{"symbol":"mμ","name":"muon mass","unit":"kg","value":1.883531594e-28},{"symbol":"a₀","name":"Bohr radius","unit":"m","value":5.2917721067e-11},{"symbol":"h","name":"Planck constant","unit":"J s","value":6.62607004e-34},{"symbol":"μN","name":"nuclear magneton","unit":"J/T","value":5.050783699e-27},{"symbol":"μB","name":"Bohr magneton","unit":"J/T","value":9.274009994e-24},{"symbol":"ħ","name":"reduced Planck constant","unit":"J s","value":1.0545718e-34},{"symbol":"α","name":"fine-structure constant","unit":"","value":0.0072973525664},{"symbol":"re","name":"classical electron radius","unit":"m","value":2.8179403227e-15},{"symbol":"λc","name":"Compton wavelength","unit":"m","value":2.4263102367e-12},{"symbol":"γp","name":"proton gyromagnetic ratio","unit":"s^-1 T^-1","value":267522190},{"symbol":"λcp","name":"proton Compton wavelength","unit":"m","value":1.32140985396e-15},{"symbol":"λcn","name":"neutron Compton wavelength","unit":"m","value":1.31959090481e-15},{"symbol":"R∞","name":"Rydberg constant","unit":"m^-1","value":10973731.568508},{"symbol":"u","name":"atomic mass constant","unit":"kg","value":1.66053904e-27},{"symbol":"μp","name":"proton magnetic moment","unit":"J/T","value":1.4106067873e-26},{"symbol":"μe","name":"electron magnetic moment","unit":"J/T","value":-9.28476462e-24},{"symbol":"μn","name":"neutron magnetic moment","unit":"J/T","value":-9.662365e-27},{"symbol":"μμ","name":"muon magnetic moment","unit":"J/T","value":-4.49044826e-26},{"symbol":"F","name":"Faraday constant","unit":"C/mol","value":96485.33289},{"symbol":"e","name":"elementary charge","unit":"C","value":1.6021766208e-19},{"symbol":"NA","name":"Avogadro constant","unit":"mol^-1","value":6.022140857e+23},{"symbol":"k","name":"Boltzmann constant","unit":"J/K","value":1.38064852e-23},{"symbol":"Vm","name":"molar volume of ideal gas","unit":"m^3/mol","value":0.022710947},{"symbol":"R","name":"molar gas constant","unit":"J/(mol K)","value":8.3144598},{"symbol":"c₀","name":"speed of light in vacuum","unit":"m/s","value":299792458},{"symbol":"c₁","name":"first radiation constant","unit":"W m^2","value":3.74177179e-16},{"symbol":"c₂","name":"second radiation constant","unit":"m K","value":0.0143877736},{"symbol":"σ","name":"Stefan-Boltzmann constant","unit":"W/(m^2 K^4)","value":5.670367e-8},{"symbol":"ε₀","name":"electric constant","unit":"F/m","value":8.854187817e-12},{"symbol":"μ₀","name":"magnetic constant","unit":"N/A^2","value":0.0000012566370614359173},{"symbol":"Φ₀","name":"magnetic flux quantum","unit":"Wb","value":2.067833831e-15},{"symbol":"g","name":"standard acceleration of gravity","unit":"m/s^2","value":9.80665},{"symbol":"G₀","name":"conductance quantum","unit":"S","value":0.00007748091731},{"symbol":"Z₀","name":"characteristic impedance of vacuum","unit":"ohm","value":376.730313461},{"symbol":"t","name":"Celsius temperature offset","unit":"K","value":273.15},{"symbol":"G","name":"Newtonian constant of gravitation","unit":"m^3/(kg s^2)","value":6.67408e-11},{"symbol":"atm","name":"standard atmosphere","unit":"Pa","value":101325}].map((x,i)=>Object.freeze({
 code:String(i+1).padStart(2,'0'),symbol:x.symbol,name:x.name,unit:x.unit,
 values:Object.freeze({2014:x.value})
})));
const fault=(message='Argument ERROR')=>{throw Error(message)};
function select(model,code){
 if(model!==MODEL)fault();
 const number=String(code).padStart(2,'0');
 const entry=ITEMS.find(x=>x.code===number);if(!entry)fault('Argument ERROR');
 return Object.freeze({...entry,value:entry.values[2014],year:2014,printedValue:null});
}
function literal(entry){
 if(!entry||!Number.isFinite(entry.value))fault();
 const n=entry.value;
 if(n===0)return '(0)';
 const [mantissa,exp]=n.toExponential(15).split('e');
 return '('+Number(mantissa)+'*10^('+Number(exp)+'))';
}
function codeEditor(){return {buffer:'',error:''}}
function type(editor,key,model){
 if(!/^[0-9]$/.test(String(key)))fault();
 if(editor.buffer.length>=2)fault('Syntax ERROR');
 editor.buffer+=key;editor.error='';
 if(editor.buffer.length!==2)return null;
 return select(model,editor.buffer);
}
function backspace(editor){editor.buffer=editor.buffer.slice(0,-1);editor.error='';return editor}
global.FreshScientificConstants=Object.freeze({ITEMS,MODELS,select,literal,codeEditor,type,backspace});
if(typeof module!=='undefined'&&module.exports)module.exports=global.FreshScientificConstants;
})(typeof window!=='undefined'?window:globalThis);
