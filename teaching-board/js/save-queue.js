/** Serializes writes. On failure retains dirty state, reports the error, and stops. */
export class SaveQueue {
  constructor(write, onStatus = () => {}) { this.write = write; this.onStatus = onStatus; this.pending = null; this.running = null; this.error = null; }
  enqueue(snapshot) { this.pending = structuredClone(snapshot); this.error = null; return this.flush(); }
  async flush() {
    if (this.running) return this.running;
    if (!this.pending) return;
    this.running = (async () => {
      while (this.pending) {
        const next = this.pending; this.pending = null; this.onStatus('saving');
        try { await this.write(next); }
        catch (error) { this.pending ??= next; this.error = error; this.onStatus('error', error); throw error; }
      }
      this.onStatus('saved');
    })();
    try { await this.running; } finally { this.running = null; }
  }
  get dirty() { return Boolean(this.pending || this.running); }
}
