import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeBoard,findLessonSummaries,shownLessons,
 DASHBOARD_PAGE_SIZE,PREVIEW_ITEM_LIMIT} from '../js/dashboard-data.js';

const create=(id,title,folder,updatedAt,deleted=false)=>({
 id,title,folder,updatedAt,revision:0,deleted,items:[]
});
test('PERF-008 compact previews never copy image payloads, full text, or large stroke arrays',()=>{
 const image='data:image/png;base64,'+'A'.repeat(800000);
 const text='שלום Long bilingual lesson '.repeat(800);
 const board=create('big','Mathematics lesson','Class 11','2026-11-19T06:00:00Z');
 board.items=Array.from({length:320},(_,i)=>({
  id:'item-'+i,type:i%3===0?'image':i%3===1?'text':'path',
  src:image,text,x:i*50,y:i*10,w:300,h:120,
  points:Array.from({length:500},(_,p)=>[p,p*2]),
  fill:'#ffffff',stroke:'#123456'
 }));
 const summary=summarizeBoard(board),json=JSON.stringify(summary);
 assert.equal(summary.id,board.id);
 assert.equal(summary.objectCount,320);
 assert.ok(summary.preview.items.length<=PREVIEW_ITEM_LIMIT);
 assert.ok(json.length<9000,'Metadata must remain bounded for huge lessons');
 assert.equal(json.includes('data:image/'),false,'Embedded image data must never enter dashboard');
 assert.equal(json.includes('Long bilingual lesson'),true,'A short text sample is useful');
 assert.equal(json.includes(text),false,'Entire lesson text must not be duplicated');
 assert.ok(summary.preview.items.every(i=>!i.points||i.points.length<=16));
 assert.equal(summary.preview.bounds.w,320*50-50+300);
 assert.equal(summary.preview.bounds.h,320*10-10+120);
 board.items[0].x=999999;
 assert.notEqual(summary.preview.items[0].x,board.items[0].x);
});

test('PERF-008 metadata filtering, sorting, trash and pagination are stable',()=>{
 const boards=Array.from({length:53},(_,i)=>create(
  String(i),'Lesson '+String(i).padStart(2,'0'),
  i%2?'Math':'Computers',
  new Date(Date.UTC(2026,10,1,0,i)).toISOString(),
  i>=50
 ));
 const normal=findLessonSummaries(boards);
 assert.equal(normal.length,50);
 assert.equal(normal[0].title,'Lesson 49');
 assert.equal(shownLessons(normal).length,DASHBOARD_PAGE_SIZE);
 assert.equal(shownLessons(normal,36).length,36);
 assert.equal(shownLessons(normal,Infinity).length,50);
 assert.equal(findLessonSummaries(boards,{folder:'Math'}).length,25);
 assert.equal(findLessonSummaries(boards,{search:'lesson 04'}).length,1);
 assert.equal(findLessonSummaries(boards,{search:'lesson 4'}).length,10);
 assert.equal(findLessonSummaries(boards,{search:'mAtH'}).length,25);
 assert.equal(findLessonSummaries(boards,{sort:'oldest'})[0].title,'Lesson 00');
 assert.equal(findLessonSummaries(boards,{sort:'title'})[0].title,'Lesson 00');
 assert.equal(findLessonSummaries(boards,{trash:true}).length,3);
 assert.equal(findLessonSummaries(boards,{trash:true,search:'lesson 51'})[0].id,'51');
 const previous=boards.map(b=>b.id);
 findLessonSummaries(boards,{sort:'title'});
 assert.deepEqual(boards.map(b=>b.id),previous,'Filtering must not mutate the original summary collection');
});
