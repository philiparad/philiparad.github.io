/** Reversible document patches; storage revisions stay outside undo/redo. */
export const serializedBytes=value=>new TextEncoder().encode(JSON.stringify(value)).byteLength;
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const object=value=>value!==null&&typeof value==='object';
const ASSET_THRESHOLD=4096;
class AssetRef{constructor(id){this.id=id;}}
// Count shared large strings once. This remains a payload estimate, not heap size.
function retainedBytes(value,seen=new Set()){
 if(value===undefined)return 0;
 if(typeof value==='string'&&value.length>=ASSET_THRESHOLD){if(seen.has(value))return 0;seen.add(value);}
 if(!object(value))return serializedBytes(value);
 if(Array.isArray(value))return 2+Math.max(0,value.length-1)+value.reduce((sum,item)=>sum+retainedBytes(item,seen),0);
 const entries=Object.entries(value).filter(([,v])=>v!==undefined);
 return 2+Math.max(0,entries.length-1)+entries.reduce((sum,[key,item])=>sum+serializedBytes(key)+1+retainedBytes(item,seen),0);
}
class AssetPool{
 constructor(){this.values=new Map();this.ids=new Map();this.next=0;}
 encode(value){
  if(typeof value==='string'&&value.length>=ASSET_THRESHOLD){let id=this.ids.get(value);if(id===undefined){id=++this.next;this.ids.set(value,id);this.values.set(id,value);}return new AssetRef(id);}
  if(Array.isArray(value))return value.map(v=>this.encode(v));
  if(object(value))return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,this.encode(v)]));
  return value;
 }
 decode(value){
  if(value instanceof AssetRef){if(!this.values.has(value.id))throw new Error('Missing history asset.');return this.values.get(value.id);}
  if(Array.isArray(value))return value.map(v=>this.decode(v));
  if(object(value))return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,this.decode(v)]));
  return value;
 }
 collect(patches){
  const used=new Set();const visit=v=>{if(v instanceof AssetRef)used.add(v.id);else if(object(v))Object.values(v).forEach(visit);};visit(patches);
  for(const [id,value]of this.values)if(!used.has(id)){this.values.delete(id);this.ids.delete(value);}
 }
}
function diff(before,after,path=[],out=[]){
 if(Object.is(before,after))return out;
 if(Array.isArray(before)&&Array.isArray(after)){
  if(before.length===after.length){for(let i=0;i<before.length;i++)diff(before[i],after[i],[...path,i],out);}
  else{
   let start=0,end=0;while(start<Math.min(before.length,after.length)&&equal(before[start],after[start]))start++;
   while(end<Math.min(before.length,after.length)-start&&equal(before[before.length-1-end],after[after.length-1-end]))end++;
   out.push({kind:'splice',path,index:start,removed:structuredClone(before.slice(start,before.length-end)),added:structuredClone(after.slice(start,after.length-end))});
  }
 }else if(object(before)&&object(after)&&!Array.isArray(before)&&!Array.isArray(after)){
  for(const key of new Set([...Object.keys(before),...Object.keys(after)])){
   const hadBefore=Object.hasOwn(before,key),hadAfter=Object.hasOwn(after,key);
   if(hadBefore&&hadAfter)diff(before[key],after[key],[...path,key],out);
   else out.push({kind:'set',path:[...path,key],hadBefore,hadAfter,before:structuredClone(before[key]),after:structuredClone(after[key])});
  }
 }else out.push({kind:'set',path,hadBefore:true,hadAfter:true,before:structuredClone(before),after:structuredClone(after)});
 return out;
}
function apply(document,patch,forward){
 let result=structuredClone(document);
 for(const change of forward?patch:[...patch].reverse()){
  if(change.kind==='splice'){
   const array=change.path.reduce((value,key)=>value[key],result),remove=forward?change.removed:change.added,add=forward?change.added:change.removed;
   // Avoid the engine's argument-count limit when importing large strokes.
   const replacement=[...array.slice(0,change.index),...structuredClone(add),...array.slice(change.index+remove.length)];
   if(!change.path.length)result=replacement;
   else{const parent=change.path.slice(0,-1).reduce((value,key)=>value[key],result);parent[change.path.at(-1)]=replacement;}
  }else{
   const value=structuredClone(forward?change.after:change.before),exists=forward?change.hadAfter:change.hadBefore;
   if(!change.path.length){result=value;continue;}
   const parent=change.path.slice(0,-1).reduce((value,key)=>value[key],result),key=change.path.at(-1);
   if(exists)Object.defineProperty(parent,key,{value,writable:true,enumerable:true,configurable:true});else delete parent[key];
  }
 }
 return result;
}
export class History {
  constructor(initial, limit = 80, {maxBytes=32*1024*1024}={}) {
    if(!Number.isInteger(limit)||limit<0||!Number.isFinite(maxBytes)||maxBytes<=0)throw new Error('Invalid history limits.');
    this.limit=limit;this.maxBytes=maxBytes;this.assets=new AssetPool();this.past=[];this.future=[];this.current=structuredClone(initial);
  }
  commit(next,{retainLatest=false}={}) {
    const patch=diff(this.current,next);if(!patch.length)return false;
    const encoded=this.assets.encode(patch);encoded.retainForUndo=retainLatest;this.past.push(encoded);
    if (this.past.length > this.limit) this.past.shift();
    this.current = structuredClone(next); this.future = [];this.enforceBudget();return true;
  }
  undo() { if (!this.past.length) return null; const patch=this.past.pop();this.current=apply(this.current,this.assets.decode(patch),false);this.future.push(patch);this.enforceBudget();return structuredClone(this.current); }
  redo() { if (!this.future.length) return null; const patch=this.future.pop();this.current=apply(this.current,this.assets.decode(patch),true);this.past.push(patch);this.enforceBudget();return structuredClone(this.current); }
  enforceBudget(){
    this.assets.collect([this.past,this.future]);
    while(this.stats().estimatedBytes>this.maxBytes&&(this.past.length||this.future.length)){
      // Explicit whole-board clears must remain undoable even for large lessons.
      if(this.past.length+this.future.length===1&&(this.past[0]||this.future[0]).retainForUndo)break;
      if(this.past.length)this.past.shift();else this.future.shift();
      this.assets.collect([this.past,this.future]);
    }
  }
  stats(){const estimatedBytes=retainedBytes({current:this.current,past:this.past,future:this.future,assets:[...this.assets.values]});return {undoEntries:this.past.length,redoEntries:this.future.length,estimatedBytes,maxBytes:this.maxBytes,sharedAssets:this.assets.values.size,overBudget:estimatedBytes>this.maxBytes};}
}
