<!-- GitHub folder setup -->
This folder is the complete updated FORGE demo. From the cloned ShiftOS repository, run `cd forge-demo`, then `npm start` (Node.js 22.13 or newer). Open http://127.0.0.1:3000/decision-room for the chatbot or http://127.0.0.1:3000/ for the factory dashboard.

# FORGE — test-station disruption recovery

FORGE is an AI recovery agent for shared test-station failures in liquid-cooling manufacturing. The website focuses on one plant, one outage, three recovery plans, and a manager-to-supervisor handoff.

## Run

Requires Node.js 22.13+; no third-party runtime packages are needed.

```sh
npm start
```

Open http://127.0.0.1:3000 and click **Simulate outage**. The default 8-hour scenario calculates $1.4M in shipment exposure across three urgent commitments, then compares regular-capacity prioritization, overtime, and a qualified alternative station inside the same plant.

Change the outage duration to recalculate all schedules and costs. Route a feasible plan, record a simulated plant-manager approval, and accept tasks as the supervisor. The local SQLite decision record persists across server restarts. Recalculation supersedes the previous decision; stale approvals are rejected.

## Anthropic

Use **Connect Anthropic** in the website, or copy `.env.example` to `.env`, set `ANTHROPIC_API_KEY`, and restart. The default model is `claude-sonnet-4-6`; choose a model available to your account. Keys stay on the server. `.env` and `.forge/` are excluded from Git.

Claude receives the current deterministic incident, selected order, workflow, and retrieved evidence. It explains results with native citations; it does not calculate official schedules or approve/execute actions. Without a key, the real calculated brief and source retrieval remain available. Live-provider verification requires your key; automated provider tests use mocks.

## Scope and inputs

- `fixtures/test-outage.json`: a new, separate synthetic incident with 14 REC orders, station calendars, qualification/calibration, test durations, shipment deadlines/values, and cost rates. These are explicit scenario assumptions, not newly discovered CoolIT operating facts.
- `src/recovery.mjs`: deterministic finite-window scheduling, cost/exposure calculation, plan recommendation, and persisted simulated approval/task state machine.
- `public/recovery.js`, `public/recovery.css`, `public/index.html`: focused incident UI.
- `src/data.mjs`, `src/anthropic.mjs`, `src/server.mjs`: full-dataset retrieval, cited explanations, and HTTP API.
- `PRD.md`: narrowed product specification and acceptance criteria.
- `docs/PITCH.md`: focused pitch and demo script.
- The original enterprise workspace remains at `/workspace`; it is not part of the hackathon pitch. Original PRD and workspace documentation are archived under `docs/`.

The original 46,743-row synthetic pack is unchanged and remains indexed for RAG. Its 50 revision-incompatible allocation links remain flagged in the original workspace. The new incident uses independent REC identifiers and does not silently repair or join those conflicts.

## Model and economic boundaries

The scheduler is a reproducible heuristic, not a global optimizer. It enforces whole-order tests, one job per station, qualified families, valid calibration, resource calendars, outage exclusion, and a packing buffer. A feasible plan can still leave commitments late, which is shown explicitly. Readiness, passing tests, and a two-hour release/packing buffer are assumptions.

Shipment value at risk is exposure, not lost revenue or cost. Cost estimates separately sum overtime, freight allowance, idle labor/equipment, WIP holding, potential penalties, and alternate-cell setup/staffing. Customer escalation is a count. Every rate and formula is inspectable.

The under-60-second recovery decision is a demo target, not a validated comparison to manual coordination. Displayed calculation time excludes AI inference and human approvals.

## Governance boundaries

This is a local simulation. Entered manager/supervisor names are not authenticated identities. Routing is an in-app handoff, not an external message. Task completion records are simulated; no actual test, quality release, production writeback, or shipment is performed or certified. All actual shipment outcomes remain unobserved.

The HTTP server binds to loopback, checks same-origin mutations and CSRF tokens, limits requests, and allowlists public assets. Add authenticated role authorization before a hosted multi-user deployment.

## Verification

```sh
npm test
```

Tests cover the original ingestion/RAG/API protections plus outage calculations, resource constraints, qualification/calibration, cost arithmetic, deterministic replay, stale-run rejection, approval and supervisor prerequisites, idempotent task completion, and recovery-context citations.

The `.forge/` directory holds rebuildable retrieval data and the local simulated decision history. Do not delete it if that history must be retained.

## Standalone decision room

Open [the decision room](http://127.0.0.1:3000/decision-room) for persistent case conversations, source-linked structured answers, explicit named approval, dry-run/action receipts, and outcome inspection. The factory dashboard links to this new surface.

See [implementation and demo notes](docs/DECISION-ROOM.md) and the [supplied chatbot specification](docs/CHATBOT-SPEC.md). The room uses its own decision ledger and a server-defined demo role. It does not provide production SSO, ERP writeback, or an observed shipment feed. Claude selects validated server-authored claims so official numbers retain deterministic provenance.
