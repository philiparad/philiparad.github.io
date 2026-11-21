import {graphAxisOptions,appendAxisLabels} from './graph-axes.js?v=20261121-tables';
import {compileFunctions} from './named-functions.js?v=20261121-tables';
import {endpointMarkers} from './graph-endpoints.js?v=20261121-tables';
import { choosePDFPages, renderPDFPages, layoutPDFPages } from './pdf-pages.js?v=20261121-tables';
import { graphSeries, piecewiseRows, functionPlotBounds, compileSeries, seriesLabels, curveAppearance, CURVE_STYLES } from './graph-series.js?v=20261121-tables';
export { graphSeries } from './graph-series.js?v=20261121-tables';
const loaders=new Map();
export function script(url){if(!loaders.has(url))loaders.set(url,new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.onload=resolve;s.onerror=()=>{s.remove();loaders.delete(url);reject(new Error('Could not load the teaching library. Check your internet connection and retry.'));};document.head.append(s);}));return loaders.get(url);}
export function dataURL(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob);});}
export function loadImage(src){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Image could not be decoded.'));image.src=src;});}
export async function rasterSVG(svg,width,height,pixelScale=2){const source=new XMLSerializer().serializeToString(svg),url=URL.createObjectURL(new Blob([source],{type:'image/svg+xml'}));try{const image=await loadImage(url),canvas=document.createElement('canvas');canvas.width=Math.ceil(width*pixelScale);canvas.height=Math.ceil(height*pixelScale);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/png');}finally{URL.revokeObjectURL(url);}}
export async function equation(source){if(!source.trim()||source.length>2000)throw new Error('Enter a LaTeX expression (up to 2,000 characters).');if(!window.MathJax?.tex2svgPromise){window.MathJax={loader:{load:['ui/safe']},svg:{fontCache:'none'},options:{enableMenu:false}};await script('https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-svg.js');await window.MathJax.startup.promise;}
 const node=await MathJax.tex2svgPromise(source,{display:true});if(node.querySelector('[data-mml-node="merror"]'))throw new Error('Check the LaTeX expression.');const svg=node.querySelector('svg');const vb=svg.getAttribute('viewBox').split(/\s+/).map(Number);const h=Math.min(350,Math.max(45,vb[3]/40)),w=Math.min(1800,Math.max(60,h*vb[2]/vb[3]));svg.setAttribute('xmlns','http://www.w3.org/2000/svg');svg.setAttribute('width',w);svg.setAttribute('height',h);svg.style.color='#172c45';return {src:await rasterSVG(svg,w,h),w,h,source};}
export async function graph(source,range,parameters=[],definitions=[],axes={},renderOptions={}){axes=structuredClone(axes);const options=graphAxisOptions(range,axes),plotRange=options.boundingbox;parameters=structuredClone(parameters);definitions=structuredClone(definitions);const series=graphSeries(source,parameters,definitions),constants=Object.fromEntries(parameters.map(p=>[p.name,p.value])),functions=compileFunctions(definitions,constants);await script('https://cdn.jsdelivr.net/npm/jsxgraph@1.11.1/distrib/jsxgraphcore.js');
 const host=document.createElement('div');host.id='graph-'+crypto.randomUUID();host.style.cssText='position:fixed;left:-10000px;top:0;width:640px;height:440px;direction:ltr;background:white';document.body.append(host);let board;try{board=JXG.JSXGraph.initBoard(host.id,options);for(const row of series.flatMap(piecewiseRows)){if(row.visible===false)continue;const fn=compileSeries(row,constants,functions),ordinary=!['parametric','polar'].includes(row.kind),bounds=ordinary?functionPlotBounds(row,plotRange):null;if(ordinary&&!bounds)continue;board.create(['parametric','polar'].includes(row.kind)?'curve':'functiongraph',['parametric','polar'].includes(row.kind)?[fn.x,fn.y,row.tmin,row.tmax]:[fn.y,...bounds],curveAppearance(row));}const markers=series.filter(r=>r.visible!==false).flatMap(piecewiseRows).filter(r=>!['parametric','polar'].includes(r.kind)).flatMap(r=>endpointMarkers(r,constants,plotRange,functions));markers.sort((a,b)=>Number(b.open)-Number(a.open));for(const point of markers)board.create('point',[point.x,point.y],{name:'',size:3,strokeWidth:2,strokeColor:point.color,fillColor:point.open?'#ffffff':point.color,fixed:true,withLabel:false,highlight:false});board.fullUpdate();const svg=host.querySelector('svg').cloneNode(true),visible=series.filter(r=>r.visible!==false).flatMap(r=>seriesLabels(r).map(label=>({label,color:r.color,lineStyle:r.lineStyle,lineWidth:r.lineWidth}))),height=440+(visible.length+definitions.length+(parameters.length?1:0))*24;appendAxisLabels(svg,axes);svg.querySelectorAll('foreignObject').forEach(node=>node.remove());svg.setAttribute('xmlns','http://www.w3.org/2000/svg');svg.setAttribute('width','640');svg.setAttribute('height',height);svg.setAttribute('viewBox',`0 0 640 ${height}`);for(const d of definitions)visible.push({label:`${d.name}(x) = ${d.source}`,color:'#414d62'});if(parameters.length)visible.push({label:parameters.map(p=>`${p.name} = ${p.value}`).join('; '),color:'#414d62'});visible.forEach((row,k)=>{const text=document.createElementNS('http://www.w3.org/2000/svg','text');if(row.lineStyle!==undefined||row.lineWidth!==undefined){const sample=document.createElementNS('http://www.w3.org/2000/svg','line');for(const [key,value]of Object.entries({x1:12,x2:48,y1:455+k*24,y2:455+k*24,stroke:row.color,'stroke-width':row.lineWidth??3,'stroke-dasharray':CURVE_STYLES[row.lineStyle||'solid'].pattern||'none'}))sample.setAttribute(key,value);svg.append(sample);}text.setAttribute('x',row.lineStyle!==undefined||row.lineWidth!==undefined?58:12);text.setAttribute('y',460+k*24);text.setAttribute('fill',row.color);text.setAttribute('font-size',15);text.setAttribute('font-family','Arial');text.textContent=row.label;svg.append(text);});return {src:await rasterSVG(svg,640,height,renderOptions.preview?1:2),w:640,h:height,source:series.map(r=>r.source).join('; '),series,range,parameters,definitions,axes};}finally{if(board)JXG.JSXGraph.freeBoard(board);host.remove();}}
// PERF-010: retain already-compressed source bytes when no resizing is needed.
// For large photos, encode the resized canvas in its original lossy format
// instead of expanding JPEG/WebP into a much larger PNG. GIF is still flattened
// to PNG because the editable board supports static PNG, JPEG and WebP only.
export function importedImageEncoding(type,needsResize){
 if(!needsResize&&['image/png','image/jpeg','image/webp'].includes(type))return 'original';
 if(type==='image/jpeg'||type==='image/webp')return type;
 return 'image/png';
}
export async function importImage(file){
 if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)||
    file.size>15_000_000)throw new Error('Choose PNG, JPEG, WebP or GIF under 15 MB.');
 // Decode directly from the Blob URL, not a base64 string, so large originals
 // are never converted to data URLs before we know a downscale is necessary.
 const url=URL.createObjectURL(file);
 try{
  const image=await loadImage(url);
  const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height;
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)
   throw new Error('Image has invalid dimensions.');
  const scale=Math.min(1,2200/Math.max(width,height));
  const resizedWidth=Math.max(1,Math.round(width*scale));
  const resizedHeight=Math.max(1,Math.round(height*scale));
  const encoding=importedImageEncoding(file.type,scale<1);
  let src;
  if(encoding==='original')src=await dataURL(file);
  else{
   const canvas=document.createElement('canvas');
   try{
    canvas.width=resizedWidth;canvas.height=resizedHeight;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('Could not prepare image canvas.');
    ctx.drawImage(image,0,0,resizedWidth,resizedHeight);
    src=canvas.toDataURL(encoding,encoding==='image/png'?undefined:.88);
    // Some engines silently return PNG when a requested codec is unavailable.
    // That remains a valid, self-contained board image.
   }finally{canvas.width=0;canvas.height=0;}
  }
  return {src,w:Math.min(800,resizedWidth),
   h:Math.min(800,resizedWidth)*resizedHeight/resizedWidth};
 }finally{URL.revokeObjectURL(url);}
}
export async function importPDF(file,progress=()=>{},selectPages=choosePDFPages){if(file.size>30_000_000)throw new Error('Choose a PDF under 30 MB.');const pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';const loading=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false});try{const pdf=await loading.promise,selection=await selectPages(pdf);if(selection===null)return null;const pages=await renderPDFPages(pdf,selection.pages,progress);return {images:selection.layout==='a4'?pages:layoutPDFPages(pages,selection.layout),layout:selection.layout};}finally{await loading.destroy();}}
