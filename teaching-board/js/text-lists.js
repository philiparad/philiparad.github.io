import {readRichDocument,writeRuns,validateParagraphs,validateRuns} from './rich-text.js?v=20261017-history-budget';
import {captureLogicalSelection,restoreLogicalSelection} from './text-selection.js';

/** Toggle list metadata without touching text runs, equation sources, or directions. */
export function toggleParagraphLists(paragraphs,indices,kind){
    if(!['bullet','number'].includes(kind))throw new Error('Unsupported list type.');
    if(!Array.isArray(paragraphs)||!Array.isArray(indices)||!indices.length)return null;
    const unique=[...new Set(indices)];
    if(unique.some(i=>!Number.isInteger(i)||i<0||i>=paragraphs.length))return null;
    const remove=unique.every(i=>paragraphs[i].list===kind);
    return paragraphs.map((row,i)=>{
        if(!unique.includes(i))return {...row};
        const list=remove?'none':kind;
        const {numberStart,...rest}=row;
        return {...rest,list,...(list==='number'&&row.list==='number'&&numberStart!==undefined?{numberStart}:{})};
    });
}

/** Return paragraph elements in the same order as writeRuns/paragraphRuns. */
export function editableParagraphs(root){
    const result=[];
    for(const node of root.children){
        if(['DIV','P','LI'].includes(node.tagName))result.push(node);
        else if(['UL','OL'].includes(node.tagName)){
            for(const child of node.children)if(child.tagName==='LI')result.push(child);
        }
    }
    return result;
}
/**
 * Convert anchor/focus paragraph offsets into exactly the paragraphs
 * containing selected characters. A selection ending at the next row's
 * offset 0 must not accidentally format that unselected row.
 * Works for forwards, backwards, collapsed and equation-adjacent selections.
 */
export function logicalSelectedParagraphIndices(saved,count){
    if(!saved?.anchor||!saved?.focus||!Number.isInteger(count)||count<1)return [];
    const a=saved.anchor,b=saved.focus;
    if([a,b].some(p=>!Number.isInteger(p.paragraph)||p.paragraph<0||
        p.paragraph>=count||!Number.isInteger(p.offset)||p.offset<0))return [];
    const cmp=(u,v)=>u.paragraph-v.paragraph||u.offset-v.offset;
    const from=cmp(a,b)<=0?a:b,to=cmp(a,b)<=0?b:a;
    const last=cmp(from,to)!==0&&to.paragraph>from.paragraph&&to.offset===0?
        to.paragraph-1:to.paragraph;
    return Array.from({length:Math.max(0,last-from.paragraph+1)},
        (_,i)=>from.paragraph+i);
}
export function selectedParagraphIndices(root,selection,blocks=editableParagraphs(root)){
    if(!selection?.rangeCount)return [];
    const logical=captureLogicalSelection(root,selection);
    if(logical){
        const indices=logicalSelectedParagraphIndices(logical,blocks.length);
        if(indices.length)return indices;
    }
    const range=selection.getRangeAt(0);
    if(!root.contains(range.startContainer)||!root.contains(range.endContainer))return [];
    if(range.collapsed){
        let at=blocks.findIndex(b=>b.contains(range.startContainer));
        if(at<0&&range.startContainer===root&&blocks.length){
            // A browser may place the caret at the contenteditable root,
            // between its block children, instead of within a text node.
            const offset=Math.max(0,Math.min(root.childNodes.length,range.startOffset));
            let child=root.childNodes[offset];
            if(!child&&offset)child=root.childNodes[offset-1];
            at=blocks.findIndex(block=>child===block||child?.contains?.(block));
            if(at<0)at=offset===0?0:blocks.length-1;
            if(offset===root.childNodes.length)at=blocks.length-1;
        }
        return at<0?[]:[at];
    }
    if(typeof range.intersectsNode!=='function')return [];
    return blocks.flatMap((block,i)=>range.intersectsNode(block)?[i]:[]);
}

/**
 * Change selected paragraphs using the safe plain-data model.
 * Rebuild only after validation, then restore the caret for a single
 * paragraph, or reselect all affected paragraphs for multi-paragraph edits.
 */
export function applyParagraphList(root,item,selection,kind){
    const blocks=editableParagraphs(root);
    const indices=selectedParagraphIndices(root,selection,blocks);
    if(!indices.length)return false;
    const snapshot=readRichDocument(root,item);
    const text=snapshot.runs.map(run=>run.text).join('');
    validateRuns(snapshot.runs,text);
    validateParagraphs(snapshot.paragraphs,text);
    if(snapshot.paragraphs.length!==blocks.length)return false;
    const paragraphs=toggleParagraphLists(snapshot.paragraphs,indices,kind);
    if(!paragraphs)return false;
    const saved=captureLogicalSelection(root,selection);
    writeRuns(root,{...item,text,runs:snapshot.runs,paragraphs});
    const newBlocks=editableParagraphs(root);
    if(newBlocks.length!==blocks.length)throw new Error('Paragraph count changed during list formatting.');
    if(saved&&restoreLogicalSelection(root,selection,saved))return true;
    const first=newBlocks[indices[0]],last=newBlocks[indices[indices.length-1]];
    const newRange=document.createRange();
    newRange.selectNodeContents(first);
    if(indices.length>1)newRange.setEnd(last,last.childNodes.length);
    else newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
    return true;
}
