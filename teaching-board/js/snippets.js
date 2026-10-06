import { createSnippet, snippetCopies, serializeSnippet, parseSnippet } from './snippet-model.js?v=20261006-snippets';
import { SnippetRepository } from './snippet-storage.js?v=20261006-snippets';
import { el, btn, formDialog, notify, chooseFile, download, filename } from './ui.js?v=20261006-snippets';
import { drawItem, svgEl, union } from './scene.js?v=20261006-snippets';
import { expandGroups } from './groups.js?v=20261006-snippets';

export class Snippets {
 constructor(editor){this.editor=editor;this.repo=new SnippetRepository();}
 async saveSelection(){
  const e=this.editor,ids=expandGroups(e.board.items,e.selected),items=e.board.items.filter(i=>ids.has(i.id));
  if(!items.length){notify('Select the objects you want to reuse.');return;}
  const draft=createSnippet('Untitled snippet',items);
  const result=await formDialog('Save selection as snippet',[['title','Snippet name','']],{submit:'Save snippet',note:'Saved on this device, available in all your lessons. Export a snippet to keep a separate backup.',validate:v=>{draft.title=v.title;return createSnippet(v.title,draft.items);}});
  if(!result||e.disposed)return;await this.repo.add(result);notify('Snippet saved. Open Saved snippets to reuse it in any lesson.');
 }
 async open(){
  if(this.dialog?.open)return;
  let entries=await this.repo.list();if(this.editor.disposed)return;
  const d=el('dialog',null,'form-dialog snippet-dialog');this.dialog=d;d.setAttribute('aria-label','Saved snippets');
  const heading=el('div',null,'snippet-heading');heading.append(el('h2','Saved snippets'),btn('Close',()=>d.close()));
  const controls=el('div',null,'snippet-controls'),search=el('input');search.type='search';search.placeholder='Search snippets';search.setAttribute('aria-label','Search snippets');
  const grid=el('div',null,'snippet-grid');let trash=false,limit=12;
  const refresh=async()=>{entries=await this.repo.list();if(d.open)draw();};
  const toggle=btn('Trash',()=>{trash=!trash;limit=12;draw();});
  const importer=btn('Import snippet',async()=>{const [file]=await chooseFile('.json,application/json');if(!file||this.editor.disposed)return;if(file.size>5_000_200)throw new Error('Snippet file exceeds the 5 MB limit.');const value=parseSnippet(await file.text());await this.repo.add(value);trash=false;search.value='';limit=12;await refresh();notify('Snippet imported.');});
  controls.append(search,importer,toggle);
  function preview(value){const box=union(value.items),svg=svgEl('svg',{class:'snippet-preview',viewBox:`${box.x-15} ${box.y-15} ${Math.max(30,box.w+30)} ${Math.max(30,box.h+30)}`,'aria-hidden':'true'});value.items.forEach(i=>svg.append(drawItem(i)));return svg;}
  const draw=()=>{
   grid.replaceChildren();toggle.textContent=trash?'← Saved snippets':`Trash (${entries.filter(s=>s.deleted).length})`;
   const matches=entries.filter(s=>s.deleted===trash&&s.title.toLocaleLowerCase().includes(search.value.toLocaleLowerCase()));
   if(!matches.length)grid.append(el('p',search.value?'No matching snippets.':trash?'No snippets in Trash.':'Select objects on your board, then choose Save selection as snippet.','muted'));
   for(const value of matches.slice(0,limit)){
    const card=el('article',null,'snippet-card'),title=el('h3',value.title);title.dir='auto';
    const actions=el('div',null,'snippet-card-actions');
    if(trash)actions.append(btn('Restore',async()=>{await this.repo.update(value.id,{deleted:false});await refresh();}));
    else actions.append(btn('Insert',()=>{this.editor.insertSnippet(value);d.close();},'primary'),btn('Rename',async()=>{const r=await formDialog('Rename snippet',[['title','Snippet name',value.title]],{validate:v=>{createSnippet(v.title,value.items);return v;}});if(r){await this.repo.update(value.id,{title:r.title});await refresh();}}),btn('Move to trash',async()=>{await this.repo.update(value.id,{deleted:true});await refresh();}));
    actions.append(btn('Export',()=>download(new Blob([serializeSnippet(value)],{type:'application/json'}),filename(value.title)+'.snippet.json')));
    card.append(preview(value),title,el('p',`${value.items.length} objects`,'muted'),actions);grid.append(card);
   }
   if(matches.length>limit)grid.append(btn('Show more',()=>{limit+=12;draw();}));
  };
  search.oninput=()=>{limit=12;draw();};
  d.append(heading,el('p','Reusable copies for your lessons. Stored on this device; export snippets to back them up or move them to another computer.','muted'),controls,grid);
  d.onclose=()=>{d.remove();this.dialog=null;};document.body.append(d);d.showModal();draw();search.focus();
 }
 dispose(){this.dialog?.close();this.repo.close();}
}
export { snippetCopies };
