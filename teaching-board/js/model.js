import { validCrop } from './crop-editor.js?v=20260928-feature6';
export const SCHEMA_VERSION = 1;
export const ITEM_TYPES = new Set(['curve', 'arc', 'path', 'line', 'arrow', 'rectangle', 'ellipse', 'triangle', 'polygon', 'text', 'note', 'equation', 'graph', 'image']);
export function createBoard(title = 'Untitled lesson') {
  const now = new Date().toISOString();
  return { schemaVersion: SCHEMA_VERSION, id: crypto.randomUUID(), title: title.trim() || 'Untitled lesson', folder: '', createdAt: now, updatedAt: now, revision: 0, deleted: false, viewport: { x: 0, y: 0, zoom: 1 }, background: 'grid', items: [] };
}
export function validateBoard(value) {
  if (!value || value.schemaVersion !== SCHEMA_VERSION) throw new Error('Unsupported board format.');
  if (typeof value.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(value.id)) throw new Error('Invalid board ID.');
  if (typeof value.title !== 'string' || value.title.length > 200 || typeof value.folder !== 'string' || value.folder.length > 200) throw new Error('Invalid board title or folder.');
  if (!Number.isInteger(value.revision) || value.revision < 0 || typeof value.deleted !== 'boolean') throw new Error('Invalid board revision.');
  if (!Number.isFinite(Date.parse(value.createdAt)) || !Number.isFinite(Date.parse(value.updatedAt))) throw new Error('Invalid board dates.');
  if (!['grid', 'dots', 'plain', 'ruled', 'dark'].includes(value.background)) throw new Error('Invalid background.');
  if(value.snapMode!==undefined&&!['off','grid','objects','both'].includes(value.snapMode))throw new Error('Invalid snapping mode.');
  const v = value.viewport;
  if (!v || ![v.x, v.y, v.zoom].every(Number.isFinite) || v.zoom < .1 || v.zoom > 8) throw new Error('Invalid viewport.');
  if (!Array.isArray(value.items) || value.items.length > 20000) throw new Error('Invalid item collection.');
  const ids = new Set();
  for (const item of value.items) {
    if (!item || typeof item.id !== 'string' || ids.has(item.id) || !ITEM_TYPES.has(item.type)) throw new Error('Invalid or duplicate board object.');
    ids.add(item.id);
    if (![item.x, item.y].every(n => Number.isFinite(n) && Math.abs(n) < 1e7)) throw new Error('Invalid object position.');
    for (const key of ['w', 'h', 'lineWidth', 'fontSize']) if (item[key] !== undefined && (!Number.isFinite(item[key]) || item[key] <= 0 || item[key] > 100000)) throw new Error('Invalid object size.');
    if(item.type==='arc'&&(![item.startAngle,item.sweepAngle,item.w,item.h].every(Number.isFinite)||!item.sweepAngle||Math.abs(item.sweepAngle)>360||typeof item.showRadii!=='boolean'))throw new Error('Invalid arc.');
    if(item.crop!==undefined&&(item.type!=='image'||!validCrop(item.crop)))throw new Error('Invalid image crop.');
    if (item.rotation !== undefined && !Number.isFinite(item.rotation)) throw new Error('Invalid rotation.');
    if (item.opacity !== undefined && (!Number.isFinite(item.opacity) || item.opacity < 0 || item.opacity > 1)) throw new Error('Invalid opacity.');
    if (item.smoothing !== undefined && (!Number.isFinite(item.smoothing) || item.smoothing < 0 || item.smoothing > 1)) throw new Error('Invalid ink smoothing.');
    for (const key of ['stroke','fill']) if (item[key] !== undefined && !/^(#[0-9a-f]{6}|none)$/i.test(item[key])) throw new Error('Invalid color.');
    if (['curve','path','polygon','line','arrow'].includes(item.type) && (!Array.isArray(item.points) || item.points.length > 50000 || item.points.some(p => !Array.isArray(p) || p.length !== 2 || !p.every(n => Number.isFinite(n) && Math.abs(n) < 1e7)))) throw new Error('Invalid path.');
    if(item.type==='curve'&&item.points.length<2)throw new Error('A curve needs two anchors.');
    if (item.rawPoints !== undefined && (item.type !== 'path' || !Array.isArray(item.rawPoints) || item.rawPoints.length > 50000 || item.rawPoints.some(p => !Array.isArray(p) || p.length !== 2 || !p.every(n => Number.isFinite(n) && Math.abs(n) < 1e7)))) throw new Error('Invalid raw ink path.');
    if (['text','note'].includes(item.type) && (typeof item.text !== 'string' || item.text.length > 10000)) throw new Error('Invalid text.');
    if (['image','equation','graph'].includes(item.type) && (typeof item.src !== 'string' || !/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(item.src))) throw new Error('Unsupported image content.');
    if (['equation','graph'].includes(item.type) && (typeof item.source !== 'string' || item.source.length > (item.type==='graph'?4000:2000))) throw new Error('Invalid mathematical source.');
    if(item.series!==undefined&&(item.type!=='graph'||!Array.isArray(item.series)||!item.series.length||item.series.length>8||item.series.some(r=>typeof r.source!=='string'||r.source.length>400||!/^#[0-9a-f]{6}$/i.test(r.color)||typeof r.visible!=='boolean')))throw new Error('Invalid graph series.');
    if (item.type === 'graph' && (!Array.isArray(item.range) || item.range.length !== 4 || !item.range.every(Number.isFinite))) throw new Error('Invalid graph range.');
  }
  if (JSON.stringify(value).length > 25_000_000) throw new Error('Board exceeds the 25 MB limit.');
  return structuredClone(value);
}
export function parseBackup(text) {
  if (text.length > 25_000_000) throw new Error('Backup exceeds the 25 MB limit.');
  const data = JSON.parse(text);
  if (data.format !== 'philip-teaching-board' || data.version !== 1) throw new Error('This is not a supported teaching-board backup.');
  return validateBoard(data.board);
}
export function serializeBackup(board) {
  return JSON.stringify({ format: 'philip-teaching-board', version: 1, exportedAt: new Date().toISOString(), board: validateBoard(board) }, null, 2);
}
