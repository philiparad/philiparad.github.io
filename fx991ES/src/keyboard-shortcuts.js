/* Browser keyboard input routing. No hardware-key equivalence claims. */
(function(root){'use strict';
const KEYMAP=Object.freeze({Enter:'=',Escape:'AC',Backspace:'DEL',
 ArrowLeft:'LEFT',ArrowRight:'RIGHT',ArrowUp:'UP',ArrowDown:'DOWN',
 '+':'ADD','-':'SUB','*':'MUL','/':'DIV','(':'LP',')':'RP','^':'POW'});
const ALLOWED=new Set(['=','AC','DEL','LEFT','RIGHT','UP','DOWN','ADD','SUB','MUL','DIV','LP','RP','POW']);
function keyFor(event,focused){
 if(!event||typeof event.key!=='string'||event.ctrlKey||event.altKey||event.metaKey||event.isComposing)return null;
 const target=focused||event.target,tag=String(target?.tagName||'').toUpperCase();
 if(target?.isContentEditable||target?.closest?.('[contenteditable="true"]'))return null;
 if(['INPUT','TEXTAREA','SELECT','A'].includes(tag))return null;
 const calculatorKey=tag==='BUTTON'&&!!target.classList?.contains('key');
 if(tag==='BUTTON'&&!calculatorKey)return null;
 // Avoid intercepting native Enter/Space activation on a focused calculator button.
 if(calculatorKey&&(event.key==='Enter'||event.key===' '))return null;
 const mapped=Object.prototype.hasOwnProperty.call(KEYMAP,event.key)?KEYMAP[event.key]:event.key;
 return (/^[0-9.]$/.test(mapped)||ALLOWED.has(mapped))?mapped:null;
}
const API=Object.freeze({keyFor});
if(typeof module!=='undefined'&&module.exports)module.exports=API;
root.FX991_KEYBOARD=API;
})(typeof window!=='undefined'?window:globalThis);
