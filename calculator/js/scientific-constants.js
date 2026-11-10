/* REA-063 — 40 scientific constant codes, model-specific historical CODATA values.
 * Catalog/code ordering: Casio fx-991ES and fx-991ES PLUS/PLUS C manuals.
 * Values: archived NIST CODATA 2002 (original ES) and 2014 (PLUS family).
 * NIST: https://physics.nist.gov/cuu/Constants/archive2002.html
 *       https://physics.nist.gov/cuu/Constants/archive2014.html
 * The original ES manual does not explicitly specify its CODATA edition;
 * 2002 is used as a period-appropriate historical profile, not a device-ROM claim.
 */
(function(global){'use strict';
const MODELS=Object.freeze({
 'fx-991es':2002,'fx-991es-plus':2014,'fx-991es-plus-c':2014
});
const DATA=[["mp","proton mass","kg",1.672621898e-27,1.67262171e-27],["mn","neutron mass","kg",1.674927471e-27,1.67492728e-27],["me","electron mass","kg",9.10938356e-31,9.1093826e-31],["mμ","muon mass","kg",1.883531594e-28,1.8835314e-28],["a₀","Bohr radius","m",5.2917721067e-11,5.291772108e-11],["h","Planck constant","J s",6.62607004e-34,6.6260693e-34],["μN","nuclear magneton","J/T",5.050783699e-27,5.05078343e-27],["μB","Bohr magneton","J/T",9.274009994e-24,9.27400949e-24],["ħ","reduced Planck constant","J s",1.0545718e-34,1.05457168e-34],["α","fine-structure constant","",0.0072973525664,0.007297352568],["re","classical electron radius","m",2.8179403227e-15,2.817940325e-15],["λc","Compton wavelength","m",2.4263102367e-12,2.426310238e-12],["γp","proton gyromagnetic ratio","s^-1 T^-1",267522190,267522205],["λcp","proton Compton wavelength","m",1.32140985396e-15,1.3214098555e-15],["λcn","neutron Compton wavelength","m",1.31959090481e-15,1.3195909067e-15],["R∞","Rydberg constant","m^-1",10973731.568508,10973731.568525],["u","atomic mass constant","kg",1.66053904e-27,1.66053886e-27],["μp","proton magnetic moment","J/T",1.4106067873e-26,1.41060671e-26],["μe","electron magnetic moment","J/T",-9.28476462e-24,-9.28476411e-24],["μn","neutron magnetic moment","J/T",-9.662365e-27,-9.6623645e-27],["μμ","muon magnetic moment","J/T",-4.49044826e-26,-4.49044799e-26],["F","Faraday constant","C/mol",96485.33289,96485.3383],["e","elementary charge","C",1.6021766208e-19,1.60217653e-19],["NA","Avogadro constant","mol^-1",6.022140857e+23,6.0221415e+23],["k","Boltzmann constant","J/K",1.38064852e-23,1.3806504e-23],["Vm","molar volume of ideal gas (273.15 K, 100 kPa)","m^3/mol",0.022710947,0.022710981],["R","molar gas constant","J/(mol K)",8.3144598,8.314472],["c₀","speed of light in vacuum","m/s",299792458,299792458],["c₁","first radiation constant","W m^2",3.74177179e-16,3.74177138e-16],["c₂","second radiation constant","m K",0.0143877736,0.014387752],["σ","Stefan-Boltzmann constant","W/(m^2 K^4)",5.670367e-8,5.6704e-8],["ε₀","electric constant","F/m",8.854187817e-12,8.854187817e-12],["μ₀","magnetic constant","N/A^2",0.0000012566370614359173,0.0000012566370614359173],["Φ₀","magnetic flux quantum","Wb",2.067833831e-15,2.06783372e-15],["g","standard acceleration of gravity","m/s^2",9.80665,9.80665],["G₀","conductance quantum","S",0.00007748091731,0.00007748091733],["Z₀","characteristic impedance of vacuum","ohm",376.730313461,376.730313461],["t","Celsius temperature offset","K",273.15,273.15],["G","Newtonian constant of gravitation","m^3/(kg s^2)",6.67408e-11,6.6742e-11],["atm","standard atmosphere","Pa",101325,101325]];
const ITEMS=Object.freeze(DATA.map(([symbol,name,unit,value2014,value2002],index)=>
 Object.freeze({code:String(index+1).padStart(2,'0'),symbol,name,unit,
  values:Object.freeze({2014:value2014,2002:value2002})})));
const fault=(message='Argument ERROR')=>{throw Error(message)};
function select(model,code){
 const version=MODELS[model];if(!version)fault();
 const number=String(code).padStart(2,'0');
 const entry=ITEMS.find(x=>x.code===number);if(!entry)fault('Argument ERROR');
 return Object.freeze({...entry,value:entry.values[version],year:version});
}
function literal(entry){
 if(!entry||!Number.isFinite(entry.value))fault();
 // Keep inserted constants as ordinary expression operands; no new
 // undocumented parser functions, no scientific notation ambiguity.
 const n=entry.value;
 if(n===0)return '(0)';
 const str=n.toExponential(15);
 const [mantissa,exp]=str.split('e');
 return '('+Number(mantissa)+'*10^('+Number(exp)+'))';
}
function codeEditor(){return {buffer:'',error:''}}
function type(editor,key,model){
 if(!/^[0-9]$/.test(String(key)))fault();
 if(editor.buffer.length>=2)fault('Syntax ERROR');
 editor.buffer+=key;editor.error='';
 if(editor.buffer.length!==2)return null;
 const selected=select(model,editor.buffer);
 return selected;
}
function backspace(editor){editor.buffer=editor.buffer.slice(0,-1);editor.error='';return editor}
global.FreshScientificConstants=Object.freeze({ITEMS,MODELS,select,literal,codeEditor,type,backspace});
if(typeof module!=='undefined'&&module.exports)module.exports=global.FreshScientificConstants;
})(typeof window!=='undefined'?window:globalThis);
