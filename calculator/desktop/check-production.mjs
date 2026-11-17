// CAL-019/021/023: verify that desktop/dist contains only pinned runtime
// resources, unmodified source JavaScript, and a secure offline native config.
import { readdir, readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const desktop=dirname(fileURLToPath(import.meta.url));
const dist=join(desktop,'dist');
const config=JSON.parse(await readFile(join(desktop,'src-tauri','tauri.conf.json'),'utf8'));
const manifest=JSON.parse(await readFile(join(dist,'production-manifest.json'),'utf8'));
const html=await readFile(join(dist,'index.html'),'utf8');
const css=await readFile(join(dist,'styles.css'),'utf8');
const expected=[...html.matchAll(/<script\s+src=["']([^"']+)["'][^>]*><\/script>/gi)]
 .map(match=>match[1].split(/[?#]/)[0]);
const assert=(condition,message)=>{if(!condition)throw Error('CAL-019/021/023: '+message)};
assert(manifest.schema==='fx991es-plus-desktop-production-v1','production manifest schema');
assert(manifest.model==='fx-991ES PLUS (2nd edition)','only supported model');
assert(manifest.scriptCount===expected.length,'script inventory count');
assert(config.build.frontendDist==='../dist','Tauri uses locally staged frontend');
assert(config.app.windows.length===1,'exactly one desktop calculator window');
assert(config.app.windows[0].url==='index.html','desktop loads local root URL');
const csp=config.app.security.csp||{};
assert(csp['default-src']==="'self'",'offline-only CSP default');
assert(csp['script-src']==="'self'",'scripts cannot load remotely');
assert(csp['font-src']==="'self'",'LCD fonts cannot load remotely');
assert(csp['object-src']==="'none'",'object embeds disabled');
assert(csp['frame-src']==="'none'",'iframe embeds disabled');
assert(csp['worker-src']?.includes("'self'"),'local numeric worker permitted');
assert(csp['connect-src']?.includes('ipc:'),'Tauri native IPC remains available');
assert(!Object.values(csp).some(v=>String(v).includes('https://')),
 'CSP must not whitelist remote domains');
assert(!html.includes('id="lcd-large"'),'no detached LCD markup');
assert(html.includes('id="lcd"'),'built-in LCD markup preserved');
assert(css.includes('./fonts/Roboto-Medium-webfont.woff'),'bundled font CSS path');
assert(manifest.requiredFiles.includes('js/numeric-worker.js'),
 'numerical worker packaged');
assert(manifest.requiredFiles.includes('reference/rea-008/capabilities.json'),
 'runtime capability data packaged');
const allowed=new Set([...manifest.requiredFiles,'production-manifest.json']);
const actual=[];
async function walk(directory){
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const absolute=join(directory,entry.name);
  if(entry.isDirectory())await walk(absolute);
  else {
   assert(entry.isFile(),'no symbolic links or special files');
   const rel=relative(dist,absolute).replaceAll('\\','/');
   actual.push(rel);
  }
 }
}
await walk(dist);
assert(actual.length===allowed.size,'unexpected file count: '+actual.length+' vs '+allowed.size);
for(const rel of actual)assert(allowed.has(rel),'unapproved asset '+rel);
for(const rel of manifest.requiredFiles){
 const bytes=await readFile(join(dist,rel));
 const hash=createHash('sha256').update(bytes).digest('hex');
 assert(hash===manifest.fingerprints[rel],'stale or tampered staged asset '+rel);
 if(rel.startsWith('js/')){
  const canonical=await readFile(join(desktop,'..',rel));
  assert(canonical.equals(bytes),'desktop JavaScript diverged from web source '+rel);
 }
}
for(const rel of expected)assert(allowed.has(rel),'missing HTML script '+rel);
const sourceHtml=await readFile(join(desktop,'..','index.html'));
assert(sourceHtml.equals(await readFile(join(dist,'index.html'))),
 'desktop index is out of date');
console.log('PASS CAL-019/021/023: '+manifest.scriptCount+
 ' ordered scripts, '+manifest.requiredFiles.length+
 ' pinned offline assets; no archival files; secure CSP; current calculator sources');
