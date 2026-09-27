# FORGE Decision Room — Data Model & Synthetic Fixtures

> Skeleton with placeholders. Defines the four data classes, the entity catalogue, the commitment ladder, the reference-master expansion, and the COOLIT fixture additions for W1–W5. Tenant `TENANT-COOLIT-SYNTH` · Site `SITE-YYC-01` · Snapshot `SNAP-20260926-0815`.

| Field | Value |
|---|---|
| Document | FORGE Decision Room — Data Model & Synthetic Fixtures |
| Version | v0.1 (skeleton) |
| Status | 🚧 Draft — placeholders to complete |
| Owner | Backend / API + Data modelling |
| Parent doc | FORGE Decision Room — Product Management |
| Last updated | 2026-09-26 |

---

## 0. Purpose & scope

- Purpose: define every entity the room reads, and every fixture addition the workstreams introduce.
- In scope: classes, entities, keys, master expansion, fixture rows, integrity rules.
- Out of scope: solver math (see Algorithms), UI rendering (see UI/UX).
- Placeholder — any additional scope.

---

## 1. Data classes

| Class | Glyph | Changes by | Axis | Must never |
|---|---|---|---|---|
| Master / reference | `§` | change control | version + effectivity | be tagged "stale" |
| Transaction | `●` | event | freshness + observed/ingested | appear without source + timestamp |
| Derived | `∑` | recompute | formula + trace id | be entered by hand |
| Conflict / missing | `⇄` `∅` | relationship / absence | disposition | be auto-resolved |

---

## 2. Entity catalogue

> Existing entities (Commitment, DecisionRun, ApprovalRequest, ActionReceipt, ObservedOutcome, SourceFact, DerivedFact, Conflict, MasterRef) plus the new/changed entities below.

| Entity | Layer | Key fields | Workstream | Status |
|---|---|---|---|---|
| Commitment (changed) | ERP/CRM | + requestedDate, orderRef, customerPriority, shipCalendarId | W1 | Open |
| Zone | master | zoneId, label, products, resources, floorX, floorY | W4 | Open |
| Resource (changed) | master | + zoneId, qualifiedProducts, demonstratedRate, changeoverMin, shifts, calibrationDue, criticality, mtbfHrs, mttrHrs | W4 | Open |
| Routing | master | routingId, product, operations[] = {seq, resourceId, stdRate, setupMin} | W4 | Open |
| ShipCalendar | master | calendarId, working days, cut-off, non-shipping days | W5 | Open |
| WorkOrder | MES | woId, commitmentId, routingOp, resourceId, zoneId, qtyStarted/Completed/Scrapped, status, shift, planned/actual, operatorId | W2 | Open |
| ShiftHandover | MES | handoverId, zoneId, at, wip, openIssues, escalations | W2 | Open |
| OperatorCertification | MES/HR | operatorId, name, resourceId, certId, validFrom, validTo, shift | W2 | Open |
| MaintenanceWorkOrder | EAM | mwoId, resourceId, type (PM/CM), failureMode, rootCauseCode, priority, technician, parts, planned/actual, status | W3 | Open |
| RestorationFact | EAM | resourceId, observedRate, restoredAt, evidence | W3 | Open |
| CalibrationRecord | QMS | resourceId, calibratedAt, dueAt, status | W3 | Open |
| ApprovalAuthority | policy | authorityId (finance/quality/program/procurement), resolvesOn, owner, expiry | W6 | Open |
| HumanOverrideEvent | governance | recommended vs selected, rejection code, rationale, actor, snapshot | W6 | Open |
| DecisionRun (changed) | derived | constraintClass + constraintShortfall replace shortfall (aliases kept) | W7 | Open |
| NumberRef | kernel | value, unit, derivedFrom[], masterVersion, formula, traceId | all | Open |
| DemandRecord | CRM/ERP | id, ladder rung, product, qty, requestedDate, promisedDate, probability, sourceRecordId | W1 / A | Open |
| DemandRequirement | derived | dueDate, priorityKey (lexicographic), firmness, sourceRecordId | W1 / A | Open |
| NetRow + Peg | derived | item, bucket, grossReq, schedReceipts, projectedOnHand, safetyStock, netReq, plannedOrder; Peg{demandRef, supplyRef, qty} | W5 / A | Open |
| UncertaintyFact | derived | ofSourceFactId, distribution (discrete/empirical/interval), confidence, methodVersion, basis[] | W5 / A+B | Open |
| CapabilityInterval | master/derived | resourceId, from, to, ratePerDay, derate, causeId, evidenceRef | W3 / B | Open |
| WorkOrderSchedule | derived | woId, opSeq, resourceId, start/end, qty, setupMin, status, pegIds[] | W5 / B | Open |
| CoverageAssignment | MES | resourceId, shiftId, operatorId, certId, regular/overtime, costCad, coverageRisk | W2 / C | Open |
| Explanation | governance/derived | bindingConstraint, causalChain[], counterfactual[], alternatives[], confidence, inputs[], redactionApplied | W6 / A+B+C | Open |
| CausalCodeMap | policy | version, code → {humanLabel, persona, nonWaivable} | W6 / A+B+C | Open |

---

## 3. Commitment ladder

`forecast → opportunity → quote → reservation → firm_order → approved_commitment → shipped`.

- **Firmness class decides eligibility:** `forecast/opportunity/quote` are **signals** (no peg, no capacity consumed); `reservation` is a **soft claim** (time-phased, expiring); `firm_order`/`approved_commitment` are **commitments** (pegged, consume capacity); `shipped` is an **actual** (observed).
- Required distinct dates: requested_date · quoted_date · erp_schedule_date · approved_commit_date · actual_ship_date.
- System of record: `requested_date` = CRM; `quoted_date` = CRM/sales; `erp_schedule_date` = ERP (after ship calendar); `approved_commit_date` = governed decision record (may rewrite a promise only via propose→approve→execute); `actual_ship_date` = MES/WMS observed.
- The demand queue sorts by `capableToRequested = capable − requested`, then by the lexicographic priority key, then id.

---

## 4. Reference-master expansion

| Master set | Records to add | Status |
|---|---|---|
| item | ITEM-RM-42, ITEM-CDU-2400, ITEM-MV-14, ITEM-MV-14B | Open |
| routing | RT-CPL480, RT-CPL320, RT-RM42, RT-CDU2400 | Open |
| resource | RES-ASM-01/02, RES-ELEC-01, RES-QC-01, RES-SHIP-01 (+ existing RES-LT-01, RES-FT-02) | Open |
| zone | Z-ASM, Z-LT, Z-FT, Z-ELEC, Z-QC, Z-SHIP | Open |
| calendar | SHIP-CAL-YYC, SHIFT-CAL-YYC | Open |
| party | customer masters Northline / BrightGrid / Helios | Open |
| commercial | margin/penalty card; customer priority policy | Open |
| policy | approval matrix, disclosure policy, ship-day rule | Open |
| asset | ASSET-LT-01 and peers with criticality/MTBF/MTTR | Open |

---

## 5. Fixture additions by workstream

**W1 — CRM demand layer:** Placeholder — requested-date facts per commitment (SRC-*-REQ), one commercial-value fact.
**W2 — MES execution:** Placeholder — work orders per commitment (WO-*-*), handover notes (SHF-*), certifications (CERT-*).
**W3 — Maintenance:** Placeholder — MWO-LT-041/038, CAL-LT-2026-08, REST-LT-01, maintenance window alternatives.
**W4 — Zones & routing:** Placeholder — zone→resource and product→routing assignments.
**W5 — Calendars & capacity:** Placeholder — ship calendar, time-phased day bins, derived COM-1018 date.

> Placeholder — add the concrete fixture tables with ids, values and statements (as in plan §8).

---

## 6. Integrity rules

- Every referenced id resolves; every fact has source + observed + ingested; every commitment resolves to a routing; every resource has exactly one zone; every master's effectivity covers the as-of; held/expired/unqualified supply is never eligible.
- **Algorithm invariants (W8):** every displayed number is a `NumberRef` resolving to a record id or master version (no orphan numbers); `Σ pegs per supply = consumed supply` and `Σ pegs per demand = allocated demand`; capacity is derived from capability intervals (golden `304` recomputed from segments); `requested ≤ promised ≤ capable` ordering where applicable; no promise lands on a non-working ship day unnoticed; a timed-out search with no solution is never `PROVEN_INFEASIBLE`; `OPTIMAL` only when `gap ≤ policyGap`; redaction is asserted before an explanation is rendered.
- **Reproducibility invariants:** re-running the same `(snapshot_hash, master_set_version, model_version, seed)` yields a byte-identical `canonicalResult`; shuffling input arrays/key order does not change the hash; execute is compare-and-swap and a stale run cannot execute.
- Placeholder — enumerate which of the above the W8 fixture-lint checks versus the extended `verify.ts`.

---

## 7. Open questions

1. Canonical IDs for the new masters? [TBC]
2. Which values are synthetic vs derived? [TBC]
3. Single site — confirm no cross-site entities. [TBC]

---

## 8. Change log

| Version | Date | Change |
|---|---|---|
| v0.1 | 2026-09-26 | Created data model & synthetic fixtures skeleton with placeholders |
| v0.2 | 2026-09-26 | Added algorithm-layer entities (NumberRef, DemandRecord/Requirement, NetRow+Peg, UncertaintyFact, CapabilityInterval, WorkOrderSchedule, CoverageAssignment, Explanation, CausalCodeMap); filled the commitment ladder and firmness rules; extended integrity rules with algorithm and reproducibility invariants |