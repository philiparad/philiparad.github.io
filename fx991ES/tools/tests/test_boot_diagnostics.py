"""M48 browser boot/error instrumentation regression checks."""
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class BootErrorCaptureTests(unittest.TestCase):
    def test_monitor_script_runs_before_calculator(self):
        html = (ROOT / 'index.html').read_text(encoding='utf-8')
        self.assertIn('<script src="src/boot-diagnostics.js"></script>', html)
        self.assertLess(html.index('src/boot-diagnostics.js'), html.index('src/natural-editor.js'))
        self.assertLess(html.index('src/boot-diagnostics.js'), html.index('src/app.js'))

    def test_acceptance_uses_boot_errors_not_empty_placeholder(self):
        js = (ROOT / 'tests/browser-acceptance.js').read_text(encoding='utf-8')
        self.assertIn('win.FX991_BOOT_DIAGNOSTICS', js)
        self.assertIn('errors=monitor', js)
        self.assertNotIn('resolve({win,doc,errors:[]})', js)

    def test_script_is_valid_javascript(self):
        subprocess.run(['node', '--check', str(ROOT / 'src/boot-diagnostics.js')], check=True,
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10)

    def test_browser_acceptance_is_valid_javascript(self):
        subprocess.run(['node', '--check', str(ROOT / 'tests/browser-acceptance.js')], check=True,
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10)

    def test_capture_script_catches_sync_and_async_errors_without_telemetry(self):
        harness = r'''
const fs = require('fs'), vm = require('vm');
const listeners = {};
const fake = {addEventListener(name, fn) {listeners[name] = fn;}};
const context = {window: fake};
vm.runInNewContext(fs.readFileSync(process.argv[1], 'utf8'), context);
if (!Object.isFrozen(fake.FX991_BOOT_DIAGNOSTICS)) throw Error('monitor not immutable');
listeners.error({message: 'Unexpected crash'});
listeners.unhandledrejection({reason: Error('Promise failed')});
if (fake.FX991_BOOT_DIAGNOSTICS.errors.length !== 2) throw Error('missed errors');
if (!fake.FX991_BOOT_DIAGNOSTICS.errors[0].includes('Unexpected crash')) throw Error('missing error message');
if (!fake.FX991_BOOT_DIAGNOSTICS.errors[1].includes('Promise failed')) throw Error('missing rejection');
for (let i=0; i<40; i++) listeners.error({message:'x'.repeat(2000)});
if (fake.FX991_BOOT_DIAGNOSTICS.errors.length !== 20) throw Error('error limit failed');
if (fake.FX991_BOOT_DIAGNOSTICS.errors.some(s => s.length > 520)) throw Error('unbounded report');
'''
        subprocess.run(['node', '-e', harness, str(ROOT / 'src/boot-diagnostics.js')], check=True,
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10)


if __name__ == '__main__':
    unittest.main()
