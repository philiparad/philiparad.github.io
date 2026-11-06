/* Phase 17: human-review metadata authoring, never device authentication. */
(function(root){'use strict';
const SCHEMA='fx991-phase17-independent-review-v1';
function check(x,m){if(!x)throw Error(m)}
function object(x){return !!x&&typeof x==='object'&&!Array.isArray(x)}
function readEvidence(text,plans){
 check(typeof text==='string'&&text.length<=1024*1024,'Evidence JSON must be text under 1 MiB');
 const data=JSON.parse(text);
 check(object(data)&&data.schema==='fx991-device-evidence-v1'&&Array.isArray(data.records)&&data.records.length<=300,'Invalid evidence corpus');
 const known=new Set(plans.map(p=>p.id)),found=new Set(),items=[];
 for(const record of data.records){
  if(!known.has(record?.scenarioId))continue;
  check(!found.has(record.scenarioId),'Duplicate focused scenario '+record.scenarioId);
  found.add(record.scenarioId);
  check(typeof record.id==='string'&&record.id.length>0&&record.id.length<=80,'Invalid observation ID');
  check(typeof record.device==='string'&&record.device.length>=3,'Missing device identification');
  check(record.kind==='physical'||record.kind==='official-emulator','Invalid source kind');
  check(Array.isArray(record.checkpoints),'Missing checkpoint observations');
  const plan=plans.find(p=>p.id===record.scenarioId);
  const seen=new Set(),valid=[];
  for(const c of record.checkpoints){
   check(object(c)&&Number.isInteger(c.step)&&plan.checkpoints.includes(c.step)&&!seen.has(c.step),'Invalid checkpoint for '+plan.id);
   check(object(c.observed)&&Object.values(c.observed).some(v=>typeof v==='string'&&v.trim()),'Empty observed checkpoint '+c.step);
   seen.add(c.step);valid.push(c.step);
  }
  items.push({scenarioId:record.scenarioId,observationId:record.id,device:record.device,kind:record.kind,
   observedResult:typeof record.observed?.result==='string'?record.observed.result:'',
   planned:plan.checkpoints.length,captured:valid.length,missing:plan.checkpoints.filter(n=>!seen.has(n))});
 }
 return items.sort((a,b)=>a.scenarioId.localeCompare(b.scenarioId));
}
function reviewDocument(items,entries){
 check(Array.isArray(items)&&Array.isArray(entries),'Review data must be arrays');
 const allowed=new Map(items.map(r=>[r.scenarioId,r.observationId])),seen=new Set(),reviews=[];
 for(const r of entries){
  check(allowed.has(r.scenarioId)&&allowed.get(r.scenarioId)===r.observationId,'Unmatched observation in review');
  check(!seen.has(r.scenarioId),'Duplicate review');seen.add(r.scenarioId);
  const disposition=(r.disposition||'').trim(),reviewer=(r.reviewer||'').trim(),notes=(r.notes||'').trim();
  check(['match','mismatch','inconclusive'].includes(disposition),'Select an explicit review disposition');
  check(reviewer.length>=3&&reviewer.length<=120,'Reviewer name required');
  check(/^\d{4}-\d{2}-\d{2}$/.test(r.reviewedAt||'')&&!Number.isNaN(Date.parse(r.reviewedAt+'T00:00:00Z')),'Valid review date required');
  check(typeof r.physicalKeyMappingConfirmed==='boolean','Physical key mapping confirmation required');
  check(typeof r.checkpointsVerified==='boolean','Checkpoint verification required');
  check(notes.length>0&&notes.length<=2000,'Review notes required');
  reviews.push({scenarioId:r.scenarioId,observationId:r.observationId,reviewer,reviewedAt:r.reviewedAt,
   disposition,physicalKeyMappingConfirmed:r.physicalKeyMappingConfirmed,
   checkpointsVerified:r.checkpointsVerified,notes});
 }
 return {schema:SCHEMA,reviews};
}
const API=Object.freeze({SCHEMA,readEvidence,reviewDocument});
if(typeof module!=='undefined'&&module.exports)module.exports=API;
root.FX991_PHASE17_REVIEW_UI=API;
})(typeof window!=='undefined'?window:globalThis);
