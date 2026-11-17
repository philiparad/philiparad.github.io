// Production-only, fail-closed staging for the offline Tauri 2 calculator.
// CAL-019: never package reference fixtures, archival HTML, or browser tests.
// CAL-022/023: reproducible inventory and source fingerprints for desktop QA.
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const desktop=dirname(fileURLToPath(import.meta.url));
const calculator=resolve(desktop,'..');
const destination=join(desktop,'dist');
const fontName='Roboto-Medium-webfont.woff';
const sourceHtml=await readFile(join(calculator,'index.html'),'utf8');
const sourceCss=await readFile(join(calculator,'styles.css'),'utf8');
const scriptUrls=[...sourceHtml.matchAll(/<script\s+src=["']([^"']+)["'][^>]*><\/script>/gi)]
 .map(match=>match[1].split(/[?#]/)[0]);
if(!scriptUrls.length||!scriptUrls.includes('js/app.js')||
   !scriptUrls.includes('js/display.js')||
   !scriptUrls.includes('js/lcd-enhanced.js'))
 throw Error('Desktop script inventory is missing required calculator modules');
if(new Set(scriptUrls).size!==scriptUrls.length)
 throw Error('Duplicate script included in calculator HTML');
// Explicit source-only runtime dependencies. The capability manifest is the
// only reference/ asset read by app runtime; all other reference files excluded.
const runtimeFiles=[
 'index.html','styles.css',...scriptUrls,
 'js/numeric-worker.js','reference/rea-008/capabilities.json'
];
if(!sourceCss.includes('../fonts/'+fontName))
 throw Error('CAL-009: required local LCD font declaration missing');
if(!sourceHtml.includes('js/url-mode.js')||
   !sourceHtml.includes('id="lcd"')||
   sourceHtml.includes('id="lcd-large"'))
 throw Error('Desktop must contain only the built-in calculator LCD');
for(const rel of runtimeFiles){
 if(!/^(?:index\.html|styles\.css|js\/[a-z0-9-]+\.js|reference\/rea-008\/capabilities\.json)$/.test(rel))
  throw Error('CAL-019 unexpected runtime file: '+rel);
}
await rm(destination,{recursive:true,force:true});
await mkdir(destination,{recursive:true});
const fingerprints={};
const stage=async(rel,src)=>{
 const target=join(destination,rel);
 await mkdir(dirname(target),{recursive:true});
 await cp(src,target);
 const bytes=await readFile(target);
 fingerprints[rel]=createHash('sha256').update(bytes).digest('hex');
};
for(const rel of [...new Set(runtimeFiles)])
 await stage(rel,join(calculator,rel));
const bundledFontRel='fonts/'+fontName;
await stage(bundledFontRel,resolve(calculator,'..','fonts',fontName));
const cssFile=join(destination,'styles.css');
const css=(await readFile(cssFile,'utf8'))
 .replaceAll('../fonts/'+fontName,'./fonts/'+fontName);
if(!css.includes('./fonts/'+fontName))
 throw Error('CAL-009 local font rewrite failed');
await writeFile(cssFile,css,'utf8');
fingerprints['styles.css']=createHash('sha256').update(css).digest('hex');
const manifest={
 schema:'fx991es-plus-desktop-production-v1',
 model:'fx-991ES PLUS (2nd edition)',
 entrypoint:'index.html',
 scriptCount:scriptUrls.length,
 requiredFiles:Object.keys(fingerprints).sort(),
 fingerprints:Object.fromEntries(Object.entries(fingerprints).sort(([a],[b])=>a.localeCompare(b)))
};
await writeFile(join(destination,'production-manifest.json'),
 JSON.stringify(manifest,null,2)+'\n','utf8');
// Keep test-only fixtures out of the installed application.
const blocked=['fx991_fresh_standalone.html','parity-lab.html',
 'reference/rea-006/web-golden.json','visual-fixture.html','tests'];
for(const rel of blocked){
 try{await stat(join(destination,rel));throw Error('Unexpected desktop asset: '+rel)}
 catch(error){if(error.code!=='ENOENT')throw error}
}
console.log('CAL-019 production staging:',manifest.requiredFiles.length,
 'runtime assets + fingerprint manifest;',manifest.scriptCount,'ordered scripts');
