import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

const signature=Buffer.from([137,80,78,71,13,10,26,10]);
const types=['cached','export','difference'];
const escapeHtml=value=>String(value).replace(/[&<>"']/g,ch=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[ch]));

function visualGallery(manifest){
 const columns=types.map(type=>`<span>${type==='cached'?'Editor render':type==='export'?'SVG export':'Pixel difference'}</span>`).join('');
 const scenes=manifest.scenes.map(scene=>{
  const views=types.map(type=>`<figure><img src="${escapeHtml(scene.files[type])}" alt="${escapeHtml(scene.fixture)} – ${type} PNG" loading="lazy"><figcaption>${type==='cached'?'Editor render':type==='export'?'SVG export':'Pixel difference'}</figcaption></figure>`).join('');
  const matched=scene.goldenMatch===true?'Reference hash matched':scene.goldenMatch===false?'Reference mismatch':'Recording mode';
  return `<section class="scene"><h2>${escapeHtml(scene.fixture)}</h2><p>${matched} · Pixel differences: ${scene.changedPixels}</p><div class="images">${views}</div><p class="hash">SHA-256: ${escapeHtml(scene.capturedSha256)}</p></section>`;
 }).join('');
 return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Teaching Board visual review – ${escapeHtml(manifest.engine)}</title>
<style>
:root{font-family:system-ui,Arial,sans-serif;color:#1d2b3e;background:#f0f3f8}
body{max-width:1450px;margin:auto;padding:20px}
h1{margin-bottom:6px}h2{font-size:1.12rem;margin:0}p{color:#44546a}
.scene{background:#fff;border:1px solid #cbd5e1;border-radius:12px;padding:18px;margin:22px 0}
.images{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
figure{margin:0;min-width:0}img{width:100%;height:auto;border:1px solid #dbe1e8;display:block}
figcaption{text-align:center;margin-top:6px;font-weight:600}
.hash{overflow-wrap:anywhere;font-size:.8rem;font-family:monospace}
@media(max-width:760px){.images{grid-template-columns:1fr}}
</style></head><body><h1>Teaching Board visual review – ${escapeHtml(manifest.engine)}</h1>
<p>Inspectable PNG images: cached board, independent SVG export and a difference map.
A reference match is verified using the separately committed raw RGBA SHA-256 fingerprint.</p>
${scenes}</body></html>`;
}

/** Reject malformed or incorrectly sized browser PNGs before publishing artifacts. */
export function decodeVisualPng(dataUrl,width,height){
 if(typeof dataUrl!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(dataUrl))
  throw new Error('Expected a base64 PNG data URL.');
 const bytes=Buffer.from(dataUrl.slice('data:image/png;base64,'.length),'base64');
 if(bytes.length<33||!bytes.subarray(0,8).equals(signature)||
    bytes.toString('ascii',12,16)!=='IHDR')
  throw new Error('Invalid PNG signature or IHDR header.');
 if(bytes.readUInt32BE(16)!==width||bytes.readUInt32BE(20)!==height)
  throw new Error('PNG dimensions do not match the visual test viewport.');
 return bytes;
}

/** Publish independently inspectable PNGs, plus metadata linked to golden hashes. */
export function writeVisualArtifacts(directory,engine,snapshots,findings,{width=720,height=470,expected={}}={}){
 if(!['chromium','firefox','webkit'].includes(engine))throw new Error('Unknown browser engine');
 if(!Array.isArray(snapshots)||!Array.isArray(findings)||
    !snapshots.length||snapshots.length!==findings.length)
  throw new Error('Visual test snapshots and results must match.');
 mkdirSync(directory,{recursive:true});
 const manifest={schemaVersion:1,engine,dimensions:{width,height},scenes:[]};
 for(let index=0;index<snapshots.length;index++){
  const snapshot=snapshots[index],finding=findings[index];
  if(snapshot.name!==finding.name)throw new Error('Visual snapshot and result fixture mismatch.');
  const prefix=`${engine}-${String(index+1).padStart(2,'0')}`;
  const files={};
  // Validate the three encoded PNGs before writing any image for this scene.
  const validated=types.map(type=>({
   type,bytes:decodeVisualPng(snapshot[type],width,height),
   name:`${prefix}-${type}.png`
  }));
  for(const file of validated){
   writeFileSync(join(directory,file.name),file.bytes);
   files[file.type]=file.name;
  }
  manifest.scenes.push({
   fixture:finding.name,files,
   capturedSha256:finding.exportHash,
   expectedSha256:expected[finding.name]??null,
   changedPixels:finding.differentPixels,
   goldenMatch:expected[finding.name]?finding.exportHash===expected[finding.name]:null
  });
 }
 writeFileSync(join(directory,`${engine}-visual-artifacts.json`),JSON.stringify(manifest,null,2)+'\n');
 writeFileSync(join(directory,`${engine}-gallery.html`),visualGallery(manifest));
 return manifest;
}
