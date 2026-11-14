export function validateInlineEquation(eq){if(!eq||typeof eq.source!=='string'||!eq.source.trim()||eq.source.length>2000||typeof eq.src!=='string'||!/^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(eq.src)||eq.src.length>2000000||![eq.w,eq.h].every(n=>Number.isFinite(n)&&n>0&&n<=2000))throw new Error('Invalid inline equation.');}
export function equationSize(eq,font,width=Infinity){let h=Math.min(font*3,Math.max(font,eq.h*font/30)),w=h*eq.w/eq.h;if(w>width){h*=width/w;w=width;}return {w,h};}
export function equationNode(eq,font){validateInlineEquation(eq);const span=document.createElement('span'),img=document.createElement('img');span.contentEditable='false';span.dataset.equation=JSON.stringify(eq);span.className='inline-equation';span.title='Double-click to edit equation';img.src=eq.src;img.alt=eq.source;const size=equationSize(eq,font);img.style.width=size.w+'px';img.style.height=size.h+'px';span.append(img);return span;}
/** Layout using measured text widths, reserving actual equation space. */
export function equationLines(paragraphs,width,font,measure){
 const lines=[];let number=0;const limit=Math.max(1,width);let sourceOffset=0;
 const graphemes=text=>typeof Intl!=='undefined'&&Intl.Segmenter
   ?[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)].map(s=>s.segment)
   :Array.from(text);
 for(const [paragraphIndex,p] of paragraphs.entries()){
  number=p.list==='number'?(p.numberStart??number+1):0;
  const marker=p.list==='bullet'?'• ':p.list==='number'?number+'. ':'';
  let parts=[],used=0,height=font*1.3,lineStart=sourceOffset,lineLength=0;
  const flush=()=>{lines.push({parts,width:used,height,align:p.align,dir:p.dir||'auto',paragraphIndex,sourceStart:lineStart,sourceEnd:lineStart+lineLength});lineStart+=lineLength;lineLength=0;parts=[];used=0;height=font*1.3;};
  const add=(text,run,w,h)=>{
   const fitted=Math.min(w,limit);
   if(used&&used+fitted>limit)flush();
   parts.push({...run,text,w:fitted,h,...(w>limit&&!run.equation?{fitText:true}:{})});if(!run.synthetic)lineLength+=text.length;used+=fitted;height=Math.max(height,run.equation?h+font*.2:h);
  };
  for(const run of [...(marker?[{text:marker,synthetic:true}]:[]),...p.runs]){
   if(run.equation){const size=equationSize(run.equation,font,limit);add(run.text,run,size.w,size.h);continue;}
   for(const token of run.text.split(/(\s+)/).filter(Boolean)){
    const size=measure(token,run);
    if(size<=limit){add(token,run,size,font*1.3);continue;}
    let chunk='',chunkWidth=0;
    for(const glyph of graphemes(token)){
     const glyphWidth=measure(glyph,run);
     if(chunk&&chunkWidth+glyphWidth>limit){
      add(chunk,run,chunkWidth,font*1.3);chunk='';chunkWidth=0;
     }
     chunk+=glyph;chunkWidth+=glyphWidth;
    }
    if(chunk)add(chunk,run,chunkWidth,font*1.3);
   }
  }
  flush();sourceOffset=lineStart+1;
 }
 return lines;
}
/**
 * One layout calculation for SVG rendering, exported bounds and editing.
 * Height is the entire required text box, including note padding. No lines
 * are omitted or clipped merely because the stored height is outdated.
 */
export function textLayoutMetrics(item,paragraphs,measure){
 const font=item.fontSize||24,pad=item.type==='note'?14:0;
 const width=Math.max(1,(item.w||1)-pad*2);
 if(!measure){
  const canvas=typeof document!=='undefined'&&typeof document.createElement==='function'
    ?document.createElement('canvas'):null;
  const context=canvas?.getContext?.('2d');
  measure=(text,run)=>{
   if(!context)return Array.from(text).length*font*.55;
   context.font=`${run.italic?'italic':'normal'} ${run.bold?'700':'400'} ${font}px Arial`;
   return context.measureText(text).width;
  };
 }
 const lines=equationLines(paragraphs,width,font,measure);
 const height=Math.ceil(pad*2+lines.reduce((sum,line)=>sum+line.height,0));
 return {font,pad,width,lines,height};
}
export function drawEquationText(item,paragraphs,svgEl){const {font,pad,lines}=textLayoutMetrics(item,paragraphs),g=svgEl('g');let top=pad;for(const line of lines){const source=line.parts.map(r=>r.equation?'':r.text).join('');const firstStrong=source.match(/[\p{Script=Hebrew}\p{Script=Arabic}\p{Script=Latin}]/u)?.[0]||'';const rtl=line.dir==='rtl'||line.dir!=='ltr'&&/[\p{Script=Hebrew}\p{Script=Arabic}]/u.test(firstStrong);let left=line.align==='center'?(item.w-line.width)/2:line.align==='right'||line.align==='auto'&&rtl?item.w-pad-line.width:pad;let cursor=rtl?left+line.width:left;for(const part of line.parts){const x=rtl?cursor-part.w:cursor;if(part.equation){const image=svgEl('image',{href:part.equation.src,x,y:top+line.height-part.h-font*.15,width:part.w,height:part.h,role:'img','aria-label':part.equation.source});const title=svgEl('title');title.textContent=part.equation.source;image.append(title);g.append(image);}else{const text=svgEl('text',{x:rtl?cursor:cursor,y:top+line.height-font*.25,fill:part.color||item.stroke||'#203954','fill-opacity':item.strokeOpacity??1,'font-size':font,'font-family':'Arial, sans-serif','font-weight':part.bold?'700':'400','font-style':part.italic?'italic':'normal','text-decoration':[part.underline?'underline':'',part.strike?'line-through':''].filter(Boolean).join(' ')||'none',direction:(/^[^\p{Script=Latin}\p{Script=Hebrew}\p{Script=Arabic}]*[\p{Script=Hebrew}\p{Script=Arabic}]/u.test(part.text)?'rtl':/^[^\p{Script=Latin}\p{Script=Hebrew}\p{Script=Arabic}]*[\p{Script=Latin}]/u.test(part.text)?'ltr':rtl?'rtl':'ltr'),'unicode-bidi':'isolate','text-anchor':rtl?'end':'start',...(part.fitText?{textLength:part.w,lengthAdjust:'spacingAndGlyphs'}:{}),'xml:space':'preserve'});text.textContent=part.text;g.append(text);}cursor+=rtl?-part.w:part.w;}top+=line.height;}return g;}
