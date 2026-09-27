# FORGE Decision Room — Stock-take (2026-09-26)

> Consolidated cross-agent stock-take of **both the build and Notion**: what the code now does, what the pages now say, and where they disagree. v0.2 supersedes the first Notion-only stock-take.

| Field | Value |
|---|---|
| Document | FORGE Decision Room — Stock-take |
| Version | v0.4 (code-capability truth) |
| Status | 🟡 Snapshot — point in time |
| Owner | Product Management |
| Captured | 2026-09-26 (Notion edits to 2026-09-27T03:23Z) |
| Method | `notion/stocktake.py` + working-tree scan + build/verify runs |

---

## 1. At a glance

- **Build is green end to end:** `npm run build` ✓ · `verify` ✓ · `verify:server` ✓ · `verify:tools` ✓ · `verify-ai` ✓ (live AI skipped — `FEATURE_AI_CHAT` off / no key).
- **A real AI control plane now exists** (`server/`, ~1,800 lines): deterministic router + taxonomy, typed-tool registry + gateway, investigate orchestrator, OpenAI-compatible model client (sciforium DeepSeek), run store, audit JSONL, and grounding validator.
- **Data jumped to v3.1:** COOLIT Synthetic Enterprise Data **v3.1 — 174 datasets · 41,288 rows · review PASS (12 checks)**; plus the **Algorithm Input Bundle v1** (derived projection).
- **Notion now has ~22 FORGE pages**; four were added in the last 30 min (COOLIT v3, AIB, Data Improvement Plan v2.1, Context & Region Projections Execution Plan).
- **Main risks:** the three registers were **reset** to their base versions (v3 task additions lost from them); Notion/ local drift persists; UI floor render and governance enforcement still pending.

---

## 2. Area-by-area status

| Area | Build state | Notion state | Gap |
|---|---|---|---|
| **Data (v3.1)** | 174 datasets / 41,288 rows; AIB v1 (allocation 60, schedule 40, resources 6, routing 12, horizon 130; PASS) | COOLIT v3, AIB v1, Data Improvement Plan v2.1, Data Model | Zone/route data **not yet loaded by `src/`/`server/`** |
| **Kernel & determinism** | Solver artifact frozen (`generated/solver-artifacts.ts`, 447 lines); `src/plan.ts`; `src/shared/contracts.ts`; `src/solver.ts` | Algorithms §1; Algorithms Build Design §1 | `NumberRef` provenance + JS canonical hash still ⬜ |
| **Algorithms A/B** | Gurobi allocation + scheduling MIPs (OPTIMAL); plan derives capable/ship-day/recovery | Algorithms, Algorithms Build Design, Delivery Plan | Time-phased allocation + ship calendar wiring ⬜ |
| **Algorithms C (shift)** | Not built | Algorithms §11.3; AIB shift_handover rows | WO state machine, handover delta, coverage ⬜ |
| **AI chat / server** | Control plane built: router, taxonomy, registry (479), gateway, investigate orchestrator, model client, validate, audit; scripted fallback always available | AI Chat Build Plan (200 blocks) | Scenario/action orchestrators, durable run stream, live AI enablement ⬜ |
| **UI / state** | `App.tsx` refactored to three panes (queue · ledger · chat); floor-plan **placeholder** ("zones · overlays · zone-select") | UI/UX spec (108); **Context & Region Projections Execution Plan** (Stream CP) | Floor SVG render; selection bus + URL codec; persona-lensed views ⬜ |
| **Governance** | `HumanOverrideEvent` + `RejectionCode` in contracts; scripted policy checks; audit log live | Personas & Governance (61) | Authority enforcement (G-04) + disclosure/redaction (G-05) ⬜ |
| **Testing** | `src/verify.ts` (335) + 3 server suites + `tools/coolit-test.ts`, all green | Demo/Testing/Validation; Execution Task List | Fixture lint, property/replay/CAS, persona acceptance ⬜ |
| **Deployment** | `tsc`(src)+`tsc`(server)+vite build green; `server/index.ts` (PORT 8787), `npm run api`; audit in `var/audit/*.jsonl` | Delivery Plan (175) | CI pipeline, persistence, hosting, cost model ⬜ |
| **Docs / PM** | — | ~22 pages; PM hub (142), Stock-take (this) | Registers reset; doc map drift |

---

## 3. Build inventory (working tree)

**Scripts:** `dev` · `api` · `build` (tsc src + tsc server + vite) · `verify` · `verify:server` · `verify:tools` · `sample` · `solver`.
**Green this capture:** build ✓ · verify ✓ · verify:server ✓ · verify:tools ✓ · verify-ai ✓ (grounding validator; live turn skipped).

| Module | Lines | Notes |
|---|---|---|
| `src/model.ts` | 1542 | deterministic services (baseline) |
| `src/App.tsx` | 953 | three panes: queue · ledger · chat + floor placeholder |
| `src/orchestrator.ts` | 923 | scripted reduce/turns |
| `src/generated/solver-artifacts.ts` | 447 | frozen Gurobi output |
| `src/LedgerView.tsx` | 357 | ledger rendering |
| `src/verify.ts` | 335 | baseline + plan + solver assertions |
| `src/plan.ts` | 124 | production plan, ship-day normalisation, recovery |
| `src/shared/contracts.ts` | 129 | server⇄client contracts, override event |
| `src/solver.ts` | 60 | typed runtime seam |
| `server/tools/registry.ts` | 479 | typed tool adapters |
| `server/orchestrators/investigate.ts` | 153 | read-only grounded investigate |
| `server/chat.ts` | 147 | route → AI → scripted fallback |
| `server/router/router.ts` / `taxonomy.ts` | 129 / 94 | deterministic intent router |
| `server/model/client.ts` | 109 | sciforium DeepSeek client |
| `server/runs/store.ts` | 92 | in-memory run/record store |
| `server/tools/gateway.ts` | 93 | authorization + execution |
| `server/audit/log.ts` | 18 | JSONL audit → `var/audit/` |
| `tools/gurobi/*` | 642 | allocate, schedule, generate_ts, common |
| `tools/coolit-test.ts`, `tools/sample-run.ts` | 156 | fixture + sample run |

---

## 4. Notion inventory (last-edited, blocks)

| Page | Edited (Z) | Blocks |
|---|---|---|
| COOLIT Data Improvement Plan | 02:54 | 212 |
| Commitment Ledger & Cross-Pane Design | 02:04 | 160 |
| Right-Pane Conversation (Copilot) Design | 01:55 | — |
| Right-Pane Copilot: Persona Views | 01:57 | — |
| AI Chat Build Plan | 02:04 | 200 |
| Algorithms, Allocation & Replay | 02:43 | 90 |
| Data Model & Synthetic Fixtures | 02:44 | 47 |
| Demo, Testing & Validation | 02:05 | 47 |
| Personas & Governance | 02:45 | 61 |
| UI/UX Layout & Interaction Spec | 03:08 | 108 |
| Execution Task List | 03:23 | 47 |
| General Task List | 03:50 | 56 |
| Open Item List | 03:09 | 31 |
| Design List | 03:09 | 23 |
| Algorithms Build Design | 02:37 | 163 |
| Data, Algorithm, Testing & Deployment Plan | 02:40 | 175 |
| **COOLIT Synthetic Enterprise Data v3** | 03:01 | 48 |
| **Algorithm Input Bundle v1 (AIB)** | 03:04 | 29 |
| **Data Improvement Plan v2.1 (ERP · CRM · MES-Embedded)** | 03:04 | 55 |
| **Context & Region Projections Execution Plan** | 03:23 | 93 |
| Product Management | 03:23 | 142 |
| Stock-take (this page) | 02:44 | 40 |

---

## 5. Changes since the first stock-take (02:44)

- **New pages (4):** COOLIT v3 data, AIB v1, Data Improvement Plan v2.1, Context & Region Projections Execution Plan (Stream CP).
- **Grew:** COOLIT plan 204→212; UI/UX 96→108; Execution Task List 35→47; PM 137→142; Algorithms 49→90.
- **Registers reset:** General Task List 115→56, Open Item List 117→31, Design List 23→23 — i.e. the v3 additions in the Notion registers were **lost**; the v3 task content now lives in the dedicated v3/AIB/v2.1 pages.
- **Build advanced:** server control plane, plan.ts, contracts, audit log, sample run.

---

## 6. Risks & conflicts

| # | Risk | Impact |
|---|---|---|
| R1 | Registers reset → v3 task rows lost from task lists | High |
| R2 | Notion ⇄ local drift per page; refresh either way can clobber | High |
| R3 | v3.1 data (174 datasets) not yet consumed by `src/`/`server/` — build still on v2 fixture | High |
| R4 | Floor plan is a UI placeholder though zone data/geometry are ready | Medium |
| R5 | Governance enforcement (G-04/G-05) and audience separation not in the build | Medium |
| R6 | Multiple task trackers (Execution, General, Delivery, CP plan) overlap | Medium |
| R7 | Live AI untested (no key / flag off) | Medium |
| R8 | Flattened tables / nesting from earlier edits | Low–Medium |

---

## 7. Code-capability truth (verified 2026-09-27)

Searched the working tree (`src/`, `server/`) for each capability.

| Capability | In code? | Evidence |
|---|---|---|
| Deterministic solver lane (Gurobi, build time) | ✅ | `tools/gurobi/*`, `src/solver.ts`, `src/generated/solver-artifacts.ts` |
| Runtime production plan (ship-day normalisation, recovery) | ✅ | `src/plan.ts`; `productionPlan` used by `plan.ts` + `verify.ts` |
| Decision-memory layer (M0 slice) | ✅ | `src/memory.ts` (4 modules reference `memory`) |
| Server AI control plane (router · tools · orchestrator · model client · audit) | ✅ | `server/*`; `verify:server` / `verify:tools` / `verify:ai` green |
| Four-region UI + nine-column order table | ✅ | `src/App.tsx`, `src/LedgerView.tsx`, `src/ledger.ts` |
| Human-override event + rejection codes | ✅ | `src/shared/contracts.ts` (`HumanOverrideEvent`, `RejectionCode`) |
| **Floor-plan SVG render** | ⬜ | `App.tsx` shows the Layout pane **placeholder** ("SVG render pending UT-02") |
| CRM request layer (`requestedDate`) | ⬜ | no matches in `src`/`server` |
| Zone / Routing / ShipCalendar masters in code | ⬜ | no matches (`zone` only as a solver field + placeholder text) |
| MES entities (WorkOrder / ShiftHandover / certs) | ⬜ | no matches |
| EAM entities (MWO / restoration / calibration) | ⬜ | no matches |
| `constraintClass` / `constraintShortfall` (D-04) | ⬜ | no matches (still `shortfall`) |
| `NumberRef` provenance (K-05) | ⬜ | no matches |
| `OptimizationPort` seam (K-09) | ⬜ | no matches |
| `DecisionDiff` / run diff | ⬜ | no matches |
| Disclosure enforcement (G-05) | ⬜ | `disclosure` appears in 1 file (doc/contract), no runtime gate |

**Read:** the **solver + memory + server + UI structure** are real; everything the **v3.1 data pack** carries (zones, routing, requested dates, MES/EAM) is **not yet consumed by code**.

---

## 8. Next actions

1. **Wire v3.1 into the read model** (`src/` + `server/`) — biggest gap between data and build (R3).
2. **Render the floor plan SVG (UT-02)** from zone_master/zone_assignment/zone_route (R4).
3. **Reconcile the registers** — restore or re-derive the lost v3 task rows; pick one detailed tracker (R1, R6).
4. **Enforce governance** G-04/G-05 in the server policy layer (R5).
5. **Run a live AI turn** with `FEATURE_AI_CHAT=1` + key and record the result (R7).
6. **Freeze a source of truth per page** and append-only edits for shared pages (R2).

---

## 8. Build & test closure (2026-09-27)

- **Closed.** Added `tools/fixture-lint.ts` (`npm run lint`) and an aggregate fail-closed gate: `npm test` = verify · verify:server · verify:tools · verify:ai · test:coolit · lint; `npm run ci` = build + test.
- **`npm run ci` is green:** build ✓ · verify ✓ · verify:server ✓ · verify:tools ✓ · verify:ai ✓ · test:coolit **16/16** ✓ · fixture lint **4 commitments · 46 memories · 46 edges** ✓.
- **Already in place:** the N-01 ship-day inversion (verify asserts `promiseIsShipDay=false`, `normalizedPromise=2026-10-12`) and the decision-memory reference lint.
- **Still open (non-build):** persona acceptance harness (T-12); AIB v1 wire-in to `test:coolit` (B-06/B-19) — the schedule still uses the provisional routing fixture.

---

## 9. Change log

| Version | Date | Change |
|---|---|---|
| v0.1 | 2026-09-26 | Notion-only stock-take: inventory, activity, drift, risks |
| v0.2 | 2026-09-26 | Re-scoped to **build + Notion** across all areas: server control plane, v3.1 data, per-area status, build inventory, refreshed Notion inventory, register reset, next actions |
| v0.3 | 2026-09-27 | Convergence pass: published the independent docs (agentic-memory ×2, chatbot gap plans ×2, migration note, status/roadmap, sample run, context projections); archived 5 accidental duplicates; corrected the "floor built" claim across the hub/registers (Layout pane built, **SVG render pending UT-02**) |
| v0.4 | 2026-09-27 | Added the verified **code-capability truth** table (what is in `src`/`server` vs the v3.1 data pack); refreshed Demo/Testing with the live suites and corrected UI/UX §3 |
| v0.5 | 2026-09-27 | **Build & test closed** — added fixture lint + aggregate gate; `npm run ci` green; documented in §8 |