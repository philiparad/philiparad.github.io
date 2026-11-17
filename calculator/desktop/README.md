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

## CAL-012 — WebView2 / Chromium LCD visual acceptance

On Windows, `.github/workflows/calculator-tauri-windows.yml` now compares the
same **staged calculator LCD fixture** using Microsoft Edge WebView2 and
Playwright Chromium. The fixture exercises eight screens (Ans, MODE menu, EQN
types, EQN coefficients, fraction, nested root, fraction answer, engineering
notation) at device-pixel-ratio factors **1.00, 1.25, 1.50, and 2.00**.

The build checks for **32 WebView2 PNGs and 32 Chromium PNGs**, verifies the
bundled LCD font is loaded, checks complete scenario coverage, compares ink
shape/overlap and color difference, and emits an inspectable report. Failure
prevents the Windows installer step from running. The CI artifact
`calculator-lcd-webview2-chromium-parity` contains:

- `webview2/` and `chromium/`: matched screenshots and JSON manifests
- `diffs/`: difference maps
- `index.html`: side-by-side visual review
- `report.json`: machine-readable per-scenario acceptance result

To reproduce locally after `npm install` and `npm run check`:

```powershell
npx playwright install chromium
node ../tests/test_lcd_chromium_parity.cjs
dotnet run --project visual-acceptance/WebView2Capture/WebView2Capture.csproj --configuration Release -- dist lcd-cross-engine/webview2
python -m pip install Pillow==11.3.0
python ../tests/compare_lcd_cross_engine.py lcd-cross-engine
```

The native screenshot host uses **real WebView2**, not a browser simulation,
but is a minimal WinForms harness rather than the installed Tauri window.
DPR changes are applied through Chromium DevTools device-metrics emulation;
they are **not physical Windows monitor-DPI changes**. Manual inspection of
the installed Tauri window at 100%, 125%, 150%, and 200% Windows display scaling
is still required for final UI/parity acceptance. Neither the automated test
nor this document claims physical CASIO hardware parity.

## Note on branding

This is an independent educational simulator, not an official CASIO application. The desktop title is deliberately generic.
