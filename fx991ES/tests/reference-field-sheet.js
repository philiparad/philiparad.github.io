/* Field collection forms are deliberately blank: no hardware result is inferred. */
(function(global){'use strict';
const PLAN=global.FX991_REFERENCE_PLAN;
const $=id=>document.getElementById(id);
if(!PLAN||PLAN.CASES.length!==50)throw Error('50-case reference plan unavailable');

function node(tag,cls,value){
 const n=document.createElement(tag);
 if(cls)n.className=cls;
 if(value!==undefined)n.textContent=value;
 return n;
}
function field(label,lines=1){
 const wrap=node('div','sheet-field');
 wrap.append(node('span','sheet-field-label',label));
 const blank=node('div',lines>1?'sheet-writing-lines sheet-lines-2':'sheet-writing-lines');
 wrap.append(blank);return wrap;
}
function card(c){
 const article=node('article','reference-card');
 article.setAttribute('data-case-id',c.id);
 const heading=node('div','sheet-case-heading');
 heading.append(node('strong',null,c.id+' — '+c.title),node('span',null,c.area+' / '+c.model));
 article.append(heading);
 article.append(node('p','sheet-semantic-keys','Exploratory simulator key IDs: '+c.keys.join(' ')));
 const setting=c.setup;
 article.append(node('p','sheet-setup',
  'Initial settings: '+setting.angle+' · '+setting.format+' · digits '+setting.digits+' · '+setting.displayStyle));
 const grid=node('div','sheet-writing-grid');
 grid.append(field('Actual physical button sequence (note SHIFT/ALPHA variants)',2),
             field('Observed exact LCD result / error / indicators',2),
             field('Reference device / emulator edition and version'),
             field('Observation date and recorded time'),
             field('Original photo or video filename / identifier'),
             field('Repeatability and discrepancy notes',2));
 article.append(grid);
 const footer=node('p','sheet-warning',
  'Unobserved until independently measured. Do not copy the simulator preview as the reference result.');
 article.append(footer);
 return article;
}
function render(area){
 const cases=PLAN.CASES.filter(c=>area==='all'||c.area===area);
 const main=$('field-sheets');main.replaceChildren();
 for(let i=0;i<cases.length;i+=2){
  const page=node('section','sheet-page');
  const heading=node('div','sheet-page-heading');
  heading.append(node('strong',null,'Independent calculator compatibility — field observations'),
                 node('span',null,'Sheet '+(Math.floor(i/2)+1)+' of '+Math.ceil(cases.length/2)));
  page.append(heading);
  page.append(card(cases[i]));
  if(cases[i+1])page.append(card(cases[i+1]));
  else page.append(node('div','empty-slot','No additional scenario on this sheet.'));
  main.append(page);
 }
 $('sheet-summary').textContent=cases.length+' planned cases on '+Math.ceil(cases.length/2)+
  ' A4 sheets; all observed-result fields are blank. Original photographs must be retained separately.';
}
function csvCell(v){
 const s=String(v);
 return '"'+s.replace(/"/g,'""')+'"';
}
function csvTemplate(area){
 const rows=[['planId','category','title','model','semanticKeyPlan','angle','format','digits','displayStyle',
  'actualPhysicalKeys','observedLCD','referenceDevice','observedDate','photoId','notes','repeatConfirmed']];
 for(const c of PLAN.CASES.filter(c=>area==='all'||c.area===area)){
  rows.push([c.id,c.area,c.title,c.model,c.keys.join(' '),c.setup.angle,c.setup.format,
    c.setup.digits,c.setup.displayStyle,'','','','','','','']);
 }
 return rows.map(x=>x.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
function downloadCSV(){
 const text=csvTemplate($('area-filter').value),url=URL.createObjectURL(new Blob(
  ['\ufeff',text],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='fx991-unobserved-reference-worksheet.csv';
 a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
for(const area of PLAN.CATEGORIES){
 const o=document.createElement('option');o.value=area;o.textContent=area;
 $('area-filter').append(o);
}
$('area-filter').onchange=()=>render($('area-filter').value);
$('export-blank-csv').onclick=downloadCSV;
$('print-sheets').onclick=()=>window.print();
render('all');
global.FX991_FIELD_SHEETS=Object.freeze({csvTemplate,caseCount:PLAN.CASES.length});
})(typeof window!=='undefined'?window:globalThis);
