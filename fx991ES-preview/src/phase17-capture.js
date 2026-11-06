/* Phase 17: structured entry for user-observed checkpoints. No device predictions. */
(function(root){'use strict';
function ensure(ok,msg){if(!ok)throw Error(msg)}
function build(plan,values){
 ensure(plan&&Array.isArray(plan.keys)&&Array.isArray(plan.checkpoints),'A focused plan is required');
 ensure(Array.isArray(values),'Checkpoint rows must be an array');
 const allowed=new Set(plan.checkpoints),seen=new Set(),rows=[];
 for(const value of values){
  ensure(value&&allowed.has(value.step),'Unexpected checkpoint step');
  ensure(!seen.has(value.step),'Duplicate checkpoint step '+value.step);seen.add(value.step);
  const observed={};
  for(const name of ['expression','result','view','mode','error','ans']){
   const v=value[name];
   ensure(v===undefined||typeof v==='string','Invalid '+name);
   if(typeof v==='string'&&v.trim())observed[name]=v.trim();
  }
  const physicalKey=(value.physicalKey||'').trim(),photoRef=(value.photoRef||'').trim();
  ensure(physicalKey.length<=120&&!/[<>]/.test(physicalKey),'Invalid physical key entry');
  ensure(photoRef.length<=300&&!/[<>]/.test(photoRef),'Invalid checkpoint photo reference');
  if(Object.keys(observed).length){
   const row={step:value.step,observed};
   if(physicalKey)row.physicalKey=physicalKey;
   if(photoRef)row.photoRef=photoRef;
   rows.push(row);
  }else ensure(!physicalKey&&!photoRef,'LCD observation required at checkpoint '+value.step);
 }
 rows.sort((a,b)=>a.step-b.step);
 return {checkpoints:rows,complete:rows.length===allowed.size,missing:plan.checkpoints.filter(s=>!rows.some(r=>r.step===s))};
}
function discrepancies(report){
 ensure(report&&Array.isArray(report.results),'A comparison report is required');
 return {schema:'fx991-phase17-discrepancies-v1',hardwareParityCertified:false,
  note:'Derived solely from user-entered observations versus this simulator; not independently authenticated.',
  records:report.results.filter(r=>r.issues&&r.issues.length).map(r=>({
   observationId:r.id,model:r.model,sourceKind:r.kind,firstDivergence:r.firstDivergence,
   issues:r.issues.map(i=>({step:i.step,scope:i.scope,field:i.field,category:i.category,
     expected:i.expected,actual:i.actual}))
  }))};
}

/* Import only worksheet transcription into editable form fields.
   Never constructs a device evidence record or silently marks a reading authentic. */
const CSV_COLUMNS=Object.freeze(['scenarioId','step','semanticKey','setupAngle','setupDisplay',
 'observedLCD','observedCursor','actualPhysicalKey','photoFile','device','operator','date','reviewer']);
function parseCSV(input){
 ensure(typeof input==='string'&&input.length<=1024*1024,'CSV must be text under 1 MiB');
 const text=input.replace(/^\uFEFF/,'');
 const rows=[];let row=[],field='',quoted=false,closed=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++}else if(c==='"'){quoted=false;closed=true}else field+=c}
  else if(c==='"'){ensure(field===''&&!closed,'Malformed CSV quote');quoted=true}
  else if(c===','||c==='\n'||c==='\r'){
   row.push(field);field='';closed=false;
   if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;rows.push(row);row=[]}
  }else{ensure(!closed,'Malformed CSV after quoted field');field+=c}
 }
 ensure(!quoted,'Unterminated CSV quote');
 if(field!==''||row.length){row.push(field);rows.push(row)}
 ensure(rows.length>=2&&rows.length<=501,'CSV requires a header and at most 500 rows');
 ensure(rows[0].length===CSV_COLUMNS.length&&CSV_COLUMNS.every((name,i)=>rows[0][i]===name),
  'Unexpected worksheet CSV columns');
 return rows.slice(1).map((values,i)=>{
  ensure(values.length===CSV_COLUMNS.length,'Invalid worksheet CSV row '+(i+2));
  const obj=Object.fromEntries(CSV_COLUMNS.map((name,j)=>[name,values[j]]));
  ensure(values.every(v=>v.length<=500),'Oversized worksheet value');
  return obj;
 });
}
function worksheetDraft(input,plan){
 ensure(plan&&typeof plan.id==='string'&&Array.isArray(plan.checkpoints)&&Array.isArray(plan.keys),
  'Select a focused scenario first');
 const records=parseCSV(input),forPlan=records.filter(r=>r.scenarioId===plan.id),seen=new Set();
 ensure(forPlan.length>0,'No rows match selected scenario '+plan.id);
 const mapped=[];
 for(const row of forPlan){
  const step=Number(row.step);
  ensure(/^\d+$/.test(row.step)&&plan.checkpoints.includes(step),'Unexpected worksheet checkpoint '+row.step);
  ensure(!seen.has(step),'Duplicate worksheet checkpoint '+step);seen.add(step);
  ensure(row.semanticKey===plan.keys[step-1],'Semantic key mismatch at step '+step);
  ensure(row.setupAngle===plan.setup.angle&&row.setupDisplay===plan.setup.displayStyle,
   'Worksheet setup mismatch at step '+step);
  const observedLCD=row.observedLCD.trim(),observedCursor=row.observedCursor.trim();
  const physicalKey=row.actualPhysicalKey.trim(),photoRef=row.photoFile.trim();
  const expression=[observedLCD,observedCursor&&'Cursor: '+observedCursor].filter(Boolean).join(' | ');
  if(expression||physicalKey||photoRef){
   ensure(expression,'LCD or cursor observation required before physical key/photo metadata at step '+step);
   mapped.push({step,expression,physicalKey,photoRef});
  }
 }
 ensure(forPlan.length===plan.checkpoints.length,'Worksheet is missing expected checkpoint rows');
 const complete=mapped.length===plan.checkpoints.length;
 const keys=['device','operator','date','reviewer'];
 const metadata={};
 for(const key of keys){
  const nonblank=[...new Set(forPlan.map(r=>r[key].trim()).filter(Boolean))];
  ensure(nonblank.length<=1,'Conflicting '+key+' values across worksheet rows');
  metadata[key]=nonblank[0]||'';
 }
 return {scenarioId:plan.id,values:mapped,metadata,entered:mapped.length,
  planned:plan.checkpoints.length,complete,physicalParityCertified:false,
  note:'Worksheet transcription only; not an observation record or independent authentication.'};
}

const API=Object.freeze({build,discrepancies,parseCSV,worksheetDraft});
if(typeof module!=='undefined'&&module.exports)module.exports=API;
root.FX991_PHASE17_CAPTURE=API;
})(typeof window!=='undefined'?window:globalThis);
