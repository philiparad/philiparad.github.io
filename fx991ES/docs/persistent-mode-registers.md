# Milestone 27 — Persistent Mode Registers and Editable Statistics

This is an independent browser-only educational calculator implementation. The new workflows are simulator extensions and have not been confirmed against Casio hardware.

## Register entry

1. Enter MATRIX or VECTOR mode.
2. Press **REGS** in the workflow toolbar, then `1`, `2`, or `3` to choose A, B, or C.
3. Enter scalar values using the number keypad and `=` or RIGHT to advance. LEFT moves backward; DEL removes a digit; NEG changes the sign.
4. Press SIZE while editing to toggle 2×2/3×3 for MATRIX, or 2D/3D for VECTOR. Changing dimensions resets that particular register.
5. When all values have been entered the register summary is shown. Select **OP** followed by an operation number. A saved register may also be selected and operated on directly using REGS → register digit → OP.

### MATRIX operations

1. Determinant
2. Inverse
3. Transpose
4. Addition (selected register and B, or C after OTHER)
5. Multiplication (selected register and B, or C after OTHER)

### VECTOR operations

1. Norm
2. Dot product (selected register and B/C)
3. Addition (selected register and B/C)
4. Cross product (requires 3D)
5. Angle in degrees

The mathematical engines are shared with existing MATRIX and VECTOR modes. The register values remain in state across mode changes, but **do not persist after page reload or calculator reset**. They are not browser localStorage.

## STAT table

1. Enter STAT mode and press DATA.
2. Enter values with `=` or RIGHT; LEFT/UP move backwards. ADDROW and DELROW manipulate rows.
3. PAIR toggles one-variable data and linear regression pairs; changing type clears the dataset.
4. STATS calculates the current dataset, without deleting the stored entries.
5. Re-enter DATA to revise a previously entered dataset.

The calculator limits one-variable statistics to 80 values and regression datasets to the lower limit imposed by the existing mathematical engine. Invalid values produce ARGUMENT errors. All data remain local to the running page; nothing is transmitted.

## Test coverage

21 new tests include register isolation, mode-switch persistence, inverse/determinant, matrix multiply, vector dot/cross, editing invalid values, STAT rows, dataset changes, and reset semantics. Tests run in-browser at `tests/acceptance.html`, or optionally with the existing developer-only Node harness. The deployed application does not require Node.js.

## Known differences and next tasks

- Physical Casio key legends and persistent-storage semantics are **unverified**.
- Matrix/vector name selection uses a dedicated REG button rather than a documented Casio keyboard path.
- Registers reset on refresh; export/import and session persistence have not yet been implemented.
- Advanced statistics models still use the earlier direct expression interfaces.
