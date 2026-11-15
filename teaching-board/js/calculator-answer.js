/**
 * Insert a calculator Ans display as an ordinary editable Teaching Board
 * text object. Keep the calculator's selected representation (fraction,
 * decimal, scientific notation, etc.) verbatim; do not re-round the value.
 */
export const CALCULATOR_ANS_PROTOCOL='teaching-board/calculator-ans-v1';
export const CALCULATOR_ANS_MAX_LENGTH=160;

export function validAnsDisplay(value){
 if(typeof value!=='string'||!value.trim()||
    value.length>CALCULATOR_ANS_MAX_LENGTH||
    /[\u0000-\u001f\u007f\ufffc]/u.test(value))return null;
 return value.trim();
}
export function calculatorTextItem(base,display,fontSize=28){
 const text=validAnsDisplay(display);
 if(!text)throw Error('The calculator has no valid Ans to insert.');
 if(!base||base.type!=='text'||!Number.isFinite(base.x)||
    !Number.isFinite(base.y)||!Number.isFinite(fontSize)||
    fontSize<1||fontSize>100000)throw Error('Invalid calculator text placement.');
 // Fit short answers tightly, while keeping longer formatted answers legible.
 const w=Math.min(680,Math.max(200,Math.ceil(text.length*fontSize*.66+32)));
 const h=Math.max(70,Math.ceil(fontSize*2.5));
 return {...base,w,h,fontSize,fill:'none',textAlign:'left',
  textStyle:'normal',text,runs:[{text}],
  paragraphs:[{align:'left',dir:'ltr',list:'none'}]};
}

/**
 * TXT-071 — Find an uncluttered position for successive calculator answers.
 * The first result is centered; later results use nearby visible slots instead
 * of covering previously inserted answers. All positions are board-world
 * coordinates and no existing object is modified.
 *
 * The search prefers below/above the center before placing results beside it.
 * If the viewport is too small or completely occupied, retain the historical
 * centered placement rather than silently placing an answer offscreen.
 */
export function calculatorAnswerPlacement(item,center,visible,occupied=[],gap=16){
 const origin={x:center.x-item.w/2,y:center.y-item.h/2};
 if(!visible||![item.w,item.h,center.x,center.y,visible.x,visible.y,visible.w,visible.h].every(Number.isFinite)||
    item.w<=0||item.h<=0||visible.w<=0||visible.h<=0)return origin;
 const padding=8;
 const inView=p=>p.x>=visible.x+padding-1e-8&&p.y>=visible.y+padding-1e-8&&
   p.x+item.w<=visible.x+visible.w-padding+1e-8&&
   p.y+item.h<=visible.y+visible.h-padding+1e-8;
 const hits=p=>occupied.some(b=>b&&[b.x,b.y,b.w,b.h].every(Number.isFinite)&&b.w>0&&b.h>0&&
   p.x<b.x+b.w+gap&&p.x+item.w+gap>b.x&&
   p.y<b.y+b.h+gap&&p.y+item.h+gap>b.y);
 if(inView(origin)&&!hits(origin))return origin;
 const strideX=item.w+gap,strideY=item.h+gap;
 const rings=Math.min(20,Math.max(1,Math.ceil(Math.max(visible.w/strideX,visible.h/strideY))+1));
 for(let ring=1;ring<=rings;ring++){
  const offsets=[];
  for(let dy=-ring;dy<=ring;dy++){
   for(let dx=-ring;dx<=ring;dx++){
    if(Math.max(Math.abs(dx),Math.abs(dy))===ring)offsets.push({dx,dy});
   }
  }
  offsets.sort((a,b)=>{
   const rank=p=>Math.abs(p.dx)+Math.abs(p.dy);
   const xRank=p=>Math.abs(p.dx);
   const dirRank=p=>p.dy>0?0:p.dy<0?1:p.dx>0?2:3;
   return rank(a)-rank(b)||xRank(a)-xRank(b)||
     dirRank(a)-dirRank(b)||a.dx-b.dx||a.dy-b.dy;
  });
  for(const {dx,dy} of offsets){
   const p={x:origin.x+dx*strideX,y:origin.y+dy*strideY};
   if(inView(p)&&!hits(p))return p;
  }
 }
 return origin;
}

/**
 * TXT-072 — Printable A4 placement. The infinite canvas may accept answers
 * anywhere, but A4 text must fit entirely inside a real page (never the
 * inter-page gap or margins). Prefer the page and portion currently visible.
 *
 * Return null if every printable page is occupied or too small; callers must
 * reject the insertion rather than save clipped or overlapping work.
 */
export function calculatorAnswerPlacementOnPages(item,center,visible,occupied=[],pages=[],gap=16){
 if(!pages.length||!visible)return null;
 const pad=8;
 const hits=p=>occupied.some(b=>b&&[b.x,b.y,b.w,b.h].every(Number.isFinite)&&
  b.w>0&&b.h>0&&p.x<b.x+b.w+gap&&p.x+item.w+gap>b.x&&
  p.y<b.y+b.h+gap&&p.y+item.h+gap>b.y);
 const contains=(area,p)=>p.x>=area.x+pad-1e-8&&
  p.y>=area.y+pad-1e-8&&p.x+item.w<=area.x+area.w-pad+1e-8&&
  p.y+item.h<=area.y+area.h-pad+1e-8;
 const intersect=(a,b)=>{
  const x=Math.max(a.x,b.x),y=Math.max(a.y,b.y);
  return {x,y,w:Math.min(a.x+a.w,b.x+b.w)-x,
   h:Math.min(a.y+a.h,b.y+b.h)-y};
 };
 const validArea=a=>a&&[a.x,a.y,a.w,a.h].every(Number.isFinite)&&
  a.w>=item.w+2*pad&&a.h>=item.h+2*pad;
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
 const distance=area=>{
  const nearestX=clamp(center.x,area.x,area.x+area.w);
  const nearestY=clamp(center.y,area.y,area.y+area.h);
  return (center.x-nearestX)**2+(center.y-nearestY)**2;
 };
 // Prefer a visible page before trying the whole sheet when zoomed in.
 const ordered=pages.map((page,index)=>({page,index,visiblePart:intersect(page,visible)}))
  .filter(({page})=>validArea(page))
  .sort((a,b)=>{
   const aVisible=validArea(a.visiblePart)?0:1;
   const bVisible=validArea(b.visiblePart)?0:1;
   return aVisible-bVisible||distance(a.page)-distance(b.page)||a.index-b.index;
  });
 for(const onlyVisible of [true,false]){
  for(const {page,visiblePart} of ordered){
   const region=onlyVisible?visiblePart:page;
   if(!validArea(region))continue;
   const localCenter={
    x:clamp(center.x,region.x+pad+item.w/2,region.x+region.w-pad-item.w/2),
    y:clamp(center.y,region.y+pad+item.h/2,region.y+region.h-pad-item.h/2)
   };
   const candidate=calculatorAnswerPlacement(item,localCenter,region,occupied,gap);
   if(contains(page,candidate)&&contains(region,candidate)&&!hits(candidate))
    return candidate;
  }
 }
 return null;
}

export function validateAnsResponse(data,id){
 if(!data||typeof data!=='object'||Array.isArray(data)||
    data.protocol!==CALCULATOR_ANS_PROTOCOL||data.type!=='response'||
    data.id!==id)return null;
 if(data.error!==undefined){
  if(data.error==='no-answer')return {error:'Calculate a result before sending Ans.'};
  return null;
 }
 const text=validAnsDisplay(data.display);
 return text?{text}:null;
}
