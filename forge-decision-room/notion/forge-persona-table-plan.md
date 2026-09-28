# FORGE Decision Room — Persona Detail in the Order Table (Plan)

> The centre-bottom **Tables** region must carry the detail each of the **four personas** actually needs — **inside the existing tabular format only**: the same columns, the same row→expanded-tier model, the same lens emphasis and sorting. No new panes, cards, or layouts.

| Field | Value |
|---|---|
| Document | FORGE Decision Room — Persona Detail in the Order Table |
| Version | v0.1 |
| Status | 🟡 Plan — ready to execute T1–T6 |
| Owner | Frontend / UX + Product |
| Ground truth | `src/LedgerView.tsx` · `src/ledger.ts` · `src/model.ts` · `src/zones.ts` |
| Format constraint | **existing tabular format only** (columns · expanded tiers · lens emphasis · sort) |
| Last updated | 2026-09-27 |

---

## 0. Objective & hard constraint

**Objective.** A user of any of the four personas opens the Tables region and, without leaving the table, sees the fields that answer *their* question — by a lенs-led column order, a persona-ordered expanded tier, a persona default sort, and a persona default filter.

**Hard constraint — the table stays a table.** We may:
- choose which existing columns **lead** for a lens (emphasis),
- add a **single lens column** that is only shown for the active lens,
- reorder/extend the **expanded tier** rows per lens,
- set the **default sort** and **default filter** per lens.

We may **not** add new regions, cards, charts, or side panels. Everything is rows × columns + the expand.

---

## 1. The table contract today (grounded in code)

| Element | Where | Today |
|---|---|---|
| Visible columns | `LedgerView.COLUMNS` | **6**: Promise · Order · Product · Qty · Constraint · State |
| Lens emphasis | `LedgerView.EMPHASIS` | coverage `[lifecycle,constraint]` · throughput `[constraint,lifecycle]` · availability `[constraint,product]` · demand `[product,promised]` |
| Sortable | `LedgerView` `SortKey` | risk · promised · qty · lifecycle (asc/desc, `aria-sort`) |
| Expanded tier | `LedgerDetail` | Records (CRM/ERP/MES/WMS/QMS/FIN lanes) · Rules (masters) · Derived (formulas + ladder) · Conflict · Missing |
| Row data | `LedgerRow` | customer, program, family, product, qty, uom, onTimeQty, promised, capable, capableDeltaDays, capableConditional, timeToImpactDays, feasibility, lifecycle, risk, constraint{…}, provenance{…}, conflicts, missing, rules, derived, lanes, ladder |
| A11y | `LedgerView` | `role=table/row/cell/columnheader`, roving rows, Enter/Space expand, Esc collapse, focus ring |

**Gap:** the **same six columns and the same tier order** serve all four personas; only a thin emphasis differs. The persona-relevant fields (requested date, coverage, downtime, cost of recovery, approvers) are either absent from the row or buried.

---

## 2. The four personas and what the table owes each

| Persona (lens) | Lead question | Must see in the table |
|---|---|---|
| **Manufacturing manager** (throughput) | “What slips, what does it cost, and who decides?” | binding constraint + shortfall; capable vs promise; **cost of recovery**; feasible/infeasible option counts; **named approvers + authority + expiry** |
| **Shift executive / planner** (coverage) | “Can we cover it, and with whom?” | **coverage / certification** (certified crew, expiring certs); **work-order state**; **shift-handover delta**; overtime request state |
| **Maintenance manager** (availability) | “Why is the asset down, when is it back?” | **open downtime events** on the constraint resource; **restoration estimate**; **calibration due**; criticality / MTBF / MTTR |
| **Demand planner** (demand) | “Which requests are at risk, how bad?” | **requested → promised → capable** triple + deltas; priority class; customer/program/order ref; **value at risk**; on-time vs total qty |

---

## 3. Design: keep 6 columns, add **one lens column**

The table stays **6 fixed columns** for everyone —
`Promise · Order · Product · Qty · Constraint · State` —
and gains **one lens column** (column 3) that is **shown only for the active lens**, so the table stays calm (≤ 7 columns) while each persona gets its field:

| Active lens | Lens column header | Cell content (row) |
|---|---|---|
| Manufacturing (throughput) | **Recovery** | `$4,416 · 1 feasible / 6 · Finance` (cost · option count · authority) |
| Shift (coverage) | **Coverage** | `3 certs · 1 expiring · WO-4471 op 60/80` (crew/certs · WO state) |
| Maintenance (availability) | **Availability** | `RES-LT-01 half-rate 6–14 Oct · back 14 Oct 22:00` (event + restoration) |
| Demand (demand) | **Gap** | `Req 12 Oct → Prom 15 Oct → Cap 19 Oct · +4d · P1` (triple + slip + priority) |

Everything else is the existing emphasis mechanism: the lens’s **leading columns** get the emphasis style; the **non-lead columns dim** one step.

> Rationale: adding one column is still “the existing tabular format”; hiding it for other lenses keeps the earlier minimalism intact.

---

## 4. Expanded tier per persona (same tier model, persona-ordered)

The expanded row keeps its five tiers — **Records · Rules · Derived · Conflict · Missing** — but the **first tier is a persona block** carrying that persona’s decision fields; the other tiers remain the evidence.

| Persona | Persona tier (first, expanded) — fields |
|---|---|
| **Manufacturing** | `capable vs promise (Δ)` · `binding constraint + shortfall + secondary constraints` · `recovery cost (CAD estimate)` · `feasible / infeasible option counts + best on-time option` · `approvers: names · authority · expiry` |
| **Shift** | `lifecycle` · `work-order state (WO id · op x/y)` · `coverage: certified crew, required certs, expiring cert` · `handover Δ since prior shift` · `overtime request state` |
| **Maintenance** | `constraint resource` · `open downtime event(s) + window` · `restoration estimate + evidence` · `calibration due` · `criticality · MTBF · MTTR` |
| **Demand** | `requested → promised → capable (+ each delta)` · `customerPriority · orderRef · program` · `on-time qty / total · residual shortfall` · `value at risk` · `conditional capable note` |

The remaining tiers (Records/Rules/Derived/Conflict/Missing) are unchanged in content; only their **order within the tier** may follow the lens (e.g., demand leads with CRM demand records; maintenance leads with the EAM/resource records).

---

## 5. Defaults per persona (sort · filter · emphasis)

| Lens | Default sort | Default filter | Leading columns (emphasis) |
|---|---|---|---|
| throughput | constraint class, then time-to-impact | `at risk` + `awaiting` | Constraint · State · Recovery |
| coverage | lifecycle (investigating first), then time-to-impact | none (all), queue = my shift | State · Coverage · Constraint |
| availability | constraint resource, then time-to-impact | resources with an open downtime event | Constraint · Availability · State |
| demand | promise gap (`capable − promised`) desc | none (all), demand-relevant families | Promise · Gap · Order |

These are the **existing** `lensSort()` (in `src/zones.ts`) and the existing filter rail — extended with the lens column, not new UI.

---

## 6. Exact fields and where they come from

| Field | Persona | Source today | Needed? |
|---|---|---|---|
| capable, capableDeltaDays, timeToImpactDays, feasibility, constraint{label,resource,allocated,required,shortfall,secondaries,gates} | Mfg / Maint | `ledger.ts` ✅ | present |
| promised, qty, uom, onTimeQty, family, product, customer, program | All | `ledger.ts` ✅ | present |
| capabilityLine / capableConditional | Demand | `ledger.ts` ✅ | present |
| provenance{systems,fresh,stale,conflicts}, lanes, rules, derived, missing, ladder | All | `ledger.ts` ✅ | present |
| **requestedDate · orderRef · customerPriority · value** | Demand | not modelled (D-02) | **add (D-02)** |
| **recovery cost + option counts + approvers/authority/expiry** | Mfg | `model.ts` options/approvals ✅ (summarise into the row) | **derive** |
| **work-order state · shift handover · certs** | Shift | MES absent (D-07, C-01…C-04) | **add (D-07)** |
| **downtime event · restoration · calibration · MTBF/MTTR** | Maint | EAM thin (D-08) | **add (D-08)** |
| **coverage / certification gap** | Shift | not modelled (C-04) | **add (C-04)** |

---

## 7. Work slices (T1–T6) — all inside the table

| # | Slice | File | Accept |
|---|---|---|---|
| **T1** | Add the **lens column** (7th) with the four cell renderers | `LedgerView.tsx`, `ledger.ts` | only the active lens column shows; ≤7 columns |
| **T2** | Add the **persona tier** as the first expanded tier; keep the other five | `LedgerView.tsx` | persona fields visible on expand; existing tiers intact |
| **T3** | Extend `LedgerRow` with the persona fields (recovery, coverage, availability, demand triple) | `ledger.ts`, `model.ts` | typed, deterministic, no view recompute |
| **T4** | Persona **default sort + filter + emphasis** wiring | `zones.ts` (`lensSort`), `App.tsx` | role switch re-sorts/filters; numbers unchanged |
| **T5** | Data gaps for the shift/maintenance/demand fields | `model.ts` fixtures (D-02/D-07/D-08/C-04) | fields resolve; no dangling refs |
| **T6** | Table tests + a11y | `tools/invariant-tests.ts`, `verify.ts` | persona fields asserted; keyboard/aria preserved |

**T1–T4 ≈ 2–3 days; T5 depends on the data seams (D-02/D-07/D-08/C-04).**

---

## 8. Three rounds of thorough testing (for this change)

**Round 1 — table/visual (in-browser DOM audit).**
- For each of the 4 roles: columns = 6 + the correct lens column; the lens column header matches (§3); the persona tier is the first expanded tier; leading columns correct.
- Budget: ≤ 7 columns; rows single-line; emphasis ≤ 2 leading columns.

**Round 2 — functional & data.**
- `npm run ci` (all suites) — especially `test:invariants` (cross-pane: ledger ⇄ assess) and `test:contract/capacity` (unchanged data).
- Assert every persona field resolves (no `undefined`) and equals the deterministic service value.

**Round 3 — personas, a11y, determinism.**
- 4 roles: switching role changes the lens column, default sort, and default filter, but **never a number** (C9).
- Keyboard: roving rows still work with the extra column; Enter/Space expand; Esc collapse; `aria-sort` intact.
- Determinism: invariants ×2 identical.

---

## 9. Notion pages to update

- **UI/UX Layout & Interaction Spec** — §4 order-table subsection: add the lens column + persona tier; keep the “existing tabular format” note.
- **Design List** — add **DS-27 Persona Detail in the Order Table**.
- **Master Task List** — add **T1–T6** under the UI stream; link D-02/D-07/D-08/C-04 as dependencies.
- **Personas & Governance** — link each persona to its table column/tier (throughput→Recovery, coverage→Coverage, availability→Availability, demand→Gap).
- **Test Plan** — add the three rounds above to §2.1.

---

## 10. Risks

- **Column creep** — one lens column only; everything else goes in the tier. If a lens needs more, split the row into the existing tiers, not new columns.
- **Hidden ≠ lost** — non-active lenses still see all 6 canonical columns; the lens column is additive.
- **Data gaps** — Shift (D-07/C-04) and Maintenance (D-08) fields need the seams; until then render the field as `—` with a reason, never fabricate.
- **Minimalism** — keep the lens column compact (one line); never two lines.
- **Determinism** — all persona fields are projections of the deterministic services; the view never computes.

---

## 11. Definition of done

- For each role, the Tables region shows the §3 lens column and the §4 persona tier, with the §5 default sort/filter.
- ≤ 7 columns; ≤ 2 leading columns; persona fields resolve to deterministic values; the other five tiers unchanged.
- Round 1/2/3 green; `npm run ci` green; the app serves at the final URL.
- UI/UX §4, Design List DS-27, Master Task List T1–T6, Personas, Test Plan updated.

---

## 12. Change log

| Version | Date | Change |
|---|---|---|
| v0.1 | 2026-09-27 | Created the plan: persona detail inside the existing tabular format — 6 fixed columns + 1 lens column, a persona-ordered expanded first tier, persona default sort/filter, exact fields/sources, slices T1–T6, and a 3-round test plan |