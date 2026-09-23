export const SCHEMA_VERSION = 1;
export const ITEM_TYPES = new Set(['path', 'line', 'arrow', 'rectangle', 'ellipse', 'triangle', 'polygon', 'text', 'note', 'equation', 'graph', 'image']);
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
  const v = value.viewport;
  if (!v || ![v.x, v.y, v.zoom].every(Number.isFinite) || v.zoom < .1 || v.zoom > 8) throw new Error('Invalid viewport.');
  if (!Array.isArray(value.items) || value.items.length > 20000) throw new Error('Invalid item collection.');
  const ids = new Set();
  for (const item of value.items) {
    if (!item || typeof item.id !== 'string' || ids.has(item.id) || !ITEM_TYPES.has(item.type)) throw new Error('Invalid or duplicate board object.');
    ids.add(item.id);
    if (![item.x, item.y].every(n => Number.isFinite(n) && Math.abs(n) < 1e7)) throw new Error('Invalid object position.');
    for (const key of ['w', 'h', 'lineWidth', 'fontSize']) if (item[key] !== undefined && (!Number.isFinite(item[key]) || item[key] <= 0 || item[key] > 100000)) throw new Error('Invalid object size.');
    if (item.rotation !== undefined && !Number.isFinite(item.rotation)) throw new Error('Invalid rotation.');
    if (item.opacity !== undefined && (!Number.isFinite(item.opacity) || item.opacity < 0 || item.opacity > 1)) throw new Error('Invalid opacity.');
    for (const key of ['stroke','fill']) if (item[key] !== undefined && !/^(#[0-9a-f]{6}|none)$/i.test(item[key])) throw new Error('Invalid color.');
    if (['path','polygon','line','arrow'].includes(item.type) && (!Array.isArray(item.points) || item.points.length > 50000 || item.points.some(p => !Array.isArray(p) || p.length !== 2 || !p.every(n => Number.isFinite(n) && Math.abs(n) < 1e7)))) throw new Error('Invalid path.');
    if (['text','note'].includes(item.type) && (typeof item.text !== 'string' || item.text.length > 10000)) throw new Error('Invalid text.');
    if (['image','equation','graph'].includes(item.type) && (typeof item.src !== 'string' || !/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(item.src))) throw new Error('Unsupported image content.');
    if (['equation','graph'].includes(item.type) && (typeof item.source !== 'string' || item.source.length > 2000)) throw new Error('Invalid mathematical source.');
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
