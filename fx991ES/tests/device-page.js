(function(){'use strict';
const D=window.FX991_DEVICE,K=window.FX991,M=window.FX991_EVIDENCE_MEDIA,C=window.FX991_PHASE17_CAPTURE,$=id=>document.getElementById(id);let corpus=D.empty();
let photo=null,photoObjectUrl=null,photoBusy=false,photoGeneration=0;
function clearPhoto(clearReference=true){
 photoGeneration++;photo=null;photoBusy=false;
 if(photoObjectUrl){URL.revokeObjectURL(photoObjectUrl);photoObjectUrl=null}
 $('photo-file').value='';$('photo-preview').removeAttribute('src');$('photo-preview').hidden=true;
 if(clearReference)$('photo-ref').value='';
 $('photo-status').textContent='No local photo selected. External media remains unverified; JSON does not contain image bytes.';
}
async function choosePhoto(){
 const file=$('photo-file').files[0];clearPhoto(false);
 if(!file)return;
 const generation=++photoGeneration;photoBusy=true;
 $('photo-status').textContent='Computing local SHA-256; the file stays in your browser…';
 try{
  const descriptor=await M.fromFile(file);
  if(generation!==photoGeneration)return;
  photo=descriptor;$('photo-ref').value=descriptor.fileName;
  photoObjectUrl=URL.createObjectURL(file);
  $('photo-preview').src=photoObjectUrl;$('photo-preview').hidden=false;
  $('photo-status').textContent=descriptor.fileName+' · '+descriptor.bytes+' bytes · SHA-256 '+descriptor.sha256+
   '. UNREVIEWED; keep the original photo file separately. No upload or image bytes in JSON.';
 }catch(error){
  if(generation===photoGeneration){photo=null;$('photo-ref').value='';$('photo-status').textContent=error.message}
 }finally{if(generation===photoGeneration)photoBusy=false}
}

function message(m){$('feedback').textContent=m}
function download(data,name='fx991-device-observations.json'){let u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));let a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)}
function populate(){for(let s of D.scenarios()){let opt=document.createElement('option');opt.value=s.id;
 opt.textContent=(s.planned?'PLAN ':'LEGACY ')+s.id+' — '+(s.title||s.area);$('scenario').append(opt)}selectScenario()}
function checkpointStatus(){
 const root=$('checkpoint-entry-rows');if($('focused-checkpoint-entry').hidden)return;
 const values=Array.from(root.querySelectorAll('.checkpoint-capture-row')).map(row=>{
  const value={step:Number(row.dataset.step)};
  for(const input of row.querySelectorAll('[data-field]'))value[input.dataset.field]=input.value;
  return value;
 });
 const plan=D.scenario($('scenario').value);
 try{const report=C.build(plan,values);
  $('checkpoint-entry-progress').textContent=report.checkpoints.length+' / '+plan.checkpoints.length+
    ' checkpoints entered. '+(report.complete?'All planned checkpoints have observations (not authenticated).':
    'Missing observed LCD at steps: '+report.missing.join(', ')+'.');
 }catch(error){$('checkpoint-entry-progress').textContent=error.message}
}
function renderCheckpointInputs(s){
 const focused=!!s.focus;
 $('focused-checkpoint-entry').hidden=!focused;
 $('raw-checkpoints-field').hidden=focused;
 $('worksheet-import-panel').hidden=!focused;
 $('worksheet-file').value='';$('worksheet-status').textContent='No worksheet imported; empty readings remain empty.';
 const root=$('checkpoint-entry-rows');root.replaceChildren();
 if(!focused)return;
 for(const step of s.checkpoints){
  const row=document.createElement('div');row.className='checkpoint-capture-row';
  row.dataset.step=String(step);
  const heading=document.createElement('strong');heading.textContent='Step '+step+' — '+s.keys[step-1]+' (semantic key)';
  row.append(heading);
  for(const [field,caption] of [['expression','Observed LCD expression / cursor'],['result','Observed LCD result'],['view','Observed view'],['physicalKey','Actual physical key'],['photoRef','Original checkpoint photo filename']]){
   const label=document.createElement('label');label.textContent=caption;
   const input=document.createElement('input');input.type='text';input.dataset.field=field;
   input.autocomplete='off';input.setAttribute('aria-label','Step '+step+' '+caption);
   input.addEventListener('input',checkpointStatus);
   label.append(input);row.append(label);
  }
  root.append(row);
 }
 checkpointStatus();
}
function focusedCheckpoints(){
 const s=D.scenario($('scenario').value);
 const values=Array.from($('checkpoint-entry-rows').querySelectorAll('.checkpoint-capture-row')).map(row=>{
  const v={step:Number(row.dataset.step)};
  for(const input of row.querySelectorAll('[data-field]'))v[input.dataset.field]=input.value;
  return v;
 });
 return C.build(s,values).checkpoints;
}
function renderFocusedPlan(s){
 const group=$('fraction-capture-guide');group.hidden=!s.focus;renderCheckpointInputs(s);
 const root=$('fraction-checkpoint-list');root.replaceChildren();
 if(!s.focus)return;
 const keys=s.keys;
 for(let i=0;i<keys.length;i++){
  const line=document.createElement('div');line.className='device-step-row';
  const key=document.createElement('span');key.textContent='Step '+(i+1)+' · '+keys[i];
  const target=document.createElement('span');target.textContent=s.checkpoints.includes(i+1)?
    'Observe LCD and cursor here; record original photo ID':'Press and continue';
  line.append(key,target);root.append(line);
 }
}
function selectScenario(){clearPhoto();let s=D.scenario($('scenario').value);renderFocusedPlan(s);
 $('model').value=s.model;$('keys').value=s.keys.join(' ');
 if(s.setup){$('angle').value=s.setup.angle;$('number-format').value=s.setup.format;
 $('digits').value=String(s.setup.digits);$('display-style').value=s.setup.displayStyle}
 $('case-id').value=s.planned?'case-'+s.id+'-001':'observed-001';
 for(const id of ['result','mode','error','notes','photo-ref','checkpoints'])$(id).value='';
 $('view').value='';
 $('manual').textContent=s.planned?'PLANNED ONLY — '+s.title+'. No physical result has been recorded. Reproduce the sequence independently on real equipment.':s.manual===null?'Exploratory legacy scenario; no device result known.':'Unverified exploratory prediction: '+s.manual+' (NOT physical evidence).';
}
function setup(){return {angle:$('angle').value,format:$('number-format').value,digits:Number($('digits').value),displayStyle:$('display-style').value}}
function checkpoints(){let text=$('checkpoints').value.trim();if(!text)return [];let value=JSON.parse(text);if(!Array.isArray(value))throw Error('Intermediate observations must be a JSON array');return value}
function renderCoverage(){
 const focused=window.FX991_FRACTION_VALIDATION.progress(corpus.records);
 $('fraction-coverage').textContent=focused.recorded+' of '+focused.planned+
   ' focused cases have self-reported records; independent authentication: NO.';
 const progress=D.planCoverage(corpus);$('plan-summary').textContent=
  progress.recorded+' / '+progress.planned+' planned scenarios have self-reported records; '+
  progress.unrecorded+' remain unrecorded. Independent authentication: NO.';
 const root=$('plan-categories');root.replaceChildren();
 for(const [area,count] of Object.entries(progress.categories)){
  const cell=document.createElement('div');cell.className='device-category-item';
  const name=document.createElement('strong');name.textContent=area;
  const n=document.createElement('span');n.textContent=count.recorded+' / '+count.planned+' recorded';
  cell.append(name,n);root.append(cell);
 }
}
function render(){renderCoverage();let r=D.review(corpus);$('summary').textContent=r.totals.passed+' matched / '+r.totals.failed+' mismatched from '+r.totals.records+' actual-device records. Standard '+r.coverage.standard+'; C edition '+r.coverage.c+'. Certification: NOT established.';$('categories').textContent=JSON.stringify(r.byCategory,null,2);$('results').replaceChildren();for(let item of r.results){let p=document.createElement('pre');p.className='device-prewrap';p.textContent=(item.passed?'MATCH':'MISMATCH')+' '+item.id+' ('+item.model+')\n'+item.issues.map(i=>'step '+i.step+' '+i.category+': expected '+JSON.stringify(i.expected)+' vs actual '+JSON.stringify(i.actual)).join('\n')+'\nFirst difference: '+(item.firstDivergence??'none');$('results').append(p)}}
$('worksheet-file').onchange=async event=>{
 try{
  const file=event.target.files[0];if(!file)return;
  if(file.size>1024*1024)throw Error('Worksheet CSV exceeds 1 MiB');
  const plan=D.scenario($('scenario').value);
  if(!plan.focus)throw Error('Select a focused F16 scenario to import worksheet rows');
  const draft=C.worksheetDraft(await file.text(),plan);
  const root=$('checkpoint-entry-rows');
  for(const item of draft.values){
   const row=Array.from(root.querySelectorAll('.checkpoint-capture-row')).find(el=>Number(el.dataset.step)===item.step);
   if(!row)throw Error('Missing matching form row for checkpoint '+item.step);
  }
  // Only modify the form after the entire worksheet has been parsed and validated.
  for(const row of root.querySelectorAll('.checkpoint-capture-row')){
   const value=draft.values.find(v=>v.step===Number(row.dataset.step));
   for(const input of row.querySelectorAll('[data-field]'))input.value=value?(value[input.dataset.field]||''):'';
  }
  if(draft.metadata.device)$('device').value=draft.metadata.device;
  if(draft.metadata.date)$('date').value=draft.metadata.date;
  checkpointStatus();
  $('worksheet-status').textContent='Draft loaded for '+draft.scenarioId+': '+draft.entered+
   ' / '+draft.planned+' checkpoints contain transcribed readings. Not saved as evidence; not independently authenticated. Check each field before recording.';
  message('Worksheet draft imported locally. Original photographs remain separate. No observation was recorded.');
 }catch(error){$('worksheet-status').textContent='Worksheet not imported: '+error.message;message(error.message)}
 event.target.value='';
};
$('photo-file').onchange=choosePhoto;
$('photo-clear').onclick=()=>clearPhoto();
$('scenario').onchange=selectScenario;
$('simulate').onclick=()=>{try{let a=$('keys').value.trim().split(/\s+/);if(!a[0])throw Error('Enter a key sequence.');let st=K.createState($('model').value);st.setup={...st.setup,...setup()};for(const k of a)st=K.dispatchKey(st,k);let s=K.semanticScreen(st);$('preview').textContent=JSON.stringify({mode:s.mode,view:s.view,result:s.result,expression:s.expression,indicators:s.indicators},null,2)}catch(e){$('preview').textContent=e.message}};
$('record').onclick=()=>{try{let observed={};for(let id of ['result','mode','view','error']){let v=$(id).value.trim();if(v)observed[id]=v}if(photoBusy)throw Error('Local photo fingerprint is still being computed');let row={id:$('case-id').value.trim(),model:$('model').value,kind:$('kind').value,device:$('device').value.trim(),observedAt:$('date').value,setup:setup(),scenarioId:D.scenario($('scenario').value).planned?$('scenario').value:undefined,keys:$('keys').value.trim().split(/\s+/),observed,checkpoints:D.scenario($('scenario').value).focus?focusedCheckpoints():checkpoints(),photoRef:$('photo-ref').value.trim(),media:photo||undefined,notes:$('notes').value};corpus=D.add(corpus,row);message('Recorded '+row.id+'. Export JSON to preserve these observations.');render()}catch(e){message(e.message)}};
$('export').onclick=()=>download(corpus);
$('export-discrepancies').onclick=()=>{try{download(C.discrepancies(D.review(corpus)),'fx991-phase17-discrepancies.json');message('Exported self-reported comparison discrepancies. This does not authenticate device provenance.')}catch(e){message(e.message)}};
$('import').onchange=async e=>{try{if(!e.target.files[0])return;corpus=D.importEvidence(await e.target.files[0].text());clearPhoto();message('Imported '+corpus.records.length+' observation metadata records. Original images must be supplied separately.');render()}catch(err){message(err.message)}e.target.value=''};
populate();render();
})();