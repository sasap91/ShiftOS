# FORGE Decision Room — Master Task List

> The single, consolidated execution view for FORGE Decision Room (COOLIT / UNIFIDE Glasswing hackathon). It reconciles every existing register — Execution Task List (streams K·D·A·B·C·T·P·G·U·X), Context Projections (CP), Data & Algorithm Gaps (DG/AG), General Task List (PT), Open Item List (OI/Q), Design List (DS) — into one ordered backlog, and adds the **Visual Parity slice (V-xx)** that closes the gap between the current build and the target screenshot.

| Field | Value |
|---|---|
| Document | FORGE Decision Room — Master Task List |
| Version | v0.1 |
| Status | 🟡 Active — consolidated, prioritized execution backlog |
| Owner | Product Management |
| Ground truth | `src/` · `tools/gurobi/` · `npm run verify` = green |
| Visual target | four-region room: top context bar · left SCOPE rail · centre SHOP FLOOR + order table · right FORGE conversation |
| Snapshot | SNAP-20260926-0815 · master set `MS-2026-09-26` · model `ctp-0.3.0` |
| Last updated | 2026-09-27 |

**Owners (functions):** PM · FE (Frontend/UX) · BE (Backend/API) · AI (reasoning/optimization) · DATA (data modelling) · GOV (governance/policy) · QA (verification) · BIZ (business/pitch).

**Status legend:** ✅ Done · 🔄 In progress · ⬜ Todo · ⏸ Blocked (decision needed) · ⛔ Cut.

**Effort units:** S ≈ ≤0.5 d · M ≈ 1–2 d · L ≈ 3–5 d · XL ≈ 1–2 wk.

---

## 0. How to read this list

- **Authoritative designs are unchanged.** UI/UX Layout & Interaction Spec (DS-06), Data Model & Fixtures (DS-07), Algorithms Build Design (DS-09), Personas & Governance (DS-11), Context & Region Projections (DS-22). This list is the *what/when/who*, not the design.
- **Section 3 (Visual Parity V-xx) is the immediate ask** — it makes the running build look like the target screenshot. Everything after is the program that makes it *real* (data, algorithms, governance, tests, deploy).
- **Task IDs are stable and inherited.** V-xx are new and each maps to one or more existing ids (UT/U/CP/D/T) so nothing is double-counted.
- **"Ground truth" beats the registers.** Where a register disagrees with `src/`, the code wins and the row is flagged (see §16).

---

## 1. What "looks like this" means (definition of the visual target)

The target is **one screen, four regions, no overlap** (build plan §0):

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ TOP  context bar: site · role · active commitment · snapshot+freshness · as-of │
├──────────────┬──────────────────────────────────────────────┬────────────────┤
│ LEFT  SCOPE  │ CENTRE · TOP  — COOLIT SHOP FLOOR (floor plan)│ RIGHT  FORGE    │
│ search       │  zones L→R in material-flow order, badges,   │ conversation    │
│ zone chip    │  overlays (decisions/downtime/coverage),     │ ask box         │
│ RISK         │  zone-select                                 │ quick chips     │
│ PRODUCT      ├──────────────────────────────────────────────┤ evidence        │
│ FLOW         │ CENTRE · BOTTOM — order table                │ governed actions│
│ OWNER        │  Promise · Order · Product · Qty ·           │ receipt/outcome │
│ HORIZON      │  Constraint · State                          │                 │
│ QUEUE (n)    │                                              │                 │
└──────────────┴──────────────────────────────────────────────┴────────────────┘
```

**Visual-parity acceptance (V-slice):** a reviewer loads the app and sees all four regions at once; the left rail filters the queue and the centre; the centre-top renders the floor plan with per-zone open-decision badges and a selectable/highlighted zone; the centre-bottom is the order table; the right pane is the FORGE conversation shell; and `role`, `horizon`, `order`, `zone` survive a reload via the URL.

> The screenshot app (port 5273) is a *separate build* not present in this workspace. This list targets `decision-room` (port 5173), whose `src/` is ground truth. If the product actually lives in the 5273 codebase, re-baseline on that repo.

---

## 2. Current state (ground truth, `src/`)

| Region | Built now | Gap to target |
|---|---|---|
| Top context bar | ✅ site · role · commitment · snapshot · freshness · as-of · **URL codec (role/order/zone/horizon)** | — |
| Left SCOPE | ✅ search · zone chip · RISK/PRODUCT/FLOW/OWNER/HORIZON · queue count · zero-state | planner-vs-overall toggle pending |
| Centre · top | ✅ **COOLIT SHOP FLOOR** — authoritative **illustration installed** (`public/floor-plan.png`, from the PRD) with 13 zone hotspots + open-decision badges + selection; schematic fallback if absent | — |
| Centre · bottom | ✅ nine-column `LedgerView`, vocabulary Promise/Order/Product·Qty/Constraint/State | per-role emphasis / detail tray |
| Right FORGE | ✅ FORGE header · quick chips · composer footnote · thread + evidence | sticky thread header, run dock |
| Data | ✅ 4 commitments, masters, memory registry, solver artifacts | **no** zone/routing masters, CRM/MES/EAM layers |
| Algorithms | ✅ Gurobi allocation + scheduling (small), frozen artifacts | demand (A), shift (C), rate-based capacity (B-13/14) |
| Governance | ✅ approval lifecycle types + memory lint | authority **enforcement** + disclosure/redaction |

**Known contradictions to fix (see §16):** Notion marks `UT-01/UT-02/UT-09/U-07 ✅`, but `src/App.tsx` `.middle-top` is a placeholder and no zone data exists in `src/`.

---

## 3. Visual-Parity slice (V-xx) — do this first

> **Status 2026-09-27: implemented.** V-01 (zone master `src/zones.ts`), V-02/V-03 (`src/ShopFloor.tsx` SVG), V-04/V-05/V-06 (`src/FilterRail.tsx` + App filter engine), V-07 (LedgerView vocabulary), V-08 (FORGE shell), V-09 (URL codec), V-10 (styles a11y) are built; `npm run build` green; 8 pure zone/filter checks added to the invariant suite (T-11). V-11 (demo fixtures) optional; V-12 pane states partial. Remaining: live zone figures, per-role emphasis, E2E (T-13) + a11y (T-14) runners.

> **Minimalism slice U1–U8 — executed 2026-09-27.** The room is calm now: **one slim top bar** (5 tokens + info popover), **quiet rail** (RISK + HORIZON visible; PRODUCT/FLOW/OWNER behind “More”), **floor-dominant centre** (floor ≈57% of the centre), **sparse 6-column table** (Promise · Order · Product · Qty · Constraint · State — single-line rows, all math/provenance in the expanded row), and a **pure-chatbot right pane** (conversation + `Message FORGE…`/Send; evidence behind an “Evidence” toggle; governed actions inline in the thread). Budgets verified in-browser (top tokens 5 · rail groups 2 at rest · 6 cols · 6 cells/row · no phase stepper · floor ≈57%); roles keep identical numbers. Remaining: **D-U1** (60-row read model). 3 rounds green.

Ordering assumes one FE + one DATA working in parallel. §15 gives the 2-week sequence.

| ID | Task | Owner | Depends | Exit criteria |
|---|---|---|---|---|
| **V-01** | **Zone master + geometry** — ~13 zones from the illustration, id scheme (`ZN-*` vs legacy `Z-ASM/Z-ELEC/Z-LT/Z-FT/Z-SHIP`), left→right order, `floorX/Y/w/h`, resource→zone map (fold electronics into CDU) | DATA + FE | OI-27, OI-06, OI-26 | every resource in exactly one zone; every commitment resolves to a routing→zone chain; ids frozen with the zone master |
| **V-02** | **ShopFloor render** — schematic SVG (preferred) or illustration PNG + hotspots; zone rectangle = id + name + one live figure + one state dot; material-flow arrows; pedestrian/material aisles; utilities block | FE | V-01 | all zones render L→R; live figure + state dot per zone; true aspect ratio; no CAD-style detail |
| **V-03** | **Floor overlays** — open-decision **badge count** per zone, downtime, coverage risk, **selection highlight**, hover preview | FE | V-02 | overlays derived from resource/commitment state; plan never holds a fact the table cannot show |
| **V-04** | **Zone-select → filter** — selecting a zone filters queue + order table and re-scopes the right pane; zone chip in the rail | FE | V-02, V-05 | selecting `ZN-08` yields the same set in all three panes |
| **V-05** | **Left SCOPE rail** — search, zone chip, filter groups **RISK · PRODUCT · FLOW · OWNER · HORIZON**, `Clear`, queue count in header | FE | — | controls render; selecting applies (see V-06) |
| **V-06** | **Filter engine** — map each commitment → risk / product family / flow stage / owner / horizon; filter + counts + explicit zero-state ("No decisions match. Clear n filters.") | FE + DATA | V-05, D-02 | filters change queue **and** table; zero-state explicit; count computed once |
| **V-07** | **Order-table visual parity** — visible set = Promise · Order · Product · Qty · Constraint · State (state chip); keep the nine-column set behind the expanded tiers | FE | — | visible columns match target; tiers/sort/a11y preserved |
| **V-08** | **Right-pane FORGE shell** — "FORGE" header with context/empty state, quick chips (Why at risk? · Show constraint · Compare options), composer + footnote ("No Approval / Release / Publish controls exist in chat.") | FE | — | chips map to existing intents; empty state present |
| **V-09** | **Context bar + URL codec** — `?role&horizon&order&zone&focus&view`; read on load; replace the dead `window.location.hash` write; deep-link `#/site/YYC-01/commitment/<id>/...` | FE | V-04 | reload restores the exact context; selection survives navigation |
| **V-10** | **Visual system + responsive + a11y** — palette/type/density tokens; zone badge + selected-card styling; <980px tabs; focus ring, landmarks, reduced motion | FE | V-02..V-08 | no pane overlap at ≥1180px; tabs below; accessibility checks pass |
| **V-11** | *(Optional cast)* **Demo fixtures** — `COM-0051…` style orders, "Supply + Test + Quality" constraint, 13-week horizon, `watch`/`at risk` chips | DATA | D-02, D-06 | fixtures deterministic; golden hashes updated once |
| **V-12** | **Pane states** — empty / loading (skeletal floor) / stale / conflict / unauthorized / error for all four regions | FE | V-02..V-08 | states are first-class, not afterthoughts |

**V-slice ≈ 10–15 engineering days** (V-01 L · V-02–V-04 L · V-05/V-06 M · V-07/V-08 S–M · V-09 M · V-10 M · V-12 M).

---

## 4. Workstream map (reconciled)

| Stream | Scope | Owner | State | Authoritative design |
|---|---|---|---|---|
| **V** Visual parity | four-region room, floor, filters, table, chat shell | FE + DATA | ✅ (V-01…V-10; V-11 optional, V-12 partial) | UI/UX spec · build plan |
| **UT/U** UI & state | layout, selection bus, floor, run dock, lensing | FE | 🔄 | UI/UX spec · Context Projections |
| **CP** Context projections | `activeContext`, pure projections, endpoints, store | FE + BE | ⬜ | Context & Region Projections (DS-22) |
| **K** Kernel/determinism | `NumberRef`, canonical hash, logical clock, ports | AI + BE | 🔄 (K-01…04 ✅) | Algorithms Build Design §1 |
| **D** Data | masters, transactions, fixtures, lint, zones/routing | DATA | ⬜ (D-01 ✅) | Data Model & Fixtures (DS-07) · v2/v3 plans |
| **DG** Data gaps | 18 concrete data gaps | DATA | 🔴 4 red | Data & Algorithm Gaps (DS-20) |
| **A** Demand | forecast, ordering, deltas, MRP, CTP, time-phased | AI | ⬜ (A-09 ✅) | Algorithms Build Design §2 |
| **B** Production | capability, allocation/scheduling MIP, rate capacity | AI | 🔄 (B-02…05 ✅) | Algorithms Build Design §3 |
| **C** Shift execution | WO machine, dispatch, handover, certs, rostering | AI | ⬜ | Algorithms Build Design §4 |
| **AG** Algorithm gaps | 18 capability gaps | AI | 🔴 3 red | Data & Algorithm Gaps |
| **G** Governance | authority, disclosure, causal codes, overrides | GOV + BE | 🔄 (G-04/G-05 built: `src/disclosure.ts`; G-01/G-03/G-06 pending) | Personas & Governance (DS-11) |
| **M** Agentic memory | versioned memory, edges, supersession, confidence | BE | 🔄 | Agentic Memory 4-roles / crosswalk |
| **T** Testing | verify, lint, property, replay, CAS, a11y, acceptance | QA | 🔄 (T-01…05, T-08, T-10, T-15 ✅) | Demo, Testing & Validation (DS-12) · Test Plan |
| **P** Deployment | CI, trust boundary, server tier, persistence, hosting | BE + PM | 🔄 (P-01 ✅) | Delivery Plan (DS-13) |
| **X** AI chat | router, tool gateway, orchestrators, validation | AI + BE | ⏸ (gated P-03) | AI Chat Build Plan (DS-10) |
| **PT** Product/docs | publish, links, decisions, RACI, north-star | PM | 🔄 | Product Management (DS-01) |

---

## 5. Milestones

| ID | Milestone | Contents | Exit criteria | Window | Status |
|---|---|---|---|---|---|
| **V** | Visual parity | V-01…V-12 | four regions render; filters + zone-select work; URL survives reload | 27 Sep–3 Oct | ⬜ |
| **K0** | Kernel | NumberRef, canonical hash, event log, invert N-01 | property + golden-hash tests green in CI | pre-M1 | 🔄 (K-01…04 ✅) |
| **K1** | Capability/calendar | CapabilityInterval, ShipCalendar, generic `available()` | golden `304` recomputed from segments | pre-M1 | ⬜ |
| **M0** | Integrity | W7 defects + W8 lint skeleton | every id resolves; `constraintClass`+`constraintShortfall` replace `shortfall`; units fixed; run-hash versioned | 28–30 Sep | 🔄 (memory slice + `ctp-0.3.0` partial) |
| **M1** | Floor | W4 zones/resources/routing + floor view | every commitment → routing→zone; resource in one zone; zone-select filters; floor renders | 1–7 Oct | ◐ (pane built, masters + SVG pending) |
| **M2** | Demand | W1 CRM requested layer | requested→promised→capable triple; queue sorts by delta | 1–5 Oct (∥) | ⬜ |
| **M3** | Execution | W2 work orders/handover/certs | opens today·my line; handover delta; expiring cert gate; WO↔pegs | 8–14 Oct | ⬜ |
| **M4** | Availability | W3 EAM/restoration/windows | derated queue; window-gated; evidence-backed restoration | 8–14 Oct (∥) | ⬜ |
| **M5** | Capacity | W5 ship calendar + time-phased allocation | no non-working promise; day-bins sum; derived COM-1018; N-01 inverted | 8–13 Oct | ⬜ |
| **M6** | Governance | W6 authority separation, disclosure, lens, overrides | persona items 1,2,5,8; no single role satisfies cross-authority (N-04); redaction pre-prompt | 15–21 Oct | ◐ (G-04/G-05 built + tested) |
| **M7** | Assurance | W8 full verification + acceptance | every W1–W7 criterion machine-checked; dangling id fails build; all P0 closed | 22–24 Oct | ⬜ |

**Critical path:** V → M0 → M1 → { M3, M4, M5 } → M6 → M7. M2 is off the floor critical path but an M6 input. Ideal effort ≈ 25–33 eng-days; ~4–5 calendar weeks with parallelism.

---

## 6. UI / state tasks (UT · U · CP)

| ID | Task | Owner | Depends | Exit criteria | Status |
|---|---|---|---|---|---|
| U-01 | Four-region layout | FE | — | matches UI/UX §1 | ✅/◐ (desktop 3-pane; verify four-region) |
| V-02 / UT-02 / U-07 / CP-21 / CP-22 | Floor plan (zones, overlays, zone-select) | FE | V-01 / D-03…05 | zone select filters queue+ledger; overlays distinct | ⬜ *(recorded ✅; see §16)* |
| V-05 / UT-05 | Left filter rail + attributes | FE | — | filters change queue; zero-state explicit | ⬜ |
| V-09 / UT-06 / U-02 / CP-01…07 | Selection bus + URL codec + router | FE | U-01 | `(activeContext,role)`→same regions (T-11); remove dead hash | ⬜ |
| V-08 / U-03 / U-05 / UT-07 | Run dock + durable run card + states | FE | B-12 / U-03 | timeout ≠ infeasible; states distinct | ⬜ |
| U-06 / UT-08 | Persona-lensed queue + default sorts | FE | G-05 | role re-scopes view only | ◐ |
| V-07 / UT-03 | Order-table detail tray + per-role emphasis | FE | — | §4 tiers intact; visible set matches target | ◐ |
| U-04 | Citation jump (block → centre cell) | FE | U-02 | every fact/calc focuses a centre object | ⬜ |
| CP-08…12 | Pure projections + `RunStorePort` | FE/BE | CP-04 | panes render from projections | ⬜ |
| CP-13…16 | Endpoints + authz (SSE) | BE | P-03 | server-side redaction; static fallback | ⏸ |
| CP-17…20 | Persistence + governed commands + CAS | BE | P-07 | reload reconstructs state; StaleError | ⏸ |

---

## 7. Data tasks (D) and data gaps (DG)

| ID | Task | Owner | Depends | Exit | Status |
|---|---|---|---|---|---|
| D-02 | CRM requested layer (`requestedDate`, `orderRef`, `customerPriority`, `value`) | DATA | — | requested→promised→capable triple | ⬜ |
| D-03 / V-01 | Zone master + floor coordinates | DATA | — | every resource in one zone | ⬜ |
| D-04 | Resource master expansion (qualifiedProducts, demonstratedRate, changeover, shifts, calibration, criticality, MTBF/MTTR) | DATA | D-03 | rate/calibration fields resolve | ⬜ |
| D-05 | Routing master (RT-CPL480/CPL320/RM42/CDU2400, operations seq/resource/stdRate/setup) | DATA | D-04 | every commitment resolves to a routing | 🔄 |
| D-06 | Ship calendar (`SHIP-CAL-YYC`) | DATA | — | no promise on a non-ship day | ⬜ |
| D-07 | MES entities (WorkOrder, ShiftHandover, OperatorCertification) | DATA | D-05 | WO↔peg reconciliation | ⬜ |
| D-08 | EAM entities (MWO, RestorationFact, CalibrationRecord) | DATA | D-04 | restoration evidence-backed | ⬜ |
| D-09 | ApprovalAuthority + disclosure + causal-code map | GOV | — | authority separate from personas | ⬜ |
| D-10 | `HumanOverrideEvent` + rejection-code taxonomy | GOV | D-09 | structured overrides captured (N-08) | ⬜ |
| D-11 | Algorithm entities (NumberRef, DemandRecord, NetRow+Peg, CapabilityInterval, UncertaintyFact, Explanation) | DATA | D-02 | every number has provenance | ⬜ |
| D-12 | Changeover matrix (sequence-dependent setup) | DATA | D-04 | matrix or explicit cut (OI-18) | ⏸ |
| D-13 | UoM conversion (tests↔loops↔pieces) | DATA | D-02 | defined conversions | ⬜ |
| D-14 | Time-bucket model (day/shift bin, TZ) | DATA | D-06 | exact day-bucket rule | ⬜ |
| D-15 | Master-set change process | DATA | D-06 | versioned master mutations | ⬜ |
| D-16 | Fixture lint | QA | — | dangling id fails build | ⬜ |
| D-17 | Materialise OPT-RESERVE-SLOTS | BE | — | no dangling opt ref | ⬜ |
| D-18 | `constraintClass` + aliases + `ctp-0.3.0` migration | BE | — | shortfall disambiguated (N-05) | ⬜ |
| D-19 | 2nd stale + source-down fixtures | BE | — | states render distinctly | ⬜ |
| D-20 | Rate-schema authority (one rate definition) | DATA | — | golden `304` computed from segments | ⬜ |
| D-21 | AIB-MRP | DATA | D-20 | AIB wired as a master | ⬜ |
| D-22 | P-week → date mapping | DATA | — | weeks resolve to dates (DG-15) | ✅ (implemented in `reconcile_capacity.py`) |
| D-23 | Recompute `planned_minutes` | DATA | D-22 | verifiable minutes (DG-16) | ⬜ |
| D-24 | Link 20 unlinked commitments | DATA/PM | — | 60→linked, CURRENT scope enforced | ✅ (the 20 unlinked are DELIVERED/SHIPPED history; 0 active unlinked) |

**DG gaps (red = blocks the solver):** DG-01 3 rate definitions · DG-02 concurrency unused · DG-03 whole-day bucketing · **DG-15 P-weeks no dates** · **DG-16 planned_minutes unverifiable**; plus DG-04…14, DG-17, DG-18 (frozen flag, pegged ignored, no material, gates unenforced, setup unused, too-regular demand, weekend-only calendar, UoM undefined, priorityKey string, provenance unpopulated, derived-vs-stored, 20/60 no WO, superseded/CURRENT conflated).

---

## 8. Algorithm tasks (K · A · B · C) and gaps (AG)

### Kernel (K)
K-05 `NumberRef` provenance (BE) · K-06 runtime canonical sha256 (BE←K-05) · K-07 deterministic sort/tie-break (BE) · K-08 logical clock (BE) · K-09 `OptimizationPort` + adapters (AI←K-03) · K-10 event-sourced lifecycle, timeout≠infeasible (BE) · K-11 committed golden hashes (QA←K-06) · K-12 golden hashes end-to-end.

### Demand (A)
A-01 firmness eligibility · A-02 method-per-regime forecast (ETS/TSB/SBA/ADIDA) ⏸(no history) · A-03 conformal P10/P50/P90 + MASE/bias/FVA ⏸ · A-04 `OrderingKey` lexicographic · A-05 three deltas (requestToPromise/promiseToCapable/capableToRequested) · A-06 MRP peg-first netting · A-07 eligibility `min(ERP,WMS)−held−expired−failed−unqualified` · A-08 CTP service · A-10 robust Γ ⏸ · A-11 demand projection service 🔄 · A-12 computed `capable_date`.
*All owner AI; A-01/A-04 ← D-02; A-05 ← A-04,D-06; A-06 ← D-11; A-08 ← D-05,A-06.*

### Production (B)
A-09/B-02 allocation MIP ✅ · B-03 scheduling MIP ✅(small) · B-04 frozen pinning ✅ · B-05 ship-day normalisation ✅ · B-06 real masters 🔄 · B-08 objective policy + `policyGap` · B-10 derived COM-1018 date · B-12 warm-start · **B-13 canonical time/capacity (P0)** · **B-14 rate-based cumulative (P0)** · B-15 feasibility pre-check · B-16 rolling-horizon dispatch · B-17 setup-aware sequencing ⏸ · B-18 margin objective · B-19 wire AIB v1 · B-20 CURRENT-only scope 🔄.

### Shift (C)
C-01 WO state machine (paused≠gated) · C-02 dispatch (DBR/critical-ratio→EDD→SPT) · C-03 handover delta · C-04 coverage/cert gating · C-05 governed overtime→Finance · C-06 rostering (greedy→min-cost flow→column gen) · C-07 OEE/scrap · C-08 receding-horizon replan + `DecisionDiff` · C-09 WO↔peg reconciliation.

**AG gaps (red):** AG-01 disjunctive capacity (whole-day) · AG-02 monolithic MIP won't scale (31.2k binaries) · AG-06 no material constraints · AG-11 Family C absent · AG-13 solver not source of truth; plus AG-03…05, AG-07…10, AG-12, AG-14…18.

**Determinism contract (binding):** all algorithms are pure functions of `(snapshot_hash, master_set_version, model_version, seed)`; JCS (RFC 8785) + SHA-256; Merkle root over masters+txns; `round(x,6)`; integer minor money; no `Date.now`/`localeCompare`/Map-order; Gurobi `Seed=0, Threads=1, Presolve=2, MIPGap=0`; outcome taxonomy `OPTIMAL · FEASIBLE_WITHIN_POLICY_GAP · TIME_LIMIT_WITH_FEASIBLE_RESULT · TIME_LIMIT_NO_FEASIBLE_RESULT · PROVEN_INFEASIBLE · STALE · CANCELLED · FAILED`; timeout-without-solution ≠ infeasible.

---

## 9. Governance (G) and agentic memory (M)

| ID | Task | Owner | Depends | Exit | Status |
|---|---|---|---|---|---|
| G-01 | Causal-code map (capacity/material/gate/quality) | AI/GOV | D-09 | versioned causal codes | ⬜ |
| G-02 | Capacity dual | AI | B-02 | LP dual reported, not invented | 🔄 |
| G-03 | `Explanation` object | AI | G-01 | every recommendation explains | ⬜ |
| G-04 | Authority enforcement + persona acceptance 1,2,5,8 | GOV/BE | D-09 | no single role satisfies cross-authority (N-04) | ⬜ |
| G-05 | Disclosure/redaction before prompt **and** render | GOV/BE | D-09 | restricted renders a reason code, never blank | ⬜ |
| G-06 | Override review loop (read-only, no auto-retrain) | GOV | D-10 | review queue populated | ⬜ |
| M-01 | Persist memories/edges; memory-rooted replay/attribution | BE | P-07 | decisions traceable to a memory version | ⬜ |
| M-02 | `contested` memory constructor (map Conflict) | BE | — | contested class present | ⬜ |
| M-03 | Edge-level version/option binding + weight/threshold (contract reconciliation) | BE | K-05 | contract matches 4-roles design | ⬜ |
| M-04 | Server-side human-approval gate for supersession | BE | P-03 | supersession requires governance | ⬜ |

**Authority model:** four interactive personas (Manufacturing Manager · Shift Planner · Maintenance Manager · Demand Planner) plus non-interactive policy authorities (Finance · Quality · Program · Procurement). Invariant: operational approval never satisfies a policy authority; requester ≠ approver; approval ≠ execution (receipt required).

---

## 10. Testing (T)

T-01 solver verify ✅ · T-02 invert N-01 ✅ · T-03 fixture-lint runner ✅ · **T-04 shuffle/property determinism ✅** · **T-05 replay ✅** · **T-06 CAS/`StaleError` + rebase ✅** · **T-07 authority + disclosure/redaction ✅** · **T-08 ship-day (all promises) ✅** · **T-09 day-bin sum ✅ (capacity model)** · **T-10 peg conservation ✅** · T-11 cross-pane determinism ◐(services tied; UI bus partly built) · **T-12 persona acceptance ✅ (48/48 now + target)** · T-13 E2E golden thread ⏸(U-03) · T-14 accessibility ⏸(DOM runner) · T-15 defect→test closure map ✅(seeded) · **T-16 contract-run assertions ✅ (23/23)** · **D-22 P-week mapping ✅ (17 → 2 overloads, 0 orphaned)** · **D-24 unlinked ✅ (0 active; 20 completed)**.

Run: `npm test` = `verify · verify:server · verify:tools · verify:ai · verify:persona (48/48) · test:coolit (16/16) · test:invariants (54/54) · test:contract (23/23) · test:capacity (15/15) · lint`. **3 thorough test rounds green** (Test Plan §2.1). **Live URL:** `npm run preview` → http://localhost:5273/ (bound 0.0.0.0; four regions verified in-browser). Full plan: **FORGE Decision Room — Test Plan**.

**Rule:** every defect closes *with a test* (fail-before / pass-after; N-01 is the template). CI runs `tsc → verify → lint → test → build → e2e → publish`. Layers: `verify`, `verify:server`, `verify:tools`, `verify:ai`, `test:coolit`, `test:invariants`, `lint`, aggregate `npm test` / `npm run ci`.

---

## 11. Deployment / platform (P)

P-01 static build gate ✅(local) · **P-02 CI pipeline** · **P-03 trust-boundary decision (client-only vs thin server) ⏸ BLOCKER** · P-04 optional Node tier (`/api/chat`, `/api/runs`, SSE) ⏸ · P-05 config/secrets (fail-closed; key server-side only) · P-06 audit JSONL · P-07 run-store persistence · P-08 server-side live Gurobi ⏸ · P-09 release versioning + `ctp-0.3.0` migration · P-10 rollback/fallback + scripted demo · P-11 hosting/SSE target ⏸ · P-12 cost model.

Tenant `TENANT-COOLIT-SYNTH` · site `SITE-YYC-01`; golden-hash drift fails CI.

---

## 12. AI chat (X) — gated on P-03

X-01 contracts (`src/shared/contracts.ts`) · X-02 deterministic fail-closed intent router · X-03 typed-tool gateway (16 tools, authz + audit per call) · X-04 model client + grounding validator (no ungrounded number) · X-05 investigate orchestrator + streaming · X-06 scenario orchestrator + durable runs.
Build phases P0–P7; hackathon slice = P0, P1, P2(read tools), P3 + P4 run card. Hard boundary: the model returns structured blocks, never arithmetic, approval, or writes.

---

## 13. Product & documentation (PT)

PT-01 publish local-only docs (DS-09/13/14/18/20) · PT-02 floor-plan image ✅ · PT-03 fix PM §12 links · PT-04 resolve Q-01…Q-07 + log ADR-001 · PT-05 confirm owner names for RACI · PT-06 fill remaining placeholders · PT-07 keep status/PM in sync · PT-08 publish registers · PT-09 demo hero commitment + ROI headline · PT-10 record north-star once Q-07 closed.

---

## 14. Decisions and blockers (must close to unblock)

**Decisions 🧭:** OI-01 single site · OI-02 shift-role name · OI-05 authority model (blocks G-04/N-04) · OI-06 floor: open-decision vs all zones · **OI-08 backend for AI chat (blocks P-03/P-04/X-01…06)** · OI-09 model/provider+key · OI-10 real solver vs simulated latency · OI-11 persistence · OI-18 changeover · OI-19 solver seam · OI-20 objective policy · OI-24 panes fixed vs resizable · OI-26 Z-ELEC fold · OI-27 floor coordinates + Pack+Ship vs Shipping Staging ownership · OI-28 demo hero/ROI · OI-33 thread model · **OI-53/54/55 rate-based capacity + scaling**.

**Open questions (from build plan §12 / ledger §11):** run-card placement · filter persistence · "awaiting me" as filter vs sort · master-set store · handover control · maintenance surface · free-text search in rail vs copilot-only.

**Blockers 🚧:** X-01…06 ← OI-08 · server/secrets/Gurobi/hosting ← OI-08 · changeover ← OI-18 · forecast accuracy ← OI-14 · Γ/DES ← OI-15/16 · authority demo ← OI-05 · rate-based+AIB ← OI-53/54/56.

---

## 15. Sequence — next two weeks (critical path)

**Week 1 (27 Sep – 3 Oct) — Visual parity + kernel**
1. **V-01 + D-03/D-04 care of DATA** (zone master + geometry) — unblocks floor.
2. **V-05/V-06** left rail + filter engine (no dependencies).
3. **V-02/V-03** floor render + overlays (as soon as V-01 lands).
4. **V-07/V-08** table parity + right-pane shell (independent).
5. **K-05/K-06** NumberRef + runtime hash (M0) in parallel.
6. **PT-04** close OI-01/05/06/27 and log ADR.

**Week 2 (4–10 Oct) — Floor milestone + decisions**
7. **V-04/V-09** zone-select + URL codec; **V-10/V-12** responsive/states/a11y.
8. **M1 floor masters** (D-05 routing, V-01 zone chain) → **M1 exit**.
9. **P-03 trust boundary** decision → unblocks X and P-04.
10. **D-02 CRM layer + D-06 ship calendar** to start M2/M5.

**Then:** M2 (demand) ∥ M4 (availability) → M3 (execution) → M5 (capacity) → M6 (governance) → M7 (assurance).

---

## 16. Risks & drift reconciliation

| Risk | Impact | Mitigation |
|---|---|---|
| **Register drift** — General/Open registers were reset; v3 rows lost; overlapping trackers (R1/R6) | lost work, double-count | this master list becomes the single execution view; freeze others to read-only |
| **Notion ⇄ local drift (R2)** | docs disagree with code | ground truth = `src/`; CI flag on doc drift |
| **Floor status contradiction** — `UT-01/UT-02/UT-09/U-07` recorded ✅, but `.middle-top` is a placeholder and no zone data in `src/` | false "done", demo risk | reset these to ⬜ until V-02/V-01 land (this list does) |
| **Concurrent editors** — `App.tsx`/`styles.css`/spec edited by multiple writers mid-session | merge/clobber | one owner per file; land V-slice behind feature flags |
| **Zone-id drift** — spec `Z-*` vs build `ZN-*` vs legacy `Z-ASM/Z-ELEC` | integration errors | freeze ids in V-01 |
| **Capacity shape wrong** (whole-day disjunctive, DG-03/AG-01) | MIP infeasible / wrong | B-13/B-14 first (P0) |
| **Solver doesn't scale** (31.2k binaries, AG-02) | timeouts | rolling horizon B-16, warm-start B-12 |
| **Determinism partial** (no runtime hashes/NumberRef, AG-14) | reproducibility unproven | K-05/K-06/K-11 |
| **Governance unbuilt** (G-04/G-05) | authority/redaction claims false | M6; don't demo "authority" before then |
| **AI chat untested live** (R7) | demo fallback needed | scripted fallback P-10 |
| **`ctp-0.3.0` hash break** (N-05/D-18) | golden churn | ship version + migration note together |

---

## 17. Definition of done

- **Visual parity:** V-01…V-12 accepted; reviewer sees the four regions and filters/zone-select work from a cold load.
- **Milestone gates:** each M-gate's exit criteria pass in CI; no gate is declared done on a green build alone.
- **Every defect** (D-01…D-25, N-01…N-08) closed with a test; defect→test map complete (T-15).
- **Determinism:** same `(snapshot, master, model, seed)` reproduces byte-identical artifacts (K-11/T-04/T-05).
- **Governance:** no single role can satisfy a cross-authority requirement; redaction asserted pre-prompt (T-07).
- **Docs:** design docs and registers agree with `src/`; local-only docs published (PT-01/PT-08).

---

## 18. Change log

| Version | Date | Change |
|---|---|---|
| v0.1 | 2026-09-27 | Created the consolidated master task list: reconciled K/D/A/B/C/T/P/G/U/X/CP/PT/DG/AG/OI into one backlog; added the Visual-Parity slice (V-01…V-12) with a 2-week sequence; recorded drift and the floor-status contradiction |
| v0.2 | 2026-09-27 | Testing executed: added `tools/invariant-tests.ts` (31 checks — T-04/T-05/T-08/T-10/T-11/T-15) wired into `npm test`; created the Test Plan; updated the T-stream statuses |
| v0.3 | 2026-09-27 | T-06 CAS/`StaleError` + T-12 persona harness executed (invariants 37/37; persona 44/44 + 4 skip); T-stream refreshed |
| v0.4 | 2026-09-27 | **Visual-Parity slice implemented**: `src/zones.ts`, `src/ShopFloor.tsx`, `src/FilterRail.tsx`, App URL codec + filter engine + FORGE shell, LedgerView vocabulary; build green; +8 zone/filter invariants (45/45) |
| v0.5 | 2026-09-27 | **Governance slice built**: `src/disclosure.ts` (authority separation + role×domain×sensitivity disclosure); T-07 ✅, T-12 ✅ (persona 48/48 now + target); invariants 54/54 |
| v0.6 | 2026-09-27 | **T-16 contract-run assertions** (`tools/contract-tests.ts`, 18 checks) wired into `npm test`; **3 thorough test rounds green** (Test Plan §2.1); T-09 ◐ |
| v0.7 | 2026-09-27 | **T-09 day-bin sum ✅** via `tools/capacity-model.ts` (15 checks, v3.2 ERP fixtures); 4-role lens sort (U-06) in the queue; 3 rounds re-run green |
| v0.8 | 2026-09-27 | **D-22 P-week mapping** — forward overloads 17 → 2, orphaned minutes 149,246 → 0 (history separated); contract 21/21; four-region layout fixed for 800px; `npm run preview` serves on 5273 (URL verified) |
| v0.9 | 2026-09-27 | **D-24 + overload recovery** — 0 active-unlinked (20 completed); 2 forward overloads both recoverable by third shift (0 unresolved); contract 23/23; 3 rounds green; URL re-verified |
| v0.10 | 2026-09-27 | **Front-dash aligned to the design**: "COOLIT SHOP FLOOR" heading, RISK At risk/Blocked/Watch/On track, PRODUCT Cold plate/Manifold/CDU, OWNER +Sales operations, FORGE right pane; authoritative floor-plan **image slot** at `public/floor-plan.png` (hotspots) with schematic fallback; 3 rounds green; URL 200 |
| v0.11 | 2026-09-27 | **Floor-plan illustration installed**: extracted the COOLIT floor plan from the PRD (page 14) → `public/floor-plan.png`; the front dash renders it with **13 aligned hotspot zones + 12 open-decision badges** (all hotspots verified inside the image). 3 rounds green; URL 200 |
| v0.12 | 2026-09-27 | Added the **Minimalism slice U1–U8 + D-U1** (plan DS-26) — quiet room: slim top bar, quiet rail, floor-dominant centre, sparse 6-column table, quiet FORGE, state/label vocab, a11y; 3-round test plan |
| v0.13 | 2026-09-27 | **U1–U8 executed** — slim top bar (5 tokens), quiet rail with “More”, floor-dominant centre (57%), 6-column single-line table, quiet FORGE (phases removed, actions behind “More actions”), state vocab; density budgets verified in-browser; roles keep identical numbers; 3 rounds green |
| v0.14 | 2026-09-27 | **Right pane is now a pure chatbot** — conversation + `Message FORGE…`/Send; evidence behind an “Evidence” toggle; governed actions inline in the thread; action toolbar removed. Floor illustration cropped to the pure floor (1648×786) with re-aligned hotspots. 3 rounds green; URL 200 |
| v0.15 | 2026-09-27 | **Chat de-noised** — a reply renders only the **Answer + Why**; source facts, derived calculations, evidence gaps, the tools line and the next-action block are removed from the thread (available behind **Evidence**). 3 rounds green; URL 200 |
| v0.16 | 2026-09-27 | **Right pane is a general chat** — `FORGE · How can I help?` + message box; starts empty (no seeded answer, no lens, no evidence toggle, no chips); answers on ask. 3 rounds green; URL 200 |
| v0.17 | 2026-09-27 | **Chat routed to DeepSeek V4.1 Flash** — every typed message POSTs to `/api/chat/turn`; the API is now mounted on the preview server (final URL); the model gets tool access to all datasets/algorithms/outputs via `get_dataset`; live turn verified (`mode: ai`); scripted fallback retained. 3 rounds green |
| v0.18 | 2026-09-27 | **Model extended to every intent** — a generic `explainTurn`/`mergeProse` path explains scenario/compare/trace/draft/approval/action results with the model while the governed blocks (options/approval/receipt/outcome/next) stay deterministic; live scenario turn verified (`mode: ai`). `verify-ai` asserts the merge; 3 rounds green |
| v0.19 | 2026-09-27 | **Layout per the sketch** — left rail renamed **ATTRIBUTES**; **Floor Layer** gets ‹ › zone navigation; **Tables** labelled and linked up to the floor (active order highlights its zones; zone select filters the table); **Chat** stays right. 3 rounds green; URL 200 |
| v0.20 | 2026-09-27 | Added the **Persona Detail in the Order Table plan (DS-27, slices T1–T6)** — 6 fixed columns + 1 lens column, a persona-ordered expanded first tier, persona default sort/filter; strictly within the existing tabular format |
| v0.21 | 2026-09-27 | **T1–T4 executed (DS-27)** — lens column (Recovery/Coverage/Availability/Gap) + persona expanded tier + `persona` projection in the ledger; +4 invariants (58/58); not-yet-modelled fields render “—” with the seam named (D-02/D-07/D-08/C-03). 3 rounds green; URL 200 |
| v0.22 | 2026-09-27 | **Chat chrome trimmed** — removed the “No Approval / Release / Publish controls exist in chat.” footnote; the pane is now just `FORGE · How can I help? · Message FORGE · Send`. 3 rounds green; URL 200 |