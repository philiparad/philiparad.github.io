#!/usr/bin/env node
/* PLUS-040: reproducible, machine-readable GitHub Actions release outcome report.
 * This records web-suite and reference checks, not native device parity.
 */
'use strict';
const A=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const args=process.argv.slice(2);
function option(name){const i=args.indexOf(name);if(i<0||!args[i+1])throw Error('Missing '+name);return args[i+1]}
function build(text,metadata={}){
 const lines=String(text).trim().split(/\r?\n/).filter(Boolean);
 A.ok(lines.length>=1,'No release verification results');
 const seen=new Set();
 const checks=lines.map((line,index)=>{
  const fields=line.split('\t');
  A.equal(fields.length,3,'Expected id, outcome and label on row '+(index+1));
  const [id,outcome,label]=fields;
  A.match(id,/^plus038_check_\d{2}$/,'Invalid check id');
  A.match(outcome,/^(success|failure|skipped|cancelled)$/,'Invalid check outcome');
  A.ok(label.trim()&&label.length<=160,'Invalid check label');
  A.ok(!seen.has(id),'Duplicate check '+id);
  seen.add(id);
  return {id,label,outcome,passed:outcome==='success'};
 });
 const failed=checks.filter(x=>!x.passed);
 const report={
  schema:'plus040-release-gate-v1',
  model:'fx-991ES PLUS (2nd edition)',
  commit:metadata.commit||null,
  run_id:metadata.run_id||null,
  run_attempt:metadata.run_attempt||null,
  hardware_parity_certified:false,
  status:failed.length?'FAIL':'PASS_WEB_AND_SOURCE_ONLY',
  count:checks.length,
  passed:checks.length-failed.length,
  failed:failed.length,
  checks
 };
 const canonical=JSON.stringify(report);
 report.sha256=crypto.createHash('sha256').update(canonical).digest('hex');
 return report;
}
function main(){
 const report=build(fs.readFileSync(option('--input'),'utf8'),{
  commit:process.env.GITHUB_SHA,run_id:process.env.GITHUB_RUN_ID,
  run_attempt:process.env.GITHUB_RUN_ATTEMPT
 });
 fs.writeFileSync(option('--output'),JSON.stringify(report,null,2)+'\n');
 console.log('PLUS-040:',report.status,report.passed+'/'+report.count,
             'checks; report SHA-256:',report.sha256);
 // The workflow's consolidated quality gate owns the exit status, so this
 // reporter must still publish diagnostics when some test outcomes failed.
}
if(require.main===module)main();
module.exports={build};
