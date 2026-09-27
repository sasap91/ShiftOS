# FORGE Decision Room — Algorithm Build Design (Demand · Production · Shift)

> Algorithm-expert recommendation for building the three decision algorithm families on top of the existing deterministic decision services. Synthesised from 13 domain-expert research passes (forecasting, S&OP/CPIM, MRP, finite-capacity scheduling, MIP/OR, CP-SAT, DES, MES/ISA-95, workforce rostering, APS vendors, reproducibility, HITL explainability, RCM/availability, robust optimisation). Companion to `forge-algorithms-replay.md` (the placeholder skeleton this fills in).

| Field | Value |
|---|---|
| Document | FORGE Decision Room — Algorithm Build Design |
| Version | v0.1 |
| Status | 🟡 Recommendation — for review |
| Owner | AI / reasoning + Backend / API |
| Ground truth | `src/model.ts` · `src/master.ts` · `src/orchestrator.ts` · `src/verify.ts` |
| Model | `ctp-0.2.0` → target `ctp-0.3.0` · code `decision-services@0.1.0` |
| Snapshot | `SNAP-20260926-0815` · master set `MS-2026-09-26` |
| Last updated | 2026-09-26 |

---

## 0. The one-page answer

Build **one shared deterministic kernel** and three thin algorithm families on top of it. Do not build three engines.

1. **Everything is a pure function of `(snapshot_hash, master_set_version, model_version)`.** No `Date.now()`, no `Math.random()`, no object/`Map` iteration order, no locale collation, no floats in decision keys. Reproducibility is the product's differentiator, not a nice-to-have.
2. **Add a `NumberRef` provenance type** so every user-facing number carries the record ids / master version it came from — this is how the existing "no orphan numbers" invariant survives three new algorithm families.
3. **Time-phase before you optimise.** Replace `leakTestCapacity()` (a closed-form literal) with a generic capability evaluator `capacity(resource, t) = baseRate × Π derateFactors(t) × shiftFactor(t)`. Keep `304` as a golden `verify` assertion, but compute it from segments. Everything else (allocation, scheduling, CTP) becomes a fold over day/shift buckets.
4. **A = demand planning** = forecast (method-per-regime) → net against eligible supply (MRP) → emit a dated `DemandRequirement` + `requested→promised→capable` delta. It never schedules; it interrogates production's CTP answer.
5. **B = production planning** = net requirements → finite-capacity, sequence-dependent scheduling across zones/routings/resources, with material, frozen-horizon, calibration and ship-calendar as hard constraints; scenarios are immutable, baseline-preserving runs.
6. **C = shift execution** = cut the plan into work orders, dispatch within the shift's frozen window, gate on certification/material, compute the handover delta from an append-only event log, route overtime to Finance. Re-plan by receding horizon; never mutate the baseline.
7. **Solvers live behind an `OptimizationPort`.** Small fixtures: precompute canonical schedules offline and ship them, with a pure-TS verifier in the browser. Live solving (OR-Tools CP-SAT / HiGHS WASM) is an optimisation, not an architectural dependency.
8. **Emit an `Explanation` object with every run**: binding constraint, causal chain (2–4 steps), counterfactual(s), alternatives with deltas, confidence, provenance, redaction. The causal-code map is versioned; raw duals/logs are never user-facing.

---

## 1. Shared algorithm kernel

All three families import this. If it is right, the families are small.

### 1.1 Data contracts

```ts
// Provenance: the anti-orphan-number primitive. Every displayed value is one of these.
type NumberRef = {
  value: number;
  unit: string;                       // "tests" | "loops" | "CAD" | "shifts"
  derivedFrom: string[];              // source fact ids, master ref ids, run ids
  masterVersion: string;              // master this number was resolved against
  formula: string;                    // human-readable, reproducible
  traceId: string;                    // CALC-... id
};

type PlanningLevel = { site: string; zone?: string; resource?: string; item?: string };
type TimeBucket = { id: string; start: string; end: string; kind: "day" | "shift" };
```

### 1.2 Kernel functions (pure, side-effect free)

```ts
interface PlanInputs {
  snapshotHash: string;
  masterSetVersion: string;
  modelVersion: string;
  seed: number;
}

// Capability (availability) model — replaces leakTestCapacity()
type CapabilitySegment = { resourceId: string; from: string; to: string; ratePerDay: number; derate: number; causeId: string; evidenceRef: string };
function available(resourceId: string, from: string, to: string): CapabilitySegment[];

// Calendar
function shipDays(calendarId: string): string[];        // ShipCalendar master
function nextShipDay(iso: string, calendarId: string): string;

// Demand
function planDemand(records: DemandRecord[], masters: MasterSet): DemandRequirement[];

// Supply netting (MRP) — per item per bucket, returns rows + pegs
function netItem(item: string, demands: DemandRow[], supplies: SupplyRow[], policy: Policy): { rows: NetRow[]; pegs: Peg[] };

// Scheduling (Port)
interface OptimizationPort { solve(model: CanonicalModel, cfg: SolveConfig): SolveResult; }
```

### 1.3 Event-sourced run lifecycle

Runs are append-only. Phases: `Queued → SnapshotValidation → ModelBuild → Presolve → Search → CandidateValidation → CausalTranslation → EvidencePackaging → Complete` (or `Stale / Cancelled / Failed`). State is a fold over the event stream. Replay re-derives `canonicalResult` from the input triple + seed; it never re-executes side effects (replay is read-only; execution is gated by `gatewayReceipt`).

### 1.4 Determinism rules (non-negotiable)

- Canonical JSON (**RFC 8785 JCS**, sorted by code point) + SHA-256. Two-level Merkle root over masters and transactions so a change dirties one branch.
- Stable total-order sorts with explicit tie-breakers everywhere (`by (metric, id)`); never `Set`/`Map`/object iteration order; never `localeCompare`.
- Floats: quantise to a declared scale (`round(x, 6)`), integer minor units for money. No `NaN/Inf` in hashed records.
- PRNG only if unavoidable: named seeded generator (splitmix64/xoshiro), stream keyed by `hash(seed ‖ phase ‖ entityId)` so divergence doesn't desync — this is also what makes common-random-numbers scenario comparison valid.
- Solver: `threads=1`, fixed `random_seed`, fixed presolve, pinned solver version, integer objective coefficients. Record `solverSig` (name+version+options) in the run.
- **Status honesty:** `OPTIMAL` only if `gap ≤ policyGap`; `PROVEN_INFEASIBLE` only with a certificate and no limit hit; a time limit with no incumbent is `TIME_LIMIT_NO_FEASIBLE_RESULT`, never infeasible.

### 1.5 Invalidation, staleness, replay

`execute(runId, expected {snapshotHash, masterSetVersion, seed})` is a compare-and-swap. Any input change marks dependents `STALE`. `rebase` produces `run v2` with `parentRunId` and a visible diff (`changedInputs`, `changedOutputs`, `statusTransition`) — v1 is never mutated.

---

## 2. Family A — Demand planning

**Question it answers:** *Which requests are at risk, how bad, and what does capacity actually permit?*

### 2.1 Signal vs commitment

A **demand signal** is a record `(product, qty, date, probability, source)`; it consumes nothing. A **commitment** pegs capacity. Map the ladder to firmness and let firmness alone decide eligibility:

| Ladder rung | Class | Effect |
|---|---|---|
| forecast, opportunity, quote | signal | forecast only; no peg |
| reservation | soft claim | time-phased hold, expiring |
| firm_order, approved_commitment | commitment | pegged; consumes capacity |
| shipped | actual | observed; reconciles |

Forecast is consumed by firm orders (consumption netting) so the same demand is never counted twice.

### 2.2 Forecast: method-per-regime (not one model, not per-series auto-selection)

Classify each series by ADI / CV² (Syntetos–Boylan) and apply a fixed policy. Empirical evidence says per-series model search does not beat one good method and breaks reproducibility.

| Regime | Method |
|---|---|
| smooth (ADI<1.32, CV²<0.49) | damped ETS / Theta |
| intermittent / lumpy | **TSB** (updates on zero periods; handles obsolescence) |
| erratic | bias-corrected Croston (SBA) |
| ultra-sparse (<4 non-zero obs) | ADIDA aggregation or Gamma-Poisson rate; flag judgment-seeded |
| series with real drivers | gradient boosting with quantile loss — only when covariates exist |

Reject Prophet for this horizon (adds sampling/non-determinism). Reconcile hierarchy with **MinT/WLS** once ≥2 levels exist, clip negatives at 0 and record the adjustment as a derived fact. **Fitted coefficients are a versioned master** — serving is pure arithmetic. Quantise to whole units after interval computation.

### 2.3 Accuracy & uncertainty

Headline **MASE + bias/tracking signal + FVA-vs-naive**, never MAPE (undefined at zero, rewards under-forecasting). Intervals: **split conformal prediction** over rolling CV (distribution-free, works with zeros/counts) → P10/P50/P90 surfaced to the demand-planner lens. A sensing overlay is admitted only if its FVA beats the statistical baseline out-of-sample — otherwise rejected with a reason (same pattern as `whyRejected`).

### 2.4 Priority and the three deltas

Priority is a **lexicographic ordering key**, never a single float:

```ts
type OrderingKey = readonly [tier: number, marginBand: number, requestedDate: string, customerRank: number, id: string];
// Priority = "earlier in the tuple". Every element resolves to a versioned master; final tie-break on id.
```

Per requirement compute three legs: `requestToPromise`, `promiseToCapable`, and `capableToRequested = capable − requested`. **The demand queue sorts ascending by `capableToRequested` days**, then by priority key, then id — this surfaces commitments humans promised earlier than capacity can serve. The current window-wide greedy cannot produce this; it must become bucket-by-bucket ATP/CTP.

### 2.5 MRP netting over eligible supply

Per item per business day: `netReq[t] = max(0, grossReq[t] + safetyStock[t] − projected[t−1] − schedReceipts[t])`; offset planned orders by lead time. **Peg first, net second.** Lot sizing: lot-for-lot for make-to-order A items; POQ/FOQ for purchased parts; Wagner-Whitin (integer, memoised DP) only for bounded horizons. Safety stock `SS = Z × σ_LTD`, `σ_LTD = √(LT·σ_d² + d̄²·σ_LT²)`, Z from a service-class policy master — fed by family A's own σ, never a global constant.

Eligibility netting before any of this:
`eligible = min(ERP_qty, WMS_qty) − held − expired − failed − unqualified`.
The `|ERP−WMS|` delta and unverifiable qty become a quarantined `Conflict`, never eligible, never auto-resolved (preserves `CNF-QD-220` behaviour). Approved alternates/substitutes are a **separate eligible pool** consumed only for the pegged item, gated by QMS approval under a hard gate (`AVL-MV-14B` pattern).

### 2.6 ATP/CTP boundary

Demand planning emits a **dated `DemandRequirement` vector**; production planning returns a `capableDate`. Demand planning does not explode routings or schedule around maintenance — it hands over requirements and consumes the CTP answer to compute deltas and sort the queue. A **`ShipCalendar` master** (currently missing, D-17) is shared by both sides.

### 2.7 Uncertainty

Handle uncertainty *outside* the solver. Demand: budget-robust (Bertsimas–Sim Γ) on supplier commits — "feasible for all ≤ Γ late commits". Model uncertainty as an explicit, versioned `UncertaintyFact` (discrete / empirical / interval) whose basis is source facts; confidence derives from freshness + conflict disposition. Supplier commits use robust feasibility; production uses a chance constraint (`P(on-time ≥ target) ≥ 1−ε`, evaluated as satisfied-scenarios/N over a fixed scenario set).

### 2.8 Family A interfaces

```ts
type DemandRecord = { id: string; sourceSystem: string; sourceRecordId: string; ladder: Ladder;
  customerId: string; product: string; qty: number; requestedDate: string; promisedDate: string | null;
  probability: number; observedAt: string; };

type DemandRequirement = { id: string; commitmentId: string | null; product: string; qty: number;
  dueDate: string; priorityKey: OrderingKey; firmness: Firmness; sourceRecordId: string };

type PromiseDelta = { requestToPromiseDays: number; promiseToCapableDays: number;
  capableToRequestedDays: number; capableDate: string; atRisk: boolean; binding: string | null };
```

**Edge cases:** missing requested_date (derive from quote per policy); multiple quotes per opportunity (latest effective); reservation expiry/demotion; forecast+firm in one bucket (consumption); stale master → quarantine; capable_date in the past → flag; timezone/date boundary; non-working ship day; duplicate `sourceRecordId` (idempotency key); partial shipment must not firm the remainder.

---

## 3. Family B — Production planning

**Question it answers:** *Given dated demand and finite, time-phased capacity, what gets made where and when — and what is the earliest true ship date?*

### 3.1 Time-phased capacity as derived fact, not literal

Replace `leakTestCapacity()` with a capability evaluator:

```ts
capacity(resource, t) = baseRate × Π derateFactors(t) × shiftFactor(t);
// rateFactor 1.0 normal, 0.5 half-rate; state ∈ running | degraded | down
type CapacityBucket = { scopeId: string; date: string; shiftId: string; start: string; end: string;
  rateFactor: number; state: "running" | "degraded" | "down" };
```

Derates come from an `EVT-*` cause with evidence (maintenance, calibration, failure, restoration) — never a calendar hidden constant. For multi-resource routings, aggregate by **product of derates on the same resource** and **minimum rate across series-required resources** (a line is only as available as its most-constrained station). Sort intervals by `(from, resourceId)` before folding. Keep `304` in `verify.ts` as a golden test computed from segments, so MOVE/SHORTEN/DEFER options mutate *inputs*, not the formula.

### 3.2 Problem formulation

Flexible job-shop with parallel machines: one job per work order = ordered routing operations; each op requires a qualified resource in its zone. CP-SAT primitives map cleanly:

```ts
const iv = mdl.newIntervalVar(start[j][k][m], dur[j][k][m], end[j][k][m], name);
pres.push(present); mdl.add(iv.presence === present);           // optional interval
mdl.addExactlyOne(pres);                                        // one machine per op
mdl.add(end[j][k][*] <= start[j][k+1][*]).onlyEnforceIf(both);  // routing precedence
mdl.addNoOverlap(ivsByResource[m]);                             // finite capacity
// sequence-dependent changeover: per-machine circuit with transition literals
// material availability: reservoir (consume at start, supply at end, optional-aware)
// frozen horizon: pin start of frozen ops to the baseline
// calibration/qualification: exclude ineligible resources from the eligible set
```

### 3.3 Algorithm + decision rule

| Scale | Algorithm |
|---|---|
| small (< ~150 ops, < 12 resources) | **CP-SAT exact** (optional intervals, NoOverlap, circuit transitions, reservoir beat big-M MILP) |
| medium (150–2000 ops) | CP-SAT with timeout + warm-start hint from a priority-dispatch / critical-ratio solution; accept first FEASIBLE |
| large (> 2000 ops) | shifting-bottleneck / critical-ratio dispatch → constraint repair → tabu/SA local search |

Never pure GA (quality + explainability + reproducibility loss). Exact if CP-SAT proves optimality in budget; else FEASIBLE with a reported bound; **never call a timeout infeasible**.

### 3.4 Objectives

Scalarise to one **integer** objective — primary `Σ w_j · tardiness_j` (drives OTIF), secondary makespan, tertiary setup/changeover + WIP — with a deterministic `ε·Σ idOrdinal(op)` tie-break so equal-cost solutions order by `(dueDate, priority, woId, seq, resourceId)`. Lexicographic by solving stage 1, fixing its value, re-optimising stage 2 with a hint. Recovery lateness is *derived*, not optimised: `ship_j = nextShipDay(promise + ceil(shortfall / rate), shipCalendar)`.

### 3.5 Solver toolchain & the Port (ADR-001)

**ADR-001 — Optimization engine: Gurobi at build time (accepted).** Gurobi 12.0.3 is
available on the build machine under an academic license. Because the runtime is a static,
client-only SPA (no backend, no WASM Gurobi), the solver runs **at build time** and its
frozen, fingerprinted result ships as `src/generated/solver-artifacts.ts`.

- **Decisive constraints:** Gurobi has no JavaScript/Node SDK and no WASM build, and its
  container path (Web License Service) needs periodic internet token renewal — neither
  fits a client-only offline demo. So Gurobi is used as the **authoring/verification oracle**,
  not a runtime dependency.
- **Determinism pins:** `Seed=0`, `Threads=1`, `Method=2` (dual simplex), `Presolve=2`,
  `MIPGap=0`, deterministic `WorkLimit` (never a wall-clock `TimeLimit`). `ConcurrentMIP`
  needs no disabling at one thread. `solver_signature()` is recorded in every artifact.
- **Why Gurobi over `highs-js`/CP-SAT here:** it is materially stronger on the allocation MIP
  and gives first-class IIS/FeasRelax and duals for the causal-code map; the build machine is
  not the browser, so there is no bundle constraint.
- **Runtime fallback (still required):** a pure-TS deterministic evaluator reads the artifact;
  if a live solve is ever needed, it goes behind `OptimizationPort` to a server-side Gurobi
  (WLS token) or `highs-js`/`or-tools-wasm`.
- **First result:** the allocation baseline reproduces the fixture exactly, and the recovery
  model *beats* the hand-authored third-shift option (4 shifts / $4,416 vs 6 / $6,624).
- Harness: [`tools/gurobi/`](../tools/gurobi/README.md) · regenerate with `npm run solver`.

### 3.6 Dates & feasibility

Ship date derives from recovery capacity + `ShipCalendar`; a promise on a non-working day is flagged and cannot be silently feasible (fixes D-05, inverts the `verify.ts:224` assertion N-01). Derive `COM-1018` from supplier commit + ship calendar (fixes D-06). Classify feasibility honestly: `feasible / infeasible / unknown(timeout)` — distinct from a time-limited solver result.

### 3.7 Scenarios & simulation

Scenario runs are immutable and baseline-preserving; enumerate alternatives (move/split/defer maintenance, add shift, expedite part, substitute material) as edits to a `SimSpec`, then evaluate. A hand-rolled ~250-line seeded **DES** kernel adds value only where reality is a distribution (stochastic downtime/MTTR, yield/scrap, changeover distributions) — never for hard gates or official arithmetic. Use counter-based PRNG streams + **common random numbers** and report **paired** deltas (Δcost, Δon-time qty, P50/P90 ship date, service level) with paired-t CIs. DES emits `SimMetric` records shaped exactly like `DerivedFact`; the deterministic layer *recomputes* `Alternative` fields from them — never a hand-entered simulation number.

---

## 4. Family C — Shift execution

**Question it answers:** *Can we cover it, with whom, and what changed since the last handover?*

### 4.1 Work-order state machine

`planned → released → dispatched → in_progress → paused ⇄ in_progress → complete → closed` (plus `aborted`, `gated`). One `woId` = one routing-operation instance derived from the released plan line, binding `commitmentId` at `released`.

- `dispatched` = placed on a resource's shift queue (plan accepted).
- `paused` (operator/equipment, resumable) is **not** `gated` (hard gate: unapproved source, frozen horizon, expired cert, material hold — non-waivable, never silently resumes).
- `complete` when `qtyCompleted + qtyScrapped ≥ qtyStarted` (or planned qty); `closed` after consumption posted / work response emitted.
- Transitions are **append-only events** keyed `(woId, at, actor)`; state is a fold — reproducible, baseline never mutated.

### 4.2 Dispatch & sequencing

Never re-plan globally on the floor; **re-dispatch only within the shift's frozen window**. Apply a material + certification + tooling eligibility filter *before* ranking (a starved job must not hold the drum). Then:

1. Bottleneck-first (DBR): schedule the constraint resource (drum) first; find the true CCR from queue buildup.
2. Primary rule **Critical Ratio** `CR = (dueDate − now) / remainingProcessingTime` (CR<1 escalates); tie-break EDD, then SPT for WIP, then setup-optimised grouping *within* the due-date window (never outside). FIFO is a last tie-break.
3. Deterministic given the event set; every re-dispatch trigger (`resource_down`, `scrap_exceeds_tolerance`, `missing_material`) emits an event and recomputes the queue.

### 4.3 Handover delta (derived, never hand-typed)

`handover delta = all work-order/hold/downtime events with zoneId ∈ [shiftStart, HH:MM]`. Carry unresolved items forward (aged in shifts). The incoming shift's first production/downtime transaction requires an **acknowledgment** referencing every open issue/escalation; the author cannot acknowledge their own handover.

```ts
function handover(zoneId: string, at: string, lastHandoverId: string): ShiftHandover {
  const evs = events.filter(e => e.zoneId === zoneId && e.at > last.at && e.at <= at);
  const wip = foldByWo(evs);                 // qtyStarted/Completed/Scrapped, status, resourceId, routingOp
  const openIssues = unresolvedHolds(evs);
  const escalations = agedUndecidedAuthorityEvents(evs);
  return { handoverId, zoneId, at, wip, openIssues, escalations, sourceEventIds: ids(evs) };
}
```

### 4.4 Coverage, certification, overtime

Model `OperatorCertification { operatorId, resourceId, certId, validFrom, validTo, shift }`. Eligibility is per **shift interval**: `validFrom ≤ shiftStart ∧ validTo ≥ shiftEnd` — not `validFrom ≤ asOf` (that catches only some lapses). An expiring cert raises `CoverageGate{ zoneId, resourceId, authority: "quality" }` and moves the WO to `gated` (`CERT-OP-207` lapses 2026-10-01 in-window). `coverageRisk(activeShift) = max(0, demand − certifiedSupplyWithoutExpiringOp)`.

Overtime: base shifts consumed first; only demand above `BASE_SHIFTS × RATE_PER_SHIFT` per resource-day becomes OT; `cost = otShifts × SHIFT_HOURS × OT_RATE_CAD × OT_PREMIUM`. Above `FINANCE_THRESHOLD_CAD`, wrap as an option routed to the `manufacturing-manager` with `authority: "finance"` — requester ≠ approver, dry-run + receipt required (never self-approved; fixes N-04/A5).

### 4.5 Rostering algorithm

Treat it as set-covering, not partitioning (`≥` demand, so over-coverage is legal; carving over-cover in the objective is cheaper than false infeasibility). Hard: one slot/operator, cert valid over the whole shift, min rest (≥10–11h), max consecutive shifts, qualification. Soft: overtime premium, undercoverage, fairness.

- **Small (≤ ~150 slots):** greedy + local search, or min-cost max-flow for pure coverage (regular/overtime/penalty costs).
- **Scale / coupled rest patterns:** column generation — master set-covering LP, pricing = per-operator constrained shortest path / CP. Use flat CP-SAT when the horizon is small (`operators × days × shiftTypes ≤ ~3000`).

### 4.6 Metrics (derived facts only)

Scrap rate = Σscrapped/Σstarted; throughput = Σcompleted per resource-shift; changeover = actual − standard between distinct routing ops; **OEE = A×P×Q** from *actuals* (runTime/plannedTime × idealCycle×count/runTime × goodCount/totalCount), stored as a derived fact with `derivedFrom: [woIds, downtimeIds]`. Never compute OEE from standard times (10–30% error).

### 4.7 Receding-horizon replanning

Cadence per shift (~8h); horizon = remaining promise window; freeze boundary = frozen pegs + approved/executed work. Each re-plan ingests new observed facts → regenerates the scenario set → `createScenarioRun(commitmentId, sequence)` → emits `DecisionDiff`. Resource-down / uncovered shift becomes a **new scenario run**, never an edit.

---

## 5. Cross-family data flow

```
CRM/ERP demand ──► [A] planDemand ──► DemandRequirement (dated, prioritised)
                                        │
                                        ▼
                        [B] net (MRP) ──► finite-capacity schedule ──► capableDate
                                        │                                   │
                                        │◄─────────── CTP answer ───────────┘
                                        ▼
                        [B] work orders ──► [C] dispatch / coverage / handover
                                        │                                   │
                                        ▼                                   ▼
                              ObservedOutcome ◄──── shift events ──── DecisionDiff (re-plan)
```

Every arrow is a versioned record, not a scalar. A demand requirement resolves to CRM facts; a schedule resolves to work orders; a work order resolves to routing/zone/resource masters; a handover resolves to work-order events.

---

## 6. Explainability & governance (applies to all three)

Each run emits an `Explanation`:

```ts
type Explanation = {
  schemaVersion: "expo/1.0";
  bindingConstraint: { code: CausalCode; humanLabel: string; source: { recordId: string; masterVersion: string; field: string } };
  causalChain: { step: number; statement: string; code: CausalCode; evidence: EvidenceRef[] }[];  // 2–4 steps, ends in a business effect
  counterfactual: { assumption: string; change: string; effectDelta: Delta; clause: "feasible-if" | "cheaper-if" | "on-time-if" }[];
  alternatives: { optionId: string; delta: Delta; rejectionState: "proven_infeasible" | "timed_out" | "hard_gated" | "dominated" }[];
  confidence: { level: "high" | "medium" | "low"; reason: "certified_optimal" | "best_found_gap_x" | "stale_input"; boundGapPct?: number };
  inputs: { recordId: string; masterVersion: string; value: string; freshness: "fresh" | "stale" }[];
  redactionApplied: { roleScope: string; fieldsHidden: string[] };
};
```

- **Causal codes** are a versioned map (`causal-map@YYYY-MM-DD`, frozen into `codeVersion`). Solver duals/reduced costs/IIS/CP-SAT `sufficient_assumptions_for_infeasibility` map to business-readable codes (`CAPACITY_BINDING`, `PROMISE_WINDOW_TOO_SHORT`, `CONFLICT_PAIR(a,b)`, `INFEASIBLE_UNDER[...]`). Reuse the existing override vocabulary (`CHANGEOVER_COST_UNDERSTATED`, `SUPPLIER_EXPEDITE_NOT_CREDIBLE`, …) as first-class codes so solver causes and human disputes share one namespace.
- **Counterfactuals** per family via inverse-CP style minimal relaxation ("add 4h on Line 3 OR accept 2 days late"); shift execution uses pairwise-swap explanations (≤2 arguments).
- **Honest infeasibility:** only four states, never blurred — `proven_infeasible` (certificate), `timed_out` (incumbent + bound, "not proven best"), `hard_gated`, `dominated`. Ban the word "optimal" unless `status = OPTIMAL`.
- **Redaction happens at render**, on codes and evidence refs — never on the math; redacted fields render "not authorized", never "absent", and are stripped before prompt construction.
- **Override capture:** log recommended vs selected, rejection code, rationale, snapshot, `explanationHash`; overrides feed a **read-only** offline review queue, never auto-retraining (bail-judge evidence: overrides help ~10%, hurt ~90%).

---

## 7. Build order (mapped to the existing plan)

| Step | Land | Why first |
|---|---|---|
| **K0** | Kernel: `NumberRef`, canonical JSON+hash, stable sort helpers, event log, status mapping. Invert the N-01 defect-encoding test. | Everything else depends on a trustworthy determinism contract. |
| **K1** | Capability/calendar: generic `available()`, `ShipCalendar`; keep `304` as a golden test. | Unblocks B and C and removes the literals that hide bugs. |
| **M2 / W1** | Family A demand seam: `DemandRecord`, requestedDate, ordering key, three deltas, MRP netting + pegs. | Small, high persona value, off the floor critical path. |
| **M1 / W4** | Zones/routing/resources masters. | The routing→zone chain is the backbone of both B and C. |
| **M3 / W2** | Family C execution seam: work orders, dispatch, handover, certs. | Depends on M1; gives the shift executive their surface. |
| **M4 / W3** | Availability: `CapabilityInterval` from EAM/PM/calibration/restoration; maintenance window options. | Feeds B's capacity and the maintenance persona. |
| **M5 / W5** | Family B scheduling: time-phased allocation, CP-SAT/port, derived dates, ship-calendar validation (inverts N-01). | Highest algorithm complexity; needs K1+M1+M4 inputs. |
| **M6 / W6** | Explanation objects, causal-code map, authority separation, disclosure, override events. | Makes all three families governable and explainable. |
| **M7 / W8** | Extended verification: golden hashes, input-shuffle property tests, replay test, CAS/stale test, routing/zone completeness, peg integrity. | Proves the invariants, not just the happy path. |

---

## 8. Open decisions

1. **Solver seam now vs later:** ship precomputed canonical schedules (safer, fully deterministic) or embed CP-SAT/HiGHS WASM for live solves. Recommend precomputed now, Port later.
2. **Forecast horizon:** the fixture is effectively a 6+7-day window. Decide whether to model a rolling forecast or keep demand as explicit records only (recommend records-only until real history exists).
3. **Uncertainty depth:** start with deterministic scenarios + paired deltas; add robust Γ / chance constraints only if the demo needs it (avoid over-engineering).
4. **DES:** defer entirely until after M5; the hand-rolled seeded kernel is the only form that preserves the reproducibility contract.
5. **CP-SAT version pinning** in a browser/WASM context — pick one pinned artifact and freeze `solverSig` into the run.

---

## 9. Consolidated references

**Demand/forecast:** Hyndman MinT (robjhyndman.com/papers/MinT.pdf) · MASE (robjhyndman.com/papers/foresight.pdf) · intermittent demand/TSB (ersj.eu/journal/1723) · conformal forecasting (nixtlaverse.nixtla.io) · FVA (research.lancaster-university.uk).
**S&OP/MRP/inventory:** ASCM CPIM Mod3 · Crum & Palmatier firm/trading/free zones · SAP CTP · Oracle ATP/CTP · MIT King safety stock (web.mit.edu/2.810/www/files/readings/King_SafetyStock.pdf).
**Scheduling/optimisation:** Da Col & Toth (sciencedirect.com/science/article/pii/S2214716022000215) · Adams/Balas/Zawack shifting bottleneck (jstor.org/stable/2632051) · CP-SAT Primer (d-krupke.github.io/cpsat-primer) · OR-Tools scheduling docs · OR-Tools determinism #3943 · HiGHS-js (github.com/lovasoa/highs-js) · Gurobi determinism.
**MES/execution/rostering:** ISA-95 (isa.org) · OPC UA ISA-95 job control (reference.opcfoundation.org/specs/OPC-10031-4/6.2.2) · B2MML qualifications · oee.com · nurse rostering column generation (S0305054812000986) · OR-Tools employee scheduling.
**Simulation/uncertainty:** Law WSC 2003 output analysis (informs-sim.org/wsc03papers/007.pdf) · common random numbers / variance reduction · Bertsimas–Sim robust optimisation · chance-constrained programming · receding-horizon control.
**Reproducibility/governance:** RFC 8785 JCS · Merkle trees · Fowler Event Sourcing · Jepsen snapshot isolation · Miller et al. argumentation for explainable scheduling · Korikov & Beck inverse-CP counterfactuals (LIPIcs CP 2021) · EU AI Act Art. 86 · NBER algorithmic recommendations & human discretion.
**APS landscape:** SAP IBP aggregation/disaggregation & PP/DS resource categories · Kinaxis concurrent planning · o9 Enterprise Knowledge Graph · Blue Yonder Constraint-Anchored Optimization · Siemens Opcenter · OMP Unison · Anaplan Hyperblock · McKinsey APS data management · BCG Supply Chain Planning 2026.

---

## 10. Change log

| Version | Date | Change |
|---|---|---|
| v0.1 | 2026-09-26 | Algorithm build design synthesising 13 expert research passes into a kernel + three families, with build order, determinism contract, explanation model, and references |
| v0.2 | 2026-09-26 | Added ADR-001: Gurobi used at build time as the optimization oracle; runtime reads a frozen, fingerprinted TS artifact. Harness landed in `tools/gurobi/` |