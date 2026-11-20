/**
 * PERF-011: At most one expensive JSXGraph render at a time.
 * Intermediate edits are superseded; final insertion is queued after the
 * active preview and uses the caller's full-quality render options.
 */
export class GraphPreviewQueue {
 constructor(render){this.render=render;this.running=false;this.pending=null;this.closed=false;}
 request(payload){
  if(this.closed)return Promise.resolve(null);
  return new Promise((resolve,reject)=>{
   if(this.pending)this.pending.resolve(null);
   this.pending={payload,resolve,reject};
   void this.drain();
  });
 }
 async drain(){
  if(this.running)return;
  this.running=true;
  try{
   while(this.pending){
    const job=this.pending;this.pending=null;
    try{
     const result=await this.render(job.payload);
     job.resolve(this.closed?null:result);
    }catch(error){job.reject(error);}
   }
  }finally{this.running=false;}
 }
 close(){
  this.closed=true;
  if(this.pending){this.pending.resolve(null);this.pending=null;}
 }
}
