import {TEXT_FONT_FAMILY} from './text-font.js?v=20261119-perf009';
import {textMeasurer} from './text-measure.js?v=20261119-perf009';
export function validateInlineEquation(eq){if(!eq||typeof eq.source!=='string'||!eq.source.trim()||eq.source.length>2000||typeof eq.src!=='string'||!/^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(eq.src)||eq.src.length>2000000||![eq.w,eq.h].every(n=>Number.isFinite(n)&&n>0&&n<=2000))throw new Error('Invalid inline equation.');}
export function equationSize(eq,font,width=Infinity){let h=Math.min(font*3,Math.max(font,eq.h*font/30)),w=h*eq.w/eq.h;if(w>width){h*=width/w;w=width;}return {w,h};}
export function equationContentWidth(item){return Number.isFinite(item?.w)?Math.max(1,item.w-(item.type==='note'?28:0)):Infinity;}
export function equationNode(eq,font,width=Infinity){validateInlineEquation(eq);const span=document.createElement('span'),img=document.createElement('img');span.contentEditable='false';span.dataset.equation=JSON.stringify(eq);span.className='inline-equation';span.title='Double-click or press Enter to edit equation';span.tabIndex=0;span.setAttribute('role','math');span.setAttribute('aria-description','Press Enter or Space to edit. Use Left or Right to move the caret; Shift plus an arrow selects the equation.');span.setAttribute('aria-keyshortcuts','Enter Space ArrowLeft ArrowRight Shift+ArrowLeft Shift+ArrowRight');span.setAttribute('aria-label','Math equation: '+eq.source);img.src=eq.src;img.alt=eq.source;img.setAttribute('aria-hidden','true');const size=equationSize(eq,font,width);img.style.width=size.w+'px';img.style.height=size.h+'px';span.append(img);return span;}
// One grapheme segmenter for all tokens; do not instantiate it per word.
const graphemeSegmenter=typeof Intl!=='undefined'&&typeof Intl.Segmenter==='function'
 ?new Intl.Segmenter(undefined,{granularity:'grapheme'}):null;
/** Layout using measured text widths, reserving actual equation space. */
export function equationLines(paragraphs,width,font,measure){
 const lines=[];let number=0;const limit=Math.max(1,width);let sourceOffset=0;
 const graphemes=text=>graphemeSegmenter
   ?[...graphemeSegmenter.segment(text)].map(s=>s.segment)
   :Array.from(text);
 for(const [paragraphIndex,p] of paragraphs.entries()){
  number=p.list==='number'?(p.numberStart??number+1):0;
  const marker=p.list==='bullet'?'• ':p.list==='number'?number+'. ':'';
  let parts=[],used=0,height=font*1.3,lineStart=sourceOffset,lineLength=0;
  const flush=()=>{lines.push({parts,width:used,height,align:p.align,dir:p.dir||'auto',paragraphIndex,sourceStart:lineStart,sourceEnd:lineStart+lineLength});lineStart+=lineLength;lineLength=0;parts=[];used=0;height=font*1.3;};
  const add=(text,run,w,h)=>{
   const fitted=Math.min(w,limit);
   if(used&&used+fitted>limit)flush();
   parts.push({...run,text,w:fitted,h,...(w>limit&&!run.equation?{fitText:true}:{})});if(!run.synthetic)lineLength+=text.length;used+=fitted;height=Math.max(height,run.equation?h+font*.25:h);
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
 const width=equationContentWidth(item);
 if(!measure)measure=textMeasurer(font);
 const lines=equationLines(paragraphs,width,font,measure);
 const height=Math.ceil(pad*2+lines.reduce((sum,line)=>sum+line.height,0));
 return {font,pad,width,lines,height};
}
/**
 * SVG text-anchor is relative to the token's direction, not the containing
 * paragraph. RTL script with text-anchor="end" grows to the RIGHT of x,
 * so it overflows right-aligned Hebrew lines. Keep the token's visual extent
 * on the cursor's intended side for both right-to-left and left-to-right runs.
 */
export function tokenTextAnchor(lineRtl,tokenDir){
 return lineRtl?(tokenDir==='rtl'?'start':'end'):(tokenDir==='rtl'?'end':'start');
}
/** Resolve auto direction from the complete logical paragraph, not from
 * separately wrapped visual lines. This mirrors contenteditable dir="auto".
 * Inline equation images are neutral and must not affect the first strong
 * character. Explicit paragraph directions always win. */
/**
 * The Unicode bidirectional algorithm treats the first strong character as
 * LTR or RTL. Greek mathematical letters, Cyrillic, CJK, etc. are LTR,
 * not invisible while searching for a later Hebrew word.
 *
 * Letters from the principal RTL scripts are right-to-left. Other letters
 * are left-to-right. Numbers, punctuation and inline equation images are
 * direction-neutral for the first-strong-letter decision.
 */
const RTL_LETTER=/[\p{Script=Hebrew}\p{Script=Arabic}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Samaritan}\p{Script=Mandaic}\p{Script=Adlam}\p{Script=Hanifi_Rohingya}\p{Script=Yezidi}]/u;
export function firstStrongTextDirection(source,fallback='ltr'){
 const firstStrong=source.match(/\p{Letter}/u)?.[0];
 return firstStrong?(RTL_LETTER.test(firstStrong)?'rtl':'ltr'):fallback;
}
export function paragraphDirectionIsRtl(paragraph){
 if(paragraph?.dir==='rtl')return true;
 if(paragraph?.dir==='ltr')return false;
 const source=(paragraph?.runs||[]).map(run=>run.equation?'':run.text||'').join('');
 return firstStrongTextDirection(source)==='rtl';
}
export function drawEquationText(item,paragraphs,svgEl){const {font,pad,lines}=textLayoutMetrics(item,paragraphs),g=svgEl('g');const paragraphDirections=paragraphs.map(paragraphDirectionIsRtl);let top=pad;for(const line of lines){const rtl=paragraphDirections[line.paragraphIndex]??false;let left=line.align==='center'?(item.w-line.width)/2:line.align==='right'||line.align==='auto'&&rtl?item.w-pad-line.width:pad;let cursor=rtl?left+line.width:left;for(const part of line.parts){const x=rtl?cursor-part.w:cursor;if(part.equation){const image=svgEl('image',{href:part.equation.src,x,y:top+line.height-part.h-font*.25,width:part.w,height:part.h,role:'img','aria-label':part.equation.source});const title=svgEl('title');title.textContent=part.equation.source;image.append(title);g.append(image);}else{const tokenDir=firstStrongTextDirection(part.text,rtl?'rtl':'ltr');const text=svgEl('text',{x:cursor,y:top+line.height-font*.25,fill:part.color||item.stroke||'#203954','fill-opacity':item.strokeOpacity??1,'font-size':font,'font-family':TEXT_FONT_FAMILY,'font-weight':part.bold?'700':'400','font-style':part.italic?'italic':'normal','text-decoration':[part.underline?'underline':'',part.strike?'line-through':''].filter(Boolean).join(' ')||'none',direction:tokenDir,'unicode-bidi':'isolate','text-anchor':tokenTextAnchor(rtl,tokenDir),...(part.fitText?{textLength:part.w,lengthAdjust:'spacingAndGlyphs'}:{}),'xml:space':'preserve'});text.textContent=part.text;g.append(text);}cursor+=rtl?-part.w:part.w;}top+=line.height;}return g;}
