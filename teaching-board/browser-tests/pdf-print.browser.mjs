import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';

const base=process.env.TEACHING_BOARD_URL||'http://127.0.0.1:8765/teaching-board/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const workspace=mkdtempSync(join(tmpdir(),'teaching-board-pdf-'));
try {
 const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});
 const pageErrors=[];
 page.on('pageerror',error=>pageErrors.push(error.message));
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
 await page.locator('#app[aria-busy="false"]').waitFor({timeout:30000});

 // Use the precise print document the application sends to its print iframe:
 // no parallel PDF fixture template or reimplemented SVG renderer.
 const printed=await page.evaluate(async()=>{
  const {A4}=await import('./js/pages.js');
  const {preparePrintPagesDocument}=await import('./js/export.js');
  const {createBoard,validateBoard}=await import('./js/model.js');
  const step=A4.h+A4.gap;
  const equation={source:'x^2+1=10',
   src:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRrQAAAAASUVORK5CYII=',
   w:95,h:40};
  const firstText='First page English עברית '+String.fromCharCode(0xfffc);
  const secondText='Second page שלום with mathematics';
  const board={
   ...createBoard('Two-page A4 PDF export regression'),
   background:'plain',layout:'a4',pageCount:2,
   items:[
    {id:'first-color',type:'rectangle',x:44,y:50,w:245,h:132,
     fill:'#c82121',stroke:'#c82121',lineWidth:1},
    {id:'first-text',type:'text',x:48,y:225,w:550,h:75,fontSize:30,
     text:firstText,
     runs:[{text:'First page English ',bold:true},
           {text:'עברית ',color:'#203954'},
           {text:'\uFFFC',equation}],
     paragraphs:[{align:'left',list:'none',dir:'ltr'}]},
    {id:'second-color',type:'rectangle',x:44,y:step+50,w:245,h:132,
     fill:'#1852cb',stroke:'#1852cb',lineWidth:1},
    {id:'second-text',type:'text',x:48,y:step+225,w:550,h:75,fontSize:30,
     text:secondText,
     paragraphs:[{align:'right',list:'number',dir:'rtl',numberStart:7}]}
   ]
  };
  validateBoard(board);
  const before=JSON.stringify(board);
  const printDocument=document.implementation.createHTMLDocument('PDF comparison');
  preparePrintPagesDocument(printDocument,board,[0,1]);
  const sections=[...printDocument.querySelectorAll('section')];
  if(sections.length!==2)throw Error('A4 printer failed to create exactly two sections.');
  const shapes=sections.map(section=>({
   name:section.getAttribute('aria-label'),
   svgCount:section.querySelectorAll('svg').length,
   textCount:section.querySelectorAll('text').length,
   imageCount:section.querySelectorAll('image').length
  }));
  if(JSON.stringify(board)!==before)throw Error('Preparing PDF mutated the lesson.');
  return {
   html:'<!doctype html>'+printDocument.documentElement.outerHTML,
   sections:shapes,width:A4.w,height:A4.h
  };
 });
 assert.equal(printed.sections.length,2);
 assert(printed.sections.every(s=>s.svgCount>=1&&s.textCount>=2));
 assert.equal(printed.sections[0].imageCount,1);

 const print=await browser.newPage({viewport:{width:1280,height:1000}});
 await print.setContent(printed.html,{waitUntil:'load'});
 await print.evaluate(()=>document.fonts.ready);
 const pdf=await print.pdf({printBackground:true,preferCSSPageSize:true,format:'A4'});
 assert(pdf.length>5000,'The generated PDF is unexpectedly small.');
 const path=join(workspace,'lesson.pdf');
 writeFileSync(path,pdf);

 const info=execFileSync('pdfinfo',[path],{encoding:'utf8',timeout:30000});
 const pages=Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
 assert.equal(pages,2,'A4 printer generated an unexpected page count:\n'+info);
 const pageSize=info.match(/Page size:\s+([\\d.]+) x ([\\d.]+) pts/);
 assert(pageSize&&Math.abs(Number(pageSize[1])-595.28)<1&&Math.abs(Number(pageSize[2])-841.89)<1,
  'PDF page is not portrait A4: '+info);

 const prefix=join(workspace,'print');
 execFileSync('pdftoppm',['-f','1','-l','2','-r','96','-png',path,prefix],{timeout:60000});
 const files=readdirSync(workspace).filter(name=>/^print-\d+\.png$/.test(name)).sort();
 assert.equal(files.length,2,'PDF rasterization should produce two page images.');
 const images=files.map(file=>readFileSync(join(workspace,file)).toString('base64'));
 const metrics=await page.evaluate(async pngs=>{
  const results=[];
  for(const b64 of pngs){
   const img=new Image();
   img.src='data:image/png;base64,'+b64;
   await img.decode();
   const canvas=document.createElement('canvas');
   canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});
   ctx.drawImage(img,0,0);
   const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
   let red=0,blue=0,dark=0;
   for(let i=0;i<data.length;i+=4){
    const r=data[i],g=data[i+1],b=data[i+2];
    if(r>155&&g<85&&b<85)red++;
    if(b>125&&r<75&&g<125)blue++;
    if(r<125&&g<125&&b<125)dark++;
   }
   results.push({width:canvas.width,height:canvas.height,red,blue,dark});
  }
  return results;
 },images);
 const [first,second]=metrics;
 for(const result of metrics){
  assert(Math.abs(result.width-printed.width)<=2,'PDF raster has wrong A4 width');
  assert(Math.abs(result.height-printed.height)<=2,'PDF raster has wrong A4 height');
  assert(result.dark>100,'Page is missing visible text.');
 }
 assert(first.red>9000,'First PDF page lost the red reference object.');
 assert(first.blue<100,'Second-page blue object leaked onto page one.');
 assert(second.blue>9000,'Second PDF page lost the blue reference object.');
 assert(second.red<100,'First-page red object leaked onto page two.');
 assert.deepEqual(pageErrors,[]);
 console.log('PASS Chromium A4 print→PDF→Poppler raster: '+JSON.stringify({
  pages,bytes:pdf.length,sections:printed.sections,raster:metrics
 }));
}finally{
 await browser.close();
 rmSync(workspace,{recursive:true,force:true});
}
