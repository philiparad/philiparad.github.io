import {paragraphRuns,textRuns,compactRuns,validateRuns,validateParagraphs} from './rich-text.js?v=20261017-history-budget';
import {textLayoutMetrics} from './inline-equation.js?v=20261017-history-budget';
import {bounds} from './scene.js?v=20261024-image-actions';

const MAX_PAGES=100;
const TOP_MARGIN=24;
const BOTTOM_MARGIN=16;

function textSlice(item,start,end,continued=false){
 const text=item.text.slice(start,end),runs=[];
 let pos=0;
 for(const run of textRuns(item)){
  const next=pos+run.text.length;
  if(next>start&&pos<end)runs.push({...run,text:run.text.slice(Math.max(0,start-pos),Math.min(run.text.length,end-pos))});
  pos=next;
 }
 const sourceMeta=paragraphRuns(item);
 const firstParagraph=item.text.slice(0,start).split('\n').length-1;
 const paragraphs=text.split('\n').map((_,i)=>{
  const row=sourceMeta[firstParagraph+i];
  return {align:row?.align||item.textAlign||'auto',dir:row?.dir||'auto',
   list:i===0&&continued&&item.text[start-1]!=='\n'?'none':row?.list||'none'};
 });
 const result={...structuredClone(item),text,runs:compactRuns(runs),paragraphs};
 validateRuns(result.runs,text);validateParagraphs(paragraphs,text);
 return result;
}
function pageOf(y,page){const step=page.h+page.gap;return Math.floor(y/step);}
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function flowError(reason){throw new Error(reason);}

/**
 * Plan page-to-page text flow without mutating the board.
 * Only unrotated, ungrouped, editable text or notes can be flowed.
 * The preview is all-or-nothing: failed pagination leaves the board untouched.
 */
export function planTextFlow(board,id,page,{checkOverlaps=true}={}){
 if(board?.layout!=='a4')flowError('Switch to A4 pages before flowing text.');
 const original=board.items?.find(item=>item.id===id);
 if(!original||!['text','note'].includes(original.type))flowError('Select one text box or note.');
 if(original.locked||original.backgroundLocked||original.groupId||original.rotation)
  flowError('Unlock, ungroup, and unrotate the text box before flowing it.');
 if(!original.text||original.text.length>10000||original.runs&&original.runs.length>10000)
  flowError('The text box must contain valid text.');
 validateRuns(textRuns(original),original.text);
 if(original.paragraphs)validateParagraphs(original.paragraphs,original.text);
 if(paragraphRuns(original).some(row=>row.list==='number'))
  flowError('Numbered lists cannot yet be flowed safely. Split them manually to preserve numbering.');
 const count=board.pageCount||1;
 if(!Number.isInteger(count)||count<1||count>MAX_PAGES)flowError('Invalid A4 page count.');
 if(!Number.isFinite(original.x)||original.x<0||original.x+(original.w||0)>page.w)
  flowError('Move the text box inside the A4 page width before flowing it.');
 const step=page.h+page.gap,initialPage=pageOf(original.y,page);
 if(initialPage<0||initialPage>=count||original.y>=initialPage*step+page.h)
  flowError('Move the text box onto an existing A4 page before flowing it.');
 const lines=textLayoutMetrics(original,paragraphRuns(original)).lines;
 if(!lines.length)return null;
 const boundaries=[...new Set(lines.map((line,i)=>i+1<lines.length?lines[i+1].sourceStart:original.text.length))]
  .filter(offset=>offset>0&&offset<=original.text.length).sort((a,b)=>a-b);
 let offset=0,pageIndex=initialPage,first=true;
 const items=[];
 while(offset<original.text.length){
  if(pageIndex>=MAX_PAGES)flowError('The text needs more than 100 A4 pages.');
  const y=first?original.y:pageIndex*step+TOP_MARGIN;
  const space=pageIndex*step+page.h-BOTTOM_MARGIN-y;
  if(space<=0){pageIndex++;first=false;continue;}
  let best=null,bestOffset=offset;
  // Original line boundaries are only candidates; remeasure every fragment
  // because the next page may start halfway through a styled paragraph.
  for(const end of boundaries){
   if(end<=offset)continue;
   const sample=textSlice(original,offset,end,offset>0);
   const height=textLayoutMetrics(sample,paragraphRuns(sample)).height;
   if(height>space)break;
   best=sample;bestOffset=end;best.h=height;
  }
  if(!best){if(!first&&space>=page.h-TOP_MARGIN-BOTTOM_MARGIN-1)
   flowError('A text line is too tall for an A4 page.');
   pageIndex++;first=false;continue;}
  best.x=original.x;best.y=y;
  if(items.length)best.id=crypto.randomUUID();
  items.push(best);
  offset=bestOffset;pageIndex++;first=false;
 }
 if(items.length===1&&items[0].y===original.y){
  // If the text fits, do not shrink intentionally tall boxes silently.
  return null;
 }
 if(checkOverlaps){
  for(const fragment of items){
   if(fragment.id===original.id&&fragment.y===original.y)continue;
   const area=bounds(fragment);
   if(board.items.some(other=>other.id!==original.id&&overlap(bounds(other),area)))
    flowError('A continuation page contains another object in the required space. Move it first.');
  }
 }
 if(board.items.length+items.length-1>20000)flowError('Too many board objects.');
 return {sourceId:id,items,pageCount:Math.max(count,pageIndex),firstPage:initialPage};
}

/** Apply only a successfully calculated plan as a single undoable board change. */
export function applyTextFlow(board,plan){
 if(!plan||!plan.items?.length)return false;
 const index=board.items.findIndex(item=>item.id===plan.sourceId);
 if(index<0)flowError('The original text box is no longer available.');
 board.items.splice(index,1,...plan.items);
 board.pageCount=plan.pageCount;
 return true;
}
