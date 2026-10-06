/** One preview at a time; cancellation also prevents delayed frames from resuming. */
export class ParameterPlayback {
 constructor(render,onStop=()=>{},clock={set:(fn,ms)=>setTimeout(fn,ms),clear:id=>clearTimeout(id)}){this.render=render;this.onStop=onStop;this.clock=clock;this.generation=0;this.active=null;}
 stop(){this.generation++;this.clock.clear(this.timer);this.timer=null;const previous=this.active;this.active=null;if(previous)this.onStop(previous);}
 start(parameter,write){this.stop();const generation=this.generation;this.active=parameter;let direction=1;const tick=async()=>{
  if(generation!==this.generation)return;
  const next=advanceParameter(parameter,direction);direction=next.direction;parameter.value=next.value;write(next.value);
  let ok=false;try{ok=await this.render();}catch{}if(generation!==this.generation)return;
  if(!ok){this.stop();return;}this.timer=this.clock.set(tick,120);
 };void tick();}
}
export function advanceParameter(p,direction){
 const step=(p.max-p.min)/80;let value=p.value+direction*step;
 if(value>=p.max){value=p.max;direction=-1;}else if(value<=p.min){value=p.min;direction=1;}
 return {value:Number(value.toPrecision(12)),direction};
}
