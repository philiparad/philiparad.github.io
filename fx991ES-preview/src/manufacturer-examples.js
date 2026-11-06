/* Phase 12: published CASIO second-edition examples, NOT physical observations.
 * Values were transcribed from the official fx-570ES PLUS / fx-991ES PLUS
 * (2nd edition) User's Guide, pages 20, 21, 27. Input key translation to
 * simulator semantic keys is approximate where fraction templates differ.
 * Never infer physical-firmware, pixel or keyboard equivalence from a match.
 */
(function(global){'use strict';
const URL='https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-570ESPLUS_991ESPLUS_EN.pdf';
const CASES=Object.freeze([
 {id:'M12-01',page:20,example:'Pi divided by six, exact MathO',style:'MathO',angle:'DEG',events:['PI','DIV','6','='],expected:'1/6π',publishedForm:'stacked 1/6 with π',mapping:'approximate'},
 {id:'M12-02',page:20,example:'Pi divided by six, S-D decimal',style:'MathO',angle:'DEG',events:['PI','DIV','6','=','S-D'],expected:'0.5235987756',publishedForm:'decimal',mapping:'approximate'},
 {id:'M12-03',page:20,example:'LineIO division one fifth decimal',style:'LineIO',angle:'DEG',events:['1','DIV','5','='],expected:'0.2',publishedForm:'decimal',mapping:'direct'},
 {id:'M12-04',page:20,example:'LineIO division one fifth S-D',style:'LineIO',angle:'DEG',events:['1','DIV','5','=','S-D'],expected:'1/5',publishedForm:'linear fraction separator',mapping:'direct'},
 {id:'M12-05',page:20,example:'LineIO one minus fractional four fifths',style:'LineIO',angle:'DEG',events:['1','SUB','FRAC','4','RIGHT','5','='],expected:'1/5',publishedForm:'linear fraction separator',mapping:'dedicated fraction-template semantic key; physical button timing unverified'},
 {id:'M12-06',page:20,example:'LineIO one minus fractional four fifths S-D',style:'LineIO',angle:'DEG',events:['1','SUB','FRAC','4','RIGHT','5','=','S-D'],expected:'0.2',publishedForm:'decimal',mapping:'dedicated fraction-template semantic key; physical button timing unverified'},
 {id:'M12-07',page:21,example:'MathO two thirds plus one half',style:'MathO',angle:'DEG',events:['2','DIV','3','ADD','1','DIV','2','='],expected:'7/6',publishedForm:'stacked fraction',mapping:'dedicated fraction-template semantic key; physical button timing unverified'},
 {id:'M12-08',page:21,example:'LineIO two thirds plus one half',style:'LineIO',angle:'DEG',events:['FRAC','2','RIGHT','3','RIGHT','ADD','FRAC','1','RIGHT','2','='],expected:'7/6',publishedForm:'linear fraction separator',mapping:'dedicated fraction-template semantic key; physical button timing unverified'},
 {id:'M12-09',page:27,example:'LineIO sine thirty degrees',style:'LineIO',angle:'DEG',events:['SIN','3','0','RP','='],expected:'0.5',publishedForm:'decimal',mapping:'direct'},
 {id:'M12-10',page:27,example:'LineIO inverse sine one half degrees',style:'LineIO',angle:'DEG',events:['SHIFT','SIN','0','.','5','RP','='],expected:'30',publishedForm:'decimal degrees',mapping:'direct'},
 {id:'M12-11',page:20,example:'MathO (sqrt2 + 2) times sqrt3',style:'MathO',angle:'DEG',
  events:['LP','SQRT','2','RP','ADD','2','RP','MUL','SQRT','3','RP','='],
  expected:'√6+2√3',publishedForm:'exact sum of radicals',mapping:'approximate'}
].map(c=>Object.freeze({...c,events:Object.freeze(c.events)})));
function verify(){
 const R=global.FX991_REFERENCE;
 if(!R)throw Error('Reference comparison engine unavailable');
 const results=CASES.map(c=>{
  const record={caseId:c.id,model:'standard',setup:{angle:c.angle,displayStyle:c.style},
   events:[...c.events],source:{kind:'manual',document:URL,page:c.page},
   expected:{result:c.expected}};
  const out=R.execute(record);
  return {caseId:c.id,page:c.page,example:c.example,expected:c.expected,
   actual:out.actual.result,normalizedTextMatch:out.passed,
   mapping:c.mapping,publishedForm:c.publishedForm,
   physicalKeySequenceVerified:false,lcdGlyphParityVerified:false};
 });
 const matched=results.filter(r=>r.normalizedTextMatch).length;
 return {schema:'fx991-manufacturer-document-comparison-v1',
  manufacturerDocument:URL,model:'fx-991ES PLUS 2nd edition',
  cases:results,total:results.length,matched,divergent:results.length-matched,
  physicalObservations:0,documentedExampleResults:true,
  caveat:'Normalized simulator-result comparisons only; some fraction-template semantic mappings are unverified. No physical or emulator observations.'};
}
global.FX991_MANUFACTURER_EXAMPLES=Object.freeze({URL,CASES,verify});
})(typeof window!=='undefined'?window:globalThis);
