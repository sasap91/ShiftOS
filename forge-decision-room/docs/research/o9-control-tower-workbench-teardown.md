# o9 Solutions (Digital Brain / EKG Control Tower) — Workbench UI teardown

**Purpose:** extract concrete UI structure ideas for FORGE's **MIDDLE·BOTTOM order-information table**.
**Scope of evidence:** o9 product/marketing pages, docs pages, the o9 PGA page, and *actual o9 UI screenshots* harvested from `cms.o9solutions.com` (2024–2026 assets), plus o9's published methodology (Control Tower 2.0, the 4Ws, Pre-Alert Exception Management, Post-Game Analysis).
**Method:** web search + page fetch + direct download and inspection of 20+ o9 UI images (incl. zoom/crop of a master-planning monitor photo).

**Confidence legend**
- `[SEEN]` — directly observed in an o9 UI screenshot I downloaded and inspected.
- `[CITED]` — stated in o9 text (page, article, press release).
- `[INFERRED]` — my interpretation / extrapolation; not directly shown.

> Caveat: o9 does not publish a UI reference guide (the `guide.o9solutions.com` Platform Wiki is login-gated). Everything marked `[SEEN]` is a real o9 marketing screenshot; layout *mechanics* (what scrolls, what is pinned) are partly `[INFERRED]`.

---

## 1. What o9's workbench actually is

o9 renders its platform as a **web "workspace" shell** with a small set of consistent chrome, and then a **page** built out of dashboard tiles, grids (reports) and exception tables.

**Shell anatomy `[SEEN]`** (Control Tower hero, PGA screens, Master-Planning monitor):
- **Top bar**: logo mark → back arrow → **breadcrumb path** (`Master Planning Weekly / … / Dashboard`, `SC Control Tower / … / Demand Supply Sensing`, `Inventory PGA`, `Forecast PGA`) → page-utility icons (settings, chat, docs, notifications, apps, avatar) → help.
- **Left icon rail** (fixed, ~7–8 icons): hamburger, grid/table, filter panel, hierarchy, lineage/flow, settings, help. It switches views within the workspace; it is *not* the record.
- **Global filter chip bar** under the top bar: e.g. `Item All 35 | Location All 363 | Planning Month All 132 | Version Name: Baseline` `[SEEN]`. Every chip carries a scope count and a clear (×). This is the direct analogue of FORGE's LEFT pane, but rendered horizontally.
- **Right utility rail** (narrow): filter, table view, settings, help `[SEEN in PGA screens]`.
- **Main body**: a vertical stack / 2-column grid of titled **cards** ("Demand Alerts", "Inventory Alerts", "Scheduled Receipts Alerts", "Capacity Alerts", "Procurement Alerts", "Collaboration | Tasks"). Each card has a title underlined by a rule and an **expand (⤢) affordance** `[SEEN]`.

**Two distinct body modes:**

| Mode | What it looks like | Evidence |
|---|---|---|
| **Exception/alert "control tower"** | A **stack / 2-col grid of tabular alert cards**, one per exception family, each ranked by criticality; a map card; a collaboration card. | `[SEEN]` Control Tower hero + SCP UI card |
| **Planning "workbench" (grid + tabs + side panel)** | A **KPI tile strip**, then a **tabbed panel** (`Breakdown / Details / Baseline R&O / Incremental Proposals / Assumptions / RO Pulse`), a **dense grid/table**, and a **right Gen-AI panel**. | `[SEEN]` PGA hero screenshot |

**Fixed vs scrolls `[INFERRED]`:** the shell (top bar, left rail, filter chips, right rail) is fixed; the body scrolls; inside a table the **identity/leading columns are intended to stay put while measures scroll** (o9 tables are wide — 9–13 columns — so horizontal scroll is core). o9 grids support `Download`, `Filters`, `Layout` controls and column show/hide `[SEEN]` (Master-Planning "Material Exception" card, PGA "Review Details"). Numeric cells carry **inline micro-bars/Δ** rather than being plain numbers `[SEEN]`.

**Numbering/navigation:** tables use row-level `⋯` overflow menus and a **drill icon** column (a small "open in new" glyph) on every row `[SEEN]` — i.e. every row deep-links to its own analysis surface. This is o9's version of FORGE's "focus a cell → deep link".

---

## 2. Column taxonomy for demands / orders / supply

o9's exception tables expose a compact, repeatable column grammar. Representative column sets observed:

**Demand / demand-supply sensing** `[SEEN]`
`Item · Criticality (red "Critical" pill) · Order Exceeds (⚠) · Order w/ No Forecast (⚠) · Alert Status (Open)`

**Scheduled receipts / inbound** `[SEEN]`
`Item · BOD Lane · Criticality · o9 OTIF Predictor · +/- Change (↑ green) · Delay Probability (%) · Alert System (Open)`

**Capacity** `[SEEN]`
`Resource · Location · Capacity Utilization (%) · Under Utilization (⚠) · Resource Status · Resource Risk (0.85) · Resource Status (Open)`

**Procurement / POs** `[SEEN]`
`OrderlineID · Supplier Location · Item · PO Delivery Date · Criticality · Delivery Status (●) · PO Alert Status (Open)`

**Material exception (master planning)** `[SEEN]`
`Constraint Item · Constraint Location · Problem Type (FrozenPeriod, LeadTimePlanBefore, Capacity Short) · Material · Constraint Resource · Constraint Location · Problem Type · Capacity Constraint Qty`

**Supply "supportability" & inventory exceptions** `[SEEN]`
`Product Category · Location Region · Total Demand Quantity · Supportability % (red when low)` and `… · Out of Stock · Excess Stock · Under Stock`

**Forecast "exceptions review"** `[SEEN]`
`Stat Item · Stat Account · Volume L1 · PLC Status L1 · System BestFit Algorithm · Missing BestFit · System BestFit Algorithm · Planner BestFit Algorithm · Potential Stockout Flag · IsOutlier Corrected · Reviewed Outlier (☐) · Validation Fcast Accuracy · CoCC Stability %`

**Demand-sensing "review details" (variance table)** `[SEEN]`
`Item · Actual · Final Fcast Day ToDate · Actual vs Final Fcast ToDate Gap · … Gap % (inline bar) · Open Orders · Final Fcast Day ToGo · Open Orders vs Final Fcast ToGo Gap · … Gap %`

**PGA executive summary** `[SEEN]`
`MEASURE · VALUE · PERCENTAGE · EXCEPTION (⚠ or 🔴)`

**Take-aways for a column taxonomy `[INFERRED]`:**
1. **A severity/criticality column is always first-class** (pill + icon, not colour alone).
2. **The forecast/plan version and the actual both appear as adjacent columns** with a **Δ and a Δ%** — o9 never shows a single number without its baseline.
3. **A "problem type" / constraint-class enum** is explicit (`FrozenPeriod`, `Capacity Short`, `LeadTimePlanBefore`) — a typed classifier, not free text.
4. **A constraint qty / rank / risk score** accompanies the constraint (o9: `Capacity Constraint Qty`, `Constraint Rank`, `Resource Risk`).
5. **Confidence/quality columns are present** (`Delay Probability %`, `OTIF Predictor`, `Validation Fcast Accuracy`, `CoCC Stability %`) — numbers that are themselves model outputs and are labelled as such.
6. **Status is explicit text** (`Open`, `Closed`) + icon; o9 keeps a per-row alert/status system field.

---

## 3. Exceptions, alerts, recommended actions, and "pre-alert"

**How exceptions surface `[SEEN]`:**
- A **dedicated exception card per domain** (demand, inventory, scheduled receipts, capacity, procurement, material) with the exception family as the card title.
- Rows are **ranked by criticality**; `Critical` is a red pill, lesser rows show `High` in amber, and silent rows show `-`.
- Each row has an **`Alert Status: Open`** affordance with a framework icon (looks like "open as task/work item"), i.e. **exceptions are promoted into work objects**.
- A **Tasks** panel is a sibling: `Total Tasks / Total Open / Total In Progress / Total Overdue / Total Closed`, each broken down by `Priority High/Medium/Low` counts, with scope chips `Assigned to me | Created by me | Followed by me` and a `Create Task` button `[SEEN]`.

**How recommended actions surface `[CITED, and SEEN in PGA]`:**
- Control Tower: "prescribe multiple resolution options based on pre-configured scenarios — expediting, reallocating inventory, or reprioritizing orders — and enables users to execute decisions directly within the platform."
- PGA Agent: traces an outcome to root causes and then "**recommended specific actions**, including moving the SKU to touchless forecasting, requiring managerial approval for future overrides, and introducing additional forecast performance metrics" — and offers **direct navigation into the workflow to implement the change** ("Now directly from the agent I can act on these insights").
- PGA UI `[SEEN]`: an `Ask something…` chat composer with an agent selector (`PGA E2E Agent`), next to the measure table; and a **Gen AI side panel** with a **scope selector** (`Excess Inventory`, `Service Levels`, `COGs`, `Revenue`, `+ More`) driving a question like *"Why do we have excess inventory?"*.

**How "pre-alert exception management" appears `[CITED]`:**
- "Unlike legacy tools that react only after issues occur, the o9 Control Tower proactively identifies risks before they escalate."
- "…can compare **planner overrides against agreed-upon policies** to detect early signs of misalignment between strategy and execution. By surfacing potential disconnects before they become urgent alerts, organizations can intervene earlier."
- i.e. the UI equivalent is an exception raised **because a human override diverged from policy** — not because a physical disruption already happened. The supporting UI is the **"Overrides by Reason Code and Delta"** donut `[SEEN]` with reason codes `China Constraint · Priority · Changeover · Labor Constraint`.

**FORGE relevance:** this is precisely FORGE's "show conflicts, don't resolve" territory — an override-vs-policy exception is a conflict, and FORGE already records both source values. o9 shows that the *reason code* is a first-class captured field.

---

## 4. Plan vs execution, and auditable decision trails

**Plan vs execution `[SEEN/CITED]`:**
- o9's execution window is the "0–12 week operational window"; the plan is a versioned artifact: `Version Name: Baseline`, `Version: CurrentWorkingView`, `Master Planning Baseline` appear as **filter chips** `[SEEN]`. Plans are selectable/comparable versions.
- Variance is shown as **actual-vs-plan/final-forecast pairs with Δ and Δ%** (`ACTUAL vs PLAN` line callout; `Actual vs Final Fcast ToDate Gap %`) `[SEEN]`.
- "Decision Replay" / Post-Game Analysis `[CITED]`: system of record for plans and decisions; traces execution back through **decision chains**; a concrete demo isolated contributors — "forecast overrides that diverged from system recommendations, strategic bulk purchases under outdated pricing assumptions, safety stock policies misaligned with current demand, and plant-level overproduction."
- The **4Ws** `[CITED]` is the published decision loop: **W1 What happened? · W2 Why? · W3 What is likely next? · W4 What are the best actions?** — two backward-looking, two forward-looking, with "proper governance" on action.

**Auditable decision trail in the UI `[SEEN/CITED]`:**
- PGA shows a **`Traces (16)` breadcrumb** above the executive summary — a literal trace count you can drill into `[SEEN]`.
- Every decision/override is recorded with a **reason code** (`Overrides by Reason Code and Delta`) `[SEEN]`.
- Governance is explicit in the recommendation: "requiring **managerial approval** for future overrides" `[CITED]`.
- o9 markets **auditable decision trails** and "aligned priorities, auditable decision trails" replacing email/spreadsheets `[CITED]`.

**FORGE relevance:** this validates FORGE's "planned≠available≠eligible≠allocated≠committed≠shipped" and "every number traces to source + timestamp". o9's `Traces(n)` and reason-code capture are the two most portable ideas.

---

## 5. Public screenshots (described) + URLs

All are o9-hosted marketing renders of the real product UI.

1. **Control Tower — full workspace hero** (`[SEEN]`)
   `https://cms.o9solutions.com/wp-content/uploads/2026/09/Supply-Chain-Control-Tower_Hero-scaled.png`
   Left icon rail; breadcrumb `SC Control Tower / … / Demand Supply Sensing`; filter chips `Item All 35 · Location All 363 · Planning Month All 132 · Version Name Baseline`; a 2-col grid of alert cards (**Demand Alerts / Inventory Alerts with world map / Scheduled Receipts Alerts / Capacity Alerts / Procurement Alerts / Collaboration|Tasks**), each with column sets listed in §2 and an `Alert Status: Open` per row; Collaboration thread with tags (`Baseline`, `P_14000_13`, `RM_140_3`, `+ Add tag`).

2. **Control Tower UI card (same shell, close crop)** (`[SEEN]`)
   `https://cms.o9solutions.com/wp-content/uploads/2026/09/Supply-Chain-Control-Tower_UI-Card-scaled.png`

3. **Supply Chain Planning — supportability/inventory exceptions** (`[SEEN]`)
   `https://cms.o9solutions.com/wp-content/uploads/2026/09/Supply-Chain-Planning_UI-Card-scaled.png`
   Six KPI tiles (`Overall Supportability % 80%`, `Total Prod Plan Vol`, `Released Prod Plan Vol`, `Lost Sales`, counts) + Tasks panel (`Total Tasks/Open/Overdue 5/1/3`, priority breakdown, `Assigned to me|Created by me|Followed by me`, `Create Task`) + two exception tables (`Supportability Exception`, `Inventory Exception` with `Out of Stock / Excess Stock / Under Stock`).

4. **Master Planning monitor photo — "Material Exception"** (`[SEEN]`, zoomed)
   `https://cms.o9solutions.com/wp-content/uploads/2026/01/o9_Mockup_Platform-SCPA-scaled.jpg`
   On-screen: breadcrumb `Master Planning Weekly / … / Dashboard`; chips `L3 All 1 · Location Region All · Version Name Master Planning Baseline · Planning Month All`; KPI tiles `Overall Supportability 80.63%`, `Total Prod Plan Vol 33,868k`, `Lost Sales 4,205k`, `Total Prod Plan Count 1,943`; Tasks panel (`Total Tasks 5`, `Open 1`, `In Progress 0`, `Overdue 3`, `Closed 1`, priority High/Medium/Low); a stacked bar `Number of Suppliers by R…` (Low/Mid/High legend, `Cumulative` toggle, `Time: PM|W`); a `Material Exception` table `Constraint Item · Constraint Location · Problem Type · Material · Constraint Resource · Constraint Location · Problem Type · Capacity Constraint Qty` with `Download / Filters / Layout` controls.

5. **Demand Planning — KPI + accuracy/bias/FVA** (`[SEEN]`)
   `https://cms.o9solutions.com/wp-content/uploads/2026/09/Demand-Planning_UI-Card-scaled.png`
   KPI tiles with secondary metrics; a tabbed chart `Accuracy | Bias | FVA`; a legend of forecast layers (`Naive Fcast Accuracy`, `System Fcast Accuracy`, `FVA Consensus vs System`, `Consensus Fcast Accuracy`).

6. **Production Scheduling — resource Gantt** (`[SEEN]`)
   `https://cms.o9solutions.com/wp-content/uploads/2026/09/Production-Scheduling_UI-Card-scaled.png`
   Rows = resources/lines; columns = days with time buckets; colored item bars. Useful model for FORGE's middle-top floor plan / capacity context.

7. **AI/ML Forecasting — "Exceptions Review"** (`[SEEN]`)
   `https://cms.o9solutions.com/wp-content/uploads/2026/09/AI-ML-Forecasting_UI-Card-scaled.png`
   A `Review` line chart + an `Exceptions Review` dense table with algorithm-selection, stockout flag, outlier review checkbox, validation accuracy, stability.

8. **Supply Chain Analytics — overrides by reason code** (`[SEEN]`)
   `https://cms.o9solutions.com/wp-content/uploads/2026/09/Supply-Chain-Analytics_UI-Card-1-scaled.png`
   `Untouched Volume 13,7 / Total Volume 139,8` with a 20%/80% bar; `Untouched SKUs 1 / Total 14`; donut `Overrides by Reason Code and Delta` (`China Constraint · Priority · Changeover · Labor Constraint`).

9. **Allocation & Replenishment — demand supportability** (`[SEEN]`)
   `https://cms.o9solutions.com/wp-content/uploads/2026/09/Allocation-Replenishment_UI-Card-scaled.png`
   KPI tiles `Supportability 89%`, `DC Storage Utilisation 84%`, `Lost Sales $1,484`, `Lost Sales Units 56.8`; `Demand Supportability` stacked bars with `Total Met On Time / Total Late / Projected Lost Sales / Demand Quantity`, `Time D|W` toggle.

10. **S&OP — process tracker + process chart** (`[SEEN]`)
    `https://cms.o9solutions.com/wp-content/uploads/2026/09/Sales-Operations-Planning-SOP_UI-Card-2-scaled.png`
    Horizontal stepper `1 Product Review → 2 Demand Review → 3 Supply Review → 4 Integrated Reconciliation Review → 5 Management Review` with dates; a grid of numbered tasks (`1.1 Review Segmented Portfolio`, `2.2 Close Gaps to Target with R&Os`, `3.1 Run What-If Scenarios`, `3.2 Analyze Constraints`, `4.1 Review P&L`, `5.1 Compare Tradeoffs`, `5.2 Publish Plan`).

11. **Demand Sensing — pacing + review details** (`[SEEN]`)
    `https://cms.o9solutions.com/wp-content/uploads/2026/09/Demand-Sensing_UI-Card-1-scaled.png`
    `Pacing Report` chart (`Final Fcast Day, Actual, Open Orders, ML Fcast CML Day`) + `Review Details` variance table with inline signed bars.

12. **Post-Game Analysis (PGA) — executive summary + agent** (`[SEEN]`)
    `https://cms.o9solutions.com/wp-content/uploads/2026/03/Inventory-PGA-new-scaled.png`
    `Traces (16)` breadcrumb; `Executive Summary: Excess Inventory (Current Week)` table `MEASURE | VALUE | PERCENTAGE | EXCEPTION`; copy/like/comment/share/download; `Ask something…` chat with `PGA E2E Agent` selector.

13. **PGA — key observations + scenario compare** (`[SEEN]`)
    `https://cms.o9solutions.com/wp-content/uploads/2026/03/Inventory-PGA-2-scaled.png`
    AI prose "Key observations:" then `Q4-25 Scenario Comparison: CurrentWorkingView vs DAScenario_Upside (Pastry, Canada)`.

14. **PGA — forecast demand variability** (`[SEEN]`)
    `https://cms.o9solutions.com/wp-content/uploads/2026/03/Forecast-PGA-new-scaled.png`
    Bubble scatter `COV (Low→High) × Volume (Low→High)` with a threshold box highlighting an exception quadrant.

15. **PGA hero — planning grid + Gen-AI panel** (`[SEEN]`)
    `https://cms.o9solutions.com/wp-content/uploads/2026/06/PGA-hero-section-final-Jun-26.png`
    Chart with `ACTUAL vs PLAN` callout; tabbed panel `Breakdown | Details | Baseline R&O | Incremental Proposals | Assumptions | RO Pulse`; grid `Actions · Event Group · Event · Initiative State · Start Date · End Date · Initiative… · Include (☐) · Initiative Lead Time` with `Approved/Cancel · Download · Filters · Local Edit`; **right Gen-AI panel** ("Hello, how can I help?", a what-if question *"…where the demand for Q3 goes up by 20%?"*, `Expert Recipes`: Demand Upside Supportability / Demand Supply Matching / Demand Upside Management) and a **scope selector** `Excess Inventory / Service Levels / COGs / Revenue / +More`.

---

## 6. Patterns worth stealing — and anti-patterns

**Worth stealing**
- **Exception-first table with a Criticality pill + explicit status text + row drill icon.**
- **Δ and Δ% columns** next to every plan number.
- **Problem-type / constraint-class enum** + **constraint qty + rank + risk score**.
- **Reason-code capture for overrides** (donut/report + per-row).
- **Inline signed micro-bars** in numeric cells.
- **A scoped KPI/exception-count strip** above the grid (driven by the same filters).
- **Tasks as a sibling view of exceptions** with `Assigned to me / Created by me / Followed by me`.
- **Process tracker (steps) + process chart (tasks)** to express workflow/lifecycle.
- **`Traces (n)` drill** from a number to its decision chain (pegging).
- **Chat + scope selector** where the agent operates on the currently scoped record set.

**Anti-patterns (relative to FORGE's principles)**
- **Card-grid of separate exception tables** (o9 control-tower mode): breaks cross-order comparison; forces the eye to hop between cards and scroll regions. FORGE's single dense table is better for one-row-per-order.
- **KPI tile walls** above the record (o9's 6-tile strips): can push the actual record below the fold; FORGE should keep any strip to one thin line and never let it become the page.
- **Collapsing to a single recommended action / auto-execution** (o9 "touchless", agent recommends one path): conflicts with FORGE's "show conflicts, don't resolve them". o9 optimises for resolution; FORGE should optimise for *visible conflict + provenance*.
- **Colour as the primary channel** (🔴 immediately signals Critical): FORGE already requires text+icon; keep that.
- **Alert `Open` status without a visible as-of/source per row** in the screenshots: FORGE must keep source + timestamp on every number.
- **Version selection as a global chip only** (`Version Name: Baseline`): good, but FORGE should also show the governing version *per row* where rows come from different snapshots.

---

## 7. What FORGE should adopt for MIDDLE·BOTTOM (concrete list)

1. **Add a "Δ vs prior cycle/plan" to the Risk rail.** o9 pairs every number with its baseline (`Excess Inv. Change LW vs CW`, `Actual vs Final Fcast Gap %`). FORGE's Risk rail can carry `severity · T-19d · Δ` (e.g. `▲2d` vs last snapshot). *Keep "show conflicts, don't resolve" — the Δ is evidence, not a decision.*
2. **Make "Binding constraint" a typed, ranked chip with its own fields.** Mirror o9's `Problem Type / Constraint Resource / Constraint Location / Capacity Constraint Qty` and `Constraint Rank`: FORGE chip = `⟳ capacity · RES-ASM-01 · short 12 · rank 2/7`. Keep the existing typed-chip glyphs; add a **constraint count** so a row can reveal "2 more constraints".
3. **Add a thin, scoped KPI/exception-count strip directly above the table** (one line, not tiles). Counts recomputed from the current left-pane scope: `Orders 128 · Infeasible 6 · Conflict 4 · Stale 2`. Viewed as a projection of the same records, it respects "centre pane is the record".
4. **Adopt a tri-state task/lifecycle model on the Lifecycle column** with owner and scope chips. o9's `Open / In Progress / Overdue / Closed` + `Assigned to me / Created by me / Followed by me` maps cleanly onto FORGE's `investigating → monitoring`.
5. **Capture an override reason code whenever a human changes a derived number.** o9's `Overrides by Reason Code and Delta` + PGA's "managerial approval for future overrides" is the pre-alert mechanic. In FORGE, put the reason code in the expanded **Conflict/Provenance** tier and expose a reason-code filter in LEFT.
6. **Add a `Traces (n)` drill from each derived cell to its decision/pegging chain.** In the expanded row's **Derived** tier, list `∑ result → inputs → source records → decision(s)`, each with source id + observed timestamp. This is FORGE's version of o9's "system of record for plans and decisions".
7. **Render inline signed micro-bars in `Capable (+Δ)` and `Promised`.** Copy o9's `Review Details`/`Demand Supportability` treatment: a tiny signed bar/segment behind the number, tabular figures, right-aligned, never colour-only.
8. **Make conflicts and stale sources probabilistically labelled, not hidden.** o9 shows `Delay Probability %`, `OTIF Predictor`, `Validation Fcast Accuracy`. FORGE's `Feasibility`/`Provenance` can show model confidence + freshness per row (`solver v3 · 92% · as-of 14:02`) so a "capable" date is never naked.
9. **Preserve version/snapshot identity per row, not just globally.** o9 exposes `Version Name: Baseline` as a global chip; FORGE already promises "planned≠available≠eligible…". Show the governing snapshot + master-set version in the expanded **Rules** tier and a compact tag in the collapsed row when it differs from the page default.
10. **Keep the row drill and overflow menu, but route everything to the RIGHT pane.** o9's per-row drill icon + `⋯` open a row's own analysis; FORGE should use the same affordance to re-scope the copilot without mutating business state (FORGE: "the table never mutates business state").
11. **(Optional) Inline scenario compare as columns, not a separate pane.** o9 compares `CurrentWorkingView vs DAScenario_Upside`. FORGE could allow a temporary "compare against candidate" column pair in `Capable (+Δ)` — but never replace the record with the scenario.

---

## 8. ASCII wireframes

### 8a. o9-style control-tower workbench (reconstructed from the hero screenshot)

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│ ≡  ←  SC Control Tower / … / Demand Supply Sensing ▾        ⚙  💬  📖  🔔  ⋯  [KS]  ?  │  FIXED top bar
├──┬────────────────────────────────────────────────────────────────────────────────────┤  FIXED filter chips
│  │  ⊞  ▤   Item  All 35 ×   Location  All 363 ×   Planning Month  All 132 ×  Version…  │  (scope counts)
│▣ ├──────────────────────────────────┬─────────────────────────────────────────────────┤
│▤ │ Demand Alerts               ⤢    │ Inventory Alerts     [Low] [Excess Inv]    ⤢    │
│▥ │ ☐ ⋯ Item   Criticality  Exceeds…  │  ┌───────────────────────────────────────────┐  │
│▦ │ ☐ ⋯ Item_2  🔴 Critical   -   ⚠   │  │            world map  • • •  •            │  │
│◫ │ ☐ ⋯ Item_3  🔴 Critical   -   ⚠   │  └───────────────────────────────────────────┘  │
│⚙ │        └ Alert Status: Open        │                                                 │  scrolls
│? │ Scheduled Receipts Alerts      ⤢  │ Capacity Alerts                            ⤢   │
│  │ Item│BOD Lane│Crit│OTIF│Δ│Delay%  │ Resource│Loc│CapUtil%│Under⚠│Status│Risk│Open   │
│  ├──────────────────────────────────┼─────────────────────────────────────────────────┤
│  │ Procurement Alerts            ⤢   │ Collaboration │  Tasks                         │
│  │ Orderline│Supplier│Item│PO date…  │ 🔎 search…   Kyle Star · thread · tags +Add tag  │
└──┴──────────────────────────────────┴─────────────────────────────────────────────────┘
   fixed icon rail                     body = vertical stack / 2-col card grid
```

### 8b. o9-style "grid + tabs + side panel" workbench (from PGA / master-planning)

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ ←  Master Planning Weekly / … / Dashboard ▾        ⚙ 💬 📖 🔔 ⋯ [KS]      ?   │
├──┬───────────────────────────────────────────────────┬───────────────────────┤
│  │ chips: L3 All 1 | Location Region All | Version…  │  right utility rail  │  FIXED
│▣ ├───────────────────────────────────────────────────┤   ▤  filter          │
│▤ │ KPI TILES: Supportability 80.6% | Lost Sales 4.2k │   ▥  table view      │
│▥ │            Prod Plan Vol 33,868k | Count 1,943    │   ⚙  settings        │
│▦ ├───────────────────────────────────────────────────┤   ?  help            │
│◫ │ Tabs: Breakdown │ Details │ R&O │ Proposals │ …    │                       │
│  │ ┌────────────┬──────────┬──────────┬────────────┐ │ ┌───────────────────┐ │
│  │ │ Item       │ Actual   │ Plan Gap │ Gap % [bar]│ │ │ Gen AI            │ │
│  │ │ Item_1     │ 30,979   │ 23,190   │ █████ 0%   │ │ │ > why excess inv? │ │
│  │ │ Item_3     │ 26,979   │ (24,073) │  (47%)▉    │ │ │ Expert Recipes…   │ │
│  │ └────────────┴──────────┴──────────┴────────────┘ │ │ scope: inventory… │ │
│  │ Actions │ Event │ State │ Start │ End │ Include ☐  │ │ [ask something…]  │ │
└──┴───────────────────────────────────────────────────┴───────────────────────┘
        identity/leading cols fix · measure cols scroll     agent operates on scope
```

### 8c. FORGE MIDDLE·BOTTOM, o9-informed (target)

```
MIDDLE · BOTTOM — Order information table                                FORGE / YYC-01
┌───────────────────────────────────────────────────────────────────────────────────────┐
│ Orders 128 · Infeasible 6 · Conflict 4 · Stale 2 · As-of 14:02 · Snapshot V-2026-09-26  │ thin scoped strip
├────┬────────────────┬───────────────┬────────┬─────────────────┬───────────┬───────────┤
│Risk│ Order/commit   │ Product · qty │Promised│ Capable (+Δ)    │ Binding   │ Feasibility│ ← frozen identity cols
│rail│ id + customer  │ family + uom  │+src tag│ earliest + bar  │ constraint│  + conf.   │
├────┼────────────────┼───────────────┼────────┼─────────────────┼───────────┼───────────┤
│▌T-19│CO-2041 · ACME │CDU-2400 ×4   │ 03-14  │ 03-22  ▲8d ▉▉   │⟳ cap rank2│ infeasible │
│ ▲2d│                │               │ ERP    │  82% solver     │ RES-ASM-01│  solver v3 │
├────┼────────────────┼───────────────┼────────┼─────────────────┼───────────┼───────────┤
│▌T-6 │CO-2057 · NOVA │Manifold ×10  │ 03-05  │ 03-05  ·  ▏     │▤ mat +2    │ feasible   │
│    │                │               │ CRM    │                 │ RM-42      │  96%       │
└────┴────────────────┴───────────────┴────────┴─────────────────┴───────────┴───────────┘
  (click row → RIGHT copilot re-scopes; Enter → expand tiers: Records · Rules · Derived · Conflict · Missing)
```

---

## 9. Sources

**o9 pages (text/methodology)**
- Control Tower solution — Pre-Alert Exception Management, sense/solve/execute, auditable decision trails, 93% touchless: https://o9solutions.com/solutions/supply-chain-planning/supply-chain-control-tower
- Control Tower docs page — Core capabilities, building blocks, AI intelligence: https://o9solutions.com/solutions/supply-chain-planning/supply-chain-control-tower-docs
- "What Is a Supply Chain Control Tower? A Complete Guide" (Kristin Tracy, upd. 2026) — three layers (Visibility/Intelligence/Action), pre-alert, planner-override policy tracking, scenario templates: https://o9solutions.com/articles/what-is-a-control-tower-and-why-do-you-need-one
- "The 9 things a Supply Chain Control Tower will deliver" — root cause, common KPIs, aligned decisions: https://o9solutions.com/articles/the-9-things-a-supply-chain-control-tower-will-deliver
- Control Tower use cases (retail/CPG): https://o9solutions.com/resources/control-tower-use-cases
- Digital Brain platform — Sense → Model → Simulate → Decide → Execute → Learn: https://o9solutions.com/digital-brain
- Enterprise Knowledge Graph guide — 4 layers, 4Ws, post-game analysis: https://o9solutions.com/resources/a-guide-to-the-o9-enterprise-knowledge-graph
- Decision Intelligence: the 4Ws framework (W1 what happened · W2 why · W3 what next · W4 best actions; traceability + governance): https://o9solutions.com/articles/the-4ws-what-are-they-and-how-do-they-prevent-value-leakage
- Post-Game Analysis (PGA) product page — "system of record for plans and decisions", root-cause, storytelling: https://o9solutions.com/pga
- "What If Every Decision Taught You Something? … AI-Augmented Post-Game Analysis" — decision replay, override-vs-system, multi-cycle decision records: https://o9solutions.com/articles/what-if-every-decision-taught-you-something-the-rise-of-ai-augmented-post-game-analysis
- "How AI-Powered Post-Game Analysis Can Transform Enterprise Decision-Making" — PGA agent recommends actions and deep-links to workflow: https://o9solutions.com/articles/how-ai-powered-post-game-analysis-can-transform-enterprise-decision-making
- "o9 is Raising the Bar…" press release — specialized AI agents, 3Ws, PGA with learning models: https://o9solutions.com/news/o9-is-raising-the-bar-for-enterprise-planning-and-execution
- o9 AI info page (LLM-oriented factual summary): https://o9solutions.com/ai-info
- o9 Platform guide hub (login-gated wiki/API): https://guide.o9solutions.com/

**o9 UI screenshot assets (inspected)**
- Control Tower hero: https://cms.o9solutions.com/wp-content/uploads/2026/09/Supply-Chain-Control-Tower_Hero-scaled.png
- Control Tower UI card: https://cms.o9solutions.com/wp-content/uploads/2026/09/Supply-Chain-Control-Tower_UI-Card-scaled.png
- Supply Chain Planning UI card (supportability/inventory exceptions + tasks): https://cms.o9solutions.com/wp-content/uploads/2026/09/Supply-Chain-Planning_UI-Card-scaled.png
- Master-planning monitor photo (Material Exception): https://cms.o9solutions.com/wp-content/uploads/2026/01/o9_Mockup_Platform-SCPA-scaled.jpg
- Demand Planning UI card: https://cms.o9solutions.com/wp-content/uploads/2026/09/Demand-Planning_UI-Card-scaled.png
- Production Scheduling UI card: https://cms.o9solutions.com/wp-content/uploads/2026/09/Production-Scheduling_UI-Card-scaled.png
- AI/ML Forecasting UI card (Exceptions Review): https://cms.o9solutions.com/wp-content/uploads/2026/09/AI-ML-Forecasting_UI-Card-scaled.png
- Supply Chain Analytics UI card (overrides by reason code): https://cms.o9solutions.com/wp-content/uploads/2026/09/Supply-Chain-Analytics_UI-Card-1-scaled.png
- Allocation & Replenishment UI card (demand supportability): https://cms.o9solutions.com/wp-content/uploads/2026/09/Allocation-Replenishment_UI-Card-scaled.png
- S&OP UI card (process tracker/chart): https://cms.o9solutions.com/wp-content/uploads/2026/09/Sales-Operations-Planning-SOP_UI-Card-2-scaled.png
- Demand Sensing UI card (pacing/review details): https://cms.o9solutions.com/wp-content/uploads/2026/09/Demand-Sensing_UI-Card-1-scaled.png
- PGA Inventory executive summary + agent: https://cms.o9solutions.com/wp-content/uploads/2026/03/Inventory-PGA-new-scaled.png
- PGA scenario compare: https://cms.o9solutions.com/wp-content/uploads/2026/03/Inventory-PGA-2-scaled.png
- PGA Forecast demand variability: https://cms.o9solutions.com/wp-content/uploads/2026/03/Forecast-PGA-new-scaled.png
- PGA hero (planning grid + Gen-AI panel + scope): https://cms.o9solutions.com/wp-content/uploads/2026/06/PGA-hero-section-final-Jun-26.png

**Video (o9, 2023)**
- Unique Control Tower capability — unplanned maintenance (sense → translate → auto-scenarios → decide → learn, update resolution protocols): https://o9solutions.com/videos/the-unique-o9-control-tower-capability-unplanned-maintenance-example
- Unique Control Tower capability — demand surge: https://o9solutions.com/videos/the-o9-unique-control-tower-capability-demand-surge-example

**Third-party / adjacent**
- o9 2023 Q2 Release Notes (Scribd) — confirms "workspace / View / report / multi-dimensional properties and measures": https://www.scribd.com/document/883684808/2023-Q2-Release-Notes56b206c6c25a4dc18ab3226cb447f892-Copy
- o9 Platform UI Reporting configuration tutorial (Scribd; row/column/measure "pills"): https://www.scribd.com/document/923003001/1686318201-v2-Enterprise-Modelling-Tutorials-5-UI-Reporting
- "How to Structure a Demand Plan" (dimensions, hierarchies, levels, attributes, measures): https://o9solutions.com/videos/how-to-structure-a-demand-plan

---

## 10. One-line summary for FORGE

o9 proves that an **exception-first, ranked, drill-able table with plan-vs-actual deltas, typed+ranked constraints, captured override reason codes and `Traces(n)` provenance** is the winning grammar for an operational workbench. FORGE should adopt that grammar — but keep its own differentiator: **show the conflict and the provenance, and never collapse to a single recommended action.**