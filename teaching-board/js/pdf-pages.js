import { el, btn, field } from './ui.js?v=20261013-richtext';

export function parsePDFPages(value,total){
 if(!Number.isSafeInteger(total)||total<1)throw new Error('This PDF has no readable pages.');
 if(typeof value!=='string'||!value.trim()||value.length>1000)throw new Error('Enter page numbers or ranges, for example 1, 3-5.');
 const pages=new Set();
 for(const part of value.split(',')){
  const match=part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
  if(!match)throw new Error('Use page numbers and ranges separated by commas, for example 1, 3-5.');
  const first=Number(match[1]),last=Number(match[2]||match[1]);
  if(!Number.isSafeInteger(first)||!Number.isSafeInteger(last)||first<1||last>total||last<first)throw new Error(`Choose pages from 1 to ${total}, with increasing ranges.`);
  if(last-first+1>30)throw new Error('Select up to 30 unique pages per import.');
  for(let n=first;n<=last;n++){pages.add(n);if(pages.size>30)throw new Error('Select up to 30 unique pages per import.');}
 }
 return [...pages].sort((a,b)=>a-b);
}

export function layoutPDFPages(pages,layout='vertical'){
 if(!['vertical','horizontal','grid'].includes(layout))throw new Error('Choose a valid PDF page layout.');
 if(!Array.isArray(pages)||pages.some(p=>![p.w,p.h].every(v=>Number.isFinite(v)&&v>0)))throw new Error('Invalid PDF page dimensions.');
 const gap=35,columns=layout==='grid'?2:layout==='horizontal'?Math.max(1,pages.length):1;
 const widths=Array.from({length:columns},(_,column)=>Math.max(0,...pages.filter((_,i)=>i%columns===column).map(p=>p.w)));
 let y=0;const result=[];
 for(let row=0;row<pages.length;row+=columns){let x=0,height=0;for(let column=0;column<columns&&row+column<pages.length;column++){const page=pages[row+column];result.push({...page,x,y});x+=widths[column]+gap;height=Math.max(height,page.h);}y+=height+gap;}
 return result;
}

/** Serial, bounded preview rendering; closing waits for the current page to finish. */
export class PDFPreviews {
 constructor(pdf,render=renderPDFThumbnail){this.pdf=pdf;this.render=render;this.generation=0;this.pending=Promise.resolve();}
 show(numbers,receive){const generation=++this.generation;this.pending=this.pending.then(async()=>{for(const number of numbers){if(generation!==this.generation)return;try{const src=await this.render(this.pdf,number);if(generation===this.generation)receive(number,src,null);}catch(error){if(generation===this.generation)receive(number,null,error);}}});return this.pending;}
 stop(){this.generation++;return this.pending;}
}
export async function renderPDFThumbnail(pdf,number){
 const page=await pdf.getPage(number);let canvas;
 try{const base=page.getViewport({scale:1});if(![base.width,base.height].every(v=>Number.isFinite(v)&&v>0))throw new Error('Invalid page size.');const viewport=page.getViewport({scale:Math.min(1,240/Math.max(base.width,base.height))});canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;return canvas.toDataURL('image/jpeg',.75);}finally{page.cleanup();if(canvas){canvas.width=0;canvas.height=0;}}
}
export function choosePDFPages(pdf){
 const total=pdf.numPages,d=el('dialog',null,'form-dialog pdf-picker'),range=field('Pages to import',total===1?'1':`1-${Math.min(total,30)}`),error=el('p',null,'error'),count=el('p',null,'muted'),grid=el('div',null,'pdf-preview-grid'),navigation=el('div',null,'actions'),actions=el('div',null,'actions'),previews=new PDFPreviews(pdf);let start=1,result=null,closed=false;const checks=new Map();
 const selected=()=>range.input.value.trim()?parsePDFPages(range.input.value,total):[];
 function sync(){try{const pages=selected();error.textContent='';count.textContent=`${pages.length} selected of ${total} pages`;for(const [n,input]of checks)input.checked=pages.includes(n);return pages;}catch(e){error.textContent=e.message;count.textContent='Check the page range.';return null;}}
 function draw(){grid.replaceChildren();checks.clear();const numbers=Array.from({length:Math.min(6,total-start+1)},(_,k)=>start+k),images=new Map();for(const number of numbers){const card=el('label',null,'pdf-preview-card'),image=el('img'),check=el('input'),caption=el('span',`Page ${number}`);image.alt=`Preview of PDF page ${number}`;check.type='checkbox';check.setAttribute('aria-label',`Import PDF page ${number}`);check.onchange=()=>{const pages=selectedSafe();if(!pages){check.checked=false;return;}const next=new Set(pages);if(check.checked)next.add(number);else next.delete(number);if(next.size>30){check.checked=false;error.textContent='Select up to 30 unique pages per import.';return;}range.input.value=[...next].sort((a,b)=>a-b).join(', ');sync();};card.append(image,check,caption);grid.append(card);checks.set(number,check);images.set(number,{image,caption});}previous.disabled=start===1;next.disabled=start+6>total;label.textContent=`Pages ${start}–${Math.min(start+5,total)} of ${total}`;sync();previews.show(numbers,(number,src,failure)=>{if(closed)return;const entry=images.get(number);if(src)entry.image.src=src;else entry.caption.textContent=`Page ${number} (preview unavailable)`;});}
 function selectedSafe(){try{return selected();}catch(e){error.textContent=e.message;return null;}}
 const previous=el('button','Previous previews'),next=el('button','Next previews'),label=el('span');previous.type=next.type='button';previous.onclick=()=>{start=Math.max(1,start-6);draw();};next.onclick=()=>{if(start+6<=total){start+=6;draw();}};navigation.append(previous,label,next);
 const placementLabel=el('label','Page layout'),placement=el('select');placement.setAttribute('aria-label','PDF page layout');for(const [value,label]of [['vertical','Vertical stack'],['horizontal','Horizontal row'],['grid','Two-column grid'],['a4','A4 document pages']]){const option=el('option',label);option.value=value;placement.append(option);}placementLabel.append(placement);range.input.oninput=sync;
 actions.append(btn('Clear selection',()=>{range.input.value='';sync();}),btn('Cancel',()=>d.close()),btn('Import selected pages',()=>{try{result={pages:parsePDFPages(range.input.value,total),layout:placement.value};d.close();}catch(e){error.textContent=e.message;}},'primary'));
 d.append(el('h2','Choose PDF pages'),el('p',`Select thumbnails or enter page numbers and ranges, such as 1, 3-5. Up to 30 unique pages are imported in document order and locked for annotation.${total>30?' The first 30 pages are selected initially.':''}`,'muted'),range.wrap,placementLabel,el('p','A4 document pages: fit one PDF page per sheet and append after existing A4 pages. For a nonempty infinite canvas, switch Canvas layout to A4 pages first.','muted'),count,navigation,grid,error,actions);document.body.append(d);
 return new Promise(resolve=>{d.onclose=async()=>{closed=true;d.remove();await previews.stop();resolve(result);};d.showModal();draw();range.input.focus();});
}

export async function renderPDFPages(pdf,numbers,progress=()=>{}){
 // Validate before requesting or rendering any page, including direct callers.
 const selected=parsePDFPages(numbers.join(','),pdf.numPages),pages=[];let bytes=0;
 for(const [index,n]of selected.entries()){
  progress(`Importing PDF page ${n} (${index+1} of ${selected.length})…`);
  const page=await pdf.getPage(n);let canvas;
  try{
   const base=page.getViewport({scale:1});
   if(![base.width,base.height].every(v=>Number.isFinite(v)&&v>0))throw new Error('Invalid PDF page dimensions.');
   const viewport=page.getViewport({scale:Math.min(2,1600/Math.max(base.width,base.height))});
   canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
   const src=canvas.toDataURL('image/jpeg',.86);bytes+=src.length;
   if(bytes>20_000_000)throw new Error('PDF images are too large. Import fewer pages.');
   pages.push({src,w:800,h:800*viewport.height/viewport.width});
  }finally{page.cleanup();if(canvas){canvas.width=0;canvas.height=0;}}
 }
 return pages;
}
