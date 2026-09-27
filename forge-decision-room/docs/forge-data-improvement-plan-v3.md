# FORGE Decision Room — Data Improvement Plan v3 (Data→Model Contract · Algorithm-Adversarial)

> The plan that fixes the root cause behind the AIB v1 run: the data is verified but not algorithm-adversarial, and the solver model is the wrong shape for it. The 134% over-capacity result, the unsolvable 130-day MIP, and 36/40 late jobs all trace to one broken contract — the mapping from `runMinutesPerUnit`/`setup_minutes`/capability intervals into solver capacity. Fix the contract; the rest is standard.

| Field | Value |
|---|---|
| Document | FORGE Decision Room — Data Improvement Plan v3 |
| Version | v3.1 |
| Status | 🟡 Active — contract embedded as data in v3.2; three review rounds complete — supersedes the data side of v2.1; extends Execution Task List streams D/A/B/C/K/T/G/U and Stream CP |
| Owner | DATA + AI (with BE · GOV · FE · PM) |
| Ground truth | COOLIT v3.1 (174 datasets · 41,288 rows · PASS) · AIB v1 (60 alloc / 40 jobs · PASS) · `npm run verify` · `test:coolit` |
| Supersedes | Data Improvement Plan v2.1 (embedding); COOLIT Data Improvement Plan v1.0 (analysis defects) |
| Last updated | 2026-09-27 |

---

## 1. The one framing that matters

Two mismatches produced every symptom in the AIB v1 run:

1. **The data is verified but not algorithm-adversarial.** It is internally consistent, but demand is regular, calendars are weekend-only, and three competing rate definitions coexist.
2. **The solver model is the wrong shape.** It treats capacity as whole-day disjunctive occupancy and models operation duration from `resource.ratePerDay`, ignoring the routing's `runMinutesPerUnit` + `setup_minutes`. The result: `TEST-LEAK-01` demand of 175 against a 130-day horizon, 31.2k binaries, no solution, 36/40 late.

Everything downstream (MRP, setup, Family C, UI) is standard once the data→model contract is correct. **Fix the contract first.**

---

## 2. Current state (grounded)

| Asset | State | Evidence |
|---|---|---|
| COOLIT v3.1 data | 174 datasets · 41,288 rows · review PASS | `outputs/01a0deee-…/COOLIT_Synthetic_Enterprise_Data_v3.1` |
| AIB v1 (projection) | 60 allocation rows · 40 jobs · 6 resources · 12 routings · 130 days · PASS | content hash `f2fc55f7…` |
| Solver lane | allocation + scheduling MIPs + TS artifact, determinism partial | Execution Task List §0; K-01…K-04, B-02…B-05, A-09 done |
| Floor / UI | four-pane layout + floor view built | U-01, U-07 done |
| Data embedding | zones/resource/routing/date-triad/handover + ship calendar/capability/order-margin embedded | Data Improvement Plan v2.1; v3.1 |
| Open contracts | MRP, CTP, Family C, NumberRef, trust boundary, persistence | Execution Task List; OI list |

**Known-good to keep:** real routings and rates exist (`erp/routing_operation`), real capability exists (`reference/capability_interval`), real ship days exist (`reference/ship_calendar`), real pegs exist (`erp/pegging_snapshot`), and real MRP rows exist (`erp/net_requirement`). The contract just doesn't read them.

---

## 3. The canonical time/capacity contract (highest-leverage fix)

**Decision (new OI-56).** One time model, one capacity model, minute buckets.

```
duration(op, qty)         = setup_minutes + qty × run_minutes_per_unit      # erp/routing_operation
available(resource, day)  = regular_minutes_per_day × derate_factor         # reference/capability_interval (derate applied once)
capacity(resource, bucket) = available_minutes_per_day × business_days × concurrent_units
                                                                            # available already reflects derate AND overtime — never multiply by derate again
invariant:  Σ planned_minutes(resource, bucket) ≤ capacity_minutes(resource, bucket)
```

| Rule | Detail |
|---|---|
| Duration source | `runMinutesPerUnit` + `setup_minutes`; **never** `ratePerDay` |
| `ratePerDay` role | a scheduling gate/throughput check only, not a duration |
| Concurrency | `nominal_concurrent_units` multiplies capacity (seed ≥1 resource with >1 to test) |
| Derate | from `reference/capability_interval.derate_factor` (golden: TEST-LEAK-01 0.343) |
| Bucket | shift-level (extend `reference/shift_calendar`); day-level acceptable for v1 with minute semantics |
| Output | planned operation start/end in minutes; validated before emission |

This single change shrinks the binary count, makes AIB feasible, and lets the data stand as-is.

---

## 4. Data gaps (DC-01…DC-14)

| ID | Gap | Evidence in data | Impact | Fix | Notion | Owner |
|---|---|---|---|---|---|---|
| DC-01 | Three competing rate definitions | `ratePerDay` + `stdRate` (1–4) + `runMinutesPerUnit` (15–60) | wrong capacities → infeasible | canonical contract §3 | D-20 (new) | DATA+AI |
| DC-02 | Capacity concurrency unused | `mes/resource.nominal_concurrent_units` all = 1 | can't model parallel cells | support >1; seed ≥1 = 2 | D-21 (new) | DATA |
| DC-03 | Whole-day buckets vs minutes | demand/derate per-day, processing in minutes | rounding inflates load | shift buckets; minutes/day | D-14, D-06 | DATA |
| DC-04 | `frozen` is a flag, not a commitment | 6 AIB jobs `frozen:true`, no committed start | frozen horizon not pinnable | surface `erp/operation_schedule` planned starts | B-04, D-04 | AI+DATA |
| DC-05 | `pegged` ignored by the model | AIB demands carry `pegged`; treated as free | priority/frozen not enforced | make pegged/frozen hard constraints | A-06, B-02 | AI |
| DC-06 | No material in the run | `bom_*`, `inventory_state`, `approved_source`, `net_requirement` present, unused | COM-1018 material invisible | build AIB-mrp; add material release date | A-06, A-07, D-11 | AI+DATA |
| DC-07 | Test gates unenforced | ops carry `testGate: LEAK_PASS / FUNCTIONAL_PASS` | invalid schedules | model gates as mandatory precedence | D-05, B-03 | AI |
| DC-08 | Setup matrix unused | `erp/setup_matrix` present | capacity overstated | sequence-dependent setup | D-12, B-07 | AI |
| DC-09 | Demand too regular | qty cycles 8,12,…,44; weekly dates; no cancellations | algorithms unstressed | inject lumpy/intermittent demand, cancellations, priority effectivity | D-09 (new) | DATA |
| DC-10 | Calendar weekend-only | `horizonDays` has no holidays/shift/TZ rule | date edges untested | `SHIFT-CAL`, holidays, explicit bucket/TZ | D-06, D-14, OI-43 | DATA |
| DC-11 | UoM conversion undefined | tests↔loops↔pieces open | peg/ladder mismatch | conversion master + asserted invariant | D-13, OI-44 | DATA |
| DC-12 | `priorityKey` string, no weight | `"P1\|date\|id"`; `P1_RECOVERY` undefined | ordering not data-derived | priority policy master → numeric key | A-04, OI-20 | AI+DATA |
| DC-13 | Provenance not populated | `data/number_ref` declared, not emitted | no runtime orphan-number guarantee | emit NumberRef per derived number | K-05, K-06 | BE |
| DC-14 | Derived-vs-stored not enforced | AIB "a projection" by policy only | a parallel fixture can reappear | CI check: only registered projections | D-16, T-03 | QA |

---

## 5. Algorithm gaps (AL-01…AL-16)

| ID | Gap | Where | Impact | Fix | Notion | Owner |
|---|---|---|---|---|---|---|
| AL-01 | Capacity disjunctive/whole-day, not rate-based cumulative | `schedule.py` | TEST-LEAK-01 175/130 → infeasible | rate-based cumulative capacity (§3) | B-13 (new) | AI |
| AL-02 | Time-indexed MIP doesn't scale | B-03 | 31.2k binaries | cumulative + bounded windows | B-14 (new) | AI |
| AL-03 | Naive EDD list scheduling | `solve_dispatch` | 36/40 late | critical-ratio/ATC + local search | B-15 (new) | AI |
| AL-04 | No rolling-horizon decomposition | B-12/C-08 | monolithic 130 days | 45-day rolling + frozen boundary | B-14 | AI |
| AL-05 | Objective ignores cost | B-08 | can't trade service vs margin | objective from `erp/order_margin` + penalty | B-08 | PM+AI |
| AL-06 | No material/eligibility in optimisation | A-06/A-07 | capacity-only answers | AIB-mrp → material release dates | A-11 (new) | AI |
| AL-07 | No setup-aware sequencing | B-07 | unrealistic capacity | sequence-dependent setup | B-07 | AI |
| AL-08 | No flexible/parallel resource choice | `erp/alternate_resource` | under-used capacity | alternate-resource choice | B-13 | AI |
| AL-09 | No yield/scrap derate | `mes/loss_event` | optimistic capacity | yield factor in capacity | B-13 | AI |
| AL-10 | No stochasticity/robustness | A-10/B-11 | point estimates as truth | scenarios + CRN (deferred) | A-10, B-11 | AI |
| AL-11 | Family C absent | C-01…C-09 | shift execution doesn't exist | WO state + dispatch + handover + cert gate | C-01…C-09 | AI |
| AL-12 | CTP not built | A-08 | capable date asserted | compute `governed/commitment_capable_date` | A-12 (new) | AI |
| AL-13 | Not the source of truth | A-09/U-03 | solver is a parallel artifact | wire ledger/UI to solver | A-09, U-03 | BE+FE |
| AL-14 | Determinism partial | K-05…K-11 | reproducibility not proven | canonical hashes end-to-end | K-05, K-06, K-11 | BE |
| AL-15 | No output validation before emission | QA | invalid schedules surfaced | validate frozen/gate/capacity invariants | B-16 (new) | QA |
| AL-16 | Lead-time feasibility not pre-checked | — | late jobs blamed on solver | capacity-vs-demand pre-check | B-17 (new) | AI |

---

## 6. ERP · CRM · MES · software · UI · product wiring (WG-01…WG-08)

| ID | Domain | Gap | Fix | Notion |
|---|---|---|---|---|
| WG-01 | ERP | routing/work-order/operation-schedule tables exist; the app reads none | read model + ledger from ERP masters | D-05, B-06, U-03 |
| WG-02 | ERP | MRP netting unbuilt; setup matrix idle | AIB-mrp + setup sequencing | A-06, B-07 |
| WG-03 | CRM | requested→promised→capable asserted in code, not read | read `governed/commitment_date_triad` | D-02, A-05 |
| WG-04 | MES | `work_order_operation`, `dispatch`, `shift_handover`, `operator_qualification` unused by Family C | build Family C on MES tables | C-01…C-09 |
| WG-05 | Software | solver build-time only; no runtime compute; audit sink undefined | OptimizationPort + audit JSONL | K-09, P-06 |
| WG-06 | Software | persistence + trust boundary open | JSONL run store; P-03 decision | P-03, P-07, OI-08 |
| WG-07 | UI/UX | ship-day flag, frozen plan, run card, selection bus, floor unwired | wire views to solver + context | U-02…U-06, CP-* |
| WG-08 | Product | MVP cut line, north-star, demo hero unresolved | decide Q-07/OI-28/OI-13 | OI-07, OI-28 |

---

## 7. Prioritised plan

### P0 — correctness on real data (unblocks everything)
1. **Canonical time/capacity contract** (DC-01…DC-03, §3) — one module, one source.
2. **Rate-based cumulative capacity** in the solver (AL-01) — replaces whole-day occupancy.
3. **Feasibility pre-check** (AL-16) — capacity vs demand per resource, before solving.
4. **Honour frozen + pegged + test gates** (DC-04, DC-05, DC-07).
5. **Validate solver output** before emission (AL-15).

### P1 — quality and scale
6. Rolling horizon 45 d + dispatch (critical-ratio/ATC) + local search; MIP only for bounded windows at a 1–2% policy gap (AL-02…AL-04).
7. Material/eligibility in the model (DC-06, AL-06) → COM-1018 enters.
8. Setup-aware sequencing (DC-08, AL-07) and objective from margin/penalty (AL-05).
9. Family C minimum viable (AL-11).
10. CTP computed (AL-12) and ledger/UI wired to the solver (AL-13, WG-01/WG-07).
11. NumberRef + canonical hashes at runtime (DC-13, AL-14).

### P2 — realism and differentiation
12. Data adversarialism (DC-09, DC-10): intermittency, cancellations, change orders, scrap, downtime, holidays, parallel machines.
13. Stochastic/robust + DES (AL-10) with common random numbers and paired deltas.
14. Multi-site, RAG copilot, exec KPI.

---

## 8. Sequencing and milestones

| Milestone | Contents | Gate | Depends |
|---|---|---|---|
| M0 — Contract | §3 module; DC-01…DC-03; AL-01; AL-16 | capacity reconciles; pre-check reports overload | — |
| M1 — Solver shape | AL-02…AL-04; DC-04/05/07; AL-15 | 40-job AIB schedule solves, ≤ 10% late | M0 |
| M2 — Material | AIB-mrp (DC-06, AL-06) in `erp/net_requirement` + pegs | COM-1018 material shortfall visible | M1 |
| M3 — Setup + objective | DC-08, AL-07, AL-05 | sequence-aware; margin in objective | M1 |
| M4 — Family C | C-01…C-09 on MES tables | coverage/cert gate + handover delta | M1 |
| M5 — CTP + wiring | AL-12, AL-13, WG-01/07 | capable date computed; app reflects solver | M2, M4 |
| M6 — Kernel + adversarial data | DC-13, AL-14, DC-09/DC-10 | hashes stable; data stresses the model | M5 |
| M7 — Assurance | B-16, D-16/T-03, T-15 | defect→test closure; lint gates | all |

Critical path: **M0 → M1 → M2 → M3/M4 → M5 → M6 → M7.**

---

## 9. Traceability to the live registers

| This plan | Existing Notion task / OI |
|---|---|
| DC-01, DC-02 | new D-20, D-21; extends D-04 |
| DC-03, DC-10 | D-06, D-14, OI-43 |
| DC-04, DC-05, DC-07 | B-04, A-06, B-02 |
| DC-06, DC-11, DC-12, DC-13 | A-06/A-07, D-11, D-13, A-04, K-05 |
| DC-08, DC-09, DC-14 | D-12, new D-09, D-16 |
| AL-01…AL-04 | B-13/B-14/B-15 (new); B-03, B-12 |
| AL-05, AL-06, AL-12 | B-08, A-11 (new), A-08/A-12 (new) |
| AL-11 | C-01…C-09 |
| AL-13, AL-14 | A-09, U-03, K-05/K-06 |
| AL-15, AL-16 | B-16/B-17 (new), T-15 |
| WG-01…WG-08 | D-05/B-06, A-06/B-07, D-02/A-05, C-01…09, K-09/P-06, P-03/P-07, U-02…U-06/CP-*, OI-07/OI-28 |

**New OIs to register:** OI-56 (canonical time/capacity contract) · OI-57 (shift-bucket granularity + TZ) · OI-58 (numeric priority weight) · OI-59 (FX master — FX-01) · OI-60 (adopt AIB as the solver input; retire provisional fixture).

**New tasks to register:** D-20 … D-26 · A-11, A-12 · B-13 … B-17 · K-12 · T-16, T-17.

---

## 10. Acceptance (definition of done)

1. Capacity reconciles: `Σ planned_minutes ≤ capacity_minutes` per (resource, bucket), and the golden leak-test derate is computed from intervals.
2. The 40-job AIB schedule solves from real masters (no provisional fixture) with bounded lateness and no gate/frozen violation.
3. Material appears: at least one commitment shows a material-constrained release date.
4. Setup and objective reflect `erp/setup_matrix` and `erp/order_margin`.
5. Family C: a coverage/cert gate and a handover delta are computed from MES tables.
6. The ledger/UI shows solver numbers, not `model.ts`, with every number a NumberRef.
7. Data adversarialness: intermittency, cancellations, holidays, and ≥1 parallel resource are present and exercised.
8. `test:coolit` and the extended `verify` pass; a single dangling id or orphan number fails the build.

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| Contract fix cascades into golden hashes | version the master set; announce the bump (N-05/P-09) |
| Two rate models persist | delete `ratePerDay`-as-duration in code; lint forbids it |
| Rolling horizon changes answer semantics | pin frozen boundary; baseline immutable; DecisionDiff on replan |
| Family C scope explodes | MVP first (state + dispatch + handover + cert gate + overtime) |
| Adversarial data breaks the demo story | keep a golden baseline fixture alongside the adversarial pack |
| AIB regrows into a store | CI check DC-14; projections only, content-hashed |

---

## 12. Change log

| Version | Date | Change |
|---|---|---|
| v3.0 | 2026-09-27 | Created the data→model-contract plan grounded in v3.1 + AIB v1 + the live Notion registers: 14 data gaps, 16 algorithm gaps, 8 wiring gaps; the canonical time/capacity contract; P0–P2 prioritisation; M0–M7 sequencing; traceability; new OIs/tasks |
| v3.1 | 2026-09-27 | Embedded the contract as data in **v3.2** (5 ERP/reference tables, standard envelope, schema-registered); corrected the capacity formula (derate already applied to available; overtime ≥ regular); ran three review rounds (22 checks, 0 failures) and fixed two semantic defects; added §13 |

---

## 13. v3.1 update — contract embedded in v3.2, three review rounds

The P0 contract is now **data**, not prose, and it follows the current ERP/reference structure: 27-column envelope, domain-correct placement, registered in `schema/table_catalog.csv` + `column_dictionary.csv`, and covered by review checks.

| New table (embedded) | Domain | Rows | Contract |
|---|---|---:|---|
| `erp/operation_duration` | ERP | 1,200 | duration = `setup_minutes + quantity × run_minutes_per_unit` (DC-01) |
| `erp/capacity_bucket` | ERP | 156 | capacity = `available_minutes_per_day × business_days × concurrent_units` (DC-01/02/03) |
| `reference/priority_policy` | REFERENCE | 3 | numeric priority weight + ordering key (DC-12) |
| `reference/fx_master` | REFERENCE | 4 | FX rates so `erp/order_margin` is computable (OI-59) |
| `reference/resource_concurrency` | REFERENCE | 6 | concurrency override seeding >1 (DC-02) |

**v3.2 totals:** 179 datasets · 42,657 rows · review PASS (22 checks).

### What the contract data exposes
`erp/capacity_bucket` bands **17 overloaded resource-weeks** (TEST-LEAK-01 ×8, LINE-RM-01 ×4, LINE-CPL-01 ×3, LINE-CDU-01 ×2), with 1 WATCH and 138 OK. This is the same over-capacity the AIB run hit — now surfaced as data (AL-16 feasibility pre-check) instead of a solver failure.

### Three review rounds (improvement log)
| Round | Focus | Checks | Result |
|---|---|---:|---|
| 1 | Schema and completeness | 9 | PASS |
| 2 | Contract integrity and reconciliation | 9 | PASS after fix |
| 3 | Semantics, provenance, and edge controls | 6 | PASS after fix |

**Two defects found and fixed during review:**
1. **Double-derate (round 2).** The first cut multiplied `derate_factor` again on an already-derated `available_minutes_per_day`. Fixed: capacity uses `available × days × concurrency`; nominal/regular and overtime are exposed explicitly, and a check asserts the derate is applied exactly once.
2. **Derate semantics (round 3).** `available_minutes_per_day` is ≥ `regular_minutes_per_day` (overtime), so `available = regular × derate` is wrong when there is no derate. Fixed: when `derate < 1`, `available = regular × derate`; otherwise `available ≥ regular`. The invariant now encodes both regimes.

### Conformance
- Every new table carries the 27-column envelope and sits in ERP or REFERENCE.
- Every referenced id resolves (resource, calendar week, work order, routing operation); no orphan rows.
- `erp/operation_duration` cites no provisional fixture — it reads `erp/routing_operation` and `erp/work_order`.
- The contract is a projection over ERP/reference tables; `erp/capacity_bucket` is regenerated, never hand-edited.

### Still to build (unchanged priorities)
AL-01 (rate-based cumulative capacity in the **solver**, not just the data), AL-16 (pre-check), AIB-mrp (DC-06), rolling horizon + dispatch (AL-02…AL-04), Family C (AL-11), NumberRef (DC-13).