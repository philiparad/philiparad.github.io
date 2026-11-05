/* M32 — Offline, provenance-preserving cross-browser evidence aggregation.
   Imported evidence is data only. No network calls or dynamic code execution. */
(function (global) {'use strict';
const SCHEMA='fx991-browser-acceptance', MAX_BYTES=512000;
const BROWSERS=['chromium','firefox','webkit'], MIN_TESTS=18;
function classify(ua){
  ua=String(ua||'');
  if(/(?:Firefox|FxiOS)\//i.test(ua))return 'firefox';
  if(/(?:Edg|Chrome|Chromium|CriOS)\//i.test(ua))return 'chromium';
  if(/AppleWebKit\//i.test(ua)&&/(?:Safari|Version)\//i.test(ua))return 'webkit';
  return 'unknown';
}
function parse(input){
  if(typeof input!=='string'||new TextEncoder().encode(input).length>MAX_BYTES)throw Error('Evidence exceeds size limit or is not text');
  let obj;try{obj=JSON.parse(input)}catch(_){throw Error('Evidence is not valid JSON')}
  if(!obj||typeof obj!=='object'||Array.isArray(obj)||obj.schema!==SCHEMA)throw Error('Unknown evidence schema');
  if(!Number.isInteger(obj.milestone)||obj.milestone<31||obj.milestone>1000)throw Error('Unsupported evidence milestone');
  if(typeof obj.userAgent!=='string'||obj.userAgent.length>1024)throw Error('Invalid user agent');
  if(typeof obj.generatedAt!=='string'||!Number.isFinite(Date.parse(obj.generatedAt)))throw Error('Invalid capture time');
  if(!Array.isArray(obj.results)||obj.results.length<1||obj.results.length>128)throw Error('Invalid results');
  const seen=new Set();
  const results=obj.results.map((r,i)=>{
    if(!r||typeof r.name!=='string'||!r.name.trim()||r.name.length>180||seen.has(r.name))throw Error('Invalid or duplicate test name at '+i);
    seen.add(r.name);
    if(!['PASS','FAIL','BLOCKED'].includes(r.status))throw Error('Invalid test status');
    if(r.message!==undefined&&(typeof r.message!=='string'||r.message.length>1500))throw Error('Invalid test message');
    return {name:r.name,status:r.status,message:r.message||''};
  });
  return {schema:SCHEMA,milestone:obj.milestone,generatedAt:new Date(obj.generatedAt).toISOString(),
    userAgent:obj.userAgent,browser:classify(obj.userAgent),results,
    location:typeof obj.location==='string'?obj.location.slice(0,300):''};
}
function summarize(reports){
  if(!Array.isArray(reports)||reports.length>100)throw Error('Invalid evidence collection');
  const byBrowser={};const names=new Set();
  for(const r of reports){if(!r||!BROWSERS.includes(r.browser))continue;
    if(!byBrowser[r.browser]||Date.parse(r.generatedAt)>Date.parse(byBrowser[r.browser].generatedAt))byBrowser[r.browser]=r;
    r.results.forEach(t=>names.add(t.name));
  }
  const rows=[...names].sort().map(name=>{
    const statuses={};for(const b of BROWSERS)statuses[b]=(byBrowser[b]?.results.find(t=>t.name===name)||{}).status||'MISSING';
    return {name,statuses};
  });
  const coverage={};for(const b of BROWSERS){const r=byBrowser[b];coverage[b]={present:!!r,total:r?r.results.length:0,pass:r?r.results.filter(t=>t.status==='PASS').length:0,
    fail:r?r.results.filter(t=>t.status==='FAIL').length:0,blocked:r?r.results.filter(t=>t.status==='BLOCKED').length:0};}
  const ready=BROWSERS.every(b=>coverage[b].present&&coverage[b].total>=MIN_TESTS&&coverage[b].fail===0&&coverage[b].blocked===0&&coverage[b].pass===coverage[b].total)
    &&rows.every(row=>BROWSERS.every(b=>row.statuses[b]==='PASS'));
  const blockers=[];for(const b of BROWSERS){let c=coverage[b];if(!c.present)blockers.push('Missing '+b+' evidence');else {if(c.total<MIN_TESTS)blockers.push(b+': insufficient test coverage ('+c.total+'/'+MIN_TESTS+')');if(c.fail||c.blocked)blockers.push(b+': '+c.fail+' failed, '+c.blocked+' blocked');}}
  if(rows.some(row=>BROWSERS.some(b=>row.statuses[b]==='MISSING')))blockers.push('Different test coverage across browsers');
  return {ready,coverage,rows,blockers,selected:byBrowser};
}
function evidenceJSON(report){return JSON.stringify({schema:'fx991-cross-browser-report',milestone:32,generatedAt:new Date().toISOString(),
  verified:false,ready:report.ready,coverage:report.coverage,blockers:report.blockers,tests:report.rows},null,2)}
global.FX991_BROWSER_EVIDENCE=Object.freeze({SCHEMA,MAX_BYTES,BROWSERS,classify,parse,summarize,evidenceJSON});
})(typeof window!=='undefined'?window:globalThis);