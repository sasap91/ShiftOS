# FORGE Decision Room — Data Improvement Plan v2.1 (ERP · CRM · MES-Embedded, Algorithm-Ready)

> The algorithm-ready data plan, embedded in the existing ERP, CRM, MES, reference, and governed structure. No parallel store: every algorithm input is an existing table or a minimal new table placed in its home domain with the standard envelope.

| Field | Value |
|---|---|
| Document | FORGE Decision Room — Data Improvement Plan v2.1 |
| Version | v2.1 |
| Status | 🟡 Active — supersedes v2.0 (adds the ERP/CRM/MES embedding contract) |
| Owner | DATA (with AI · BE · GOV) |
| Scope | the algorithm input data for allocation, schedule, MRP, CTP, and shift execution |
| Supersedes | COOLIT Data Improvement Plan v1.0; Data Improvement Plan v2.0 |
| Embedded in | COOLIT_Synthetic_Enterprise_Data_v3/.1 (ERP · CRM · MES · reference · governed) |
| Last updated | 2026-09-27 |

---

## 1. Why this plan exists

The solver core (allocation, schedule, frozen pinning, ship-day normalisation, recovery) is real and verified — 16/16 in `tools/coolit-test.ts`. The three algorithm families are ~16% complete and Family C does not exist. The gating reason is data connection, not math. v2.1 ensures the data those families need is **embedded in the existing ERP/CRM/MES structure**, so the ledger, the workspace app, and the solver all read the same tables.

---

## 2. Embedding principle (binding)

1. **Reuse-first.** If an existing ERP, CRM, or MES table already carries the data, use it; do not create a parallel table.
2. **Domain-correct placement.** A new table goes in the domain that owns it: shipping rules → `reference/`, order commercial → `erp/`, execution → `mes/`, demand → `crm/`, governed/decided → `governed/`, provenance → `data/`.
3. **One envelope.** Every new table carries the same 27-column envelope (tenant, site, source, canonical id, effectivity, version, quality, freshness, transformation version, scopes, snapshot, scenario) that all 171 existing datasets use.
4. **Registered, not orphaned.** Every new table is added to `schema/table_catalog.csv` and `schema/column_dictionary.csv`, carries a data contract, and is covered by review checks.
5. **Derived is computed, never stored twice.** The Algorithm Input Bundle (AIB) is a **projection** over these tables, not a new store.

---

## 3. Existing structure this embeds into (v3)

| Domain | Tables | Owns |
|---|---:|---|
| ERP | 52 | demand/supply planning, MRP, pegging, scheduling, inventory, cost, order-to-cash |
| MES | 43 | work orders, WIP, dispatch, operators, equipment, maintenance, calibration, test, handover |
| CRM | 37 | accounts, programs, opportunities, quotes, demand signals, commitments, contracts, forecast |
| GOVERNED | 18 | canonical commitment, decisions, approvals, receipts, outcomes, policy, authorization, zone state |
| REFERENCE | 15 | site, calendar, shift calendar, location, zones, routing template, authorities, disclosure |
| DATA | 6 | lineage, contracts, negative tests, SLOs, ingestion |
| **Total** | **171** | |

---

## 4. Domain embedding matrix — requirement → home → table

| Req | Requirement | Domain | Existing table to use | New? |
|---|---|---|---|---|
| A-01 | Demand signal vs commitment | CRM | `crm/demand_signal` (demand_class, quantity, demand_date, confidence) | reuse |
| A-02 | Forecast-per-regime | CRM | `crm/forecast_snapshot`, `crm/seller_forecast` | reuse |
| A-03 | Three date deltas | GOVERNED | `governed/commitment_date_triad` (+ `crm/quote_line` requested/quoted, `erp/sales_order_schedule`) | reuse |
| A-06 | MRP netting | ERP | `erp/gross_requirement`, `erp/net_requirement`, `erp/pegging_snapshot`, `erp/safety_stock_policy`, `erp/planning_run` | reuse |
| A-07 | Eligibility netting | ERP | `erp/inventory_state` (quality_state, eligible_qty), `erp/inventory_location_balance`, `erp/approved_source`, `erp/inventory_status_transition` | reuse |
| A-08 | CTP service | REFERENCE + GOVERNED | capability from `mes/resource_calendar` + `mes/equipment_state_event`; output `governed/commitment_capable_date` | **new** |
| A-09 | Time-phased allocation | ERP | `erp/operation_schedule` + capability intervals | reuse |
| B-01 | Capability evaluator | MES | `mes/resource_calendar`, `mes/equipment_state_event`, `mes/ideal_cycle_standard`, `mes/loss_event`, `mes/oee_daily` | reuse |
| B-02/B-03 | Allocation + schedule | ERP | `erp/routing_operation`, `erp/operation_schedule`, `erp/schedule_version`, `erp/work_order_operation_plan` | reuse |
| B-05 | Ship-day normalisation | REFERENCE | `reference/ship_calendar` | **new** |
| B-07 | Changeover / setup | ERP | `erp/setup_matrix` (changeover_minutes, cleaning, fixture) | reuse |
| B-08 | Objective policy + gap | ERP | `erp/schedule_version.objective_priority` | reuse |
| B-11 | Scenario generation | GOVERNED | `governed/decision_run.alternatives_json`, `governed/maintenance_window_option` | reuse |
| C-01 | WO state machine | MES | `mes/work_order_operation`, `mes/operation_transaction` | reuse |
| C-02 | Dispatch | MES | `mes/dispatch`, `mes/dispatch_history` | reuse |
| C-03 | Handover delta | MES | `mes/shift_handover` (+ `mes/wip_state`, `mes/shift_assignment`) | reuse |
| C-04 | Coverage + certification gating | MES | `mes/operator_qualification` (valid_from/to, qualification_state, revoked_flag), `mes/operator`, `mes/labor_event` | reuse |
| C-05 | Overtime routing | ERP + GOVERNED | `erp/labor_capacity` (overtime_minutes), `reference/approval_authority` (AUTH-FINANCE) | reuse |
| C-06/C-07 | Rostering + replanning | MES | `mes/shift_assignment`, `mes/electronic_signature`, `mes/instruction_acknowledgement` | reuse |
| D-17 | Non-working-day promise | REFERENCE | `reference/ship_calendar` | **new** |
| D-20 | Order margin / penalty | ERP | `erp/order_margin` | **new** |
| K-05 | NumberRef provenance | DATA | `data/number_ref` | **new** |

**Net:** 22 of 24 requirements reuse existing ERP/CRM/MES/reference/governed tables. Only **4 new tables** are needed, each in its home domain.

---

## 5. Minimal new tables (embedded, v3.1)

| Table | Domain | Grain | Key columns (after envelope) | Source | Task |
|---|---|---|---|---|---|
| `reference/ship_calendar` | REFERENCE | date | calendar_id, day_of_week, is_working_day, is_shipping_day, cut_off_time, exception_code | derived from working-day rule | D-17, B-05 |
| `reference/capability_interval` | REFERENCE | resource × interval | resource_id, zone_id, from_at, to_at, rate_per_day, derate_factor, cause_code, cause_reference | derived from `mes/resource_calendar`, `mes/equipment_state_event`, `mes/downtime_changeover` | A-08, B-01 |
| `erp/order_margin` | ERP | commitment | commitment_id, order_value_usd, standard_cost_usd, margin_usd, margin_pct, late_penalty_usd, expedite_cost_usd | derived from `erp/sales_order_schedule.order_value_usd`, `erp/cost_snapshot` | D-20 |
| `governed/commitment_capable_date` | GOVERNED | commitment | commitment_id, capable_date, method, inputs, confidence, expires_at | **emitted by CTP (A-08)** — schema registered now | A-08 |
| `data/number_ref` | DATA | number | number_id, value, unit, formula, derived_from, master_version, trace_id, owner_object_id | **emitted by kernel (K-05)** — schema registered now | K-05 |

v3.1 **populates** the first three deterministically from v3; the last two are **declared derived schemas** populated by A-08 and K-05.

---

## 6. The Algorithm Input Bundle is a projection, not a store

| Bundle | Projection over (existing embedded tables) | Unblocks |
|---|---|---|
| AIB-allocation | `reference/capability_interval` + `governed/canonical_commitment` + `erp/pegging_snapshot` | A-09, B-02 |
| AIB-schedule | `erp/routing_operation` + `erp/operation_schedule` + `erp/setup_matrix` + `reference/ship_calendar` + `mes/resource` + `erp/work_order` | B-03, B-05 |
| AIB-mrp | `crm/demand_signal` + `erp/bom_header`/`bom_component` + `erp/inventory_state` + `erp/approved_source` + `erp/net_requirement` + `erp/pegging_snapshot` | A-06, A-07 |
| AIB-ctp | AIB-allocation + AIB-mrp + AIB-schedule + `reference/ship_calendar` → `governed/commitment_capable_date` | A-08 |
| AIB-shift | `mes/work_order_operation` + `mes/wip_state` + `mes/shift_assignment` + `mes/operator_qualification` + `mes/shift_handover` | C-01…C-09 |

Each projection inherits the v3 envelope metadata; nothing is copied into a second system of record.

---

## 7. Defect status after v3 (+ embedded additions)

- ✅ Data-satisfied (6): D-01, D-02, D-07, D-10, D-11, D-14.
- 🔄 Data-partial (4): D-08, D-09, D-15, D-16.
- ⬜ Still open (13): D-03, D-04, D-05, D-06, D-12, D-13, D-17, D-18, D-19, D-20, D-21, D-24, D-25.
- v3.1 closes **D-17** (ship_calendar) and **D-20** (order_margin); **D-18** (time-phased allocation) is the AIB-allocation projection over `reference/capability_interval`.

---

## 8. Acceptance & verification (embedded)

| Check | Target |
|---|---|
| Domain placement | every new table sits in ERP/CRM/MES/reference/governed/data per §2.2 |
| Envelope | every new row carries the 27-column envelope |
| Registration | every new table appears in `schema/table_catalog.csv` + `column_dictionary.csv` with a data contract |
| Joins | `reference/ship_calendar` covers the planning horizon; `reference/capability_interval` resolves resource+zone; `erp/order_margin` resolves commitment + order value |
| Reuse discipline | no table duplicates an existing ERP/CRM/MES table; MRP/eligibility/certification/setup reuse `erp/*` and `mes/*` |
| `test:coolit` | ≥ 40/40; schedule on `erp/routing_operation` + `erp/operation_schedule` (not a provisional fixture) |

---

## 9. Sequencing

| Milestone | Contents | Unblocks |
|---|---|---|
| M0 | D-03/D-04/D-05 defects; `reference/ship_calendar` | allocation/ship-day fidelity |
| M1 | `reference/capability_interval` + AIB-allocation + AIB-schedule from `erp/*` | schedule on real masters |
| M2 | AIB-mrp over `erp/net_requirement` + `erp/pegging_snapshot` | COM-1018 material enters |
| M3 | AIB-ctp → `governed/commitment_capable_date` | capable dates computed |
| M4 | AIB-shift over `mes/*` | Family C exists |
| M5 | `data/number_ref` + kernel + ledger/UI wiring | app reflects the solver |

Critical path: M0 → M1 → M2 → M3 → M4 → M5.

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| A parallel “algorithm fixture” reappears | AIB is defined only as projections over embedded tables; CI forbids a new store |
| New tables drift from the envelope | generated by the pack generator, registered in schema, covered by review |
| Reuse mistaken for completeness | MATRIX §4 lists the exact table per requirement; a missing column is an extension, not a new table |
| Wiring changes golden hashes | version the master set and announce the bump |

---

## 11. Change log

| Version | Date | Change |
|---|---|---|
| v2.0 | 2026-09-27 | Algorithm-ready plan: three-fixture state, AIB deliverable, v3.1 additions |
| v2.1 | 2026-09-27 | Embedded in the ERP/CRM/MES structure: reuse-first embedding matrix (22/24 reuse), only 4 new domain tables, AIB redefined as projections over embedded tables, embedded acceptance checks |