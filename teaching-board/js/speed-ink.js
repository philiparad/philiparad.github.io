// Converts screen-space writing speed into the same normalized width samples
// used by pressure ink. Store these samples, so reopening/exporting never needs
// event timing or recalculation. Zoom affects speed, but not the saved width.
export class SpeedInk {
 constructor(point,time,zoom=1){
  this.point=[...point];this.time=Number.isFinite(time)?time:null;
  this.zoom=zoom;this.value=.5;
 }
 add(point,time){
  const distance=Math.hypot(point[0]-this.point[0],point[1]-this.point[1])*this.zoom;
  this.point=[...point];
  // Duplicate, out-of-order or unavailable clocks must not make width spike.
  if(!Number.isFinite(time))return this.value;
  if(this.time===null){this.time=time;return this.value;}
  const elapsed=time-this.time;
  if(elapsed<=0)return this.value;
  this.time=time;
  if(distance<=1e-6)return this.value;
  const speed=distance/elapsed;
  const target=.25+.4/(1+speed/.45);
  // Time-based low-pass filtering avoids sudden width changes at corners.
  // Cap a long pause so resuming cannot abruptly widen the stroke.
  const blend=1-Math.exp(-Math.min(elapsed,40)/45);
  this.value+=(target-this.value)*blend;
  return this.value;
 }
}
