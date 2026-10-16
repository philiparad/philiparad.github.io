import { validateBoard } from './model.js?v=20261017-laser-settings';
export const RECOVERY_INTERVAL=5*60*1000;
export function snapshotContent(board){return JSON.stringify([board.title,board.folder,board.background,board.layout||'infinite',board.pageCount||1,board.items]);}
export function recoveryCopy(board,now=new Date().toISOString()){
 const copy=validateBoard(board);copy.id=crypto.randomUUID();copy.revision=0;copy.deleted=false;copy.title=copy.title.slice(0,188)+' (recovered)';copy.createdAt=copy.updatedAt=now;return validateBoard(copy);
}
export function retainedSnapshots(values){
 let bytes=0;return [...values].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id)).filter((v,index)=>{bytes+=v.bytes;return index<5&&bytes<=50_000_000;});
}
export function shouldSnapshot(previous,board,automatic,now){
 if(!automatic)return true;
 if(!previous)return board.items.length>0;
 return now-Date.parse(previous.createdAt)>=RECOVERY_INTERVAL&&snapshotContent(previous.board)!==snapshotContent(board);
}
/** Independent database: a snapshot failure never rolls back a lesson save. */
export class RecoveryRepository{
 constructor(name='philip-teaching-recovery'){this.name=name;}
 async open(){
  if(this.connection)return this.connection;if(this.opening)return this.opening;
  this.opening=new Promise((resolve,reject)=>{const r=indexedDB.open(this.name,1);r.onupgradeneeded=()=>{const s=r.result.createObjectStore('snapshots',{keyPath:'id'});s.createIndex('boardId','boardId');};r.onsuccess=()=>{this.connection=r.result;this.connection.onversionchange=()=>{this.connection.close();this.connection=null;};resolve(this.connection);};r.onerror=()=>reject(r.error);r.onblocked=()=>reject(new Error('Close other Teaching Board tabs and try recovery again.'));});
  try{return await this.opening;}finally{this.opening=null;}
 }
 async list(boardId){const db=await this.open();return new Promise((resolve,reject)=>{const s=db.transaction('snapshots','readonly').objectStore('snapshots'),r=boardId?s.index('boardId').getAll(boardId):s.getAll();r.onsuccess=()=>resolve(r.result.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(({board,...meta})=>({...meta,title:board.title,count:board.items.length})));r.onerror=()=>reject(r.error);});}
 async get(id){const db=await this.open();return new Promise((resolve,reject)=>{const r=db.transaction('snapshots','readonly').objectStore('snapshots').get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
 async capture(board,automatic=true,now=Date.now()){
  const copy=validateBoard(board),bytes=new TextEncoder().encode(JSON.stringify(copy)).length;if(bytes>50_000_000)throw new Error('This lesson is too large for recovery snapshots. Use an editable backup.');const db=await this.open();
  return new Promise((resolve,reject)=>{const tx=db.transaction('snapshots','readwrite'),s=tx.objectStore('snapshots'),r=s.index('boardId').getAll(copy.id);let result=null,failure;
   r.onsuccess=()=>{try{const old=r.result.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),latest=old[0];if(!shouldSnapshot(latest,copy,automatic,now))return;
    // Monotonic timestamps keep the newly captured version first even if the clock moves backwards.
    result={id:crypto.randomUUID(),boardId:copy.id,createdAt:new Date(Math.max(now,latest?Date.parse(latest.createdAt)+1:0)).toISOString(),automatic,bytes,board:copy};
    const keep=new Set(retainedSnapshots([result,...old]).map(v=>v.id));s.add(result);for(const value of old)if(!keep.has(value.id))s.delete(value.id);
   }catch(e){failure=e;tx.abort();}};
   tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(failure||tx.error||new Error('Could not save recovery snapshot.'));
  });
 }
 async restore(id,repository){const snapshot=await this.get(id);if(!snapshot)throw new Error('This snapshot is no longer available.');return repository.save(recoveryCopy(snapshot.board));}
}
