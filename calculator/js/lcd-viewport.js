/* REA-015: deterministic 2D LCD viewport for independent calculator input.
 * Logical pixel dimensions are project choices, NOT measured CASIO hardware.
 */
(function(global){'use strict';
const WIDTH=96,HEIGHT=31,CHAR=4;
const FIELDS={fraction:['numerator','denominator'],mixed:['integer','numerator','denominator'],power:['exponent'],exp10:['exponent'],squareRoot:['radicand'],cubeRoot:['radicand'],nthRoot:['index','radicand']};
function measure(nodes){return nodes.reduce((sum,node)=>sum+nodeWidth(node),0)}
function fieldWidth(node,name){return Math.max(6,measure(node.parts[name]||[]))}
function nodeWidth(node){
 if(node.type==='char')return CHAR;
 if(node.type==='fraction')return Math.max(fieldWidth(node,'numerator'),fieldWidth(node,'denominator'))+4;
 if(node.type==='mixed')return fieldWidth(node,'integer')+Math.max(fieldWidth(node,'numerator'),fieldWidth(node,'denominator'))+8;
 if(node.type==='power')return fieldWidth(node,'exponent')+2;
 if(node.type==='exp10')return 13+fieldWidth(node,'exponent');
 if(node.type==='squareRoot'||node.type==='cubeRoot')return fieldWidth(node,'radicand')+8;
 if(node.type==='nthRoot')return fieldWidth(node,'index')+fieldWidth(node,'radicand')+9;
 return CHAR;
}
function layout(editor,baseline=12){
 let cursor=null,minY=baseline,maxY=baseline+5;
 const wanted=JSON.stringify(editor.path||[]);
 const add=(y1,y2)=>{minY=Math.min(minY,y1);maxY=Math.max(maxY,y2)};
 function walk(nodes,x,y,path){
  if(JSON.stringify(path)===wanted)cursor={x:x+(editor.offset||0)*0,y};
  for(let i=0;i<=nodes.length;i++){
   if(JSON.stringify(path)===wanted&&editor.offset===i)cursor={x,y};
   if(i===nodes.length)break;
   const n=nodes[i],w=nodeWidth(n),p=n.parts||{};
   if(n.type==='char')add(y,y+5);
   else {
    function field(name,fx,fy){
     const child=p[name]||[];
     if(!child.length)add(fy+5,fy+5);
     walk(child,fx,fy,[...path,{index:i,field:name}]);
    }
    if(n.type==='fraction'){
     const widest=w-4,a=measure(p.numerator),b=measure(p.denominator);
     field('numerator',x+2+Math.floor((widest-a)/2),y-10);
     add(y-3,y-3);
     field('denominator',x+2+Math.floor((widest-b)/2),y+1);
    }else if(n.type==='mixed'){
     field('integer',x,y);
     const shift=fieldWidth(n,'integer')+4,span=w-shift;
     field('numerator',x+shift+Math.floor((span-measure(p.numerator))/2),y-10);
     add(y-3,y-3);
     field('denominator',x+shift+Math.floor((span-measure(p.denominator))/2),y+1);
    }else if(n.type==='power')field('exponent',x+2,y-8);
    else if(n.type==='exp10'){add(y-8,y+5);field('exponent',x+13,y-8)}
    else if(['squareRoot','cubeRoot','nthRoot'].includes(n.type)){
     const prefix=n.type==='nthRoot'?9:7;
     add(y-7,y+4);
     if(n.type==='nthRoot')field('index',x,y-10);
     field('radicand',x+prefix,y);
    }
   }
   x+=w;
  }
 }
 walk(editor.root||[],0,baseline,[]);
 return {width:measure(editor.root||[]),cursor:cursor||{x:0,y:baseline},minY,maxY};
}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function follow(editor,current={x:0,y:0},baseline=12){
 const frame=layout(editor,baseline),xMax=Math.max(0,frame.width-WIDTH+8);
 let x=clamp(current.x||0,0,xMax),y=current.y||0;
 // Leave a few pixels for the two lateral overflow cues.
 if(frame.cursor.x-x<5)x=clamp(frame.cursor.x-5,0,xMax);
 if(frame.cursor.x-x>WIDTH-6)x=clamp(frame.cursor.x-(WIDTH-6),0,xMax);
 if(frame.cursor.y-y<3)y=frame.cursor.y-3;
 if(frame.cursor.y-y>21)y=frame.cursor.y-21;
 // Never shift an ordinary short, shallow expression vertically.
 if(frame.minY>=0&&frame.maxY<=26)y=0;
 return {x,y,frame,arrows:{
  left:x>0,right:frame.width-x>WIDTH-1,
  up:frame.minY-y<0,down:frame.maxY-y>26
 }};
}
function linearWindow(text,cursor,visible=23){
 const length=String(text).length;
 const max=Math.max(0,length-visible);
 const start=clamp((cursor||0)-visible+1,0,max);
 return {start,end:start+visible,left:start>0,right:length>start+visible};
}
function pageCount(lines,pageLines=3){return Math.max(1,Math.ceil((lines||[]).length/pageLines))}
function scrollLine(lines,page,x,chars=23){
 const slice=(lines||[]).slice(page*3,page*3+3).map(String);
 const max=Math.max(0,...slice.map(s=>Math.max(0,s.length-chars)));
 const offset=clamp(x||0,0,max);
 return {offset,max,left:offset>0,right:offset<max,lines:slice.map(s=>s.slice(offset,offset+chars))};
}
const api=Object.freeze({layout,follow,linearWindow,scrollLine,pageCount,width:WIDTH,height:HEIGHT});
global.FreshViewport=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
