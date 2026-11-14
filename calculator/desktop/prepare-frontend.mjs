// Copy the calculator's production assets into an isolated offline Tauri frontend.
// Never include desktop source, Rust build artifacts, tests or archival files.
import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const desktop = dirname(fileURLToPath(import.meta.url));
const calculator = resolve(desktop, '..');
const destination = join(desktop, 'dist');
const allowedExtensions = new Set([
  '.html', '.css', '.js', '.mjs', '.json', '.png', '.jpg', '.jpeg',
  '.gif', '.svg', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.wasm'
]);
const skipDirectories = new Set([
  'desktop', 'tests', 'tools', 'node_modules', '.git', '__pycache__'
]);
const explicitHtml = new Set(['index.html']);

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });

let copied = 0;
async function stage(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const source = join(directory, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (!skipDirectories.has(entry.name)) await stage(source);
      continue;
    }
    if (!entry.isFile()) continue;
    const rel = relative(calculator, source);
    const ext = extname(entry.name).toLowerCase();
    if (!allowedExtensions.has(ext)) continue;
    if (ext === '.html' && !explicitHtml.has(rel)) continue;
    const target = join(destination, rel);
    await mkdir(dirname(target), { recursive: true });
    await cp(source, target);
    copied += 1;
  }
}
await stage(calculator);
for (const required of ['index.html', 'styles.css', 'js/url-mode.js', 'js/app.js']) {
  await stat(join(destination, required));
}
console.log(`Staged ${copied} calculator frontend files in desktop/dist (offline).`);
