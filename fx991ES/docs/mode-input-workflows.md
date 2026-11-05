# Milestone 26 — Keypad-driven Mode Input Workflows

## Independent implementation

All mode editors are browser-only, independently developed educational workflows. They are not verified replicas of the physical Casio editor or the official emulator. The calculator math engines remain unchanged from Milestone 25.

## Operation choice

Use **MODE** and select an operation supported by that mode. Press a numbered item to enter its coefficient/data editor. Press **DOWN** to page the operation menu when more than four choices are available. Confirm each field using **=**; **LEFT** and **RIGHT** revisit prior fields and edit them. **DEL** erases the last character. **AC** clears the current field, and **AC** in a workflow operation menu cancels it.

### EQN

Quadratic (`a,b,c`), cubic (`a,b,c,d`), 2×2 and 3×3 simultaneous systems are entered one coefficient at a time.

### MATRIX

Determinant (2×2 or 3×3), inverse 2×2, transpose 2×2, and multiplication of two 2×2 matrices. Fields advance in row-major order, then across the second matrix. Larger matrix editors and persistent MatA/MatB/MatC stores remain unimplemented in keypad workflows.

### VECTOR

2D/3D dot products, 3D cross product, 2D addition, and 2D angle. Vectors are entered A followed by B. Persistent VctA/VctB/VctC stores remain unimplemented.

### STAT

Three-value and five-value one-variable datasets, or three XY pairs for linear regression. This is intentionally bounded; the mathematical STAT engine supports richer operations through its teaching input. Data-grid storage, frequency rows, and other regression wizards are not yet implemented.

### TABLE

Legacy `X^2` single-function shortcut; custom `f(X)` expression; or dual `f(X),g(X)` entry restricted to C edition. An expression may use X, digits, +, -, *, /, ^, and parentheses. Press **ALPHA**, then the physical **(** / LP key to enter X. Bounds are entered as start, end, step. Standard model limit is 30 rows for a single function; the C two-function workflow is limited to 20. On a result, **DOWN/UP** browses rows in the semantic LCD display without altering the computed data.

## Validation and limits

- Every numeric entry is validated before advance. Invalid values produce `Argument ERROR` and do not silently coerce into zero.
- Function expressions are parsed by the existing expression parser; no `eval` or dynamic execution is used.
- Model-specific features are enforced in the shared controller, not only the web interface.
- Fifteen new deterministic key-sequence tests were added to the existing 358 tests.
- No physical-device observations were collected. This milestone does **not** qualify as hardware compatibility certification.