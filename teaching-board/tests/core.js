import { compileExpression } from '../js/expression.js';
import { bounds } from '../js/scene.js';
import { createBoard, validateBoard, parseBackup, serializeBackup } from '../js/model.js';
import { History } from '../js/history.js';
import { toWorld, toScreen, zoomAt } from '../js/viewport.js';
import { SaveQueue } from '../js/save-queue.js';
export async function runTests(log = console.log) {
  let count = 0;
  function assert(value, message) { if (!value) throw new Error(message); count++; log(`PASS ${message}`); }
  function rejects(action) { try { action(); return false; } catch { return true; } }
  const board = createBoard('שיעור ראשון');
  assert(parseBackup(serializeBackup(board)).title === board.title, 'Backup preserves Hebrew titles');
  assert(rejects(() => validateBoard({ ...board, schemaVersion: 99 })), 'Unknown schema rejected');
  assert(rejects(() => validateBoard({ ...board, viewport: { x: 0, y: 0, zoom: Infinity } })), 'Invalid geometry rejected');
  const item = { id: 'one', type: 'text', x: 0, y: 0, text: 'Hello', w: 100, h: 40 };
  assert(rejects(() => validateBoard({ ...board, items: [item, item] })), 'Duplicate objects rejected');
  const h = new History({ items: [] }); h.commit({ items: [item] });
  assert(h.undo().items.length === 0 && h.redo().items.length === 1, 'Undo and redo round trip');
  h.undo(); h.commit({ items: [{ ...item, id: 'two' }] });
  assert(h.redo() === null, 'New edits invalidate redo');
  const view = { x: 53, y: -27, zoom: 2.5 }, p = { x: 310, y: 120 };
  const world = toWorld(p, view), screen = toScreen(world, view);
  assert(Math.abs(screen.x - p.x) < 1e-9 && Math.abs(screen.y - p.y) < 1e-9, 'Coordinate conversion round trip');
  const after = toWorld(p, zoomAt(view, p, 2));
  assert(Math.abs(after.x - world.x) < 1e-9 && Math.abs(after.y - world.y) < 1e-9, 'Zoom keeps anchor stationary');
  let release; const written = [];
  const q = new SaveQueue(async value => { written.push(value); if (written.length === 1) await new Promise(resolve => { release = resolve; }); });
  const first = q.enqueue({ n: 1 }); q.enqueue({ n: 2 }); const last = q.enqueue({ n: 3 }); release(); await Promise.all([first, last]);
  assert(written.length === 2 && written[1].n === 3 && !q.dirty, 'Concurrent saves serialize and retain latest snapshot');
  let fail = true;
  const failure = new SaveQueue(async () => { if (fail) throw new Error('Disk full'); });
  try { await failure.enqueue({ n: 1 }); } catch {}
  assert(failure.dirty && failure.error.message === 'Disk full', 'Failed saves preserve pending changes');
  fail = false; await failure.flush(); assert(!failure.dirty, 'Failed save can be retried');
  assert(compileExpression('-x^2+2*x')(3) === -3, 'Expression precedence');
  assert(Math.abs(compileExpression('sin(pi/2)+sqrt(9)')(0)-4)<1e-9, 'Expression functions and constants');
  assert(compileExpression('2^3^2')(0) === 512, 'Exponentiation is right associative');
  assert(rejects(() => compileExpression('alert(1)')), 'Arbitrary function execution rejected');
  assert(rejects(() => validateBoard({...board, items:[{...item,type:'image',src:'https://example.com/pixel'}]})), 'Remote image content rejected');
  const b = bounds({x:0,y:0,w:100,h:50,rotation:90});
  assert(Math.abs(b.w-50)<1e-9 && Math.abs(b.h-100)<1e-9, 'Rotated selection bounds');
  const media = {...item,type:'image',src:'data:image/png;base64,YQ=='};
  assert(parseBackup(serializeBackup({...board,items:[media]})).items[0].src===media.src, 'Embedded media survives backup');
  return count;
}
