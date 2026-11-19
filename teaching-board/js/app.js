import { showRecovery } from './recovery.js?v=20261119-perf008';
import { createBoard, parseBackup } from './model.js?v=20261119-perf008';
import { BoardRepository } from './storage.js?v=20261119-perf008';
import { Editor } from './editor.js?v=20261119-perf008';
import { el, btn, formDialog, confirmDialog, chooseFile, notify } from './ui.js?v=20261119-perf008';
import { backup } from './export.js?v=20261119-perf008';
import { svgEl } from './scene.js?v=20261119-perf008';
import {findLessonSummaries,shownLessons,DASHBOARD_PAGE_SIZE} from './dashboard-data.js?v=20261119-perf008';

const repository=new BoardRepository(),app=document.querySelector('#app');
let editor=null,generation=0,viewTrash=false,folderFilter='',searchText='',sortBy='recent';
async function settings(board){const r=await formDialog(board?'Lesson settings':'New lesson',[['title','Lesson title',board?.title||'Untitled lesson'],['folder','Folder (optional)',board?.folder||'']],{validate:v=>{if(!v.title.trim()||v.title.length>200||v.folder.length>200)throw new Error('Use a title and folder under 200 characters.');return {...v,title:v.title.trim(),folder:v.folder.trim()};}});if(!r)return;const saved=await repository.save({...board||createBoard(),...r});if(board)await renderRoute();else location.hash=`/board/${saved.id}`;}

function thumbnail(summary){
 const svg=svgEl('svg',{'aria-hidden':'true',class:'thumbnail'});
 const preview=summary.preview||{bounds:{x:0,y:0,w:240,h:140},items:[]};
 const b=preview.bounds,pad=Math.max(20,Math.min(200,Math.max(b.w,b.h)*.08));
 svg.setAttribute('viewBox',[b.x-pad,b.y-pad,b.w+pad*2,b.h+pad*2].join(' '));
 for(const item of preview.items||[]){
  const w=item.w||1,h=item.h||1,stroke=item.stroke||'#57758b';
  const group=svgEl('g',{transform:'translate('+item.x+' '+item.y+') rotate('+(item.rotation||0)+' '+(w/2)+' '+(h/2)+')'});
  const outline={'stroke':stroke,'stroke-width':Math.max(1,Math.min(4,Math.min(w,h)*.025)),
   'fill':item.fill||'none'};
  if(item.type==='path'||item.type==='line'||item.type==='arrow'||item.type==='curve'){
   if(item.points?.length){
    group.append(svgEl('polyline',{points:item.points.map(p=>p.join(',')).join(' '),
     fill:'none',stroke,'stroke-width':Math.max(1,Math.min(5,Math.min(w,h)*.06))}));
   }else group.append(svgEl('line',{x1:0,y1:0,x2:w,y2:h,stroke}));
  }else if(item.type==='ellipse'){
   group.append(svgEl('ellipse',{cx:w/2,cy:h/2,rx:w/2,ry:h/2,...outline}));
  }else if(item.type==='triangle'||item.type==='polygon'){
   group.append(svgEl('polygon',{points:'0,'+h+' '+(w/2)+',0 '+w+','+h,...outline}));
  }else{
   const fill=item.type==='note'?(item.fill||'#fff1ae'):
    ['image','graph','equation'].includes(item.type)?'#edf2f6':(item.fill||'none');
   group.append(svgEl('rect',{width:w,height:h,rx:item.type==='note'?4:0,
    fill,stroke,'stroke-width':Math.max(1,Math.min(3,Math.min(w,h)*.025))}));
   if(item.type==='text'||item.type==='note'){
    const text=svgEl('text',{x:5,y:Math.max(12,Math.min(h-3,Math.max(12,h*.55))),
     'font-size':Math.max(11,Math.min(24,h*.45)),fill:'#34485d'});
    text.textContent=item.text||'';
    group.append(text);
   }else if(['image','graph','equation'].includes(item.type)){
    group.append(svgEl('line',{x1:w*.12,y1:h*.75,x2:w*.88,y2:h*.25,
     stroke:'#90a7b9','stroke-width':Math.max(1,Math.min(w,h)*.045)}));
   }
  }
  svg.append(group);
 }
 return svg;
}
async function importBackup(){const [file]=await chooseFile('.json,application/json');if(!file)return;if(file.size>25_000_000)throw new Error('Backup exceeds the 25 MB limit.');const board=parseBackup(await file.text());board.id=crypto.randomUUID();board.revision=0;board.deleted=false;board.title=board.title.slice(0,188)+' (imported)';await repository.save(board);location.hash=`/board/${board.id}`;}

async function loadLesson(summary){
 const board=await repository.get(summary.id);
 if(!board)throw new Error('Lesson no longer exists.');
 return board;
}
async function withLesson(summary,action){
 try{await action(await loadLesson(summary));}catch(error){notify(error.message);}
}
async function dashboard(token){
 const boards=await repository.listSummaries();
 if(token!==generation)return;
 app.className='dashboard';app.replaceChildren();
 const heading=el('div',null,'heading'),intro=el('div');
 intro.append(el('p','PERSONAL TEACHING WORKSPACE','eyebrow'),
  el('h1',viewTrash?'Recently deleted':'Your lessons, all in one place'),
  el('p','Draw an idea. Explore a function. Make the explanation clear.','muted'));
 const actions=el('div',null,'actions');
 actions.append(btn('Recovery snapshots',()=>showRecovery(repository)),
  btn('Import backup',importBackup),btn('+ New lesson',()=>settings(null),'primary'));
 heading.append(intro,actions);
 const controls=el('div',null,'dashboard-controls'),search=el('input',null,'search');
 search.type='search';search.placeholder='Search lessons…';
 search.setAttribute('aria-label','Search lessons');search.value=searchText;
 const folders=el('select');folders.setAttribute('aria-label','Filter by folder');
 for(const name of ['',...new Set(boards.filter(b=>!b.deleted).map(b=>b.folder).filter(Boolean))].sort()){
  const option=el('option',name||'All folders');option.value=name;folders.append(option);
 }
 folders.value=folderFilter;
 const sort=el('select');sort.setAttribute('aria-label','Sort lessons');
 for(const [value,label] of [['recent','Recently edited'],['title','Title A–Z'],['oldest','Oldest first']]){
  const option=el('option',label);option.value=value;sort.append(option);
 }
 sort.value=sortBy;
 const trash=btn(viewTrash?'← All lessons':'Trash ('+boards.filter(b=>b.deleted).length+')',
  async()=>{viewTrash=!viewTrash;await renderRoute();});
 controls.append(search,folders,sort,trash);
 const cards=el('div',null,'cards'),pagination=el('div',null,'dashboard-pagination');
 let visibleCount=DASHBOARD_PAGE_SIZE;
 function draw(){
  cards.replaceChildren();pagination.replaceChildren();
  const matches=findLessonSummaries(boards,{trash:viewTrash,folder:folderFilter,search:searchText,sort:sortBy});
  if(!matches.length){
   const empty=el('div',null,'empty');
   empty.append(el('h2',viewTrash?'Your trash is empty':'Make room for your next idea'),
    el('p',searchText?'No matching lessons.':'Create a lesson or import a backup to get started.','muted'));
   cards.append(empty);
   return;
  }
  for(const summary of shownLessons(matches,visibleCount)){
   const card=el('article',null,'card'),body=el('div',null,'card-body'),
    title=el('h2',summary.title),buttons=el('div',null,'actions');
   title.dir='auto';
   if(viewTrash){
    buttons.append(btn('Restore',()=>withLesson(summary,async board=>{
     await repository.save({...board,deleted:false});await renderRoute();
    }),'primary'));
   }else{
    buttons.append(btn('Open',()=>{location.hash='#/board/'+summary.id;},'primary'),
     btn('Settings',()=>withLesson(summary,board=>settings(board))),
     btn('Duplicate',()=>withLesson(summary,async board=>{
      await repository.save({...structuredClone(board),id:crypto.randomUUID(),
       title:board.title.slice(0,188)+' (copy)',revision:0,createdAt:new Date().toISOString()});
      await renderRoute();
     })),
     btn('Move to trash',async()=>{
      if(await confirmDialog('Move lesson to trash?',summary.title+' can be restored from Trash.')){
       await withLesson(summary,async board=>{
        await repository.save({...board,deleted:true});await renderRoute();
       });
      }
     }));
   }
   buttons.append(btn('Backup',()=>withLesson(summary,board=>backup(board))));
   body.append(el('span',summary.folder||'Unfiled','folder-tag'),
    title,el('small',new Date(summary.updatedAt).toLocaleDateString()+
     ' · '+summary.objectCount+' objects'),buttons);
   card.append(thumbnail(summary),body);cards.append(card);
  }
  pagination.append(el('span','Showing '+Math.min(matches.length,visibleCount)+
   ' of '+matches.length+' lessons','muted'));
  if(matches.length>visibleCount)pagination.append(
   btn('Show more lessons',()=>{visibleCount+=DASHBOARD_PAGE_SIZE;draw();}));
 }
 search.oninput=()=>{searchText=search.value;visibleCount=DASHBOARD_PAGE_SIZE;draw();};
 folders.onchange=()=>{folderFilter=folders.value;visibleCount=DASHBOARD_PAGE_SIZE;draw();};
 sort.onchange=()=>{sortBy=sort.value;visibleCount=DASHBOARD_PAGE_SIZE;draw();};
 draw();
 const footer=el('p','Saved on this device. Use editable backups to move lessons between computers or protect them before clearing browser data.','storage-note');
 app.append(heading,controls,cards,pagination,footer);
}
async function renderRoute(){const token=++generation;try{if(editor){await editor.flush();if(token!==generation)return;editor.dispose();editor=null;}app.setAttribute('aria-busy','true');const match=location.hash.match(/^#\/board\/([a-zA-Z0-9-]+)$/);if(match){const board=await repository.get(match[1]);if(token!==generation)return;if(!board||board.deleted)throw new Error('Lesson not found. Return to Lessons using the logo.');editor=new Editor(app,board,repository);}else await dashboard(token);}catch(error){notify(error.message);if(!editor)app.replaceChildren(el('p',error.message));}finally{app.setAttribute('aria-busy','false');}}
window.addEventListener('hashchange',renderRoute);window.addEventListener('beforeunload',e=>{if(editor?.queue.dirty || editor?.drag || editor?.inlineText){e.preventDefault();e.returnValue='';}});
renderRoute();
