import { validateBoard } from './model.js?v=20260923-2';
export class ConflictError extends Error {
  constructor() { super('This board changed in another tab. Reopen it before editing.'); this.name = 'ConflictError'; }
}
/** Replace this adapter for future authenticated sync; never put service credentials in this app. */
export class BoardRepository {
  constructor(name = 'philip-teaching-board') { this.name = name; this.connection = null; }
  async open() {
    if (this.connection) return this.connection;
    this.connection = await new Promise((resolve, reject) => {
      const request = indexedDB.open(this.name, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        const boards = db.createObjectStore('boards', { keyPath: 'id' });
        boards.createIndex('updatedAt', 'updatedAt');
        db.createObjectStore('assets', { keyPath: 'id' });
      };
      request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); this.connection = null; }; resolve(request.result); };
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Close other teaching-board tabs to upgrade storage.'));
    });
    return this.connection;
  }
  async read(store, method, key) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const request = tx.objectStore(store)[method](key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async list() { return (await this.read('boards', 'getAll')).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); }
  async get(id) { return this.read('boards', 'get', id); }
  /** Atomic optimistic revision check prevents lost edits from another tab. */
  async save(board, expectedRevision = board.revision) {
    const copy = validateBoard(board);
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('boards', 'readwrite');
      const store = tx.objectStore('boards');
      let failure;
      const request = store.get(copy.id);
      request.onsuccess = () => {
        const existing = request.result;
        if ((existing && existing.revision !== expectedRevision) || (!existing && expectedRevision !== 0)) {
          failure = new ConflictError(); tx.abort(); return;
        }
        copy.revision = (existing?.revision || 0) + 1;
        copy.updatedAt = new Date().toISOString();
        store.put(copy);
      };
      tx.oncomplete = () => resolve(copy);
      tx.onabort = () => reject(failure || tx.error || new Error('Save cancelled.'));
      tx.onerror = () => { failure = tx.error; };
    });
  }
  async putAsset(blob) {
    if (!(blob instanceof Blob) || blob.size > 20_000_000) throw new Error('Asset must be smaller than 20 MB.');
    const id = crypto.randomUUID();
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('assets', 'readwrite');
      tx.objectStore('assets').put({ id, blob });
      tx.oncomplete = () => resolve(id);
      tx.onabort = tx.onerror = () => reject(tx.error);
    });
  }
  async getAsset(id) { return (await this.read('assets', 'get', id))?.blob; }
  close() { this.connection?.close(); this.connection = null; }
}
