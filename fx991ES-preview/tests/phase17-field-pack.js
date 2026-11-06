(function(){'use strict';
const F=window.FX991_FRACTION_VALIDATION;
const PRIORITY=Object.freeze(['F16-03','F16-04','F16-06','F16-07','F16-11','F16-12']);
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function plans(){const all=F.CASES;return $('filter').value==='all'?[...all]:PRIORITY.map(id=>F.get(id))}
function sheet(p){
 const steps=p.checkpoints.map(n=>'<tr><th scope="row">'+n+'</th><td>'+esc(p.keys[n-1])+'</td><td></td><td></td><td></td></tr>').join('');
 const field=name=>'<div class="field">'+esc(name)+': ____________________________</div>';
 const tag=PRIORITY.includes(p.id)?'<span class="priority">Priority test</span>':'Follow-up test';
 return '<article class="sheet"><h2>'+esc(p.id)+' — '+esc(p.title)+'</h2><p class="tag">'+tag+' · '+p.keys.length+' semantic steps · '+p.checkpoints.length+' planned LCD checkpoints</p>'+
 '<div class="meta">'+field('Model / edition')+field('Operator')+field('Date')+field('Device / emulator version')+field('Reset / power state')+field('Math mode / settings')+'</div>'+
 '<div class="sequence"><strong>Planned simulator semantic keys (NOT authenticated hardware legends):</strong><br>'+esc(p.keys.join(' → '))+'</div>'+
 '<p class="note">Write the exact physical key used and the observed LCD / cursor at every checkpoint. Blank cells are intentional. If hardware keys differ, document the substitution; do not silently treat semantic keys as physical labels.</p>'+
 '<table class="steps"><thead><tr><th scope="col">Step</th><th scope="col">Semantic key</th><th scope="col">Observed LCD / cursor</th><th scope="col">Actual physical key(s)</th><th scope="col">Original photo ID</th></tr></thead><tbody>'+steps+'</tbody></table>'+
 '<div class="end">'+field('Terminal LCD (verbatim)')+field('Physical-key mapping / unexpected behavior')+field('Discrepancies / first divergent step')+
 '<p class="note">Original photo files must be retained separately. No observation or photo has been prefilled. Independent reviewer: ____________________ · Review date: __________</p></div></article>';
}
function csvCell(v){return '"'+String(v).replace(/"/g,'""')+'"'}
function blankCSV(items){
 const rows=[['scenarioId','step','semanticKey','setupAngle','setupDisplay','observedLCD','observedCursor','actualPhysicalKey','photoFile','device','operator','date','reviewer']];
 for(const p of items)for(const step of p.checkpoints)rows.push([p.id,String(step),p.keys[step-1],p.setup.angle,p.setup.displayStyle,'','','','','','','','']);
 return rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
function render(){const p=plans();$('sheets').innerHTML=p.map(sheet).join('');$('summary').textContent=p.length+' blank worksheets; '+p.reduce((n,x)=>n+x.checkpoints.length,0)+' unobserved checkpoints. Physical observations captured: 0.'}
$('filter').addEventListener('change',render);
$('print').addEventListener('click',()=>window.print());
$('csv').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob(['\uFEFF'+blankCSV(plans())],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='phase17-blank-physical-checkpoints.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
render();
})();