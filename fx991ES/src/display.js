/* Milestone 15: independently authored 96x31 mathematical layout / rasterizer.
 * Logical layout tree is separate from editable document and AST.
 * All measurements are logical pixels. No firmware glyphs are used.
 */
(function(global){'use strict';
const WIDTH=96,HEIGHT=31;
const FONT={
'0':['111','101','101','101','111'],'1':['010','110','010','010','111'],'2':['111','001','111','100','111'],'3':['111','001','111','001','111'],'4':['101','101','111','001','001'],'5':['111','100','111','001','111'],'6':['111','100','111','101','111'],'7':['111','001','010','010','010'],'8':['111','101','111','101','111'],'9':['111','101','111','001','111'],
'A':['010','101','111','101','101'],'B':['110','101','110','101','110'],'C':['011','100','100','100','011'],'D':['110','101','101','101','110'],'E':['111','100','110','100','111'],'F':['111','100','110','100','100'],'G':['011','100','101','101','011'],'H':['101','101','111','101','101'],'I':['111','010','010','010','111'],'J':['001','001','001','101','010'],'K':['101','101','110','101','101'],'L':['100','100','100','100','111'],'M':['101','111','111','101','101'],'N':['101','111','111','111','101'],'O':['111','101','101','101','111'],'P':['110','101','110','100','100'],'Q':['111','101','101','111','001'],'R':['110','101','110','101','101'],'S':['011','100','010','001','110'],'T':['111','010','010','010','010'],'U':['101','101','101','101','111'],'V':['101','101','101','101','010'],'W':['101','101','111','111','101'],'X':['101','101','010','101','101'],'Y':['101','101','010','010','010'],'Z':['111','001','010','100','111'],
'+':['000','010','111','010','000'],'-':['000','000','111','000','000'],'/':['001','001','010','100','100'],'*':['000','101','010','101','000'],'=':['000','111','000','111','000'],'.':['000','000','000','000','010'],':':['000','010','000','010','000'],',':['000','000','000','010','100'],'(':['001','010','010','010','001'],')':['100','010','010','010','100'],'^':['010','101','000','000','000'],'?':['110','001','010','000','010'],' ':['000','000','000','000','000'],'<':['001','010','100','010','001'],'>':['100','010','001','010','100'],'π':['000','111','101','101','101'],'√':['001','001','101','110','100'],'_':['000','000','000','000','111'],'!':['010','010','010','000','010'],'|':['010','010','010','010','010'],'□':['111','101','101','101','111'],'↑':['010','111','010','010','010'],'↓':['010','010','010','111','010']
};
class Framebuffer{
 constructor(){this.width=WIDTH;this.height=HEIGHT;this.pixels=new Uint8Array(WIDTH*HEIGHT)}
 pixel(x,y,on=1){x=Math.round(x);y=Math.round(y);if(x>=0&&x<WIDTH&&y>=0&&y<HEIGHT)this.pixels[y*WIDTH+x]=on?1:0}
 line(x1,y1,x2,y2){x1=Math.round(x1);y1=Math.round(y1);x2=Math.round(x2);y2=Math.round(y2);let dx=Math.abs(x2-x1),sx=x1<x2?1:-1,dy=-Math.abs(y2-y1),sy=y1<y2?1:-1,err=dx+dy;while(true){this.pixel(x1,y1);if(x1===x2&&y1===y2)break;let e2=2*err;if(e2>=dy){err+=dy;x1+=sx}if(e2<=dx){err+=dx;y1+=sy}}}
 glyph(char,x,y){let rows=FONT[char]||FONT[char.toUpperCase()]||FONT['?'];for(let j=0;j<5;j++)for(let i=0;i<3;i++)if(rows[j][i]==='1')this.pixel(x+i,y+j)}
 text(str,x,y,maxX=WIDTH){for(const c of String(str)){if(x+3>maxX)break;this.glyph(c,x,y);x+=4}return x}
}
// Layout boxes use top-left-local coordinates and provide cursor anchors.
// box.height is an integer; every draw command has local coordinates.
function make(width,height,commands,anchors=[]){return {width:Math.max(0,Math.ceil(width)),height:Math.max(1,Math.ceil(height)),commands,anchors}}
function glyphBox(s){s=String(s);return make(s.length*4,5,[{type:'text',text:s,x:0,y:0}])}
function placeholder(){return make(4,7,[{type:'text',text:'□',x:0,y:1}])}
function embed(box,x,y,cmds,anchors){cmds.push({type:'child',box,x,y});for(const a of box.anchors)anchors.push({...a,x:a.x+x,y:a.y+y})}
function sequence(seq,anchor){let children=seq.children||[],boxes=children.map(n=>layoutNode(n,anchor)),height=Math.max(5,...boxes.map(b=>b.height)),commands=[],anchors=[],x=0;
 for(let i=0;i<=boxes.length;i++){if(anchor&&seq.id===anchor.sequenceId&&i===anchor.offset)anchors.push({kind:'cursor',x,y:0});if(i<boxes.length){let b=boxes[i],y=Math.floor((height-b.height)/2);embed(b,x,y,commands,anchors);x+=b.width}}
 if(children.length===0){let b=placeholder();height=Math.max(height,b.height);embed(b,x,0,commands,anchors);x+=b.width}
 return make(x,height,commands,anchors)}
function layoutNode(node,anchor){
 if(node.kind==='Token')return glyphBox(node.value);
 if(node.kind==='Sequence')return sequence(node,anchor);
 if(node.kind==='Fraction'){
  let top=sequence(node.numerator,anchor),bottom=sequence(node.denominator,anchor),width=Math.max(7,top.width,bottom.width)+2,height=top.height+bottom.height+3,commands=[],anchors=[];
  embed(top,Math.floor((width-top.width)/2),0,commands,anchors);
  commands.push({type:'line',x1:0,y1:top.height+1,x2:width-1,y2:top.height+1});
  embed(bottom,Math.floor((width-bottom.width)/2),top.height+3,commands,anchors);
  return make(width,height,commands,anchors);
 }
 if(node.kind==='Power'){
  let exp=sequence(node.exponent,anchor),cmds=[],anchors=[];
  embed(exp,0,0,cmds,anchors);return make(Math.max(4,exp.width),Math.max(8,exp.height+3),cmds,anchors)
 }
 if(node.kind==='Root'){
  let body=sequence(node.radicand,anchor),degree=node.degree?sequence(node.degree,anchor):null;
  let lead=degree?Math.max(6,degree.width):5,bodyY=degree?4:2,height=Math.max(10,bodyY+body.height+1),width=lead+body.width+2,commands=[],anchors=[];
  commands.push({type:'line',x1:lead-5,y1:height-5,x2:lead-3,y2:height-2},{type:'line',x1:lead-3,y1:height-2,x2:lead,y2:bodyY},{type:'line',x1:lead,y1:bodyY,x2:width-1,y2:bodyY});
  embed(body,lead+1,bodyY+1,commands,anchors);
  if(degree)embed(degree,0,0,commands,anchors);
  return make(width,height,commands,anchors);
 }
 if(node.kind==='Function'||node.kind==='Group'){
  let inner=sequence(node.kind==='Function'?node.argument:node.body,anchor),name=node.kind==='Function'?glyphBox(node.name+'('):glyphBox('('),close=glyphBox(')'),height=Math.max(name.height,inner.height,close.height),commands=[],anchors=[];
  embed(name,0,Math.floor((height-name.height)/2),commands,anchors);embed(inner,name.width,Math.floor((height-inner.height)/2),commands,anchors);embed(close,name.width+inner.width,Math.floor((height-close.height)/2),commands,anchors);return make(name.width+inner.width+close.width,height,commands,anchors);
 }
 return glyphBox('?');
}
function layoutExpression(document){if(!document||!document.root)return glyphBox('');return sequence(document.root,document.anchor)}
function drawBox(box,fb,x,y){for(const c of box.commands){let xx=x+c.x,yy=y+c.y;if(c.type==='text')fb.text(c.text,xx,yy,2048);else if(c.type==='line')fb.line(x+c.x1,y+c.y1,x+c.x2,y+c.y2);else if(c.type==='child')drawBox(c.box,fb,xx,yy)}}
function composeScreen(screen){let f=new Framebuffer(),status=screen.indicators.join(' ')+' '+screen.mode;f.text(status,0,0);f.line(0,6,95,6);
 if(screen.view==='mode'||screen.view==='setup'||screen.view==='workflow-menu'||screen.view==='workflow-edit'||screen.view==='register-prompt'){
   f.text(screen.view==='mode'?'MODE':screen.view==='setup'?'SETUP':screen.view==='register-prompt'?'STO/RCL':'ENTRY',0,9);
   f.text((screen.expression||screen.result||'').slice(0,23),0,16);f.text((screen.result||'').slice(0,23),0,25);
   return {pixels:f.pixels,overflow:false,scrollX:0,layout:null};
 }
 if(screen.view==='off'){f.text('OFF',40,15);return {pixels:f.pixels,overflow:false,scrollX:0,layout:null}}
 if(screen.view==='error'){f.text(screen.result||'ERROR',0,13);return {pixels:f.pixels,overflow:false,scrollX:0,layout:null}}
 let doc=screen.document,box=doc?layoutExpression(doc):glyphBox(screen.expression||'');
 // Cursor anchors are associated with editable slots, never parsed from rendered text.
 let caret=box.anchors.find(a=>a.kind==='cursor'),anchorX=caret?caret.x:Math.min(box.width,4*(screen.cursor||0));
 let scrollX=Math.max(0,Math.min(Math.max(0,box.width-96),anchorX-87));
 // Vertical scaling is not applied: this is a strict 96x31 framebuffer.
 let y=8+Math.max(0,Math.floor((14-box.height)/2));drawBox(box,f,-scrollX,y);
 if(screen.view==='edit'){let cx=anchorX-scrollX;if(cx>=0&&cx<96)f.line(cx,Math.min(21,y+box.height),cx+Math.min(2,95-cx),Math.min(21,y+box.height))}
 if(scrollX>0)f.glyph('<',0,9);if(box.width-scrollX>96)f.glyph('>',92,9);
 f.line(0,22,95,22);
 let result=String(screen.result||'');if(result.length>24)result=result.slice(-24);f.text(result,Math.max(0,96-4*result.length),25);
 return {pixels:f.pixels,overflow:box.width>96||box.height>14,scrollX,layout:box};
}
function rasterizeScreen(screen){return composeScreen(screen).pixels}
const api=Object.freeze({WIDTH,HEIGHT,FONT,Framebuffer,layoutExpression,composeScreen,rasterizeScreen});global.FX991_DISPLAY=api;
})(typeof window!=='undefined'?window:globalThis);