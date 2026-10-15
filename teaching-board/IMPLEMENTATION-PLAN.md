# Sequential improvement plan

Complete, test, commit, deploy and live-verify each task before starting the next.
Tablet/stylus and cloud work were removed at the user's request.

1. Graph examples gallery — complete — deployed f968ec2; examples, persistence, editing and cancellation verified.
2. Independent function domain limits — complete; deployed dd516c4 and verified rendering, rejection and reload.
3. Piecewise function expressions and intervals — complete; deployed 59956c3, live overlap/cancellation/persistence/rendering verified.
4. Open and closed endpoints — complete; deployed bb5a90d4 and live markers, boundaries and reload verified.
5. Named custom functions with undefined/circular-reference validation — complete; deployed 0c2288c and live references, rejection and reload verified.
6. Axis bounds, ticks, labels, grid and equal-scale controls — complete; deployed cb4877a, grid rendering, labels, validation and reload verified.
7. Mixed inline text formatting — complete; deployed efb1ee5, selection styling, reload and cancellation verified.
8. Paragraph alignment and lists — complete; deployed 18f94bf, centered heading, bullets, numbered continuation, inline styles and reload verified.
9. Inline equations in text — complete; deployed 4c64684, insertion, source editing, rendering and reload verified.
10. Rich-text/equation persistence, snippets and exports — complete; deployed 4f7eeae, 128 tests, live backup, snippet insertion/reload and PNG export verified.
11. Graph link controls and membership — complete; deployed 6f50fdf, 131 tests, live linking, undo/redo and reload verified.
12. Linked horizontal navigation ranges — complete; deployed 705e711 via successful Pages run 38689086375; live shared bounds, zoom, independent y ranges, reload and backup verified.
13. Shared x-position marker and values — complete; deployed dc41c2e, 137 tests, live values, clear/undo and reload verified.
14. Unlinking and link lifecycle/persistence checks — complete; deployed b455343, 140 tests, live unlink/undo, duplicate isolation and reload/backup verified.
15. Collapsible minimap with viewport — implemented; 142 tests pass; deployment/live verification pending.
16. Minimap click and drag navigation.
17. Large-board minimap performance and A4 boundaries.
18. Plain, dotted, squared and ruled backgrounds.
19. Background color, spacing and line colors.
20. Background consistency in A4, backups and exports.
21. Fading laser-pointer trail.
22. Laser trail appearance and viewport behavior.
23. History memory measurements and regression checks.
24. Incremental history for common actions.
25. Shared large history assets and memory budget.
