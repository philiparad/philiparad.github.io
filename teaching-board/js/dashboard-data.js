// PERF-008 — bounded dashboard metadata, independent of complete lesson data.
// No image source, ink arrays, equation raster or full text is stored here.
export const DASHBOARD_PAGE_SIZE=18;
export const PREVIEW_ITEM_LIMIT=18;
const PREVIEW_POINT_LIMIT=16;

export function summarizeBoard(board){
 const items=board.items||[];
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(const item of items){
  const x=item.x||0,y=item.y||0,w=item.w||1,h=item.h||1;
  minX=Math.min(minX,x);minY=Math.min(minY,y);
  maxX=Math.max(maxX,x+w);maxY=Math.max(maxY,y+h);
 }
 if(!items.length){minX=0;minY=0;maxX=240;maxY=140;}
 const count=Math.min(items.length,PREVIEW_ITEM_LIMIT),sample=[];
 for(let n=0;n<count;n++){
  const index=items.length<=count?n:Math.floor(n*(items.length-1)/(count-1));
  const item=items[index];
  const p={type:item.type,x:item.x||0,y:item.y||0,
   w:item.w||1,h:item.h||1,rotation:item.rotation||0};
  if(item.fill&&item.fill!=='none')p.fill=item.fill;
  if(item.stroke&&item.stroke!=='none')p.stroke=item.stroke;
  if(['text','note'].includes(item.type))p.text=(item.text||'').slice(0,48);
  if(item.type==='shape'&&item.shape)p.shape=String(item.shape).slice(0,32);
  if(Array.isArray(item.points)&&item.points.length){
   const limit=Math.min(item.points.length,PREVIEW_POINT_LIMIT);
   p.points=Array.from({length:limit},(_,i)=>item.points[
    limit===1?0:Math.floor(i*(item.points.length-1)/(limit-1))
   ].slice(0,2));
  }
  sample.push(p);
 }
 return {id:board.id,title:board.title,folder:board.folder,
  deleted:board.deleted,revision:board.revision,
  updatedAt:board.updatedAt,objectCount:items.length,
  preview:{bounds:{x:minX,y:minY,w:Math.max(1,maxX-minX),h:Math.max(1,maxY-minY)},items:sample}};
}

export function findLessonSummaries(boards,{trash=false,folder='',search='',sort='recent'}={}){
 const term=search.trim().toLocaleLowerCase();
 const list=boards.filter(b=>b.deleted===trash&&
  (trash||!folder||b.folder===folder)&&
  (!term||((b.title||'')+' '+(b.folder||'')).toLocaleLowerCase().includes(term)));
 list.sort((a,b)=>sort==='title'?a.title.localeCompare(b.title):
  sort==='oldest'?a.updatedAt.localeCompare(b.updatedAt):
  b.updatedAt.localeCompare(a.updatedAt));
 return list;
}

export function shownLessons(items,count=DASHBOARD_PAGE_SIZE){
 return items.slice(0,Math.max(0,count));
}
