import {readRichDocument,writeRuns,validateParagraphs} from './rich-text.js?v=20261017-history-budget';
import {captureLogicalSelection,restoreLogicalSelection} from './text-selection.js';
import {logicalSelectedParagraphIndices} from './text-lists.js';

/** Pure formatting over a validated flat paragraph model. */
export function formatSelectedParagraphs(snapshot,saved,property,value){
    if(!snapshot?.paragraphs||!Array.isArray(snapshot.paragraphs))return null;
    if(property==='align'&&!['auto','left','center','right'].includes(value))return null;
    if(property==='dir'&&!['auto','rtl','ltr'].includes(value))return null;
    if(!['align','dir'].includes(property))return null;
    const text=snapshot.runs?.map(r=>r.text).join('');
    if(typeof text!=='string')return null;
    try{validateParagraphs(snapshot.paragraphs,text);}catch{return null;}
    const indices=logicalSelectedParagraphIndices(saved,snapshot.paragraphs.length);
    if(!indices.length)return null;
    const paragraphs=structuredClone(snapshot.paragraphs);
    for(const i of indices)paragraphs[i][property]=value;
    return {runs:structuredClone(snapshot.runs),paragraphs,indices,
        changed:indices.some(i=>snapshot.paragraphs[i][property]!==value)};
}

/** Format selected rows and restore the exact logical, possibly backwards selection. */
export function applyParagraphFormatting(root,item,selection,property,value){
    if(!selection?.rangeCount)return false;
    const saved=captureLogicalSelection(root,selection);
    if(!saved)return false;
    const snapshot=readRichDocument(root,item);
    const changed=formatSelectedParagraphs(snapshot,saved,property,value);
    if(!changed||!changed.changed)return false;
    const text=snapshot.runs.map(r=>r.text).join('');
    writeRuns(root,{...item,text,runs:changed.runs,paragraphs:changed.paragraphs});
    restoreLogicalSelection(root,selection,saved);
    return true;
}
