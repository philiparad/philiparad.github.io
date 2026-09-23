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
    if (![item.x, item.y].every(Number.isFinite)) throw new Error('Invalid object position.');
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
