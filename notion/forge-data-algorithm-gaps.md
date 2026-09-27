# FORGE Decision Room — Data & Algorithm Gaps and Improvements

> A cross-domain review (data · algorithm · ERP/CRM/MES · optimisation · heuristic · manufacturing · software · UI/UX · product) of the gap between the **verified COOLIT data / AIB v1** and the **algorithm layer**. Grounded in the actual AIB v1 solver run (40 jobs, 130-day horizon). Companion to the Data Improvement Plan v2.1, the Algorithms Build Design, and the Execution Task List.

| Field | Value |
|---|---|
| Document | FORGE Decision Room — Data & Algorithm Gaps and Improvements |
| Version | v0.2 |
| Status | 🟡 Active — v3.2 contract runs completed |
| Owner | AI / reasoning + Data modelling |
| Sources | `COOLIT_Synthetic_Enterprise_Data_v3.1` · `COOLIT_Algorithm_Input_Bundle_v1` · `tools/gurobi` · `src/model.ts` |
| Last updated | 2026-09-27 |

**Severity:** 🔴 blocks correctness · 🟠 degrades quality/scale · 🟡 realism/completeness.

---

## 0. Framing

Two sentences sum it up:

1. **The data is verified but not algorithm-adversarial.** It is internally consistent, but too regular and too thin at the edges to expose the algorithm's real behaviour.
2. **The solver model is the wrong shape for the data.** It modelled capacity as *whole-day, one-operation-at-a-time* occupancy; the data supplies `ratePerDay`, `nominal_concurrent_units`, `runMinutesPerUnit` and derates, which imply *rate-based, shareable, minute-level* capacity. That single mismatch produced an infeasible schedule (`TEST-LEAK-01` at 134% of horizon) and 36/40 late jobs.

Fix the **data→model contract** first; most of the maths is standard afterwards.

---

## 1. Data gaps

| ID | Sev | Gap | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| DG-01 | 🔴 | **Three competing rate definitions.** Resource `ratePerDay` (24.6/64/37.3), routing-op `stdRate` (1–4), op `runMinutesPerUnit` (15–60). The solver used `ratePerDay` and ignored the rest. | `schedule_input.json` | Wrong capacities → infeasible schedules | One canonical time model: `duration = setupMinutes + qty × runMinutesPerUnit`; capacity = `ratePerDay × nominal_concurrent_units × derate` per bucket; declare which field is authoritative |
| DG-02 | 🔴 | **Capacity concurrency unused.** `nominal_concurrent_units` present (all = 1) but unmodelled. | resources | Parallel machines/cells unrepresentable | Model parallel capacity; seed ≥1 resource with units > 1 |
| DG-03 | 🔴 | **Whole-day bucketing.** Demand/derate per-day; processing per-minute. | — | Rounding inflated load (240 ops ≥ 240 resource-days) | Bucket to **shift**; capacity in minutes/day |
| DG-04 | 🟠 | **`frozen` is a flag, not a commitment.** 6 jobs `frozen:true`, no committed start. | jobs | Frozen horizon cannot be pinned | Surface `erp/operation_schedule` planned starts (AIB-schedule already projects it) |
| DG-05 | 🟠 | **`pegged` ignored** in allocation. | `allocation_input.json` | Priority/frozen semantics unenforced | Make pegged/frozen hard constraints |
| DG-06 | 🟠 | **No material in the run.** `bom_*`, `inventory_state`, `approved_source`, `net_requirement` exist; AIB-mrp unbuilt. | plan v2.1 §6 | COM-1018-style material gaps invisible | Build AIB-mrp; release date from material availability |
| DG-07 | 🟠 | **Test gates unenforced.** Ops carry `testGate: LEAK_PASS / FUNCTIONAL_PASS`. | routings | Invalid schedules | Model gates as mandatory precedence |
| DG-08 | 🟠 | **Setup matrix unused.** `erp/setup_matrix` exists. | plan v2.1 | Capacity overstated; sequence unrealistic | Sequence-dependent setup |
| DG-09 | 🟠 | **Synthetic demand too regular.** qty cycles 8,12,…,44; weekly dates; no cancellations/change-orders/intermittency/priority churn. | `allocation_input.json` | Algorithms not stressed; forecast trivial | Inject lumpy/intermittent demand, cancellations, mid-horizon priority effectivity, multi-quote |
| DG-10 | 🟡 | **Calendar weekend-only.** No holidays, no shift calendar, no explicit TZ/bucket rule. | `horizonDays` | Date/capacity edge cases untested | Add `SHIFT-CAL`, holidays, TZ/bucket rule (OI-43) |
| DG-11 | 🟡 | **UoM conversion undefined** (tests↔loops↔pieces). | D-13 / OI-44 | Peg/ladder mismatches | Conversion master + asserted invariant |
| DG-12 | 🟡 | **`priorityKey` is a string; no derived weight.** `"P1|date|id"`, `P1_RECOVERY` undefined. | `allocation_input.json` | Ordering not data-derived | Priority policy master → numeric ordering key |
| DG-13 | 🟡 | **Provenance not populated.** `data/number_ref` is a declared schema only. | plan v2.1 §5 | No runtime no-orphan-numbers guarantee | Emit `NumberRef` for every derived number |
| DG-14 | 🟡 | **Derived-vs-stored discipline is policy, not enforced.** AIB is "a projection" by convention. | plan v2.1 §6 | A parallel fixture can reappear | CI check: only registered projections; no new store |
| DG-15 | 🔴 | **`capacity_bucket` weeks (`2026-P01…P26`) have no date mapping.** `reference/calendar` only carries `2026-H##`; the operation plan carries timestamps. No join key. | v3.2 `capacity_bucket` vs `operation_schedule` | Capacity cannot be joined to demand; 149,246 min of CURRENT demand land in no P-week | Add a `P-week → date` mapping, or regenerate `capacity_bucket` on the schedule's date/H keys |
| DG-16 | 🔴 | **`capacity_bucket.planned_minutes` is unverifiable / front-loaded.** Flags 17 overloaded weeks; recomputing from the CURRENT schedule gives **0**. `TEST-FUNC-01 planned = 0` while CURRENT demand = 21,520 min. | `reconcile_capacity.py` | A false over-capacity signal; wrong debottleneck decisions | Recompute `planned_minutes` from the CURRENT schedule; re-derive bands |
| DG-17 | 🟠 | **20 of 60 commitments have no work order.** | `demand_projection.py` | A third of demand is unplanned/invisible | Link commitments → WOs (or mark forecast-only) |
| DG-18 | 🟠 | **Superseded vs CURRENT schedule conflated.** 1200 ops, only 200 CURRENT (1000 SUPERSEDED). | `operation_schedule.schedule_state` | Scheduling the historical plan inflates demand 6× (leak 337% vs 56%) | Scope every run to `schedule_state = CURRENT` |

---

## 2. Algorithm gaps

| ID | Sev | Gap | Where | Impact |
|---|---|---|---|---|
| AG-01 | 🔴 | **Capacity is disjunctive/whole-day, not rate-based cumulative.** | `schedule.py` | `TEST-LEAK-01` 175/130 days → infeasible |
| AG-02 | 🔴 | **Time-indexed MIP doesn't scale.** 240 ops × 130 days = 31,200 binaries; ~21k after windowing. | B-03 | Won't solve single-threaded to optimality |
| AG-03 | 🟠 | **Heuristic is naive EDD list scheduling.** No critical ratio/ATC, no setup awareness, no local search/repair. | `solve_dispatch` | Poor tardiness (heuristic v1) |
| AG-04 | 🟠 | **No rolling-horizon decomposition.** Monolithic 130 days; frozen boundaries unmanaged. | B-12/C-08 | Slow; unrealistic; brittle |
| AG-05 | 🟠 | **Objective ignores cost.** `erp/order_margin`/penalty available; objective is plain weighted tardiness. | B-08 | No service-vs-margin/expedite trade |
| AG-06 | 🟠 | **No material/eligibility in optimisation.** | A-06/A-07 | Capacity-only answers |
| AG-07 | 🟠 | **No setup-aware sequencing.** | B-07 | Unrealistic capacity |
| AG-08 | 🟠 | **No flexible/parallel resource choice.** Routing pins one resource; `erp/alternate_resource` unused. | — | Under-uses capacity |
| AG-09 | 🟡 | **No yield/scrap derate.** | MES loss events | Capacity optimistic |
| AG-10 | 🟡 | **No stochasticity/robustness.** Derates deterministic; no CRN/scenarios (deferred). | A-10/B-11 | Point estimates presented as truth |
| AG-11 | 🔴 | **Family C absent.** No WO state machine, dispatch, handover, coverage/cert gate, overtime routing, OEE. | C-01…C-09 | Shift execution doesn't exist |
| AG-12 | 🟠 | **CTP not built.** Capable date asserted, not computed. | A-08 | A↔B contract is a stub |
| AG-13 | 🔴 | **Not the source of truth.** `model.ts` hand-authored assessments still drive ledger/UI. | A-09/U-03 | Solver is a parallel artifact |
| AG-14 | 🟠 | **Determinism partial.** Golden hash for allocation only; heuristic tie-breaks unpinned; solver per-machine. | K-05…K-11 | Reproducibility not proven end-to-end |
| AG-15 | 🟠 | **No output validation before emission.** Frozen/gate/capacity invariants not re-checked. | QA | Invalid schedules can surface |
| AG-16 | 🟡 | **No lead-time feasibility pre-check.** 3/40 jobs are on-time-impossible. | — | Lateness misattributed to the solver |
| AG-17 | 🟠 | **Schedule scope not enforced.** The solver scheduled all 1200 ops (incl. SUPERSEDED); only 200 are CURRENT. | `schedule_contract.py` | Demand inflated 6×; false infeasibility |
| AG-18 | 🟠 | **Demand projection not in the service/app.** requested→promised→capable computed ad hoc in a script, not emitted as a `DecisionRun`/ledger row. | `demand_projection.py` | Demand planner view not wired |

---

## 3. ERP / CRM / MES / software / UI / product

| Domain | Gap |
|---|---|
| ERP | Routing/work-order/operation-schedule tables exist but the app reads none; MRP netting unbuilt; setup matrix idle |
| CRM | `demand_signal`, `quote_line`, `governed/commitment_date_triad` exist; requested→promised→capable still asserted in code, not read from data |
| MES | `work_order_operation`, `dispatch`, `shift_handover`, `operator_qualification` exist; Family C consumes none — cert gates not data-driven |
| Software | Solver build-time only; no runtime compute; ledger/UI unwired; persistence and trust boundary (OI-08) open; audit sink undefined |
| UI/UX | Ship-day flag, frozen plan, run card, selection bus, floor plan either built but not wired to solver, or pending |
| Product | MVP cut line, north-star (Q-07), demo hero (OI-28) unresolved |

---

## 4. Improvements (prioritised)

### P0 — correctness on real data (unblocks everything)
1. **Canonical time/capacity model** (DG-01…DG-03, AG-01): duration in minutes; capacity = rate × concurrency × derate; bucketed to shifts. One module, one source.
2. **Rate-based cumulative capacity** in the solver (AG-01): operations consume daily capacity and may share a resource-day.
3. **Feasibility pre-check** (AG-16): capacity vs demand per resource; surface overload before solving.
4. **Honour frozen + pegged + test gates** (DG-04, DG-05, DG-07) as hard constraints.
5. **Validate solver output** against invariants before emission (AG-15).

### P1 — quality and scale
6. **Rolling horizon (45 d) + dispatch (critical-ratio/ATC) + local search**; MIP only for bounded windows with a 1–2% policy gap (AG-02…AG-04).
7. **Material/eligibility in the model** (DG-06, AG-06) → COM-1018 enters.
8. **Setup-aware sequencing** (DG-08, AG-07) and **objective from margin/penalty** (AG-05).
9. **Family C minimum viable** (AG-11): WO state + dispatch + handover + cert gate + overtime routing.
10. **CTP computed** (AG-12) and **ledger/UI wired to the solver** (AG-13).
11. **`NumberRef` + canonical hashes at runtime** (DG-13, AG-14).

### P2 — realism and differentiation
12. **Data adversarialism** (DG-09, DG-10): intermittency, cancellations, change orders, scrap, downtime events, holidays, parallel machines.
13. **Stochastic/robust + DES** (AG-10) with common random numbers and paired deltas.
14. Multi-site, RAG copilot.

---

## 4a. Contract runs (v3.2) — results

Three scripts, all deterministic, on the embedded v3.2 contract:

| Script | Output | Finding |
|---|---|---|
| `schedule_contract.py` | `out/contract_schedule.json` | 40 jobs / 200 CURRENT ops; capacity sufficient (max 56% on `TEST-LEAK-01`); **30/40 on time** with the corrected scope |
| `reconcile_capacity.py` | `out/capacity_reconciliation.json` | Contract flags **17 overloaded weeks**; recomputed from CURRENT = **0**; 149,246 min of CURRENT demand fall outside any P-week |
| `demand_projection.py` | `out/demand_projection.json` | 60 commitments, 40 linked, 36 active; **18 at risk** (worst **72 d**, `COM-0027`); **20 unlinked** |

**Scope correction:** the first run scheduled all 1200 operations; only **200 are `CURRENT`** (1000 `SUPERSEDED`). Corrected demand is 6× smaller (`TEST-LEAK-01` 337% → 56%), and the "over-capacity" alarm disappears. The `capacity_bucket` overload flags are a **data artifact** (DG-15/DG-16), not real demand.

**Per-planner verdict:** production planning now makes sense (feasible, bottleneck identified); demand planning now makes sense (risk-ranked requested→promised→capable); shift scheduling and maintenance planning still do not (no shift/coverage/cert; no derate provenance/windows).

---

## 5. The highest-leverage decision

**Replace the capacity contract.** One decision — *duration in minutes; capacity in minutes/day × concurrency × derate; bucketed to shifts* — and the model shape changes, the binary count collapses, `TEST-LEAK-01` stops being 134% overloaded, and the data becomes usable as-is. Every other improvement (MRP, setup, Family C) rides on top of it.

---

## 6. Tests to add (acceptance)

| Test | Asserts |
|---|---|
| Capacity reconciliation | `Σ op minutes on a resource-day ≤ rate × concurrency × derate` |
| Instance feasibility pre-check | overload reported before solve, not as a silent late schedule |
| Frozen/peg/gate honoured | pinned ops unchanged; pegged qty respected; gated ops start after their gate |
| Rate schema | one authoritative duration/capacity source; the other rate fields are consistent |
| Output validation | no emitted schedule violates capacity/frozen/gates |
| Lead-time check | jobs whose best-case lead time > days-to-due are flagged up-front |
| Determinism | same input → identical schedule hash (heuristic and MIP) |
| AIB wiring | `test:coolit` runs the schedule on `erp/routing_operation` + `erp/operation_schedule`, not the provisional fixture |

---

## 7. Change log

| Version | Date | Change |
|---|---|---|
| v0.1 | 2026-09-27 | Created the Data & Algorithm Gaps and Improvements register from the AIB v1 run: 14 data gaps (DG), 16 algorithm gaps (AG), ERP/CRM/MES/software/UI/product gaps, a P0/P1/P2 improvement plan, and the capacity-contract decision as the highest-leverage fix |
| v0.2 | 2026-09-27 | Added DG-15…DG-18 and AG-17/AG-18 from the v3.2 contract runs; added §4a run results (capacity reconciliation, demand projection, scope correction); recorded the per-planner verdict |