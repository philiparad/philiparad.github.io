/* Milestone 19 — evidence-based release gate; never fabricates reference observations. */
(function(global){'use strict';
const PROFILE=Object.freeze({version:'19.0.0-rc-evaluation',requiredBrowsers:['Chromium','Firefox','WebKit'],requiredModels:['standard','c'],maxEvidence:400});
const CHECKS=Object.freeze(['keypad','keyboard','screen-reader','zoom-320','zoom-200','contrast','exports','offline']);
const STATUS=Object.freeze(['pass','fail','unverified']);
function assert(ok,msg){if(!ok)throw Error('Release evidence error: '+msg)}
function plain(v){return !!v&&typeof v==='object'&&!Array.isArray(v)}
function validateEvidence(raw){
 assert(plain(raw),'expected a JSON object');assert(raw.schema==='fx991-rc-evidence-v1','unsupported schema');
 assert(Array.isArray(raw.browserChecks)&&raw.browserChecks.length<=PROFILE.maxEvidence,'invalid browserChecks');
 assert(Array.isArray(raw.observations)&&raw.observations.length<=PROFILE.maxEvidence,'invalid observations');
 const unique=new Set();
 for(const c of raw.browserChecks){
  assert(plain(c),'invalid browser check');
  assert(PROFILE.requiredBrowsers.includes(c.browser),'unknown browser');
  assert(CHECKS.includes(c.check),'unknown check');
  assert(STATUS.includes(c.status),'unknown check status');
  assert(typeof c.platform==='string'&&c.platform.length>=2&&c.platform.length<=100,'missing platform');
  assert(typeof c.observedAt==='string'&&/^\d{4}-\d\d-\d\d$/.test(c.observedAt),'missing date');
  assert(typeof c.notes==='string'&&c.notes.length<=2000,'invalid notes');
  const k=c.browser+'|'+c.platform+'|'+c.check;assert(!unique.has(k),'duplicate browser check '+k);unique.add(k);
 }
 for(const o of raw.observations){
  assert(plain(o)&&['physical','official-emulator'].includes(o.kind),'observations must be actual device/emulator records');
  assert(PROFILE.requiredModels.includes(o.model),'invalid model');
  assert(typeof o.device==='string'&&o.device.trim().length>=3&&o.device.length<=120,'missing device identifier');
  assert(typeof o.observedAt==='string'&&/^\d{4}-\d\d-\d\d$/.test(o.observedAt),'missing observation date');
  assert(typeof o.caseId==='string'&&/^[\w.-]{1,80}$/.test(o.caseId),'invalid caseId');
  assert(typeof o.result==='string'&&['pass','fail'].includes(o.result),'invalid reference comparison result');
 }
 return JSON.parse(JSON.stringify(raw));
}
function fresh(){return {schema:'fx991-rc-evidence-v1',browserChecks:[],observations:[]}}
function assess(raw,internal){
 const evidence=validateEvidence(raw),checks=internal||{};
 const browserFailures=evidence.browserChecks.filter(x=>x.status==='fail');
 const referenceFailures=evidence.observations.filter(x=>x.result==='fail');
 const blockers=[];
 if(checks.total===undefined||checks.failed!==0||checks.total<239)blockers.push('Internal regression suite not verified passing');
 for(const browser of PROFILE.requiredBrowsers)for(const check of CHECKS){
  if(!evidence.browserChecks.some(x=>x.browser===browser&&x.check===check&&x.status==='pass'))blockers.push(browser+': '+check+' lacks a passing browser observation');
 }
 for(const model of PROFILE.requiredModels){
  if(!evidence.observations.some(x=>x.model===model&&x.result==='pass'))blockers.push(model+' model has no passing physical/emulator reference');
 }
 if(browserFailures.length)blockers.push(browserFailures.length+' failed browser checks');
 if(referenceFailures.length)blockers.push(referenceFailures.length+' failed reference comparisons');
 if(checks.runtimePassed!==true)blockers.push('Browser runtime health check not verified');
 if(checks.pagesVerified!==true)blockers.push('Public deployment not verified');
 return {schema:'fx991-rc-assessment-v1',version:PROFILE.version,releaseReady:!blockers.length,blockers,counts:{browserChecks:evidence.browserChecks.length,passedBrowserChecks:evidence.browserChecks.filter(x=>x.status==='pass').length,referenceObservations:evidence.observations.length,referenceFailures:referenceFailures.length,internalPassed:checks.passed??null,internalTotal:checks.total??null},status:blockers.length?'NOT READY — evidence incomplete or failures present':'READY FOR HUMAN RELEASE REVIEW'};
}
function addBrowserCheck(raw,entry){let data=validateEvidence(raw);data.browserChecks=data.browserChecks.filter(c=>!(c.browser===entry.browser&&c.platform===entry.platform&&c.check===entry.check));data.browserChecks.push(entry);return validateEvidence(data)}
function addObservation(raw,entry){let data=validateEvidence(raw);data.observations=data.observations.filter(o=>!(o.model===entry.model&&o.caseId===entry.caseId&&o.device===entry.device));data.observations.push(entry);return validateEvidence(data)}
function describeInternal(){if(!global.FX991_TESTS)return {total:0,passed:0,failed:1};let r=global.FX991_TESTS.run();return {total:r.total,passed:r.passed,failed:r.failed}}
global.FX991_RC=Object.freeze({PROFILE,CHECKS,STATUS,fresh,validateEvidence,assess,addBrowserCheck,addObservation,describeInternal});
})(typeof window!=='undefined'?window:globalThis);