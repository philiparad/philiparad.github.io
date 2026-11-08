/* Independent 96 x 31 single-bit LCD raster with deterministic rendering.
 * This logical dimension is a project design choice, not a hardware claim.
 */
(function(global){'use strict';
const W=96,H=31;
const FONT={
 '0':['111','101','101','101','111'],'1':['010','110','010','010','111'],'2':['111','001','111','100','111'],'3':['111','001','111','001','111'],'4':['101','101','111','001','001'],'5':['111','100','111','001','111'],'6':['111','100','111','101','111'],'7':['111','001','010','010','010'],'8':['111','101','111','101','111'],'9':['111','101','111','001','111'],
 A:['010','101','111','101','101'],B:['110','101','110','101','110'],C:['011','100','100','100','011'],D:['110','101','101','101','110'],E:['111','100','110','100','111'],F:['111','100','110','100','100'],G:['011','100','101','101','011'],H:['101','101','111','101','101'],I:['111','010','010','010','111'],J:['001','001','001','101','010'],K:['101','101','110','101','101'],L:['100','100','100','100','111'],M:['101','111','111','101','101'],N:['101','111','111','111','101'],O:['111','101','101','101','111'],P:['110','101','110','100','100'],Q:['111','101','101','111','001'],R:['110','101','110','101','101'],S:['011','100','010','001','110'],T:['111','010','010','010','010'],U:['101','101','101','101','111'],V:['101','101','101','101','010'],W:['101','101','111','111','101'],X:['101','101','010','101','101'],Y:['101','101','010','010','010'],Z:['111','001','010','100','111'],
 '+':['000','010','111','010','000'],'-':['000','000','111','000','000'],'.':['000','000','000','000','010'],',':['000','000','000','010','100'],'/':['001','001','010','100','100'],':':['000','010','000','010','000'],'=':['000','111','000','111','000'],
 '(':['001','010','010','010','001'],')':['100','010','010','010','100'],'*':['000','101','010','101','000'],'^':['010','101','000','000','000'],'!':['010','010','010','000','010'],'?':['110','001','010','000','010'],
 ' ':['000','000','000','000','000'],'π':['000','111','101','101','101'],'√':['001','001','101','110','100'],'□':['111','101','101','101','111'],'°':['010','101','010','000','000'],'_':['000','000','000','000','111'],
 '↑':['010','111','010','010','010'],'↓':['010','010','010','111','010'],'<':['001','010','100','010','001'],'>':['100','010','001','010','100'],'×':['101','010','010','010','101'],'÷':['010','000','111','000','010']
};
// REA-010: independently drawn, compact glyphs for mathematical and
// display-navigation symbols. Native glyph bitmaps are still unmeasured.
Object.assign(FONT,{
 'θ':['010','101','111','101','010'],
 'α':['000','011','101','101','011'],
 'β':['110','101','110','101','110'],
 'Σ':['111','100','010','100','111'],
 '∑':['111','100','010','100','111'],
 '∫':['011','010','010','010','110'],
 '∞':['000','101','111','101','000'],
 '≠':['001','111','010','111','100'],
 '≤':['001','010','100','111','000'],
 '≥':['100','010','001','111','000'],
 '≈':['000','110','011','110','011'],
 '÷':['010','000','111','000','010'],
 '′':['010','010','000','000','000'],
 '″':['101','101','000','000','000'],
 '▸':['100','110','111','110','100'],
 '◂':['001','011','111','011','001'],
 '▷':['100','110','101','110','100'],
 '◁':['001','011','101','011','001'],
 '↑':['010','111','010','010','010'],
 '↓':['010','010','010','111','010'],
 '√':['001','001','101','110','100'],
 '×':['101','101','010','101','101'],
 '·':['000','000','010','000','000']
});
const MATH_GLYPHS=Object.freeze(['θ','α','β','Σ','∑','∫','∞','≠','≤','≥','≈','′','″','▸','◂','▷','◁','√','×','·']);
function rasterize(state){const pixels=new Uint8Array(W*H);const pixel=(x,y)=>{if(x>=0&&y>=0&&x<W&&y<H)pixels[y*W+x]=1};
 const glyph=(c,x,y)=>{const f=FONT[c]||FONT[c.toUpperCase()]||FONT['?'];for(let j=0;j<5;j++)for(let i=0;i<3;i++)if(f[j][i]==='1')pixel(x+i,y+j)};
 const write=(text,x,y,limit=W)=>{for(const c of String(text)){if(x+3>limit)break;glyph(c,x,y);x+=4}};
 const line=(y)=>{for(let x=0;x<W;x++)pixel(x,y)};
 // Status annunciators are a separate accurately sized HTML overlay.

 if(!state.power){return pixels}
 if(state.screen==='contrast'){
  write('CONTRAST',28,1);
  write('LIGHT <',0,13);
  write('> DARK',67,13);
  write('LEVEL '+String(state.contrast??5),24,22);
  return pixels;
 }
 if(state.screen==='menu'){
  const title=String(state.menuTitle||'MENU').replace(/[^A-Za-z0-9 /-]/g,'').slice(0,18);
  write(title,0,0);
  const a=state.menu||[],size=state.menuPageSize||6;
  const lineHeight=size>=10?5:size>=8?6:8;
  const firstY=size>=10?6:size>=8?6:8;
  for(let i=0;i<Math.min(size,a.length);i++){
   const x=i%2?48:0,y=firstY+lineHeight*Math.floor(i/2);
   const name=String(a[i].label).replace(/^\d+\.\s*/, '').replace(/[^A-Za-z0-9 +*/-]/g,'').slice(0,9);
   write(String(a[i].number)+':'+name,x,y,x+48);
  }
  if((state.menuPage+1)*size<state.menuEntries.length)write('>',91,0);
  if(state.menuPage>0)write('<',87,0);
  return pixels;
 }
 if(state.screen==='prompt'&&state.flow){
  const f=state.flow,field=f.fields[f.index];
  write((''+f.title).replace(/[^A-Za-z0-9 /-]/g,'').slice(0,22),0,0);
  write((f.index+1)+'/'+f.fields.length+' '+field.label.slice(0,20),0,9);
  const content=String(f.buffer||'');
  const cursor=Math.max(0,Math.min(content.length,f.cursor??content.length));
  const start=Math.max(0,Math.min(cursor-22,content.length-23));
  write(content.slice(start,start+23),0,18);
  if(f.editing&&!(field.choices||['op','operator','kind','variable'].includes(field.id))){
   const x=Math.max(0,Math.min(92,(cursor-start)*4));
   for(let yy=17;yy<=23;yy++)pixel(x,yy);
  }
  write((state.info||((field.choices||['op','operator','kind','variable'].includes(field.id))?'ARROWS CHOOSE  = OK':'= NEXT  AC BACK')).slice(0,23),0,25);
  return pixels;
 }
 if(state.screen==='flow-result'){
  const lines=state.outputLines||[];const offset=3*(state.outputPage||0);
  for(let i=0;i<3;i++)write(String(lines[offset+i]||'').slice(0,23),0,7+i*8);
  if(offset+3<lines.length)write('>',91,0);
  if(offset>0)write('<',87,0);
  return pixels;
 }
 // REA-009: render editable mathematical templates in two dimensions.
 const expression=state.editor;
 const linearModes=['STAT','BASE-N','MATRIX','VECTOR'];
 const structured=expression&&state.math&&!linearModes.includes(state.mode)&&expression.root.some(node=>node.type!=='char');
 const fieldNames={fraction:['numerator','denominator'],mixed:['integer','numerator','denominator'],
  power:['exponent'],squareRoot:['radicand'],cubeRoot:['radicand'],nthRoot:['index','radicand']};
 function measureSeq(nodes){return nodes.reduce((width,node)=>width+measureNode(node),0)}
 function measureNode(node){
  if(node.type==='char')return 4;
  const p=node.parts;
  const measureField=name=>Math.max(6,measureSeq(p[name]||[]));
  if(node.type==='fraction')return Math.max(measureField('numerator'),measureField('denominator'))+4;
  if(node.type==='mixed')return measureField('integer')+Math.max(measureField('numerator'),measureField('denominator'))+8;
  if(node.type==='power')return measureField('exponent')+2;
  if(node.type==='squareRoot'||node.type==='cubeRoot')return measureField('radicand')+8;
  if(node.type==='nthRoot')return measureField('index')+measureField('radicand')+9;
  return 4;
 }
 function drawSeq(nodes,x,baseline,path,cursorOn){
  const active=cursorOn&&expression.path.length===path.length&&expression.path.every((p,i)=>p.index===path[i].index&&p.field===path[i].field);
  for(let i=0;i<=nodes.length;i++){
   if(active&&expression.offset===i){
    for(let yy=baseline-3;yy<=baseline+5;yy++)pixel(x,yy);
   }
   if(i===nodes.length)break;
   const node=nodes[i],w=measureNode(node);
   if(node.type==='char'){
    glyph(node.value,x,baseline);
   }else{
    const p=node.parts,drawField=(field,xx,yy)=>{
     const sub=p[field]||[];
     if(!sub.length){for(let d=0;d<5;d++)pixel(xx+d,yy+5)}
     drawSeq(sub,xx,yy,[...path,{index:i,field}],cursorOn);
    };
    if(node.type==='fraction'){
     const widest=w-4,a=measureSeq(p.numerator),b=measureSeq(p.denominator);
     drawField('numerator',x+2+Math.floor((widest-a)/2),baseline-10);
     for(let xx=x;xx<x+w;xx++)pixel(xx,baseline-3);
     drawField('denominator',x+2+Math.floor((widest-b)/2),baseline+1);
    }else if(node.type==='mixed'){
     drawField('integer',x,baseline);
     const shift=Math.max(6,measureSeq(p.integer))+4;
     const span=w-shift,a=measureSeq(p.numerator),b=measureSeq(p.denominator);
     drawField('numerator',x+shift+Math.floor((span-a)/2),baseline-10);
     for(let xx=x+shift-1;xx<x+w;xx++)pixel(xx,baseline-3);
     drawField('denominator',x+shift+Math.floor((span-b)/2),baseline+1);
    }else if(node.type==='power'){
     drawField('exponent',x+2,baseline-8);
    }else if(node.type==='squareRoot'||node.type==='cubeRoot'||node.type==='nthRoot'){
     const nth=node.type==='nthRoot',prefix=nth?9:7;
     if(node.type==='cubeRoot')glyph('3',x,baseline-9);
     if(nth)drawField('index',x,baseline-10);
     const x0=x+prefix-5;
     pixel(x0,baseline+2);pixel(x0+1,baseline+3);pixel(x0+2,baseline+2);
     for(let n=0;n<7;n++)pixel(x0+3+Math.floor(n/2),baseline+1-n);
     for(let xx=x+prefix-1;xx<x+w;xx++)pixel(xx,baseline-7);
     drawField('radicand',x+prefix,baseline);
    }
   }
   x+=w;
  }
  return x;
 }
 function drawStructured(visibleCursor,baseline){
  const nodes=expression.root;
  const width=measureSeq(nodes);
  const offset=Math.max(0,width-W+2);
  drawSeq(nodes,-offset,baseline,[],visibleCursor);
  if(offset>0)glyph('<',0,25);
 }

 if(state.screen==='error'){write(state.error||'Math ERROR',0,14);return pixels}
 function drawTypedResult(presentation){
  const item=presentation&&presentation.chosen;
  if(!item||!['fraction','mixed','pi','surd','engineering'].includes(item.kind))return false;
  if(item.kind==='fraction'||item.kind==='mixed'){
   const n=String(item.numerator),d=String(item.denominator);
   const integer=item.kind==='mixed'?String(item.integer):'';
   const numberWidth=integer?integer.length*4+4:0;
   const width=Math.max(n.length,d.length)*4+2;
   const start=Math.max(0,W-numberWidth-width-1);
   if(integer)write(integer,start,23);
   const x=start+numberWidth;
   write(n,x+Math.max(0,Math.floor((width-n.length*4)/2)),15);
   for(let i=0;i<width;i++)pixel(x+i,21);
   write(d,x+Math.max(0,Math.floor((width-d.length*4)/2)),24);
   return true;
  }
  const text=String(item.text);
  write(text.slice(-24),Math.max(0,W-Math.min(text.length,24)*4),25);
  return true;
 }
 if(state.screen==='result'){
  if(structured)drawStructured(false,8);
  const input=state.input||'';if(!structured)write(input.slice(-24),0,8);
  const result=String(state.result||'0');if(!drawTypedResult(state.resultPresentation))write(result.slice(-24),Math.max(0,W-Math.min(result.length,24)*4),25);
  if(result.length>24)write('<',0,25);
  return pixels;
 }
 if(structured){drawStructured(true,12);if(state.info)write(state.info.slice(-23),0,25);return pixels}
 const input=state.input||'';const cursor=Math.max(0,Math.min(input.length,state.cursor??input.length));
 const visible=20;const start=Math.max(0,cursor-visible+1);const piece=input.slice(start,start+visible);
 write(piece,0,8);const caret=(cursor-start)*4;if(caret<W)for(let yy=8;yy<15;yy++)pixel(caret,yy);
 if(start>0)write('<',0,20);if(input.length>start+visible)write('>',91,20);
 if(state.info)write(state.info.slice(-23),0,25);
 return pixels;
}
function draw(canvas,state){const pixels=rasterize(state);const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return;
 const scale=8, w=W*scale,h=H*scale;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
 const img=ctx.createImageData(w,h);for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const on=pixels[y*W+x];const color=on?[29,40,34]:[215,230,215];
  for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++){const i=((y*scale+dy)*w+(x*scale+dx))*4;
   const adjustment=(dx===scale-1||dy===scale-1)?(on?7:-2):0;
   img.data[i]=color[0]+adjustment;img.data[i+1]=color[1]+adjustment;img.data[i+2]=color[2]+adjustment;img.data[i+3]=255;
  }
 }
 ctx.putImageData(img,0,0)
}
const API=Object.freeze({width:W,height:H,rasterize,draw,FONT,mathGlyphs:MATH_GLYPHS});global.FreshLCD=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
