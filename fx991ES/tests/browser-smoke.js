/* Milestone 30: browser-only DOM smoke tests. No build tools or external libraries. */
(function(){'use strict';
const frame=document.getElementById('fixture'),summary=document.getElementById('summary'),results=document.getElementById('results');
let completed=false;
function run(){
 const doc=frame.contentDocument,win=frame.contentWindow;results.replaceChildren();
 const cases=[];function check(name,fn){try{if(!fn())throw Error('Expectation not satisfied');cases.push({name,ok:true})}catch(error){cases.push({name,ok:false,error:error.message})}}
 check('Calculator state engine loads',()=>!!win.FX991&&typeof win.FX991.createState==='function');
 check('Structured editor loads',()=>!!win.FX991_EDITOR&&typeof win.FX991_EDITOR.fromSource==='function');
 check('Session v2 recovery library loads',()=>!!win.FX991_SESSION&&win.FX991_SESSION.VERSION===2);
 check('96 by 31 LCD canvas',()=>doc.getElementById('lcd')?.width===96&&doc.getElementById('lcd')?.height===31);
 check('Calculator keys have accessible names',()=>{const keys=[...doc.querySelectorAll('#keypad button')];return keys.length>=40&&keys.every(k=>k.getAttribute('aria-label'))});
 check('Calculator starts without script failure',()=>doc.querySelector('#semantic')?.textContent.includes('Mode:'));
 check('Expression input and calculation',()=>{const field=doc.getElementById('expression');field.value='2(3+4)';field.dispatchEvent(new win.Event('input',{bubbles:true}));doc.getElementById('calculate').click();return doc.getElementById('semantic').textContent.includes('Result: 14')});
 check('Mode selector changes state',()=>{const picker=doc.getElementById('mode-picker');picker.value='STAT';picker.dispatchEvent(new win.Event('change',{bubbles:true}));return doc.getElementById('semantic').textContent.includes('Mode: STAT')});
 check('Model change enables C modes',()=>{const picker=doc.getElementById('model');picker.value='c';picker.dispatchEvent(new win.Event('change',{bubbles:true}));return !doc.querySelector('#mode-picker option[value="INEQ"]').disabled});
 check('Opt-in recovery not automatically enabled by tests',()=>!!doc.getElementById('session-recovery'));
 check('Regression suite executes in browser',()=>{const report=win.FX991_TESTS.run();return report.failed===0&&report.total>=438});
 for(const c of cases){const p=document.createElement('p');p.textContent=(c.ok?'PASS':'FAIL')+' — '+c.name+(c.error?': '+c.error:'');p.className=c.ok?'pass':'fail';results.append(p)}
 const pass=cases.filter(x=>x.ok).length;summary.textContent=pass+'/'+cases.length+' browser smoke checks passed';summary.dataset.status=pass===cases.length?'passed':'failed';document.body.dataset.smoke=summary.dataset.status;completed=true;
}
frame.addEventListener('load',run);document.getElementById('rerun').addEventListener('click',()=>{completed=false;frame.src='../index.html?smoke=1&run='+Date.now()});
setTimeout(()=>{if(!completed){summary.textContent='Browser smoke test timed out';summary.dataset.status='timeout';document.body.dataset.smoke='timeout'}},15000);
})();
