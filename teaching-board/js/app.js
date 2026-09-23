import { createBoard, parseBackup, serializeBackup } from './model.js';
import { BoardRepository } from './storage.js';
import { zoomAt } from './viewport.js';
import { SaveQueue } from './save-queue.js';

const repository = new BoardRepository();
const app = document.querySelector('#app');
const status = document.querySelector('#status');
let activeBoard = null, queue = null, routeGeneration = 0, timer;
function report(message) { clearTimeout(timer); status.textContent = message; timer = setTimeout(() => { status.textContent = ''; }, 7000); }
function element(tag, text, className) { const e = document.createElement(tag); if (text != null) e.textContent = text; if (className) e.className = className; return e; }
function button(text, action, className) { const b = element('button', text, className); b.type = 'button'; b.onclick = async () => { b.disabled = true; try { await action(); } catch (error) { report(error.message); } finally { b.disabled = false; } }; return b; }
async function nameLesson(initial = '') {
  const dialog = document.querySelector('#name-dialog'), input = document.querySelector('#lesson-name');
  input.value = initial; dialog.returnValue = 'cancel'; dialog.showModal(); input.focus();
  return new Promise(resolve => { dialog.addEventListener('close', () => resolve(dialog.returnValue === 'save' ? input.value.trim() || 'Untitled lesson' : null), { once: true }); });
}
function download(board) {
  const blob = new Blob([serializeBackup(board)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), a = element('a');
  a.href = url; a.download = `${board.title.replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 80) || 'lesson'}.json`;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}
async function dashboard(generation) {
  const boards = await repository.list();
  if (generation !== routeGeneration) return;
  app.className = ''; app.replaceChildren();
  const heading = element('div', null, 'heading'), title = element('div');
  title.append(element('h1', 'Your teaching workspace'), element('p', 'A place for every lesson, idea, and explanation.', 'muted'));
  const actions = element('div', null, 'actions');
  actions.append(button('Import backup', () => document.querySelector('#import-file').click()), button('+ New lesson', async () => {
    const name = await nameLesson(); if (!name) return;
    const board = await repository.save(createBoard(name)); location.hash = `/board/${board.id}`;
  }, 'primary'));
  heading.append(title, actions);
  const notice = element('div', 'Foundation release: create, rename, reopen, and back up lessons. Drawing and teaching tools will be added in Stage 2. Boards are saved in this browser; export backups before clearing browser data.', 'notice');
  const search = element('input', null, 'search'); search.placeholder = 'Search your lessons…'; search.setAttribute('aria-label', 'Search lessons'); search.type = 'search';
  const cards = element('div', null, 'cards');
  function renderCards() {
    cards.replaceChildren();
    const shown = boards.filter(b => !b.deleted && `${b.title} ${b.folder}`.toLowerCase().includes(search.value.toLowerCase()));
    if (!shown.length) cards.append(element('div', boards.some(b => !b.deleted) ? 'No matching lessons.' : 'Your next lesson starts here. Create a new board to begin.', 'empty'));
    for (const board of shown) {
      const card = element('article', null, 'card'), body = element('div', null, 'card-body');
      const title = element('h2', board.title); title.dir = 'auto';
      const actions = element('div', null, 'actions');
      actions.append(button('Open', () => { location.hash = `/board/${board.id}`; }, 'primary'), button('Rename', async () => {
        const name = await nameLesson(board.title); if (!name) return;
        await repository.save({ ...board, title: name }); await renderRoute();
      }), button('Backup', () => download(board)));
      body.append(title, element('small', `Saved ${new Date(board.updatedAt).toLocaleDateString()} · ${board.items.length} objects`), actions);
      card.append(element('div', '▦', 'thumbnail'), body); cards.append(card);
    }
  }
  search.oninput = renderCards; renderCards(); app.append(heading, notice, search, cards);
}
async function editor(id, generation) {
  const board = await repository.get(id);
  if (generation !== routeGeneration) return;
  if (!board || board.deleted) throw new Error('This lesson was not found. Return to your workspace using the title above.');
  activeBoard = board;
  queue = new SaveQueue(async snapshot => {
    const saved = await repository.save({ ...snapshot, revision: activeBoard.revision });
    activeBoard.revision = saved.revision; activeBoard.updatedAt = saved.updatedAt;
  }, (state, error) => { saveLabel.textContent = state === 'saved' ? 'Saved in this browser' : state === 'saving' ? 'Saving…' : 'Save failed'; if (error) report(error.message); });
  app.className = 'editor'; app.replaceChildren();
  const top = element('div', null, 'editor-top'), title = element('h1', board.title); title.dir = 'auto';
  const back = element('a', '← Lessons', 'button'); back.href = '#/';
  top.append(back, title, button('Backup', () => download(activeBoard)));
  const saveLabel = element('span', 'Saved in this browser', 'muted');
  const area = element('div', null, 'board');
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('aria-label', 'Lesson canvas. Drag to pan; use zoom controls to zoom.'); svg.setAttribute('role', 'img');
  // Fixed markup only. User data is always assigned via textContent or validated attributes.
  svg.innerHTML = '<defs><pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#e2e8ee" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(#grid)"/><g id="scene"></g>';
  const hint = element('div', null, 'board-hint'); hint.append(element('h2', 'Your canvas is ready'), element('span', 'Drag to pan and use + / − to zoom. Drawing, equations, graphs, and media arrive in Stage 2.'));
  const zoom = element('div', null, 'zoom'), percent = element('span');
  function paint() { const v = activeBoard.viewport; svg.querySelector('#grid').setAttribute('patternTransform', `translate(${v.x} ${v.y}) scale(${v.zoom})`); svg.querySelector('#scene').setAttribute('transform', `translate(${v.x} ${v.y}) scale(${v.zoom})`); percent.textContent = `${Math.round(v.zoom * 100)}%`; }
  async function persist() { await queue.enqueue(activeBoard); }
  async function changeZoom(factor) { activeBoard.viewport = zoomAt(activeBoard.viewport, { x: area.clientWidth / 2, y: area.clientHeight / 2 }, factor); paint(); await persist(); }
  zoom.append(button('−', () => changeZoom(1 / 1.2)), percent, button('+', () => changeZoom(1.2)), button('Reset', async () => { activeBoard.viewport = { x: 0, y: 0, zoom: 1 }; paint(); await persist(); }));
  let drag;
  svg.onpointerdown = event => { if (event.button !== 0 || drag) return; drag = { id: event.pointerId, x: event.clientX, y: event.clientY, viewport: { ...activeBoard.viewport } }; svg.setPointerCapture(event.pointerId); };
  svg.onpointermove = event => { if (!drag || event.pointerId !== drag.id) return; activeBoard.viewport = { ...drag.viewport, x: drag.viewport.x + event.clientX - drag.x, y: drag.viewport.y + event.clientY - drag.y }; paint(); };
  const finish = event => { if (!drag || event.pointerId !== drag.id) return; drag = null; persist().catch(error => report(error.message)); };
  svg.onpointerup = finish; svg.onpointercancel = finish;
  area.append(svg, hint, zoom); app.append(top, area, saveLabel); paint();
}
async function renderRoute() {
  const generation = ++routeGeneration;
  try {
    if (queue?.dirty) await queue.flush();
    if (generation !== routeGeneration) return;
    queue = null; activeBoard = null; app.setAttribute('aria-busy', 'true');
    const match = location.hash.match(/^#\/board\/([a-zA-Z0-9-]+)$/);
    if (match) await editor(match[1], generation); else await dashboard(generation);
  } catch (error) { report(error.message); if (!activeBoard) app.replaceChildren(element('p', error.message)); }
  finally { app.setAttribute('aria-busy', 'false'); }
}
document.querySelector('#import-file').onchange = async event => {
  try {
    const file = event.target.files[0]; if (!file) return;
    if (file.size > 25_000_000) throw new Error('Backup exceeds the 25 MB limit.');
    const board = parseBackup(await file.text());
    board.id = crypto.randomUUID(); board.revision = 0; board.deleted = false; board.title = `${board.title.slice(0, 188)} (imported)`;
    await repository.save(board); location.hash = `/board/${board.id}`;
  } catch (error) { report(error.message); } finally { event.target.value = ''; }
};
window.addEventListener('hashchange', renderRoute);
window.addEventListener('beforeunload', event => { if (queue?.dirty) { event.preventDefault(); event.returnValue = ''; } });
renderRoute();
