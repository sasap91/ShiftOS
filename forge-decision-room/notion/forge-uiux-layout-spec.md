# FORGE Decision Room — UI/UX Layout & Interaction Spec

> Skeleton with placeholders. Defines the four-region room, the order table, the layout view, the chatbot pane and the filtering/attribute panel. Governed by the invariant: the centre pane is the record; every other pane is a view of a centre record.

| Field | Value |
|---|---|
| Document | FORGE Decision Room — UI/UX Layout & Interaction Spec |
| Version | v0.9 (minimalism & density budget) |
| Status | 🟡 Active — §3 Layout built + aligned to the floor-plan illustration; §4 order table built; remaining sections placeholder |
| Owner | Frontend / UX |
| Parent doc | FORGE Decision Room — Product Management |
| Last updated | 2026-09-26 |

---

## 0. Purpose & scope

- Purpose: one authoritative description of the screen, so implementation and review share a baseline.
- In scope: regions, layout, order-table columns, filtering, chatbot placement, states, interaction, visual system, accessibility.
- Out of scope: data contracts (see Data Model), solver logic (see Algorithms), authority rules (see Personas & Governance).
- Placeholder — any additional scope.

---

## 1. Region model (four panes)

```
┌────────────────┬─────────────────────────────────────┬──────────────────┐
│ LEFT           │ MIDDLE · TOP — Layout                │ RIGHT            │
│                │ (visual / spatial view)              │ Chatbot          │
│ Filtering      │                                      │ (copilot)        │
│ General        ├─────────────────────────────────────┤                  │
│ attributes     │ MIDDLE · BOTTOM — Order info         │                  │
│ Planner-       │ (tabular: rows × columns)            │                  │
│ specific /     │                                      │                  │
│ overall info   │                                      │                  │
└────────────────┴─────────────────────────────────────┴──────────────────┘
```

| Region | Position | Job | Owns | Never does |
|---|---|---|---|---|
| Left | full height | narrow scope + orient | filters · general attributes · planner-specific/overall info | hold the record or approvals |
| Middle · top | upper centre | show the spatial picture | the Layout view | be the source of a fact |
| Middle · bottom | lower centre | compare orders at a glance | the order information table | carry AI prose or the copilot |
| Right | full height | investigate + prepare action | chatbot, evidence, options, governed actions | be the source of a fact or approval |

> Placeholder — confirm whether panes are fixed-width or resizable, and collapse behaviour per persona.

---

## 2. Left pane — filtering & attributes

**2.1 Filters** — Placeholder. Candidate set: state · urgency · constraint class (capacity/material/gate/quality) · family · customer/program · owner · changed-since (shift handover).

**2.2 General attributes** — Placeholder. Candidate: site · snapshot · master-set version · as-of · role lens.

**2.3 Planner-specific or overall info** — Placeholder. Define the toggle and what each mode shows:
- Overall (plant-wide): [TBC]
- Planner-specific: [TBC]

**2.4 Defaults & persistence** — Placeholder. Per-persona default filter/sort; reset on demand.

---

## 3. Middle · top — Layout view

**It is a plant floor plan.** The spatial process map of the single site (YYC-01), drawn left→right in material-flow order. It is the spatial twin of the order table: the table says *what* is at risk; the floor shows *where*.

**Process flow (left → right):**

```
Receiving + IQC → Controlled Supermarket + Kitting → Production cells → Test cells → FAT + Documentation → Finished Goods → Pack + Ship → Shipping Staging
```

- Production cells (three parallel lines): **Cold-Plate Loop Line** · **Manifold Cells** · **CDU Assembly Cells**.
- Test cells: **Pressure / Leak / Functional Test** · **Thermal / Flow Test**.
- Exception flow: nonconformance → **Quarantine + MRB**; controlled rework flow (as needed) → **Rework** → back into test.

**Aisles & fixed constraints:** Pedestrian walkway (keep clear) along the top and bottom; Material handling lane (forklifts / carts) along the bottom; Utilities block (top-right).

**Zone inventory (candidate — to be frozen with the zone master):**

| Zone id | Label | Process role | Plan-zone mapping | Resources |
|---|---|---|---|---|
| Z-RCV | Receiving + IQC | inbound + incoming quality | new | [TBC] |
| Z-SUPER | Controlled Supermarket + Kitting | material staging + kitting | new | [TBC] |
| Z-CPL | Cold-Plate Loop Line | CPL-480 assembly | Z-ASM | RES-ASM-01 |
| Z-MF | Manifold Cells | RM-42 assembly | Z-ASM | RES-ASM-02 |
| Z-CDU | CDU Assembly Cells | CDU-2400 assembly (incl. electronics) | Z-ASM | RES-ASM-01 |
| Z-LEAK | Pressure / Leak / Functional Test | leak + functional test | Z-LT + Z-FT | RES-LT-01, RES-FT-02 |
| Z-THERM | Thermal / Flow Test | thermal / flow test | new | [TBC] |
| Z-FAT | FAT + Documentation | final acceptance + documentation | new | [TBC] |
| Z-FG | Finished Goods | finished-goods hold | new | [TBC] |
| Z-PACK | Pack + Ship | packing and shipment | Z-SHIP | RES-SHIP-01 |
| Z-STAGE | Shipping Staging | outbound staging | Z-SHIP | [TBC] |
| Z-QC | Quarantine + MRB | nonconformance / MRB | Z-QC | RES-QC-01 |
| Z-REWORK | Rework | controlled rework loop | new | [TBC] |

> **Zone ids:** the table above uses candidate `Z-*` ids. The built view addresses zones as `ZN-*` (e.g. `ZN-08` = Pack + Ship); freeze one scheme with the zone master. There is **no separate electronics zone** — CDU electronics fold into **Z-CDU**, matching the illustration.

**Overlays (drawn on the plan):**
- Downtime — zones/resources with an open downtime event (e.g. RES-LT-01 in Z-LEAK).
- Coverage risk — zones with a certification/coverage gap for the active shift.
- Open decisions — a badge on zones bound by commitments with open decisions.
- Selection — the selected zone highlights and its bound commitments list.

**Interaction:**
- Select a zone → filters the order table and the left queue to commitments bound by that zone's resources, and re-scopes the right pane.
- Hover a zone → preview the commitments bound to it.
- Zone state is derived from resource state; the plan never holds a fact the table cannot show.

**Empty / loading states:** skeletal plan at true aspect ratio; a "no zones with open decisions" state plus a full-plant toggle.

**Artifact:** installed at **`public/floor-plan.png`** (extracted from the FORGE PRD, page 14) and rendered as the middle-top Layout view with 13 zone hotspots + open-decision badges; the schematic SVG is the fallback when the asset is absent.

**Routing implication:** the floor shows test = Pressure/Leak/Functional **and** Thermal/Flow, then FAT + Documentation. The illustration settles that **Z-ELEC folds into Z-CDU** (no separate electronics cell). Confirm whether every product routes through Thermal/Flow and FAT or only some.

**Placeholder — still open:** exact floor coordinates (floorX/floorY) per zone; which zone owns Shipping Staging vs Pack + Ship.

---

## 4. Middle · bottom — Order information table

- **Purpose:** dense, aligned, cross-order comparison. Not cards.
- **Status: built** — `src/ledger.ts` (projection) · `src/LedgerView.tsx` (render) · `src/master.ts` (rules) · centre split in `src/App.tsx`. Rendered in the **middle-bottom** region beneath the middle-top Layout view.
- **Column set (authoritative — nine columns):**

| Column | Content | Primary persona |
|---|---|---|
| Risk rail | severity tick colour + time-to-impact (`T-19d`) | Demand planner |
| Order / commitment | mono id + customer | All |
| Product · qty | family/model + qty + uom | Manufacturing manager |
| Promised | governing date + source tag | Demand planner |
| Capable (+Δ) | earliest ship + delta / conditional | Demand planner |
| Binding constraint | typed chip (⟳ capacity / ▤ material / ⚑ gate) + resource + inline math + secondary count | Manufacturing / Maintenance |
| Feasibility | feasible / infeasible (solver truth) | Manufacturing manager |
| Lifecycle | investigating → monitoring (workflow) | Shift planner |
| Provenance | source dots + conflict count | Shift planner / Maintenance |

- **Per-persona emphasis** — leading columns by lens (`ROLE_POLICY[role].lens`); style only, never hides or reorders data:

| Lens (persona) | Leading columns |
|---|---|
| demand (Demand planner) | Product · qty · Promised · Capable |
| throughput (Manufacturing manager) | Binding constraint · Feasibility |
| availability (Maintenance manager) | Binding constraint · Provenance |
| coverage (Shift planner) | Lifecycle · Provenance |

- **Density & numerals** — collapsed row ≈ two micro-lines; body 13px, metadata 11–12px; ids/dates/quantities mono with tabular figures; quantities and dates right-aligned, text left; hairline row separators, no zebra, no vertical borders; explicit status text + icon (colour supplementary); **frozen identity columns** (Risk rail · order/line · customer/SKU) pinned on horizontal scroll; source badges only where provenance is material or disputed.
- **Expanded row tiers** — **records · rules · derived · conflict · missing**:
  - Records — transaction facts (CRM/ERP/MES; WMS/QMS/FIN attached) with source record id, observed/ingested, freshness.
  - Rules — master references (`§`) with version + effectivity.
  - Derived — (`∑`) result + formula + trace.
  - Conflict — (`⇄`) both source values + disposition; shown, never resolved.
  - Missing — (`∅`) not-established items.
- **Interaction** — select a row to scope the right pane; expand/collapse (click, Enter/Space) for the tiers; focus a cell (binding constraint, provenance, or a source record) to set a stable deep-link `#/commitment/<id>/<cell|record>`; the table never mutates business state.
- **Sorting** — sortable headers: Commitment (by promise), Product · qty, Lifecycle; ascending/descending with `aria-sort`; default order is exception-first (risk, then time-to-impact).
- **Keyboard & a11y** — rows are focusable; ↑/↓ rove rows, Home/End jump, Enter/Space expand/collapse, Esc collapses; `role="table|row|cell|columnheader"`; visible focus ring; colour is never the only channel.
- **Row states** — empty scope (`No orders match the current scope…`), stale source (hollow dot + `◐n`), conflict (`⚠n`), ineligible/allocation via the constraint chip; the shell must never show a zero for a missing/stale value.

---

## 5. Right pane — Chatbot (copilot)

- **Thread header** — Placeholder (commitment · snapshot · run · role · freshness · conflict).
- **Block order (fixed):** Answer → Why → AI explanation → Evidence (facts/calcs/gaps/conflicts) → Options → Recommendation → Next governed action → Approval/Receipt/Outcome.
- **Governed action strip** — Placeholder (labels + enabled/disabled by role policy).
- **Evidence sub-surface** — Placeholder (progressive disclosure under the timeline).
- **Composer** — Placeholder (free text + send).
- **States** — Placeholder (empty/loading/stale/conflict/unauthorized/error).

---

## 6. Top — context bar

- Placeholder. Candidate fields: site · role · active commitment · snapshot + master-set version · as-of · global ask.

---

## 7. Interaction & selection bus

- One active context; one selection at a time; hover previews, click commits.
- Placeholder — the `activeContext` shape and the deep-link id model.
- Placeholder — the event → effect matrix (who updates whom).

---

## 8. States

- Empty · Loading · Stale (transaction) · Superseded (master) · Conflict · Unauthorized · Error · No feasible alternative.
- **Middle-bottom order table (built):** empty scope → explicit "No orders match…" message (never a blank table); stale source → hollow provenance dot + `◐n`; conflict → `⚠n` on the row and the Conflict tier when expanded; superseded master → annotated in the Rules tier; focused cell → `hot` highlight. No zebra striping, no vertical borders, hairline separators.

---

## 9. Visual system

- Type: serif for verdict/titles, sans for body, mono for ids/quantities.
- Numerals: tabular, right-aligned.
- Glyphs: master `§` · transaction `●` · derived `∑` · conflict `⇄` · missing `∅` · stale `◐` · gate `⚑`.
- Colour is semantic and never the only channel.
- Placeholder — density, motion, tone tokens.

---

## 10. Accessibility & keyboard

- Placeholder — focus management, roving rows, `/` filter, `aria-live`, reduced motion, landmarks.
- **Middle-bottom order table (built):** roving rows via ↑/↓, Home/End; Enter/Space expands, Esc collapses; visible focus ring (`outline: 2px` ink, offset −2); sortable columns expose `aria-sort`; the empty state announces via `role="status" aria-live="polite"`.

---

## 11. Component inventory

- Placeholder — list per region (Top · Left · Centre · Right).

---

## 12. Open questions

1. ~~What exactly does the Layout view contain?~~ **Resolved: a plant floor plan (see §3).** ~~Does Z-ELEC fold into Z-CDU?~~ **Resolved: yes — the illustration has no separate electronics cell.** Still open: do all products route through Thermal/Flow + FAT?
2. ~~Final order-table column set and per-role emphasis?~~ **Resolved: the nine-column set with per-lens leading columns (see §4).** Still open: detail-tray vs expand-in-place (currently expand-in-place tiers).
3. Fixed vs resizable panes? [TBC]
4. Evidence surface: drawer vs dedicated half of the right pane? [TBC]

---

## 12.1 Minimalism & density budget (executed 2026-09-27)

The room is **quiet by default**; depth is one click away.

- **Top bar:** one slim line, ≤ 5 tokens (site · role · commitment · as-of · brand); snapshot/master-set/freshness/conflicts/scope live in an **info popover**.
- **Left rail:** at rest **RISK + HORIZON** only; **PRODUCT / FLOW / OWNER** behind “More filters”; chips are quiet text toggles (no fills); “Clear” only when a filter is active; zone chip when a zone is selected.
- **Centre:** the **COOLIT SHOP FLOOR** is the focal object (**≈57% of the centre height**); the order table is **6 columns — Promise · Order · Product · Qty · Constraint · State**, **single-line rows**; all math, capability, feasibility and provenance move to the **expanded row**.
- **Right pane:** at rest — `FORGE` · “Ask about this order” · 3 quick chips · composer + footnote; the **phase stepper is removed**; governed actions live behind **“More actions”**.
- **Roles change defaults, not density** — the 4 personas re-sort the queue and change the FORGE lead question; numbers and columns are identical (C9).

**Verified budgets (in-browser):** top tokens **5** · rail groups at rest **2** (+“More”) · table columns **6** · cells per row **6** · phase stepper **absent** · floor height **≈57%** of centre.

---

## 13. Change log

| Version | Date | Change |
|---|---|---|
| v0.1 | 2026-09-26 | Created UI/UX layout & interaction spec skeleton with placeholders |
| v0.2 | 2026-09-26 | Filled §3 Layout view: plant floor plan (zones, process flow, overlays, interaction); resolved open question 1 |
| v0.3 | 2026-09-26 | Marked §3 Layout view built: the plant floor plan is rendered as the middle-top Layout view (zones, overlays, zone-select filter); floor-plan artifact delivered |
| v0.4 | 2026-09-26 | Filled §4 Order information table: confirmed the nine-column set, per-lens leading columns, density/numerals, frozen identity columns, expanded tiers (records/rules/derived/conflict/missing), and interaction (select, expand, cell focus + deep-link). Marked the table built (`ledger.ts` · `LedgerView.tsx` · `master.ts`) in the middle-bottom region. |
| v0.5 | 2026-09-26 | Completed the order table: sortable headers (Commitment/Product·qty/Lifecycle, `aria-sort`), keyboard roving (↑/↓, Home/End, Enter/Space, Esc), empty/stale/conflict treatments; recorded §8 row-state and §10 keyboard behaviour. |
| v0.6 | 2026-09-26 | Aligned §3 to the shared illustration: dropped the separate **Z-ELEC** zone (electronics fold into **Z-CDU**); noted the built `ZN-*` id scheme; closed the Z-ELEC question in §12 |