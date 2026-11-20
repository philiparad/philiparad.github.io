/**
 * PERF-017: asynchronously encode large raster exports without base64 copies.
 * Prefer OffscreenCanvas, but retain a compatible HTML canvas fallback.
 * Always release the large backing buffer, even when encoding fails.
 */
export async function encodeRasterImage(image,size,{transparent=false}={}){
 const width=size.width,height=size.height;
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||
    width<1||height<1)throw new Error('Invalid raster export dimensions.');
 const canvas=typeof OffscreenCanvas==='function'
  ?new OffscreenCanvas(width,height):document.createElement('canvas');
 if(!(typeof OffscreenCanvas==='function'&&canvas instanceof OffscreenCanvas)){
  canvas.width=width;canvas.height=height;
 }
 try{
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Canvas rendering is unavailable.');
  if(!transparent){
   ctx.fillStyle='#fff';
   ctx.fillRect(0,0,width,height);
  }
  ctx.drawImage(image,0,0,width,height);
  let blob;
  if(typeof canvas.convertToBlob==='function')
   blob=await canvas.convertToBlob({type:'image/png'});
  else if(typeof canvas.toBlob==='function')
   blob=await new Promise((resolve,reject)=>{
    try{canvas.toBlob(resolve,'image/png');}catch(error){reject(error);}
   });
  else throw new Error('PNG encoding is unavailable.');
  if(!blob)throw new Error('Could not create PNG.');
  return blob;
 }finally{
  // Releasing buffers prevents repeated exports from retaining large surfaces.
  canvas.width=0;canvas.height=0;
 }
}

/** Print the source SVG directly: no intermediate PNG or base64 encoding. */
export function printSVGDocument(doc,sourceURL,title){
 doc.open();
 doc.write('<!doctype html><html><head><title></title><style>@page{size:A4 landscape;margin:10mm}body{margin:0}img{width:100%;height:185mm;object-fit:contain}h1{font:16px Arial;margin:0 0 4mm}</style></head><body></body></html>');
 doc.close();
 doc.title=title;
 const heading=doc.createElement('h1');
 heading.textContent=title;
 const image=doc.createElement('img');
 image.alt=title;
 image.src=sourceURL;
 doc.body.append(heading,image);
 return image;
}
