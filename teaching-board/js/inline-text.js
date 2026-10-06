import { el, btn } from './ui.js?v=20261006-parameters';

/** An isolated draft: the board changes only when the user finishes editing. */
export class InlineText {
 constructor(editor,item,existing){
  this.editor=editor;this.item=structuredClone(item);this.existing=existing;
  this.root=el('div',null,'inline-text-editor');
  this.input=el('textarea');this.input.setAttribute('aria-label',item.type==='note'?'Edit sticky note on canvas':'Edit text on canvas');
  this.input.value=item.text||'';this.input.maxLength=10000;this.input.dir='auto';this.input.spellcheck=true;
  this.input.placeholder='Type here…';
  const font=item.fontSize||24,pad=item.type==='note'?14:0;
  Object.assign(this.input.style,{font:`${font}px/1.3 Arial, sans-serif`,padding:`${pad}px`,color:item.stroke||'#203954',background:item.type==='note'&&item.fill!=='none'?(item.fill||'#fff1a8'):'transparent'});
  this.root.append(this.input);
  this.controls=el('div',null,'inline-text-actions');this.controls.setAttribute('aria-label','Text editing actions');
  this.controls.append(el('span','Enter: new line · Ctrl/⌘ Enter: save · Esc: cancel'),btn('Cancel',()=>this.finish(false)),btn('Done',()=>this.finish(true),'primary'));
  editor.area.append(this.root,this.controls);
  this.input.oninput=()=>this.resize();
  this.input.onkeydown=e=>{if(e.isComposing)return;if(e.key==='Escape'||e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();e.stopPropagation();this.finish(e.key!=='Escape');}};
  this.outside=e=>{if(!this.root.contains(e.target)&&!this.controls.contains(e.target))this.finish(true,false);};
  document.addEventListener('pointerdown',this.outside,true);document.addEventListener('focusin',this.outside,true);
  this.resize();this.input.focus();this.input.setSelectionRange(this.input.value.length,this.input.value.length);
 }
 resize(){this.update();this.input.style.height='0px';this.height=Math.min(100000,Math.max(this.item.h,this.input.scrollHeight+2));this.input.style.height=`${this.height}px`;this.update();}
 update(){const i=this.item,v=this.editor.board.viewport;Object.assign(this.root.style,{width:`${i.w}px`,left:`${v.x+i.x*v.zoom}px`,top:`${v.y+i.y*v.zoom}px`,transform:`scale(${v.zoom}) rotate(${i.rotation||0}deg)`,transformOrigin:`${i.w/2}px ${i.h/2}px`});
  // Scaling about the object's center also moves its top-left; compensate so
  // the editable text remains at the same world position at every zoom level.
  this.root.style.left=`${v.x+i.x*v.zoom+(v.zoom-1)*i.w/2}px`;
  this.root.style.top=`${v.y+i.y*v.zoom+(v.zoom-1)*i.h/2}px`;
 }
 finish(save,focus=true){if(this.closed)return;this.closed=true;document.removeEventListener('pointerdown',this.outside,true);document.removeEventListener('focusin',this.outside,true);this.root.remove();this.controls.remove();this.editor.inlineText=null;
  if(save&&this.input.value.trim())this.editor.applyText(this.item,this.input.value,this.height,this.existing);
  else this.editor.paint();
  if(focus&&!this.editor.disposed)this.editor.svg.focus();
 }
}
