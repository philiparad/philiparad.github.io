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
