/* Milestone 31: real DOM/browser acceptance with isolated calculator instances.
   No external libraries, server calls, or simulated browser success. */
(function(){'use strict';
const $=id=>document.getElementById(id);
const tests=[
 ['Calculator boots without JavaScript exceptions', async x=>{
   expect(x.doc.querySelector('#semantic').textContent.includes('Mode: COMP'),'COMP did not load');
   expect(x.win.FX991_BOOT_DIAGNOSTICS && Array.isArray(x.win.FX991_BOOT_DIAGNOSTICS.errors),'bootstrap error monitor missing');
   expect(x.errors.length===0,'page errors: '+x.errors.join('; '));
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
   for(const key of ['2','ADD','3'])clickKey(x.doc,key);
   expect(x.doc.querySelector('#expression').value==='2+3','keypad did not build 2+3');
   clickKey(x.doc,'=');
   expect(x.doc.querySelector('#semantic').textContent.includes('Result: 5'),'incorrect keypad result');
   clickKey(x.doc,'AC');
   expect(x.doc.querySelector('#expression').value==='','AC did not clear expression');
   for(const key of ['4','MUL','5','='])clickKey(x.doc,key);
   expect(x.doc.querySelector('#semantic').textContent.includes('Result: 20'),'keypad did not calculate after AC');
 }],
 ['Typing in the input field calculates implicit multiplication',async x=>{
   const input=x.doc.querySelector('#expression');input.value='2(3+4)';input.dispatchEvent(new x.win.Event('input',{bubbles:true}));
   x.doc.querySelector('#calculate').click();expect(x.doc.querySelector('#semantic').textContent.includes('Result: 14'),'incorrect result');
 }],
 ['Document keyboard shortcuts evaluate input',async x=>{
   for(const k of ['7','+','8','Enter']){
     const event=new x.win.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true});
     x.doc.dispatchEvent(event);
     expect(event.defaultPrevented,'calculator keyboard shortcut was not handled: '+k);
   }
   const screen=x.doc.querySelector('#semantic');
   expect(screen.textContent.includes('Result: 15'),'keyboard shortcuts failed');
   const before=screen.textContent;
   const input=x.doc.querySelector('#expression');input.focus();
   const textKey=new x.win.KeyboardEvent('keydown',{key:'9',bubbles:true,cancelable:true});
   input.dispatchEvent(textKey);
   expect(!textKey.defaultPrevented,'text entry hijacked while input is focused');
   expect(screen.textContent===before,'calculator changed while text input had keyboard focus');
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
   expect(a.value==='RAD'&&f.value==='Fix','select controls');expect(x.errors.length===0,'script exception');
 }],
 ['Natural display editor preserves structural templates',async x=>{
   clickKey(x.doc,'FRAC');
   expect(x.doc.querySelector('#natural-preview').classList.contains('invalid'),'empty fraction not marked incomplete');
   clickKey(x.doc,'1');clickKey(x.doc,'RIGHT');clickKey(x.doc,'2');
   const preview=x.doc.querySelector('#natural-preview');
   expect(preview.textContent.includes('1')&&preview.textContent.includes('2'),'fraction fields not rendered');
   expect(!preview.classList.contains('invalid'),'completed fraction still marked incomplete');
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
 ['Browser viewport has no horizontal page overflow at narrow width',async x=>{
   const frame=$('fixture'), oldWidth=frame.style.width;
   try { frame.style.width='375px'; await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
     const root=x.doc.documentElement;
     expect(root.clientWidth<=380,'narrow viewport was not applied');
     expect(root.scrollWidth<=root.clientWidth+2,`horizontal page overflow: ${root.scrollWidth} > ${root.clientWidth}`);
   } finally { frame.style.width=oldWidth; }
 }],
 ['Visible input and selectors have programmatic labels',async x=>{
   const controls=[...x.doc.querySelectorAll('input:not([type=hidden]),select')].filter(el=>!el.disabled);
   expect(controls.length>=8,'missing settings controls');
   expect(controls.every(el=>el.labels?.length||el.getAttribute('aria-label')||el.getAttribute('aria-labelledby')),'unlabelled input or select');
 }],
 ['Keyboard-only focus can reach the first calculator key',async x=>{
   const key=x.doc.querySelector('#keypad button');key.focus();
   expect(x.doc.activeElement===key,'keypad key cannot take keyboard focus');
 }],
 ['Session export/import retains a nontrivial matrix register',async x=>{
   const K=x.win.FX991,S=x.win.FX991_SESSION;let st=K.createState();
   st.ui.modeMemory.matrix.A=[[1,2],[3,4]];
   for(const key of ['2','ADD','3'])st=K.dispatchKey(st,key);
   const recovery=x.doc.querySelector('#session-recovery');
   expect(!recovery.checked,'recovery must start disabled');
   recovery.checked=true;recovery.dispatchEvent(new x.win.Event('change',{bubbles:true}));
   expect(S.enabled(x.win.localStorage),'recovery opt-in did not persist');
   const input=x.doc.querySelector('#session-import');
   const data=new x.win.DataTransfer();
   data.items.add(new x.win.File([S.exportJSON(st)],'fixture-session.json',{type:'application/json'}));
   input.files=data.files;input.dispatchEvent(new x.win.Event('change',{bubbles:true}));
   await waitFor(()=>x.doc.querySelector('#session-status').textContent.startsWith('Session restored'),x.win,3000);
   expect(x.doc.querySelector('#expression').value==='2+3','UI session import did not restore expression');
   const saved=x.win.localStorage.getItem(S.KEY);
   expect(!!saved,'opt-in recovery did not store imported session');
   const restored=S.importJSON(saved);
   expect(JSON.stringify(restored.ui.modeMemory.matrix.A||[])===JSON.stringify([[1,2],[3,4]]),'matrix register was lost by UI import/recovery');
   recovery.checked=false;recovery.dispatchEvent(new x.win.Event('change',{bubbles:true}));
   expect(!S.enabled(x.win.localStorage)&&!x.win.localStorage.getItem(S.KEY),'disabling recovery did not clear storage');
 }],
 ['Focus indicator CSS is present for keyboard access',async x=>{
   const a=x.doc.querySelector('#keypad button');const css=[...x.doc.styleSheets].filter(sh=>{try{return !!sh.cssRules}catch(_){return false}}).map(sh=>[...sh.cssRules].map(r=>r.cssText).join(' ')).join(' ');
   expect(css.includes(':focus-visible'),'no keyboard focus styles');expect(a.tabIndex>=0,'key inaccessible');
 }],
 ['Long input remains a bounded accessible control',async x=>{
   const input=x.doc.querySelector('#expression');input.value='1234567890'.repeat(15);input.dispatchEvent(new x.win.Event('input',{bubbles:true}));
   expect(input.isConnected&&input.labels.length>0,'long input disconnected or unlabeled');
 }],
 ['Calculator regression suite passes in browser context',async x=>{
   const r=x.win.FX991_TESTS.run();expect(r.failed===0&&r.total>=448,`${r.passed}/${r.total}, ${r.failed} failed`);
 }]
];
function expect(ok,msg){if(!ok)throw Error(msg)}
async function waitFor(predicate,win,timeoutMs){
  const start=win.performance.now();
  while(!predicate()){
    if(win.performance.now()-start>timeoutMs)throw Error('session UI import timed out');
    await new Promise(resolve=>win.setTimeout(resolve,15));
  }
}
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
 function loaded(){clearTimeout(timeout);frame.removeEventListener('load',loaded);const win=frame.contentWindow,doc=frame.contentDocument;
   const monitor=win && win.FX991_BOOT_DIAGNOSTICS;
   const errors=monitor && Array.isArray(monitor.errors) ? monitor.errors : ['Bootstrap monitor unavailable'];
   resolve({win,doc,errors});}
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
   await new Promise(resolve=>setTimeout(resolve,0));
   expect(x.errors.length===0,'calculator JavaScript errors during interaction: '+x.errors.join('; '));
 }catch(error){status=/timed out|did not initialize/.test(String(error.message))?'BLOCKED':'FAIL';message=String(error.message)}
 entries.push({name,status,message});render()}
 running=false;$('run').disabled=false;
}
$('run').onclick=run;
$('download').onclick=()=>{
 const artifact={schema:'fx991-browser-acceptance',milestone:49,generatedAt:new Date().toISOString(),
 userAgent:navigator.userAgent,location:location.href,summary:$('summary').textContent,
 results:entries.map(x=>({...x}))};
 const u=URL.createObjectURL(new Blob([JSON.stringify(artifact,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.download='fx991-browser-evidence-m49.json';a.href=u;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);
};
run();
})();
