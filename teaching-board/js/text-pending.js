import {restoreLogicalSelection} from './text-selection.js';
/**
 * Formatting chosen at a collapsed caret. A pending mark affects only the
 * next inserted text; subsequent native input continues in its styled span.
 * No empty placeholders, zero-width characters, or HTML are persisted.
 */
export const PENDING_MARKS=new Set(['bold','italic','underline','strikeThrough','foreColor','removeFormat']);

export function pendingMark(previous,name,value,currentState=()=>false){
    if(!PENDING_MARKS.has(name))return null;
    const marks={...(previous||{})};
    if(name==='removeFormat'){
        return {bold:false,italic:false,underline:false,strikeThrough:false,color:null};
    }
    if(name==='foreColor'){
        if(typeof value!=='string'||!/^#[0-9a-f]{6}$/i.test(value))return null;
        marks.color=value.toLowerCase();
        return marks;
    }
    marks[name]=!(Object.prototype.hasOwnProperty.call(marks,name)?marks[name]:currentState(name));
    return marks;
}

export function insertPendingText(root,selection,marks,text){
    if(!marks||typeof text!=='string'||!text.length||text.includes('\n')||!selection?.rangeCount)return false;
    const range=selection.getRangeAt(0);
    if(!range.collapsed||!root.contains(range.startContainer))return false;
    const span=document.createElement('span');
    stylePendingSpan(span,marks,root);
    const node=document.createTextNode(text);
    span.append(node);
    range.deleteContents();
    range.insertNode(span);
    range.setStart(node,text.length);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
}


function stylePendingSpan(span,marks,root) {
    if(marks.bold!==undefined)span.style.fontWeight=marks.bold?'700':'400';
    if(marks.italic!==undefined)span.style.fontStyle=marks.italic?'italic':'normal';
    if(marks.underline!==undefined||marks.strikeThrough!==undefined){
        const styles=[];
        if(marks.underline)styles.push('underline');
        if(marks.strikeThrough)styles.push('line-through');
        span.style.textDecorationLine=styles.join(' ')||'none';
    }
    if(marks.color!==undefined&&marks.color!==null)span.style.color=marks.color;
    if(marks.color===null)span.style.color=root.style.color||'#203954';
}
/** A one-range diff between precomposition and committed text. */
export function compositionInsertion(before,after){
    if(typeof before!=='string'||typeof after!=='string'||before===after)return null;
    let start=0;
    while(start<before.length&&start<after.length&&before[start]===after[start])start++;
    let beforeEnd=before.length,afterEnd=after.length;
    while(beforeEnd>start&&afterEnd>start&&before[beforeEnd-1]===after[afterEnd-1]){
        beforeEnd--;afterEnd--;
    }
    if(afterEnd<=start||after.slice(start,afterEnd).includes('\n'))return null;
    return {start,end:afterEnd};
}
function textPosition(text,absolute){
    const prefix=text.slice(0,absolute),previous=prefix.lastIndexOf('\n');
    return {paragraph:prefix.split('\n').length-1,offset:prefix.length-previous-1};
}
/**
 * Non-cancelable IME input must be allowed to complete natively. Afterwards,
 * wrap only the committed text in the pending style and keep the caret inside
 * that styled span for subsequent typing.
 */
export function styleCommittedComposition(root,selection,marks,before,after){
    if(!marks||!selection?.rangeCount)return false;
    const insertion=compositionInsertion(before,after);
    if(!insertion)return false;
    const start=textPosition(after,insertion.start),end=textPosition(after,insertion.end);
    if(start.paragraph!==end.paragraph)return false;
    if(!restoreLogicalSelection(root,selection,{anchor:start,focus:end}))return false;
    const range=selection.getRangeAt(0);
    if(range.collapsed)return false;
    try{
        const span=document.createElement('span');
        stylePendingSpan(span,marks,root);
        const content=range.extractContents();
        span.append(content);
        range.insertNode(span);
        range.selectNodeContents(span);range.collapse(false);
        selection.removeAllRanges();selection.addRange(range);
        return true;
    }catch{return false;}
}
