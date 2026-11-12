'use strict';
/* CASIO ES/PLUS/PLUS C printed-manual display examples; these are
 * manufacturer-document expectations, not physical-device captures.
 * Original guide: https://support.casio.com/pdf/004/fx-115ES_991ES_Eng.pdf
 * PLUS: https://support.casio.com/storage/en/manual/pdf/EN/004/fx-570_991ES_PLUS_EN.pdf
 * PLUS C: https://www.casioeducation.com/_files/ugd/3cfc42_7829a5fe35b144d181d5deb75f532ac6.pdf
 */
const assert=require('node:assert/strict');
const F=require('../../js/number-format.js');
const M=require('../../js/math-engine.js');
const cases=[
 {value:100/7,format:'Fix',digits:3,expected:'14.286'},
 {value:100/7,format:'Fix',digits:2,expected:'14.29'},
 {value:1/7,format:'Sci',digits:5,expected:'1.4286×10^-1'},
 {value:1/7,format:'Sci',digits:4,expected:'1.429×10^-1'},
 {value:1/7,format:'Sci',digits:0,expected:'1.428571429×10^-1'},
 {value:1/200,format:'Norm1',expected:'5×10^-3'},
 {value:1/200,format:'Norm2',expected:'0.005'},
 // Boundary checks of the two normative exponent-display ranges.
 {value:1e-2,format:'Norm1',expected:'0.01'},
 {value:1e-3,format:'Norm1',expected:'1×10^-3'},
 {value:1e-9,format:'Norm2',expected:'0.000000001'},
 {value:1e-10,format:'Norm2',expected:'1×10^-10'},
 {value:1e10,format:'Norm1',expected:'1×10^10'},
 {value:1e10,format:'Norm2',expected:'1×10^10'},
 {value:0,format:'Fix',digits:3,expected:'0.000'},
 {value:0,format:'Sci',digits:4,expected:'0.000×10^0'},
 {value:-1/200,format:'Norm2',expected:'-0.005'},
 {value:1/200,format:'Norm2',decimalSeparator:'comma',expected:'0,005'}
];
for(const model of ['fx-991es','fx-991es-plus','fx-991es-plus-c']){
 for(const item of cases){
  const {value,expected,...settings}=item;
  const result=F.format(value,settings);
  assert.equal(result,expected,model+' '+JSON.stringify(settings)+' '+value);
 }
 // The display setting does not round the underlying Ans value.
 const internal=M.evaluate('1/7',{model,format:'Fix',digits:2});
 assert.ok(Math.abs(internal-1/7)<1e-14,model+' Ans precision');
 const rounded=M.roundCalculated(internal,{format:'Fix',digits:2});
 assert.equal(rounded,0.14,model+' Rnd precision');
}
console.log('CASIO three-model manual rounding tests passed');
