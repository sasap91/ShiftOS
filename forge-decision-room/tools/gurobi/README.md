# FORGE Gurobi solver harness

Build-time optimization for the FORGE Decision Room. Gurobi cannot run in the static
browser bundle, so the solvers run here and emit a **frozen, fingerprinted** result that
ships as `src/generated/solver-artifacts.ts`.

## Determinism policy (ADR-001)

| Setting | Value | Why |
|---|---|---|
| `Threads` | `1` | no parallel search path; concurrent MIP is impossible at 1 thread |
| `Seed` | `0` | fixed exploratory seed |
| `Method` | `2` | dual simplex — avoids the non-deterministic concurrent LP default |
| `Presolve` | `2` | deterministic aggressive presolve |
| `MIPGap` | `0` | solve to proven optimality on these small models |
| `WorkLimit` | `1_000_000` | deterministic work bound (never a wall-clock time limit) |

Gurobi is deterministic for the same model, parameters, version and machine. Everything
relevant is pinned and recorded in `solver_signature()`.

## Run

```bash
python3 tools/gurobi/allocate_leaktests.py   # family A/B allocation
python3 tools/gurobi/schedule.py             # family B finite-capacity schedule
python3 tools/gurobi/generate_ts.py          # compile artifacts into src/generated
```

or `npm run solver` (all three).

## Result

- **Allocation baseline** reproduces the fixture exactly: FROZEN 200 / COM-1104 48 / COM-1042 56, shortfall 64.
- **Allocation recovery** *improves* on the hand-authored third-shift option: Gurobi needs only **4** extra shifts ($4,416) vs the fixture's 6 ($6,624) — a **$2,208 saving**. This is the optimizer earning its place.
- **Production schedule** solves to `OPTIMAL` for the four COOLIT jobs.

## Known limitations (tracked in the task list)

- The scheduling input is **provisional** (rates/routings not yet in the repo); replace with the W4 routing/resource masters.
- Due dates that fall on a non-working day (COM-1104, Saturday 10 Oct) are currently mapped to the horizon end; the ship-day rule (W5) must normalise them.
- Frozen operations are supported (`fixedStartDay`) but the fixture does not yet pin them; the scheduler may reorder approved work until W4/W5 land.
- Sequence-dependent changeover is not yet modelled (needs a transition matrix).