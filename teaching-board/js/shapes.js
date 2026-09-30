import { styleStroke } from './line-style.js?v=20260930-shapes';
const path=(d,closed=false,hidden=false)=>({d,closed,hidden});
const polygon=points=>path('M'+points.map(p=>p.join(' ')).join(' L')+' Z',true);
const regular=(n,inner=1)=>polygon(Array.from({length:n},(_,i)=>{const a=-Math.PI/2+i*2*Math.PI/n,r=i%2?inner:1;return [50+48*r*Math.cos(a),50+48*r*Math.sin(a)];}));
const box=[path('M0 20 L22 0 L100 0 L100 80 L78 100 L0 100 Z',true),path('M0 20 L78 20 L100 0 M78 20 L78 100'),path('M22 0 L22 80 L100 80 M22 80 L0 100',false,true)];
const ellipse='M0 50 C0 -16.667 100 -16.667 100 50 C100 116.667 0 116.667 0 50 Z';
const cylinder=[path('M0 12 C0 -4 100 -4 100 12 L100 88 C100 104 0 104 0 88 Z',true),path('M0 12 C0 28 100 28 100 12 M0 88 C0 104 100 104 100 88'),path('M0 88 C0 72 100 72 100 88',false,true)];
const cone=[path('M50 0 L100 88 C100 104 0 104 0 88 Z',true),path('M0 88 C0 72 100 72 100 88',false,true)];
const pyramid=[polygon([[50,0],[100,80],[50,100],[0,80]]),path('M50 0 L50 100'),path('M0 80 L50 62 L100 80 M50 62 L50 0',false,true)];
const hull=points=>{const sorted=[...points].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);const half=ps=>{const out=[];for(const p of ps){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p);}out.pop();return out;};return [...half(sorted),...half([...sorted].reverse())];};
const prism=n=>{const top=Array.from({length:n},(_,i)=>{const a=-Math.PI/2+2*Math.PI*i/n;return [50+47*Math.cos(a),18+17*Math.sin(a)];}),bottom=top.map(([x,y])=>[x,y+64]);return [polygon(hull([...top,...bottom])),polygon(top),path('M'+bottom.map(p=>p.join(' ')).join(' L')+' Z',false,true),...top.map((p,i)=>path(`M${p} L${bottom[i]}`,false,i>n/2))];};
export const SHAPE_GROUPS=[
 ['Basic polygons',[
 ['rectangle','Rectangle',[polygon([[0,0],[100,0],[100,100],[0,100]])]],
 ['triangle','Triangle',[polygon([[50,0],[100,100],[0,100]])]],
 ['right-triangle','Right triangle',[polygon([[0,0],[100,100],[0,100]])]],
 ['trapezoid-right','Right trapezoid',[polygon([[0,0],[80,0],[100,100],[0,100]])]],
 ['trapezoid','Trapezoid',[polygon([[20,0],[80,0],[100,100],[0,100]])]],
 ['parallelogram','Parallelogram',[polygon([[25,0],[100,0],[75,100],[0,100]])]],
 ['diamond','Diamond',[polygon([[50,0],[100,50],[50,100],[0,50]])]]]],
 ['Regular polygons',[
 ['pentagon','Pentagon',[regular(5)]],['hexagon','Hexagon',[regular(6)]],['octagon','Octagon',[regular(8)]],['star','Star',[regular(10,.43)]]]],
 ['Rounded shapes',[
 ['ellipse','Ellipse',[path(ellipse,true)]],
 ['rounded-rectangle','Rounded rectangle',[path('M18 0 L82 0 Q100 0 100 18 L100 82 Q100 100 82 100 L18 100 Q0 100 0 82 L0 18 Q0 0 18 0 Z',true)]],
 ['semicircle','Semicircle',[path('M0 100 C0 -33.333 100 -33.333 100 100 Z',true)]],
 ['quarter-circle','Quarter circle',[path('M0 0 C55.228 0 100 44.772 100 100 L0 100 Z',true)]]]],
 ['3D solids',[
 ['cube','Cube',box.filter(p=>!p.hidden)],['wire-cube','Cube with hidden edges',box],['cylinder','Cylinder',cylinder],
 ['oblique-prism','Oblique prism',[polygon([[20,0],[100,0],[80,100],[0,100]]),path('M20 0 L0 20 L80 20 L100 0 M80 20 L60 100 M0 20 L0 100')]],
 ['pyramid','Square pyramid',pyramid],['cone','Cone',cone],['sphere','Sphere',[path(ellipse,true),path('M0 50 C0 80 100 80 100 50'),path('M0 50 C0 20 100 20 100 50',false,true)]],
 ['tetrahedron','Tetrahedron',[polygon([[50,0],[100,80],[30,100]]),path('M50 0 L0 75 L30 100'),path('M0 75 L100 80',false,true)]],
 ['triangular-prism','Triangular prism',prism(3)],['pentagonal-pyramid','Pentagonal pyramid',[polygon([[50,0],[100,75],[80,100],[20,100],[0,75]]),path('M50 0 L20 100 M50 0 L80 100'),path('M0 75 L50 55 L100 75 M50 55 L50 0',false,true)]],
 ['hexagonal-prism','Hexagonal prism',prism(6)],['octahedron','Octahedron',[polygon([[50,0],[100,50],[50,100],[0,50]]),path('M0 50 L50 65 L100 50 M50 0 L50 65 L50 100'),path('M0 50 L50 35 L100 50 M50 0 L50 35 L50 100',false,true)]],
 ['truncated-pyramid','Truncated pyramid',[polygon([[25,5],[70,0],[85,15],[100,90],[55,100],[0,85]]),path('M25 5 L40 20 L85 15 M40 20 L55 100'),path('M25 5 L0 85 M70 0 L80 75 L100 90 M0 85 L80 75',false,true)]],
 ['truncated-cone','Truncated cone',[path('M25 10 C25 -3 75 -3 75 10 L100 90 C100 103 0 103 0 90 Z',true),path('M25 10 C25 23 75 23 75 10'),path('M0 90 C0 77 100 77 100 90',false,true)]]]],
 ['Curves',[
 ['wave','Wave',[path('M0 50 C15 115 30 115 50 50 C70 -15 85 -15 100 50')]],
 ['arch','Bell curve',[path('M0 100 C30 100 30 0 50 0 C70 0 70 100 100 100')]],
 ['s-curve','S curve',[path('M0 100 C0 50 100 50 100 0')]],
 ['parabola','Parabola',[path('M0 0 Q50 200 100 0')]]]]
];
export const SHAPES=new Map(SHAPE_GROUPS.flatMap(([,items])=>items.map(([id,label,paths])=>[id,{label,paths}])));
export function scaledPath(d,w,h){let axis=0;return d.replace(/-?\d+(?:\.\d+)?/g,n=>String(+n*(axis++%2?h:w)/100));}
export function drawPreset(item){const ns='http://www.w3.org/2000/svg',g=document.createElementNS(ns,'g');const spec=SHAPES.get(item.shape);if(!spec)return g;
 for(const part of spec.paths){const p=document.createElementNS(ns,'path');const attrs={d:scaledPath(part.d,item.w,item.h),stroke:item.stroke||'#243c59','stroke-width':item.lineWidth||3,'stroke-opacity':item.strokeOpacity??1,fill:part.closed?(item.fill||'none'):'none','fill-opacity':item.fillOpacity??1,'stroke-linecap':'round','stroke-linejoin':'round'};for(const [k,v]of Object.entries(attrs))p.setAttribute(k,v);if(part.hidden){p.setAttribute('stroke-dasharray',`${item.lineWidth||3} ${(item.lineWidth||3)*2}`);g.append(p);}else g.append(styleStroke(p,item));}return g;}
