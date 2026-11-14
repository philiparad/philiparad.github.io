import {compactRuns,validateRuns,validateParagraphs} from './rich-text.js?v=20261017-history-budget';
import {captureLogicalSelection} from './text-selection.js';

export const TEXT_RICH_CLIPBOARD='application/x-teaching-board-rich-text+json';
const MAX_CLIPBOARD_BYTES=4_000_000;
const MAX_HTML_BYTES=MAX_CLIPBOARD_BYTES*3+100_000;
const emptyParagraph=()=>({align:'auto',list:'none',dir:'auto'});
const chars=runs=>runs.map(run=>run.text).join('');
const linesBefore=(text,offset)=>text.slice(0,offset).split('\n').length-1;
function numberedItemAt(paragraphs,index){
    let number=0,previous='none';
    for(let i=0;i<=index;i++){
        const p=paragraphs[i];
        number=p.list==='number'?(p.numberStart??(previous==='number'?number+1:1)):0;
        previous=p.list;
    }
    return number;
}
function paragraphOffset(rows,index){
    let offset=0;
    for(let i=0;i<index;i++)offset+=rows[i].length+1;
    return offset;
}
const escapeHtml=text=>text.replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');

/** All clipboard content is treated as untrusted, even when it looks internal. */
export function validateRichClipboard(value) {
    if(!value||value.schema!==1||!Array.isArray(value.runs)||
        !Array.isArray(value.paragraphs))return null;
    try {
        const runs=structuredClone(value.runs),paragraphs=structuredClone(value.paragraphs);
        const text=chars(runs);
        validateRuns(runs,text);
        validateParagraphs(paragraphs,text);
        // U+FFFC represents a complete, independently validated image equation.
        // A plain placeholder with no equation would not survive the HTML editor.
        if(runs.some(run=>run.equation ? run.text!=='\uFFFC':
            run.text.includes('\uFFFC')))return null;
        const payload={schema:1,runs,paragraphs};
        if(JSON.stringify(payload).length>MAX_CLIPBOARD_BYTES)return null;
        return payload;
    }catch{return null;}
}
export function parseRichClipboard(raw){
    if(typeof raw!=='string'||raw.length>MAX_CLIPBOARD_BYTES)return null;
    try{return validateRichClipboard(JSON.parse(raw));}catch{return null;}
}
function sliceRuns(runs,start,end){
    let at=0;
    const result=[];
    for(const run of runs){
        const left=at,right=at+run.text.length;at=right;
        if(right<=start||left>=end)continue;
        const text=run.text.slice(Math.max(0,start-left),Math.min(run.text.length,end-left));
        if(run.equation&&text!=='\uFFFC')throw new Error('Cannot split an equation.');
        if(text)result.push({...run,text});
    }
    return compactRuns(result);
}
function absolutePoint(snapshot,point){
    if(!point||!Number.isInteger(point.paragraph)||!Number.isInteger(point.offset))
        return null;
    const rows=chars(snapshot.runs).split('\n'),p=point.paragraph;
    if(p<0||p>=rows.length||point.offset<0||point.offset>rows[p].length)return null;
    return rows.slice(0,p).reduce((n,row)=>n+row.length+1,0)+point.offset;
}
export function absoluteCaret(snapshot,offset){
    const text=chars(snapshot.runs);
    if(!Number.isInteger(offset)||offset<0||offset>text.length)return null;
    const before=text.slice(0,offset),parts=before.split('\n');
    return {paragraph:parts.length-1,offset:parts.at(-1).length};
}
export function logicalClipboardRange(root,selection,snapshot,allowCollapsed=false){
    if(!selection?.rangeCount)return null;
    const saved=captureLogicalSelection(root,selection);
    if(!saved)return null;
    const a=absolutePoint(snapshot,saved.anchor),b=absolutePoint(snapshot,saved.focus);
    if(a===null||b===null||(!allowCollapsed&&a===b))return null;
    return {start:Math.min(a,b),end:Math.max(a,b)};
}
/** Copy runs by absolute UTF-16 offsets, preserving each equation as one token. */
export function selectedRichClipboard(snapshot,start,end){
    const original=validateRichClipboard({schema:1,...snapshot});
    if(!original)return null;
    const text=chars(original.runs);
    if(!Number.isInteger(start)||!Number.isInteger(end)||
        start<0||end>text.length||start>=end)return null;
    const excerpt=text.slice(start,end),begin=linesBefore(text,start);
    const paragraphs=original.paragraphs.slice(begin,begin+excerpt.split('\n').length);
    // A copied middle numbered-list item must still start at its actual
    // visible ordinal even when its original <ol start> was in an earlier row.
    if(paragraphs[0]?.list==='number')
        paragraphs[0]={...paragraphs[0],
            numberStart:numberedItemAt(original.paragraphs,begin)};
    return validateRichClipboard({schema:1,
        runs:sliceRuns(original.runs,start,end),paragraphs
    });
}
export function clipboardPlainText(payload){
    return payload.runs.map(run=>run.equation?'\\('+run.equation.source+'\\)':run.text).join('');
}
function htmlRun(run){
    const text=escapeHtml(run.equation?'\\('+run.equation.source+'\\)':run.text);
    if(run.equation)
        return '<span role="math" aria-label="'+
            escapeHtml('Math equation: '+run.equation.source)+'">'+text+'</span>';
    let result=text;
    if(run.bold)result='<strong>'+result+'</strong>';
    if(run.italic)result='<em>'+result+'</em>';
    if(run.underline)result='<u>'+result+'</u>';
    if(run.strike)result='<s>'+result+'</s>';
    if(run.color)result='<span style="color:'+run.color+'">'+result+'</span>';
    return result;
}
function htmlParagraphRuns(runs){
    const rows=[[]];
    for(const run of runs){
        if(run.equation){rows.at(-1).push(htmlRun(run));continue;}
        const parts=run.text.split('\n');
        parts.forEach((text,i)=>{
            if(i)rows.push([]);
            if(text)rows.at(-1).push(htmlRun({...run,text}));
        });
    }
    return rows.map(row=>row.join('')||'<br>');
}
/** A semantic, safe HTML representation for external document editors. */
export function clipboardHTML(payload){
    const safe=validateRichClipboard(payload);
    if(!safe)return '';
    const rows=htmlParagraphRuns(safe.runs);
    let html='<div data-teaching-board-rich="'+
        encodeURIComponent(JSON.stringify(safe))+'">',list='none',number=0;
    const close=()=>{if(list!=='none')html+='</'+(list==='number'?'ol':'ul')+'>';};
    for(let i=0;i<rows.length;i++){
        const p=safe.paragraphs[i],dir=p.dir||'auto',align=p.align||'auto';
        const next=p.list==='number'?(p.numberStart??(list==='number'?number+1:1)):0;
        const restart=p.list!==list||p.list==='number'&&p.numberStart!==undefined&&
            (list!=='number'||p.numberStart!==number+1);
        if(restart){
            close();list=p.list;
            if(list==='number')html+='<ol start="'+next+'">';
            else if(list==='bullet')html+='<ul>';
        }
        number=next;
        const attributes=' dir="'+dir+'" style="text-align:'+
            (align==='auto'?'start':align)+'"';
        if(list==='none')html+='<p'+attributes+'>'+rows[i]+'</p>';
        else html+='<li'+attributes+'>'+rows[i]+'</li>';
    }
    close();
    return html+'</div>';
}
export function clipboardFromTransfer(data){
    if(!data||typeof data.getData!=='function')return null;
    try{
        const direct=parseRichClipboard(data.getData(TEXT_RICH_CLIPBOARD));
        if(direct)return direct;
        const html=data.getData('text/html')||'';
        if(html.length<=MAX_HTML_BYTES){
            // Parse only an inert clipboard fragment, never inject its DOM.
            if(typeof DOMParser!=='undefined'){
                const doc=new DOMParser().parseFromString(html,'text/html');
                const node=doc.querySelector('[data-teaching-board-rich]');
                if(node){
                    const encoded=node.getAttribute('data-teaching-board-rich');
                    if(encoded&&encoded.length<=MAX_HTML_BYTES){
                        const parsed=parseRichClipboard(decodeURIComponent(encoded));
                        if(parsed)return parsed;
                    }
                }
            }
        }
    }catch{/* Damaged or hostile clipboard metadata falls back to plain text. */}
    return null;
}
/**
 * Choose plain-text paste formatting from the destination paragraph, not
 * from the clipboard (which has no formatting). Never borrow math-image
 * metadata or a style from a different paragraph. Native collapsed-caret
 * input favors the preceding text run; replacing a selection favors the
 * selected run's leading style. At the very start, use the following run.
 */
export function plainPasteStyle(snapshot,start,end=start,marks=null){
    if(!snapshot||!Array.isArray(snapshot.runs))return null;
    const text=chars(snapshot.runs);
    if(!Number.isInteger(start)||!Number.isInteger(end)||
       start<0||end<start||end>text.length)return null;
    const paragraphStart=text.lastIndexOf('\n',start-1)+1;
    const newline=text.indexOf('\n',start);
    const paragraphEnd=newline<0?text.length:newline;
    const candidates=[];
    let position=0;
    for(const run of snapshot.runs){
        const from=position,to=position+run.text.length;position=to;
        if(run.equation||!run.text||to<=paragraphStart||from>=paragraphEnd)continue;
        const left=Math.max(from,paragraphStart),right=Math.min(to,paragraphEnd);
        if(left<right)candidates.push({run,from:left,to:right});
    }
    let chosen;
    if(end>start)chosen=candidates.find(part=>part.from<=start&&start<part.to);
    if(!chosen)chosen=candidates.find(part=>part.from<start&&part.to>=start);
    if(!chosen)chosen=candidates.find(part=>part.from<=start&&start<part.to);
    if(!chosen)chosen=candidates.find(part=>part.from>=start);
    if(!chosen)chosen=candidates.at(-1);
    const style={};
    if(chosen){
        for(const key of ['bold','italic','underline','strike'])if(chosen.run[key]!==undefined)
            style[key]=chosen.run[key];
        if(chosen.run.color)style.color=chosen.run.color;
    }
    if(marks){
        for(const key of ['bold','italic','underline'])if(typeof marks[key]==='boolean')
            style[key]=marks[key];
        if(typeof marks.strikeThrough==='boolean')style.strike=marks.strikeThrough;
        if(marks.color===null)delete style.color;
        else if(typeof marks.color==='string'&&/^#[0-9a-f]{6}$/i.test(marks.color))
            style.color=marks.color.toLowerCase();
    }
    return style;
}
/**
 * Merge paragraph metadata at the actual text boundaries:
 * - unchanged prefix keeps destination formatting;
 * - fully replaced first/empty paragraph takes source formatting;
 * - inserted interior paragraphs keep source direction and list ordinals;
 * - a surviving suffix keeps its destination paragraph formatting;
 * - external plain text inherits the destination style for its new lines.
 *
 * Numbering is normalized by the normal rich-text writer after validation;
 * source numberStart is preserved when pasted at a genuine paragraph boundary.
 */
export function replaceRichClipboard(snapshot,start,end,fragment,{plainText=false,marks=null}={}){
    const original=validateRichClipboard({schema:1,...snapshot});
    if(!original||!fragment||!Array.isArray(fragment.runs))return null;
    const payload=validateRichClipboard(fragment);
    if(!payload)return null;
    const text=chars(original.runs),insertion=chars(payload.runs);
    if(!Number.isInteger(start)||!Number.isInteger(end)||
        start<0||end<start||end>text.length||(!insertion&&start===end))return null;
    const updated=text.slice(0,start)+insertion+text.slice(end);
    if(updated.length>10000)return null;
    try{
        const insertionRuns=plainText?payload.runs.map(run=>({
            ...run,...plainPasteStyle(original,start,end,marks)
        })):payload.runs;
        const runs=compactRuns([
            ...sliceRuns(original.runs,0,start),
            ...insertionRuns,
            ...sliceRuns(original.runs,end,text.length)
        ]);
        const oldRows=text.split('\n'),newRows=insertion.split('\n');
        const first=linesBefore(text,start),last=linesBefore(text,end);
        const prefix=oldRows[first].slice(0,start-paragraphOffset(oldRows,first));
        const suffix=oldRows[last].slice(end-paragraphOffset(oldRows,last));
        const replaceWholeFirst=start!==end&&
            (last>first||end-paragraphOffset(oldRows,last)===oldRows[first].length);
        const sourceOwnsFirst=!!insertion&&!plainText&&!prefix.length&&
            (oldRows[first].length===0||replaceWholeFirst);
        const deletingWholeLeadingRows=!insertion&&!prefix.length&&last>first;
        let firstMeta=sourceOwnsFirst?payload.paragraphs[0]:original.paragraphs[first];
        if(deletingWholeLeadingRows){
            firstMeta=structuredClone(original.paragraphs[last]);
            // A surviving second-or-later numbered item needs its real
            // starting ordinal when all earlier list items were removed.
            if(firstMeta.list==='number')
                firstMeta.numberStart=numberedItemAt(original.paragraphs,last);
        }
        const paragraphs=[
            ...structuredClone(original.paragraphs.slice(0,first)),
            structuredClone(firstMeta)
        ];
        for(let i=1;i<newRows.length;i++){
            let p;
            if(i===newRows.length-1&&suffix.length&&(plainText||last>first)){
                // A surviving destination suffix takes its own formatting
                // when the paste replaced multiple existing paragraphs.
                // When a rich fragment splits ONE paragraph, its new last
                // paragraph keeps the source metadata instead.
                p=structuredClone(original.paragraphs[last]);
                // Splitting one numbered item with plain multiline paste
                // must continue its ordinal rather than restart at the
                // original explicit <ol start> on the suffix line.
                if(plainText&&last===first&&p.list==='number')delete p.numberStart;
            }else if(plainText){
                p=structuredClone(original.paragraphs[first]);
                if(p.list==='number')delete p.numberStart;
            }else{
                p=structuredClone(payload.paragraphs[i]);
                // If the copied first numbered item merged into a non-list
                // destination prefix, preserve the visible ordinal of the
                // next copied numbered item rather than starting at 1.
                const prior=paragraphs.at(-1);
                if(p.list==='number'&&p.numberStart===undefined&&
                    payload.paragraphs[i-1].list==='number'&&prior.list!=='number')
                    p.numberStart=numberedItemAt(payload.paragraphs,i);
            }
            paragraphs.push(p);
        }
        paragraphs.push(...structuredClone(original.paragraphs.slice(last+1)));
        validateRuns(runs,updated);validateParagraphs(paragraphs,updated);
        return {runs,paragraphs,text:updated,
            cursor:absoluteCaret({runs},start+insertion.length)};
    }catch{return null;}
}
/** Plain text is safe; no HTML, URLs, or images are interpreted as markup. */
export function plainClipboard(text){
    if(typeof text!=='string'||!text||text.length>10000)return null;
    const clean=text.replace(/\r\n?/g,'\n');
    return validateRichClipboard({schema:1,
        runs:[{text:clean}],
        paragraphs:clean.split('\n').map(emptyParagraph)
    });
}
