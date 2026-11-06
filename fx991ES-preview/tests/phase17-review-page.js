(function(){'use strict';
const $=id=>document.getElementById(id),API=window.FX991_PHASE17_REVIEW_UI;
let items=[];
function line(label,id,type='text'){const l=document.createElement('label');l.textContent=label+' ';const input=document.createElement('input');input.type=type;input.dataset.field=id;input.setAttribute('aria-label',label);l.append(input);return l}
function selectField(label,field,options){const l=document.createElement('label');l.textContent=label+' ';const el=document.createElement('select');el.dataset.field=field;
 for(const [value,text] of options){const o=document.createElement('option');o.value=value;o.textContent=text;el.append(o)}l.append(el);return l}
function render(){const root=$('review-cards');root.replaceChildren();
 for(const item of items){
  const block=document.createElement('section');block.className='device-plan-coverage phase17-review-card';block.dataset.scenario=item.scenarioId;
  const heading=document.createElement('h3');heading.textContent=item.scenarioId+' · observation '+item.observationId;block.append(heading);
  const summary=document.createElement('p');summary.textContent=item.device+' · '+item.kind+' · observed checkpoints '+item.captured+'/'+item.planned+
    (item.missing.length?' · missing steps '+item.missing.join(', '):'')+' · terminal LCD: '+(item.observedResult||'(not recorded)');
  block.append(summary);
  const row=document.createElement('div');row.className='grid2';
  row.append(line('Independent reviewer','reviewer'));
  row.append(line('Date of review','reviewedAt','date'));
  row.append(selectField('Decision','disposition',[['','Not reviewed'],['match','Match'],['mismatch','Mismatch'],['inconclusive','Inconclusive']]));
  row.append(selectField('Physical key mapping checked','physicalKeyMappingConfirmed',[['','Not checked'],['true','Yes'],['false','No']]));
  row.append(selectField('Original photos and checkpoints verified','checkpointsVerified',[['','Not checked'],['true','Yes'],['false','No']]));
  const notes=document.createElement('label');notes.textContent='Reviewer notes / original photo provenance ';const textarea=document.createElement('textarea');textarea.rows=3;textarea.dataset.field='notes';notes.append(textarea);
  block.append(row,notes);root.append(block);
 }
 $('review-summary').textContent=items.length+' self-reported focused observations loaded. No independent decisions are prefilled.';
}
$('evidence-file').addEventListener('change',async e=>{
 try{const file=e.target.files[0];if(!file)return;if(file.size>1024*1024)throw Error('Evidence file exceeds 1 MiB');
  const loaded=API.readEvidence(await file.text(),window.FX991_FRACTION_VALIDATION.CASES);
  items=loaded;render();$('load-status').textContent=items.length+' focused observations loaded locally; source authenticity unverified.';
 }catch(error){items=[];render();$('load-status').textContent='Import rejected: '+error.message}
 e.target.value='';
});
$('export-reviews').addEventListener('click',()=>{
 try{
  const entries=[];
  for(const block of $('review-cards').querySelectorAll('.phase17-review-card')){
   const values=Object.fromEntries(Array.from(block.querySelectorAll('[data-field]')).map(el=>[el.dataset.field,el.value]));
   // Unselected cards remain unreviewed and are intentionally absent from the export.
   if(!Object.values(values).some(v=>v.trim()))continue;
   const source=items.find(i=>i.scenarioId===block.dataset.scenario);
   const convert=v=>v===''?undefined:v==='true'?true:v==='false'?false:undefined;
   entries.push({...values,scenarioId:source.scenarioId,observationId:source.observationId,
    physicalKeyMappingConfirmed:convert(values.physicalKeyMappingConfirmed),
    checkpointsVerified:convert(values.checkpointsVerified)});
  }
  if(!items.length)throw Error('Import a device evidence JSON file first');
  const data=API.reviewDocument(items,entries);
  const blob=new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='fx991-phase17-independent-reviews.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  $('export-status').textContent=data.reviews.length+' human-entered review entries exported. No authenticity or hardware release certified.';
 }catch(error){$('export-status').textContent='Review export blocked: '+error.message}
});
render();
})();