/* Milestone 23: independently authored 96x31 mathematical layout / rasterizer.
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
 constructor(){this.width=WIDTH;this.height=HEIGHT;this.pixels=new Uint8Array(WIDTH*HEIGHT);this.clip=null}
 pixel(x,y,on=1){x=Math.round(x);y=Math.round(y);if(x>=0&&x<WIDTH&&y>=0&&y<HEIGHT&&(!this.clip||(y>=this.clip.top&&y<this.clip.bottom&&x>=this.clip.left&&x<this.clip.right)))this.pixels[y*WIDTH+x]=on?1:0}
 line(x1,y1,x2,y2){x1=Math.round(x1);y1=Math.round(y1);x2=Math.round(x2);y2=Math.round(y2);let dx=Math.abs(x2-x1),sx=x1<x2?1:-1,dy=-Math.abs(y2-y1),sy=y1<y2?1:-1,err=dx+dy;while(true){this.pixel(x1,y1);if(x1===x2&&y1===y2)break;let e2=2*err;if(e2>=dy){err+=dy;x1+=sx}if(e2<=dx){err+=dx;y1+=sy}}}
 glyph(char,x,y){let rows=FONT[char]||FONT[char.toUpperCase()]||FONT['?'];for(let j=0;j<5;j++)for(let i=0;i<3;i++)if(rows[j][i]==='1')this.pixel(x+i,y+j)}
 text(str,x,y,maxX=WIDTH){for(const c of String(str)){if(x+3>maxX)break;this.glyph(c,x,y);x+=4}return x}
}
// Baseline-aware layout. Independent of the semantic AST and LCD raster.
// The baseline is a local y coordinate, measured down from the top of a box.
function make(width,height,commands,anchors=[],baseline=height-1){
 return {width:Math.max(0,Math.ceil(width)),height:Math.max(1,Math.ceil(height)),baseline:Math.max(0,Math.ceil(baseline)),commands,anchors};
}
function glyphBox(s){s=String(s);return make(s.length*4,5,[{type:'text',text:s,x:0,y:0}],[],4)}
function placeholder(){return make(4,7,[{type:'text',text:'□',x:0,y:1}],[],5)}
function embed(box,x,y,cmds,anchors){cmds.push({type:'child',box,x,y});for(const a of box.anchors)anchors.push({...a,x:a.x+x,y:a.y+y})}
function sequence(seq,anchor){
 const children=seq.children||[],boxes=children.map(n=>layoutNode(n,anchor));
 if(!boxes.length)boxes.push(placeholder());
 const baseline=Math.max(4,...boxes.map(b=>b.baseline));
 const descent=Math.max(0,...boxes.map(b=>b.height-1-b.baseline));
 const height=baseline+descent+1,commands=[],anchors=[];let x=0;
 for(let i=0;i<=children.length;i++){
  if(anchor&&seq.id===anchor.sequenceId&&i===anchor.offset)anchors.push({kind:'cursor',x,y:baseline-4,baseline});
  if(i<children.length){let box=boxes[i];embed(box,x,baseline-box.baseline,commands,anchors);x+=box.width}
 }
 if(!children.length)embed(boxes[0],0,baseline-boxes[0].baseline,commands,anchors);
 return make(children.length?x:boxes[0].width,height,commands,anchors,baseline);
}
function layoutNode(node,anchor){
 if(node.kind==='Token')return glyphBox(node.value);
 if(node.kind==='Sequence')return sequence(node,anchor);
 if(node.kind==='Fraction'){
  let top=sequence(node.numerator,anchor),bottom=sequence(node.denominator,anchor);
  let width=Math.max(7,top.width,bottom.width)+2,bar=top.height+1;
  let height=bar+2+bottom.height,baseline=bar+Math.max(1,Math.floor(bottom.height/2));
  let commands=[],anchors=[];
  embed(top,Math.floor((width-top.width)/2),0,commands,anchors);
  commands.push({type:'line',x1:0,y1:bar,x2:width-1,y2:bar});
  embed(bottom,Math.floor((width-bottom.width)/2),bar+2,commands,anchors);
  return make(width,height,commands,anchors,baseline);
 }
 if(node.kind==='Power'){
  let exp=sequence(node.exponent,anchor),commands=[],anchors=[];
  embed(exp,0,0,commands,anchors);
  // The exponent rises above the baseline of the preceding base glyph.
  return make(Math.max(4,exp.width),exp.height+4,commands,anchors,exp.height+3);
 }
 if(node.kind==='Root'){
  let body=sequence(node.radicand,anchor),degree=node.degree?sequence(node.degree,anchor):null;
  let lead=degree?Math.max(7,degree.width+2):5,bodyY=degree?Math.max(3,degree.height-3):2;
  let height=Math.max(bodyY+body.height+1,degree?degree.height:0,9),width=lead+body.width+2,commands=[],anchors=[];
  commands.push({type:'line',x1:lead-5,y1:height-5,x2:lead-3,y2:height-2},{type:'line',x1:lead-3,y1:height-2,x2:lead,y2:bodyY},{type:'line',x1:lead,y1:bodyY,x2:width-1,y2:bodyY});
  embed(body,lead+1,bodyY+1,commands,anchors);
  if(degree)embed(degree,0,0,commands,anchors);
  return make(width,height,commands,anchors,bodyY+1+body.baseline);
 }
 if(node.kind==='Function'||node.kind==='Group'){
  let inner=sequence(node.kind==='Function'?node.argument:node.body,anchor);
  let name=glyphBox(node.kind==='Function'?node.name+'(':'('),close=glyphBox(')');
  let baseline=Math.max(name.baseline,inner.baseline,close.baseline);
  let height=baseline+Math.max(name.height-1-name.baseline,inner.height-1-inner.baseline,close.height-1-close.baseline)+1;
  let commands=[],anchors=[];
  embed(name,0,baseline-name.baseline,commands,anchors);
  embed(inner,name.width,baseline-inner.baseline,commands,anchors);
  embed(close,name.width+inner.width,baseline-close.baseline,commands,anchors);
  return make(name.width+inner.width+close.width,height,commands,anchors,baseline);
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
 const inputTop=7,inputBottom=22,inputHeight=inputBottom-inputTop;
 // Scroll around the *editable anchor*, including when deeply nested.
 let caret=box.anchors.find(a=>a.kind==='cursor');
 let anchorX=caret?caret.x:Math.min(box.width,4*(screen.cursor||0));
 let anchorY=caret?caret.y:Math.min(box.height-1,box.baseline);
 let scrollX=Math.max(0,Math.min(Math.max(0,box.width-WIDTH),anchorX-87));
 let scrollY=box.height<=inputHeight?0:Math.max(0,Math.min(box.height-inputHeight,anchorY-Math.floor(inputHeight/2)));
 let y=inputTop+(box.height<=inputHeight?Math.floor((inputHeight-box.height)/2):0)-scrollY;
 f.clip={left:0,right:WIDTH,top:inputTop,bottom:inputBottom};
 drawBox(box,f,-scrollX,y);
 if(screen.view==='edit'){
  let cx=anchorX-scrollX,cy=y+anchorY;
  if(cx>=0&&cx<WIDTH&&cy>=inputTop&&cy<inputBottom)f.line(cx,cy,cx+Math.min(2,WIDTH-1-cx),cy);
 }
 f.clip=null;
 if(scrollX>0)f.glyph('<',0,9);
 if(box.width-scrollX>WIDTH)f.glyph('>',92,9);
 // Vertical overflow markers are drawn in the left margin and are not
 // part of the mathematical expression's semantic tree.
 if(scrollY>0)f.glyph('↑',0,7);
 if(scrollY+inputHeight<box.height)f.glyph('↓',0,16);
 f.line(0,22,95,22);
 let result=String(screen.result||'');if(result.length>24)result=result.slice(-24);f.text(result,Math.max(0,96-4*result.length),25);
 return {pixels:f.pixels,overflow:box.width>WIDTH||box.height>inputHeight,scrollX,scrollY,layout:box,viewport:{top:inputTop,bottom:inputBottom}};
}
function rasterizeScreen(screen){return composeScreen(screen).pixels}
const api=Object.freeze({WIDTH,HEIGHT,FONT,Framebuffer,layoutExpression,composeScreen,rasterizeScreen});global.FX991_DISPLAY=api;
})(typeof window!=='undefined'?window:globalThis);
