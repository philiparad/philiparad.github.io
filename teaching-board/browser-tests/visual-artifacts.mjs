import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

const signature=Buffer.from([137,80,78,71,13,10,26,10]);
const types=['cached','export','difference'];

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
 return manifest;
}
