# Milestone 53 — browser acceptance iframe lifecycle isolation

The canonical browser harness previously re-used a single iframe element for all 18 checks. A slow or failed navigation could emit a late load event during a subsequent test and confuse the result.

The revised `loadFresh()` replaces the iframe element for every check, retains its `fixture` ID and styling, and cleans up both `load` and `error` listeners after settling. Timeouts cancel the in-flight navigation, and a load event is accepted only when its document URL ends in `/index.html`. Failed load events and invalid navigation targets are reported as **BLOCKED** infrastructure failures, not calculator assertion failures.

The original 18 test names, ordering, tests, and downloadable evidence schema are unchanged. This implementation is verified by local regression and structural tests; acceptance in Chromium, Firefox and WebKit requires actual browser execution. Missing browser evidence still blocks release.
