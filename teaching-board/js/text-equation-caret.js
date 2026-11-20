import {captureLogicalSelection,logicalParagraphs,restoreLogicalSelection} from './text-selection.js?v=20261120-perf017';

/**
 * Equations are DOM elements but occupy a single U+FFFC in the rich-text
 * document. Never navigate into or delete a fragment of their image markup.
 */
export function equationAtOffset(block,offset,step){
    if(!block||!Number.isInteger(offset)||![1,-1].includes(step))return null;
    let position=0,match=null;
    const walk=node=>{
        if(match)return;
        if(node.nodeType===3){position+=node.textContent.length;return;}
        if(node.nodeType!==1&&node.nodeType!==11)return;
        if(node.nodeType===1&&node.dataset?.equation){
            if(step===1&&position===offset||step===-1&&position+1===offset)
                match={node,start:position,end:position+1};
            position++;
            return;
        }
        for(const child of node.childNodes)walk(child);
    };
    walk(block);
    return match;
}
export function equationArrowStep(key,direction){
    if(key!=='ArrowLeft'&&key!=='ArrowRight')return 0;
    const visual=key==='ArrowRight'?1:-1;
    return direction==='rtl'?-visual:visual;
}
function caret(root,selection,allowRange=false){
    const saved=captureLogicalSelection(root,selection);
    if(!saved)return null;
    if(!allowRange&&(saved.anchor.paragraph!==saved.focus.paragraph||
       saved.anchor.offset!==saved.focus.offset||selection.isCollapsed===false))return null;
    const blocks=logicalParagraphs(root),point=saved.focus,block=blocks[point.paragraph];
    return block?{saved,point,block}:null;
}
/** Move exactly one atomic step only when an equation borders the caret. */
export function moveAcrossEquation(root,selection,key,extend=false){
    const current=caret(root,selection,extend);
    if(!current||(!extend&&selection.isCollapsed===false))return false;
    if(!extend&&(current.saved.anchor.paragraph!==current.point.paragraph||
        current.saved.anchor.offset!==current.point.offset))return false;
    const direction=typeof getComputedStyle==='function'
        ?getComputedStyle(current.block).direction:current.block.dir||'ltr';
    const step=equationArrowStep(key,direction);
    if(!step||!equationAtOffset(current.block,current.point.offset,step))return false;
    const next={paragraph:current.point.paragraph,offset:current.point.offset+step};
    return restoreLogicalSelection(root,selection,{
        anchor:extend?current.saved.anchor:next,focus:next
    });
}
/** Return false for ordinary text and ranges: leave their native editing alone. */
export function deleteEquationAtCaret(root,selection,key){
    const current=caret(root,selection);
    if(!current)return false;
    const step=key==='Backspace'?-1:key==='Delete'?1:0;
    if(!step)return false;
    const adjacent=equationAtOffset(current.block,current.point.offset,step);
    if(!adjacent)return false;
    const at={paragraph:current.point.paragraph,offset:adjacent.start};
    adjacent.node.remove();
    restoreLogicalSelection(root,selection,{anchor:at,focus:at});
    return true;
}
/** Find the intact formula touching a collapsed keyboard caret.
 * Prefer the equation before the caret if there is one; otherwise the next
 * equation. Do not expose its image descendants or match selected ranges.
 */
export function adjacentEquationAtCaret(root,selection){
    const current=caret(root,selection);
    if(!current)return null;
    return equationAtOffset(current.block,current.point.offset,-1)?.node||
        equationAtOffset(current.block,current.point.offset,1)?.node||null;
}
/** Make the entire math token one selectable unit, never the image subtree. */
function placeEquationBoundary(root,selection,node,after,extend=false){
    if(!root||!selection||!node?.dataset?.equation||!root.contains(node))return false;
    try{
        const range=document.createRange();
        range.setStartBefore(node);
        range.setEndAfter(node);
        if(!extend)range.collapse(!after);
        root.focus();
        if(extend&&typeof selection.setBaseAndExtent==='function'){
            const parent=node.parentNode;
            const index=Array.prototype.indexOf.call(parent?.childNodes||[],node);
            if(index<0)return false;
            selection.setBaseAndExtent(parent,after?index:index+1,
                parent,after?index+1:index);
        }else{
            selection.removeAllRanges();
            selection.addRange(range);
        }
        return true;
    }catch{return false;}
}
/** Keyboard navigation for Tab-focusable math in RTL or LTR paragraphs.
 * Shift+arrow selects the whole equation; Escape returns to text editing. */
export function positionFromEquationKeyboard(root,selection,node,key,extend=false){
    if(!node?.dataset?.equation||!root?.contains(node))return false;
    const block=logicalParagraphs(root).find(p=>p===node||p.contains(node));
    if(!block)return false;
    const direction=typeof getComputedStyle==='function'
        ?getComputedStyle(block).direction:block.dir||'ltr';
    const step=key==='Escape'?1:equationArrowStep(key,direction);
    return !!step&&placeEquationBoundary(root,selection,node,step===1,extend);
}
/** Tap/click places the caret at the math boundary in paragraph flow. */
export function positionBesideEquation(root,selection,node,clientX){
    if(!node?.dataset?.equation||!root?.contains(node)||!Number.isFinite(clientX))return false;
    const block=logicalParagraphs(root).find(p=>p===node||p.contains(node));
    if(!block)return false;
    const rect=node.getBoundingClientRect();
    const direction=typeof getComputedStyle==='function'
        ?getComputedStyle(block).direction:block.dir||'ltr';
    const before=direction==='rtl'?clientX>=rect.left+rect.width/2:
        clientX<rect.left+rect.width/2;
    return placeEquationBoundary(root,selection,node,!before);
}
