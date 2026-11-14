import {compactRuns,readRichDocument,validateRuns,validateParagraphs,writeRuns} from './rich-text.js?v=20261017-history-budget';
import {editableParagraphs} from './text-lists.js';

/** Apply formatting to [start,end) in document text, preserving paragraph metadata. */
export function formatDocumentRange(snapshot,start,end,name,value){
    if(!snapshot||!Array.isArray(snapshot.runs)||!Array.isArray(snapshot.paragraphs))return null;
    const original=snapshot.runs.map(r=>r.text).join('');
    if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end>original.length||start>=end)return null;
    const keys={bold:'bold',italic:'italic',underline:'underline',strikeThrough:'strike'};
    if(!keys[name]&&!['foreColor','removeFormat'].includes(name))return null;
    if(name==='foreColor'&&!/^#[0-9a-f]{6}$/i.test(value||''))return null;
    let probe=0;
    const selected=[];
    for(const run of snapshot.runs){
        const from=probe;probe+=run.text.length;
        if(probe>start&&from<end&&!run.equation&&run.text.slice(Math.max(start,from)-from,Math.min(end,probe)-from).replace(/\n/g,''))selected.push(run);
    }
    if(!selected.length)return null;
    const prop=keys[name],turnOn=prop?!selected.every(r=>r[prop]===true):false;
    let cursor=0;const out=[];
    for(const run of snapshot.runs){
        const runStart=cursor,runEnd=cursor+run.text.length;
        cursor=runEnd;
        if(run.equation||runEnd<=start||runStart>=end){out.push({...run});continue;}
        const a=Math.max(start,runStart)-runStart,b=Math.min(end,runEnd)-runStart;
        if(a>0)out.push({...run,text:run.text.slice(0,a)});
        for(const part of run.text.slice(a,b).split(/(\n)/)){
            if(!part)continue;
            if(part==='\n'){out.push({...run,text:part});continue;}
            const middle={...run,text:part};
            if(name==='removeFormat'){
                for(const p of ['bold','italic','underline','strike','color'])delete middle[p];
            }else if(name==='foreColor')middle.color=value.toLowerCase();
            else middle[prop]=turnOn;
            out.push(middle);
        }
        if(b<run.text.length)out.push({...run,text:run.text.slice(b)});
    }
    const result={runs:compactRuns(out),paragraphs:structuredClone(snapshot.paragraphs)};
    if(result.runs.map(r=>r.text).join('')!==original)throw new Error('Formatting must preserve text.');
    validateRuns(result.runs,original);
    validateParagraphs(result.paragraphs,original);
    return result;
}
function ancestorBlock(node,root,blocks){
    for(let n=node;n&&n!==root;n=n.parentNode)if(blocks.includes(n))return n;
    return null;
}
function offsetInBlock(block,node,offset){
    const prefix=document.createRange();
    prefix.selectNodeContents(block);
    prefix.setEnd(node,offset);
    const extracted=prefix.cloneContents();
    return prefix.toString().length+(extracted.querySelectorAll?.('.inline-equation').length||0);
}
function positionInBlock(block,offset){
    const visit=node=>{
        if(node.nodeType===3){
            if(offset<=node.textContent.length)return {node,offset};
            offset-=node.textContent.length;return null;
        }
        if(node.nodeType!==1)return null;
        for(let i=0;i<node.childNodes.length;i++){
            const child=node.childNodes[i];
            if(child.dataset?.equation){
                if(offset===0)return {node,offset:i};
                offset--;if(offset===0)return {node,offset:i+1};
            }else{
                const found=visit(child);if(found)return found;
            }
        }
        return null;
    };
    return visit(block)||{node:block,offset:block.childNodes.length};
}
/** Map native DOM boundary points to the plain-text (UTF-16) document. */
export function rangeDocumentOffsets(root,selection,snapshot){
    if(!selection?.rangeCount)return null;
    const range=selection.getRangeAt(0);
    if(range.collapsed||!root.contains(range.startContainer)||!root.contains(range.endContainer))return null;
    const blocks=editableParagraphs(root);
    if(blocks.length!==snapshot.paragraphs.length)return null;
    const a=ancestorBlock(range.startContainer,root,blocks),b=ancestorBlock(range.endContainer,root,blocks);
    if(!a||!b)return null;
    const ai=blocks.indexOf(a),bi=blocks.indexOf(b);
    if(ai===bi)return null;
    const rows=snapshot.runs.map(r=>r.text).join('').split('\n');
    const before=index=>rows.slice(0,index).reduce((n,t)=>n+t.length+1,0);
    const start=before(ai)+offsetInBlock(a,range.startContainer,range.startOffset);
    const end=before(bi)+offsetInBlock(b,range.endContainer,range.endOffset);
    return start<end&&end<=rows.join('\n').length?{start,end}:null;
}
/** Rebuild from validated text runs; preserve selection using character offsets. */
export function applyDocumentRange(root,item,selection,name,value){
    const snapshot=readRichDocument(root,item);
    const offsets=rangeDocumentOffsets(root,selection,snapshot);
    if(!offsets)return false;
    const changed=formatDocumentRange(snapshot,offsets.start,offsets.end,name,value);
    if(!changed)return false;
    const text=changed.runs.map(r=>r.text).join('');
    writeRuns(root,{...item,text,...changed});
    const blocks=editableParagraphs(root),rows=text.split('\n');
    const locate=absolute=>{
        let index=0;
        while(index<rows.length-1&&absolute>rows[index].length){absolute-=rows[index].length+1;index++;}
        return positionInBlock(blocks[index],absolute);
    };
    try{
        const a=locate(offsets.start),b=locate(offsets.end);
        const range=document.createRange();
        range.setStart(a.node,a.offset);range.setEnd(b.node,b.offset);
        selection.removeAllRanges();selection.addRange(range);
    }catch{
        // The data model is already valid; a stale range must not make it unsavable.
        const range=document.createRange();
        range.selectNodeContents(root);range.collapse(false);
        selection.removeAllRanges();selection.addRange(range);
    }
    return true;
}
