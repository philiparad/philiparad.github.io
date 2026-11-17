// Copy the calculator's production assets into an isolated offline Tauri frontend.
// Never include desktop source, Rust build artifacts, tests or archival files.
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
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
// CAL-012: identical fixture is loaded inside Windows WebView2 and Chromium.
// Keep it a test-only staged asset; it never replaces the calculator page.
await cp(join(desktop, 'visual-acceptance', 'fixture.html'),
  join(destination, 'visual-fixture.html'));
copied += 1;
// CAL-009: Windows must ship the *same* repository-owned LCD font as the web
// build. Rewrite the web-relative URL so it resolves inside Tauri's dist/.
const fontName = 'Roboto-Medium-webfont.woff';
const fontSource = resolve(calculator, '..', 'fonts', fontName);
const fontFolder = join(destination, 'fonts');
await mkdir(fontFolder, { recursive: true });
await cp(fontSource, join(fontFolder, fontName));
const cssFile = join(destination, 'styles.css');
const css = await readFile(cssFile, 'utf8');
const webFontURL = '../fonts/' + fontName;
if (!css.includes(webFontURL)) throw Error('CAL-009 missing LCD @font-face source');
await writeFile(cssFile, css.replaceAll(webFontURL, './fonts/' + fontName), 'utf8');
copied += 1;
for (const required of ['index.html', 'styles.css', 'js/url-mode.js', 'js/app.js']) {
  await stat(join(destination, required));
}
console.log(`Staged ${copied} calculator frontend files in desktop/dist (offline).`);
