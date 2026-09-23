export function el(tag, text, className) { const n=document.createElement(tag); if(text!=null)n.textContent=text; if(className)n.className=className; return n; }
let toastTimer;
export function notify(text) { const s=document.querySelector('#status'); s.textContent=text; clearTimeout(toastTimer); toastTimer=setTimeout(()=>s.textContent='',6500); }
export function btn(text, action, cls='') { const b=el('button',text,cls); b.type='button'; b.onclick=async()=>{b.disabled=true;try{await action();}catch(e){notify(e.message);}finally{b.disabled=false;}};return b; }
export function field(label, value='', type='text') { const wrap=el('label',label), input=el(type==='textarea'?'textarea':'input'); if(type!=='textarea')input.type=type; input.value=value; input.dir='auto'; wrap.append(input);return {wrap,input}; }
export async function formDialog(title, fields, options={}) {
 const d=el('dialog',null,'form-dialog'), f=el('form'), content=el('div'); f.method='dialog'; f.append(el('h2',title));
 const inputs={}; for(const [key,label,value,type] of fields){const v=field(label,value,type);inputs[key]=v.input;if(type==='number')v.input.step='any';content.append(v.wrap);}f.append(content);
 if(options.note)f.append(el('p',options.note,'muted'));
 const error=el('p',null,'error'), actions=el('div',null,'actions'); const cancel=btn('Cancel',()=>d.close());
 const save=el('button',options.submit||'Apply','primary');save.type='submit';actions.append(cancel,save);f.append(error,actions);d.append(f);document.body.append(d);
 return new Promise(resolve=>{let result=null; f.onsubmit=async event=>{event.preventDefault();save.disabled=true;try{const values=Object.fromEntries(Object.entries(inputs).map(([k,n])=>[k,n.value]));result=options.validate?await options.validate(values):values;d.close();}catch(e){error.textContent=e.message;}finally{save.disabled=false;}};d.onclose=()=>{d.remove();resolve(result);};d.showModal();Object.values(inputs)[0]?.focus();});
}
export async function confirmDialog(title, note) { return Boolean(await formDialog(title,[],{note,submit:'Confirm'})); }
export function download(blob, name) { const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000); }
export const filename=title=>(title.replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,80)||'lesson');
export function chooseFile(accept,multiple=false){return new Promise(resolve=>{const input=el('input');input.type='file';input.accept=accept;input.multiple=multiple;input.onchange=()=>{resolve([...input.files]);input.remove();};input.oncancel=()=>{resolve([]);input.remove();};input.hidden=true;document.body.append(input);input.click();});}
