# Domain boundary

The imported deterministic services remain in `src/model.ts`, `src/ledger.ts`,
`src/memory.ts`, `src/master.ts`, `src/solver.ts` and `src/disclosure.ts` to
preserve baseline imports and golden-test parity. UI code consumes their
projections and must not reproduce official calculations.
