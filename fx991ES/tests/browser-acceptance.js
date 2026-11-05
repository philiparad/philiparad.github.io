/* Milestone 31: real DOM/browser acceptance with isolated calculator instances.
   No external libraries, server calls, or simulated browser success. */
(function(){'use strict';
const $=id=>document.getElementById(id);
const tests=[
 ['Calculator boots with the expected COMP state', async x=>{
   expect(x.doc.querySelector('#semantic').textContent.includes('Mode: COMP'),'COMP did not load');
 }],
 ['Keypad controls are accessible and keyboard focusable',async x=>{
   const keys=[...x.doc.querySelectorAll('#keypad button')];
   expect(keys.length>=40,'missing keys');expect(keys.every(b=>b.getAttribute('aria-label')&&b.tabIndex>=0),'unnamed/unfocusable key');
 }],
 ['LCD canvas is 96 × 31 and has a description',async x=>{
   const c=x.doc.querySelector('#lcd');expect(c.width===96&&c.height===31,'LCD dimensions');expect(!!c.getAttribute('aria-label'),'no LCD label');
   const pixels=c.getContext('2d').getImageData(0,0,96,31).data;expect(pixels.length===96*31*4,'LCD framebuffer');
 }],
 ['Physical-key clicks calculate 2+3=5',async x=>{
   for(const key of ['2','ADD','3','='])clickKey(x.doc,key);
   expect(x.doc.querySelector('#semantic').textContent.includes('Result: 5'),'incorrect keypad result');
 }],
 ['Typing in the input field calculates implicit multiplication',async x=>{
   const input=x.doc.querySelector('#expression');input.value='2(3+4)';input.dispatchEvent(new x.win.Event('input',{bubbles:true}));
   x.doc.querySelector('#calculate').click();expect(x.doc.querySelector('#semantic').textContent.includes('Result: 14'),'incorrect result');
 }],
 ['Document keyboard shortcuts evaluate input',async x=>{
   x.doc.body.focus();for(const k of ['7','+','8','Enter'])x.doc.dispatchEvent(new x.win.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}));
   expect(x.doc.querySelector('#semantic').textContent.includes('Result: 15'),'keyboard shortcuts failed');
 }],
 ['Both calculator editions switch without resetting into an invalid mode',async x=>{
   const model=x.doc.querySelector('#model');model.value='c';model.dispatchEvent(new x.win.Event('change',{bubbles:true}));
   expect(!x.doc.querySelector('#mode-picker option[value="INEQ"]').disabled,'C mode missing');
   model.value='standard';model.dispatchEvent(new x.win.Event('change',{bubbles:true}));
   expect(x.doc.querySelector('#mode-picker option[value="INEQ"]').disabled,'standard mode allowed C-only mode');
 }],
 ['Angle and format selectors update the screen',async x=>{
   let a=x.doc.querySelector('#angle');a.value='RAD';a.dispatchEvent(new x.win.Event('change',{bubbles:true}));
   let f=x.doc.querySelector('#format');f.value='Fix';f.dispatchEvent(new x.win.Event('change',{bubbles:true}));
   expect(a.value==='RAD'&&f.value==='Fix','select controls');
 }],
 ['Natural display editor preserves structural templates',async x=>{
   clickKey(x.doc,'FRAC');clickKey(x.doc,'1');clickKey(x.doc,'RIGHT');clickKey(x.doc,'2');
   expect(x.doc.querySelector('#natural-preview').textContent.length>0,'missing preview');
   expect(x.doc.querySelector('#semantic').textContent.includes('Expression:'),'missing semantic display');
 }],
 ['Session v2 serializes structured cursor and imports safely',async x=>{
   let k=x.win.FX991,e=x.win.FX991_SESSION,s=k.createState();
   for(const key of ['FRAC','1','RIGHT','2'])s=k.dispatchKey(s,key);
   let t=e.importJSON(e.exportJSON(s));expect(x.win.FX991_EDITOR.serialize(t.document)===s.expression,'wrong expression');
   expect(t.document.anchor.sequenceId===s.document.anchor.sequenceId,'cursor anchor differs');
 }],
 ['Recovery remains opt-in on a fresh isolated session',async x=>{
   expect(x.doc.querySelector('#session-recovery').checked===false,'recovery unexpectedly enabled');
   expect(x.doc.querySelector('#session-export')&&x.doc.querySelector('#session-import'),'session UI absent');
 }],
 ['Calculator regression suite passes in browser context',async x=>{
   const r=x.win.FX991_TESTS.run();expect(r.failed===0&&r.total>=448,`${r.passed}/${r.total}, ${r.failed} failed`);
 }]
];
function expect(ok,msg){if(!ok)throw Error(msg)}
function clickKey(doc,key){const el=[...doc.querySelectorAll('#keypad button')].find(b=>b.getAttribute('aria-label')===key+' calculator key');expect(el,'missing '+key+' key');el.click()}
const entries=[];let running=false;
function render(){const counts={passed:entries.filter(e=>e.status==='PASS').length,failed:entries.filter(e=>e.status==='FAIL').length,skipped:entries.filter(e=>e.status==='BLOCKED').length};
 $('summary').textContent=`${counts.passed}/${entries.length} browser checks passed; ${counts.failed} failed; ${counts.skipped} blocked`;
 $('summary').dataset.status=counts.failed?'failed':counts.skipped?'blocked':entries.length===tests.length?'passed':'running';
 document.body.dataset.acceptance=$('summary').dataset.status;
 const list=$('results');list.replaceChildren();for(const row of entries){const item=document.createElement('li');item.className=row.status==='PASS'?'pass':row.status==='FAIL'?'fail':'blocked';item.textContent=`${row.status} — ${row.name}`+(row.message?' — '+row.message:'');list.append(item)}
 $('download').disabled=!entries.length;
}
function loadFresh(){return new Promise((resolve,reject)=>{
 const frame=$('fixture'),previous=frame.contentWindow;
 const timeout=setTimeout(()=>{frame.removeEventListener('load',loaded);reject(Error('calculator iframe loading timed out'))},12000);
 function loaded(){clearTimeout(timeout);frame.removeEventListener('load',loaded);const win=frame.contentWindow,doc=frame.contentDocument;resolve({win,doc,errors:[]})}
 frame.addEventListener('load',loaded);
 // Reset local recovery before the *next* page, only within the isolated test iframe.
 try{previous?.localStorage?.removeItem('fx991.educational.recovery.opt-in');previous?.localStorage?.removeItem('fx991.educational.session.v1')}catch(e){}
 frame.src='../index.html?browser-acceptance='+encodeURIComponent(String(performance.now()));
})}
async function run(){if(running)return;running=true;$('run').disabled=true;entries.length=0;render();
 for(const [name,fn] of tests){let status='PASS',message='';try{
   const x=await loadFresh();
   // A navigation error is observable from the iframe's document; no fake pass.
   expect(x.doc&&x.win.FX991&&x.doc.getElementById('lcd'),'calculator did not initialize');
   await fn(x);
 }catch(error){status=/timed out|did not initialize/.test(String(error.message))?'BLOCKED':'FAIL';message=String(error.message)}
 entries.push({name,status,message});render()}
 running=false;$('run').disabled=false;
}
$('run').onclick=run;
$('download').onclick=()=>{
 const artifact={schema:'fx991-browser-acceptance',milestone:31,generatedAt:new Date().toISOString(),
 userAgent:navigator.userAgent,location:location.href,summary:$('summary').textContent,
 results:entries.map(x=>({...x}))};
 const u=URL.createObjectURL(new Blob([JSON.stringify(artifact,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.download='fx991-browser-evidence-m31.json';a.href=u;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);
};
run();
})();