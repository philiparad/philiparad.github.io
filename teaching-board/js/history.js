/** Document snapshots only; storage revisions stay outside undo/redo. */
export class History {
  constructor(initial, limit = 80) { this.limit = limit; this.past = []; this.future = []; this.current = structuredClone(initial); }
  commit(next) {
    if (JSON.stringify(next) === JSON.stringify(this.current)) return false;
    this.past.push(this.current);
    if (this.past.length > this.limit) this.past.shift();
    this.current = structuredClone(next); this.future = []; return true;
  }
  undo() { if (!this.past.length) return null; this.future.push(this.current); this.current = this.past.pop(); return structuredClone(this.current); }
  redo() { if (!this.future.length) return null; this.past.push(this.current); this.current = this.future.pop(); return structuredClone(this.current); }
}
