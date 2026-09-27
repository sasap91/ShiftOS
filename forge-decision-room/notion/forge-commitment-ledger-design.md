# FORGE Decision Room — Commitment Ledger & Cross-Pane Design

Persona-scoped design for the decision-room surface of FORGE. Focus: the **commitment ledger** and how it links to the **top** context bar, the **left** scope pane, the **centre** truth pane, and the **right** conversation (copilot) pane. This document supersedes the six-column table `Promise | Order | Product | Qty | Constraint | State` and incorporates **master data vs transaction data** as a first-class modelling seam.

**Primary personas (current scope):** Manufacturing Manager · Shift Executive (Supervisor) · Maintenance Manager · Demand Planner.

---

## 0. Summary of the change

Three defects in the current table drive this redesign:

1. **"Promise" collapses three different dates** — CRM *requested*, ERP *promised*, plant *capable* — into one value, hiding the delta that is the decision.
2. **"Constraint" is under-specified** — a bare label with no class, resource id, math, source, or link.
3. **"State" mixes four axes** — risk, workflow lifecycle, solver feasibility, and execution status.

The redesign replaces the six columns with a **two-level commitment ledger** (collapsed triage row + expanded provenance), separates the four state axes, makes **master (reference) data** a visible, versioned layer distinct from **transaction** data, and tunes the default view to each of the four personas.

The invariant that governs everything: **the centre pane is the record; every other pane is a view of a centre record.**

---

## 1. The room: four regions, one active context

| Region | Job | Owns | Never does |
|---|---|---|---|
| **Top — context bar** | Orientation + command | site · role · active commitment · snapshot + master-set version · as-of; global ask | hold data or approvals |
| **Left — scope** | Narrow to one decision | role-scoped filters + ranked decision queue | metric walls, charts, chat |
| **Centre — truth** | The record | shop-floor zones · commitment ledger (CRM/ERP/MES) · decision card | AI prose, recommendations |
| **Right — conversation** | Investigate, compare, prepare action | copilot: evidence, causal chain, options, approval boundary, receipts | be source of truth for a fact or an approval |

### 1.1 One active context

All four regions read from and write to a single serialisable interaction state:

```
activeContext = {
  siteId, role,                 // role drives scope + authorization
  commitmentId,
  runId?,                       // focused DecisionRun (baseline or scenario)
  focusTarget?,                 // addressable cell/record id (deep-link)
  filters: { state[], urgency[], constraintClass[], family[], customerOrProgram[], owner },
  handoverSince?,               // shift view: what changed since HH:MM
  snapshotId, masterSetVersion, asOf
}
```

No pane owns the selection. Any region can set `commitmentId` or `focusTarget`; every region derives its display from `activeContext`. This is what makes the cross-pane linkage deterministic, role-scoped, and refresh-safe.

### 1.2 Deep-link model

Every addressable object has a stable id, so a cell, a record, or a run is directly linkable and survives reload:

```
#/site/YYC-01/commitment/COM-1042/run/DR-COM-1042-R1/record/INV-QD-220
```

The whole screen must rebuild from the run store alone (event-sourced). A shared link opens the same context for a second person with the same role.

---

## 2. Personas and decision rights

Four personas are in scope. Each owns a different slice of the truth and a different decision boundary. The room is the same; the **default scope, ledger emphasis, and authorization** change with the role.

### 2.1 Persona cards

| Persona | Owns | Primary question | Ledger emphasis | Default filters | Master they steward | Decision rights |
|---|---|---|---|---|---|---|
| **Demand Planner** | The customer promise | Which promises are at risk, and what can we tell the customer? | Promised vs Capable, risk rail, customer/program | mine · at-risk · customer I own | item, supplier, commercial rate | initiate re-promise / split; request approval; cannot approve own request |
| **Manufacturing Manager** | Plant feasibility & throughput | What is binding, and what recovers it? | Binding constraint, Feasibility, capacity composition, family | my site · at-risk · capacity | resource, routing, calendar, policy | approve schedule / overtime; set allocation priority (policy-bounded) |
| **Shift Executive (Supervisor)** | The shift | What changed since handover, and what needs escalation? | MES execution, time-to-impact (near), Lifecycle, zone state | my shift · today · my line | calendar / shift (read) | immediate sequencing & escalation; no policy change |
| **Maintenance Manager** | Resource availability | What is down or derated, and when is it restored? | Resource + calendar, downtime events, demonstrated capacity | my resources · derated · downtime | resource calibration, downtime windows | schedule repair / calibration / downtime windows; declare a resource derated |

### 2.2 Why personas force the master/transaction split

Each persona's question is answered by a different data class:

- **Demand Planner** reads **transaction** demand (CRM/ERP) against **master** item/BOM/supplier/commercial definitions.
- **Manufacturing Manager** reads **master** resource + routing + calendar + policy applied to **transaction** load — this is precisely the binding-constraint composition.
- **Shift Executive** reads the fastest **transaction** layer (MES) against master calendars, and needs the **handover delta**.
- **Maintenance Manager** *stewards* the **master** resource/calibration data and reacts to **transaction** downtime events such as `EVT-LT-041` (RES-LT-01 at half rate, 6–14 Oct).

### 2.3 How each persona uses each region

| Persona | Top | Left | Centre | Right |
|---|---|---|---|---|
| Demand Planner | role = planner; active commitment | filter by customer/program/urgency | Promised vs Capable, options preview | draft customer comms; request re-promise |
| Manufacturing Manager | role = mfg; snapshot + master set | filter by capacity class/family | constraint composition + zone map | compare recovery options; approve overtime |
| Shift Executive | role = shift; `as-of` + handover time | filter `today` / `my line` / `changed since` | live MES execution + zone state | escalate; record immediate actions |
| Maintenance Manager | role = maintenance; master-set chip | filter derated resources / downtime | resource + calendar state; downtime events | schedule repair; adjust capacity window |

### 2.4 Role and authorization

- The role switcher lives in the top bar and re-scopes every pane.
- Filter defaults are **per role** (e.g. Shift Executive opens on `today · my line`), reset on demand.
- Approval affordances appear only for the acting role and only where the policy matrix grants them. The requester cannot approve their own request.
- Current prototype roles (`supply-planner`, `operations-leader`, `quality-manager`, `program-manager`, `finance-controller`, `procurement-manager`) map to these personas as: Demand Planner ≈ supply-planner + program-manager; Manufacturing Manager ≈ operations-leader; Shift Executive ≈ a new shift-scoped operations role; Maintenance Manager ≈ a new resource-steward role.

---

## 3. Data foundation: master, transaction, derived, conflict

The ledger only works if the four data classes are never blurred.

| Class | Glyph | Nature | Changes | Correct axis | Examples in the CoolIT fixture |
|---|---|---|---|---|---|
| **Reference / master** | `§` | Slow, shared, defines entities and rules | By change control only | **validity / effectivity** (current · effective-from · superseded) | item master, BOM (×2 ratio), routing, customer + supplier masters, approved substitute group (AVL), test-stand + calendar + crew-certification masters, rate card, hard-gate policy (held ≠ eligible), approval matrix |
| **Transaction** | `●` | Fast, per-event, timestamped | Constantly | **freshness** (fresh · stale) + observed/ingested | CRM order, ERP inventory count / PO / peg, MES work order / downtime event / quality hold, approvals, receipts, outcomes |
| **Derived / calculated** | `∑` | Computed at as-of from master + transaction | Per snapshot | reproducibility (formula + trace id) | eligible supply, allocated tests, shortfall, earliest ship, feasibility |
| **Conflict / missing** | `⇄` `∅` | A relationship between records, or an absence | — | disposition | ERP 240 ⇄ WMS 236 (quarantined); missing split-ship waiver |

### 3.1 Two orthogonal axes — never mixed

- **Transaction data is stamped with time** (observed-at, ingested-at, freshness).
- **Master data is stamped with version and effectivity** (version, effective-from, current / superseded / not-yet-effective).

A rate card is not "stale"; it is a *versioned estimate* that is current or superseded. Applying a freshness dot to master data is a category error.

### 3.2 Master reference set (proposed)

| Master | Key fields | Steward persona | Used by |
|---|---|---|---|
| Item / product master | code, family, uom | Demand Planner | Product cell |
| BOM / configuration | parent, component, qty-per, effectivity | Demand Planner | Material ladder, constraint composition |
| Routing | product → operations → resources | Manufacturing Manager | Feasibility, zone linkage |
| Resource master | resource id, qualified products/configurations, demonstrated capacity, changeover, calibration | Maintenance Manager | Capacity constraints; zone map |
| Calendar / shift master | working days, shifts, rates, downtime windows | Manufacturing Manager / Maintenance | Capacity composition; shift view |
| Sourcing master (AVL / substitute group) | approved sources, substitution eligibility | Demand Planner | Eligibility, options |
| Party masters | customer, supplier | Demand Planner | Order cell, supplier commit constraint |
| Commercial master | rate cards, finance thresholds | Demand Planner / Finance | Cost of options; approval routing |
| Policy master | eligibility gates, approval matrix, writeback rules | Manufacturing Manager | Hard gates; approvals |

### 3.3 The semantic ladder (transaction quantity)

`ordered → planned → eligible → allocated → committed → tested → shipped`. Each rung carries a unit and a source. Held / MRB pieces sit in a ghosted **excluded** stack and never appear in `eligible`. COM-1042: governed eligible material is 280 pcs ÷ 2 = 140 loop-equivalents (material is **not** binding); leak tests allocate 56 of 120 (capacity **is** binding).

---

## 4. The commitment ledger

**Component:** a dense ledger table with a pinned commitment-id rail and two-level rows. Not cards, not a flat list. The ledger's job is cross-commitment comparison of date, quantity, and constraint — that requires a shared column baseline. Cards are reserved for the *decision card* in the centre.

### 4.1 Collapsed column set

`[risk rail] · Commitment · Product · Qty (on-time/total) · Promised · Capable (+Δ) · Binding constraint · Feasibility · Lifecycle · Provenance`

| Column | Content and rules | Primary persona |
|---|---|---|
| **risk rail** | 3px severity tick + time-to-impact token (`T-19d`, `+4d`). Colour + glyph. | Demand Planner |
| **Commitment** | mono id + customer. The row's identity; the pinned rail. | all |
| **Product** | `family · model` — family drives which resource pool applies. | Manufacturing Manager |
| **Qty** | int + uom + on-time/total split (`120 loops · 56 on time / 64 late`). Right-aligned, tabular figures. | all |
| **Promised** | ERP governing date + source tag. Never blended with requested/capable. | Demand Planner |
| **Capable** | earliest full ship + delta (`19 Oct · +4d`). Conditional when a rule is pending (`15 Oct if MV-14B approved`). | Demand Planner / Mfg |
| **Binding constraint** | typed chip: `⟳ capacity` / `▤ material` / `⚑ gate`, naming the record and carrying inline math (`56/120 · short 64`), with `+n` secondaries. Click → pegging + rule composition. | Manufacturing Manager / Maintenance |
| **Feasibility** | solver truth: feasible / infeasible. Never merged with lifecycle. | Manufacturing Manager |
| **Lifecycle** | investigating · awaiting-approval · approved · executing · monitoring. The only column an action mutates. | Shift Executive |
| **Provenance** | `●CRM ●ERP ●MES ⚠1` — dots (filled fresh / hollow stale) + conflict count. | Shift Executive / Maintenance |

### 4.2 The constraint chip — composition and class

A binding constraint is **always master rules applied to transaction load**:

- `⟳ Leak-test capacity` = calendar master (6 healthy / 7 degraded days) × resource + rate master (32/day at half rate) − transaction load (frozen 200 + COM-1104 48) → short 64.
- `▤ MV-14 supplier commit` = item/BOM master (×1) × supplier master vs transaction on-hand 12 + PO commit 20 Oct.
- `⚑` hard gates (frozen horizon, unapproved source, held lot) outrank capacity and material and cannot be dismissed.

Clicking the chip opens both the rule composition and the pegging chain.

### 4.3 Collapsed wireframe — COM-1042

```
┌──┬──────────────┬─────────────────────┬────────────┬────────────┬──────────────────────────────────┬───────────┬───────────────┬───────────┐
│  │ COMMITMENT   │ PRODUCT · QTY       │ PROMISED   │ CAPABLE    │ BINDING CONSTRAINT               │ FEASIBLE  │ LIFECYCLE     │ PROVENANCE│
├──┼──────────────┼─────────────────────┼────────────┼────────────┼──────────────────────────────────┼───────────┼───────────────┼───────────┤
│▐ │ COM-1042     │ CPL-480             │ 15 Oct 26  │ 19 Oct 26  │ ⟳ Leak-test · RES-LT-01   +2     │ ✗ no      │ investigating │ ●CRM ●ERP │
│▐ │ Northline    │ Cold-plate · 120 lp │  Wed       │  +4d       │   ▓▓▓▓▓▓▓░░░░░ 56/120 · −64      │infeasible │               │ ●MES  ⚠1  │
└──┴──────────────┴─────────────────────┴────────────┴────────────┴──────────────────────────────────┴───────────┴───────────────┴───────────┘
```

### 4.4 Expanded row — four tiers

```
 ▼ COM-1042 · CPL-480 ×120 · Northline Compute · NL-ORION
 ┌ RECORDS (transaction · timestamped) ────────────────────────────────────────────────┐
 │ CRM  COM-1042           120 loops · promised 15 Oct        20 Sep 11:00 · ● fresh    │
 │ ERP  PEG-FROZEN-200     200 tests peg                      26 Sep 06:40 · ● fresh    │
 │ ERP  INV-QD-220         240 pcs ┐                          26 Sep 08:01 · ● fresh    │
 │ WMS  WMS-QD-220         236 pcs ┘ CONFLICT                 26 Sep 08:04 · ● fresh    │
 │ ERP  PO-4481            80 pcs on 8 Oct                    26 Sep 07:30 · ● fresh    │
 │ MES  EVT-LT-041         half-rate 6–14 Oct                 26 Sep 08:10 · ● fresh    │
 ├ RULES (master · versioned / effectivity) ───────────────────────────────────────────┤
 │ § BOM       CPL-480 → QD-220 ×2            v4  · effective 12 Aug 26 · current       │
 │ § SOURCING  QD-220 approved sources        AVL-3 · effective 02 Sep 26 · current      │
 │ § RESOURCE  RES-LT-01  32 tests/day        RM-11 · effective 01 Jul 26 · current      │
 │ § CALENDAR  6 healthy / 7 degraded days    CAL-26W39 · current                        │
 │ § POLICY    held supply not eligible       POL-ELIG v2 · current                      │
 │ § RATE      leak-test OT 92 CAD/h ×1.5     FIN-RATE-OT-LT v1 · effective 01 Sep 26   │
 ├ DERIVED (∑ · formula + trace) ──────────────────────────────────────────────────────┤
 │ ∑ ELIGIBLE   min(240,236) − 36 held + 80 inbound = 280 pcs (140 loop-equiv)          │
 │ ∑ ALLOCATED  304 cap − 200 frozen − 48 COM-1104 = 56 tests      SHORTFALL 64         │
 ├ ⇄ CONFLICT  ERP 240 ⇄ WMS 236 → 4 quarantined (disposition: quarantined)             │
 │ ◐ STALE     none                                        ∅ MISSING split-ship waiver  │
 └──────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.5 Fixture walkthrough

| Commitment | Product · Qty | Promised → Capable | Binding constraint | Feasibility | Lifecycle | Master in play |
|---|---|---|---|---|---|---|
| COM-1042 | CPL-480 · 120 loops | 15 Oct → 19 Oct (+4d) | ⟳ Leak-test capacity, 56/120, short 64 | infeasible | investigating | BOM ×2, calendar, resource, rate, eligibility policy |
| COM-1018 | RM-42 · 80 manifolds | 15 Oct → 15 Oct (conditional) | ▤ MV-14 supplier commit | infeasible | awaiting-approval | BOM ×1, supplier master, AVL (MV-14B) |
| COM-1104 | CDU-2400 · 24 CDUs | 10 Oct → 10 Oct | — none | feasible | approved | BOM (2 tests/unit), frozen-peg policy |
| COM-0991 | CPL-320 · 40 loops | 6 Nov → 6 Nov | — none | feasible | monitoring | item master, supplier master |

---

## 5. State model: four axes, never one column

| Axis | Question | Values | UI location |
|---|---|---|---|
| **Solver feasibility** | Can we hit the promise as-is? | feasible / infeasible | `Feasibility` column; immutable per run |
| **Risk / urgency** | How loud is this? | critical · at-risk · watch · ok + time-to-impact | risk rail (colour + glyph + `T-±d`) |
| **Lifecycle / workflow** | Where is the decision? | investigating · awaiting-approval · approved · executing · monitoring | `Lifecycle` column |
| **Master validity** | Is the rule in force? | current · effective-from · superseded by vN | RULES tier; `§` popover |

`at-risk` lives on the rail; `awaiting-approval` lives in Lifecycle. The same row shows both without ambiguity. Master validity is rendered in plain ink when current and in an annotated amber-grey when superseded / not-yet-effective — never the same treatment as a stale transaction.

---

## 6. Visual system

- **Type:** serif (`Source Serif 4`) for the verdict and pane titles only; sans (`Source Sans 3`) for body, labels, lifecycle words; mono (`IBM Plex Mono`) for ids, resource codes, record ids, dates, quantities, deltas.
- **Numerals:** all figures `font-variant-numeric: tabular-nums`; numbers and dates right-aligned; text left-aligned; never centre numeric columns.
- **Glyph vocabulary:** `§` master · `●` transaction · `∑` derived · `⇄` conflict · `∅` missing · `◐` stale · `⚑` policy gate.
- **Colour is semantic and never the only channel:** risk red · awaiting amber · ok green · watch blue · calc/fact tones. Every state also carries a glyph, a word, and a weight so it survives greyscale, colour-blindness, and forced-colors.
- **Density:** collapsed row ~36px, expanded +80–110px; body 13px, meta 11–12px; hairline row rules; no zebra; sticky header and sticky risk rail.
- **Motion:** only progress steps and pane transitions; respect `prefers-reduced-motion`.

---

## 7. Cross-pane linkage (the core contract)

One active context, four views. The linkage is a **selection bus** plus a **deep-link/id model**, not ad-hoc event wiring.

### 7.1 TOP — global context bar

```
YYC-01 · Supply Planner · COM-1042 · SNAP-20260926-0815 · BM-v4 · AVL-3 · rate v1 · as of 08:15
```

- Publishes `siteId`, `role`, `commitmentId`, `snapshotId`, `masterSetVersion`, `asOf`.
- **Publishes the master-set version**, not just the snapshot — an engineering change is visible without drilling.
- Role switcher re-scopes authorization for every pane and sets role filter defaults.
- Snapshot and master-set are clickable → open in centre. If `execution_relevance_hash` drifts from what an approval assumed, the bar turns amber and says so — never a silent refresh.
- Hosts a global **Ask** that focuses the right pane's composer, pre-seeded with the active message. Top → right is explicit.

### 7.2 LEFT — scope

- Filters: state · urgency · constraint class (capacity / material / gate / quality / engineering) · family · customer or program · owner · **changed since (shift handover)**.
- Queue rows are exactly four tokens: `id · family/qty · time-to-impact · binding constraint`. Lifecycle colour comes from the risk rail; there is no separate state column.
- Clicking a queue row sets `activeContext.commitmentId` → the ledger selects and scrolls to that row, and the right pane re-scopes its context header.
- Selecting a shop-floor zone filters the queue and ledger to decisions bound by that resource ("what breaks if 4B slips?").
- Count appears once, in the header, for the active filter set; zero results is an explicit state ("No decisions match. Clear 2 filters."), never an empty rail.

### 7.3 CENTRE — truth (the ledger)

- Selecting a row sets `activeContext.commitmentId` and expands the row; the left queue row gains its selected state and scrolls into view.
- Clicking a **cell** sets `focusTarget`. Rules:
  - constraint chip → opens the rule composition + pegging in the right pane;
  - provenance lane / source record → opens the fact, freshness, and lineage in the right pane;
  - a `§` master reference → opens the master version + effectivity in the right pane;
  - id, product, or trace codes → expose a stable id for deep-linking.
- The centre is the only source of truth: the right pane may visualise a centre record, but if a value is not in the centre it is not real.

### 7.4 RIGHT — conversation (copilot)

- Sticky context header mirrors the top bar: `COM-1042 · SNAP-… · scenario DR-… · Supply planner`. The copilot never answers out of context.
- Block order is fixed: Answer → Why → AI explanation → Source facts / calculations → Options → Recommendation → Next governed action → Approval / Receipt.
- **Every right-pane block cites a centre object** (fact id, calc id, master version, run id, approval id, receipt id). Clicking a citation opens and highlights the corresponding ledger cell or evidence record.
- The pane ends at **prepare approval**; execution is a separate receipt-backed step (Dry run → Simulate writeback → Receipt). A chat confirmation is never a receipt.
- Solver runs are **durable cards**, not spinners: phase · elapsed · snapshot/model version · incumbent · validated alternatives · optimality gap only when meaningful · freshness. "Timed out without a solution" is never rendered as "infeasible."

### 7.5 Event → effect matrix

| User event | Source | TOP | LEFT | CENTRE | RIGHT |
|---|---|---|---|---|---|
| Click queue row | LEFT | commitmentId updates | row selected | ledger scrolls + selects + expands | context header rewrites; thread scopes |
| Click ledger row | CENTRE | commitmentId updates | queue row selected + scrolled | row expands | context header rewrites |
| Click constraint chip | CENTRE | — | peg commitments highlighted | chip focused | pegging + rule composition opened |
| Click master ref `§` | CENTRE | master-set chip pulses | — | master cell focused | master version + effectivity opened |
| Click provenance lane | CENTRE | — | — | record focused | evidence record hot + trace popover |
| Ask about a cell | CENTRE | — | — | cell focused | composer seeded; answer cites the cell |
| Zone select | CENTRE floor | — | queue filtered to bound decisions | zone highlighted | scoped to resource |
| Change role | TOP | role + authorization update | filter defaults + queue re-rank | lifecycle edit affordances change | approver rows enable/disable |
| Change snapshot | TOP | amber if hash drift | queue re-ranks | every cell re-resolves | run staleness banner |
| Run scenario | RIGHT | scenario token in bar | queue state recomputes | Capable + constraint update | durable run card |
| Record approval | RIGHT | — | queue state changes | lifecycle updates | approval card updates |
| Dry run / writeback | RIGHT | — | queue → approved | lifecycle → executing | receipt block |
| Record outcome | RIGHT | — | queue → monitoring | lifecycle → monitoring; outcome row | outcome block |
| Shift: set handover time | TOP | `handoverSince` updates | queue shows changed-since delta | changed cells flagged | handover summary thread |

### 7.6 Interaction rules

- One selection at a time; hover previews, click commits.
- Keyboard: ↑/↓ rove rows, Enter expands, Esc collapses, `/` filters, focused row scrolls every pane.
- Selection survives reload via the deep-link id.
- No pane may mutate another pane's source data — only the selection/focus, and only the governed actions may mutate the run store.

---

## 8. Empty, stale, conflict, and error states

- **Empty:** explicit text + clear-filters link; never a blank rail or table. No illustration.
- **Loading:** static skeleton lines at true row rhythm; optional 1.2s opacity pulse only under `prefers-reduced-motion: no-preference`. No spinners presented as decisions.
- **Stale (transaction):** per-fact `as of HH:MM` + hollow dot; a stale or missing policy fact renders `∅ not established` (never `0`), and no row may read "approved" over an unresolved conflict.
- **Superseded (master):** annotated version state in the RULES tier; a run whose master version is no longer effective goes amber and can be re-run as v2 with a diff.
- **Conflict:** a dedicated conflict row beneath its commitment, both values shown, disposition verbatim (`quarantined`), never auto-resolved.
- **Error:** a failed source renders inline (`ERP unreachable · last sync 12:40`), never hidden; a pane-level ruled banner appears when more than one source is down.

---

## 9. Component inventory

Top: `ContextBar` · `RoleSwitcher` · `SnapshotChip` · `MasterSetChip` · `HandoverClock` · `GlobalAsk`.
Left: `FilterRail` · `QueueRow` · `SeverityTick` · `QueueGroupHeader`.
Centre: `ShopFloorZone` · `LedgerTable` · `CommitmentRow` · `PromiseCell` · `CapableCell` · `QtyLadder` · `ExcludedStack` · `ConstraintChip` · `CapacityDelta` · `StateBadge` · `ProvenanceRibbon` · `ProvenanceLedger` · `LaneRow` · `FactLine` · `RulesTier` · `MasterRef` · `DerivedRow` · `ConflictRow` · `MissingRow` · `DecisionCard`.
Right: `ThreadHeader` · `BlockShell` · `Options` · `ApprovalCard` · `ApprovalDraft` · `RunCard` · `ReceiptBlock` · `OutcomeBlock` · `OverrideForm` · `Evidence` · `TracePopover`.

### 9.1 File / state map

| Concern | Lives in | Change |
|---|---|---|
| Reference (master) data | `master.ts` (new) | versioned, effective-dated sets; stewards |
| Truth (inventory, capacity, dates, feasibility) | `model.ts` | cite master by id; run lifecycle fields; conflicts |
| Interpretation, governed actions, blocks | `orchestrator.ts` | persona-scoped intents; selection bus; deepen citations |
| Layout / linkage | `App.tsx` | top bar + left scope + centre ledger + right conversation |
| Look | `styles.css` | ledger, glyphs, master/transaction tones, a11y |
| Invariants | `verify.ts` | assertions in §10 |

---

## 10. Invariants and acceptance criteria

1. A `TIME_LIMIT_*` state never renders the word "infeasible."
2. A `STALE` / hard-invalid run can never have an approved, executable option.
3. Held / expired / unqualified lots contribute zero eligible supply in every ledger and option.
4. Every fact, calculation, and receipt carries source + timestamp (+ unit / trace id).
5. Approval alone never yields an executed state; a receipt is required.
6. The same `(snapshot_hash, master_set_version, model_version)` reproduces the same run output.
7. No recommendation without a named owner and approver list.
8. A master reference may be cited only if its effectivity window covers the snapshot's as-of.
9. Conflicts are shown with both records and a disposition; never auto-resolved.
10. Every ledger cell resolves to a record id or a master version; there are no orphan numbers.
11. Cross-pane selection is deterministic: the same `(activeContext, role)` renders the same four panes.
12. Role scoping is enforced in the data layer, not the view: a role cannot see or approve beyond its scope.

---

## 11. Open questions

1. Does the centre floor show one plant (single-site) or a site switcher? Recommend single-site now, multi-plant later.
2. Run card placement: pinned top of the right pane plus a compact inline reference (recommended), vs inline only.
3. Filter persistence: per role, reset on demand (recommended).
4. Is "awaiting me" a filter or a default sort? A filter — it is a decision, not decoration.
5. Master set: separate versioned store with effectivity windows (recommended for the engineering-change flow) vs inline reference table.
6. Shift handover: is `changed since HH:MM` a top-bar control (recommended) or a filter in the left rail?
7. Maintenance view: does the resource/derating surface live in the centre floor, as a filter on the ledger, or both?