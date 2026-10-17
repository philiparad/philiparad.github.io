/** Reversible document patches; storage revisions stay outside undo/redo. */
export const serializedBytes=value=>new TextEncoder().encode(JSON.stringify(value)).byteLength;
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const object=value=>value!==null&&typeof value==='object';
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
  constructor(initial, limit = 80) { this.limit = limit; this.past = []; this.future = []; this.current = structuredClone(initial); }
  commit(next) {
    const patch=diff(this.current,next);if(!patch.length)return false;
    this.past.push(patch);
    if (this.past.length > this.limit) this.past.shift();
    this.current = structuredClone(next); this.future = []; return true;
  }
  undo() { if (!this.past.length) return null; const patch=this.past.pop();this.current=apply(this.current,patch,false);this.future.push(patch);return structuredClone(this.current); }
  redo() { if (!this.future.length) return null; const patch=this.future.pop();this.current=apply(this.current,patch,true);this.past.push(patch);return structuredClone(this.current); }
  stats(){return {undoEntries:this.past.length,redoEntries:this.future.length,estimatedBytes:serializedBytes({current:this.current,past:this.past,future:this.future})};}
}
