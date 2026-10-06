import { pressurePathD } from './pressure.js?v=20261006-text-align';
import { drawPreset } from './shapes.js?v=20261006-text-align';
import { styleStroke, STROKED_TYPES } from './line-style.js?v=20261006-text-align';
import { strokePathD, naturalPathD } from './ink.js?v=20261006-text-align';
import { arcPath, arcPoint, curvePath } from './geometry.js?v=20261006-text-align';
const ns='http://www.w3.org/2000/svg';
export function svgEl(tag,attrs={}){const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n;}
export function bounds(item){const w=item.w||1,h=item.h||1,a=(item.rotation||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),cx=item.x+w/2,cy=item.y+h/2;const p=[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].map(([x,y])=>({x:cx+x*c-y*s,y:cy+x*s+y*c}));return {x:Math.min(...p.map(p=>p.x)),y:Math.min(...p.map(p=>p.y)),w:Math.max(...p.map(p=>p.x))-Math.min(...p.map(p=>p.x)),h:Math.max(...p.map(p=>p.y))-Math.min(...p.map(p=>p.y))};}
export function union(items){if(!items.length)return {x:0,y:0,w:1000,h:700};const b=items.map(bounds),x=Math.min(...b.map(i=>i.x)),y=Math.min(...b.map(i=>i.y));return {x,y,w:Math.max(...b.map(i=>i.x+i.w))-x,h:Math.max(...b.map(i=>i.y+i.h))-y};}
export function drawItem(item){const w=item.w||1,h=item.h||1;const g=svgEl('g',{'data-id':item.id,transform:`translate(${item.x} ${item.y}) rotate(${item.rotation||0} ${w/2} ${h/2})`,opacity:item.opacity??1});
 if(item.type==='path'&&item.pressures?.length===item.points?.length&&item.points.length&&(item.lineStyle||'solid')==='solid'){g.append(svgEl('path',{d:pressurePathD(item.points,item.pressures,item.lineWidth||2),fill:item.stroke||'#203954','fill-opacity':item.strokeOpacity??1,'fill-rule':'nonzero',stroke:'none','data-pressure-ink':'true'}));return g;}
 const style={stroke:item.stroke||'#203954','stroke-width':item.lineWidth||2,'stroke-opacity':item.strokeOpacity??1,fill:item.fill||'none','fill-opacity':item.fillOpacity??1,'stroke-linecap':'round','stroke-linejoin':'round'};let shape;
 if(item.type==='shape'){g.append(drawPreset(item));return g;}
 if(item.type==='curve')shape=svgEl('path',{...style,fill:'none',d:curvePath(item.points)});
 else if(item.type==='arc'){shape=svgEl('path',{...style,fill:'none',d:arcPath(item)});if(item.showRadii){const a=arcPoint(item,item.startAngle),b=arcPoint(item,item.startAngle+item.sweepAngle);g.append(svgEl('path',{...style,fill:'none',d:`M${a} L${w/2},${h/2} L${b}`}));}}
 else if(item.type==='path'){
  const points=item.points||[];
  if((item.smoothing||0)>0 && points.length>2) shape=svgEl('path',{...style,fill:'none',d:item.inkVersion===2?naturalPathD(points):strokePathD(points)});
  else shape=svgEl('polyline',{...style,fill:'none',points:points.map(p=>p.join(',')).join(' ')});
 }
 else if(item.type==='line'||item.type==='arrow'){const [a,b]=item.points||[[0,0],[w,h]];shape=svgEl('line',{...style,x1:a[0],y1:a[1],x2:b[0],y2:b[1]});if(item.type==='arrow'){const angle=Math.atan2(b[1]-a[1],b[0]-a[0]),len=12+(item.lineWidth||2)*2;g.append(svgEl('path',{d:`M${b[0]-len*Math.cos(angle-.45)} ${b[1]-len*Math.sin(angle-.45)} L${b} L${b[0]-len*Math.cos(angle+.45)} ${b[1]-len*Math.sin(angle+.45)}`,...style,fill:'none'}));}}
 else if(item.type==='rectangle'||item.type==='note')shape=svgEl('rect',{...style,width:w,height:h,rx:item.type==='note'?7:0,fill:item.type==='note'?(item.fill??'#fff1a8'):style.fill});
 else if(item.type==='ellipse')shape=svgEl('ellipse',{...style,cx:w/2,cy:h/2,rx:w/2,ry:h/2});
 else if(item.type==='triangle')shape=svgEl('polygon',{...style,points:`${w/2},0 ${w},${h} 0,${h}`});
 else if(item.type==='polygon')shape=svgEl('polygon',{...style,points:(item.points||[]).map(p=>p.join(',')).join(' ')});
 else if(['image','equation','graph'].includes(item.type)){g.append(svgEl('rect',{width:w,height:h,fill:'#fff',rx:2}));if(item.type==='image'&&item.crop){const c=item.crop;shape=svgEl('svg',{width:w,height:h,viewBox:`${c.x} ${c.y} ${c.w} ${c.h}`,preserveAspectRatio:'none',overflow:'hidden'});shape.append(svgEl('image',{href:item.src,width:1,height:1,preserveAspectRatio:'none'}));}else shape=svgEl('image',{href:item.src,width:w,height:h,preserveAspectRatio:'none'});}
 // A tap has no segment for SVG to stroke. Render its ink footprint explicitly,
 // including old one-point strokes and the live pointer-down preview.
 const dot=item.type==='path'&&item.points?.length&&item.points.every(p=>p[0]===item.points[0][0]&&p[1]===item.points[0][1]);
 if(dot){const [cx,cy]=item.points[0];g.append(svgEl('circle',{cx,cy,r:(item.lineWidth||2)/2,fill:item.stroke||'#203954','fill-opacity':item.strokeOpacity??1,stroke:'none'}));}
 else if(shape)g.append(STROKED_TYPES.has(item.type)?styleStroke(shape,item):shape);
 if(item.type==='text'||item.type==='note'){const font=item.fontSize||24,pad=item.type==='note'?14:0,rtl=/[\u0590-\u08ff]/.test(item.text||'');const align=item.textAlign||'auto',x=align==='center'?w/2:align==='left'?pad:align==='right'?w-pad:rtl?w-pad:pad,anchor=align==='center'?'middle':align==='left'?(rtl?'end':'start'):align==='right'?(rtl?'start':'end'):'start';const text=svgEl('text',{x,y:pad+font,fill:item.stroke||'#203954','fill-opacity':item.strokeOpacity??1,'font-size':font,'font-family':'Arial, sans-serif',direction:rtl?'rtl':'ltr','text-anchor':anchor,'unicode-bidi':'plaintext'});const max=Math.max(2,Math.floor((w-pad*2)/(font*.55)));const lines=[];for(const line of (item.text||'').split('\n')){let current='';for(const word of line.split(' ')){if(current.length+word.length>max&&current){lines.push(current);current='';}current+=(current?' ':'')+word;}lines.push(current);}lines.forEach((line,i)=>{const span=svgEl('tspan',{x,dy:i?font*1.3:0});span.textContent=line;text.append(span);});g.append(text);}
 return g;
}
export function background(svg,kind,viewport={x:0,y:0,zoom:1},id='paper'){const defs=svgEl('defs'),pattern=svgEl('pattern',{id,width:32,height:32,patternUnits:'userSpaceOnUse',patternTransform:`translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`});if(kind==='dots')pattern.append(svgEl('circle',{cx:1,cy:1,r:1,fill:'#bbc8d5'}));else pattern.append(svgEl('path',{d:kind==='ruled'?'M0 32H32':'M32 0H0V32',fill:'none',stroke:kind==='dark'?'#344359':'#e4e9ef','stroke-width':1}));defs.append(pattern);svg.append(defs,svgEl('rect',{x:0,y:0,width:'100%',height:'100%',fill:kind==='dark'?'#1d293b':'#fff'}));if(kind!=='plain')svg.append(svgEl('rect',{x:0,y:0,width:'100%',height:'100%',fill:`url(#${id})`}));}
export function sceneSVG(board,padding=30){const b=union(board.items);b.x-=padding;b.y-=padding;b.w+=padding*2;b.h+=padding*2;const svg=svgEl('svg',{xmlns:ns,width:Math.ceil(b.w),height:Math.ceil(b.h),viewBox:`0 0 ${b.w} ${b.h}`});background(svg,board.background,{x:-b.x,y:-b.y,zoom:1},'export-paper');const scene=svgEl('g',{transform:`translate(${-b.x} ${-b.y})`});board.items.forEach(item=>scene.append(drawItem(item)));svg.append(scene);return svg;}
