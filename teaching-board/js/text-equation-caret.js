import {captureLogicalSelection,logicalParagraphs,restoreLogicalSelection} from './text-selection.js';

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
/** Pointer placement chooses the side of an equation in its paragraph flow. */
export function positionBesideEquation(root,selection,node,clientX){
    if(!node?.dataset?.equation||!root.contains(node)||!Number.isFinite(clientX))return false;
    const block=logicalParagraphs(root).find(p=>p===node||p.contains(node));
    if(!block)return false;
    const rect=node.getBoundingClientRect();
    const direction=typeof getComputedStyle==='function'
        ?getComputedStyle(block).direction:block.dir||'ltr';
    const before=direction==='rtl'?clientX>=rect.left+rect.width/2:
        clientX<rect.left+rect.width/2;
    try{
        const range=document.createRange();
        if(before)range.setStartBefore(node);else range.setStartAfter(node);
        range.collapse(true);
        root.focus();
        selection.removeAllRanges();
        selection.addRange(range);
        return true;
    }catch{return false;}
}
