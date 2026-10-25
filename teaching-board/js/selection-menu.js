import {el,btn,notify} from './ui.js?v=20261017-history-budget';
import {expandGroups} from './groups.js?v=20261024-image-actions';
import {BOARD_CLIPBOARD} from './clipboard.js?v=20261017-history-budget';
import {validateBoard} from './model.js?v=20261024-image-actions';
const PREFIX='teaching-board-selection:';
export function selectionItems(e){return e.board.items.filter(i=>e.selected.has(i.id));}
export async function copySelection(e){
 const items=selectionItems(e);if(!items.length)return false;e.clipboard=structuredClone(items);
 try{await navigator.clipboard.writeText(PREFIX+JSON.stringify(items));}catch{notify('Copied within this board. Use Ctrl+C to copy to another app.');}
 return !e.disposed;
}
export async function cutSelection(e){
 const before=JSON.stringify(selectionItems(e));if(!await copySelection(e))return;
 if(JSON.stringify(selectionItems(e))!==before){notify('Selection changed; the original selection was copied but not cut.');return;}
 e.remove();
}
export async function exportSelection(e){
 const d=el('dialog',null,'form-dialog'),select=el('select');select.setAttribute('aria-label','Selection export format');
 for(const [value,label] of [['png','PNG image'],['svg','SVG image'],['pdf','PDF']]){const o=el('option',label);o.value=value;select.append(o);}
 let format=null;const actions=el('div',null,'actions');actions.append(btn('Cancel',()=>d.close()),btn('Continue',()=>{format=select.value;d.close();}));d.append(el('h2','Export selection'),select,actions);document.body.append(d);d.showModal();await new Promise(resolve=>{d.onclose=()=>{d.remove();resolve();};});if(format&&!e.disposed)await e.exportFromMenu(format,'selection');
}
export async function pasteSelection(e){
 try{
  const text=await navigator.clipboard.readText();
  if(text.startsWith(PREFIX)){if(text.length>25000000)throw new Error('Clipboard selection is too large.');const items=JSON.parse(text.slice(PREFIX.length));validateBoard({...e.board,items});if(!e.disposed)e.paste(items);return;}
  if(navigator.clipboard.read){const entries=await navigator.clipboard.read(),files=[];for(const entry of entries)for(const type of entry.types)if(type.startsWith('image/')){const blob=await entry.getType(type);files.push(new File([blob],'clipboard-image',{type}));break;}if(files.length){if(!e.disposed)await e.pasteImages(files);return;}}
 }catch{/* Browsers can deny clipboard reads; board-local copies still work. */}
 if(e.clipboard?.length)e.paste();else notify('Use Ctrl+V to paste an image from your clipboard.');
}
export class SelectionMenu{
 constructor(e){this.e=e;this.root=el('div',null,'selection-context-menu');this.root.hidden=true;this.root.setAttribute('role','menu');this.root.setAttribute('aria-label','Selection actions');document.body.append(this.root);
 this.outside=event=>{if(!this.root.contains(event.target))this.close();};document.addEventListener('pointerdown',this.outside,true);
 this.longStart=event=>{if(e.inlineText||e.tool!=='select'||!['touch','pen'].includes(event.pointerType))return;this.longPoint={x:event.clientX,y:event.clientY};this.longTimer=setTimeout(()=>{e.drag=null;e.draft=null;Object.assign(e.board,structuredClone(e.history.current));e.paint();this.open(event);this.longPoint=null;},850);};this.longCancel=()=>{clearTimeout(this.longTimer);this.longPoint=null;};this.longMove=event=>{if(this.longPoint&&Math.hypot(event.clientX-this.longPoint.x,event.clientY-this.longPoint.y)>8)this.longCancel();};e.svg.addEventListener('pointerdown',this.longStart);e.svg.addEventListener('pointermove',this.longMove);e.svg.addEventListener('pointerup',this.longCancel);e.svg.addEventListener('pointercancel',this.longCancel);
 this.root.onkeydown=event=>{const buttons=[...this.root.querySelectorAll('button:not(:disabled)')],at=buttons.indexOf(document.activeElement);if(event.key==='Escape'){event.preventDefault();event.stopPropagation();this.close();e.svg.focus();}else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();event.stopPropagation();const n=event.key==='Home'?0:event.key==='End'?buttons.length-1:(at+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[n]?.focus();}};
 }
 open(event){
  const e=this.e;if(e.inlineText||e.drag)return;event.preventDefault();
  const id=event.target.closest?.('[data-id]')?.getAttribute('data-id');if(id&&!e.selected.has(id)){e.setTool('select');e.selected=expandGroups(e.board.items,new Set([id]));e.paint();}
  const items=selectionItems(e),has=items.length>0,editable=has&&items.every(i=>!e.isLocked(i));this.root.replaceChildren();
  const add=(name,fn,enabled=true)=>{const b=btn(name,()=>{this.close();e.action(fn);});b.setAttribute('role','menuitem');b.disabled=!enabled;this.root.append(b);};
  const sep=()=>this.root.append(el('hr'));
  add('Duplicate',()=>e.duplicate(),has);add(items.some(i=>e.isBackgroundLocked(i))?'Unlock':'Lock to Background',()=>e.lockSelectionToBackground(),editable);sep();
  add('Cut',()=>cutSelection(e),editable);add('Copy',()=>copySelection(e),has);add('Paste',()=>pasteSelection(e));sep();
  add('Group',()=>e.groupSelection(),editable&&items.length>1);add('Ungroup',()=>e.ungroupSelection(),editable&&items.some(i=>i.groupId));sep();
  add('Bring to Front',()=>e.layer(true),editable);add('Send to Back',()=>e.layer(false),editable);sep();
  add('Save as snippet',()=>e.snippets.saveSelection(),has);add('Export selection',()=>exportSelection(e),has);add('Delete',()=>e.remove(),editable);
  this.root.hidden=false;this.root.style.left='0px';this.root.style.top='0px';const r=this.root.getBoundingClientRect();this.root.style.left=Math.max(6,Math.min(event.clientX,innerWidth-r.width-6))+'px';this.root.style.top=Math.max(6,Math.min(event.clientY,innerHeight-r.height-6))+'px';this.root.querySelector('button:not(:disabled)')?.focus();
 }
 close(){this.root.hidden=true;}
 dispose(){this.longCancel();this.e.svg.removeEventListener('pointerdown',this.longStart);this.e.svg.removeEventListener('pointermove',this.longMove);this.e.svg.removeEventListener('pointerup',this.longCancel);this.e.svg.removeEventListener('pointercancel',this.longCancel);document.removeEventListener('pointerdown',this.outside,true);this.root.remove();}
}
