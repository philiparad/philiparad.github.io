/**
 * Bounded, document-local editing history.
 * Stores plain validated editor snapshots, never raw HTML.
 * The lesson's board history is deliberately independent.
 */
export class TextHistory {
    constructor(initial, limit=100) {
        if (!Number.isInteger(limit) || limit < 2 || limit > 1000) throw new Error('Invalid text history limit.');
        this.limit=limit;
        this.entries=[structuredClone(initial)];
        this.index=0;
    }
    get current() { return structuredClone(this.entries[this.index]); }
    get canUndo() { return this.index > 0; }
    get canRedo() { return this.index < this.entries.length-1; }
    push(value) {
        const copy=structuredClone(value);
        if (JSON.stringify(copy) === JSON.stringify(this.entries[this.index])) return false;
        this.entries.length=this.index+1;
        this.entries.push(copy);
        if(this.entries.length > this.limit) this.entries.shift();
        this.index=this.entries.length-1;
        return true;
    }
    undo() {
        if(!this.canUndo)return null;
        this.index--;
        return this.current;
    }
    redo() {
        if(!this.canRedo)return null;
        this.index++;
        return this.current;
    }
}
