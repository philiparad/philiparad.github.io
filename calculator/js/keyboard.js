/* REA-018 — PC keyboard routing documented by CASIO fx-ES PLUS Emulator.
 * Guide: fx-ES_PLUS_Emulator_Subscription_EN.pdf, EN-2.
 * Browser accessibility takes precedence when an edit control or unrelated
 * button owns focus. Keyboard events never simulate physical firmware codes.
 */
(function(global){'use strict';
const NORMAL=Object.freeze({
 F1:'SHIFT',F2:'ALPHA',F3:'MODE',F4:'ON',Home:'MODE',
 Enter:'EQUAL',NumpadEnter:'EQUAL',
 Backspace:'DEL',Delete:'DEL',
 ArrowDown:'DOWN',ArrowUp:'UP',ArrowRight:'RIGHT',ArrowLeft:'LEFT',
 '^':'POWER','(':'LP',')':'RP','+':'ADD','-':'SUB','*':'MUL','/':'DIV',
 '.':'DOT',',':'COMMA','=':'EQUAL',
 Escape:'AC'
});
const PROMPT_TEXT=/^[a-zA-Z<>! ]$/;
const EDITOR_SELECTOR='input,textarea,select,[contenteditable],[role="textbox"]';
function getTarget(event){
 const target=event.target;
 if(target&&typeof target.closest==='function'){
  if(target.closest(EDITOR_SELECTOR))return 'editor';
  if(target.closest('button:not([data-key])'))return 'control';
  if(target.closest('[data-key]'))return 'key-button';
  if(target.closest('#face'))return 'face';
 }
 return 'document';
}
function translate(event,context={}){
 if(!event||event.isComposing||event.key==='Process')return null;
 const target=getTarget(event);
 // The calculator must own focus before it may prevent browser shortcuts,
 // scrolling, Backspace navigation or other document-level keyboard actions.
 // A click/Tab to the face or one of its physical keys explicitly opts in.
 if(target==='editor'||target==='control'||target==='document')return null;
 // Preserve OS shortcuts, browser copy, and keyboard-accessible focusing.
 if(event.metaKey||event.altKey)return null;
 // Do not shadow browser Shift+function-key/navigation combinations.
 // Shift-generated printable symbols (+, *, (, )) remain calculator input.
 if(event.shiftKey&&event.key.length>1&&event.key!=='NumpadEnter')return null;
 if(event.ctrlKey){
  const inside=target==='face'||target==='key-button';
  // REA-073: Ctrl+Z is a web-only editing convenience when the calculator
  // has focus. Never intercept the browser shortcut outside the calculator.
  if(inside&&!event.shiftKey&&['z','Z'].includes(event.key)&&
     context.screen==='edit'&&context.math!==false)
   return {keys:['UNDO'],label:'Ctrl+Z',reference:'web-editor'};
  if(inside&&!event.shiftKey&&(event.key==='c'||event.key==='C'||event.key==='Insert')){
   return {keys:[],action:'capture',label:event.key,reference:'casio'};
  }
  return null;
 }
 // Tab and Shift+Tab always retain native focus navigation. A face
 // shortcut must never trap keyboard or screen-reader users.
 if(event.key==='Tab')return null;
 if(event.key===' '||event.key==='Spacebar'){
  // Space activates a focused button natively; only an explicitly focused
  // calculator face should use Space as the AC convenience shortcut.
  if(target!=='face')return null;
  return {keys:['AC'],label:'Space',reference:'casio'};
 }
 // When a physical key has DOM focus, let native Enter click its button.
 if(event.key==='Enter'&&target==='key-button')return null;
 const key=event.key==='NumpadEnter'?'Enter':event.key;
 if(key==='Escape')return {keys:['AC'],label:'Escape',reference:'convenience'};
 const physical=NORMAL[key];
 if(physical){
  if(physical==='COMMA'){
   if(context.screen==='prompt')return {keys:['TEXT:,'],label:',',reference:'casio-context'};
   return {keys:['COMMA'],label:',',reference:'casio-context'};
  }
  if(physical==='=')return {keys:['EQUAL'],label:'=',reference:'casio'};
  return {keys:[physical],label:key,reference:'casio'};
 }
 // The guide documents the numerical keyboard, not literal alphabetic
 // expression entry. Keep letters usable only in web function prompts.
 if(context.mode==='BASE-N'&&['edit','result'].includes(context.screen)&&/^[A-Fa-f]$/.test(key)){
   return {keys:['TEXT:'+key.toUpperCase()],label:key,reference:'base-n-hex'};
  }
  if(context.mode==='CMPLX'&&['edit','result'].includes(context.screen)&&key.length===1&&/^[A-Za-z]$/.test(key)){
   return {keys:['TEXT:'+key],label:key,reference:'complex-expression'};
  }
  if(context.screen==='prompt'&&key.length===1&&PROMPT_TEXT.test(key)){
  return {keys:['TEXT:'+key],label:key,reference:'web-extension'};
 }
 if(/^\d$/.test(key))return {keys:[key],label:key,reference:'casio'};
 return null;
}
function dispatch(event,context,press,capture){
 const resolved=translate(event,context);
 if(!resolved)return false;
 if(resolved.action==='capture'){
  // Never hijack browser Copy unless a safe screen-capture writer exists.
  if(typeof capture!=='function'||capture()!==true)return false;
  event.preventDefault();return true;
 }
 event.preventDefault();
 for(const key of resolved.keys)press(key);
 return true;
}
const MAPPING=Object.freeze({
 Tab:'Browser focus navigation',Space:'AC (face focus only; native button activation otherwise)',
 F1:'SHIFT',F2:'ALPHA',F3:'MODE',F4:'ON',Home:'MODE',
 Enter:'EQUAL',Backspace:'DEL',Delete:'DEL',
 ArrowUp:'UP',ArrowDown:'DOWN',ArrowLeft:'LEFT',ArrowRight:'RIGHT',
 '^':'POWER','(':'LP',')':'RP','+':'ADD','-':'SUB','*':'MUL','/':'DIV',
 '.':'DOT',',':'COMMA (calculator argument separator)',
 '0-9':'0-9','Ctrl+C / Ctrl+Insert':'Capture LCD (when calculator focused)',
 'Ctrl+Z':'Undo recent structured edit (calculator focus only)'
});
const API=Object.freeze({translate,dispatch,mapping:MAPPING,getTarget});
global.FreshKeyboard=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
