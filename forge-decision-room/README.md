# FORGE Decision Room

A role-scoped decision-support room for a constrained manufacturing plant (COOLIT / UNIFIDE — Glasswing hackathon). One screen, four regions:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ TOP   context bar: site · role · active commitment · snapshot · as-of          │
├──────────────┬──────────────────────────────────────────────┬────────────────┤
│ LEFT  SCOPE  │ CENTRE · TOP  — COOLIT SHOP FLOOR (floor plan)│ RIGHT  FORGE    │
│ search       │  zone hotspots + open-decision badges         │ conversation    │
│ RISK/PRODUCT │ CENTRE · BOTTOM — order table                 │ evidence        │
│ FLOW/OWNER   │  Promise · Order · Product · Qty · Constraint │ governed actions│
│ HORIZON      │  · State                                      │ receipt/outcome │
│ QUEUE (n)    │                                              │                 │
└──────────────┴──────────────────────────────────────────────┴────────────────┘
```

Invariant: **the centre pane is the record; every other pane is a view of a centre record.** No number without provenance.

## Quick start

```bash
npm install
npm run dev        # dev server (Vite)
npm run build      # tsc (src + server) + vite build
npm run preview    # serve the production build on http://localhost:5273/ (bound 0.0.0.0)
```

The app reads its room context from the URL — `?role=&order=&zone=&horizon=` — so a view is shareable and survives reload (e.g. `/?role=demand-planner&order=COM-1018&zone=ZN-06&horizon=13w`).

## Testing

```bash
npm test           # all suites, fail-closed
npm run ci         # build + npm test (the gate)
```

| Suite | Command | Covers |
|---|---|---|
| Decision services | `npm run verify` | capacity, pegs, dates, scenarios, orchestrator, ledger, memory |
| Invariants / property | `npm run test:invariants` | determinism, replay, CAS/`StaleError`, ship-day, peg conservation, cross-pane, authority+disclosure, zone/filter |
| COOLIT algorithm | `npm run test:coolit` | solver lane vs the real COOLIT fixture |
| Contract assertions | `npm run test:contract` | capacity reconciliation, schedule, demand deltas, v2 lane, allocation |
| Capacity / day-bin | `npm run test:capacity` | rate-based capacity formulas over the v3.2 ERP fixtures |
| Router / tools / AI | `npm run verify:server` · `verify:tools` · `verify:ai` | control plane + grounding validator |
| Persona acceptance | `npm run verify:persona` (`:target`) | 48 scripts (12 per role) |
| Fixture lint | `npm run lint` | fail-closed reference integrity |

## Layout

| Path | What |
|---|---|
| `src/` | deterministic decision services (`model.ts`), orchestrator, ledger, memory, disclosure, zones, UI |
| `src/zones.ts` · `src/ShopFloor.tsx` | plant floor-zone master + SVG/illustration floor with hotspots |
| `server/` | AI control plane (router, typed-tool gateway, orchestrator, validator) + persona-acceptance harness |
| `tools/gurobi/` | build-time Gurobi allocation + scheduling, contract fixtures + artifacts |
| `tools/contract-tests.ts` · `tools/capacity-model.ts` | data/algorithm contract verification |
| `notion/` | the full design + task/register set (also published to Notion) |
| `docs/` | delivery plan, status/roadmap, data-improvement plans |
| `public/floor-plan.png` | the authoritative COOLIT floor-plan illustration (from the PRD) |

## Determinism

Everything is a pure function of `(snapshot_hash, master_set_version, model_version, seed)`. JCS canonical JSON + SHA-256, no `Date.now`/`localeCompare`/Map-order, Gurobi pinned (`Seed=0, Threads=1`). Approval ≠ execution: a named approval, a dry run, and a receipt are required; a stale snapshot is a compare-and-swap `StaleError`, never a force-execute.

## Notes

- This directory is self-contained; it does not import from the rest of the repository.
- `.env` is git-ignored; provide secrets via environment variables (never commit them).