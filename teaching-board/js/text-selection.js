/** Serialize a DOM selection as descendant child indices (never DOM nodes). */
export function nodePath(root, node) {
    if (!node || (node !== root && !root.contains(node))) return null;
    const path=[];
    while (node !== root) {
        const parent=node.parentNode;
        if (!parent) return null;
        const index=Array.prototype.indexOf.call(parent.childNodes,node);
        if (index < 0) return null;
        path.unshift(index);
        node=parent;
    }
    return path;
}
export function resolvePath(root,path) {
    if (!Array.isArray(path)) return null;
    let node=root;
    for (const index of path) {
        if (!Number.isInteger(index)||index<0||index>=node.childNodes.length) return null;
        node=node.childNodes[index];
    }
    return node;
}
function clampOffset(node,offset) {
    const len=node.nodeType===3?node.textContent.length:node.childNodes.length;
    return Math.max(0,Math.min(Number.isInteger(offset)?offset:0,len));
}
export function captureTextSelection(root,selection) {
    if (!selection?.rangeCount) return null;
    const anchor=nodePath(root,selection.anchorNode),focus=nodePath(root,selection.focusNode);
    if (!anchor||!focus) return null;
    return {anchor,anchorOffset:clampOffset(selection.anchorNode,selection.anchorOffset),
        focus,focusOffset:clampOffset(selection.focusNode,selection.focusOffset)};
}
export function restoreTextSelection(root,selection,saved) {
    if (!selection||!saved) return false;
    const anchor=resolvePath(root,saved.anchor),focus=resolvePath(root,saved.focus);
    if (!anchor||!focus)return false;
    const a=clampOffset(anchor,saved.anchorOffset),f=clampOffset(focus,saved.focusOffset);
    try {
        if (typeof selection.setBaseAndExtent==='function') selection.setBaseAndExtent(anchor,a,focus,f);
        else {
            const range=document.createRange();
            range.setStart(anchor,a);
            range.setEnd(focus,f);
            selection.removeAllRanges();
            selection.addRange(range);
        }
        return true;
    } catch { return false; }
}


/**
 * Stable selection positions use a paragraph index and UTF-16 offset instead
 * of DOM child indices. Formatting may split/merge spans or group blocks
 * inside UL/OL without moving the user's logical cursor.
 * Inline equations are atomic and count as one U+FFFC character.
 */
export function logicalParagraphs(root) {
    const result=[];
    for (const child of root.children||[]) {
        if (['DIV','P','LI'].includes(child.tagName)) result.push(child);
        else if (['OL','UL'].includes(child.tagName)) {
            for (const li of child.children) if (li.tagName==='LI') result.push(li);
        }
    }
    return result;
}
function logicalLength(node) {
    if (node.nodeType===3) return node.textContent.length;
    if (node.nodeType!==1&&node.nodeType!==11) return 0;
    if (node.nodeType===1&&node.dataset?.equation) return 1;
    let length=0;
    for (const child of node.childNodes) length+=logicalLength(child);
    return length;
}
function logicalPoint(root,blocks,node,offset) {
    let index=blocks.findIndex(block=>block===node||block.contains(node));
    if (index<0&&node===root&&blocks.length) {
        // A collapsed browser caret may be between root-level DIV / OL nodes.
        const child=root.childNodes[Math.min(Math.max(0,offset),root.childNodes.length-1)];
        index=blocks.findIndex(block=>block===child||child?.contains?.(block));
        if (offset===root.childNodes.length) index=blocks.length-1;
        if (index<0) index=0;
        return {paragraph:index,offset:offset===root.childNodes.length?logicalLength(blocks[index]):0};
    }
    if (index<0) return null;
    const block=blocks[index];
    try {
        const range=document.createRange();
        range.selectNodeContents(block);
        range.setEnd(node,offset);
        return {paragraph:index,offset:logicalLength(range.cloneContents())};
    } catch { return null; }
}
export function captureLogicalSelection(root,selection) {
    if (!selection?.rangeCount) return null;
    const blocks=logicalParagraphs(root);
    const anchor=logicalPoint(root,blocks,selection.anchorNode,selection.anchorOffset);
    const focus=logicalPoint(root,blocks,selection.focusNode,selection.focusOffset);
    return anchor&&focus?{anchor,focus}:null;
}
function resolveLogicalPoint(block,offset) {
    let left=Math.max(0,Math.min(Number.isInteger(offset)?offset:0,logicalLength(block)));
    function visit(parent) {
        for (let i=0;i<parent.childNodes.length;i++) {
            const child=parent.childNodes[i];
            if (child.nodeType===3) {
                if (left<=child.textContent.length) return {node:child,offset:left};
                left-=child.textContent.length;
            } else if (child.nodeType===1&&child.dataset?.equation) {
                if (!left) return {node:parent,offset:i};
                left--;
                if (!left) return {node:parent,offset:i+1};
            } else if (child.nodeType===1) {
                const result=visit(child);
                if (result) return result;
            }
        }
        return null;
    }
    return visit(block)||{node:block,offset:block.childNodes.length};
}
export function restoreLogicalSelection(root,selection,saved) {
    if (!selection||!saved?.anchor||!saved?.focus) return false;
    const blocks=logicalParagraphs(root);
    const get=point=>Number.isInteger(point.paragraph)&&point.paragraph>=0&&
        point.paragraph<blocks.length?resolveLogicalPoint(blocks[point.paragraph],point.offset):null;
    const anchor=get(saved.anchor),focus=get(saved.focus);
    if (!anchor||!focus) return false;
    try {
        if (typeof selection.setBaseAndExtent==='function') {
            selection.setBaseAndExtent(anchor.node,anchor.offset,focus.node,focus.offset);
        } else {
            const range=document.createRange();
            range.setStart(anchor.node,anchor.offset);
            range.setEnd(focus.node,focus.offset);
            selection.removeAllRanges();selection.addRange(range);
        }
        return true;
    } catch { return false; }
}
