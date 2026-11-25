import {exportFilename} from './export-filename.js?v=20261125-variation-toolbar';
import { printPageIndexes } from './print-page-selection.js?v=20261125-variation-toolbar';
import { resolveExport, exportPadding, rasterSize } from './export-scope.js?v=20261125-variation-toolbar';
import { pageSVG } from './pages.js?v=20261125-variation-toolbar';
import { sceneSVG } from './scene.js?v=20261125-variation-toolbar';
import { loadImage } from './media.js?v=20261125-variation-toolbar';
import { serializeBackup } from './model.js?v=20261125-variation-toolbar';
import { download } from './ui.js?v=20261125-variation-toolbar';
import {encodeRasterImage,printSVGDocument} from './export-raster.js?v=20261125-variation-toolbar';
export function backup(board){download(new Blob([serializeBackup(board)],{type:'application/json'}),exportFilename()+'.json');}
export async function exportBoard(board,format,options={scope:'all'}){
 if(format==='json'){backup(board);return;}
 const resolved=resolveExport(board,options);
 board=structuredClone(resolved.board);
 if(format==='pdf'&&board.layout==='a4'&&['all','pages'].includes(options.scope||'all')){
  await printPages(board,resolved.pages);return;
 }
 const transparent=format==='png'&&options.transparent===true;
 const svg=sceneSVG(board,exportPadding(options.padding),resolved.region,{transparent});
 const source=new XMLSerializer().serializeToString(svg);
 if(format==='svg'){
  download(new Blob([source],{type:'image/svg+xml'}),exportFilename()+'.svg');
  return;
 }
 const url=URL.createObjectURL(new Blob([source],{type:'image/svg+xml'}));
 if(format==='png'){
  try{
   const image=await loadImage(url);
   const size=rasterSize(image.width,image.height,options.scale??2);
   const blob=await encodeRasterImage(image,size,{transparent});
   download(blob,exportFilename()+'.png');
  }finally{URL.revokeObjectURL(url);}
  return;
 }
 // Preserve vector precision and avoid allocating a huge PNG / base64 string.
 // Keep the SVG blob URL alive until printing completes; the image in the
 // iframe still needs it after the function returns.
 const frame=document.createElement('iframe');
 frame.title='Printable lesson';
 frame.style.cssText='position:fixed;width:1px;height:1px;right:0;bottom:0;border:0';
 document.body.append(frame);
 let cleaned=false,expiry;
 const cleanup=()=>{
  if(cleaned)return;
  cleaned=true;
  if(expiry!==undefined)clearTimeout(expiry);
  frame.contentWindow?.removeEventListener?.('afterprint',cleanup);
  frame.remove();URL.revokeObjectURL(url);
 };
 try{
  const image=printSVGDocument(frame.contentDocument,url,board.title);
  await image.decode();
  frame.contentWindow?.addEventListener?.('afterprint',cleanup,{once:true});
  // Some print dialogs never dispatch afterprint. Keep a bounded fallback.
  expiry=setTimeout(cleanup,120000);
  frame.contentWindow.focus();
  frame.contentWindow.print();
 }catch(error){cleanup();throw error;}
}

/** Build the exact A4 print document used by the browser and PDF validation. */
export function preparePrintPagesDocument(doc,board,indexes=printPageIndexes(board)){
 doc.open();
 doc.write('<!doctype html><html><head><title></title><style>@page{size:A4 portrait;margin:0}html,body{margin:0}section{width:210mm;height:297mm;break-after:page;overflow:hidden}section:last-child{break-after:auto}svg{display:block;width:100%;height:100%}</style></head><body></body></html>');
 doc.close();
 doc.title=exportFilename();
 for(const n of indexes){
  const section=doc.createElement('section');
  section.setAttribute('aria-label',`A4 page ${n+1}`);
  section.append(doc.importNode(pageSVG(board,n),true));
  doc.body.append(section);
 }
 return doc;
}
export async function printPages(board,indexes=printPageIndexes(board)){
 const frame=document.createElement('iframe');frame.title='Printable A4 lesson';frame.style.cssText='position:fixed;width:1px;height:1px;border:0';document.body.append(frame);
 try{const doc=preparePrintPagesDocument(frame.contentDocument,board,indexes);await Promise.all([...doc.querySelectorAll('image')].map(node=>loadImage(node.getAttribute('href'))));frame.contentWindow.focus();frame.contentWindow.print();setTimeout(()=>frame.remove(),120000);}catch(error){frame.remove();throw error;}
}
