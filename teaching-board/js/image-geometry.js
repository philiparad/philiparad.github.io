// Linear image geometry keeps world-axis stretches exact after rotation.
export function imageAxes(item){
 const [a,b,c,d]=item.imageBasis||[1,0,0,1],r=(item.rotation||0)*Math.PI/180,co=Math.cos(r),si=Math.sin(r);
 return [co*a-si*b,si*a+co*b,co*c-si*d,si*c+co*d];
}
export function imageCorners(item){
 const [a,b,c,d]=imageAxes(item),cx=item.x+item.w/2,cy=item.y+item.h/2;
 return [[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]].map(([u,v])=>({x:cx+a*u*item.w+c*v*item.h,y:cy+b*u*item.w+d*v*item.h}));
}
export function imageSVGTransform(item){
 const [a,b,c,d]=imageAxes(item),w=item.w,h=item.h;
 return `matrix(${a} ${b} ${c} ${d} ${item.x+w/2-a*w/2-c*h/2} ${item.y+h/2-b*w/2-d*h/2})`;
}
export function stretchImage(item,old,sx,sy,cx,cy){
 const [a,b,c,d]=imageAxes(old),u=[a*sx,b*sy],v=[c*sx,d*sy],uw=Math.hypot(...u),vh=Math.hypot(...v);
 item.w=old.w*uw;item.h=old.h*vh;item.x=cx-item.w/2;item.y=cy-item.h/2;
 item.rotation=0;item.imageBasis=[u[0]/uw,u[1]/uw,v[0]/vh,v[1]/vh];
}
