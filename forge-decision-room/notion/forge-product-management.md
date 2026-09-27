# FORGE Decision Room — Product Management

> The centre pane is the record; every other pane is a view of a centre record. This page is the product-management hub for FORGE Decision Room: status, roadmap, decisions, risks, personas, and delivery. It links out to the authoritative design docs; it does not replace them.

| Field | Value |
|---|---|
| Document | FORGE Decision Room — Product Management |
| Version | v0.13 (v3.2 contract runs) |
| Status | 🟡 Active — full doc set published; build/data status corrected; floor render flagged pending |
| Product owner | FORGE Product Management (this page) |
| Engineering owner | Backend / API |
| Design / UX owner | Frontend / UX |
| Data owner | Backend / API + Data modelling |
| Reasoning owner | AI / reasoning |
| Commercial owner | Business / pitch |
| Current phase | M0 — Integrity (planned, not started) |
| Snapshot under review | SNAP-20260926-0815 · as-of 2026-09-26T08:15:00-06:00 |
| Host product | UNIFIDE Commit Evidence Copilot — Glasswing Hackathon |
| Last updated | 2026-09-26 |

Owner functions are taken from the Hackathon Plan's **Team Plan** (Frontend/UX · Backend/API · AI/reasoning · Business/pitch). Individual names are not recorded in Notion and remain `[TBC]`.

---

## 0. How to use this page

- **Section 1–2** are the current product description and status; review at every milestone gate.
- **Section 3** is the single dated roadmap; milestone exit criteria are the definition of done.
- **Section 4–5** hold the defect register and the decision log; nothing ships without a decision row.
- **Section 12** is the document map (registers, design docs, authoritative docs). If this page and a design doc disagree, the design doc wins.
- Anything still marked `[TBC]` is intentionally unfilled and must be completed before the relevant gate.

---

## 1. Product overview

**Vision**
> Every constrained customer commitment in a FORGE plant is decided on a complete, governed record — one snapshot, one ledger, four roles — and every decision ends in an evidence-backed receipt, never a guess.

**Problem it solves**
- Constrained commitment changes (pull-ins, allocations, promise changes) are approved on fragmented evidence spread across CRM, ERP, MES, quality and maintenance.
- The same snapshot is read differently by four roles, so nobody can show the binding math, the authority, or the outcome in one place.
- Today, a promise can be declared feasible on a non-working day, an option can be approved that violates a hard gate, and an accepted action can be mistaken for a successful outcome.

**What it is / is not**
- **Is:** a role-scoped decision room where the centre pane is the governed record and the right pane is a copilot that can explain, compare, and prepare governed actions.
- **Is not:** a source of truth for a fact; a system that writes directly to ERP/CRM/MES; a solver that guarantees feasibility or "best" by itself.
- **Deployment posture:** read-only diagnostic first; human approval always required; missing evidence is explicit, never inferred.

**North-star metric (recommended — pending decision Q-07)**
> Share of at-risk commitments resolved with a **complete, receipt-backed decision within one snapshot**.

Rationale: FORGE's differentiator is governance — a decision that survives an audit — not raw solver speed. A north-star that counts *complete* and *receipt-backed* decisions forces the ledger, evidence, authority and receipt chain to work together.

Supporting / pitch candidates (from the Hackathon Plan's open question): planner decision time (hours → minutes) · revenue protected · fewer commitments approved without complete evidence.

### 1.1 Basic UI/UX layout (four panes)

The room is one screen with four regions. Nothing lives outside them.

| Region | Position | Contents |
|---|---|---|
| **Left** | full height | Filtering · general attributes · planner-specific or overall info |
| **Middle · top** | upper half of centre | **Layout** — the visual / spatial view |
| **Middle · bottom** | lower half of centre | **Order-related information** — tabular (rows × columns) |
| **Right** | full height | **Chatbot** — the copilot conversation |

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

**Region jobs**

| Region | Job | Owns | Never does |
|---|---|---|---|
| Left | Narrow scope + orient | filters; general attributes; planner-specific or overall summary | hold the record or approvals |
| Middle · top | Show the spatial picture | the Layout view — the **plant floor plan** | be the source of a fact |
| Middle · bottom | Compare orders at a glance | the order information table (dense, aligned columns) | carry AI prose; carry the copilot |
| Right | Investigate + prepare action | the chatbot conversation, evidence, options, governed actions | be the source of a fact or an approval |

**Alignment with the design docs.** This maps onto the regions already agreed in `forge-commitment-ledger-design.md` §1: Left ≈ **scope**; Middle · top ≈ the centre's **layout / zone** view; Middle · bottom ≈ the centre's **commitment ledger** (the order table); Right ≈ the **conversation** pane, with evidence as a sub-surface of the right pane.

**Placeholders — to define before M1**

- Left: exact filter set (state · urgency · constraint class · family · customer/program · owner), the general attributes list, and what "planner-specific vs overall" toggles.
- Middle · top "Layout": **resolved — a plant floor plan** (the single-site YYC-01 process map, left→right in material-flow order; full spec in the UI/UX Layout & Interaction Spec §3). **Status: the Layout pane is built** (four-region layout in `App.tsx`); the floor-plan **SVG render is pending (UT-02)** — the pane currently shows a placeholder.
- Middle · bottom: the exact order-table columns (candidate: risk rail · order/commitment · product · qty · promised · capable · binding constraint · feasibility · lifecycle · provenance) and per-role column emphasis. **Status: the nine-column order table is built** (`ledger.ts` · `LedgerView.tsx`).
- Right: chatbot block order, governed action strip, and evidence sub-surface behaviour.

### 1.2 Layout delta vs the current app

The current build does **not** yet match the target layout. This is the change list for M1/M6 UI work.

| Region | Current app | Target layout | Gap |
|---|---|---|---|
| Left | Decision queue grouped by lifecycle | Filtering + general attributes + planner/overall info | add filters + attribute panel; keep the queue |
| Middle · top | Layout view (plant floor plan) | Layout view | ✅ built |
| Middle · bottom | Ledger OR conversation (toggled) | Order information table | remove the conversation toggle; keep the table always visible |
| Right | Evidence drawer | Chatbot | move chat from centre to right; demote evidence to a right-pane sub-surface |
| Top | Mast + context bar | Context bar (site · role · commitment · snapshot · master set · as-of) | unchanged |

> Net effect: the conversation moves from the centre to the right; the centre becomes a vertical split (Layout over the order table); the left pane gains filtering and attribute/summary content.

---

## 2. Current status

**One-line status**
> **M0 decision-memory slice, the deterministic solver lane and the server AI control plane are shipped**; the four-region UI (left queue · centre Layout + order table · right copilot) is built. The **v3.1 data pack (174 datasets · 41,288 rows) and AIB v1 are ready but not yet wired into `src`/`server`**, and the **floor-plan SVG render is pending (UT-02)**. `verify` / `verify:server` / `verify:tools` / `verify:ai` + build are green.

**Workstream status**

| Workstream | Scope | State | Evidence / notes | Owner (function) |
|---|---|---|---|---|
| W1 — CRM demand layer | requested → promised → capable | Not started | no `requestedDate` in model (D-01) | Backend / API + Data |
| W2 — MES execution & handover | work orders, handover, certs | Not started | no MES entities (D-15) | Backend / API + Data |
| W3 — Maintenance (EAM/CMMS) | root cause, restoration, windows | Not started | no EAM entities (D-16) | Backend / API + Data |
| W4 — Shop floor / routing | zones, resources, routing, floor view | Partial | four-region layout + middle-top Layout pane built; **floor SVG render pending (UT-02)**; zone/routing masters pending (D-04…D-07) | Frontend / UX + Data |
| W5 — Capacity & dates | ship calendar, time-phased allocation | Not started | promise not validated (D-05) | Backend / API + AI / reasoning |
| W6 — Governance | authorities, disclosure, role lens | Partial | authority typed but not enforced (D-08, N-02, N-03, N-04) | Backend / API + Frontend / UX |
| W7 — Defect remediation | clear the register | Not started | see §4 | Backend / API |
| W8 — Verification & lint | machine-checked invariants | Not started | verify covers baseline only (D-24) | Backend / API (verification) |

**Readiness scores (current → target)**
Current values are the assessment in §1.1 of the COOLIT Data Improvement Plan; targets are the plan's. Open-defect count is the **reconciled** figure (§4), not the plan's summary figure (see the note below §4).

| Persona / surface | Current | Target |
|---|---|---|
| Manufacturing manager | 85% | 100% |
| Shift executive / planner | 25% | 95% |
| Maintenance manager | 30% | 95% |
| Demand planner | 45% | 95% |
| Shop-floor alignment | 0% | 100% |
| Open defects (reconciled) | 25 | 0 |
| Open P0 defects | 10 | 0 |

---

## 3. Roadmap & milestones

> Dates are the working plan for a single shared squad, starting Mon 2026-09-28. Ideal engineering effort is from the COOLIT plan. Update the Status column at each gate.

| Milestone | Contents | Owner (function) | Ideal effort | Window | Status |
|---|---|---|---|---|---|
| M0 — Integrity | W7 defects + W8 lint skeleton | Backend / API | 2–3 d | 28–30 Sep | ☐ Not started |
| M1 — Floor foundation | W4 zones/resources/routing + ZoneView | Frontend / UX + Data | 4–5 d | 1–7 Oct | ◐ In progress (four-pane + Layout pane built; **floor SVG render + zone/routing masters pending**) |
| M2 — Demand seam | W1 CRM requested layer | Backend / API + Data | 2–3 d | 1–5 Oct | ☐ Not started |
| M3 — Execution seam | W2 work orders/handover | Backend / API + Data | 4–5 d | 8–14 Oct | ☐ Not started |
| M4 — Availability seam | W3 EAM + window alternatives | Backend / API + Data | 4–5 d | 8–14 Oct | ☐ Not started |
| M5 — Capacity rigour | W5 ship calendar + time-phased allocation | Backend / API + AI / reasoning | 3–4 d | 8–13 Oct | ☐ Not started |
| M6 — Governance | W6 authorities/disclosure/lens | Backend / API + Frontend / UX | 4–5 d | 15–21 Oct | ☐ Not started |
| M7 — Assurance | W8 full verification + acceptance | Backend / API (verification) | 2–3 d | 22–24 Oct | ☐ Not started |

**Critical path:** M0 → M1 → { M3, M4, M5 } → M6 → M7. M2 is off the floor critical path but is an M6 input.

**Milestone exit criteria**
- **M0:** every referenced id resolves; `constraintClass` + `constraintShortfall` replace `shortfall` (aliases kept); correct units in the ladder; extra stale + source-down examples; seeded COM-1104 routed through the gateway or labelled pre-seeded; run-hash contract versioned.
- **M1:** every commitment resolves to a routing → zone chain; every resource in exactly one zone; zone-select filters queue + ledger and re-scopes the right pane; `verify` asserts routing completeness and resource→zone uniqueness.
- **M2:** ledger shows a requested → promised → capable triple; demand-planner queue sorts by promise delta; delta arithmetic asserted.
- **M3:** shift opens on today · my line; handover delta computable; expiring cert raises a coverage gate; WO quantities reconcile with pegs.
- **M4:** maintenance queue opens on derated resources by restoration time; window change approved as a window; restoration evidence-backed; PM/calibration gate asserted.
- **M5:** no promise lands on a non-working day unnoticed; allocation day-binned and reproducible; COM-1018 date derived; day-bin totals sum to the window total.
- **M6:** persona acceptance items 1, 2, 5, 8 pass; no single role satisfies a cross-authority requirement; redaction asserted before prompt construction; queue default-sorts per lens.
- **M7:** `verify` covers every W1–W7 acceptance criterion; a single dangling reference fails the build; all P0 defects closed.

---

## 4. Defect & risk register

The authoritative register is **§5 of the COOLIT Data Improvement Plan** (see §12). This table is the PM roll-up. Current reconciled state: **18 Open · 3 Partial · 1 Open-by-design · 3 Closed** (25 defects). The three closed defects (D-03, D-21, D-24) plus finding **N-07** landed in the M0 decision-memory slice (`src/memory.ts`, `src/master.ts`, `src/verify.ts`; model `ctp-0.3.0`). The plan's own summary says "13 defects"; the register lists 25 — the register is authoritative and this discrepancy is logged in §5.

| ID | Severity | Priority | Summary | State | Owner (function) | Target milestone |
|---|---|---|---|---|---|---|
| D-01 | S2 | P0 | No CRM requested date | Open | Backend / API | M2 |
| D-02 | S1 | P0 | No maintenance alternatives | Open | Backend / API | M4 |
| D-03 | S1 | P0 | Dangling `OPT-RESERVE-SLOTS` | ✅ Closed (M0) | Backend / API | M0 |
| D-04 | S2 | P0 | `shortfall` overloaded | Open | Backend / API | M0 |
| D-05 | S2 | P0 | Promise on a non-working day declared feasible | Open | Backend / API | M5 |
| D-06 | S2 | P1 | Hard-coded COM-1018 ship date | Open | Backend / API | M5 |
| D-07 | S1 | P0 | Routing master empty | Open | Data modelling | M1 |
| D-08 | S2 | P0 | Authority collapsed into one approver | Partial | Backend / API | M6 |
| D-09 | S3 | P1 | Role naming / ownership drift | Partial | Frontend / UX | M6 |
| D-10 | S2 | P1 | No disclosure / redaction | Open | Backend / API | M6 |
| D-11 | S2 | P1 | Queue not role-lensed | Open | Frontend / UX | M6 |
| D-12 | S3 | P2 | November demand invisible | Open | Backend / API | M5 |
| D-13 | S4 | P2 | Unit mismatch in ledger | Open | Frontend / UX | M0 |
| D-14 | S1 | P0 | No shop-floor layout | Open | Frontend / UX | M1 |
| D-15 | S1 | P0 | MES execution / handover absent | Open | Backend / API | M3 |
| D-16 | S1 | P0 | Maintenance record thin | Open | Backend / API | M4 |
| D-17 | S2 | P1 | No ship calendar | Open | Backend / API | M5 |
| D-18 | S2 | P1 | Allocation not time-phased | Open | AI / reasoning | M5 |
| D-19 | S3 | P2 | Recovery rate ignores competition | Open | AI / reasoning | M5 |
| D-20 | S3 | P2 | No commercial value | Open | Backend / API | M2 |
| D-21 | S4 | P2 | Thin stale / missing examples | ✅ Closed (M0) | Backend / API | M0 |
| D-22 | S4 | P2 | Single-site assumption | Open by design | Product Management | Q-01 |
| D-23 | S3 | P1 | Seeded approval bypasses dry-run gate | Partial | Backend / API | M0 |
| D-24 | S4 | P2 | Test envelope hard-codes freshness | ✅ Closed (M0) | Backend / API (verification) | M0 |
| D-25 | S3 | P2 | No human-override capture | Open | Backend / API | M6 |
| N-01 | S1 | P0 | A test asserts the Saturday-promise defect | Open | Backend / API (verification) | M5 |
| N-02 | S2 | P0 | `canPropose` unenforced on the request path | Open | Backend / API | M6 |
| N-03 | S2 | P0 | Envelope misdescribes approval authority | Open | Backend / API | M6 |
| N-04 | S1 | P0 | Policy authority is cosmetic (not enforced) | Open | Backend / API | M6 |
| N-05 | S2 | P1 | `shortfall` is in the reproducibility hash | Open | Backend / API | M0 |
| N-06 | S2 | P1 | Seed opens COM-1018 mid-phase | Open | Backend / API | M0 |
| N-07 | S3 | P2 | Dangling ids fail silently | ✅ Closed (M0) | Backend / API | M0 |
| N-08 | S3 | P2 | No rejection-code taxonomy | Open | Backend / API | M6 |

---

## 5. Decisions log

> Every significant product/technical decision gets a row. Open questions from the design docs are seeded below.

| ID | Decision / question | Options | Owner | Status | Date |
|---|---|---|---|---|---|
| Q-01 | Single site or add a site switcher? | (a) single site now (rec) · (b) multi-site | Product Management | Open | — |
| Q-02 | Canonical shift-role name | (a) "Shift Executive" in UI (rec) · (b) "Shift Planner" | Product Management | Open | — |
| Q-03 | Is November (COM-0991) modelled or declared out-of-window? | (a) model once W5 lands (rec) · (b) declare out | Product Management | Open | — |
| Q-04 | Maintenance window changes: same run or separate run? | (a) separate maintenance run (rec) · (b) same run | Product Management | Open | — |
| Q-05 | Authority model: policy-resolved vs non-persona actor | (a) resolve on policy (rec) · (b) authority actor | Product Management | Open | — |
| Q-06 | Floor renders all zones or only open-decision zones? | (a) open zones + toggle (rec) · (b) all zones | Product Management | Open | — |
| Q-07 | North-star metric | (a) receipt-backed completion within one snapshot (rec) · (b) decision time · (c) revenue protected · (d) fewer bad commits | Product Management | Open | — |
| DEC-000 | Placeholder — first recorded decision | [TBC] | [TBC] | — | — |

---

## 6. Personas & acceptance

**Selectable personas (four):**
- Manufacturing manager — plant throughput & promise attainment; approves schedule/capacity within policy.
- Shift executive (currently `shift-planner` id) — shift coverage, rota, certified crew, overtime requests.
- Maintenance manager — asset availability, restoration, maintenance windows.
- Demand planner — demand signal, requested vs promised gap, customer communication drafts.

**Policy authorities (non-interactive):** Finance · Quality · Program/Customer · Procurement — surfaced as named approval requirements with owner + expiry.

**Persona acceptance criteria:** see §11 of the Right-Pane Persona Views doc; the PM pass condition is the full set (items 1–10) plus ledger acceptance A1–A12.

| Persona | Criteria met | Status |
|---|---|---|
| Manufacturing manager | 0 / 10 | Not yet assessed (pre-M0) |
| Shift executive | 0 / 10 | Not yet assessed |
| Maintenance manager | 0 / 10 | Not yet assessed |
| Demand planner | 0 / 10 | Not yet assessed |

> Baseline pass/fail will be recorded at the M0 gate; the M7 target is the full set.

---

## 7. Workstreams (W1–W8)

- **W1 — CRM demand layer:** make requested ≠ promised ≠ capable computable and visible.
- **W2 — MES execution & handover:** give the shift executive a live execution surface.
- **W3 — Maintenance (EAM/CMMS):** root cause, restoration, governed window changes.
- **W4 — Shop floor, resource & routing masters:** make the floor drawable and linked to the ledger.
- **W5 — Capacity, calendar & date rigour:** time-phased, calendar-aware dates and capacity.
- **W6 — Governance, authority, disclosure & role scoping:** authorization and visibility match persona design.
- **W7 — Defect remediation:** clear the register.
- **W8 — Verification, invariants & fixture lint:** make completeness machine-checked.

---

## 8. Metrics & KPIs

| Metric | Definition | Current | Target | Source |
|---|---|---|---|---|
| North-star (Q-07) | Share of at-risk commitments resolved with a complete, receipt-backed decision within one snapshot | Not instrumented | Establish baseline at M7, then ratchet | run store + receipt chain |
| Decision cycle time | Request received → accepted execution receipt | Not instrumented | Hours → minutes | run store |
| Evidence completeness | Commitments whose fixture passes the W8 lint (no dangling id, full routing, freshness derived) | 0% | 100% | fixture lint |
| No-orphan-numbers rate | Ledger cells resolving to a record id or master version | Not measured | 100% | verify |
| Open P0 defects | Count | 10 | 0 | §4 |
| Open defects (all) | Count | 25 | 0 | §4 |
| Persona acceptance pass | Criteria met / total per persona | 0 / 40 | 40 / 40 | §6 |
| Authority separation | Cross-authority requirements not satisfiable by an operational role | Not enforced | Enforced | verify |

---

## 9. Risks & mitigations

| Risk | Impact | Likelihood | Mitigation | Owner |
|---|---|---|---|---|
| Green build masks plan gaps | High | High | land W8 lint with M0; invert defect-encoding tests (N-01) | Backend / API |
| Authority refactor breaks the demo | Medium | Medium | resolve on policy (Q-05a) | Backend / API |
| Zone view becomes decorative | Medium | Medium | M1 exit requires filter + re-scope | Frontend / UX |
| D-04 refactor breaks reproducibility | High | Medium | version model + migration note (N-05) | Backend / API |
| Parallel seams overload one squad | High | Medium | stagger M5 behind M3 | Product Management |
| Fixture sprawl / flaky tests | Medium | Medium | deterministic, id-stable lint from M0 | Backend / API |
| No individual owners named in Notion | Medium | High | confirm names at M0 kick-off; this page carries functions until then | Product Management |
| North-star undecided delays measurement | Medium | Medium | close Q-07 before M7 | Product Management |

---

## 10. Team & RACI

Owner functions are from the Hackathon Plan's Team Plan. Individual names are `[TBC]` until confirmed.

| Area | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Product / roadmap | Product Management | Product owner [TBC] | Business / pitch | All |
| Data modelling (ERP/CRM/MES/EAM) | Backend / API + Data modelling | Engineering owner [TBC] | Product Management | Frontend / UX |
| Centre pane / ledger UI | Frontend / UX | Design / UX owner [TBC] | Backend / API | Product Management |
| Right-pane copilot | AI / reasoning + Frontend / UX | Engineering owner [TBC] | Product Management | Business / pitch |
| Verification / lint | Backend / API (verification) | Engineering owner [TBC] | Product Management | All |
| Commercial / ROI / pitch | Business / pitch | Product owner [TBC] | Product Management | All |

---

## 11. Cadence & meeting notes

- **Cadence:** weekly milestone review; daily stand-up during an active milestone.
- **Gate review:** at each milestone exit, using §3 exit criteria.
- **Meeting notes:** append dated notes below (newest first).

> 2026-09-26 — Page created; core placeholders filled (owners by function, readiness scores, north-star recommendation, metrics, RACI). North-star raised as Q-07. Individual names still pending.
> 2026-09-26 — Added the General Task List, Open Item List and Design List; published the local-only docs; rebuilt §12 as a document map.
> 2026-09-26 — **M0 decision-memory slice executed**: `src/memory.ts` (identity + edges + gate + supersession + lint), `ctp-0.3.0` fingerprint, `OPT-RESERVE-SLOTS` materialised, test freshness derived. Closed D-03/D-21/D-24/N-07; all suites and build green.

---

## 12. Document map

**12.1 Registers & task lists**

- [Stock-take (2026-09-26)](https://www.notion.so/3e807d7f61be819cb830eb1da0b3b07a) — cross-agent inventory, drift and risks
- [General Task List](https://www.notion.so/3e807d7f61be81ff8cd2d30f78a73ecc) — area-level roll-up
- [Open Item List](https://www.notion.so/3e807d7f61be81e5b7c5e510191bbf9b) — all decisions/clarifications/blockers/placeholders
- [Design List](https://www.notion.so/3e807d7f61be81099cfafbac7a89ec20) — design inventory + locked decisions + gaps
- [Execution Task List](https://www.notion.so/3e807d7f61be81c68204f626bd8ab623) — detailed stream tasks (K/D/A/B/C/T/P/G/U/X)
- [Product Management](https://www.notion.so/3e807d7f61be81cf8f87dc383f83d3fa) (this page — the hub)

**12.2 Design & build docs**

- [UI/UX Layout & Interaction Spec](https://www.notion.so/3e807d7f61be81b2a234c88e18a03ccd)
- [Data Model & Synthetic Fixtures](https://www.notion.so/3e807d7f61be81649945c1b49eaeb109)
- [Algorithms, Allocation & Replay](https://www.notion.so/3e807d7f61be81cfb10fd3a85822ae34)
- [Algorithms Build Design (Demand · Production · Shift)](https://www.notion.so/3e807d7f61be818eabf4c50847a24398)
- [AI Chat Build Plan](https://www.notion.so/3e807d7f61be815ebb55ffbd6edd3b41)
- [Personas & Governance](https://www.notion.so/3e807d7f61be81398091fcc309afe88e)
- [Demo, Testing & Validation](https://www.notion.so/3e807d7f61be815381a3e26372b4e3fe)
- [Data, Algorithm, Testing & Deployment Plan](https://www.notion.so/3e807d7f61be81068c0debfa24b755dc)
- [Model ctp-0.3.0 Migration Note](https://www.notion.so/3e807d7f61be81d5a982f3eff1124056)
- [Agentic Memory in the Four Roles](https://www.notion.so/3e807d7f61be8128a586dda911c731ec)
- [Agentic Memory — Addressability Crosswalk](https://www.notion.so/3e807d7f61be812683eedc2098c10d63)
- [Data & Algorithm Gaps and Improvements](https://www.notion.so/3e807d7f61be81d2a9a9f010d8e2eec5) — data (DG) + algorithm (AG) gaps, the capacity-contract decision, and the P0/P1/P2 improvement plan
- [Context & Region Projections Execution Plan](https://www.notion.so/3e807d7f61be8192841bc805aad0849f) — one `activeContext`, four region projections (Stream CP)
- [Chatbot Gap-Closure & Persona Acceptance Plan](https://www.notion.so/3e807d7f61be8135b411c68e272021f7)
- [Chatbot Gaps, Improvements & Persona Test Scripts](https://www.notion.so/3e807d7f61be81b881d6d405ac64e603)
- [Status & Roadmap Readout](https://www.notion.so/3e807d7f61be8115955af9eb55247211)
- [Sample Run](https://www.notion.so/3e807d7f61be81a4b967f590806e3435) — the end-to-end run of the current build

**12.3 Data packs & contracts**

- [COOLIT Synthetic Enterprise Data v3](https://www.notion.so/3e807d7f61be817ba1bce7f0ec641bdd) — 12 new datasets; v3.1 addendum (174 datasets · 41,288 rows)
- [Algorithm Input Bundle v1 (AIB)](https://www.notion.so/3e807d7f61be818c80f7ccabd5c0e349) — solver-ready allocation + schedule projection
- [Data Improvement Plan v2.1 (ERP · CRM · MES-Embedded)](https://www.notion.so/3e807d7f61be81988a50dde774ab5a6e)
- [Data Improvement Plan v3 (Data→Model Contract)](https://www.notion.so/3e807d7f61be818692a7e5ef0dd44f8c)

**12.4 Authoritative design docs**

- [FORGE Decision Room — COOLIT Data Improvement Plan (ERP · CRM · MES · Shop Floor)](https://app.notion.com/p/FORGE-Decision-Room-COOLIT-Data-Improvement-Plan-ERP-CRM-MES-Shop-Floor-3e807d7f61be81d98142f23e739858d4)
- [FORGE Decision Room — Commitment Ledger & Cross-Pane Design](https://app.notion.com/p/FORGE-Decision-Room-Commitment-Ledger-Cross-Pane-Design-3e807d7f61be81ebb9f8eb3e85175c2f)
- [FORGE Decision Room — Right-Pane Conversation (Copilot) Design](https://app.notion.com/p/FORGE-Decision-Room-Right-Pane-Conversation-Copilot-Design-3e807d7f61be8192a551f9d9bf4672e2)
- [FORGE Decision Room — Right-Pane Copilot: Persona Views](https://app.notion.com/p/FORGE-Decision-Room-Right-Pane-Copilot-Persona-Views-3e807d7f61be81679129c4f52ae12f24)
- [UNIFIDE Commit Evidence Copilot — Glasswing Hackathon Plan](https://app.notion.com/p/3dd07d7f61be815c85f3cc7c7a51a8ec)

---

## 13. Change log

| Version | Date | Change |
|---|---|---|
| v0.1 | 2026-09-26 | Created overall product-management page as a skeleton with placeholders |
| v0.2 | 2026-09-26 | Filled core placeholders: vision/problem, one-line status, functional owners (from Team Plan), readiness scores, north-star recommendation (new Q-07), metrics, RACI, cadence |
| v0.3 | 2026-09-26 | Added §1.1 Basic UI/UX layout (four panes: left filtering/attributes, middle-top layout, middle-bottom order table, right chatbot) and §1.2 layout delta vs the current app |
| v0.4 | 2026-09-26 | Created the FORGE documentation set (UI/UX, Data Model, Algorithms, Personas & Governance, Demo/Testing) as skeleton pages and linked them in §12 |
| v0.5 | 2026-09-26 | Resolved the middle-top Layout question: it is a plant floor plan; updated §1.1 and linked UI/UX spec §3 |
| v0.6 | 2026-09-26 | Added the Algorithms Build Design (three-family kernel + demand/production/shift-execution design); filled the Algorithms, Data Model and Personas pages; registered the new doc in §12 |
| v0.7 | 2026-09-26 | Added ADR-001 (Gurobi at build time) and the Execution Task List; shipped the Gurobi solver lane (`tools/gurobi`, `npm run solver`, `src/solver.ts`) wired into a green `verify`/build |
| v0.8 | 2026-09-26 | Created the General Task List, Open Item List and Design List; published the local-only docs (Execution Task List, Algorithms Build Design, Delivery Plan) to Notion; rebuilt §12 as a categorised document map with real links |
| v0.9 | 2026-09-26 | Added the cross-agent Stock-take and linked it; flagged Notion⇄local drift, flattened tables, and nesting to converge |
| v0.10 | 2026-09-26 | Recorded the middle-top Layout (plant floor plan) as built; updated §1.1, §1.2 layout delta, W4 workstream state and M1 milestone |
| v0.11 | 2026-09-27 | Added the Data & Algorithm Gaps page (14 DG + 16 AG, capacity-contract decision, P0/P1/P2 plan) and linked it in §12; recorded the AIB v1 run and its capacity-contract finding |
| v0.11 | 2026-09-26 | **M0 decision-memory slice shipped.** Added `src/memory.ts` (MemoryVersion + EvidenceUseEdge + confidence gate + supersession + reference lint), model `ctp-0.3.0` (run fingerprint pins memory/snapshot identity), materialised `OPT-RESERVE-SLOTS`, and derived test freshness. Closed **D-03, D-21, D-24** and finding **N-07**; `npm run verify` / `verify:server` / `verify:tools` / `verify:ai` + build green. Migration note: `docs/forge-model-ctp-0.3.0-migration.md`. |
| v0.12 | 2026-09-27 | Convergence pass against code: corrected the floor claim (Layout pane built, **SVG render pending UT-02**); refreshed §2 one-line status and W4; refreshed §12 document map with the chatbot gap plans, Context & Region Projections, the data packs (COOLIT v3, AIB, Data Improvement Plan v2.1/v3), Status & Roadmap and Sample Run; archived 5 duplicate pages I had created |
| v0.13 | 2026-09-27 | Ran the algorithms on the v3.2 Data→Model contract: contract-driven schedule (CURRENT scope, 30/40 on time), capacity reconciliation (contract 17 overloaded weeks vs recomputed 0; P-week mapping missing), demand projection (60 commitments → 18 at risk, 20 unlinked). Demand + production planning now coherent; shift/maintenance still open |

---

## Addendum — 2026-09-27 · Context & Region Projections

- **[Context & Region Projections Execution Plan](https://www.notion.so/3e807d7f61be8192841bc805aad0849f)** — new build doc: **one canonical `activeContext`, four region projections** (not four independent links/endpoints). Refines **U-02**; sequences a client-only slice (executable now) ahead of the server tier (gated on **P-03/OI-08**), persistence (**P-07**) and the floor masters (**D-03…D-05**).
- **Layout clarification (recorded):** the room is one screen; the **four regions** — left scope · centre-top floor · centre-bottom order table · right copilot — are **views of one `activeContext`**, never four competing states. This resolves the "four API-style links" question in favour of one deep link with four facets plus four read projections.
- **Register impact:** refines **U-02**; consumes **T-06, T-07, T-11**; adds Stream **CP** (CP-01…CP-22); new open item **OI-53** (context URL canonical form — proposed, pending review).