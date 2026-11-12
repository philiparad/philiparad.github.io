/* REA-008 public feature status. This panel is informational only.
 * It does not send keys or make mathematical calculations.
 */
(function(global){'use strict';
const STATUSES=Object.freeze({
 implemented:'Implemented in web app',
 approximation:'Educational approximation',
 unsupported:'Not implemented',
 'hardware-verified':'Verified against CASIO hardware'
});
const $=id=>document.getElementById(id);
async function data(){
 const embedded=$('capability-manifest');
 if(embedded)return JSON.parse(embedded.textContent);
 const response=await fetch('reference/rea-008/capabilities.json',{cache:'no-store'});
 if(!response.ok)throw Error('Capability manifest unavailable');
 return response.json();
}
function render(manifest){
 if(manifest.schema!=='fx991-rea008-capability-gate-v1')throw Error('Unknown capability manifest');
 const table=$('capability-rows'),summary=$('capability-summary');
 if(!table||!summary)return;
 function update(){
  const model='fx-991es-plus';
  const items=manifest.features.filter(f=>f.models.includes(model));
  table.replaceChildren();
  for(const item of items){
   const tr=document.createElement('tr');
   // Public UI fails closed on unsupported parity claims. Source tests,
   // manuals and web-only LCD snapshots never constitute device proof.
   const grounded=item.status!=='hardware-verified'||
    (item.hardware_verified===true&&Array.isArray(item.native_evidence_ids)&&
     item.native_evidence_ids.length>0&&Array.isArray(item.verified_models)&&
     item.verified_models.includes(model));
   const shownStatus=grounded?item.status:'approximation';
   const label=grounded?(STATUSES[item.status]||'Unknown'):
    'Unverified — missing model-specific native evidence';
   for(const value of [item.title,label,item.note]){
    const td=document.createElement('td');
    td.textContent=value;
    tr.append(td);
   }
   tr.dataset.status=shownStatus;
   table.append(tr);
  }
  const verified=items.filter(f=>f.status==='hardware-verified'&&f.hardware_verified===true&&
   Array.isArray(f.native_evidence_ids)&&f.native_evidence_ids.length>0&&
   Array.isArray(f.verified_models)&&f.verified_models.includes(model)).length;
  summary.textContent=items.length+' capabilities listed · '+verified+
    ' hardware-verified · source-only tests are not CASIO device certification.';
 }
 update();
}
data().then(render).catch(error=>{
 const summary=$('capability-summary');
 if(summary)summary.textContent='Capability evidence unavailable: '+error.message+
  '. No hardware-equivalence claim can be made.';
});
})(typeof window!=='undefined'?window:globalThis);
