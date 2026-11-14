import {readRichDocument,writeRuns,validateParagraphs,validateRuns} from './rich-text.js?v=20261017-history-budget';
import {captureTextSelection,restoreTextSelection} from './text-selection.js';

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
export function selectedParagraphIndices(root,selection,blocks=editableParagraphs(root)){
    if(!selection?.rangeCount)return [];
    const range=selection.getRangeAt(0);
    if(!root.contains(range.startContainer)||!root.contains(range.endContainer))return [];
    if(range.collapsed){
        const at=blocks.findIndex(b=>b.contains(range.startContainer));
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
    const range=selection.getRangeAt(0);
    const one=indices.length===1&&range.collapsed;
    const saved=one?captureTextSelection(blocks[indices[0]],selection):null;
    writeRuns(root,{...item,text,runs:snapshot.runs,paragraphs});
    const newBlocks=editableParagraphs(root);
    if(newBlocks.length!==blocks.length)throw new Error('Paragraph count changed during list formatting.');
    if(one&&saved&&restoreTextSelection(newBlocks[indices[0]],selection,saved))return true;
    const first=newBlocks[indices[0]],last=newBlocks[indices[indices.length-1]];
    const newRange=document.createRange();
    newRange.selectNodeContents(first);
    if(indices.length>1)newRange.setEnd(last,last.childNodes.length);
    else newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
    return true;
}
