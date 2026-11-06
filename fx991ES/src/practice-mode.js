/* Optional guided exercises scored from real calculator output. */
(function(root){'use strict';
const TASKS=Object.freeze([
 {prompt:'Calculate 7 + 5',answer:12,hint:'Press 7, +, 5, =.'},
 {prompt:'Calculate 8 × 6',answer:48,hint:'Use the multiplication key.'},
 {prompt:'Calculate 3/4 + 1/4',answer:1,hint:'Use the fraction or division keys.'},
 {prompt:'Calculate 2^5',answer:32,hint:'Use the power key.'},
 {prompt:'Calculate (18 − 6) / 3',answer:4,hint:'Use parentheses.'}
].map(x=>Object.freeze(x)));
const start=()=>({enabled:true,index:0,attempts:0,solved:false,completed:false,feedback:'',kind:'idle'});
const stop=()=>({...start(),enabled:false});
function current(p){return p&&p.enabled&&!p.completed?TASKS[p.index]||null:null}
function check(p,state,key,numeric){
 if(!p?.enabled||p.completed||p.solved||key!=='=')return p;
 if(!state||state.mode!=='COMP'||(state.view!=='result'&&state.view!=='error'))return p;
 if(state.view==='error'||!state.lastValue)
  return {...p,attempts:p.attempts+1,kind:'error',feedback:'Calculator error. Check the input and try again.'};
 let actual;try{actual=numeric(state.lastValue)}catch(e){actual=NaN}
 if(!Number.isFinite(actual))
  return {...p,attempts:p.attempts+1,kind:'error',feedback:'A finite numerical result is required.'};
 const task=current(p);
 const ok=Math.abs(actual-task.answer)<=1e-9*Math.max(1,Math.abs(task.answer));
 return {...p,attempts:p.attempts+1,solved:ok,kind:ok?'correct':'incorrect',
 feedback:ok?'Correct! Choose Next exercise.':'Try again. Check your calculation.'};
}
function next(p){
 if(!p?.enabled||p.completed||!p.solved)return p;
 if(p.index===TASKS.length-1)return {...p,completed:true,kind:'complete',feedback:'All exercises complete!'};
 return {...p,index:p.index+1,solved:false,feedback:'',kind:'idle'};
}
const API=Object.freeze({TASKS,start,stop,current,check,next});
if(typeof module!=='undefined'&&module.exports)module.exports=API;
root.FX991_PRACTICE=API;
})(typeof window!=='undefined'?window:globalThis);
