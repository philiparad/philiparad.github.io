import { RecoveryRepository } from './recovery-storage.js?v=20261015-lifecycle';
import { el, btn, notify } from './ui.js?v=20261015-lifecycle';
const snapshots=new RecoveryRepository();
export async function showRecovery(repository,boardId,beforeRestore=async()=>{}){
 const values=await snapshots.list(boardId),d=el('dialog',null,'form-dialog');
 d.append(el('h2','Recovery snapshots'),el('p','Restore opens a new lesson and preserves the original. Up to 5 recent snapshots per lesson are kept within 50 MB. Stored on this device only; clearing browser data removes them. Keep editable backups for long-term protection.','muted'));
 if(!values.length)d.append(el('p','No snapshots yet. Open a lesson and choose Create snapshot in Selection tools.'));
 for(const value of values){const row=el('article',null,'recovery-entry');row.append(el('h3',value.title),el('p',`${new Date(value.createdAt).toLocaleString()} · ${value.count} objects · ${value.automatic?'Automatic':'Manual'}`),btn('Restore as new lesson',async()=>{await beforeRestore();const board=await snapshots.restore(value.id,repository);d.close();location.hash=`/board/${board.id}`;notify('Snapshot restored as a new lesson.');}));d.append(row);}
 d.append(btn('Close',()=>d.close()));d.onclose=()=>d.remove();document.body.append(d);d.showModal();
}
export class Recovery{
 constructor(editor,repository=snapshots){this.e=editor;this.repository=repository;this.pending=Promise.resolve();this.lastAttempt=0;}
 controls(){const root=el('div');this.status=el('p','Automatic snapshots after changes, at most every 5 minutes.','muted');root.append(el('h2','Recovery'),btn('Create snapshot',async()=>{await this.e.flush();await this.capture(this.e.board,false);notify('Recovery snapshot created.');}),btn('Recovery snapshots',()=>showRecovery(this.e.repo,this.e.board.id,()=>this.e.flush())),this.status);return root;}
 capture(board,automatic){const copy=structuredClone(board);const job=this.pending.then(()=>this.repository.capture(copy,automatic));this.pending=job.catch(()=>{});return job;}
 auto(board){if(!board.items.length)return;const now=Date.now();if(now-this.lastAttempt<30000)return;this.lastAttempt=now;this.capture(board,true).then(saved=>{if(saved&&this.status&&!this.e.disposed)this.status.textContent=`Snapshot saved ${new Date(saved.createdAt).toLocaleTimeString()}.`;}).catch(()=>{this.lastAttempt=0;if(this.status&&!this.e.disposed)this.status.textContent='Recovery snapshot unavailable. Your normal lesson save is separate; use an editable backup.';});}
}
