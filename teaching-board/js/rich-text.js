import {validateInlineEquation,equationNode} from './inline-equation.js?v=20261017-history-patches';
/** Plain data only: no HTML is stored in lessons or exports. */
export function textRuns(item){return item.runs||[{text:item.text||'',bold:(item.textStyle||'').includes('bold'),italic:(item.textStyle||'').includes('italic'),underline:false}];}
export function validateRuns(runs,text){
 if(!Array.isArray(runs)||runs.length>10000)throw new Error('Invalid formatted text.');
 for(const run of runs){if(!run||typeof run.text!=='string')throw new Error('Invalid text run.');if(run.equation!==undefined){validateInlineEquation(run.equation);if(run.text!=='\uFFFC')throw new Error('Invalid equation placeholder.');}for(const key of ['bold','italic','underline'])if(run[key]!==undefined&&typeof run[key]!=='boolean')throw new Error('Invalid text formatting.');if(run.color!==undefined&&!/^#[0-9a-f]{6}$/i.test(run.color))throw new Error('Invalid text color.');}
 if(runs.map(r=>r.text).join('')!==text||text.length>10000)throw new Error('Formatted text does not match its plain text.');
}
export function compactRuns(runs){const result=[];for(const run of runs){if(!run.text)continue;const clean={text:run.text,bold:!!run.bold,italic:!!run.italic,underline:!!run.underline,...(run.color?{color:run.color}:{}),...(run.equation?{equation:structuredClone(run.equation)}:{})},last=result.at(-1);if(last&&!last.equation&&!clean.equation&&['bold','italic','underline','color'].every(k=>last[k]===clean[k]))last.text+=clean.text;else result.push(clean);}return result;}
export function colorHex(value){if(/^#[0-9a-f]{6}$/i.test(value||''))return value.toLowerCase();const rgb=/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/.exec(value||'');return rgb&&rgb.slice(1).every(n=>+n<=255)?'#'+rgb.slice(1).map(n=>(+n).toString(16).padStart(2,'0')).join(''):undefined;}
export function validateParagraphs(paragraphs,text){if(!Array.isArray(paragraphs)||paragraphs.length!==text.split('\n').length||paragraphs.some(p=>!p||!['auto','left','center','right'].includes(p.align)||!['none','bullet','number'].includes(p.list)))throw new Error('Invalid text paragraphs.');}
export function paragraphRuns(item){const rows=[[]];for(const run of textRuns(item)){const parts=run.text.split('\n');parts.forEach((text,k)=>{if(k)rows.push([]);if(text)rows.at(-1).push({...run,text});});}return rows.map((runs,k)=>({runs,align:item.paragraphs?.[k]?.align||item.textAlign||'auto',list:item.paragraphs?.[k]?.list||'none'}));}
export function readRichDocument(root,item){
 const rows=[],base=textRuns({...item,runs:undefined})[0],defaultMeta={align:item.textAlign||'auto',list:'none'};let current=[],meta={...defaultMeta},trailing=false;
 const flush=force=>{if(current.length||force)rows.push({runs:compactRuns(current),...meta});current=[];trailing=false;};
 const walk=(node,style,inherited)=>{if(node.nodeType===3){const parts=node.textContent.split('\n');parts.forEach((text,k)=>{if(k){flush(true);trailing=true;}if(text){current.push({...style,text});trailing=false;}});return;}if(node.nodeType!==1)return;if(node.dataset?.equation){const equation=JSON.parse(node.dataset.equation);validateInlineEquation(equation);current.push({text:'\uFFFC',equation});trailing=false;return;}const tag=node.tagName.toLowerCase();if(['script','style','img','iframe','object'].includes(tag))return;
 if(tag==='br'){if(node.parentNode?.childNodes.length===1)return;flush(true);trailing=true;return;}
 const next={...style},s=node.style;for(const [key,tags]of [['bold',['b','strong']],['italic',['i','em']],['underline',['u']]])if(tags.includes(tag))next[key]=true;
 if(s.fontWeight)next.bold=s.fontWeight==='bold'||+s.fontWeight>=600;if(s.fontStyle)next.italic=s.fontStyle==='italic';if(s.textDecorationLine||s.textDecoration)next.underline=(s.textDecorationLine||s.textDecoration).includes('underline');const color=colorHex(s.color||node.getAttribute('color'));if(color)next.color=color;
 const nextMeta={...inherited};if(['left','center','right'].includes(s.textAlign))nextMeta.align=s.textAlign;if(tag==='li')nextMeta.list=node.parentNode?.tagName==='OL'?'number':'bullet';
 const block=['div','p','li'].includes(tag);if(block){flush(false);meta=nextMeta;}const before=rows.length;
 for(const child of node.childNodes)walk(child,next,nextMeta);
 if(block){flush(current.length>0||rows.length===before);meta={...inherited};}
 };
 for(const node of root.childNodes)walk(node,base,defaultMeta);flush(trailing||!rows.length);
 const runs=compactRuns(rows.flatMap((row,k)=>[...(k?[{text:'\n'}]:[]),...row.runs]));return {runs,paragraphs:rows.map(({align,list})=>({align,list}))};
}
export function readRuns(root,item){return readRichDocument(root,item).runs;}
export function writeRuns(root,item){root.replaceChildren();let list=null,lastList='none';for(const row of paragraphRuns(item)){let parent=root;if(row.list!=='none'){if(row.list!==lastList){list=document.createElement(row.list==='number'?'ol':'ul');root.append(list);}parent=list;}else list=null;lastList=row.list;
 const block=document.createElement(row.list==='none'?'div':'li');block.style.textAlign=row.align==='auto'?'start':row.align;parent.append(block);if(!row.runs.length)block.append(document.createElement('br'));
 for(const run of row.runs){if(run.equation){block.append(equationNode(run.equation,item.fontSize||24));continue;}const span=document.createElement('span');span.textContent=run.text;Object.assign(span.style,{fontWeight:run.bold?'700':'400',fontStyle:run.italic?'italic':'normal',textDecoration:run.underline?'underline':'none',...(run.color?{color:run.color}:{})});block.append(span);}}
}
/** Preserve formatting boundaries and explicit newlines while wrapping. */
export function runLines(runs,max){const lines=[[]];let count=0;for(const run of runs)for(const part of run.text.split(/(\n|[^\S\n]+)/)){if(!part)continue;if(part==='\n'){lines.push([]);count=0;continue;}if(count&&count+part.length>max&&!/^\s+$/.test(part)){lines.push([]);count=0;}lines.at(-1).push({...run,text:part});count+=part.length;}return lines.map(compactRuns);}
