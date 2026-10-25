import {dragCrop,croppedFrame} from './crop-geometry.js?v=20261024-image-actions';
import { el, btn, field } from './ui.js?v=20261017-history-budget';
import { loadImage } from './media.js?v=20261017-history-budget';
export function validCrop(c){return c&&['x','y','w','h'].every(k=>Number.isFinite(c[k]))&&c.x>=0&&c.y>=0&&c.w>=.001&&c.h>=.001&&c.x+c.w<=1.000001&&c.y+c.h<=1.000001;}
export async function cropDialog(item){
 const image=await loadImage(item.src),d=el('dialog',null,'crop-dialog'),stage=el('div',null,'crop-stage'),img=el('img'),box=el('div',null,'crop-box');img.src=item.src;img.alt='Original image';img.draggable=false;stage.append(img,box);for(const handle of ['nw','n','ne','e','se','s','sw','w']){const grip=el('span',null,'crop-handle crop-'+handle);grip.dataset.cropHandle=handle;grip.setAttribute('aria-hidden','true');box.append(grip);}let crop={...(item.crop||{x:0,y:0,w:1,h:1})},start=null,result=null;
 const inputs={},fields=el('div',null,'crop-fields'),error=el('p',null,'error');
 function paint(){box.style.cssText=`left:${crop.x*100}%;top:${crop.y*100}%;width:${crop.w*100}%;height:${crop.h*100}%`;for(const k in inputs)inputs[k].value=+(crop[k]*100).toFixed(2);}
 for(const [k,label]of [['x','Left %'],['y','Top %'],['w','Width %'],['h','Height %']]){const f=field(label,crop[k]*100,'number');f.input.min=0;f.input.max=100;f.input.step=.1;inputs[k]=f.input;f.input.onchange=()=>{const next=Object.fromEntries(Object.entries(inputs).map(([key,input])=>[key,+input.value/100]));if(validCrop(next)){crop=next;error.textContent='';paint();}else error.textContent='The crop must stay inside the image and have a positive size.';};fields.append(f.wrap);}
 const point=e=>{const r=stage.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))};};
 stage.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();const full=crop.x===0&&crop.y===0&&crop.w===1&&crop.h===1;start={point:point(e),crop:{...crop},handle:e.target.dataset.cropHandle||(box.contains(e.target)&&!full?'move':'new')};stage.setPointerCapture(e.pointerId);};
 stage.onpointermove=e=>{if(!start)return;const next=dragCrop(start.crop,start.point,point(e),start.handle);if(validCrop(next)){crop=next;error.textContent='';paint();}};
 stage.onpointerup=e=>{if(start)stage.onpointermove(e);start=null;};stage.onpointercancel=()=>{if(start){crop=start.crop;paint();}start=null;};

 const actions=el('div',null,'actions');actions.append(btn('Reset crop',()=>{crop={x:0,y:0,w:1,h:1};error.textContent='';paint();}),btn('Cancel',()=>d.close()),btn('Apply crop',()=>{const next=Object.fromEntries(Object.entries(inputs).map(([key,input])=>[key,+input.value/100]));if(!validCrop(next)){error.textContent='Enter a valid crop inside the image.';return;}crop=next;result=croppedFrame(item,crop);d.close();},'primary'));
 d.append(el('h2','Crop image'),el('p','Drag a new crop on the image, move the crop box, or resize its eight handles. You can also enter percentages. The original is preserved.'),stage,fields,error,actions);document.body.append(d);paint();d.showModal();return new Promise(resolve=>{d.onclose=()=>{d.remove();resolve(result);};});
}
