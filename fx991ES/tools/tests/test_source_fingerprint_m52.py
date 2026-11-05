"""M52: prove browser evidence SHA covers the complete runtime/test surface."""
import sys
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from browser_matrix import source_digest, browser_source_files


class BrowserFingerprintTests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        for name in ('index.html','styles.css','tests/browser-acceptance.html',
                     'tests/browser-acceptance.js','src/app.js','src/kernel.js'):
            file = self.root / name
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text('baseline', encoding='utf-8')

    def test_stable_across_repeated_runs(self):
        self.assertEqual(source_digest(self.root), source_digest(self.root))

    def test_runtime_file_added_changes_hash(self):
        before = source_digest(self.root)
        (self.root / 'src/new-module.js').write_text('const x = 1;')
        self.assertNotEqual(before, source_digest(self.root))

    def test_boot_monitor_modification_changes_hash(self):
        monitor = self.root / 'src/boot-diagnostics.js'
        monitor.write_text('const safe = true;')
        before = source_digest(self.root)
        monitor.write_text('const safe = false;')
        self.assertNotEqual(before, source_digest(self.root))

    def test_noncore_calculator_module_changes_hash(self):
        module = self.root / 'src/natural-editor.js'
        module.write_text('v1')
        before = source_digest(self.root)
        module.write_text('v2')
        self.assertNotEqual(before, source_digest(self.root))

    def test_browser_test_case_modification_changes_hash(self):
        case = self.root / 'tests/cases.js'
        case.write_text('test A')
        before = source_digest(self.root)
        case.write_text('test B')
        self.assertNotEqual(before, source_digest(self.root))

    def test_removed_source_changes_hash(self):
        module = self.root / 'src/something.js'
        module.write_text('test')
        before = source_digest(self.root)
        module.unlink()
        self.assertNotEqual(before, source_digest(self.root))

    def test_ignored_generated_reports_do_not_change_hash(self):
        before = source_digest(self.root)
        (self.root / 'release-evidence').mkdir()
        (self.root / 'release-evidence/matrix-run.json').write_text('{"ready":true}')
        (self.root / 'release-manifest.json').write_text('{}')
        self.assertEqual(before, source_digest(self.root))

    def test_missing_required_source_fails_closed(self):
        (self.root / 'src/app.js').unlink()
        with self.assertRaisesRegex(ValueError, 'Required browser source'):
            source_digest(self.root)

    def test_symlinks_rejected(self):
        target = self.root / 'outside.js'
        target.write_text('other')
        (self.root / 'src/proxy.js').symlink_to(target)
        with self.assertRaisesRegex(ValueError, 'Symlink'):
            source_digest(self.root)

    def test_inventory_is_sorted_and_includes_all_modules(self):
        (self.root / 'src/boot-diagnostics.js').write_text('x')
        (self.root / 'tests/run-node.cjs').write_text('y')
        files = browser_source_files(self.root)
        self.assertEqual(files, tuple(sorted(files)))
        self.assertIn('src/boot-diagnostics.js', files)
        self.assertIn('tests/run-node.cjs', files)

    def test_non_source_files_outside_web_tree_are_ignored(self):
        before = source_digest(self.root)
        (self.root / 'tools').mkdir()
        (self.root / 'tools/ci_environment.py').write_text('unrelated')
        self.assertEqual(before, source_digest(self.root))


if __name__ == '__main__':
    unittest.main()
