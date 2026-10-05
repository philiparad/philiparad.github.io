import { el, btn } from './ui.js?v=20261005-viewport';
import { script, equation } from './media.js?v=20261005-viewport';
export const EQUATION_TEMPLATES=[['Fraction','\\frac{#0}{#?}'],['Square root','\\sqrt{#0}'],['Power','{#0}^{#?}'],['Subscript','{#0}_{#?}'],['Integral','\\int_{#?}^{#?} #0\\,dx'],['Sum','\\sum_{#?}^{#?} #0'],['Matrix','\\begin{pmatrix}#? & #? \\\\ #? & #?\\end{pmatrix}'],['Brackets','\\left(#0\\right)'],['π','\\pi'],['θ','\\theta'],['≤','\\le'],['≥','\\ge'],['±','\\pm'],['∞','\\infty']];
export function equationDialog(source='y=\\frac{1}{2}x^2'){
 const d=el('dialog',null,'form-dialog math-dialog'),heading=el('h2','Visual equation editor'),palette=el('div',null,'math-palette'),host=el('div'),details=el('details'),summary=el('summary','LaTeX source'),input=el('textarea'),preview=el('img'),status=el('p','Loading visual editor…','muted'),actions=el('div',null,'actions');input.value=source;input.setAttribute('aria-label','LaTeX source');preview.alt='Equation preview';preview.className='equation-preview';details.append(summary,input);let mf=null,closed=false,timer,serial=0;
 d.append(heading,palette,host,details,status,preview,actions);document.body.append(d);
 function current(){return input.value;}
 async function update(){const id=++serial;try{const value=await equation(current());if(closed||id!==serial)return;preview.src=value.src;status.textContent='Preview ready. Insert templates, then fill their placeholders.';}catch(e){if(!closed&&id===serial){status.textContent=e.message;preview.removeAttribute('src');}}}
 function schedule(){clearTimeout(timer);timer=setTimeout(update,250);}
 input.oninput=()=>{if(mf)mf.value=input.value;schedule();};
 const promise=new Promise(resolve=>{let result=null;const save=btn('Insert equation',async()=>{try{result=await equation(current());if(!closed)d.close();}catch(e){status.textContent=e.message;}},'primary');actions.append(btn('Cancel',()=>d.close()),save);d.onclose=()=>{closed=true;clearTimeout(timer);serial++;d.remove();resolve(result);};});
 d.showModal();update();
 (async()=>{try{await script('https://cdn.jsdelivr.net/npm/mathlive@0.108.3');if(closed)return;await customElements.whenDefined('math-field');if(closed)return;mf=el('math-field');mf.setAttribute('aria-label','Editable equation');mf.setAttribute('math-virtual-keyboard-policy','manual');host.append(mf);mf.value=input.value;mf.addEventListener('input',()=>{input.value=mf.value;schedule();});for(const [label,latex]of EQUATION_TEMPLATES)palette.append(btn(label,()=>{mf.focus();mf.insert(latex,{selectionMode:'placeholder'});input.value=mf.value;schedule();}));status.textContent='Type directly in the equation, or insert a template.';mf.focus();}catch(e){details.open=true;status.textContent='Visual editor could not load. You can still edit the LaTeX source and preview it.';input.focus();}})();
 return promise;
}
