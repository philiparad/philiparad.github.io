import { formDialog } from './ui.js?v=20261011-pdf-pages';

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

export async function choosePDFPages(total){
 const result=await formDialog('Choose PDF pages',[
  ['pages','Pages to import',total===1?'1':`1-${Math.min(total,30)}`]
 ],{note:`This PDF has ${total} page${total===1?'':'s'}. Enter numbers or ranges, such as 1, 3-5. Up to 30 unique pages are imported in document order. Duplicates are ignored. Imported pages are locked so you can annotate them.${total>30?' The first 30 pages are selected initially; change the range to import later pages.':''}`,submit:'Import selected pages',validate:values=>parsePDFPages(values.pages,total)});
 return result;
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
