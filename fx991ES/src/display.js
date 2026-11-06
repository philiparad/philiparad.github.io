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
// Independently drawn compact symbols for common mathematical result labels.
// These are legibility aids, NOT copies of any manufacturer's LCD bitmaps.
Object.assign(FONT,{
 '−':FONT['-'],'×':['101','010','010','010','101'],'÷':['010','000','111','000','010'],
 '∞':['000','101','111','101','000'],'σ':['000','111','101','101','010'],
 'θ':['010','101','111','101','010'],'Σ':['111','100','010','100','111'],
 '∫':['011','010','010','010','110'],'°':['010','101','010','000','000'],
 '²':['110','001','010','100','111'],'³':['110','001','010','001','110'],
 '→':['000','001','111','001','000'],'⇔':['010','111','000','111','010']
});
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
function glyphBox(s){s=String(s);return make(Array.from(s).length*4,5,[{type:'text',text:s,x:0,y:0}],[],4)}
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
 if(node.kind==='MixedFraction'){
  const whole=sequence(node.whole,anchor),numerator=sequence(node.numerator,anchor),denominator=sequence(node.denominator,anchor);
  const fractionWidth=Math.max(7,numerator.width,denominator.width)+2;
  const fractionBar=numerator.height+1,fracHeight=fractionBar+2+denominator.height;
  const baseline=Math.max(whole.baseline,fractionBar+2+denominator.baseline);
  const width=whole.width+3+fractionWidth;
  const height=baseline+Math.max(whole.height-1-whole.baseline,fracHeight-1-(fractionBar+2+denominator.baseline))+1;
  const commands=[],anchors=[];
  embed(whole,0,baseline-whole.baseline,commands,anchors);
  const x=whole.width+3,y=baseline-(fractionBar+2+denominator.baseline);
  embed(numerator,x+Math.floor((fractionWidth-numerator.width)/2),y,commands,anchors);
  commands.push({type:'line',x1:x,y1:y+fractionBar,x2:x+fractionWidth-1,y2:y+fractionBar});
  embed(denominator,x+Math.floor((fractionWidth-denominator.width)/2),y+fractionBar+2,commands,anchors);
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

// Independently-authored exact-result layout. It consumes typed calculator
// values; no expression strings are evaluated or interpreted as markup.
function joinedBoxes(left,right){
 const baseline=Math.max(left.baseline,right.baseline);
 const height=baseline+Math.max(left.height-1-left.baseline,right.height-1-right.baseline)+1;
 const commands=[],anchors=[];embed(left,0,baseline-left.baseline,commands,anchors);
 embed(right,left.width,baseline-right.baseline,commands,anchors);
 return make(left.width+right.width,height,commands,anchors,baseline);
}
function fractionResult(numerator,denominator){
 const top=glyphBox(String(numerator)),bottom=glyphBox(String(denominator));
 const width=Math.max(7,top.width,bottom.width)+2,bar=top.height+1;
 const commands=[],anchors=[];
 embed(top,Math.floor((width-top.width)/2),0,commands,anchors);
 commands.push({type:'line',x1:0,y1:bar,x2:width-1,y2:bar});
 embed(bottom,Math.floor((width-bottom.width)/2),bar+2,commands,anchors);
 return make(width,bar+2+bottom.height,commands,anchors,bar+2+bottom.baseline);
}
function radicalResult(radicand){
 const body=glyphBox(String(radicand)),width=body.width+7,height=10,commands=[],anchors=[];
 commands.push({type:'line',x1:0,y1:6,x2:2,y2:9},
  {type:'line',x1:2,y1:9,x2:5,y2:1},
  {type:'line',x1:5,y1:1,x2:width-1,y2:1});
 embed(body,6,3,commands,anchors);
 return make(width,height,commands,anchors,3+body.baseline);
}
function exactResultLayout(value){
 if(!value||typeof value!=='object')return null;
 const integerPair=v=>v&&v.kind==='rational'&&typeof v.n==='bigint'&&typeof v.d==='bigint'&&v.d>0n;
 if(value.kind==='rational'&&integerPair(value)){
  if(value.d===1n)return null; // Plain integers keep existing result placement.
  return fractionResult(value.n,value.d);
 }
 if(value.kind==='radical'&&integerPair(value.coefficient)){
  const c=value.coefficient;
  const prefix=c.n===1n&&c.d===1n?'':c.n===-1n&&c.d===1n?'-':c.d===1n?String(c.n):null;
  if(prefix===null||typeof value.radicand!=='bigint'||value.radicand<0n)return null;
  return prefix?joinedBoxes(glyphBox(prefix),radicalResult(value.radicand)):radicalResult(value.radicand);
 }
 if(value.kind==='radical-sum'&&integerPair(value.scalar)&&Array.isArray(value.radicals)&&value.radicals.length<=8){
  let combined=null;
  if(value.scalar.n!==0n){
   const scalar=value.scalar;
   combined=scalar.d===1n?glyphBox(String(scalar.n)):fractionResult(scalar.n,scalar.d);
  }
  for(const term of value.radicals){
   if(!integerPair(term.coefficient)||term.coefficient.d!==1n||
      typeof term.radicand!=='bigint'||term.radicand<=1n)return null;
   const n=term.coefficient.n,absolute=n<0n?-n:n;
   const rad=radicalResult(term.radicand);
   const base=absolute===1n?rad:joinedBoxes(glyphBox(String(absolute)),rad);
   if(!combined)combined=n<0n?joinedBoxes(glyphBox('-'),base):base;
   else combined=joinedBoxes(combined,joinedBoxes(glyphBox(n<0n?'-':'+'),base));
  }
  return combined;
 }
 if(value.kind==='pi'&&integerPair(value.coefficient)){
  const c=value.coefficient;
  if(c.n===1n&&c.d===1n)return glyphBox('π');
  if(c.n===-1n&&c.d===1n)return glyphBox('-π');
  if(c.d===1n)return joinedBoxes(glyphBox(String(c.n)),glyphBox('π'));
  return joinedBoxes(fractionResult(c.n,c.d),glyphBox('π'));
 }
 return null;
}
// Viewport of a long result. Result and editable expression scroll independently.
function resultExtent(screen){
 if(screen.view!=='result')return {box:null,structured:false,maxScroll:0,width:0,offset:0};
 const candidate=screen.displayStyle==='MathO'?exactResultLayout(screen.resultValue):null;
 const structured=!!(candidate&&candidate.height<=14);
 const box=structured?candidate:glyphBox(String(screen.result||''));
 // Four-pixel gutters preserve overflow indicators without clipping the data.
 const maxScroll=Math.max(0,box.width-88);
 const offset=Math.max(0,Math.min(maxScroll,Number.isFinite(screen.resultScrollX)?Math.floor(screen.resultScrollX):0));
 return {box,structured,maxScroll,width:box.width,offset};
}
function composeScreen(screen){let f=new Framebuffer(),status=screen.indicators.join(' ')+' '+screen.mode;f.text(status,0,0);f.line(0,6,95,6);
 // MODE and main SETUP menu: four lines, two numbered options per line.
 // This matches the documented selection layout, not proprietary glyph bitmaps.
 if((screen.view==='mode'||screen.view==='setup')&&Array.isArray(screen.menuItems)){
  const items=screen.menuItems;
  for(let i=0;i<items.length&&i<8;i++){
   const x=i%2===0?0:48,y=8+Math.floor(i/2)*6;
   f.text(items[i],x,y,x+47);
  }
  if(screen.menuPage>0)f.glyph('↑',92,0);
  else if(screen.view==='setup'||screen.hasMore===true)f.glyph('↓',92,0);
  return {pixels:f.pixels,overflow:false,scrollX:0,scrollY:0,layout:null};
 }
 if(screen.view==='mode'||screen.view==='setup'||screen.view==='workflow-menu'||screen.view==='workflow-edit'||screen.view==='register-prompt'){
   f.text(screen.view==='mode'?'MODE':screen.view==='setup'?'SETUP':screen.view==='register-prompt'?'STO/RCL':'ENTRY',0,9);
   f.text((screen.expression||screen.result||'').slice(0,23),0,16);f.text((screen.result||'').slice(0,23),0,25);
   return {pixels:f.pixels,overflow:false,scrollX:0,layout:null};
 }
 if(screen.view==='off'){f.text('OFF',40,15);return {pixels:f.pixels,overflow:false,scrollX:0,layout:null}}
 if(screen.view==='error'){f.text(screen.result||'ERROR',0,13);return {pixels:f.pixels,overflow:false,scrollX:0,layout:null}}
 let doc=screen.document,box=doc?layoutExpression(doc):glyphBox(screen.expression||'');
 const resultInfo=resultExtent(screen);
 const structuredResult=resultInfo.structured?resultInfo.box:null;
 const inputTop=7,inputBottom=structuredResult?16:22,inputHeight=inputBottom-inputTop;
 // Scroll around the *editable anchor*, including when deeply nested.
 let caret=box.anchors.find(a=>a.kind==='cursor');
 let anchorX=caret?caret.x:Math.min(box.width,4*(screen.cursor||0));
 let anchorY=caret?caret.y:Math.min(box.height-1,box.baseline);
 // Reserve fixed side gutters only when the content/caret cannot fit.
 // Cursor room counts toward overflow: a 24-character row fills 96 columns
 // but still needs pixels to show the cursor after its last glyph.
 const isEditing=screen.view==='edit';
 const cursorWidth=isEditing?3:0;
 const guttered=box.width+cursorWidth>WIDTH||box.height>inputHeight;
 const left=guttered?4:0,right=guttered?WIDTH-4:WIDTH,visibleWidth=right-left;
 const maxScrollX=Math.max(0,box.width+cursorWidth-visibleWidth);
 // Keep the active cursor inside the content viewport, including at the end.
 const scrollX=Math.min(maxScrollX,Math.max(0,anchorX-(visibleWidth-cursorWidth-1)));
 const scrollY=box.height<=inputHeight?0:Math.max(0,Math.min(box.height-inputHeight,anchorY-Math.floor(inputHeight/2)));
 const y=inputTop+(box.height<=inputHeight?Math.floor((inputHeight-box.height)/2):0)-scrollY;
 f.clip={left,right,top:inputTop,bottom:inputBottom};
 drawBox(box,f,left-scrollX,y);
 const cx=left+anchorX-scrollX,cy=y+anchorY;
 const caretVisible=isEditing&&cx>=left&&cx+cursorWidth<=right&&cy>=inputTop&&cy<inputBottom;
 if(caretVisible)f.line(cx,cy,cx+cursorWidth-1,cy);
 f.clip=null;
 // Overflow icons live exclusively in gutters. Vertical and horizontal
 // markers use separate rows and cannot overwrite expression pixels.
 if(scrollX>0)f.glyph('<',0,9);
 if(box.width-scrollX>visibleWidth)f.glyph('>',92,9);
 if(scrollY>0)f.glyph('↑',0,16);
 if(scrollY+inputHeight<box.height)f.glyph('↓',92,16);
 f.line(0,inputBottom,95,inputBottom);
 if(screen.view==='result'&&resultInfo.maxScroll>0){
  // Start with the left portion and display a separate result overflow gutter.
  f.clip={left:4,right:92,top:structuredResult?17:24,bottom:HEIGHT};
  if(structuredResult)drawBox(structuredResult,f,4-resultInfo.offset,HEIGHT-1-structuredResult.height);
  else drawBox(resultInfo.box,f,4-resultInfo.offset,25);
  f.clip=null;
  if(resultInfo.offset>0)f.glyph('<',0,25);
  if(resultInfo.offset<resultInfo.maxScroll)f.glyph('>',92,25);
 }else if(structuredResult){
  f.clip={left:0,right:WIDTH,top:17,bottom:HEIGHT};
  drawBox(structuredResult,f,WIDTH-structuredResult.width,HEIGHT-1-structuredResult.height);
  f.clip=null;
 }else{
  let result=String(screen.result||'');if(result.length>24)result=result.slice(-24);
  f.text(result,Math.max(0,96-4*result.length),25);
 }
 return {pixels:f.pixels,overflow:guttered,scrollX,scrollY,caretVisible,layout:box,
  resultLayout:structuredResult,viewport:{left,right,top:inputTop,bottom:inputBottom},
  resultScrollX:resultInfo.offset,resultMaxScroll:resultInfo.maxScroll,
  resultOverflow:resultInfo.maxScroll>0};
}
function rasterizeScreen(screen){return composeScreen(screen).pixels}
const api=Object.freeze({WIDTH,HEIGHT,FONT,Framebuffer,layoutExpression,exactResultLayout,resultExtent,composeScreen,rasterizeScreen});global.FX991_DISPLAY=api;
})(typeof window!=='undefined'?window:globalThis);
