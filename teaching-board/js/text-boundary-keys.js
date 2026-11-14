/**
 * TXT-061 — Model-based paragraph boundary editing and navigation.
 * Never interpret equation imagery as text: U+FFFC occupies one offset.
 * All offsets are UTF-16, matching the editor's logical selections.
 */
function parts(snapshot){
    if(!snapshot?.runs||!Array.isArray(snapshot.paragraphs))return null;
    const text=snapshot.runs.map(run=>run.text).join('');
    if(snapshot.paragraphs.length!==text.split('\n').length)return null;
    return {text,rows:text.split('\n')};
}
function pointOK(p,rows){
    return !!p&&Number.isInteger(p.paragraph)&&Number.isInteger(p.offset)&&
        p.paragraph>=0&&p.paragraph<rows.length&&p.offset>=0&&
        p.offset<=rows[p.paragraph].length;
}
function collapsed(saved,rows){
    return saved&&pointOK(saved.anchor,rows)&&pointOK(saved.focus,rows)&&
        saved.anchor.paragraph===saved.focus.paragraph&&
        saved.anchor.offset===saved.focus.offset;
}
function position(rows,index,offset){
    let at=offset;
    for(let i=0;i<index;i++)at+=rows[i].length+1;
    return at;
}
/** Backspace/Delete at a paragraph boundary; all other edits remain native. */
export function boundaryEdit(snapshot,saved,key){
    const doc=parts(snapshot);
    if(!doc||!collapsed(saved,doc.rows)||!['Backspace','Delete'].includes(key))return null;
    const {rows}=doc,p=saved.focus.paragraph,o=saved.focus.offset;
    if(key==='Backspace'&&o===0){
        if(rows[p].length===0&&snapshot.paragraphs[p].list!=='none')
            return {kind:'unlist',paragraph:p,cursor:{paragraph:p,offset:0}};
        if(p>0){
            const start=position(rows,p-1,rows[p-1].length);
            return {kind:'join',start,end:start+1};
        }
    }
    if(key==='Delete'&&o===rows[p].length&&p<rows.length-1){
        const start=position(rows,p,rows[p].length);
        return {kind:'join',start,end:start+1};
    }
    return null;
}
/**
 * Accessible paragraph navigation:
 *   Alt+ArrowUp/Down: previous/next paragraph at same logical column
 *   Ctrl/Meta+Home/End: start/end of document, including empty last row
 *   ArrowUp/Down in an empty row: adjacent paragraph
 * Shift extends from original anchor, including backwards selections.
 */
export function boundaryNavigation(snapshot,saved,key,mods={}){
    const doc=parts(snapshot);
    if(!doc||!saved||!pointOK(saved.anchor,doc.rows)||
        !pointOK(saved.focus,doc.rows))return null;
    const {rows}=doc,focus=saved.focus;
    let p=focus.paragraph,o=focus.offset;
    if((mods.ctrl||mods.meta)&&!mods.alt&&
        (key==='Home'||key==='End')){
        p=key==='Home'?0:rows.length-1;
        o=key==='Home'?0:rows[p].length;
    }else if(mods.alt&&!mods.ctrl&&!mods.meta&&
        (key==='ArrowUp'||key==='ArrowDown')){
        p=Math.max(0,Math.min(rows.length-1,
            p+(key==='ArrowUp'?-1:1)));
        o=Math.min(o,rows[p].length);
    }else if(!mods.alt&&!mods.ctrl&&!mods.meta&&
        (key==='ArrowUp'||key==='ArrowDown')&&
        rows[focus.paragraph].length===0){
        p=Math.max(0,Math.min(rows.length-1,
            p+(key==='ArrowUp'?-1:1)));
        o=Math.min(o,rows[p].length);
    }else return null;
    if(p===focus.paragraph&&o===focus.offset&&!mods.shift)return null;
    const target={paragraph:p,offset:o};
    return {anchor:mods.shift?{...saved.anchor}:target,focus:target};
}
