import {endpointControls} from './graph-endpoints.js?v=20261014-rich-export';
import {el,btn,field} from './ui.js?v=20261014-rich-export';
export function piecewiseControls(row,index,redraw,schedule){
 const root=el('div',null,'piecewise-controls');
 root.append(el('p','Choose which endpoints each branch includes. Blank bounds are unbounded; branches must not overlap.','muted'));
 row.branches.forEach((branch,k)=>{
  const block=el('div',null,'graph-curve-block');block.append(el('h4',`Branch ${k+1}`));
  for(const [key,label,type]of [['source','Expression','text'],['domainMin','Minimum x','number'],['domainMax','Maximum x','number']]){const f=field(label,branch[key]??'',type);f.input.setAttribute('aria-label',`Curve ${index+1} branch ${k+1} ${label.toLowerCase()}`);if(type==='number'){f.input.step='any';f.input.placeholder='Unbounded';}f.input.oninput=()=>{if(type==='text')branch[key]=f.input.value;else if(f.input.validity.badInput)branch[key]=NaN;else if(f.input.value==='')delete branch[key];else branch[key]=+f.input.value;schedule();};block.append(f.wrap);}
  block.append(endpointControls(branch,`Curve ${index+1} branch ${k+1}`,schedule,true));
  const remove=btn(`Remove branch ${k+1}`,()=>{row.branches.splice(k,1);redraw();schedule();});remove.disabled=row.branches.length===1;block.append(remove);root.append(block);
 });
 const add=btn('+ Add branch',()=>{const last=row.branches.at(-1),lo=last?.domainMax??0;row.branches.push({source:'x',domainMin:lo,domainMax:lo+5});redraw();schedule();});add.disabled=row.branches.length>=8;root.append(add);return root;
}
