// PERF-011: A graph dialog may receive rapid slider / keyboard changes while a
// previous JSXGraph render is still running. Serialize the expensive work,
// render only the newest pending input, and never display stale results.
// The bounded preview cache also avoids rebuilding identical graphs.
export class GraphPreviewQueue {
 constructor(render,display,limit=3){
  this.render=render;this.display=display;this.limit=limit;
  this.cache=new Map();this.active=null;this.pending=null;
  this.latestKey=null;this.closed=false;
 }
 remember(key,value){
  if(this.limit<=0)return;
  this.cache.delete(key);this.cache.set(key,value);
  while(this.cache.size>this.limit)this.cache.delete(this.cache.keys().next().value);
 }
 cached(key){
  if(!this.cache.has(key))return null;
  const value=this.cache.get(key);
  this.cache.delete(key);this.cache.set(key,value);
  return value;
 }
 request(input){
  if(this.closed)return Promise.resolve(false);
  // Small graph descriptions are cloned so a currently rendering request
  // cannot observe later changes to sliders, branches or axis settings.
  const args=structuredClone(input),key=JSON.stringify(args);
  this.latestKey=key;
  if(this.pending&&this.pending.key!==key){
   this.pending.resolve(false);this.pending=null;
  }
  const ready=this.cached(key);
  if(ready){
   if(this.pending){this.pending.resolve(false);this.pending=null;}
   this.display(ready,null);
   return Promise.resolve(true);
  }
  if(this.active?.key===key)return this.active.promise;
  if(this.pending?.key===key)return this.pending.promise;
  let resolve;
  const promise=new Promise(done=>{resolve=done;});
  const job={key,args,resolve,promise};
  if(this.active)this.pending=job;
  else this.run(job);
  return promise;
 }
 run(job){
  this.active=job;
  const process=async()=>{
   let result,failed;
   try{result=await this.render(job.args);}
   catch(error){failed=error;}
   const latest=!this.closed&&this.latestKey===job.key;
   if(!failed&&result!==undefined)this.remember(job.key,result);
   if(latest){
    try{this.display(failed?null:result,failed||null);}
    catch(error){failed=error;}
   }
   job.resolve(latest&&!failed&&result!==undefined);
   if(this.active===job)this.active=null;
   const next=this.pending;this.pending=null;
   if(next&&!this.closed)this.run(next);
   else if(next)next.resolve(false);
  };
  void process();
 }
 cancel(){
  this.latestKey=null;
  if(this.pending){this.pending.resolve(false);this.pending=null;}
 }
 // Insert needs a full-resolution graph, but should not create a second
 // JSXGraph board concurrently with an obsolete preview.
 async finalRender(input,renderFull){
  if(this.closed)throw new Error('Graph editor is closed.');
  this.cancel();
  const inFlight=this.active?.promise;
  if(inFlight)await inFlight;
  if(this.closed)throw new Error('Graph editor is closed.');
  return renderFull(structuredClone(input));
 }
 close(){
  this.closed=true;this.cancel();this.cache.clear();
 }
}
