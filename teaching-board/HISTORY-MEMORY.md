# History storage measurements

`History.stats()` reports undo/redo entry counts and an estimated retained payload size, measured as UTF-8 serialized bytes. This is a deterministic regression metric, not a browser heap measurement; object and engine overhead differ by browser.

Baseline, full snapshots: 1,000 rectangles, followed by 40 moves of one rectangle:

| Measurement | Bytes |
|---|---:|
| Initial retained payload | 78,735 |
| Current document | 78,702 |
| Retained payload after 40 moves | 3,226,854 |

Regression checks cover entry limits, no-op edits, redo preservation, Unicode sizing, and isolation of returned documents. Later storage changes must retain undo/redo correctness while lowering this payload.

Incremental patches: the same 40-move fixture retains 82,574 bytes (about 97.4% less than the full-snapshot baseline). Unchanged large image fields are excluded from movement patches.

Final storage policy: patches intern strings of 4,096 characters or more into shared assets. The payload estimate counts each large string once, including copies in the current document. The default budget is 32 MiB and the entry limit remains 80. Oldest undo entries, then farthest redo entries, are pruned until the budget is met. Unreferenced assets are released after commits and navigation. The current lesson is never discarded: if it alone exceeds the budget, history is emptied and stats report overBudget. This is not a limit on lesson size or an exact JavaScript heap cap.

Clear board keeps its most recent undo entry even when a large cleared lesson exceeds the estimated budget. That entry can move between undo and redo; it is eligible for normal pruning once another edit is made. This exception ensures the Clear board action remains reversible.
