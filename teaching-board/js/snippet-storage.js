import { validateSnippet } from './snippet-model.js?v=20261006-snippets';
/** Separate storage leaves the existing lesson database and its version intact. */
export class SnippetRepository {
 constructor(name='philip-teaching-snippets'){this.name=name;}
 async open(){
  if(this.connection)return this.connection;
  this.connection=await new Promise((resolve,reject)=>{
   const request=indexedDB.open(this.name,1);
   request.onupgradeneeded=()=>request.result.createObjectStore('snippets',{keyPath:'id'});
   request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>this.close();resolve(db);};
   request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error('Close other Teaching Board tabs, then try again.'));
  });return this.connection;
 }
 async list(){const db=await this.open();return new Promise((resolve,reject)=>{const request=db.transaction('snippets','readonly').objectStore('snippets').getAll();request.onsuccess=()=>resolve(request.result.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));request.onerror=()=>reject(request.error);});}
 async add(value){const copy=validateSnippet(value),db=await this.open();return new Promise((resolve,reject)=>{const tx=db.transaction('snippets','readwrite');tx.objectStore('snippets').add(copy);tx.oncomplete=()=>resolve(copy);tx.onabort=()=>reject(tx.error||new Error('Could not save snippet.'));});}
 async update(id,changes){
  const db=await this.open();return new Promise((resolve,reject)=>{
   const tx=db.transaction('snippets','readwrite'),store=tx.objectStore('snippets'),request=store.get(id);let result,failure;
   request.onsuccess=()=>{try{if(!request.result)throw new Error('Snippet no longer exists.');const next={...request.result,updatedAt:new Date().toISOString()};if(changes.title!==undefined)next.title=changes.title;if(changes.deleted!==undefined)next.deleted=changes.deleted;result=validateSnippet(next);store.put(result);}catch(error){failure=error;tx.abort();}};
   tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(failure||tx.error||new Error('Could not update snippet.'));
  });
 }
 close(){this.connection?.close();this.connection=null;}
}
