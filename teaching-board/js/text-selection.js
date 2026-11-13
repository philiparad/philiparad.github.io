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
