# Milestone 22 structural error-recovery characterization

## Semantic source position to cursor anchor

The Natural Display document tree is the editing authority. Each token/template is assigned a stable node ID, and nested sequence fields have stable anchors. The serializer produces semantic source text for evaluation. Parser errors return a source offset; `seekSource` enumerates editable anchors and chooses the closest source offset, preferring deeper template slots on ties.

## Incomplete templates

`firstMissingAnchor` finds the first empty required field, and pressing `=` places a syntax-error offset at that field. Error LEFT or RIGHT reconstructs the editable anchor without replacing a fraction or other template with flattened tokens.

## Arithmetic errors

A zero right-hand operand of `/` positions `Math ERROR` at the operand. This is an independently authored heuristic and has not been validated against physical Casio navigation.

## Remaining divergences

- Multi-token source offsets may not always coincide with a visually expected caret slot.
- Some deeply nested expression boxes overflow vertically on a 96×31 display.
- Complete CASIO-compatible error taxonomy and exact key navigation have not been demonstrated.
- Numerical results use a custom BigInt/Number compatibility layer, not a verified Casio decimal pipeline.
- Hardware/emulator observations remain uncollected.
