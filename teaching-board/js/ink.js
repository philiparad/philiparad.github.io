// Dependency-free ink processing for the canvas pen tools.
// Raw samples stay on the item while rendered points are smoothed, so undo,
// backup, and later re-rendering remain deterministic.

export function smoothInk(points, strength = 0.65) {
  const source = (points || []).map(([x, y]) => [Number(x), Number(y)]);
  if (strength <= 0 || source.length < 3) return source;

  const amount = Math.max(0, Math.min(1, Number(strength) || 0));
  const radius = Math.max(1, Math.round(amount * 3));
  const passes = amount >= 0.75 ? 2 : 1;
  let result = source;

  for (let pass = 0; pass < passes; pass += 1) {
    const next = [result[0]];
    for (let i = 1; i < result.length - 1; i += 1) {
      let sx = 0;
      let sy = 0;
      let sw = 0;
      const from = Math.max(0, i - radius);
      const to = Math.min(result.length - 1, i + radius);
      for (let j = from; j <= to; j += 1) {
        const weight = 1 / (1 + Math.abs(j - i));
        sx += result[j][0] * weight;
        sy += result[j][1] * weight;
        sw += weight;
      }
      const blend = Math.min(0.72, 0.22 + amount * 0.52);
      next.push([
        result[i][0] * (1 - blend) + (sx / sw) * blend,
        result[i][1] * (1 - blend) + (sy / sw) * blend,
      ]);
    }
    if (result.length > 1) next.push(result[result.length - 1]);
    result = next;
  }

  result[0] = source[0];
  result[result.length - 1] = source[source.length - 1];
  return result;
}

export function strokePathD(points) {
  const values = points || [];
  if (!values.length) return '';
  if (values.length === 1) return `M${values[0][0]} ${values[0][1]}`;
  if (values.length === 2) return `M${values[0][0]} ${values[0][1]} L${values[1][0]} ${values[1][1]}`;

  let d = `M${values[0][0]} ${values[0][1]}`;
  // Catmull–Rom to cubic Bézier conversion keeps the stroke flowing through
  // the samples without requiring a third-party drawing dependency.
  for (let i = 0; i < values.length - 1; i += 1) {
    const p0 = values[i - 1] || values[i];
    const p1 = values[i];
    const p2 = values[i + 1];
    const p3 = values[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x} ${c1y} ${c2x} ${c2y} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

// Empty coalesced batches occur in some browsers; always retain the dispatch sample.
export function pointerSamples(event) {
  const batch = event.getCoalescedEvents?.() || [];
  return batch.length ? [...batch, event] : [event];
}

// Speed-adaptive low-pass filter in screen pixels: steady slow writing, responsive fast strokes.
export class AdaptiveInk {
  constructor(point, time, strength=.65, zoom=1) {
    this.raw=[...point]; this.value=[...point]; this.time=time;
    this.strength=strength; this.zoom=zoom; this.speed=0;
  }
  add(point,time) {
    const dt=Math.max(1/240,Math.min(.05,((time-this.time)||8)/1000));
    const speed=Math.hypot(point[0]-this.raw[0],point[1]-this.raw[1])*this.zoom/dt;
    this.speed+=.4*(speed-this.speed);
    const cutoff=3+(1-this.strength)*18+this.speed*.09;
    const alpha=this.strength<=0?1:1-Math.exp(-2*Math.PI*cutoff*dt);
    this.value=this.value.map((v,i)=>v+alpha*(point[i]-v));
    this.raw=[...point];this.time=time;
    return [...this.value];
  }
}

// Uniform arc-length samples prevent browser event frequency from changing the result.
export function refineInk(points,strength=.65,zoom=1) {
  const src=(points||[]).filter((p,i,a)=>!i||Math.hypot(p[0]-a[i-1][0],p[1]-a[i-1][1])>1e-6).map(p=>[...p]);
  if(strength<=0||src.length<3)return src;
  const step=1.25/zoom, samples=[src[0]];let remaining=step;
  for(let i=1;i<src.length;i++){
    let a=src[i-1],b=src[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);
    while(len>=remaining){const t=remaining/len;a=[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])];samples.push(a);len-=remaining;remaining=step;}
    remaining-=len;
  }
  const last=src[src.length-1];if(Math.hypot(last[0]-samples.at(-1)[0],last[1]-samples.at(-1)[1])>1e-6)samples.push(last);
  const radius=2+Math.round(strength*2),limit=(.35+strength*.9)/zoom;
  return samples.map((p,i)=>{
    if(!i||i===samples.length-1)return p;
    const a=samples[Math.max(0,i-2)],b=samples[Math.min(samples.length-1,i+2)];
    const ux=p[0]-a[0],uy=p[1]-a[1],vx=b[0]-p[0],vy=b[1]-p[1];
    const cos=(ux*vx+uy*vy)/(Math.hypot(ux,uy)*Math.hypot(vx,vy)||1);
    // Keep sharp reversals and corners; reduce correction on tight letter loops.
    const blend=strength*.8*Math.max(0,Math.min(1,(cos-.25)/.65));
    let x=0,y=0,w=0;for(let j=Math.max(0,i-radius);j<=Math.min(samples.length-1,i+radius);j++){const k=radius+1-Math.abs(j-i);x+=samples[j][0]*k;y+=samples[j][1]*k;w+=k;}
    let dx=(x/w-p[0])*blend,dy=(y/w-p[1])*blend;const length=Math.hypot(dx,dy);if(length>limit){dx*=limit/length;dy*=limit/length;}
    return [p[0]+dx,p[1]+dy];
  });
}

// Local control handles are clamped to each segment's box to prevent curve overshoot.
export function naturalPathD(points) {
  if(points.length<3)return strokePathD(points);
  let d=`M${points[0][0]} ${points[0][1]}`;
  for(let i=0;i<points.length-1;i++){
    const a=points[i-1]||points[i],b=points[i],c=points[i+1],e=points[i+2]||c;
    const clamp=(v,k)=>Math.max(Math.min(b[k],c[k]),Math.min(Math.max(b[k],c[k]),v));
    const h1=b.map((v,k)=>clamp(v+(c[k]-a[k])/6,k)),h2=c.map((v,k)=>clamp(v-(e[k]-b[k])/6,k));
    d+=` C${h1} ${h2} ${c}`;
  }return d;
}
