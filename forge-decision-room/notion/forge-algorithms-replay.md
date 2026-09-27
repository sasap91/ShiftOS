# FORGE Decision Room — Algorithms, Allocation & Replay

> Defines the deterministic decision services: capacity, allocation, eligibility, dates, feasibility, scenario generation, invalidation and reproducibility — now extended to the three algorithm families: **demand planning (A)**, **production planning (B)** and **shift execution (C)**. Model `ctp-0.2.0` → target `ctp-0.3.0` · code `decision-services@0.1.0`. Detailed build design in the companion page [Algorithms Build Design](forge-algorithms-build-design.md).

| Field | Value |
|---|---|
| Document | FORGE Decision Room — Algorithms, Allocation & Replay |
| Version | v0.2 — placeholders completed with the three-family design |
| Status | 🟡 Recommendation — for review |
| Owner | AI / reasoning + Backend / API |
| Parent doc | FORGE Decision Room — Product Management |
| Ground truth | `src/model.ts` · `src/master.ts` · `src/orchestrator.ts` · `src/verify.ts` |
| Last updated | 2026-09-26 |

---

## 0. Purpose & scope

- Purpose: define exactly how official quantities, dates and feasibility are computed, and how a run is reproduced.
- In scope: capacity, allocation/pegging, eligibility/gates, date derivation, alternatives, invalidation, replay, causal codes; plus the demand (A), production (B) and shift-execution (C) families.
- Out of scope: narrative explanation (copilot), UI (UI/UX).
- Boundary: the algorithm server computes; it never writes to ERP/CRM/MES. Approval never executes; a receipt is required.
- Detailed working design (data contracts, pseudocode, edge cases): companion page **Algorithms Build Design**.

---

## 1. Determinism contract

- The same `(snapshot_hash, master_set_version, model_version)` reproduces the same run output.
- **Snapshot hash inputs:** canonical JSON (**RFC 8785 JCS**, keys sorted by code point) + SHA-256 over a two-level Merkle root of masters and transactions: `sha256(jcs({ master_set_version, masters: merkleRoot(...), txns: merkleRoot(...) }))`.
- **Version policy:** `model_version = semver(code) + sha256(build artifact)`; any master edit bumps `master_set_version`; a model change bumps `model_version`.
- **May change output:** master set version, any record field, algorithm code, solver version, explicit config, seed.
- **Must not:** object key order, iteration order of unordered sets, locale, timezone, wall-clock, float formatting, host/thread count.
- **Determinism rules:** stable total-order sorts with explicit tie-breakers; no `Set`/`Map`/object iteration order; no `localeCompare` (use code-unit order); no `Date.now()` (inject a logical clock); quantise floats (`round(x, 6)`, integer minor units for money); seeded PRNG only, stream-keyed by `hash(seed ‖ phase ‖ entityId)`.
- **Provenance:** every user-facing number is a `NumberRef { value, unit, derivedFrom[], masterVersion, formula, traceId }`. This is how the "no orphan numbers" invariant survives the three families.

---

## 2. Capacity model

- Capacity is a **derived** quantity, never a literal: `capacity(resource, t) = baseRate × Π derateFactors(t) × shiftFactor(t)`.
- Derates come from evidence-backed causes (maintenance, calibration, failure, restoration) as **effective-dated capability intervals**, not a calendar hidden constant.
- `rateFactor` 1.0 normal, 0.5 half-rate; state ∈ running | degraded | down.
- Current fixture (reference): 6 healthy + 7 degraded days; 304 total leak tests (6×2×16 + 7×2×8). **`304` is retained as a golden `verify` assertion computed from segments**, so window options mutate inputs, not the formula.
- Multi-resource routings aggregate by **product of derates on the same resource** and **minimum rate across series-required resources**; fold intervals sorted by `(from, resourceId)`.

---

## 3. Allocation & pegging

- **Priority-ordered, time-phased (per business day)** allocation; frozen-horizon work is protected; pegs are explicit (W5/D-18).
- **Peg first, net second:** every gross-requirement row carries `(sourceCommitmentId, parentOrderId, bomRefId)`; every supply row carries its `sourceFactId`. Store a peg graph, not scalar subtraction: `Peg { qty, demandRef, supplyRef, masterRefIds }`.
- `verify` asserts Σ pegs per supply = consumed supply and Σ pegs per demand = allocated demand; ungrounded qty is a verify failure.
- Lot sizing: lot-for-lot for make-to-order A items; POQ/FOQ for purchased parts; integer, memoised Wagner-Whitin only for bounded horizons.
- Wrapped/conditional shortages (COM-1018 MV-14/MV-14B) are represented as a **separate eligible alternate pool** consumed only for the pegged item under a QMS hard gate.

---

## 4. Eligibility & hard gates

- Held / failed / expired / unqualified supply contributes zero eligible supply.
- Eligible on-hand (`∑`, derived): `min(ERP_qty, WMS_qty) − held − expired − failed − unqualified`. The `|ERP−WMS|` delta and unverifiable qty become a **quarantined `Conflict`**, never eligible, never auto-resolved (keeps `CNF-QD-220`).
- **Hard gates (non-waivable, outrank capacity and material):** frozen horizon (`POL-FROZEN`), unapproved source (`POL-ELIG` / sourcing), eligibility (hold/failed/expired/unqualified), PM/calibration breach, certification expiry, ship-day rule.
- A gate is a `gated` event, never a silent pause and never a baseline mutation.

---

## 5. Dates & feasibility

- Earliest full ship derives from recovery capacity, the ship calendar and the allocation: `ship = nextShipDay(longest honest completion)`. A promise on a non-working day is flagged and cannot be silently feasible (fixes **D-05**, inverts the `verify.ts:224` assertion **N-01**).
- `COM-1018` date is **derived** from supplier commit + ship calendar (fixes **D-06**), not the literal `"2026-10-21"`.
- Feasibility is classified as `feasible / infeasible / unknown(timeout)` and is distinct from a time-limited solver result: a timeout with no solution is **never** "proven infeasible".

---

## 6. Scenario generation

- Scenario runs are immutable, baseline-preserving, and enumerate feasible + rejected alternatives.
- Alternatives are edits to inputs (move/split/defer maintenance window, add shift, expedite part, substitute material), each scored with an impact vector — not a scalar: `{ freedCapacity, pmSlippageDays, addedCostCad, riskDelta, serviceLevel, onTimeQty, shipDateP50/P90 }`.
- Optional **simulation** (seeded DES, common random numbers, paired deltas) generates/validates alternatives only; it never sets official quantities or gates. Simulation metrics are `DerivedFact`-shaped and recomputed, never hand-entered.
- Rejected options stay visible with a rejection state: `proven_infeasible | timed_out | hard_gated | dominated`.

---

## 7. Invalidation & staleness

- Runs expire with the snapshot; evidence changes invalidate or expire recommendations; stale expected versions reject execution.
- **Compare-and-swap on execute:** `execute(runId, expected {snapshotHash, masterSetVersion, seed})`; on mismatch throw `StaleError` with the diff.
- **Rebase/rerun** produces `run v2` with `parentRunId` and a visible diff (`changedInputs`, `changedOutputs`, `statusTransition`); v1 is never mutated.

---

## 8. Run lifecycle & solver states

- Phases: Queued → Snapshot validation → Model build → Presolve → Search → Candidate validation → Causal translation → Evidence packaging → Complete. State is an append-only event fold.
- Terminal states: OPTIMAL · FEASIBLE_WITHIN_POLICY_GAP · TIME_LIMIT_WITH_FEASIBLE_RESULT · TIME_LIMIT_NO_FEASIBLE_RESULT · PROVEN_INFEASIBLE · STALE · CANCELLED · FAILED.
- **Invariant:** a timed-out search that found no solution is **never** described as proven infeasible. `OPTIMAL` only when `gap ≤ policyGap`; `PROVEN_INFEASIBLE` only with a certificate and no limit hit.
- Solver reproducibility: `threads=1`, fixed `random_seed`, fixed presolve, pinned solver version, integer objective coefficients; record `solverSig` in the run. Solvers live behind an `OptimizationPort` seam.

---

## 9. Reproducibility & replay

- **Canonical result fingerprint:** `sha256(jcs({ model_fingerprint, vars: sorted[(name, value)], objective, status, bound, gap }))`.
- The event-sourced rebuild folds the event stream to state; replay re-derives `canonicalResult` from `(snapshot_hash, master_set_version, model_version, seed)`.
- **Replay guarantees:** deterministic re-derivation of the fingerprint and the event fold.
- **Replay does not guarantee:** identical wall-clock/status across solver versions or hardware, or that a replay is a legal executable action — replay is read-only; execution is gated by the gateway receipt.

---

## 10. Causal codes

- A versioned, business-readable causal-code map (`causal-map@YYYY-MM-DD`, frozen into `codeVersion`); raw logs/duals are never the sole basis for user-facing causality.
- Solver internals map to codes: capacity-row dual → `CAPACITY_BINDING`; due-date row → `PROMISE_WINDOW_TOO_SHORT`; IIS members → `CONFLICT_PAIR(a,b)`; CP-SAT `sufficient_assumptions_for_infeasibility` → `INFEASIBLE_UNDER[...]`; FeasRelax cost → `CHEAPEST_RELIEF_<row>`.
- The existing override vocabulary (`LABOR_NOT_REALISTIC`, `SUPPLIER_EXPEDITE_NOT_CREDIBLE`, `CUSTOMER_PRIORITY_MISWEIGHTED`, `CHANGEOVER_COST_UNDERSTATED`, `POLICY_CONSTRAINT_MISSING`, `DATA_STALE`, `OPERATIONAL_RISK_TOO_HIGH`) is promoted to first-class codes so solver causes and human disputes share one namespace.
- Each run emits an `Explanation`: binding constraint, 2–4-step causal chain ending in a business effect, counterfactual(s) with clause and delta, alternatives with deltas, confidence, provenance, redaction.

---

## 11. The three algorithm families

### 11.1 Demand planning (A)
Signal vs commitment (firmness decides eligibility); method-per-regime forecast (smooth→ETS/Theta, intermittent→TSB, erratic→SBA, sparse→ADIDA); coefficients as a versioned master; MASE + bias + FVA (never MAPE), conformal P10/P50/P90; priority as a lexicographic ordering key; the `requested → promised → capable` delta with the demand queue sorted by `capableToRequested`; MRP netting over eligible supply; emits a dated `DemandRequirement` and consumes production's `capableDate`.

### 11.2 Production planning (B)
Time-phased capacity buckets; flexible job-shop with optional intervals, `NoOverlap`, circuit-based sequence-dependent changeover, material reservoir, pinned frozen horizon; decision rule small→CP-SAT exact, medium→CP-SAT + warm start/timeout, large→shifting-bottleneck + local search; integer lexicographic objective (tardiness → makespan → setup/WIP) with deterministic tie-break; derived ship dates.

### 11.3 Shift execution (C)
Append-only work-order state machine (`planned→released→dispatched→in_progress→paused⇄/gated→complete→closed`); dispatch within the frozen window (eligibility filter → critical ratio → EDD → SPT → setup grouping); handover delta derived from the event log; coverage/certification gating per shift interval; overtime over the Finance threshold routed for named approval; receding-horizon replanning produces a new run, never a baseline edit.

> Full data contracts, pseudocode and edge cases: [Algorithms Build Design](forge-algorithms-build-design.md).

---

## 12. Open questions

1. Does time-phasing change the solver contract or only the inputs? **Resolved: inputs only — the engine stays deterministic; time-phase the inputs.**
2. Is November demand modelled or declared out-of-window (Q-03)? **Recommend model once W5 lands.**
3. Recovery contention model (D-19)? **Resolved: engine does not self-compete; consume availability segments and contention from the capability model.**
4. Solver seam now vs later: **recommend precomputed canonical schedules now, `OptimizationPort` later.**

---

## 13. Change log

| Version | Date | Change |
|---|---|---|
| v0.1 | 2026-09-26 | Created algorithms, allocation & replay skeleton with placeholders |
| v0.2 | 2026-09-26 | Completed all placeholders: determinism contract (JCS + Merkle), derived time-phased capacity, time-phased pegging, gate list, derived dates, scenario/impact vectors, CAS invalidation, solver states, canonical fingerprint, causal-code map; added the demand/production/shift-execution families and a link to the Algorithms Build Design |