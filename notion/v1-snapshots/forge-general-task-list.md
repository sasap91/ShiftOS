# FORGE Decision Room — General Task List

> The general, area-level roll-up of everything that must be built for FORGE Decision Room. The detailed, numbered per-task breakdown lives in the **Execution Task List** (streams K/D/A/B/C/T/P/G/U/X). This page answers "what are the work areas and where do we stand" at a glance.

| Field | Value |
|---|---|
| Document | FORGE Decision Room — General Task List |
| Version | v0.5 |
| Status | 🟡 Active — general view; detail in the Execution Task List |
| Owner | Product Management |
| Ground truth | `src/` · `tools/gurobi/` · `npm run verify` = green |
| Last updated | 2026-09-26 |

**Status legend:** ✅ Done · 🔄 In progress · ⬜ Todo · ⏸ Blocked (decision needed) · ⛔ Cut.
**Owners (functions):** PM = Product Management · BE = Backend/API · AI = AI/reasoning · DATA = Data modelling · FE = Frontend/UX · QA = Backend/API (verification) · GOV = Governance/Policy · BIZ = Business/pitch.

---

## 0. How to read this list

- **Areas** map to the streams in the Execution Task List; use that page for task IDs, dependencies and exit criteria.
- This page carries the **product-level and documentation** tasks that the Execution Task List does not.
- Status here is a roll-up; when it disagrees with the Execution Task List, the Execution Task List wins.

---

## 1. Area summary

| Area | Scope | Owner | Status | Detail |
|---|---|---|---|---|
| Product & documentation | doc set, decisions, owners, sync | PM | 🔄 | this page §2 |
| Kernel & determinism (K) | deterministic solver env, hashes, provenance | AI + BE | 🔄 (K-01…K-04 done) | Execution Task List §1 |
| Data (D) | masters, transactions, fixtures, lint | DATA | ⬜ (D-01 docs done; D-05 provisional) | §2 |
| Algorithms (A/B/C) | demand · production · shift execution | AI | 🔄 (B-02…B-05 done; A-09 wired) | §3 |
| Data & algorithm gaps (DG/AG) | capacity contract, rate schema, MRP, family C | AI + DATA | 🔴 open (14 DG · 16 AG) | Data & Algorithm Gaps §1–§2 |
| Governance & explainability (G) | authority, disclosure, causal codes, overrides | GOV + BE | ⬜ | §4 |
| UI / state (U) | four-pane layout, selection bus, floor plan | FE | 🔄 (middle-top Layout/floor plan · order table · right-pane chat · four personas implemented; left filters, full selection bus, run dock and states pending) | §5 |
| Testing (T) | verify, lint, property/replay/CAS, acceptance | QA | 🔄 (T-01 done) | §6 |
| Deployment / platform (P) | CI, trust boundary, persistence, hosting | BE + PM | 🔄 (P-01 local done) | §7 |
| AI chat (X) | intent router, tool gateway, orchestrator | AI + BE | ⏸ (gated on P-03) | §8 |

---

## 2. Product & documentation tasks

| ID | Task | Owner | Depends | Status |
|---|---|---|---|---|
| PT-01 | Publish the local-only docs to Notion (Execution Task List, Algorithms Build Design, Delivery Plan) | PM | — | ⬜ |
| PT-02 | Attach the authoritative plant floor-plan image to UI/UX §3 | PM | — | ✅ |
| PT-03 | Fix PM §12 links (relative file links → Notion URLs) | PM | PT-01 | ⬜ |
| PT-04 | Resolve the open decisions Q-01…Q-07 and log ADR-001 | PM | — | ⬜ |
| PT-05 | Confirm individual owner names for the RACI | PM | — | ⬜ |
| PT-06 | Fill remaining placeholders (UI/UX, Data Model, Demo pages) | PM + owners | PT-04 | ⬜ |
| PT-07 | Keep the status/roadmap and PM hub in sync after each milestone | PM | — | 🔄 |
| PT-08 | Publish this General Task List, the Open Item List and the Design List | PM | — | 🔄 |
| PT-09 | Define the demo hero commitment + ROI headline | BIZ + PM | — | ⬜ |
| PT-10 | Record the north-star metric once Q-07 is closed | PM | Q-07 | ⬜ |

---

## 3. Data tasks → Execution Task List Stream D

- **Do:** extend `Commitment` (+requestedDate, orderRef, customerPriority, value); add Zone, Routing, ShipCalendar, MES (WorkOrder/ShiftHandover/OperatorCertification), EAM (MWO/RestorationFact/CalibrationRecord), policy authority, override, and the algorithm entities (NumberRef, DemandRecord, NetRow+Peg, CapabilityInterval, Explanation).
- **Gates:** resource→zone uniqueness; every commitment resolves to a routing; peg conservation; effectivity covers the as-of.
- **See:** Execution Task List D-01…D-19.

---

## 4. Algorithm tasks → Execution Task List Streams A/B/C

- **Family A (demand):** signal vs commitment, forecast method-per-regime, three deltas, MRP netting, CTP service, time-phased allocation.
- **Family B (production):** capability evaluator, Gurobi allocation + scheduling (done), frozen pinning, ship-day normalisation, scenario generation, derived ship dates.
- **Family C (shift):** WO state machine, dispatch, handover delta, coverage/certification gating, overtime routing, rostering, replanning.
- **Capacity contract (P0, highest leverage):** replace whole-day disjunctive occupancy with **rate-based, shift-bucketed** capacity (`duration = setup + qty × runMinutesPerUnit`; `capacity = ratePerDay × nominal_concurrent_units × derate`); add a feasibility pre-check. See Data & Algorithm Gaps §5; tasks B-13…B-15.
- **Contract runs (v3.2):** `schedule_contract.py` (rate-based cumulative, CURRENT scope: 30/40 on time), `reconcile_capacity.py` (contract 17 overloaded weeks vs recomputed 0 — P-week date mapping missing), `demand_projection.py` (60 commitments → 18 at risk, 20 unlinked). See Data & Algorithm Gaps §4a.
- **See:** Execution Task List A-01…A-11, B-01…B-20, C-01…C-09; design in Algorithms Build Design.

---

## 5. UI / state tasks → Execution Task List Stream U

| ID | Task | Owner | Status |
|---|---|---|---|
| UT-01 | Four-pane layout (left scope · centre layout+table · right chat) | FE | ✅ (left scope · centre layout+table · right chat) |
| UT-02 | Plant floor plan (zones, overlays, zone-select filter) | FE | ✅ (middle-top Layout view · zones · overlays · zone-select filter) |
| UT-03 | Order information table (columns + per-role emphasis) | FE | 🔄 (order table implemented with the §4 nine-column set; detail tray + per-role emphasis pending) |
| UT-04 | Chatbot pane (move chat centre→right; evidence sub-surface) | FE | ✅ (chat on right; evidence drawer under the thread) |
| UT-05 | Left pane filters + general/planner attributes | FE | ⬜ |
| UT-06 | Selection bus + deep-link router | FE | 🔄 (single `activeContext` selection works; full bus + deep-link ids pending) |
| UT-07 | Durable run dock + states (stale/conflict/unauthorized) | FE | ⬜ |
| UT-08 | Persona-lensed queue + default sorts | FE | 🔄 (`ROLE_POLICY`/lens in `model.ts`; queue lensing + default sorts pending) |
| UT-09 | Place the order table in the **middle-bottom** region under the **middle-top Layout** view (§1 region model); add the centre top/bottom split | FE | ✅ (centre split: Layout over the order table) |

- **See:** Execution Task List U-01…U-07; spec in UI/UX Layout & Interaction Spec.

---

## 6. Governance tasks → Execution Task List Stream G

- Authority enforcement (finance/quality/program/procurement distinct from personas), disclosure/redaction before prompt, causal-code map, `Explanation` object, override review loop, persona acceptance items 1/2/5/8.
- **See:** Execution Task List G-01…G-06; design in Personas & Governance.

---

## 7. Testing tasks → Execution Task List Stream T

- Extend `verify.ts`; invert the defect-encoding test N-01; fixture-lint runner; property/replay/CAS tests; authority + redaction tests; ship-day + day-bin + peg-conservation tests; persona acceptance harness; E2E golden thread; accessibility; defect→test closure map.
- **See:** Execution Task List T-01…T-15; design in Demo, Testing & Validation.

---

## 8. Deployment tasks → Execution Task List Stream P

- Static build gate (local green); CI pipeline (tsc→verify→lint→test→build); **trust-boundary decision (P-03)**; optional Node tier; config/secrets; audit JSONL; run-store persistence; release versioning (`ctp-0.3.0` + migration note); rollback/fallback; hosting; cost model.
- **See:** Execution Task List P-01…P-12.

---

## 9. AI chat tasks → Execution Task List Stream X (gated on P-03)

Phases 0–7 in the AI Chat Build Plan: foundations, ContextEnvelope+policy+router, typed-tool gateway, investigate orchestrator, scenario orchestrator + durable runs, approval/action orchestrator, frontend wiring, hardening/demo. **Blocked** until the trust-boundary decision (P-03) is made and a model/provider is chosen.

---

## 10. Critical path & next actions

1. **PT-01/PT-03** — publish the local docs and fix hub links (today).
2. **P-03** — decide the trust boundary; unblocks AI chat (X) and hosting (P-04/P-11).
3. **Q-05 / Q-07** — close the authority model and north-star decisions.
4. **M0** — start the execution slice: kernel provenance (K-05…K-11) + integrity defects (D-17, D-18).
5. **T-02/T-03** — invert the N-01 test and add the fixture-lint runner before more data lands.
6. **UT-05 / UT-06** — add the left filters/attributes and the full selection bus now that the centre split (Layout over the order table, UT-01/UT-02/UT-09) is in place.
7. **B-13/B-14 (capacity contract)** — replace whole-day occupancy with rate-based, shift-bucketed capacity; this is the highest-leverage fix for the AIB run (OI-53/OI-54).
8. **B-19** — wire AIB v1 into `test:coolit` and retire the provisional schedule fixture.

---

## 11. Change log

| Version | Date | Change |
|---|---|---|
| v0.1 | 2026-09-26 | Created the general, area-level task list: area summary, product/documentation tasks, pointers to the Execution Task List streams, critical path |
| v0.2 | 2026-09-26 | Refreshed UI/state status to the implemented state (centre order table, right-pane chat, four personas); added UT-09 (centre top/bottom split — order table under the middle-top Layout); updated critical path |
| v0.3 | 2026-09-26 | Marked the middle-top Layout/floor plan implemented: UT-01, UT-02, UT-09 ✅ and PT-02 ✅; refreshed the UI/state roll-up and the critical path (left filters + selection bus now next) |
| v0.4 | 2026-09-27 | Added the Data & Algorithm gaps area (DG/AG); added the capacity-contract P0 to §4; extended the critical path (B-13/B-14 capacity contract, B-19 AIB wire-in) |
| v0.5 | 2026-09-27 | Recorded the v3.2 contract runs (schedule, capacity reconciliation, demand projection) in §4; demand + production planning now coherent, shift/maintenance still open |