/* Enhanced LCD renderer — independent visual layer for structured MathIO.
 * Uses the existing calculator state/editor, never modifies calculations.
 * Non-structured screens and unsupported states retain the legacy renderer.
 */
(function(global){'use strict';
const legacy=global.FreshLCD;
if(!legacy)throw Error('Enhanced LCD requires the legacy raster fallback');
const VIEW_W=96,VIEW_H=31;
const FIELDS={
 fraction:['numerator','denominator'],mixed:['integer','numerator','denominator'],
 squareRoot:['radicand'],cubeRoot:['radicand'],nthRoot:['index','radicand'],
 power:['exponent'],exp10:['exponent'],recurring:['period'],
 logBase:['base','argument'],derivative:['expression','at'],
 integral:['expression','lower','upper'],summation:['expression','lower','upper']
};
const charMetric=Object.freeze({width:4.1,ascent:5.9,descent:1.3});
const padding=1.6;
const measureText=s=>({width:[...String(s)].length*charMetric.width,
 ascent:charMetric.ascent,descent:charMetric.descent});
const empty=()=>({width:5.6,ascent:5.9,descent:1.3,kind:'slot'});
const merge=(nodes)=>nodes.reduce((o,n)=>({
 width:o.width+n.width,ascent:Math.max(o.ascent,n.ascent),
 descent:Math.max(o.descent,n.descent)}),{width:0,ascent:0,descent:0});
function measureNodes(nodes,depth=0){
 if(!Array.isArray(nodes)||depth>24) return empty();
 const boxes=nodes.map(n=>measure(n,depth+1));
 return boxes.length?merge(boxes):empty();
}
function measure(node,depth=0){
 if(!node||typeof node!=='object'||depth>24)return empty();
 if(node.type==='char')return {...measureText(node.value),kind:'char',value:String(node.value)};
 if(!FIELDS[node.type]||!node.parts)return {...measureText('?'),kind:'char',value:'?'};
 const fields={};
 for(const name of FIELDS[node.type])fields[name]=measureNodes(node.parts[name],depth+1);
 const p=fields;
 let box;
 switch(node.type){
  case 'fraction': {
   const span=Math.max(p.numerator.width,p.denominator.width)+2*padding;
   box={width:span,ascent:p.numerator.ascent+p.numerator.descent+3.2,
    descent:p.denominator.ascent+p.denominator.descent+3.2};break;
  }
  case 'mixed':{
   const f=measure({type:'fraction',parts:{numerator:node.parts.numerator,denominator:node.parts.denominator}},depth+1);
   box={width:p.integer.width+2+f.width,ascent:Math.max(p.integer.ascent,f.ascent),
    descent:Math.max(p.integer.descent,f.descent)};break;
  }
  case 'squareRoot':case 'cubeRoot':case 'nthRoot':{
   const index=node.type==='nthRoot'?p.index:null;
   const left=index?Math.max(7,index.width+2):8;
   box={width:left+p.radicand.width+1,ascent:Math.max(9,p.radicand.ascent+4,index?index.ascent+2:0),
    descent:Math.max(3,p.radicand.descent)};break;
  }
  case 'power':box={width:p.exponent.width+1,ascent:p.exponent.ascent+p.exponent.descent+4,descent:2};break;
  case 'exp10':box={width:13+p.exponent.width,ascent:p.exponent.ascent+p.exponent.descent+4,descent:2};break;
  case 'recurring':box={width:p.period.width+1,ascent:p.period.ascent+3,descent:p.period.descent};break;
  case 'logBase':box={width:14+p.base.width+p.argument.width,
   ascent:Math.max(6,p.argument.ascent),descent:Math.max(4,p.base.ascent+p.base.descent)};break;
  case 'integral':case 'summation':{
   const limits=Math.max(p.lower.width,p.upper.width)+3;
   const symbol=Math.max(9,limits);
   box={width:symbol+3+p.expression.width+(node.type==='integral'?8:0),
    ascent:Math.max(11,p.upper.ascent+p.upper.descent+10,p.expression.ascent),
    descent:Math.max(10,p.lower.ascent+p.lower.descent+5,p.expression.descent)};break;
  }
  case 'derivative':box={width:17+p.expression.width+p.at.width,
   ascent:Math.max(10,p.expression.ascent),descent:Math.max(9,p.at.ascent+p.at.descent)};break;
  default:box={width:4,ascent:6,descent:2};
 }
 return {...box,kind:node.type,fields,node};
}
function ink(ctx,state){
 const c=Math.max(0,Math.min(9,Number(state.contrast??5)));
 const low=[110,133,117],high=[7,17,12];
 const t=c/9;
 return 'rgb('+low.map((x,i)=>Math.round(x+(high[i]-x)*t)).join(',')+')';
}
function path(ctx,points){
 ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
 for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
 ctx.stroke();
}
function text(ctx,value,x,baseline){
 ctx.fillText(String(value),x,baseline);
}
function boxSlot(ctx,x,y,w=5.6,h=7.4){
 ctx.strokeRect(x+.5,y-5.7,w-1, h-1);
}
function drawSequence(ctx,nodes,x,y,state,depth=0){
 if(depth>24)return x;
 if(!nodes||!nodes.length){boxSlot(ctx,x,y);return x+empty().width}
 for(const node of nodes){
  const b=measure(node,depth),p=b.fields||{};
  function field(name,xx,yy){drawSequence(ctx,node.parts[name],xx,yy,state,depth+1)}
  switch(b.kind){
   case 'char':text(ctx,b.value,x,y);break;
   case 'fraction':{
    const barY=y-.6,span=b.width;
    field('numerator',x+(span-p.numerator.width)/2,y-4-p.numerator.descent);
    field('denominator',x+(span-p.denominator.width)/2,y+4+p.denominator.ascent);
    path(ctx,[[x,barY],[x+span,barY]]);break;
   }
   case 'mixed':{
    field('integer',x,y);
    const xx=x+p.integer.width+2, span=b.width-p.integer.width-2;
    field('numerator',xx+(span-p.numerator.width)/2,y-4-p.numerator.descent);
    field('denominator',xx+(span-p.denominator.width)/2,y+4+p.denominator.ascent);
    path(ctx,[[xx,y-.6],[xx+span,y-.6]]);break;
   }
   case 'squareRoot':case 'cubeRoot':case 'nthRoot':{
    const left=b.width-p.radicand.width-1,top=y-b.ascent+1.1;
    if(b.kind==='cubeRoot')text(ctx,'3',x,top+3);
    if(b.kind==='nthRoot')field('index',x,top+2.8);
    path(ctx,[[x+left-7,y-1],[x+left-5,y+1.2],
      [x+left-2,top],[x+left,top],[x+b.width,top]]);
    field('radicand',x+left,y);break;
   }
   case 'power':field('exponent',x,y-5.4);break;
   case 'exp10':text(ctx,'×10',x,y);field('exponent',x+13,y-5.4);break;
   case 'recurring':field('period',x,y);
    path(ctx,[[x,y-p.period.ascent-1],[x+p.period.width,y-p.period.ascent-1]]);break;
   case 'logBase':text(ctx,'log',x,y);field('base',x+11,y+3.8);
    field('argument',x+14+p.base.width,y);break;
   case 'derivative':{
    text(ctx,'d',x+3,y-6.5);
    path(ctx,[[x+1,y-3],[x+12,y-3]]);
    text(ctx,'dx',x+1,y+3);
    field('expression',x+17,y);
    const at=x+17+p.expression.width;
    path(ctx,[[at,y-2],[at,y+7]]);
    field('at',at+2,y+7);break;
   }
   case 'integral':case 'summation':{
    const span=Math.max(p.lower.width,p.upper.width)+3,wide=Math.max(9,span);
    const cx=x+wide/2,top=y-10,bottom=y+10;
    if(b.kind==='integral'){
     ctx.beginPath();ctx.moveTo(cx+2,top);ctx.bezierCurveTo(cx-5,top-2,cx+2,bottom+1,cx-4,bottom);ctx.stroke();
    }else{
     path(ctx,[[cx+3,top],[cx-3,top],[cx+2,y],[cx-3,bottom],[cx+3,bottom]]);
    }
    field('upper',x+(wide-p.upper.width)/2,y-12);
    field('lower',x+(wide-p.lower.width)/2,y+12);
    field('expression',x+wide+3,y);
    if(b.kind==='integral')text(ctx,'dx',x+wide+3+p.expression.width,y);
    break;
   }
   default:text(ctx,'?',x,y);
  }
  x+=b.width;
 }
 return x;
}
/* Results previously stayed in the legacy 7x11 bitmap atlas even when the
 * input used vectors. Give short MathIO answers the same crisp typography.
 * Keep legacy output for long/unsupported forms and scroll-sensitive screens.
 */
function resultModel(state){
 if(!state||!state.power||state.screen!=='result'||!state.math)return null;
 if(!['COMP','CMPLX'].includes(state.mode)||state.resultDMS||
    (state.complexResultLines&&state.complexResultLines.length)||
    state.multiStatements||Number(state.viewport?.resultX||0)!==0)return null;
 const chosen=state.resultPresentation?.chosen;
 const kind=chosen?.kind||'decimal';
 const valid=['decimal','surd','pi','fraction','mixed','engineering','recurring'];
 if(!valid.includes(kind))return null;
 const source=String(chosen?.text??state.result??'');
 if(!source||source.length>22||/[\n\r]/.test(source))return null;
 if(kind==='fraction'||kind==='mixed'){
  if(!/^[-+]?\d+$/.test(String(chosen?.numerator))||
     !/^\d+$/.test(String(chosen?.denominator)))return null;
  return {kind,text:source,numerator:String(chosen.numerator),
   denominator:String(chosen.denominator),
   integer:kind==='mixed'?String(chosen.integer||''):''};
 }
 if(kind==='recurring'){
  if(!chosen||!chosen.period)return null;
  return {kind,text:source,initial:String(chosen.initial||''),
   period:String(chosen.period)};
 }
 // A radical is one token with a text coefficient and an integer radicand.
 // Exact symbolic combinations can have multiple radical tokens.
 if(source.includes('√')&&!/^[0-9+\-*/(). π√]+$/.test(source))return null;
 return {kind,text:source};
}
function drawResult(ctx,state){
 const model=resultModel(state);
 if(!model)return false;
 const {kind}=model,baseline=27.1,top=17.3;
 const charW=4.1;
 const segments=[];
 let width=0;
 if(kind==='fraction'||kind==='mixed'){
  const iw=model.integer?measureText(model.integer).width+2:0;
  const span=Math.max(measureText(model.numerator).width,measureText(model.denominator).width)+2;
  width=iw+span;
  segments.push({type:'fraction',width:span,iw});
 }else{
  const t=model.text;
  const token=/√\d+/g;
  let start=0,match;
  while((match=token.exec(t))!==null){
   if(match.index>start){
    const value=t.slice(start,match.index);
    const w=measureText(value).width;
    segments.push({type:'text',value,width:w});width+=w;
   }
   const value=match[0].slice(1);
   const w=8+measureText(value).width;
   segments.push({type:'radical',value,width:w});width+=w;
   start=token.lastIndex;
  }
  if(start<t.length){
   const value=t.slice(start),w=measureText(value).width;
   segments.push({type:'text',value,width:w});width+=w;
  }
 }
 if(width<=0||width>93||!Number.isFinite(width))return false;
 ctx.save();
 ctx.beginPath();ctx.rect(0,top,VIEW_W,VIEW_H-top);ctx.clip();
 ctx.fillStyle='rgb(215,230,215)';
 ctx.fillRect(0,top,VIEW_W,VIEW_H-top);
 ctx.strokeStyle=ink(ctx,state);ctx.fillStyle=ctx.strokeStyle;
 ctx.lineWidth=.44;ctx.lineCap='square';ctx.lineJoin='miter';
 ctx.font='5.8px Consolas, "DejaVu Sans Mono", monospace';
 ctx.textBaseline='alphabetic';
 let x=VIEW_W-width-1.5;
 if(kind==='fraction'||kind==='mixed'){
  const {iw,width:span}=segments[0];
  if(model.integer)text(ctx,model.integer,x,baseline);
  x+=iw;
  text(ctx,model.numerator,x+(span-measureText(model.numerator).width)/2,21.4);
  path(ctx,[[x,24.5],[x+span,24.5]]);
  text(ctx,model.denominator,x+(span-measureText(model.denominator).width)/2,29.4);
 }else if(kind==='recurring'){
  text(ctx,model.text,x,baseline);
  const left=x+measureText(model.initial).width;
  path(ctx,[[left,20],[left+measureText(model.period).width,20]]);
 }else{
  for(const item of segments){
   if(item.type==='text')text(ctx,item.value,x,baseline);
   else{
    const roof=20.1,left=x+7.5;
    path(ctx,[[x+.7,baseline-3.2],[x+2.3,baseline-1.1],
      [x+5.7,roof],[left,roof],[x+item.width-.2,roof]]);
    text(ctx,item.value,left+0.6,baseline);
   }
   x+=item.width;
  }
 }
 ctx.restore();
 return true;
}
function supported(state){
 if(!state||!state.power||!state.editor||!Array.isArray(state.editor.root))return false;
 if(!['edit','result'].includes(state.screen))return false;
 if(!state.math||['STAT','BASE-N','MATRIX','VECTOR'].includes(state.mode))return false;
 return state.editor.root.some(n=>n&&n.type!=='char');
}
function draw(canvas,state){
 const authentic=new URLSearchParams(global.location?.search||'').get('lcd')==='authentic';
 if(!canvas||authentic){legacy.draw(canvas,state);return 'authentic'}
 const structured=supported(state);
 const resultEligible=!!resultModel(state);
 if(!structured&&!resultEligible){legacy.draw(canvas,state);return 'authentic'}
 // First retain the proven LCD raster (status/readouts, results, mode details).
 legacy.draw(canvas,state);
 const ctx=canvas.getContext('2d',{alpha:false});
 if(!ctx)return 'authentic';
 const outputWidth=canvas.width,outputHeight=canvas.height;
 if(!outputWidth||!outputHeight)return 'authentic';
 const sx=outputWidth/VIEW_W,sy=outputHeight/VIEW_H;
 // Redraw short answers separately, even when the editor is plain text.
 // Avoid erasing the result if the structured input cannot be measured.
 if(!structured){ctx.save();ctx.scale(sx,sy);const painted=drawResult(ctx,state);ctx.restore();
  return painted?'enhanced':'authentic'}
 const yTop=0,yBottom=state.screen==='result'?17:state.info?24.3:VIEW_H;
 ctx.save();
 ctx.scale(sx,sy);
 ctx.beginPath();ctx.rect(0,yTop,VIEW_W,yBottom-yTop);ctx.clip();
 ctx.fillStyle='rgb(215,230,215)';
 ctx.fillRect(0,yTop,VIEW_W,yBottom-yTop);
 ctx.lineWidth=.52;
 ctx.lineCap='square';ctx.lineJoin='miter';ctx.strokeStyle=ink(ctx,state);
 ctx.fillStyle=ctx.strokeStyle;
 ctx.font='5.8px Consolas, "DejaVu Sans Mono", monospace';
 ctx.textBaseline='alphabetic';
 const box=measureNodes(state.editor.root),x=-Number(state.viewport?.inputX||0);
 const baseline=state.screen==='result'?7.5:Math.max(box.ascent+1,11)-Number(state.viewport?.inputY||0);
 drawSequence(ctx,state.editor.root,x,baseline,state);
 // A separate caret, following the existing editor's current path where possible.
 // For complex/nested fields the slot itself is the insertion cue.
 if(!state.editor.path.length && state.screen==='edit'){
  const upto=state.editor.root.slice(0,Math.max(0,state.editor.offset||0));
  const cx=x+upto.reduce((sum,n)=>sum+measure(n).width,0);
  path(ctx,[[cx,baseline-6],[cx,baseline+1.2]]);
 }
 ctx.restore();
 if(resultEligible){ctx.save();ctx.scale(sx,sy);drawResult(ctx,state);ctx.restore()}
 return 'enhanced';
}
const api=Object.freeze({draw,supported,measure,measureNodes,resultModel,legacy});
global.FreshEnhancedLCD=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
