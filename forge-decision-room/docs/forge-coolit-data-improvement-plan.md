# FORGE Decision Room — COOLIT Data Improvement Plan

ERP · CRM · MES · Shop Floor — thorough remediation and extension plan for the synthetic COOLIT fixture.

| Field | Value |
|---|---|
| Document | FORGE Decision Room — COOLIT Data Improvement Plan |
| Version | v1.0 (draft for review) |
| Date | 2026-09-27 |
| Tenant | TENANT-COOLIT-SYNTH |
| Site | SITE-YYC-01 (single plant, single site) |
| Snapshot under review | SNAP-20260926-0815 · as-of 2026-09-26T08:15:00-06:00 |
| Master set | MS-2026-09-26 |
| Model | ctp-0.2.0 · code decision-services@0.1.0 |
| Personas in scope | Manufacturing manager · Shift executive (supervisor) · Maintenance manager · Demand planner |
| Author | FORGE data engineering |

> This plan does not change the governing invariant: the centre pane is the record; every other pane is a view of a centre record. Its purpose is to make that record complete, internally consistent, and sufficient for all four personas and the shop-floor surface.

---

## 1. Executive summary

The COOLIT fixture today is a small, deterministic, well-instrumented **feasibility and commitment-vs-capability** record. For the manufacturing manager it is close to demo-grade: typed binding constraints, costed recovery options, named approvers, and a governed dry-run → execute → receipt chain that never mutates the baseline. The numbers verify end to end and the master/transaction/derived/conflict split is modelled correctly.

It is not yet a **plant operating record**. Three seams are missing or thin:

1. **Demand seam (CRM).** There is no requested date distinct from the promise, so the requested → promised → capable delta that defines the demand planner's job cannot be rendered.
2. **Execution seam (MES).** There are three MES facts in total, all static. No work orders, no shift handover, no operator certifications, no scrap — so the shift executive has nothing live to act on.
3. **Availability seam (EAM/CMMS + shop floor).** There is a single downtime statement (`EVT-LT-041`) with no work order, root cause, technician, parts, or restoration confirmation; there is no zone/resource/routing reference data at all, so the shop-floor layout cannot be drawn for any persona.

Layered on top are thirteen concrete data-integrity defects, including one dangling option reference, an overloaded `shortfall` field, a promise that lands on a Saturday yet is declared feasible, and approval authorities that collapse Finance and Quality into a single operational approval.

This plan defines **eight workstreams (W1–W8)**, a target data model, concrete fixture additions with ids, expanded verification invariants, per-persona acceptance criteria, a traceability matrix, and a sequenced delivery path. Executed in order, it converts the fixture from a risk demo into a coherent ERP + CRM + MES + shop-floor operating picture for all four personas.

### 1.1 Headline scores (current → target)

| Dimension | Current | Target |
|---|---|---|
| Manufacturing manager readiness | 85% | 100% |
| Shift executive readiness | 25% | 95% |
| Maintenance manager readiness | 30% | 95% |
| Demand planner readiness | 45% | 95% |
| Shop-floor layout alignment | 0% | 100% |
| Data-integrity defects (open) | 13 | 0 |
| Master classes populated | 8 of 9 (routing empty) | 9 of 9 + zone/asset/ship |

---

## 2. Scope and non-goals

**In scope**
- Transaction data: CRM, ERP, MES (+ WMS, QMS, FIN where they touch the record).
- Reference (master) data: item, BOM, routing, resource, calendar, sourcing, party, commercial, policy, and new zone/asset/ship-calendar masters.
- Derived data: capacity, allocation, eligibility, shortfall, dates, feasibility.
- Conflict and missing-data modelling.
- Shop-floor layout model and its linkage to resources and commitments.
- Governance: approval authority, disclosure, role scoping, defect remediation.
- Verification and acceptance criteria.

**Non-goals (this iteration)**
- Multi-site / multi-plant federation (single site remains; see Open Question Q-01).
- Live system connectors (this remains a synthetic fixture with simulated writeback).
- Solver re-architecture (the optimizer stays deterministic; W5 sharpens its inputs, not its engine).
- Real customer or supplier identities (all names stay synthetic).

---

## 3. Method and severity model

Each defect and gap is assessed on two axes.

**Severity**

| Code | Meaning |
|---|---|
| S1 | Blocker — a persona cannot do their job, or the record is internally contradictory |
| S2 | High — materially degrades a persona's job or breaks a stated invariant |
| S3 | Medium — weakens realism, comparison, or completeness |
| S4 | Low — polish, naming, test hygiene |

**Priority**

| Code | Meaning |
|---|---|
| P0 | Demo-critical; must land before the next persona review |
| P1 | Next increment; lands with the same snapshot family |
| P2 | Later; tracked, not blocking |

Verification is by re-running `npm run verify` plus the new fixture-lint assertions in W8.

---

## 4. Current-state assessment

### 4.1 Fixture identity and shape

- 4 commitments: COM-1042, COM-1018, COM-1104, COM-0991.
- 18 source facts across 6 systems: CRM 5, ERP 6, MES 3, QMS 2, WMS 1, FIN 1.
- 4 evidence packets, 4 baselines (all frozen/immutable), 6 alternatives for COM-1042, 4 for COM-1018.
- 1 seeded approval + 2 seeded receipts on COM-1104; 1 seeded approval on COM-1018.

### 4.2 System coverage

| System | Facts | Present | Materially absent |
|---|---|---|---|
| CRM | 5 | Promises, one waiver-log fact | Requested date, order line, customer priority, commercial value |
| ERP | 6 | Inventory, pegs, PO, ASN | Work orders, routing load, ATP/CTP by day, ship calendar |
| MES | 3 | One downtime event, one crew cert, one slack fact | Work orders, shift handover, OEE, operator certs, scrap/rework, changeover |
| WMS | 1 | Physical count | Location/bin, movement history |
| QMS | 2 | Hold, approved alternate | Calibration, MRB, certificate of conformance |
| FIN | 1 | Overtime rate card | Margin, late-ship penalty, cost of lost throughput |
| EAM/CMMS | 0 | — | Asset master, PM plan, work orders, root cause, restoration |
| HR / certification | 1 | LAB-LT-CERT (crew cert) | Operators, shift rosters, per-resource certification validity |

### 4.3 Verified computations (reproduce with `npm run verify`)

| Quantity | Value | Evidence |
|---|---|---|
| Healthy window | 6 days (28 Sep – 5 Oct) | businessDaysInclusive |
| Degraded window | 7 days (6–14 Oct) at half rate | EVT-LT-041 |
| Capacity | 192 healthy + 112 degraded = 304 tests | CALC-COM-1042-CAPACITY |
| Pegs | 200 frozen, 48 COM-1104, 56 COM-1042 | allocateLeakTests |
| COM-1042 shortfall | 64 tests; earliest ship 19 Oct (+4d) | CALC-COM-1042-*
| COM-1042 material | eligible 280 vs 240 required → not binding | CALC-COM-1042-ELIGIBLE |
| COM-1018 material gap | 68 manifolds; conditional 15 vs 21 Oct | CALC-COM-1018-MATERIAL |
| Overtime | 6 × 8h × 92 × 1.5 = 6,624 CAD | FIN-RATE-OT-LT |
| ERP/WMS conflict | 240 vs 236 → 4 quarantined | CNF-QD-220 |

### 4.4 Strengths to preserve

1. The **master vs transaction vs derived vs conflict** separation is correct and visible in the ledger.
2. Approval ≠ execution; a receipt is required; the baseline is never mutated.
3. Hard gates (frozen horizon, eligibility, unapproved source) are visible and non-waivable.
4. Every fact carries source + observed + ingested timestamps; freshness is computed.
5. Conflicts and missing evidence are shown verbatim, never auto-resolved.
6. Numbers are role-invariant; the role changes the view, not the truth.

---

## 5. Defect register

| ID | Sev | Pri | Defect | Evidence in code | Required fix |
|---|---|---|---|---|---|
| D-01 | S2 | P0 | No CRM requested date; requested → promised → capable delta is one-sided | `Commitment` has only `promiseDate`; CRM facts say only "promises" | Add `requestedDate`, `orderRef`, `customerPriority`; add CRM request facts (W1) |
| D-02 | S1 | P0 | No maintenance alternatives exist | `scenarioAlternatives()` returns `[]` for COM-1104/0991; none are maintenance | Add maintenance-window alternatives (W3) |
| D-03 | S1 | P0 | Dangling option reference | `OPT-RESERVE-SLOTS` in seeded1104Approval/Receipt is not an `Alternative` | Materialise a real COM-1104 scenario option, or repoint the approval (W7) |
| D-04 | S2 | P0 | `DecisionRun.shortfall` overloaded | COM-1042 shortfall 64 with requiredTests 120; COM-1018 shortfall 68 with requiredTests 0 | Split into typed constraint shortfall; add constraintClass (W7) |
| D-05 | S2 | P0 | Promise on a non-working day declared feasible | COM-1104 promise 2026-10-10 is Saturday; baseline earliestShipDate = promise | Add ship calendar + non-working-day validation (W5) |
| D-06 | S2 | P1 | Hard-coded ship date | COM-1018 earliestShipDate literal "2026-10-21" | Derive from supplier commit + ship calendar (W5) |
| D-07 | S1 | P0 | Routing master empty | `masterRefsFor` has no `routing` set for any commitment; lineage cites routing | Populate routing records (W4) |
| D-08 | S2 | P0 | Authority collapsed into one approver | OPT-THIRD-SHIFT approver is mfg-manager with authority finance; OPT-ALT-MV14B has authority quality | Model policy authorities as distinct requirements (W6) |
| D-09 | S3 | P1 | Role naming/ownership drift | "shift-planner" vs "Shift Executive"; COM-1104 owner "Operations Leader" (retired) | Align code and docs; reassign owners (W6) |
| D-10 | S2 | P1 | No disclosure/redaction | `RolePolicy` has no disclosure fields; all roles see the same packet | Add disclosurePolicy + redaction (W6) |
| D-11 | S2 | P1 | Queue not role-lensed | `queueOf()` buckets by lifecycle only | Role-scoped filters/sort (W6) |
| D-12 | S3 | P2 | November demand invisible | COM-0991 `leakTests = 0` | Model November load or mark as out-of-window explicitly (W5) |
| D-13 | S4 | P2 | Unit mismatch in ledger | Constraint unit "tests" vs qty uom "loops" | Show loop-equivalents or a conversion note (W7) |
| D-14 | S1 | P0 | No shop-floor layout | Zero `zone/shopFloor` matches in src | Add zone master + ZoneView (W4) |
| D-15 | S1 | P0 | MES execution/handover absent | 3 static MES facts | Add work orders, handover, certs (W2) |
| D-16 | S1 | P0 | Maintenance record thin | One downtime statement; no WO, root cause, restoration, calibration | Add EAM entities (W3) |
| D-17 | S2 | P1 | No ship calendar | No working-day check on promises | Add SHIP-CAL master (W5) |
| D-18 | S2 | P1 | Allocation not time-phased | Window-wide subtraction, not day-binned | Time-phase allocation (W5) |
| D-19 | S3 | P2 | Recovery rate ignores competition | RECOVERY_DAILY_RATE = 32 with no other load | Model post-window contention (W5) |
| D-20 | S3 | P2 | No commercial value | Only overtime cost | Add order value / margin / penalty (W1) |
| D-21 | S4 | P2 | Thin stale/missing examples | One stale fact, one missing item | Add a second stale record and an ERP-down example (W7) |
| D-22 | S4 | P2 | Single site assumption | SITE-YYC-01 only | Track as open question Q-01 (W8) |
| D-23 | S3 | P1 | Seeded approval bypasses dry-run gate | COM-1104 execute receipt seeded without gateway dry-run ordering | Route seeded state through the gate or label it pre-seeded (W7) |
| D-24 | S4 | P2 | Test envelope hard-codes freshness | verify.ts literal `{fresh:9, stale:1}` | Derive in test (W8) |
| D-25 | S3 | P2 | No human-override capture | No `HumanOverrideEvent` / rejection codes | Add override event + codes (W6) |

---

## 6. Gap analysis by persona

### 6.1 Manufacturing manager (throughput, approve)

**Has:** plant-wide 4-commitment ledger; typed binding constraints; costed recovery with approver + expiry; governed execution.

**Missing / target:**

| Requirement | Today | Target |
|---|---|---|
| "Awaiting me" roll-up | scattered per thread | aggregated approvals view with expiry ordering |
| Throughput by line/family | family only | units per resource per shift, OEE context |
| Cost of not recovering | overtime only | late-ship penalty + margin at risk per commitment |
| Bottleneck attribution across commitments | single fixture narrative | cross-resource time-phased contention |

### 6.2 Shift executive / supervisor (coverage, handover)

**Has:** crew-certification fact, calendar.

**Missing / target:**

| Requirement | Target |
|---|---|
| Roster and certifications | operators, per-resource cert validity, shift assignment |
| Shift-level plan | work orders per resource per shift with qty started/completed |
| Handover delta | `changed since HH:MM` with WIP, open issues, escalations |
| Changeover sequencing | changeover matrix per resource, sequencing impact |
| Tonight's coverage risk | per-resource coverage flag for the active shift |

### 6.3 Maintenance manager (availability, restoration)

**Has:** EVT-LT-041 statement, resource master RM-11, calendar CAL-26W39.

**Missing / target:**

| Requirement | Target |
|---|---|
| Root cause and work order | MWO with failure mode, root cause code, technician, parts |
| Restoration confirmation | an observed restoration fact (rate back to 32/day) |
| PM / calibration | PM plan for RES-LT-01 and peers; calibration due/validity |
| Window alternatives | move / shorten / defer with impact delta and approval |
| Asset criticality | criticality, MTBF/MTTR, dependent products |

### 6.4 Demand planner (requested vs promised vs capable)

**Has:** customer/program, promise, capable (+Δ), conditional capability.

**Missing / target:**

| Requirement | Target |
|---|---|
| Requested date | CRM requested per commitment |
| Requested → promised → capable delta | three-way delta per row |
| Customer priority policy | priority master + who decides reprioritisation |
| Commercial context | order value / terms (redacted for some roles) |
| Draft + request flow | labelled draft handling open gaps; priority request to Program |

### 6.5 Shop-floor layout (all personas)

**Has:** nothing.

**Missing / target:** zone master; resource → zone assignment; product → routing → resource → zone lineage; a `ShopFloorZone` centre view; zone-select filtering the queue/ledger and re-scoping the right pane; downtime and coverage overlays on the floor.

---

## 7. Target data architecture

### 7.1 Data classes and rules

| Class | Changes by | Axis | Must never |
|---|---|---|---|
| Master / reference | change control | version + effectivity | be tagged "stale" |
| Transaction | event | freshness + observed/ingested | appear without source + timestamp |
| Derived | recompute | formula + trace id | be entered by hand |
| Conflict / missing | relationship / absence | disposition | be auto-resolved |

### 7.2 New and changed entities

| Entity | Layer | Key fields |
|---|---|---|
| `Commitment` (changed) | ERP/CRM | + `requestedDate`, `orderRef`, `customerPriority`, `shipCalendarId` |
| `Zone` | master | `zoneId`, `label`, `products`, `resources`, `floorX`, `floorY` |
| `Resource` (changed) | master | + `zoneId`, `qualifiedProducts`, `demonstratedRate`, `changeoverMin`, `shifts`, `calibrationDue`, `criticality`, `mtbfHrs`, `mttrHrs` |
| `Routing` | master | `routingId`, `product`, `operations[]` = { seq, resourceId, stdRate, setupMin } |
| `ShipCalendar` | master | `calendarId`, working days, cut-off times, non-shipping days |
| `WorkOrder` | MES | `woId`, `commitmentId`, `routingOp`, `resourceId`, `zoneId`, `qtyStarted`, `qtyCompleted`, `qtyScrapped`, `status`, `shift`, `plannedStart/End`, `actualStart/End`, `operatorId` |
| `ShiftHandover` | MES | `handoverId`, `zoneId`, `at`, `wip`, `openIssues`, `escalations` |
| `OperatorCertification` | MES/HR | `operatorId`, `name`, `resourceId`, `certId`, `validFrom`, `validTo`, `shift` |
| `MaintenanceWorkOrder` | EAM | `mwoId`, `resourceId`, `type` (PM/CM), `failureMode`, `rootCauseCode`, `priority`, `technician`, `parts`, `plannedStart/End`, `actualEnd`, `status` |
| `RestorationFact` | EAM (transaction) | `resourceId`, `observedRate`, `restoredAt`, evidence |
| `CalibrationRecord` | QMS | `resourceId`, `calibratedAt`, `dueAt`, `status` |
| `ApprovalAuthority` | policy | `authorityId` (finance/quality/program), `resolvesOn`, `owner`, `expiry` |
| `HumanOverrideEvent` | governance | recommended vs selected, rejection code, rationale, actor, snapshot |
| `DecisionRun` (changed) | derived | replace `shortfall` with `constraintClass` + `constraintShortfall` (keep aliases for compatibility) |

### 7.3 Reference master expansion

| Master set | Records to add |
|---|---|
| item | ITEM-RM-42, ITEM-CDU-2400, ITEM-MV-14, ITEM-MV-14B |
| routing | RT-CPL480, RT-CPL320, RT-RM42, RT-CDU2400 |
| resource | RES-ASM-01/02, RES-ELEC-01, RES-QC-01, RES-SHIP-01 (join existing RES-LT-01, RES-FT-02) |
| zone | Z-ASM, Z-LT, Z-FT, Z-ELEC, Z-QC, Z-SHIP |
| calendar | SHIP-CAL-YYC, SHIFT-CAL-YYC |
| party | customer masters for Northline, BrightGrid, Helios |
| commercial | margin/penalty card; customer priority policy |
| policy | approval matrix, disclosure policy, ship-day rule |
| asset | ASSET-LT-01 and peers with criticality/MTBF/MTTR |

### 7.4 Shop-floor model

- Zones carry a stable id and a floor position; resources belong to exactly one zone.
- Every product maps to a routing; every routing operation names a resource; therefore every commitment resolves to a zone chain.
- The floor view renders zones coloured by open downtime (maintenance overlay) and by coverage risk (shift overlay).
- Selecting a zone filters the queue and ledger to commitments bound by that zone's resources and re-scopes the right pane (design §7.2 / §10.2).

---

## 8. Workstreams

### W1 — CRM demand layer

**Objective:** make requested ≠ promised ≠ capable computable and visible.

**Changes**
- Add `requestedDate`, `orderRef`, `customerPriority` to `Commitment`.
- Add a CRM request fact per commitment, plus one commercial-value fact.
- Add customer priority policy master and order-value fields (with role redaction hooks for W6).

**Concrete fixture additions**

| New id | System | Record | Commitment | Statement |
|---|---|---|---|---|
| SRC-1042-REQ | CRM | CRM-ORD-7781 | COM-1042 | Northline requested 120 CPL-480 on 8 October; ERP promised 15 October |
| SRC-1018-REQ | CRM | CRM-ORD-7712 | COM-1018 | BrightGrid requested 80 RM-42 on 12 October; promised 15 October |
| SRC-1104-REQ | CRM | CRM-ORD-7805 | COM-1104 | Helios requested 24 CDU-2400 on 5 October; promised 10 October |
| SRC-0991-REQ | CRM | CRM-ORD-7830 | COM-0991 | Northline requested 40 CPL-320 on 6 November; promised 6 November |
| SRC-1042-VALUE | CRM | CRM-VAL-1042 | COM-1042 | Order value and terms (redacted from shop-floor roles) |

**Definition of done:** ledger shows a requested → promised → capable triple; demand-planner queue sorts by promise delta; `verify` asserts ordering and delta arithmetic.

### W2 — MES execution and handover layer

**Objective:** give the shift executive a live execution surface.

**Changes**
- Add `WorkOrder`, `ShiftHandover`, `OperatorCertification`.
- Add `handoverSince` to the active context.
- Surface WIP, scrap, and coverage risk per resource/shift.

**Concrete fixture additions (work orders)**

| WO id | Commitment | Product | Op | Resource | Zone | Started | Completed | Scrap | Shift | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| WO-1042-ASM-01 | COM-1042 | CPL-480 | assembly | RES-ASM-01 | Z-ASM | 120 | 96 | 2 | D | in-progress |
| WO-1042-LT-01 | COM-1042 | CPL-480 | leak test | RES-LT-01 | Z-LT | 96 | 56 | 0 | D | gated |
| WO-1018-ASM-01 | COM-1018 | RM-42 | assembly | RES-ASM-02 | Z-ASM | 20 | 12 | 0 | D | short-material |
| WO-1018-FT-01 | COM-1018 | RM-42 | functional test | RES-FT-02 | Z-FT | 12 | 12 | 0 | D | done |
| WO-1104-ASM-01 | COM-1104 | CDU-2400 | assembly | RES-ASM-01 | Z-ASM | 24 | 20 | 1 | N | in-progress |
| WO-1104-LT-01 | COM-1104 | CDU-2400 | leak test | RES-LT-01 | Z-LT | 40 | 24 | 0 | N | in-progress |
| WO-0991-ASM-01 | COM-0991 | CPL-320 | assembly | RES-ASM-02 | Z-ASM | 0 | 0 | 0 | — | released |

**Concrete fixture additions (handover and certification)**

| id | Type | Zone/Resource | At | Detail |
|---|---|---|---|---|
| SHF-2026-09-26-N | handover | Z-LT | 2026-09-26T06:45 | WIP 24, open issue: RES-LT-01 half-rate, escalation: leak-test gap |
| SHF-2026-09-26-M | handover | Z-ASM | 2026-09-26T14:45 | WIP 40 across two lines, no escalation |
| CERT-OP-114 | certification | RES-LT-01 | — | Operator on all six healthy days; cert valid to 2026-12-31 |
| CERT-OP-207 | certification | RES-LT-01 | — | Cert lapses 2026-10-01 (coverage risk inside the window) |

**Definition of done:** shift view opens on today · my line; a handover delta is computable; an expiring certificate raises a coverage gate; `verify` asserts WO quantities are consistent with pegs.

### W3 — Maintenance (EAM/CMMS) layer and window alternatives

**Objective:** give the maintenance manager root cause, restoration, and governed window changes.

**Changes**
- Add `MaintenanceWorkOrder`, `RestorationFact`, `CalibrationRecord`, asset fields on `Resource`.
- Add maintenance-window alternatives to `scenarioAlternatives()`.
- Add maintenance approval path (maintenance manager approves the window; manufacturing manager coordinates; never a customer promise).

**Concrete fixture additions (maintenance)**

| id | Type | Resource | Zone | Root cause | Technician | Planned | Actual end | Status |
|---|---|---|---|---|---|---|---|---|
| MWO-LT-041 | CM | RES-LT-01 | Z-LT | SEAL-LEAK (fixture seal failure) | T. Alvarez | 2026-10-06 | 2026-10-14T22:00 | open |
| MWO-LT-038 | PM | RES-LT-01 | Z-LT | scheduled 500-hr PM | T. Alvarez | 2026-10-09 | — | deferred |
| CAL-LT-2026-08 | calibration | RES-LT-01 | Z-LT | annual calibration | Cal. lab | 2026-08-01 | 2026-08-01 | current, due 2027-08-01 |
| REST-LT-01 | restoration | RES-LT-01 | Z-LT | rate restored 16 → 32/day | T. Alvarez | — | 2026-10-14T22:00 | pending observation |

**New maintenance alternatives (COM-1042 scenario)**

| Option id | Label | Feasibility | Impact | Approver |
|---|---|---|---|---|
| MNT-MOVE-WINDOW | Move the seal repair to 16–24 Oct | feasible | frees full rate 6–14 Oct; downstream PM slips | maintenance-manager |
| MNT-SHORTEN | Split repair into two 2-day windows | feasible | raises average rate to ~24/day | maintenance-manager |
| MNT-DEFER-PM | Defer the 500-hr PM past the window | infeasible | violates calibration/PM policy | maintenance-manager (blocked by gate) |
| MNT-EXPEDITE-PART | Air-freight the seal kit | feasible | cost + lead time; rate recovers 11 Oct | maintenance-manager + finance |

**Definition of done:** maintenance queue opens on derated resources sorted by restoration time; a window change is approved as a window; restoration is an observed outcome, never a chat confirmation; `verify` asserts maintenance options obey the PM/calibration gate.

### W4 — Shop floor, resource, and routing masters

**Objective:** make the floor drawable and link the ledger to it.

**Changes**
- Add zone master, expand resource master, add routing records.
- Add a `ShopFloorZone` centre view and a zone-select event that filters queue + ledger and re-scopes the right pane.
- Add zone to each ledger row and to the lineage chain.

**Concrete fixture additions (zones)**

| Zone id | Label | Products | Resources |
|---|---|---|---|
| Z-ASM | Assembly | CPL-480, RM-42, CDU-2400, CPL-320 | RES-ASM-01, RES-ASM-02 |
| Z-LT | Leak test | CPL-480, CDU-2400 | RES-LT-01 |
| Z-FT | Functional test | RM-42 | RES-FT-02 |
| Z-ELEC | Electronics | CDU-2400 | RES-ELEC-01 |
| Z-QC | Quality | all | RES-QC-01 |
| Z-SHIP | Shipping | all | RES-SHIP-01 |

**Concrete fixture additions (routing)**

| Routing id | Product | Operations (resource) |
|---|---|---|
| RT-CPL480 | CPL-480 | assembly (RES-ASM-01) → leak test (RES-LT-01) → ship (RES-SHIP-01) |
| RT-CPL320 | CPL-320 | assembly (RES-ASM-02) → leak test (RES-LT-01) → ship (RES-SHIP-01) |
| RT-RM42 | RM-42 | assembly (RES-ASM-02) → functional test (RES-FT-02) → ship (RES-SHIP-01) |
| RT-CDU2400 | CDU-2400 | assembly (RES-ASM-01) → electronics (RES-ELEC-01) → leak test ×2 (RES-LT-01) → ship (RES-SHIP-01) |

**Definition of done:** every commitment resolves to a zone chain; selecting a zone filters the queue and ledger; the floor renders downtime and coverage overlays; `verify` asserts routing completeness and resource→zone uniqueness.

### W5 — Capacity, calendar, and date rigour

**Objective:** make dates and capacity time-phased and calendar-aware.

**Changes**
- Add `ShipCalendar`; validate promises against working days.
- Make allocation time-phased (per business day) rather than window-wide subtraction.
- Derive COM-1018 ship date from the supplier commit plus the ship calendar.
- Model post-window recovery contention; expose per-day capacity as derived facts.
- Resolve COM-0991's November load explicitly (modelled or declared out-of-window).

**Definition of done:** no promise lands on a non-working day and passes unnoticed; allocation is day-binned and reproducible; COM-1018 date is computed; `verify` asserts day-bin totals sum to the window total.

### W6 — Governance, authority, disclosure, and role scoping

**Objective:** make authorization and visibility match the persona design.

**Changes**
- Model Finance / Quality / Program as distinct `ApprovalAuthority` requirements that cannot be satisfied by the requesting operational role; a manufacturing-manager approval alone never satisfies the Finance authority.
- Quality becomes a gate check, not a persona approval.
- Add `disclosurePolicy` per role; redacted fields render "not authorized," never "absent," and are stripped before prompt construction.
- Role-lens queue filters and default sorts (capacity / my-shift-today / derated / customer).
- Resolve naming drift: align "shift-planner" to the chosen canonical label; reassign COM-1104 owner away from the retired "Operations Leader."
- Add `HumanOverrideEvent` with rejection codes for governed rejection.

**Definition of done:** the four acceptance criteria from the persona design (§11 items 1, 2, 5, 8) pass; no single role can satisfy a cross-authority requirement; `verify` asserts redaction and authority separation.

### W7 — Defect remediation

**Objective:** clear the register in §5.

**Changes**
- D-03: create a real COM-1104 scenario option `OPT-RESERVE-SLOTS` (with evidence) and repoint the approval; or repoint the approval to an existing option.
- D-04: replace `shortfall` with `constraintClass` + `constraintShortfall`; keep read-compatible aliases.
- D-05/D-17: ship-calendar validation (with W5).
- D-06: derive COM-1018 date (with W5).
- D-13: render loop-equivalents or a conversion note for COM-1042.
- D-21: add a second stale record and one source-unavailable example.
- D-23: route the seeded COM-1104 state through the gateway ordering or explicitly label it pre-seeded.

**Definition of done:** all S1/S2 defects closed; `verify` green; no dangling id in any reference set.

### W8 — Verification, invariants, and fixture lint

**Objective:** make completeness and consistency machine-checked.

**Changes**
- Extend `verify.ts`: authority separation, disclosure redaction, requested/promised/capable ordering, ship-day rule, shortfall typing, routing/zone completeness, maintenance gate.
- Add a fixture-lint pass that asserts: every referenced id resolves; every fact has source + observed + ingested; every commitment has a routing; every resource has exactly one zone; every master's effectivity covers the as-of.
- Derive test envelopes from the fixture rather than hard-coding freshness (D-24).

**Definition of done:** `npm run verify` covers every W1–W7 acceptance criterion; a single dangling reference fails the build.

---

## 9. Governance and invariants (extended)

In addition to the existing ledger and right-pane invariants:

1. Every commitment resolves to a routing and therefore to a zone chain.
2. Every resource belongs to exactly one zone; every routing operation names a valid resource.
3. A promise on a non-working day is flagged and cannot be silently "feasible."
4. `constraintClass` disambiguates capacity vs material vs gate shortfalls; no shared `shortfall` field.
5. An operational role's approval never satisfies a Finance, Quality, or Program authority.
6. Redacted evidence is reported as "not authorized," never "absent," and never enters a prompt.
7. Maintenance restoration is an observed outcome with evidence, not a chat statement.
8. No referenced id (option, approval, receipt, work order, master) is dangling.
9. Every master reference's effectivity covers the snapshot as-of.

---

## 10. Acceptance criteria (persona-anchored)

| # | Persona | Criterion |
|---|---|---|
| A1 | All | Same snapshot renders identical numbers for every role; only view/actions/prose differ |
| A2 | Demand planner | A requested → promised → capable delta is visible per commitment and drives the default sort |
| A3 | Demand planner | Drafts are labelled "not an approved commitment"; send is disabled while gaps/conflicts are open |
| A4 | Shift executive | The shift opens on today · my line; a handover delta is computable; expiring certification raises a coverage gate |
| A5 | Shift executive | Overtime over threshold routes to Finance and cannot be self-approved |
| A6 | Maintenance manager | The queue opens on derated resources by restoration time; a window change is approved as a window |
| A7 | Maintenance manager | Restoration is evidence-backed; without evidence it reads "cannot be established as complete" |
| A8 | Manufacturing manager | An "awaiting me" roll-up orders approvals by expiry |
| A9 | Manufacturing manager | Approval alone never executes; a dry run and receipt are required |
| A10 | All | Selecting a zone filters the queue and ledger and re-scopes the right pane |
| A11 | All | Every ledger cell resolves to a record id or master version; no orphan numbers |
| A12 | All | All S1/S2 defects closed and `verify` (extended) passes |

---

## 11. Traceability matrix

| Persona need | Gap | Workstream | Acceptance |
|---|---|---|---|
| Requested vs promised | D-01 | W1 | A2, A3 |
| Live shift execution + handover | D-15 | W2 | A4 |
| Coverage / certification risk | D-15 | W2 | A4, A5 |
| Root cause + restoration | D-16 | W3 | A6, A7 |
| Maintenance window options | D-02 | W3 | A6 |
| Shop-floor layout | D-14, D-07 | W4 | A10, A11 |
| Bottleneck attribution | D-18 | W4, W5 | A8 |
| Date/capacity rigour | D-05, D-06, D-17, D-18 | W5 | A9, A11 |
| Authority separation | D-08 | W6 | A5, A9 |
| Disclosure / role scoping | D-10, D-11 | W6 | A1, A10 |
| Integrity | D-03, D-04, D-13, D-23 | W7 | A11, A12 |
| Machine-checked completeness | D-24 | W8 | A12 |

---

## 12. Sequencing and milestones

| Milestone | Contents | Depends on | Ideal effort |
|---|---|---|---|
| M0 — Integrity | W7 defects, W8 lint skeleton | — | 2–3 days |
| M1 — Floor foundation | W4 zones/resources/routing + ZoneView | M0 | 4–5 days |
| M2 — Demand seam | W1 CRM requested layer | M0 | 2–3 days |
| M3 — Execution seam | W2 MES work orders/handover | M1 | 4–5 days |
| M4 — Availability seam | W3 EAM + window alternatives | M1 | 4–5 days |
| M5 — Capacity rigour | W5 time-phased allocation + ship calendar | M1 | 3–4 days |
| M6 — Governance | W6 authority/disclosure/lens | M2, M3, M4 | 4–5 days |
| M7 — Assurance | W8 full verification + acceptance pass | all | 2–3 days |

Total ideal effort: ~25–33 engineering days. M0 and M1 are the critical path; the floor foundation unblocks the shift and maintenance seams simultaneously.

---

## 13. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Fixture sprawl reduces determinism | tests flake | keep every addition deterministic and id-stable; lint ids |
| Time-phasing complicates the solver contract | model churn | keep the engine deterministic; time-phase only the inputs |
| Authority separation breaks the single-role demo | demo friction | model authorities as non-persona policy actors with expiry, per design §10.1 option (a) |
| Zone/floor view becomes decorative | low credibility | bind it to selection and filtering, not just rendering |
| Scope creep from multi-site | delays | hold multi-site in Q-01; single site remains |
| Redaction leaks into prompts/logs | governance breach | strip before prompt construction; assert in verify |

---

## 14. Open questions

| ID | Question | Recommendation |
|---|---|---|
| Q-01 | Single site or add a site switcher? | Single site for this iteration; multi-site later |
| Q-02 | Canonical name for the shift role: "Shift Executive (Supervisor)" or "Shift Planner"? | Adopt "Shift Executive" in UI, keep `shift-planner` as the internal id or rename with a migration note |
| Q-03 | Is November (COM-0991) modelled or declared out-of-window? | Model it once W5 lands, to keep demand visible |
| Q-04 | Do maintenance window changes live in the same decision run or a separate maintenance run? | Separate maintenance run, same snapshot, referencing the production run |
| Q-05 | Are policy authorities recorded by a non-persona actor, or resolved on policy? | Resolve on policy for the demo; name owner + expiry on the card |
| Q-06 | Should the floor render all zones or only zones with open decisions? | Only zones with open decisions, plus a toggle for the full plant |

---

## 15. Change log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-09-27 | Initial thorough plan: current-state assessment, 25-defect register, four-persona and shop-floor gap analysis, target architecture, eight workstreams, fixtures, verification, traceability, sequencing |