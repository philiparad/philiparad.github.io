import {equationDialog} from './equation-editor.js?v=20261015-lifecycle';
import {equationNode} from './inline-equation.js?v=20261015-lifecycle';
import {readRichDocument,writeRuns,validateRuns,validateParagraphs} from './rich-text.js?v=20261015-lifecycle';
import { el, btn } from './ui.js?v=20261015-lifecycle';

/** An isolated draft: the board changes only when the user finishes editing. */
export class InlineText {
 constructor(editor,item,existing){
  this.editor=editor;this.item=structuredClone(item);this.existing=existing;
  this.root=el('div',null,'inline-text-editor');
  this.input=el('div');this.input.contentEditable='true';this.input.setAttribute('role','textbox');this.input.setAttribute('aria-multiline','true');this.input.setAttribute('aria-label',item.type==='note'?'Edit sticky note on canvas':'Edit text on canvas');
  writeRuns(this.input,item);this.input.dir='auto';this.input.spellcheck=true;
  this.input.dataset.placeholder='Type here…';
  const font=item.fontSize||24,pad=item.type==='note'?14:0;
  Object.assign(this.input.style,{font:`${(item.textStyle||'').includes('italic')?'italic':'normal'} ${(item.textStyle||'').includes('bold')?'700':'400'} ${font}px/1.3 Arial, sans-serif`,textAlign:item.textAlign&&item.textAlign!=='auto'?item.textAlign:'start',padding:`${pad}px`,color:item.stroke||'#203954',background:item.type==='note'&&item.fill!=='none'?(item.fill||'#fff1a8'):'transparent'});
  this.root.append(this.input);
  this.controls=el('div',null,'inline-text-actions');this.controls.setAttribute('aria-label','Text editing actions');
  this.addFormatting();
  this.controls.append(el('span','Enter: new line · Ctrl/⌘ Enter: save · Esc: cancel'),btn('Cancel',()=>this.finish(false)),btn('Done',()=>this.finish(true),'primary'));
  editor.area.append(this.root,this.controls);
  this.input.oninput=()=>this.resize();
  this.input.onpaste=e=>{e.preventDefault();document.execCommand('insertText',false,e.clipboardData.getData('text/plain').slice(0,10000));this.resize();};
  this.input.ondrop=e=>e.preventDefault();
  this.input.ondblclick=e=>{const node=e.target.closest('.inline-equation');if(node){e.preventDefault();this.editEquation(node);}};
  this.input.onkeydown=e=>{if(e.isComposing)return;if(e.key==='Escape'||e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();e.stopPropagation();this.finish(e.key!=='Escape');}};
  this.outside=e=>{if(this.suspended)return;if(!this.root.contains(e.target)&&!this.controls.contains(e.target))this.finish(true,false);};
  document.addEventListener('pointerdown',this.outside,true);document.addEventListener('focusin',this.outside,true);
  this.resize();this.input.focus();const selection=window.getSelection(),range=document.createRange();range.selectNodeContents(this.input);range.collapse(false);selection.removeAllRanges();selection.addRange(range);
 }
 async editEquation(node=null){
  const selection=window.getSelection();let range=selection.rangeCount?selection.getRangeAt(0).cloneRange():null;if(range&&!this.input.contains(range.commonAncestorContainer))range=null;
  this.suspended=true;
  try{const value=await equationDialog(node?JSON.parse(node.dataset.equation).source:'x^2');if(this.closed||!value)return;const replacement=equationNode(value,this.item.fontSize||24);if(node&&this.input.contains(node))node.replaceWith(replacement);else{if(!range){range=document.createRange();range.selectNodeContents(this.input);range.collapse(false);}range.deleteContents();range.insertNode(replacement);}range=document.createRange();range.setStartAfter(replacement);range.collapse(true);this.input.focus();selection.removeAllRanges();selection.addRange(range);this.resize();}finally{this.suspended=false;if(!this.closed)this.input.focus();}
 }
 addFormatting(){
  const command=(name,value)=>{this.input.focus();if(this.savedRange){const selection=window.getSelection();selection.removeAllRanges();selection.addRange(this.savedRange);}document.execCommand(name,false,value);this.savedRange=null;this.resize();};
  for(const [name,label]of [['bold','Bold'],['italic','Italic'],['underline','Underline'],['justifyLeft','Align left'],['justifyCenter','Center'],['justifyRight','Align right'],['insertUnorderedList','Bulleted list'],['insertOrderedList','Numbered list']]){const button=btn(label,()=>command(name));button.onpointerdown=e=>e.preventDefault();button.setAttribute('aria-label',label+' selected text');this.controls.append(button);}
  const math=btn('Inline equation',()=>this.editEquation());math.onpointerdown=e=>e.preventDefault();this.controls.append(math);
  const colors=el('select');colors.setAttribute('aria-label','Selected text color');for(const [value,label]of [['','Text color…'],['#203954','Dark blue'],['#b42318','Red'],['#147d92','Teal'],['#7c50b0','Purple'],['#000000','Black']]){const option=el('option',label);option.value=value;colors.append(option);}
  const capture=()=>{const selection=window.getSelection();if(selection.rangeCount&&this.input.contains(selection.anchorNode)&&this.input.contains(selection.focusNode))this.savedRange=selection.getRangeAt(0).cloneRange();};colors.onpointerdown=capture;colors.onfocus=capture;colors.onchange=()=>{if(colors.value)command('foreColor',colors.value);colors.value='';};this.controls.append(colors);
 }
 resize(){this.update();this.input.style.height='0px';this.height=Math.min(100000,Math.max(this.item.h,this.input.scrollHeight+2));this.input.style.height=`${this.height}px`;this.update();}
 update(){const i=this.item,v=this.editor.board.viewport;Object.assign(this.root.style,{width:`${i.w}px`,left:`${v.x+i.x*v.zoom}px`,top:`${v.y+i.y*v.zoom}px`,transform:`scale(${v.zoom}) rotate(${i.rotation||0}deg)`,transformOrigin:`${i.w/2}px ${i.h/2}px`});
  // Scaling about the object's center also moves its top-left; compensate so
  // the editable text remains at the same world position at every zoom level.
  this.root.style.left=`${v.x+i.x*v.zoom+(v.zoom-1)*i.w/2}px`;
  this.root.style.top=`${v.y+i.y*v.zoom+(v.zoom-1)*i.h/2}px`;
 }
 finish(save,focus=true){if(this.closed)return;const {runs,paragraphs}=readRichDocument(this.input,this.item),text=runs.map(r=>r.text).join('');if(save){try{validateRuns(runs,text);validateParagraphs(paragraphs,text);}catch(e){this.controls.append(el('span',e.message,'error'));return;}}this.closed=true;document.removeEventListener('pointerdown',this.outside,true);document.removeEventListener('focusin',this.outside,true);this.root.remove();this.controls.remove();this.editor.inlineText=null;
  if(save&&text.trim()){this.item.runs=runs;this.item.paragraphs=paragraphs;this.editor.applyText(this.item,text,this.height,this.existing);}
  else this.editor.paint();
  if(focus&&!this.editor.disposed)this.editor.svg.focus();
 }
}
