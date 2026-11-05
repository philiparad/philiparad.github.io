#!/usr/bin/env python3
"""Run canonical and native Playwright tests against one shared HTTP origin.

A different ephemeral port for each runner invalidates the release evidence
same-origin check even if all 72 browser assertions pass. One server lifetime
covers both processes, and both reports remain fail-closed on any failure.
"""
import argparse
from pathlib import Path
import subprocess
import sys
import threading

from browser_matrix import Handler, Server

ROOT = Path(__file__).resolve().parents[1]


def commands(origin, out, python=sys.executable):
    """Build both test commands with *exactly* the same absolute origin."""
    base = [python]
    return (
        base + [str(ROOT / 'tools/browser_matrix.py'), '--base-url', origin, '--out', str(out)],
        base + [str(ROOT / 'tools/browser_interaction_probe.py'), '--base-url', origin, '--out', str(out)],
    )


def execute(out, runner=subprocess.run):
    out = Path(out).resolve()
    out.mkdir(parents=True, exist_ok=True)
    with Server(('127.0.0.1', 0), Handler) as server:
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        origin = f'http://127.0.0.1:{server.server_address[1]}'
        try:
            codes = []
            for command in commands(origin, out):
                try:
                    result = runner(command, cwd=str(ROOT), check=False)
                    codes.append(result.returncode)
                except OSError as exc:
                    print(f'Failed to invoke browser runner: {exc}', file=sys.stderr, flush=True)
                    codes.append(1)
            # Both runners must execute. A successful second runner cannot
            # erase the first runner's failure.
            return 0 if codes == [0, 0] else 1
        finally:
            server.shutdown()
            thread.join(timeout=3)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', default='browser-evidence')
    args = parser.parse_args(argv)
    return execute(args.out)


if __name__ == '__main__':
    raise SystemExit(main())
