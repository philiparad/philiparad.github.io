import {equationDialog} from './equation-editor.js?v=20261023-image-handles';
import {equationNode,textLayoutMetrics} from './inline-equation.js?v=20261017-history-budget';
import {readRichDocument,writeRuns,validateRuns,validateParagraphs,paragraphRuns} from './rich-text.js?v=20261017-history-budget';
import { el, btn } from './ui.js?v=20261017-history-budget';
import { TextHistory } from './text-history.js';
import { captureTextSelection,restoreTextSelection } from './text-selection.js';
import {applyInlineFormat,inlineFormatState} from './text-commands.js';
import {applyParagraphList} from './text-lists.js';
import {pendingMark,insertPendingText} from './text-pending.js';
import {applyDocumentRange} from './text-range-format.js';

/** An isolated draft: the board changes only when the user finishes editing. */
export class InlineText {
 constructor(editor,item,existing){
  this.editor=editor;this.item=structuredClone(item);this.existing=existing;
  this.root=el('div',null,'inline-text-editor');
  this.input=el('div');this.input.contentEditable='true';this.input.setAttribute('role','textbox');this.input.setAttribute('aria-multiline','true');this.input.setAttribute('aria-label',item.type==='note'?'Edit sticky note on canvas':'Edit text on canvas');
  writeRuns(this.input,item);this.input.dir='auto';this.input.spellcheck=true;
  this.input.dataset.placeholder='Type here…';
  this.input.style.whiteSpace='pre-wrap';
  this.input.addEventListener('compositionstart',()=>{this.composing=true;this.pendingMarks=null;this.pendingSelection=null;});
  this.input.addEventListener('compositionend',()=>{this.composing=false;this.resize();this.recordSnapshot();});
  const font=item.fontSize||24,pad=item.type==='note'?14:0;
  Object.assign(this.input.style,{font:`${(item.textStyle||'').includes('italic')?'italic':'normal'} ${(item.textStyle||'').includes('bold')?'700':'400'} ${font}px/1.3 Arial, sans-serif`,textAlign:item.textAlign&&item.textAlign!=='auto'?item.textAlign:'start',padding:`${pad}px`,color:item.stroke||'#203954',background:item.type==='note'&&item.fill!=='none'?(item.fill||'#fff1a8'):'transparent'});
  this.root.append(this.input);
  this.controls=el('div',null,'inline-text-actions');this.controls.setAttribute('aria-label','Text editing actions');
  this.addFormatting();
  this.controls.append(el('span','Enter: new line · Ctrl/⌘ Enter: save · Esc: cancel'),btn('Cancel',()=>this.finish(false)),btn('Done',()=>this.finish(true),'primary'));
  editor.area.append(this.root,this.controls);
  this.textHistory=new TextHistory(readRichDocument(this.input,this.item));this.updateHistoryButtons();
  this.input.oninput=()=>{this.resize();if(!this.composing){this.pendingMarks=null;this.pendingSelection=null;this.recordSnapshot();}};
  this.input.onbeforeinput=e=>{if(this.closed||this.composing||e.isComposing||e.inputType!=='insertText'||!this.pendingMarks)return;const selection=window.getSelection();if(insertPendingText(this.input,selection,this.pendingMarks,e.data)){e.preventDefault();this.pendingMarks=null;this.pendingSelection=null;this.resize();this.recordSnapshot();this.selectionChange();}};
  // Keep toolbar feedback synchronized with the insertion point and selected formatting.
  this.selectionChange=()=>{if(this.closed||!this.input.contains(document.activeElement))return;const caret=captureTextSelection(this.input,window.getSelection());this.textHistory.setSelection(caret);if(this.pendingMarks&&JSON.stringify(caret)!==JSON.stringify(this.pendingSelection)){this.pendingMarks=null;this.pendingSelection=null;}for(const [name,button] of this.formatButtons||[]){if(name.startsWith('insert')){const selection=window.getSelection(),node=selection?.anchorNode,block=node?.nodeType===1?node:node?.parentElement,list=block?.closest?.('li')?.parentElement;button.setAttribute('aria-pressed',String(list?.tagName===(name==='insertOrderedList'?'OL':'UL')));}else button.setAttribute('aria-pressed',String(this.pendingMarks&&Object.prototype.hasOwnProperty.call(this.pendingMarks,name)?this.pendingMarks[name]:inlineFormatState(this.input,window.getSelection(),name)));}};
  document.addEventListener('selectionchange',this.selectionChange);
  this.input.onpaste=e=>{e.preventDefault();this.insertPlainText(e.clipboardData?.getData('text/plain')?.slice(0,10000)||'');};
  this.input.ondrop=e=>e.preventDefault();
  this.input.ondblclick=e=>{const node=e.target.closest('.inline-equation');if(node){e.preventDefault();this.editEquation(node);}};
  this.input.onkeydown=e=>{if(e.isComposing||this.composing||e.keyCode===229)return;if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==='z'){e.preventDefault();e.stopPropagation();this.stepTextHistory(e.shiftKey?'redo':'undo');return;}if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==='y'){e.preventDefault();e.stopPropagation();this.stepTextHistory('redo');return;}if((e.ctrlKey||e.metaKey)&&e.shiftKey&&!e.altKey&&['7','8'].includes(e.key)){e.preventDefault();e.stopPropagation();this.formatList(e.key==='7'?'number':'bullet');return;}if((e.ctrlKey||e.metaKey)&&!e.altKey&&['b','i','u'].includes(e.key.toLowerCase())){e.preventDefault();e.stopPropagation();this.formatText({b:'bold',i:'italic',u:'underline'}[e.key.toLowerCase()]);return;}if(e.key==='Escape'||e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();e.stopPropagation();this.finish(e.key!=='Escape');}};
  this.outside=e=>{if(this.suspended||this.composing)return;if(!this.root.contains(e.target)&&!this.controls.contains(e.target))this.finish(true,false);};
  document.addEventListener('pointerdown',this.outside,true);document.addEventListener('focusin',this.outside,true);
  this.resize();this.input.focus();const selection=window.getSelection(),range=document.createRange();range.selectNodeContents(this.input);range.collapse(false);selection.removeAllRanges();selection.addRange(range);
 }
 async editEquation(node=null){
  const selection=window.getSelection();let range=selection.rangeCount?selection.getRangeAt(0).cloneRange():null;if(range&&!this.input.contains(range.commonAncestorContainer))range=null;
  this.suspended=true;
  try{const value=await equationDialog(node?JSON.parse(node.dataset.equation).source:'x^2');if(this.closed||!value)return;const replacement=equationNode(value,this.item.fontSize||24);if(node&&this.input.contains(node))node.replaceWith(replacement);else{if(!range){range=document.createRange();range.selectNodeContents(this.input);range.collapse(false);}range.deleteContents();range.insertNode(replacement);}range=document.createRange();range.setStartAfter(replacement);range.collapse(true);this.input.focus();selection.removeAllRanges();selection.addRange(range);this.resize();this.recordSnapshot();}finally{this.suspended=false;if(!this.closed)this.input.focus();}
 }
 addFormatting(){
  this.formatButtons=new Map();
  this.undoButton=btn('Undo',()=>this.stepTextHistory('undo'));this.undoButton.title='Undo text (Ctrl/⌘+Z)';this.redoButton=btn('Redo',()=>this.stepTextHistory('redo'));this.redoButton.title='Redo text (Ctrl/⌘+Y / Ctrl/⌘+Shift+Z)';this.controls.append(this.undoButton,this.redoButton);
  const command=(name,value)=>{if(name.startsWith('justify')){this.setParagraphAlignment({justifyLeft:'left',justifyCenter:'center',justifyRight:'right'}[name]);this.savedRange=null;return;}if(['bold','italic','underline','strikeThrough','foreColor','removeFormat'].includes(name)){this.formatText(name,value);return;}if(name==='insertUnorderedList'||name==='insertOrderedList'){this.formatList(name==='insertOrderedList'?'number':'bullet');return;}throw new Error('Unsupported text command: '+name);};
  for(const [name,label]of [['bold','Bold'],['italic','Italic'],['underline','Underline'],['strikeThrough','Strikethrough'],['justifyLeft','Align left'],['justifyCenter','Center'],['justifyRight','Align right'],['insertUnorderedList','Bulleted list'],['insertOrderedList','Numbered list'],['removeFormat','Clear formatting']]){const button=btn(label,()=>command(name));button.onpointerdown=e=>e.preventDefault();button.setAttribute('aria-label',label+' selected text');this.controls.append(button);if(['bold','italic','underline','strikeThrough','insertOrderedList','insertUnorderedList'].includes(name)){button.setAttribute('aria-pressed','false');this.formatButtons.set(name,button);}}
  const math=btn('Inline equation',()=>this.editEquation());math.onpointerdown=e=>e.preventDefault();this.controls.append(math);
  const colors=el('select');colors.setAttribute('aria-label','Selected text color');for(const [value,label]of [['','Text color…'],['#203954','Dark blue'],['#b42318','Red'],['#147d92','Teal'],['#7c50b0','Purple'],['#000000','Black']]){const option=el('option',label);option.value=value;colors.append(option);}
  const capture=()=>{const selection=window.getSelection();if(selection.rangeCount&&this.input.contains(selection.anchorNode)&&this.input.contains(selection.focusNode))this.savedRange=selection.getRangeAt(0).cloneRange();};colors.onpointerdown=capture;colors.onfocus=capture;colors.onchange=()=>{if(colors.value)command('foreColor',colors.value);colors.value='';};this.controls.append(colors);const direction=el('select');direction.setAttribute('aria-label','Paragraph text direction');for(const [value,label] of [['auto','Direction: Auto'],['rtl','Right-to-left (Hebrew)'],['ltr','Left-to-right (English)']]){const option=el('option',label);option.value=value;direction.append(option);}direction.onpointerdown=capture;direction.onfocus=capture;direction.onchange=()=>{this.setParagraphDirection(direction.value);this.savedRange=null;};this.controls.append(direction);const custom=el('input');custom.type='color';custom.value='#203954';custom.setAttribute('aria-label','Custom text color');custom.title='Custom text color';custom.onpointerdown=capture;custom.onfocus=capture;custom.onchange=()=>command('foreColor',custom.value);this.controls.append(custom);
 }
 formatText(name,value){if(this.closed||this.composing)return false;this.input.focus();const selection=window.getSelection();if(this.savedRange){selection.removeAllRanges();selection.addRange(this.savedRange);}const range=selection?.rangeCount?selection.getRangeAt(0):null;if(range?.collapsed&&this.input.contains(range.startContainer)){const marks=pendingMark(this.pendingMarks,name,value,n=>inlineFormatState(this.input,selection,n));this.savedRange=null;if(!marks)return false;this.pendingMarks=marks;this.pendingSelection=captureTextSelection(this.input,selection);this.selectionChange();return true;}let changed=applyInlineFormat(this.input,selection,name,value);if(!changed)changed=applyDocumentRange(this.input,this.item,selection,name,value);this.savedRange=null;this.pendingMarks=null;this.pendingSelection=null;if(changed){this.resize();this.recordSnapshot();this.selectionChange();}return changed;}
 formatList(kind){
  if(this.closed||this.composing)return false;
  const selection=window.getSelection();
  if(this.savedRange){selection.removeAllRanges();selection.addRange(this.savedRange);}
  const changed=applyParagraphList(this.input,this.item,selection,kind);
  this.savedRange=null;
  if(changed){this.input.focus();this.resize();this.recordSnapshot();this.selectionChange();}
  return changed;
 }
 setParagraphAlignment(align){
  if(!['left','center','right'].includes(align))return;
  const selection=window.getSelection();
  if(this.savedRange){selection.removeAllRanges();selection.addRange(this.savedRange);}
  const range=selection?.rangeCount?selection.getRangeAt(0):null;
  const blocks=[...this.input.querySelectorAll('div,p,li')].filter(n=>n.closest('li')===null||n.tagName==='LI');
  const matches=range&&typeof range.intersectsNode==='function'?blocks.filter(n=>range.intersectsNode(n)):[];
  if(matches.length){for(const block of matches)block.style.textAlign=align;}
  else{
   let node=selection?.anchorNode;
   let block=node?.nodeType===1?node:node?.parentElement;
   while(block&&block!==this.input&&!['DIV','P','LI'].includes(block.tagName))block=block.parentElement;
   if(block&&block!==this.input)block.style.textAlign=align;
   else for(const child of this.input.children)if(['DIV','P','LI'].includes(child.tagName))child.style.textAlign=align;
  }
  this.input.focus();this.resize();this.recordSnapshot();
 }
 setParagraphDirection(dir){if(!['auto','ltr','rtl'].includes(dir))return;const selection=window.getSelection();if(this.savedRange){selection.removeAllRanges();selection.addRange(this.savedRange);}let node=selection.anchorNode;let block=node?.nodeType===1?node:node?.parentElement;while(block&&block!==this.input&&!['DIV','P','LI'].includes(block.tagName))block=block.parentElement;const blocks=[...this.input.querySelectorAll('div,p,li')].filter(n=>n.closest('li')===null||n.tagName==='LI');const range=selection.rangeCount?selection.getRangeAt(0):null;const targets=range&&typeof range.intersectsNode==='function'?blocks.filter(n=>range.intersectsNode(n)):[];if(targets.length)for(const n of targets)n.dir=dir;else if(block&&block!==this.input)block.dir=dir;else for(const child of this.input.children)if(['DIV','P','LI'].includes(child.tagName))child.dir=dir;this.input.focus();this.resize();this.recordSnapshot();}
 recordSnapshot(){if(this.closed||this.composing)return;try{const snapshot=readRichDocument(this.input,this.item);const txt=snapshot.runs.map(run=>run.text).join('');validateRuns(snapshot.runs,txt);validateParagraphs(snapshot.paragraphs,txt);snapshot.selection=captureTextSelection(this.input,window.getSelection());this.textHistory.push(snapshot);this.updateHistoryButtons();}catch{/* Keep an invalid intermediate composition out of history. */}}
 updateHistoryButtons(){if(!this.textHistory)return;this.undoButton.disabled=!this.textHistory.canUndo;this.redoButton.disabled=!this.textHistory.canRedo;}
 stepTextHistory(direction){if(this.closed||this.composing)return;this.pendingMarks=null;this.pendingSelection=null;const snapshot=direction==='redo'?this.textHistory.redo():this.textHistory.undo();if(!snapshot)return;this.updateHistoryButtons();const txt=snapshot.runs.map(run=>run.text).join('');writeRuns(this.input,{...this.item,text:txt,runs:snapshot.runs,paragraphs:snapshot.paragraphs});this.resize();this.input.focus();const selection=window.getSelection();if(selection&&!restoreTextSelection(this.input,selection,snapshot.selection)){const range=document.createRange();range.selectNodeContents(this.input);range.collapse(false);selection.removeAllRanges();selection.addRange(range);}}
 insertPlainText(value){if(!value||this.closed||this.composing)return;const selection=window.getSelection();if(this.pendingMarks&&insertPendingText(this.input,selection,this.pendingMarks,value)){this.pendingMarks=null;this.pendingSelection=null;this.input.focus();this.resize();this.recordSnapshot();return;}let range=selection?.rangeCount?selection.getRangeAt(0):null;if(!range||!this.input.contains(range.commonAncestorContainer)){range=document.createRange();range.selectNodeContents(this.input);range.collapse(false);}this.pendingMarks=null;this.pendingSelection=null;range.deleteContents();const node=document.createTextNode(value);range.insertNode(node);range.setStartAfter(node);range.collapse(true);selection?.removeAllRanges();selection?.addRange(range);this.input.focus();this.resize();this.recordSnapshot();}
 resize(){this.update();this.input.style.height='0px';let needed=Math.max(this.item.h||1,this.input.scrollHeight+2);try{const draft=readRichDocument(this.input,this.item);const content={...this.item,text:draft.runs.map(run=>run.text).join(''),runs:draft.runs,paragraphs:draft.paragraphs};needed=Math.max(needed,textLayoutMetrics(content,paragraphRuns(content)).height);}catch{/* Keep a partially edited draft visible while parsing catches up. */}this.height=Math.min(100000,needed);this.input.style.height=`${this.height}px`;this.update();}
 update(){const i=this.item,v=this.editor.board.viewport;Object.assign(this.root.style,{width:`${i.w}px`,left:`${v.x+i.x*v.zoom}px`,top:`${v.y+i.y*v.zoom}px`,transform:`scale(${v.zoom}) rotate(${i.rotation||0}deg)`,transformOrigin:`${i.w/2}px ${i.h/2}px`});
  // Scaling about the object's center also moves its top-left; compensate so
  // the editable text remains at the same world position at every zoom level.
  this.root.style.left=`${v.x+i.x*v.zoom+(v.zoom-1)*i.w/2}px`;
  this.root.style.top=`${v.y+i.y*v.zoom+(v.zoom-1)*i.h/2}px`;
 }
 finish(save,focus=true){if(this.closed)return;let runs=[],paragraphs=[],text='';if(save){try{const result=readRichDocument(this.input,this.item);runs=result.runs;paragraphs=result.paragraphs;text=runs.map(r=>r.text).join('');validateRuns(runs,text);validateParagraphs(paragraphs,text);}catch(e){const error=this.controls.querySelector('.error')||el('span',null,'error');error.textContent=e.message||'Unable to save formatted text.';if(!error.isConnected)this.controls.append(error);return;}}this.closed=true;document.removeEventListener('pointerdown',this.outside,true);document.removeEventListener('focusin',this.outside,true);document.removeEventListener('selectionchange',this.selectionChange);this.root.remove();this.controls.remove();this.editor.inlineText=null;
  if(save&&text.trim()){this.item.runs=runs;this.item.paragraphs=paragraphs;this.editor.applyText(this.item,text,this.height,this.existing);}
  else this.editor.paint();
  if(focus&&!this.editor.disposed)this.editor.svg.focus();
 }
}
