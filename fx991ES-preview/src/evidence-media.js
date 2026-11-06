/* Local-only evidence file fingerprinting. Does not authenticate a CASIO device. */
(function(global){'use strict';
const MAX_BYTES=12*1024*1024;
const ACCEPTED=Object.freeze(['image/png','image/jpeg','image/webp']);
function insist(ok,msg){if(!ok)throw Error('Evidence media: '+msg)}
function signature(bytes){
 if(bytes.length>=8 && bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71&&bytes[4]===13&&bytes[5]===10&&bytes[6]===26&&bytes[7]===10)return 'image/png';
 if(bytes.length>=4 && bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 if(bytes.length>=12 && String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&
  String.fromCharCode(...bytes.slice(8,12))==='WEBP')return 'image/webp';
 return null;
}
function validateDescriptor(obj){
 insist(obj!==null&&typeof obj==='object'&&!Array.isArray(obj),'descriptor must be an object');
 insist(typeof obj.fileName==='string'&&obj.fileName.length>0&&obj.fileName.length<=240&&
   !/[<>\\/\x00-\x1f]/.test(obj.fileName),'invalid filename');
 insist(ACCEPTED.includes(obj.mediaType),'unsupported image media type');
 insist(Number.isInteger(obj.bytes)&&obj.bytes>=8&&obj.bytes<=MAX_BYTES,'invalid image size');
 insist(typeof obj.sha256==='string'&&/^[0-9a-f]{64}$/.test(obj.sha256),'SHA-256 must be lower-case hex');
 insist(obj.reviewStatus==='unreviewed','photo evidence cannot self-certify');
 insist(obj.hashAlgorithm==='SHA-256','unexpected hash algorithm');
 return JSON.parse(JSON.stringify(obj));
}
async function fromFile(file){
 insist(file&&typeof file.arrayBuffer==='function','select a local image file');
 insist(Number.isInteger(file.size)&&file.size>=8&&file.size<=MAX_BYTES,'file is empty or exceeds 12 MiB');
 insist(ACCEPTED.includes(file.type),'select PNG, JPEG, or WebP');
 const bytes=new Uint8Array(await file.arrayBuffer());
 insist(signature(bytes)===file.type,'file contents do not match declared image format');
 insist(global.crypto?.subtle?.digest,'secure browser SHA-256 unavailable');
 const digest=await global.crypto.subtle.digest('SHA-256',bytes);
 const sha256=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 return validateDescriptor({fileName:file.name,mediaType:file.type,bytes:bytes.length,
   sha256,hashAlgorithm:'SHA-256',reviewStatus:'unreviewed'});
}
global.FX991_EVIDENCE_MEDIA=Object.freeze({MAX_BYTES,ACCEPTED,signature,validateDescriptor,fromFile});
})(typeof window!=='undefined'?window:globalThis);
