# Scientific Calculator — Windows desktop (Tauri 2)

This is a **separate, offline-capable Windows desktop application** for the calculator in [../index.html](../index.html). It does not change the public GitHub Pages website or replace the calculator engine.

## Requirements

- Windows 10 or Windows 11, with Microsoft Edge WebView2 runtime available
- Node.js 20+ and npm
- Rust stable toolchain with MSVC target
- Microsoft C++ Build Tools (for local builds); GitHub's Windows runner provides these

## Run locally

From `calculator/desktop`:

```powershell
npm install
npm run dev
```

The dev command stages the latest calculator HTML, JS, styles, fonts and image files locally, generates icon assets, and opens the native window.

## Build installers

```powershell
npm run build
```

Output is written to:

- `src-tauri/target/release/bundle/nsis/` — Windows EXE installer
- `src-tauri/target/release/bundle/msi/` — Windows MSI installer

Alternatively, visit **GitHub → Actions → Calculator — Windows desktop (Tauri 2) → Run workflow**. When the build succeeds, download the `fx991es-plus-windows-installers` artifact from the run summary. Every change to the calculator frontend or desktop wrapper also triggers a build.

## Architecture

- `src-tauri/` contains only the Tauri 2 Windows wrapper and bundle configuration.
- `prepare-frontend.mjs` stages calculator assets into a temporary, excluded `dist/` directory. The installed application does not request the GitHub Pages URL or need internet to perform calculations.
- The native window loads `index.html?key=calculator`. This hides the supplemental panels while keeping their DOM present for existing calculations.
- Resizing the window preserves the calculator case aspect ratio.
- No shell, filesystem, or networking plugin permissions are granted.

Changes to the calculation engine belong in `../js/`. Do not duplicate it under desktop.

## Verification

```powershell
npm run check
npm run build
```

Manually verify offline launch, all 50 keypad buttons, COMP/MODE and SETUP menus, SHIFT/ALPHA shortcuts, LCD appearance, window resizing, and a clean uninstall on a Windows machine. Browser regression tests in the repository remain authoritative for calculation logic. A successful GitHub Actions build verifies installation packaging, not hardware parity or every calculator operation.

## Note on branding

This is an independent educational simulator, not an official CASIO application. The desktop title is deliberately generic.
