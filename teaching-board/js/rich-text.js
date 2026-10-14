/** Plain data only: no HTML is stored in lessons or exports. */
export function textRuns(item){return item.runs||[{text:item.text||'',bold:(item.textStyle||'').includes('bold'),italic:(item.textStyle||'').includes('italic'),underline:false}];}
export function validateRuns(runs,text){
 if(!Array.isArray(runs)||runs.length>10000)throw new Error('Invalid formatted text.');
 for(const run of runs){if(!run||typeof run.text!=='string')throw new Error('Invalid text run.');for(const key of ['bold','italic','underline'])if(run[key]!==undefined&&typeof run[key]!=='boolean')throw new Error('Invalid text formatting.');if(run.color!==undefined&&!/^#[0-9a-f]{6}$/i.test(run.color))throw new Error('Invalid text color.');}
 if(runs.map(r=>r.text).join('')!==text||text.length>10000)throw new Error('Formatted text does not match its plain text.');
}
export function compactRuns(runs){const result=[];for(const run of runs){if(!run.text)continue;const clean={text:run.text,bold:!!run.bold,italic:!!run.italic,underline:!!run.underline,...(run.color?{color:run.color}:{})},last=result.at(-1);if(last&&['bold','italic','underline','color'].every(k=>last[k]===clean[k]))last.text+=clean.text;else result.push(clean);}return result;}
export function colorHex(value){if(/^#[0-9a-f]{6}$/i.test(value||''))return value.toLowerCase();const rgb=/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/.exec(value||'');return rgb&&rgb.slice(1).every(n=>+n<=255)?'#'+rgb.slice(1).map(n=>(+n).toString(16).padStart(2,'0')).join(''):undefined;}
export function readRuns(root,item){
 const runs=[],base=textRuns({...item,runs:undefined})[0];
 const add=(text,style)=>{if(text)runs.push({...style,text});};
 const walk=(node,style)=>{if(node.nodeType===3){add(node.textContent,style);return;}if(node.nodeType!==1)return;const tag=node.tagName.toLowerCase();if(['script','style','img','iframe','object'].includes(tag))return;if(tag==='br'){add('\n',style);return;}
 const next={...style},s=node.style;for(const [key,tags]of [['bold',['b','strong']],['italic',['i','em']],['underline',['u']]])if(tags.includes(tag))next[key]=true;
 if(s.fontWeight)next.bold=s.fontWeight==='bold'||+s.fontWeight>=600;if(s.fontStyle)next.italic=s.fontStyle==='italic';if(s.textDecorationLine||s.textDecoration)next.underline=(s.textDecorationLine||s.textDecoration).includes('underline');const color=colorHex(s.color||node.getAttribute('color'));if(color)next.color=color;
 const block=['div','p'].includes(tag)&&node!==root;if(block&&runs.length&&!runs.at(-1).text.endsWith('\n'))add('\n',next);
 for(const child of node.childNodes)walk(child,next);
 if(block&&node.nextSibling&&!runs.at(-1)?.text.endsWith('\n'))add('\n',next);
 };
 for(const node of root.childNodes)walk(node,base);return compactRuns(runs);
}
export function writeRuns(root,item){root.replaceChildren();for(const run of textRuns(item)){const span=document.createElement('span');span.textContent=run.text;Object.assign(span.style,{fontWeight:run.bold?'700':'400',fontStyle:run.italic?'italic':'normal',textDecoration:run.underline?'underline':'none',...(run.color?{color:run.color}:{})});root.append(span);}}
/** Preserve formatting boundaries and explicit newlines while wrapping. */
export function runLines(runs,max){const lines=[[]];let count=0;for(const run of runs)for(const part of run.text.split(/(\n|[^\S\n]+)/)){if(!part)continue;if(part==='\n'){lines.push([]);count=0;continue;}if(count&&count+part.length>max&&!/^\s+$/.test(part)){lines.push([]);count=0;}lines.at(-1).push({...run,text:part});count+=part.length;}return lines.map(compactRuns);}
