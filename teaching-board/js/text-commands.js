/**
 * Range-based rich-text formatting. Operates only on selections within one
 * paragraph; callers can retain the existing fallback for multi-paragraph
 * selections until that case has a proper document-model command.
 */
const BOOLEAN_STYLES={
    bold:['fontWeight','700','400'],
    italic:['fontStyle','italic','normal'],
    underline:['textDecorationLine','underline','none'],
    strikeThrough:['textDecorationLine','line-through','none']
};
export function paragraphAncestor(node,root){
    for(let parent=node?.nodeType===1?node:node?.parentElement;parent&&parent!==root;parent=parent.parentElement){
        if(['DIV','P','LI'].includes(parent.tagName))return parent;
    }
    return null;
}
export function supportedInlineSelection(root,range){
    const start=range&&paragraphAncestor(range.startContainer,root);
    return Boolean(range&&!range.collapsed&&root.contains(range.startContainer)&&root.contains(range.endContainer)
        &&start&&start===paragraphAncestor(range.endContainer,root));
}
export function inlineFormatState(root,selection,name){
    if(!BOOLEAN_STYLES[name]||!selection?.rangeCount||!root.contains(selection.anchorNode))return false;
    let node=selection.anchorNode?.nodeType===1?selection.anchorNode:selection.anchorNode?.parentElement;
    for(;node&&node!==root;node=node.parentElement){
        const style=node.style||{};
        if(name==='bold'&&style.fontWeight)return style.fontWeight==='bold'||Number(style.fontWeight)>=600;
        if(name==='italic'&&style.fontStyle)return style.fontStyle==='italic';
        if((name==='underline'||name==='strikeThrough')&&(style.textDecorationLine||style.textDecoration)){
            const d=style.textDecorationLine||style.textDecoration;
            return d.includes(name==='underline'?'underline':'line-through');
        }
        if(name==='bold'&&['B','STRONG'].includes(node.tagName))return true;
        if(name==='italic'&&['I','EM'].includes(node.tagName))return true;
        if(name==='underline'&&node.tagName==='U')return true;
        if(name==='strikeThrough'&&['S','STRIKE','DEL'].includes(node.tagName))return true;
    }
    return false;
}
function plainFragment(source){
    const clean=document.createDocumentFragment();
    const copy=node=>{
        if(node.nodeType===3){clean.append(node);return;}
        if(node.nodeType!==1)return;
        if(node.dataset?.equation||node.classList?.contains('inline-equation')){clean.append(node);return;}
        if(node.tagName==='BR'){clean.append(node);return;}
        while(node.firstChild){const child=node.firstChild;node.removeChild(child);copy(child);}
    };
    while(source.firstChild){const child=source.firstChild;source.removeChild(child);copy(child);}
    return clean;
}
export function applyInlineFormat(root,selection,name,value){
    if(!BOOLEAN_STYLES[name]&&!['foreColor','removeFormat'].includes(name))return false;
    if(!selection?.rangeCount)return false;
    const range=selection.getRangeAt(0);
    if(!supportedInlineSelection(root,range))return false;
    if(name==='foreColor'&&!/^#[0-9a-f]{6}$/i.test(value||''))return false;
    const wrap=document.createElement('span');
    if(name==='foreColor')wrap.style.color=value;
    else if(name==='removeFormat'){wrap.style.fontWeight='400';wrap.style.fontStyle='normal';wrap.style.textDecorationLine='none';wrap.style.color=root.style.color||'#203954';}
    else {
        const [property,on,off]=BOOLEAN_STYLES[name];
        const enabled=inlineFormatState(root,selection,name);
        if(property==='textDecorationLine') {
            const other=name==='underline'?'line-through':'underline';
            const existing=inlineFormatState(root,selection,name==='underline'?'strikeThrough':'underline');
            wrap.style[property]=[enabled?'':on,existing?other:''].filter(Boolean).join(' ')||off;
        } else wrap.style[property]=enabled?off:on;
    }
    // extractContents supports selections crossing inline elements without
    // invalidating the outer paragraph; equations remain atomic DOM nodes.
    let fragment=range.extractContents();
    if(name==='removeFormat')fragment=plainFragment(fragment);
    if(name==='foreColor'){
        for(const child of fragment.querySelectorAll('*')){
            if(child.classList?.contains('inline-equation'))continue;
            if(child.style?.color)child.style.color=value;
            if(child.hasAttribute?.('color'))child.removeAttribute('color');
        }
    }else if(name!=='removeFormat'){
        const active=inlineFormatState(root,selection,name);
        if(active){
            const [property]=BOOLEAN_STYLES[name];
            // Remove inherited formatting on the extracted child nodes so the
            // explicit "off" style on our wrapper can take effect.
            for(const child of [...fragment.querySelectorAll('*')]){
                if(child.classList?.contains('inline-equation'))continue;
                if(property==='textDecorationLine'){
                    const other=name==='underline'?'line-through':'underline';
                    child.style.textDecorationLine=(child.style.textDecorationLine||child.style.textDecoration||'').includes(other)?other:'none';
                    child.style.textDecoration='';
                }else child.style[property]='inherit';
            }
        }
    }
    wrap.append(fragment);
    range.insertNode(wrap);
    range.selectNodeContents(wrap);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
}
