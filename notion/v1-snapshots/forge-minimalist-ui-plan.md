# FORGE Decision Room — Minimalist Front-Dash Plan

> Make the room **very calm and intuitive**, and bring the **front dash** very close to the target design: a slim SCOPE rail · a large COOLIT SHOP FLOOR · a sparse order table · a quiet FORGE panel. The goal is not fewer capabilities — it is **progressive disclosure**: everything is one click away, nothing shouts at once.

| Field | Value |
|---|---|
| Document | FORGE Decision Room — Minimalist Front-Dash Plan |
| Version | v0.1 |
| Status | 🟡 Plan — ready to execute in slices U1–U6 |
| Owner | Frontend / UX + Product |
| Ground truth | `src/App.tsx` · `src/FilterRail.tsx` · `src/ShopFloor.tsx` · `src/LedgerView.tsx` · `src/styles.css` |
| Target | the shared screenshot: SCOPE · COOLIT SHOP FLOOR · order table · FORGE |
| Last updated | 2026-09-27 |

---

## 0. Objective & success criteria

**Objective.** A first-time user lands, reads the screen in one pass, and knows the one thing that matters (the constrained commitment) without decoding chrome.

**Success criteria (measurable):**
1. **Calm audit:** each region shows ≤ 1 accent colour and ≤ 1 numeric emphasis at rest.
2. **Chrome budget:** the top bar exposes ≤ 5 tokens; the left rail shows ≤ 4 filter groups with the rest behind “More”; the right pane shows an empty state, not a wall of controls.
3. **Hierarchy:** the floor plan is the largest object in the centre; the order table is single-line rows (no inline bars/math at rest).
4. **Density:** the collapsed order table row is one line; all math/provenance live in the expanded row or a drawer.
5. **Visual parity:** at ≥ 1280px the composition matches the target (regions, proportions, labels, table columns).
6. **No capability lost:** every current action remains reachable (progressive disclosure), verified by the function suite.

---

## 1. Why it feels busy today (audit, grounded)

| Region | Current | Why it’s noisy |
|---|---|---|
| Top | `.mast` (brand + note) **and** `.context` (primary line + secondary line: role select, snapshot, master set, fresh/stale, conflicts, scope) | two stacked bars, ~9 tokens, repeated info |
| Left | `.filter-rail` with **20 pill chips** always visible (RISK 4 · PRODUCT 3 · FLOW 8 · OWNER 6) + search + zone chip + count | every filter group expanded at once; chips compete with the queue |
| Centre | `.centre-head` (customer + product) + `.middle-top` floor (small, ~86–137px tall) + `.middle-bottom` 9-column ledger with risk rail, inline `56/120 tests · short 64`, capability bars, provenance dots, expand tiers | the floor is a thumbnail; the table carries math, colour rails, and 9 columns |
| Right | `.log-head` (kicker + h2 + lens + 6-phase stepper) + turns with ~13 block types + `.evidence` drawer + `.action-strip` (7 buttons) + composer (input + 3 buttons) | controls and lifecycle chrome shown before there is a question |
| Global | warm palette is fine, but many borders, rails, and semantic colours compete | no single focal point |

The target is calm because: **one focal object (the floor)**, **one sparse table**, **one quiet panel**, and filters that read as a thin list, not a wall.

---

## 2. Design principles (the “quiet room”)

1. **One focal point per region.** Floor wins the centre; the table supports it; the panel waits.
2. **Progressive disclosure.** Rest state = the minimum to *orient*; depth on demand (expand row, open drawer, open filter “More”).
3. **Colour is a whisper.** One accent (ink) for selection; semantic colour only on the single state token (`at risk` red, `watch` amber, `on track` green, `blocked` grey). No decorative fills.
4. **Typography does the work.** Serif for the one verdict; sans for labels; mono only for ids/dates/quantities. Three sizes: 12 / 14 / 20.
5. **Whitespace is a feature.** 8-pt rhythm; generous padding; hairline separators instead of boxes.
6. **Words, not widgets.** A state is a word first (`at risk`), colour second; a control is a word, not an icon soup.
7. **Same numbers for every role.** The 4 roles change *defaults and prose*, never the density or the numbers.

---

## 3. Target composition (region by region)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ YYC-01 · Manufacturing Manager            COM-1042 · 15 Oct · as of 08:15     │  ← one slim bar
├──────────────┬──────────────────────────────────────────────┬────────────────┤
│ SCOPE        │ COOLIT SHOP FLOOR                             │ FORGE          │
│ ⌕ search     │   ┌───────────────────────────────────────┐  │                │
│ Zone: ZN-08 ×│   │  (illustration · zone hotspots ·       │  │ Ask about      │
│              │   │   open-decision badges · selected zone)│  │ this order.    │
│ RISK         │   └───────────────────────────────────────┘  │ [Why at risk?] │
│  At risk …   │                                              │ [Show constraint]│
│ PRODUCT ▾    │  ───────────────────────────────────────────  │ [Compare options]│
│ FLOW ▾       │  PROMISE  ORDER   PRODUCT  QTY  CONSTRAINT  STATE │           │
│ OWNER ▾      │  15 Oct   COM-1042 CPL-480 120  Leak-test  at risk │  (quiet  │
│ more ▾       ├──────────────────────────────────────────────┤   empty   │
│ HORIZON 13w  │  …single-line rows, muted state pill…        │   state)  │
│ QUEUE 4      │                                              │  message… │
└──────────────┴──────────────────────────────────────────────┴────────────────┘
```

### 3.1 Top bar (one line)
- **Keep:** site · role · active commitment · promise date · as-of.
- **Move off the bar:** snapshot id, master-set version, freshness/conflict counts → a small **“i” info popover** or the FORGE empty state.
- **Drop:** the `.mast` note (“Synthetic fixture… discovery prototype”) → footer or info popover.
- **Accept:** ≤ 5 tokens; 44px tall; hairline bottom.

### 3.2 Left rail — SCOPE (thin list)
- **Keep visible:** Search · Zone chip · RISK (4) · HORIZON · QUEUE count.
- **Collapse under “More”:**
  - **PRODUCT** — cold-plate loops · manifolds · CDUs
  - **FLOW** — receiving · kitting · assembly · test · FAT · ship · MRB · rework
  - **OWNER** — operations · planning · procurement · quality · engineering · sales operations
- Chips become **quiet text toggles** (no pill fill; ink underline when on), 4 rows max at rest.
- **Clear** appears only when a filter is active.
- **Accept:** ≤ 4 groups at rest; rail width 240px; no chip fills except the active zone chip.

### 3.3 Centre-top — COOLIT SHOP FLOOR (the focal point)
- Floor gets **the majority of the centre height** (target ~58–62% at 1280px; today ~15%).
- Render the authoritative illustration with hotspots; **badges only** (open decisions) and **one state dot**; selected zone = 2px ink outline.
- Hover = tooltip (`ZN-06 · Pressure/Leak/Functional — 3 open`); click = filter (zone chip + queue + table + FORGE header).
- **Accept:** floor height ≥ 45% of centre at ≥ 1180px; ≤ 2 overlays per zone at rest.

### 3.4 Centre-bottom — order table (sparse)
- **Columns, in order:** `PROMISE · ORDER · PRODUCT · QTY · CONSTRAINT · STATE`.
- **Single-line rows.** No risk rail bar; no capability bars; no `56/120 short 64` inline; no provenance dots at rest.
- **State** = one muted word-pill (`at risk` / `watch` / `on track` / `blocked`).
- **Constraint** = plain phrase (`Supply + Test + Quality`, `Leak-test capacity`, `—`).
- **Expand** a row (click / Enter) → the existing tiers (records · rules · derived · conflict · missing · capability math · provenance). This is where all the density goes.
- **Accept:** each collapsed row is 1 line, ≤ 6 columns, ≤ 1 colour cue; expansion unchanged in capability.

### 3.5 Right pane — FORGE (quiet)
- Rest state: **empty** — `FORGE` · `Ask about this order.` + 3 quick chips + a one-line footnote (`No Approval / Release / Publish controls exist in chat.`).
- The **phase stepper, evidence drawer, and governed action strip are hidden until a thread is active**; then they appear progressively (Answer → Why → Evidence → Options → Action).
- **Composer:** input + one primary button (“Run scenario”); “Compare”/“Draft” move into the quick chips.
- **Accept:** at rest, ≤ 4 interactive elements; thread content appears only after the first ask.

---

## 4. Component change list (files & accept criteria)

| # | Component / file | Change | Accept |
|---|---|---|---|
| U1 | `src/styles.css` — tokens | Introduce a minimal token set: `--ink`, `--muted`, `--line`, `--paper`, one accent, 8-pt spacing, 12/14/20 type. Remove decorative fills. | ≤ 6 colour tokens; one accent |
| U2 | `src/App.tsx` — top bar | Merge `.mast` + `.context` into one slim bar; move metadata to an info popover | ≤ 5 tokens |
| U3 | `src/FilterRail.tsx` | Chip → quiet toggle; collapse PRODUCT/FLOW/OWNER under “More”; Clear only when active | ≤ 4 groups at rest |
| U4 | `src/App.tsx` — centre split | Floor gets majority height; `.centre-split` rows tuned (e.g. `minmax(240px, 1.15fr) / 1fr`); remove `.centre-head` duplication | floor ≥ 45% centre |
| U5 | `src/LedgerView.tsx` | Reorder + reduce to 6 columns; single-line rows; move math/provenance/bars into the expanded tiers | 1-line rows, 6 columns |
| U6 | `src/App.tsx` — FORGE pane | Empty state; hide phases/evidence/action-strip until a thread is active; composer to input + 1 primary | ≤ 4 elements at rest |
| U7 | `src/zones.ts` | Risk/state labels + constraint phrases align to the target vocabulary | labels match target |
| U8 | a11y | Focus ring, `aria-pressed` on toggles, landmarks, reduced-motion | T-14 pass |

---

## 5. Role behaviour (the 4 personas stay calm)

The room must look equally calm for all four roles — **roles change defaults, not density**.

| Role | Lens | Default queue sort | FORGE lead question | Visible-by-default |
|---|---|---|---|---|
| Manufacturing manager | throughput | binding constraint class | “What slips, what does it cost?” | constraint · state |
| Shift planner / Executive | coverage | lifecycle (investigating first) | “Can we cover it, and with whom?” | lifecycle · state |
| Maintenance manager | availability | resource/constraint | “Why is it down, when is it back?” | constraint · state |
| Demand planner | demand | promise gap (capable − promised) | “Which requests are at risk, how bad?” | promise · capable · state |

- **Role switcher** lives in the top bar as plain text (no big select chrome).
- Switching role re-sorts and re-proses; **numbers never change** (C9 invariant).
- The rail never grows per role; only defaults change.

---

## 6. Data & algorithm alignment (so the front dash can show this)

The target’s calm table needs the data to be clean:

1. **Fixtures:** adopt the v3.2 synthetic pack scale for the front dash — the **60 commitments / 40 work orders** already in `tools/gurobi/fixtures/contract` (today the UI shows a 4-commitment slice). Wire a read model from `governed/canonical_commitment.csv` + `demand_projection.json` (requested/promised/capable) → the table’s `PROMISE · ORDER · PRODUCT · QTY · CONSTRAINT · STATE`.
2. **Constraint phrase:** derive a single human phrase per row (`Supply + Test + Quality`, `Leak-test capacity`) from the binding constraint + gates, instead of composing math in the cell.
3. **State vocabulary:** map `at-risk/awaiting/monitoring/approved` → **At risk / Blocked / Watch / On track** consistently in rail, table, and queue.
4. **Zone ids:** keep `ZN-*`; map the demand rows to zones via routing so the floor badges = open-decision counts.
5. **Honesty caps:** keep the “no number without provenance” rule — density moves to the expanded row, it is never dropped.

> Sequence: the calm UI (U1–U8) is independent of the data wiring; the 60-row front dash (**D-U1**) can land after the shell is calm.

---

## 7. Notion pages to update

- **UI/UX Layout & Interaction Spec** — new §14 “Minimalism & density budget” (this plan’s §2–§4); bump version.
- **Design List** — add **DS-26 Minimalist front-dash plan**; update DS-06 status.
- **Master Task List** — add slice **U1–U8** (+ **D-U1** 60-row read model) under the UI stream; update the V-slice note.
- **Test Plan** — add **§17 Visual & density regression** (Round 1 of testing) and a11y checks (T-14).
- **Personas & Governance** — add a one-paragraph “roles change defaults, not density” note.

---

## 8. Execution slices & effort

| Slice | Scope | Effort |
|---|---|---|
| **U1** | tokens + spacing/type scale | S |
| **U2** | one slim top bar + info popover | M |
| **U3** | quiet rail + “More” collapse | M |
| **U4** | centre proportions (floor dominant) | S |
| **U5** | order table → 6 columns, single-line, tiers on expand | M–L |
| **U6** | FORGE quiet empty state + progressive thread | M |
| **U7** | label/state vocabulary alignment | S |
| **U8** | a11y pass | S |
| **D-U1** | 60-row read model (v3.2 → front dash) | M |

Total ≈ **4–6 engineering days** for U1–U8; D-U1 adds ~1–2 days.

---

## 9. Three rounds of thorough testing

**Round 1 — Visual & density regression (new).**
- Playwright screenshots at **1280 / 1440 / 1920** for 4 states: empty-forge · selected-commitment · zone-selected · role-switch.
- DOM budget assertions: top-bar tokens ≤ 5; rail groups-at-rest ≤ 4; collapsed row line count = 1 and columns ≤ 6; FORGE rest interactive elements ≤ 4; floor height ≥ 45% of centre.
- Colour audit: each region ≤ 1 accent at rest.
- Baseline screenshots committed; a pixel-diff threshold guards regressions.

**Round 2 — Functional & data (existing suites, unchanged).**
- `npm run ci` — `verify · verify:server · verify:tools · verify:ai · verify:persona (48/48) · test:coolit (16/16) · test:invariants (54/54) · test:contract (23/23) · test:capacity (15/15) · lint`.
- Re-run `reconcile_capacity` / `schedule_contract` / `demand_projection`; confirm identical figures (D-22: 2 recoverable overloads / 0 unresolved; 0 active unlinked).
- Confirm every capability is still reachable (expand row, open drawer, open “More”) — a capability-parity checklist.

**Round 3 — Accessibility, roles & determinism.**
- **a11y (T-14):** keyboard roving rows, `aria-pressed` toggles, focus ring, contrast ≥ 4.5:1, `prefers-reduced-motion`, landmarks; axe-clean on the 4 states.
- **Roles:** switch across all 4 personas → rail density identical, queue sort changes, centre numbers identical (C9), FORGE lead question changes.
- **Determinism:** invariants run twice; the model output is byte-identical; the URL codec restores the exact state on reload.

Each round ends fail-closed; nothing ships on a subset.

---

## 10. Risks

- **Parity vs personality:** chasing pixel parity can strip the governance cues → keep the state word + provenance reachable.
- **Hidden ≠ lost:** over-collapsing filters can hide capability → keep “More” obvious and keyboard-reachable.
- **Data gap:** the calm table wants the 60-row pack; until D-U1, the UI shows 4 rows (honest, but not the target scale).
- **Concurrent editors:** `App.tsx` / `styles.css` are multi-writer → land U1–U8 sequentially with one owner.
- **Responsive:** the room must stay usable at 800–1000px (compact grid) — verify at each breakpoint.

---

## 11. Definition of done

- Front dash matches the target composition at ≥ 1280px; calm at 800–1280px.
- Density budgets (§0) hold in Round 1; capability parity holds in Round 2; a11y + roles + determinism hold in Round 3.
- Notion: UI/UX §14, Design List DS-26, Master Task List U1–U8, Test Plan §17 updated.
- `npm run ci` green and the app serves at the working URL.

---

## 12. Change log

| Version | Date | Change |
|---|---|---|
| v0.1 | 2026-09-27 | Created the minimalist front-dash plan: busy-audit, quiet-room principles, region-by-region target, component change list U1–U8, role behaviour, data alignment (D-U1), Notion updates, and a 3-round test plan (visual · functional · a11y/roles/determinism) |