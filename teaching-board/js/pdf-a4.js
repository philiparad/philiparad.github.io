import { A4, pageRect } from './pages.js?v=20261012-pdf-a4';

/** Prepare the entire import without changing the document. */
export function planA4Import(board,pages){
 if(board.layout!=='a4'&&board.items.length)throw new Error('Switch Canvas layout to A4 pages before importing PDF pages into this lesson.');
 if(!Array.isArray(pages)||!pages.length||pages.some(p=>![p.w,p.h].every(v=>Number.isFinite(v)&&v>0)))throw new Error('Invalid PDF page dimensions.');
 // Reuse the initial blank sheet; preserve all deliberately added pages.
 const count=board.pageCount||1,start=board.layout==='a4'&&(board.items.length||count>1)?count:0;
 if(start+pages.length>100)throw new Error('An A4 document supports up to 100 pages. Import fewer pages or use another lesson.');
 const margin=24;
 const images=pages.map((page,index)=>{
  const scale=Math.min((A4.w-2*margin)/page.w,(A4.h-2*margin)/page.h),w=page.w*scale,h=page.h*scale;
  return {...page,w,h,x:(A4.w-w)/2,y:pageRect(start+index).y+(A4.h-h)/2};
 });
 return {images,start,pageCount:start+pages.length};
}
