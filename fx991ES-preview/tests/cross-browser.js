/* Browser-only report viewer. Imported JSON is handled as inert text. */
(function(){'use strict';
const E=window.FX991_BROWSER_EVIDENCE,$=id=>document.getElementById(id),reports=[];
function download(name,content){const u=URL.createObjectURL(new Blob([content],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)}
function render(){const result=E.summarize(reports),c=$('coverage'),t=$('comparisons');c.replaceChildren();t.replaceChildren();
 for(const browser of E.BROWSERS){const x=result.coverage[browser],item=document.createElement('li');item.textContent=browser+': '+(x.present?`${x.pass}/${x.total} passed; ${x.fail} failed; ${x.blocked} blocked`:'NO CAPTURE');c.append(item)}
 for(const r of result.rows){const tr=document.createElement('tr');for(const v of [r.name,...E.BROWSERS.map(b=>r.statuses[b])]){const td=document.createElement('td');td.textContent=v;tr.append(td)}t.append(tr)}
 $('status').textContent=result.ready?'All three browser evidence sets agree and passed (not device certification).':'Not browser-qualified: '+(result.blockers.join('; ')||'No evidence');
 $('status').dataset.ready=String(result.ready);$('export').disabled=!reports.length;}
 $('files').addEventListener('change',async ev=>{const files=Array.from(ev.target.files||[]);let accepted=0,errors=[];
 for(const f of files){try{if(f.size>E.MAX_BYTES)throw Error('file too large');const r=E.parse(await f.text());reports.push(r);accepted++}catch(e){errors.push(f.name+': '+e.message)}}
 $('import-message').textContent=`Imported ${accepted} file(s).`+(errors.length?' Rejected '+errors.join('; '):'');ev.target.value='';render()});
 $('clear').onclick=()=>{reports.length=0;$('import-message').textContent='All loaded evidence cleared from this page.';render()};
 $('export').onclick=()=>download('fx991-cross-browser-summary-m32.json',E.evidenceJSON(E.summarize(reports)));
 render();
})();