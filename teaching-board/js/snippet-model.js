import { createBoard, validateBoard } from './model.js?v=20261006-text-align';
import { copiedItems } from './groups.js?v=20261006-text-align';
import { syncConnectors } from './connectors.js?v=20261006-text-align';
import { union } from './scene.js?v=20261006-text-align';
const LIMIT=5_000_000;
export function validateSnippet(value){
 if(!value||value.version!==1||typeof value.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(value.id))throw new Error('Unsupported snippet format.');
 if(typeof value.title!=='string'||!value.title.trim()||value.title.length>100)throw new Error('Use a snippet name from 1 to 100 characters.');
 if(typeof value.deleted!=='boolean'||!Number.isFinite(Date.parse(value.updatedAt)))throw new Error('Invalid snippet metadata.');
 if(!Array.isArray(value.items)||!value.items.length||value.items.length>1000)throw new Error('A snippet must contain 1 to 1,000 objects.');
 if(JSON.stringify(value).length>LIMIT)throw new Error('This snippet exceeds the 5 MB limit.');
 const items=validateBoard({...createBoard(),items:value.items}).items;
 // Imported snippets cannot retain links to objects outside the snippet.
 syncConnectors(items);
 return {version:1,id:value.id,title:value.title.trim(),deleted:value.deleted,updatedAt:value.updatedAt,items};
}
export function createSnippet(title,items){
 return validateSnippet({version:1,id:crypto.randomUUID(),title,items:copiedItems(items),deleted:false,updatedAt:new Date().toISOString()});
}
export function snippetCopies(value,position){
 const items=copiedItems(validateSnippet(value).items),box=union(items);
 const dx=position.x-box.x-box.w/2,dy=position.y-box.y-box.h/2;
 for(const i of items){i.x+=dx;i.y+=dy;}syncConnectors(items);return items;
}
export function serializeSnippet(value){return JSON.stringify({format:'teaching-board-snippet',version:1,snippet:validateSnippet(value)});}
export function parseSnippet(source){
 if(source.length>LIMIT+200)throw new Error('Snippet file exceeds the 5 MB limit.');
 const data=JSON.parse(source);if(data?.format!=='teaching-board-snippet'||data.version!==1)throw new Error('Choose an exported Teaching Board snippet.');
 const value=validateSnippet(data.snippet);return createSnippet(value.title,value.items);
}
