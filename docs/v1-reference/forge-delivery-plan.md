# FORGE Decision Room — Data, Algorithm, Testing & Deployment Plan

> Consolidated delivery plan derived from a full read of the working tree (`src/*.ts`, `src/*.tsx`, `verify.ts`) and the design set (`notion/*.md`, `docs/*.md`). Covers four streams — **Data · Algorithm · Testing · Deployment** — grounded in the actual code, answering the 25-defect register and the three algorithm families (demand, production, shift execution).

| Field | Value |
|---|---|
| Document | FORGE Decision Room — Data, Algorithm, Testing & Deployment Plan |
| Version | v0.1 |
| Status | 🟡 Recommendation — for review |
| Ground truth | `src/` working tree · `npm run verify` = green (baseline only) |
| Snapshot | `SNAP-20260926-0815` · master set `MS-2026-09-26` |
| Model | `ctp-0.2.0` → target `ctp-0.3.0` · code `decision-services@0.1.0` |
| Companions | `forge-coolit-data-improvement-plan.md` · `forge-status-and-roadmap.md` · `notion/forge-algorithms-build-design.md` |
| Last updated | 2026-09-26 |

---

## 0. Plan on a page

**What exists (measured):** 5 service modules (`model.ts` 1542 · `orchestrator.ts` 923 · `ledger.ts` 270 · `master.ts` 210 · `verify.ts` 288) + UI (`App.tsx` 934 · `LedgerView.tsx` 212). Green `verify` asserts the baseline fixture: capacity `304`, pegs `[200, 48, 56]`, COM-1042 shortfall `64` → ship `2026-10-19`, COM-1018 material shortfall `68`, the ERP/WMS conflict quarantined, the governance chain approval → dry-run → execute → receipt → outcome. It is a **deterministic feasibility record**, not yet a plant operating record.

**Four streams, one rule:** the centre pane is the record; every number is a `NumberRef`; the same `(snapshot_hash, master_set_version, model_version)` reproduces byte-identical output.

| Stream | Goal | First move | Exit proof |
|---|---|---|---|
| **Data** | Complete the four seams (CRM, MES, EAM, shop floor) and the algorithm-layer entities | Kernel types + master expansion + fixture additions | Fixture lint: every referenced id resolves; every master effectivity covers as-of |
| **Algorithm** | Kernel + demand (A) / production (B) / shift execution (C) behind an `OptimizationPort` | Determinism kernel + generic capability evaluator | Golden hashes; `304` recomputed from segments |
| **Testing** | Machine-check every invariant, including the ones green currently hides | Extend `verify.ts`; invert N-01 | `npm run verify` + `npm test` + e2e all green |
| **Deployment** | Ship the static SPA now; optional Node server tier only for AI chat, fail-closed | `npm run build` gate in CI; feature-flagged server | Static build reproducible; AI chat degrades to scripted mode |

**Critical path:** Kernel/Data-K0 → capability+calendar (K1) → demand seam (M2) ∥ floor foundation (M1) → execution/availability/capacity (M3/M4/M5) → governance (M6) → assurance (M7). AI chat (server tier) trails, feature-flagged.

---

## 1. Data plan

### 1.1 Data classes (extended)

| Class | Glyph | Changes by | Axis | New members |
|---|---|---|---|---|
| Master / reference | `§` | change control | version + effectivity | Zone, Routing, ShipCalendar, expanded Resource, ApprovalAuthority, CausalCodeMap |
| Transaction | `●` | event | freshness + observed/ingested | WorkOrder, ShiftHandover, OperatorCertification, MaintenanceWorkOrder, RestorationFact, CalibrationRecord, HumanOverrideEvent |
| Derived | `∑` | recompute | formula + trace id | NumberRef, DemandRequirement, NetRow+Peg, WorkOrderSchedule, CoverageAssignment, Explanation |
| Conflict / missing | `⇄` `∅` | relationship/absence | disposition | unchanged (ERP⇄WMS, missing waiver) |
| **Uncertainty (new)** | `~` | method version | confidence + basis | UncertaintyFact (discrete / empirical / interval) |
| **Capability (new)** | `◆` | event + calendar | effective interval | CapabilityInterval (derate windows) |

Rule unchanged: a master is never "stale" (it is current/effective-from/superseded); a transaction is never "superseded" (it is fresh/stale). Adding `UncertaintyFact` and `CapabilityInterval` must not blur those axes.

### 1.2 Entity additions by workstream

| Entity | Layer | Key fields | Workstream | Store | Source of truth |
|---|---|---|---|---|---|
| Commitment (changed) | ERP/CRM | + requestedDate, orderRef, customerPriority, shipCalendarId, commercial value | W1 | in-memory fixture → run store | CRM (requested), ERP (promised) |
| DemandRecord / DemandRequirement | CRM/derived | ladder rung, firmness, priorityKey, dueDate | W1 / A | fixture | CRM + policy master |
| Zone | master | zoneId, label, products, resources, floorX/floorY | W4 | `master.ts` | Data modelling |
| Resource (changed) | master | + zoneId, qualifiedProducts, demonstratedRate, changeoverMin, shifts, calibrationDue, criticality, mtbfHrs, mttrHrs | W4 | `master.ts` | Maintenance |
| Routing | master | routingId, product, operations[]={seq, resourceId, stdRate, setupMin} | W4 | `master.ts` | Manufacturing |
| ShipCalendar | master | calendarId, working days, cut-off, non-shipping days | W5 | `master.ts` | Operations |
| CapabilityInterval | derived | resourceId, from/to, ratePerDay, derate, causeId, evidenceRef | W5 / B | recompute | EAM events + calendar |
| WorkOrder / WorkOrderSchedule | MES/derived | woId, commitmentId, routingOp, resourceId, zoneId, qtyStarted/Completed/Scrapped, status, shift, planned/actual, operatorId | W2 / B+C | fixture + event log | MES |
| ShiftHandover | MES | handoverId, zoneId, at, wip, openIssues, escalations, sourceEventIds | W2 / C | derived | WO events |
| OperatorCertification | MES/HR | operatorId, name, resourceId, certId, validFrom/To, shift | W2 / C | fixture | HR/MES |
| MaintenanceWorkOrder | EAM | mwoId, resourceId, type, failureMode, rootCauseCode, priority, technician, parts, planned/actual, status | W3 | fixture | EAM |
| RestorationFact | EAM | resourceId, observedRate, restoredAt, evidence | W3 | event | MES/EAM observation |
| CalibrationRecord | QMS | resourceId, calibratedAt, dueAt, status | W3 | fixture | QMS |
| ApprovalAuthority | policy | authorityId (finance/quality/program/procurement), resolvesOn, owner, expiry | W6 | policy master | Governance |
| HumanOverrideEvent | governance | recommended vs selected, code, rationale, actor, snapshot | W6 | event log | decision room |
| NumberRef / Explanation / CausalCodeMap | kernel/derived | provenance + explanation + code map | all | derived | kernel |

### 1.3 Master-set expansion (`MS-2026-09-26` → next)

Add once K1 lands, each with version + effectivity so `validityOf()` covers the as-of:

- **item:** ITEM-RM-42, ITEM-CDU-2400, ITEM-MV-14, ITEM-MV-14B
- **routing:** RT-CPL480, RT-CPL320, RT-RM42, RT-CDU2400 (operations → resources)
- **resource:** RES-ASM-01/02, RES-ELEC-01, RES-QC-01, RES-SHIP-01 (+ existing RES-LT-01, RES-FT-02)
- **zone:** Z-ASM, Z-LT, Z-FT, Z-ELEC, Z-QC, Z-SHIP (mapped to the floor-plan zones in the UI/UX spec)
- **calendar:** SHIP-CAL-YYC, SHIFT-CAL-YYC
- **party:** Northline / BrightGrid / Helios customer masters
- **commercial:** margin/penalty card, customer priority policy
- **policy:** approval matrix, disclosure policy, ship-day rule
- **asset:** ASSET-LT-01 + peers (criticality / MTBF / MTTR)

Every routing operation must name a valid resource; every resource exactly one zone (invariant 1/2 of the extended governance set).

### 1.4 Fixture additions per workstream (concrete ids)

- **W1:** `SRC-1042-REQ`, `SRC-1018-REQ`, `SRC-1104-REQ`, `SRC-0991-REQ` (requested date per commitment); `SRC-1042-VALUE` (commercial value, redacted from shop-floor roles).
- **W2:** work orders `WO-1042-ASM-01`, `WO-1042-LT-01`, `WO-1018-ASM-01`, `WO-1018-FT-01`, `WO-1104-ASM-01`, `WO-1104-LT-01`, `WO-0991-ASM-01`; handovers `SHF-2026-09-26-N`, `SHF-2026-09-26-M`; certs `CERT-OP-114`, `CERT-OP-207` (lapses 2026-10-01 → in-window coverage gate).
- **W3:** `MWO-LT-041` (CM seal leak), `MWO-LT-038` (PM deferred), `CAL-LT-2026-08`, `REST-LT-01` (16→32/day, pending observation); maintenance options `MNT-MOVE-WINDOW`, `MNT-SHORTEN`, `MNT-DEFER-PM` (hard-gated), `MNT-EXPEDITE-PART` (finance).
- **W4:** zone→resource and product→routing assignments (tables above).
- **W5:** ship calendar; day bins; derived COM-1018 date; COM-0991 November treatment (model or declare out).
- **W7 integrity:** materialise `OPT-RESERVE-SLOTS` or repoint the seeded COM-1104 approval (D-03); add a second stale record + one source-down example (D-21).

### 1.5 Stores & persistence

| Store | Today | Target | Contract |
|---|---|---|---|
| Fixture | TS modules (compile-time) | unchanged for demo | deterministic, id-stable |
| Run store | in-memory `Thread.runs` | JSONL append-only `DecisionRun` + `SolverRunEvent` | immutable, replayable, keyed by run id |
| Audit log | none | JSONL `var/audit/{date}.jsonl` | turn/route/tool/run/policy, trace ids |
| Governed records | in-memory arrays | append-only (approvals, receipts, outcomes, overrides) | never mutated |
| Snapshot hash | none | `sha256(JCS(...))` Merkle root over masters + transactions | input to every run key |

Upgrade path: JSONL first (audit source of truth) → SQLite for query/replay if needed. Do **not** introduce a DB before the audit log proves insufficient.

### 1.6 Data governance rules

1. No orphan numbers — every displayed value is a `NumberRef` resolving to a record id or master version.
2. No transaction without source + observed-at + ingested-at; no master without version + effectivity.
3. Held / failed / expired / unqualified supply is never eligible; conflicts are never auto-resolved.
4. Derived data is recomputed, never hand-entered (includes simulation metrics and explanations).
5. Redacted fields render "not authorized", never "absent", and are stripped before prompt construction.
6. Every master reference cited by a run must have effectivity covering the snapshot as-of.

### 1.7 Versioning & migration

- `MODEL_VERSION ctp-0.2.0 → ctp-0.3.0` on the algorithm/kernel change (N-05: the `shortfall` refactor touches the reproducibility hash).
- Keep read-compatible aliases for `DecisionRun.shortfall` → `constraintClass` + `constraintShortfall`.
- Master set is monotonic: any edit mints a new `master_set_version`; stale runs cannot execute (CAS).
- Publish a migration note with the first golden-hash baseline so run diffs are intentional.

### 1.8 Data quality gates

- Fixture lint: every referenced id resolves (option/approval/receipt/WO/master); every fact has source+timestamps; every commitment has a routing; every resource has exactly one zone; effectivity covers as-of.
- One dangling reference **fails the build** (M7).

---

## 2. Algorithm plan

### 2.1 Shared kernel (build first)

- Pure functions `plan(baseline, scenario, modelVersion) -> Run`; no `Date.now()`, `Math.random()`, object/`Map` iteration order, or `localeCompare`.
- Canonical JSON (RFC 8785 JCS) + SHA-256 Merkle root; `NumberRef` provenance on every number.
- Event-sourced run lifecycle: `Queued → Snapshot validation → Model build → Presolve → Search → Candidate validation → Causal translation → Evidence packaging → Complete`; terminal states `OPTIMAL · FEASIBLE_WITHIN_POLICY_GAP · TIME_LIMIT_WITH_FEASIBLE_RESULT · TIME_LIMIT_NO_FEASIBLE_RESULT · PROVEN_INFEASIBLE · STALE · CANCELLED · FAILED`.
- `OptimizationPort` seam; CAP: timeout-with-no-solution is never "proven infeasible", `OPTIMAL` only when `gap ≤ policyGap`.

### 2.2 Family A — Demand planning

| Step | Algorithm | Determinism |
|---|---|---|
| Forecast | method-per-regime (smooth→ETS/Theta; intermittent→TSB; erratic→SBA; sparse→ADIDA; covariates→GBM) | fitted coefficients are a **versioned master**; serving is pure arithmetic |
| Uncertainty | conformal P10/P50/P90 over rolling CV; MASE + bias + FVA (never MAPE) | fixed CV windows, quantized output |
| Priority | lexicographic `OrderingKey [tier, marginBand, requestedDate, customerRank, id]` | every element from a versioned master; final tie-break on id |
| Deltas | `requestToPromise`, `promiseToCapable`, `capableToRequested` | queue sorts by `capableToRequested` |
| Netting (MRP) | `net[t]=max(0, gross+SS−onHand−schedReceipts)`; peg-first | stable sort `(needDate, priority, id)` |
| Eligibility | `min(ERP,WMS) − held − expired − failed − unqualified`; delta quarantined; alternates as separate pool | preserves `CNF-QD-220` |
| Boundary | emit dated `DemandRequirement`; consume production `capableDate` | shared `ShipCalendar` |

Deliverable is pure TS (no solver). First proof: ledger shows requested→promised→capable triple with delta arithmetic asserted.

### 2.3 Family B — Production planning

| Step | Algorithm | Determinism |
|---|---|---|
| Capacity | `capacity(resource,t)=baseRate×Πderate(t)×shiftFactor(t)` from `CapabilityInterval` | golden `304` recomputed from segments; product-of-derates same resource, min across series resources |
| Schedule | flexible job-shop, optional intervals, `NoOverlap`, circuit sequence-dependent changeover, material reservoir, pinned frozen horizon | small→CP-SAT exact; medium→CP-SAT+warm-start/timeout; large→shifting-bottleneck + local search |
| Objective | integer lexicographic: weighted tardiness → makespan → setup/WIP, with `ε·Σ idOrdinal` tie-break | no floats; `threads=1`, fixed seed |
| Dates | `ship = nextShipDay(recovery completion, ShipCalendar)` | fixes D-05/D-06; inverts N-01 |
| Scenarios | `SimSpec` edits (move/split/defer window, add shift, expedite, substitute); optional seeded DES with common random numbers | paired deltas; simulation never sets official quantities |

Toolchain (ADR-001): **Gurobi 12.0.3 at build time** (deterministic pins: seed 0, threads 1, method 2, gap 0, work-limit) produces a frozen, fingerprinted artifact (`src/generated/solver-artifacts.ts`) that the pure-TS runtime reads; live WASM/server solving is an optimisation behind `OptimizationPort`. Harness: `tools/gurobi/` (`npm run solver`).

### 2.4 Family C — Shift execution

| Step | Algorithm | Determinism |
|---|---|---|
| WO lifecycle | append-only state machine `planned→released→dispatched→in_progress→paused⇄/gated→complete→closed` | state = fold over events; baseline never mutated |
| Dispatch | eligibility filter → critical ratio → EDD → SPT → setup grouping; bottleneck (DBR) first | re-dispatch within the shift's frozen window; triggers emit events |
| Handover | fold all zone events in `(lastHandover, at]` → wip/openIssues/escalations + `sourceEventIds` | derived, never typed; carry-forward + acknowledgment |
| Coverage | per-shift cert validity (`validFrom ≤ start ∧ validTo ≥ end`); expiring cert → `CoverageGate` → `gated` | stable sort `(−skillMatch, certDaysRemaining, startDate, operatorId)` |
| Overtime | base shifts first; over `FINANCE_THRESHOLD_CAD` → named approval (requester ≠ approver) | fixes N-04/A5 |
| Rostering | small: greedy + local search / min-cost flow; scale: column generation / CP-SAT | set-covering (`≥`), not partitioning |
| Re-plan | receding horizon per shift; new immutable run + `DecisionDiff` | never edits the baseline |

### 2.5 Algorithm acceptance per family

- **A:** requested ≤ promised ≤ capable ordering where applicable; delta arithmetic asserted; forecast reproducible across two runs.
- **B:** day-bin totals equal the window total; no promise on a non-working day passes; `304` recomputed from segments; frozen-horizon ops never displaced; timeout ≠ infeasible.
- **C:** handover delta computable; expiring cert raises a gate; WO quantities reconcile with pegs; overtime over threshold routes to Finance and cannot be self-approved.

### 2.6 Performance & scale budgets

- Deterministic services: **< 50 ms** per commitment (pure functions, in-memory).
- Scenario run card: phase stream with simulated latency; result is deterministic and cached by run key.
- Offline solver (were it live): policy gap + time limit, status reported honestly.

---

## 3. Testing plan

### 3.1 What `verify.ts` covers today (baseline green)

Capacity `304` (192+112); pegs `[FROZEN 200, COM-1104 48, COM-1042 56]`; COM-1042 infeasible short 64 ship 2026-10-19; eligible `280`; conflict quarantined; stale waiver; frozen baseline; 6 alternatives with cost 6624; the governance chain (self-approval refused, proposal-only role cannot record approval, dry-run before execute, idempotency); ledger projections (constraint class/units, lanes, deltas); master validity.

**Known gap:** `verify.ts:224` asserts `assess("COM-1104").baseline.feasibility === "feasible"` for a Saturday promise — **a test that encodes defect N-01**. Green currently hides D-05.

### 3.2 Test layers (target)

| Layer | Covers | Tool | Status |
|---|---|---|---|
| Deterministic services | capacity, allocation, dates, feasibility, scenarios | `npm run verify` (`tsx src/verify.ts`) | Exists, extend |
| Invariant tests | authority separation, disclosure, ship-day, shortfall typing, timeout semantics | `verify.ts` (W8) | Build |
| Fixture lint | dangling ids, source+timestamps, routing completeness, zone uniqueness, effectivity | new `src/lint.ts` | Build |
| Kernel/property | shuffle input arrays/key order → identical hash; bump any field → hash changes; TZ/locale/thread invariance | `npm test` (new) | Build |
| Replay | fold event stream → re-solve → identical `canonicalResult` | `npm test` | Build |
| Router | taxonomy classification, slots, authorized tool subset, fail-closed | `server/**/*.test.ts` | Optional (server tier) |
| Tools | schema round-trip, authz rejection, timeout, idempotency, fixture equality | `npm test` | Optional |
| Grounding | every number maps to a fact/calc/run; fabricated number rejected | server suite | Optional |
| Security | cross-tenant isolation, unauthorized field returns nothing, injection cannot authorize | server suite | Optional |
| Cross-pane | same `(activeContext, role)` renders same four panes; deep-link rebuild | component tests | Build (UI) |
| Persona acceptance | criteria 1–10 per role | scripted + manual | Build |
| E2E | risk → scenario → compare → approval → dry-run → execute → reconcile → outcome | `npm run test:e2e` | Build |

### 3.3 New tests to author (by family, concrete)

**Kernel/data**
- `capacity()` recomputed from `CapabilityInterval` equals golden `304`.
- Canonical hash: run twice → identical; shuffle fixture order → identical; mutate `master_set_version` → different.
- `NumberRef` completeness: every ledger cell value has ≥1 `derivedFrom` id (no orphan numbers).
- Fixture lint: assert zero dangling ids; assert every resource in exactly one zone; assert effectivity covers as-of.

**A (demand)**
- requested → promised (W1 CRM fact) → capable delta arithmetic equals the ledger triple.
- Queue sorted ascending by `capableToRequested`, then priority key, then id.
- MRP: Σ pegs per supply = consumed supply; Σ pegs per demand = allocated demand.
- Eligibility: held lot `LOT-8841` (36 pcs) never increases eligible qty; ERP/WMS delta stays quarantined.

**B (production)**
- Day bins sum to window total; time-phased allocation differs from window-wide greedy only where expected.
- No promise lands on a non-working ship day unnoticed (COM-1104 Saturday) — **invert N-01**.
- COM-1018 ship date derived, not literal `2026-10-21`.
- Frozen-horizon ops pinned; a timeout with no incumbent maps to `TIME_LIMIT_NO_FEASIBLE_RESULT`.

**C (shift execution)**
- WO lifecycle rejects illegal transitions; `paused` ≠ `gated`; gated never silently resumes.
- Handover delta from a fixed event set is exact; unmatched id fails.
- Expiring cert `CERT-OP-207` (2026-10-01) raises a coverage gate inside the window.
- Overtime over threshold cannot be self-approved; routes to Finance authority.

**Governance/reproducibility**
- Authority separation: a manufacturing-manager approval never satisfies Finance/Quality/Program.
- Redaction asserted before explanation render/prompt; redacted field ≠ absent.
- CAS: stale `(snapshot, master_set, seed)` rejects execute; rebase yields v2 with a visible diff.

### 3.4 Golden thread & fixtures

One end-to-end golden thread (`SNAP-20260926-0815`): Manufacturing manager orients COM-1042 → why → scenario → compare → select third shift → request approval → (Shift planner cannot approve) → dry run → execute → receipt → outcome (not successful). Freeze `canonicalResult` as a golden hash. Keep the offline fallback fixture for a source-down demo.

### 3.5 Tooling & CI

- `npm run verify` (exists) — deterministic services.
- `npm test` (new) — property, replay, kernel tests (`tsx` runner or `node --test`).
- `npm run lint:fixtures` (new) — fixture lint; fail on any dangling id.
- `npm run test:e2e` (new) — demo thread.
- CI: `tsc --noEmit` → `verify` → `test` → `lint:fixtures` → `vite build` → e2e. A single dangling reference fails the build (M7).

### 3.6 Acceptance mapping

- Ledger A1–A12; persona criteria 1–10; ledger invariants 1–12; right-pane invariants 1–21.
- Record current pass/fail at the M0 gate; target the full set at M7.
- Defect policy: every defect closed with a test that fails before the fix and passes after; N-01 is the template.

---

## 4. Deployment plan

### 4.1 Current posture (verified)

- **Static SPA**: Vite + React 19 + TypeScript. `npm run dev` (port 5173, strict), `npm run build` = `tsc --noEmit && vite build`, `npm run verify` = `tsx src/verify.ts`.
- **No backend, no model key, no database.** All data is compile-time fixture modules. Deployment is trivially the built `dist/` on any static host.
- This is a strength for the demo (deterministic, reproducible, offline-capable) and the reason the algorithm layer must stay solver-light and browser-safe.

### 4.2 Environment strategy

| Env | Command | Serves | Notes |
|---|---|---|---|
| Dev | `npm run dev` | Vite dev server | strict port 5173 |
| Verify | `npm run verify` | tsx | gate before build |
| Static prod | `npm run build` → `dist/` | static host / CDN | client-only; AI chat off or proxy |
| Optional server | `npm start` (new) | Node + TS (Hono/Express) serving `dist/` + `/api` | only for AI chat; key server-side |

### 4.3 Optional server topology (AI chat build plan, feature-flagged)

Only if the AI copilot ships: add a Node tier holding the model key and policy. Endpoints `POST /api/chat/turn`, SSE `/api/chat/turn`, `GET/SSE /api/runs/{id}`. The model never holds DB creds, never calculates official numbers, and can call only its authorized tool subset through the typed-tool gateway. **Fail closed:** missing `LLM_*` config or `FEATURE_AI_CHAT=false` → the existing scripted `orchestrator.reduce()` path, clearly labelled.

Config: `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_MAX_TOKENS`, `FEATURE_AI_CHAT`.

### 4.4 Versioning & release

- Every build publishes `(model_version, code_version)`; a model bump is a semver + build-artifact hash.
- The snapshot/master set are pinned in the run key; changing them invalidates (not mutates) runs.
- The run-hash contract change (`shortfall` → `constraintClass`) ships with N-05's migration note and a `modelVersion` bump.
- Golden hashes are the release gate: a diff in `canonicalResult` for an unchanged input fails CI.

### 4.5 Observability & audit

- Append-only JSONL audit: request/turn id, role, envelope hash, route decision, tool calls + args + result refs, prompt/model versions, run events, policy decisions, validation result, latency, trace id.
- Run store: immutable `DecisionRun` + `SolverRunEvent` stream, replayable by id.
- UI run card is a durable card (phase · elapsed · incumbent · validated alternatives · gap when meaningful), never a spinner; `TIME_LIMIT_NO_FEASIBLE_RESULT` never renders as "infeasible".

### 4.6 Security

- Model key server-side only; never in the client bundle.
- Redaction happens before prompt construction and before logging; "not authorized" ≠ "absent".
- Retrieved/unstructured text is untrusted; prompt injection cannot authorize an action or override structured authority.
- Cross-tenant/unauthorized-field requests return nothing. Tenant `TENANT-COOLIT-SYNTH`, site `SITE-YYC-01` scoped.

### 4.7 CI/CD pipeline

```
install → tsc --noEmit → npm run verify → npm test → npm run lint:fixtures
        → vite build → npm run test:e2e (optional server) → publish dist/
```

No secrets in the static build. A single dangling id or a golden-hash drift fails the pipeline.

### 4.8 Rollout, rollback, fallback

- **Rollout:** static build first; server tier only behind `FEATURE_AI_CHAT`.
- **Rollback:** revert the build; baselines are immutable, so no data rollback is needed — only run invalidation.
- **Fallback:** source-down or model-unavailable → scripted mode + explicit inline error (`ERP unreachable · last sync 12:40`), never a silent blank.
- **Demo mode:** seeded fixture with a deterministic golden thread; offline-capable (no network required for the core arc).

### 4.9 Ops runbook (thin)

- Re-run a stale run → `rebase` → v2 with diff.
- Cancel a long run → `CANCELLED`, incumbent preserved.
- Audit query → JSONL by trace id.
- Health: `verify` + `lint:fixtures` are the smoke tests.

---

## 5. Sequencing & milestones

| Milestone | Data | Algorithm | Testing | Deployment |
|---|---|---|---|---|
| **K0 — Kernel** | NumberRef, canonical hash, event log | determinism contract; invert N-01 test | property + golden-hash tests | `npm test` in CI |
| **K1 — Capability/calendar** | CapabilityInterval, ShipCalendar | generic `available()`; golden `304` | segment-sum test | — |
| **M1 — Floor** | Zone/Routing/Resource masters | routing→zone resolution | lint: routing completeness, zone uniqueness | — |
| **M2 — Demand** | W1 requested layer, DemandRecord | Family A (forecast→MRP→deltas→pegs) | delta + peg conservation | — |
| **M3 — Execution** | W2 WO/handover/certs | Family C lifecycle, dispatch, coverage | lifecycle + handover + cert gate | — |
| **M4 — Availability** | W3 EAM/PM/calibration/restoration | capability derates + window options | PM/calibration gate, restoration evidence | — |
| **M5 — Capacity rigour** | W5 ship calendar, day bins | Family B scheduling, derived dates | day-bin sum; ship-day; invert N-01 | — |
| **M6 — Governance** | W6 authorities, override, disclosure | Explanation + causal-code map | authority separation; redaction | — |
| **M7 — Assurance** | fixture lint green | — | full acceptance; replay; e2e | CI gate enforced |
| **AI chat (opt.)** | audit log, contracts | router + tools + validator | server test suite | server tier, feature-flagged |

---

## 6. Owners (by function)

| Stream | Responsible | Accountable |
|---|---|---|
| Data modelling (ERP/CRM/MES/EAM) | Backend / API + Data modelling | Engineering owner |
| Algorithm kernel + families | AI / reasoning | Engineering owner |
| Verification / lint | Backend / API (verification) | Engineering owner |
| Deployment / CI / server tier | Backend / API | Engineering owner |
| Persona acceptance / demo | Product Management + Business / pitch | Product owner |

---

## 7. Open decisions

1. **Solver seam now vs later** — recommend precomputed canonical schedules now, `OptimizationPort` later.
2. **Forecast vs explicit records** — fixture has no history; recommend records-only until real history exists.
3. **Uncertainty depth** — deterministic scenarios + paired deltas first; robust Γ / chance constraints only if the demo needs them.
4. **DES** — defer until after M5; hand-rolled seeded kernel only.
5. **Backend allowed for AI chat?** — if the demo must stay static-only, AI chat is scripted-only (no model key).
6. **Persistence** — JSONL audit now; SQLite only if replay queries demand it.
7. **Model bump** — confirm `ctp-0.3.0` + migration note for the `shortfall` → `constraintClass` refactor (N-05).

---

## 8. Change log

| Version | Date | Change |
|---|---|---|
| v0.1 | 2026-09-26 | Consolidated data, algorithm, testing and deployment plan from a full read of `src/` and the design set; grounded in the current `verify` coverage and the 25-defect register |