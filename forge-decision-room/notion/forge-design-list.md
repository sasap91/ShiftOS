# FORGE Decision Room — Design List

> The inventory of every design artifact for FORGE Decision Room: what exists, where it lives, its version/status and owner, the decisions already locked, and what is designed but not yet built. Answers "what design do we have, and what is still missing".

| Field | Value |
|---|---|
| Document | FORGE Decision Room — Design List |
| Version | v0.9 |
| Status | 🟡 Active — consolidated design inventory |
| Owner | Product Management |
| Last updated | 2026-09-26 |

**Status legend:** 🟢 Authoritative (source of truth) · 🟡 Active / draft · 🔵 Detail companion · ⬜ Skeleton / placeholder · ⏸ Blocked.

---

## 0. How to read

- **Location** is the Notion page or the local file. Local-only items are flagged so they can be published.
- **Authoritative** items win a conflict with any other artifact (per the PM hub rule).

---

## 1. Design artifacts

| ID | Artifact | Type | Location | Version / Status | Owner |
|---|---|---|---|---|---|
| DS-01 | Product Management hub | Product hub | Notion · Product Management | v0.7 🟡 | PM |
| DS-02 | Order Information Table (middle-bottom) + ledger data layer | Authoritative design | Notion · Commitment Ledger & Cross-Pane Design; **local** `notion/forge-commitment-ledger-design.md` | v0.2 🟡 (table implemented; tighten doc scope to the middle-bottom region) | PM + FE |
| DS-03 | Right-Pane Conversation (Copilot) Design | Authoritative design | Notion | 🟢 | AI + FE |
| DS-04 | Right-Pane Copilot: Persona Views | Authoritative design | Notion | 🟢 | PM + AI |
| DS-05 | COOLIT Data Improvement Plan (v2.1 embedded, algorithm-ready) | Authoritative design | Notion · `docs/forge-data-improvement-plan-v2.md` | v2.1 🟢 | DATA |
| DS-06 | UI/UX Layout & Interaction Spec | Design | Notion | v0.6 🟡 (Layout + SVG floor + order table built) | FE |
| DS-07 | Data Model & Synthetic Fixtures | Design | Notion | v0.2 🟡 | DATA |
| DS-08 | Algorithms, Allocation & Replay | Design | Notion | v0.2 🟡 | AI |
| DS-09 | Algorithms Build Design (Demand · Production · Shift) | Design companion | **local** `notion/forge-algorithms-build-design.md` | v0.2 🔵 | AI |
| DS-10 | AI Chat Build Plan | Build design | Notion · AI Chat Build Plan | 🟡 | AI + BE |
| DS-11 | Personas & Governance | Design | Notion | v0.4 🟡 (disclosure + authority implemented) | PM + GOV |
| DS-12 | Demo, Testing & Validation | Design | Notion | v0.1 ⬜ | BIZ + QA |
| DS-13 | Data, Algorithm, Testing & Deployment Plan | Delivery design | **local** `docs/forge-delivery-plan.md` | v0.1 🔵 | PM + AI + QA |
| DS-14 | Execution Task List | Task list | **local** `notion/forge-execution-tasklist.md` | v0.1 🟡 | PM + QA |
| DS-15 | General Task List | Task list | Notion · General Task List | v0.1 🟡 | PM |
| DS-16 | Open Item List | Register | Notion · Open Item List | v0.1 🟡 | PM |
| DS-17 | Design List | Register | Notion · Design List (this page) | v0.1 🟡 | PM |
| DS-18 | Status & Roadmap Readout | Report | **local** `docs/forge-status-and-roadmap.md` | v1.0 🟡 | PM |
| DS-19 | Plant floor plan (illustration) | Artifact | `public/floor-plan.png` (from the PRD p14) · Notion · UI/UX §3 | ✅ installed (13 hotspots + badges) | PM + FE |
| DS-26 | Minimalist Front-Dash Plan | UI plan | Notion · Minimalist Front-Dash Plan · **local** `notion/forge-minimalist-ui-plan.md` | v0.1 ✅ executed (U1–U8; D-U1 pending) | FE + PM |
| DS-27 | Persona Detail in the Order Table | UI plan | Notion · Persona Detail in the Order Table · **local** `notion/forge-persona-table-plan.md` | v0.1 🟡 (slices T1–T6) | FE + PM |
| DS-20 | **Data & Algorithm Gaps and Improvements** | Register | Notion · **local** `notion/forge-data-algorithm-gaps.md` | v0.2 🟡 | AI + DATA |
| DS-21 | **Model `ctp-0.3.0` Migration Note** | Contract note | Notion | v0.1 🟡 | BE |
| DS-22 | **Context & Region Projections Execution Plan** | Build design | Notion | v0.1 🟡 (Stream CP) | FE |
| DS-23 | **COOLIT Synthetic Enterprise Data v3 / v3.1 / v3.2** | Data pack | Notion | v3.2 🟢 (179 datasets) | DATA |
| DS-24 | **Algorithm Input Bundle v1 (AIB)** | Data pack | Notion | v1 🟡 | DATA + AI |
| DS-25 | **Chatbot Gap-Closure & Persona Acceptance Plan**; **Chatbot Gaps & Persona Test Scripts** | Build design | Notion | v0.1 🟡 | AI + QA |

> **Local-only to publish:** DS-09, DS-13, DS-14, DS-18, DS-20. Until published, their links from Notion do not resolve.

---

## 2. Locked design decisions

| Decision | Where locked |
|---|---|
| Four selectable personas; default view = Manufacturing Manager | Personas doc; `model.ts` |
| Persona approvers vs non-interactive policy authorities (Finance/Quality/Program/Procurement) | Personas doc §3 |
| Centre pane is the record; every other pane is a view | All design docs |
| Four-region room: left filter/attributes · middle-top layout · middle-bottom order table · right chatbot | PM §1.1; UI/UX §1 |
| Order-table design scope = **middle-bottom region only**; top dashboard, global filter rail and Copilot redesign are out of scope | Bottom-centre plan §1; UI/UX §1 |
| Middle-top Layout = plant floor plan | UI/UX §3 |
| Approval ≠ execution; receipt required; dry-run before execute | Right-pane design; Personas §4 |
| Master / transaction / derived / conflict separation; master never "stale" | Ledger design §3 |
| Determinism: JCS canonical JSON + Merkle hashes; no `localeCompare`; logical clock; seeded PRNG | Algorithms §1 |
| **ADR-001** — Gurobi 12.0.3 at build time; frozen fingerprinted TS artifact; runtime reads artifact | Algorithms Build Design §3.5 |
| Honest infeasibility: `proven_infeasible` / `timed_out` / `hard_gated` / `dominated`; `OPTIMAL` only when `gap ≤ policyGap` | Algorithms §8; Personas §6 |
| Every number is a `NumberRef` (provenance) — no orphan numbers | Algorithms §1; Data Model §6 |
| Explanation contract + versioned causal-code map (shared with override codes) | Algorithms §10; Personas §6 |
| Overrides feed read-only review; never auto-retrain or mutate masters | Personas §6 |
| Commitment ladder + firmness decides eligibility | Data Model §3 |

---

## 3. Designed but not built (traceability)

| Design element | Built? | Task / source |
|---|---|---|
| Deterministic allocation + scheduling MIP (Gurobi) | ✅ | Execution Task List B-02, B-03 |
| Frozen-operation pinning + ship-day normalisation | ✅ | Execution Task List B-04, B-05 |
| Runtime production plan (`src/plan.ts`) | ✅ (service; UI wiring pending) | A-09, U-03 |
| AIB v1 schema (allocation + schedule inputs) | ✅ received; schedule not yet wired | B-06, B-19 |
| Rate-based, shift-bucketed capacity | ⬜ | B-13, B-14, D-20 |
| Material/eligibility in the optimisation (AIB-mrp) | ⬜ | D-21, A-06 |
| Contract-driven capacity (rate-based, CURRENT scope) | ✅ service; reconciliation pending | B-20, D-22/D-23 |
| Demand projection (requested→promised→capable) | 🔄 prototype (`demand_projection.py`) | A-11, D-24 |
| Order information table (middle-bottom, §4 nine-column set) | ✅ | `ledger.ts` · `LedgerView.tsx`; UT-03 |
| Middle-top Layout view (plant floor plan) + centre top/bottom split | ✅ (split + Layout + SVG floor built) | UT-01, UT-02, UT-09 |
| Right-pane chat + evidence drawer | ✅ | `App.tsx`; UT-04 |
| Four selectable personas (`ROLE_POLICY` / lens) | 🔄 | `model.ts`; UT-08 (queue lensing + default sorts pending) |
| Kernel provenance (`NumberRef`), canonical hash, `OptimizationPort` | ⬜ | K-05…K-11 |
| CRM requested layer | ⬜ | D-02, A-01…A-08 |
| Zones + routing + floor plan | 🔄 (floor plan built: `src/zones.ts` · `src/ShopFloor.tsx`; zone/routing masters pending) | D-04, D-05, D-07, UT-02 |
| MES execution (WO/handover/certs) | ⬜ | D-07, C-01…C-09 |
| EAM maintenance + restoration | ⬜ | D-08 |
| Ship calendar + time-phased allocation | ⬜ | D-06, A-09, B-05 |
| Authority enforcement + disclosure | 🔄 (authority + disclosure built in `src/disclosure.ts`; causal codes/overrides pending) | D-09, G-04, G-05, T-07 |
| Four-pane layout + middle-top Layout view + selection bus | 🔄 (four-pane + Layout built; selection bus, run dock, states pending) | UT-01, UT-02, UT-06, UT-09 |
| AI chat (router/tools/orchestrator) | ⏸ | X-01…X-06 (blocked on OI-08) |
| Fixture lint + extended `verify` | ⬜ | T-02…T-15 |

---

## 4. Missing design (gaps to close)

| Gap | Owner | Source |
|---|---|---|
| Final order-table per-role emphasis + detail tray | FE + PM | UI/UX §4; OI-25 |
| Left-pane filters/attributes; "planner vs overall" semantics | FE | UI/UX §2 |
| Visual system tokens (density, motion, tone) | FE | UI/UX §9 |
| Component inventory per region | FE | UI/UX §11 |
| State treatments (empty/stale/conflict/unauthorized/error) | FE | UI/UX §8 |
| Accessibility & keyboard spec | FE | UI/UX §10 |
| Concrete fixture tables (W1–W5) with ids/values | DATA | Data Model §5 |
| Role visibility/redaction matrix | GOV | Personas §5 |
| Cross-persona handoff chain | PM + GOV | Personas §7 |
| Demo script + ROI line | BIZ | Demo §1–§2 |
| Capacity contract (rate-based, shift-bucketed) | AI + DATA | DG-01…DG-03; OI-53/OI-54 |
| Rate-schema authority + reconciliation | DATA | DG-01; OI-53 |
| Material/eligibility (AIB-mrp) in the optimiser | AI + DATA | DG-06, AG-06 |

---

## 5. Change log

| Version | Date | Change |
|---|---|---|
| v0.1 | 2026-09-26 | Created the consolidated design inventory: 19 artifacts, locked decisions, design→build traceability, and missing-design gaps |
| v0.2 | 2026-09-26 | Rescoped DS-02 to the middle-bottom order table + ledger data layer; locked the middle-bottom scope boundary; recorded built items (order table, right-pane chat, personas) in §3; refreshed §4 gaps |
| v0.3 | 2026-09-26 | Recorded the middle-top Layout/plant floor plan as built: DS-06 → v0.3, DS-19 ✅ delivered, §3 traceability and §4 gaps refreshed |
| v0.4 | 2026-09-26 | DS-06 → v0.6 (Layout aligned to the illustration; order table built); recorded the Z-ELEC → Z-CDU fold |
| v0.5 | 2026-09-27 | Added DS-20 (Data & Algorithm Gaps); DS-05 → v2.1; recorded AIB v1 and the rate-based capacity / AIB-mrp gaps in §3/§4 |
| v0.6 | 2026-09-27 | Corrected the floor claim: DS-19 and the §3 traceability now say the Layout **pane** is built and the **floor SVG render is pending (UT-02)**; added DS-21…DS-25 (migration note, Context & Region Projections, data pack v3/v3.1, AIB, chatbot gap plans) |
| v0.7 | 2026-09-27 | DS-20 → v0.2; DS-23 → v3.2 (179 datasets); recorded the contract-driven capacity pool and demand projection in §3 traceability |
| v0.8 | 2026-09-27 | DS-06/DS-19/§3 corrected to **floor SVG built** (`src/zones.ts` · `src/ShopFloor.tsx`; V-01…V-10); DS-11 → v0.4 (disclosure + authority implemented) |
| v0.9 | 2026-09-27 | DS-19 → illustration **installed** at `public/floor-plan.png` (from the PRD p14; 13 hotspots); front-dash aligned to the design |
| v0.10 | 2026-09-27 | Added **DS-26 Minimalist Front-Dash Plan** (slices U1–U8 + D-U1; quiet-room principles; 3-round test plan) |
| v0.11 | 2026-09-27 | DS-26 → executed (U1–U8): slim top bar, quiet rail, floor-dominant centre, 6-column table, quiet FORGE; budgets verified |
| v0.12 | 2026-09-27 | Added **DS-27 Persona Detail in the Order Table** (6 fixed columns + 1 lens column; persona expanded tier; slices T1–T6) |