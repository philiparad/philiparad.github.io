# Milestone 28 — Session Portability and Optional Recovery

An independent browser-only educational scientific calculator. No CASIO firmware or proprietary graphics. Not affiliated with CASIO.

**New:** Download and import validated session JSON containing MatA/MatB/MatC, VctA/VctB/VctC, STAT data, exact scalar registers/Ans, setup, expression and history. Browser recovery is opt-in; disabling deletes the stored browser snapshot. Transient editor workflows are not restored.

Start `index.html`, or run `tests/acceptance.html`. See `docs/session-persistence.md` for security, format, limitations and recovery policy. Node is optional only for `node tests/run-node.cjs`, never required by the simulator itself.

Physical Casio compatibility remains unverified.
