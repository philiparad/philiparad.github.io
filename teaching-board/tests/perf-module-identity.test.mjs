// PERF-005: fail CI when a local module is imported under multiple URLs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root=new URL('../js/',import.meta.url);
const html=new URL('../index.html',import.meta.url);
const source=readFileSync(html,'utf8');
const entry=/\bsrc=["']\.\/js\/app\.js\?v=([^"'&]+)["']/.exec(source);
const importPattern=/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)["'](\.[^"'\r\n]+)["']/g;

test('PERF-005 every application module uses one canonical, release-versioned URL',()=>{
 assert.ok(entry,'The HTML entrypoint must declare the deployment version');
 const version=entry[1],urls=new Map();
 let imports=0,files=0;
 for(const name of readdirSync(root).filter(name=>name.endsWith('.js'))){
  files++;
  const base=new URL(name,root),content=readFileSync(base,'utf8');
  for(const match of content.matchAll(importPattern)){
   const target=new URL(match[1],base);
   if(!target.pathname.endsWith('.js'))continue;
   imports++;
   assert.ok(existsSync(fileURLToPath(target)),name+' imports a missing module '+match[1]);
   assert.equal(target.search,'?v='+version,name+' imports '+match[1]+' using an inconsistent release version');
   const path=fileURLToPath(target);
   if(urls.has(path))assert.equal(urls.get(path),target.href,name+' gives '+path+' a second module identity');
   else urls.set(path,target.href);
  }
 }
 assert.ok(files>=80,'The full Teaching Board module tree must be inspected');
 assert.ok(imports>=200,'The audit must inspect all application dependency imports');
 assert.ok(urls.size>=55,'The audit must resolve the full dependency graph');
});
