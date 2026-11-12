/* REA-012: documented SETUP menu structure, separate from calculation MODE.
 * Official CASIO fx-991ES/PLUS/PLUS C manuals; firmware and LCD parity unverified.
 */
(function(global){'use strict';
const SETUP_PAGE_1=Object.freeze([
  {key:'1',label:'MthIO',id:'mthio'},
  {key:'2',label:'LineIO',id:'lineio'},
  {key:'3',label:'Deg',id:'deg'},
  {key:'4',label:'Rad',id:'rad'},
  {key:'5',label:'Gra',id:'gra'},
  {key:'6',label:'Fix',id:'fix'},
  {key:'7',label:'Sci',id:'sci'},
  {key:'8',label:'Norm',id:'norm'}
]);
const SECOND_PLUS=Object.freeze([
  {key:'1',label:'ab/c',id:'mixed'},
  {key:'2',label:'d/c',id:'improper'},
  {key:'3',label:'CMPLX',id:'complex'},
  {key:'4',label:'STAT',id:'stat'},
  {key:'5',label:'Disp',id:'disp'},
  {key:'6',label:'CONT',id:'contrast'}
]);
const ALL=Object.freeze({'fx-991es-plus':Object.freeze([SETUP_PAGE_1,SECOND_PLUS])});
const DEFAULTS=Object.freeze({
 angle:'DEG',format:'Norm1',digits:3,math:true,outputMath:true,
 fractionStyle:'improper',complexFormat:'rectangular',statFrequency:false,
 tableFunctions:2,recurringDecimal:true,decimalSeparator:'dot',contrast:5
});
function pages(model){return ALL['fx-991es-plus']}
function entries(model){return pages(model).flatMap((items,page)=>
 items.map(entry=>Object.freeze({...entry,page})))}
function setting(model,id){return entries(model).find(entry=>entry.id===id)||null}
function selection(model,page,key){
 const group=pages(model)[page];
 return group?group.find(entry=>entry.key===String(key))||null:null;
}
function options(id){
 const mapping={
  mthio:[['1','MathO','matho'],['2','LineO','lineo']],
  norm:[['1','Norm1','norm1'],['2','Norm2','norm2']],
  complex:[['1','a+bi','rectangular'],['2','r∠θ','polar']],
  stat:[['1','ON','on'],['2','OFF','off']],
  disp:[['1','Dot','dot'],['2','Comma','comma']]
 };
 return (mapping[id]||[]).map(([key,label,value])=>({key,label,value}));
}
const api=Object.freeze({pages,entries,setting,selection,options,defaults:DEFAULTS,models:ALL});
global.FreshSetup=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
