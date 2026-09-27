# Kinaxis (RapidResponse / Maestro) — Workbench & Order-Table Research
### Input to FORGE "decision room", middle-bottom order information table

**Prepared:** 2026-09-26  ·  **Analyst:** supply-chain software subagent
**Method:** web search + fetch of Kinaxis product pages, app brochures/PDFs, training catalogs, press releases, a UX designer's portfolio, and **actual embedded product screenshots extracted from Kinaxis PDFs**. Screenshots described below were extracted locally and read.

**Honesty note on source vintages (important):**
- The *concrete table/workbench screenshots* that reveal layout come from Kinaxis application brochures (© 2017–2018) and a 2024 press release. Kinaxis no longer publishes raw product-table UI on its marketing site, so the clearest evidence of the **order-workbench grid structure is 2017–2019 vintage** (Java client + first web client).
- *2024–2026 sources* confirm the **enduring concepts** (full-level pegging, semantic graph/ontology, gating constraints, role-based web UX, AI copilot + task flows) but do not show the same dense grid.
- Where I infer how a concept maps to FORGE, it is tagged **[inferred]**. Directly observed = **[cited]**.

---

## 0. TL;DR

Kinaxis does **not** use a flat one-table order list. It uses a **role-based workbook shell** containing:

1. a **fixed left navigator** (Product / Customer hierarchy) and a **filter toolbar** (Part, Site, View),
2. a **main grid** (the "worksheet") of order/commitment rows with **column-group headers** and a far-left **flag/signature column**,
3. one or more **stacked bottom worksheets** that act as the *detail / drill* pane — e.g. **"Impacted Orders"**, **"Component Tree"**, **"Late Supply"**, **"Supply Consumption"**,
4. **tabs** at three levels: app/workbook tabs (top), worksheet tabs (bottom), dashboard widget tabs,
5. an **exception taxonomy** (Changed / Early / Late / New / On Hold / To-Re-Promise) with **Total vs New** delta counts, ordered by severity and by **Days Late**,
6. **inline scenario compare** by placing **Baseline vs Action (e.g. "Order Manager") columns side-by-side**, and
7. **constraint/gating** shown as an actual column ("Gating Constraint") with an owning person, plus a component/pegging tree to explain *why*.

FORGE's nine columns map cleanly; the biggest structural steals are the **master/detail split with a tabbed detail pane**, the **exception category strip**, the **date-family column grouping**, and **inline Baseline-vs-Decision column pairs**.

---

## 1. How Kinaxis structures its order-fulfillment / control-tower workbench

### 1.1 The shell: role-based workbook, three levels of tabs, fixed navigator [cited]
Observed in the **Order Promising workbook** screenshot (Order Fulfillment brochure, p.2) and the **Master Scheduling** workbook screenshot (MPS brochure, p.2):

```
┌ Tabs:  Start | Customer Service Representative        ┐   ← role-based workbook (persona) tab
├ Breadcrumb/toolbar: Order Management · All Parts · R1001 · View: = All · Details>> ┤  ← active-filter breadcrumb
├──────────────┬──────────────────────────────────────────────────────────────────────┤
│ LEFT NAV     │  MAIN GRID (worksheet)                                                │
│ (fixed)      │  sticky identity cols … scrolling date/number cols                    │
│ Product tree │                                                                       │
│ Customer tree│───────────────────────────────────────────────────────────────────────
│              │  BOTTOM WORKSHEET TABBED DETAIL  (Impacted Orders / Component Tree /  │
│              │  Late Supply / Supply Consumption)                                    │
└──────────────┴──────────────────────────────────────────────────────────────────────┘
```

- **Top-level tabs** switch persona/workbook: the screenshot title bar reads **"Customer Service Representative"**; dashboards carry **"Order Status | Historical Metrics | Corporate Metrics"** tabs. A Master Scheduling workbook carries **"MPS Risks | Performance Metrics | Corporate Metrics"** tabs. → *Role-based workspace with metric tabs.*
- **Left navigator is a fixed hierarchy tree**: `Product → Cell Phone / Laptop / Tablet` and `Customer → Group 3 → BetterBuy, CallComp, Computers Eh?, MallMart, Mississippi Online Retail, WallyWorld`. It filters the grid and does not scroll away.
- **Filter toolbar** shows selected context as chips/breadcrumbs: `Order Management · All Parts · R1001 · View: = All`. → *Active filters are always visible, not hidden in a dialog.* **Steal this.**
- **Worksheet tabs at the bottom** switch the detail/analysis view under the same main grid.

### 1.2 Master/detail is two stacked grids, not a modal [cited]
- Order Promising workbook: **top grid = one row per part/site commitment**; **bottom grid = "Impacted Orders" = order-line detail** (Order Id, Order Site, Order Type, Line, CSR, Order Manager, plus Baseline/Order-Manager column pairs). The top grid is the *record*; the bottom is the *evidence/impact*.
- Master Scheduling workbook: **top grid = supply orders ("All Orders")**; **bottom tabbed detail = "Component Tree" / "Late Supply" / "Supply Consumption"**.
- The older **planning sheet** (MPS brochure lifestyle image, and described in the *Introduction to RapidResponse* video transcript) is the same idea: **"on the top half … high level demand and supply data and then on the bottom we can view specific details for products such as on hand inventory, demand orders, packed allocations and supply orders."** [video transcript]
→ *Top = summary/record, bottom = decomposable detail. This is exactly the FORGE master/detail expansion.*

### 1.3 Fixed vs scrolling [cited/inferred]
- **Fixed:** left hierarchy navigator, the filter breadcrumb bar, and the leftmost identity columns.
- **Scrolling:** the metric/date columns. In the **time-phased planning sheet** the layout is explicit: fixed left columns `Part | Site | View: Stack | Supply Site / Demand Site`, then **scrolling date buckets** (`06-05-17, 06-12-17, …`) with row categories `Demand / MPS Supply / Planned orders / Need to be Demand / Late Supply / Balance`. **[inferred from screenshot]** → For FORGE: freeze Order-id/customer/risk columns; let dates scroll.
- **Far-left "signature/flag" gutter** on every grid row (a small icon column, plus a row-number/selection column). **[cited]** → *Row identity + selection + annotation live in a slim fixed gutter.*

### 1.4 How exceptions are ranked / surfaced [cited]
The **Order Fulfillment dashboard** is exception-first. Widgets observed:

| Widget | What it shows |
|---|---|
| **Customer Orders for Action** | bar chart: categories **Changed, Early, Late, On Hold** |
| **New Orders to Promise** | stacked bar by request date, split **Frozen vs Slushy** |
| **Order Fulfillment Exceptions** | table: `Category | Total | New` → Changed 15/8, Early 4,666/3,599, Late **744/744**, New 13/9, On Hold 14/13, To Re-Promise **4,823/3,883** |
| **Orders on Hold** | horizontal bars **by hold code** (01) Finance, 02) Engineering, 03) Quality |
| **Orders Ready to Ship** | bar chart |

Two ranking mechanics are noteworthy:
1. **Total vs New** — "what changed *since* last look". The brochure states: *"Order Fulfillment Exceptions: Compares today's order fulfillment actions against a specific point in the past to examine what has changed."* → *This is your Lifecycle/Provenance column made into a **delta**.*
2. **Sorted/clustered by severity and Days Late** — in the Order Promising grid, late values render **red**, at-risk **yellow**, and **Days Late** runs 1,1,1,5,…,22. The "Customer Demands for Action" grouping is literally **late / on hold / modified / early / needs promise date**. → *Exception categories ARE the primary sort, not an arbitrary default.*

---

## 2. Column taxonomy for an order / demand row

### 2.1 Observed columns in the **Order Promising** worksheet [cited]
Header row (grouped):
```
Quantity▸            Revenue      Date▸ (Promised? Promise Request Due Available Planned Ship Receipt)   Available Receipt   Customer Request   Days Late
(Total Shipped Open On Time)
```
Row keys/axes: **Part · Site** (the grid is one row per Part×Site, indented under the Product hierarchy).

Interpretation of the **date family** (Kinaxis "two-date planning", order promising):
- **Request** — customer's requested date.
- **Available** — when supply is actually available (ATP-style availability / "supply available date"; Kinaxis holds patents for *"determining a demand promise date based on a supply available date"* and *"determining a promise date for a demand"*).
- **Promise** — the date being committed (the field a CSR negotiates).
- **Due** — the order's due date.
- **Planned Ship / Receipt** — downstream execution milestones.
- **Promised?** — a **checkbox column** (a per-row state flag, shown with a yellow fill).
- **Available Receipt / Customer Request** — secondary execution dates.
- **Days Late** — the derived risk quantity (integer days, red).
→ **Takeaway:** Kinaxis refuses to collapse requested vs available vs promised vs due into one "date". It shows all of them side-by-side. **FORGE's Promised, Capable(+Δ) columns are the same discipline.**

### 2.2 Other analytic columns Kinaxis names for Order Fulfillment [cited]
From the 2016.2 press release and the app brochure:
- **order priority**
- **fair-share allocation** ("divvy supply across DCs based on AllocationCalendar intervals" per a Kinaxis practitioner write-up)
- **two-date planning**
- **ATP / CTP** (available-to-promise / capable-to-promise) — *"model supply chain impacts through all component parts"*
- **hold codes** (why an order is blocked)
- **CSR / Order Manager** (owner)
- **Revenue** (value at risk)

### 2.3 The underlying engine / pegging [cited]
Calculated data is produced by three algorithms — **Netting, Capable-to-Promise (CTP), and Full-Level Pegging (FLP)** — that *"determine demand, allocate supplies, and connect allotments in the SupplyDemand table."* (Kinaxis "Calculated Data" training deck summary.) **Full-level pegging** is marketed across 2024–2026 pages: *"With full level pegging, instantly see impacts on finished goods, WIP, raw materials, or capacity."*
→ *Evidence for FORGE's semantic chain planned ≠ available ≠ eligible ≠ allocated ≠ committed ≠ shipped: Kinaxis keeps **allotment/pegging** as a first-class relation, not a single "available" number.*

**Proposed Kinaxis→FORGE column mapping [inferred]:**

| FORGE column | Kinaxis analogue(s) | Note |
|---|---|---|
| Risk rail | flag gutter + red/yellow row state + "Customer Orders for Action" category | severity, not a single score |
| Order/commitment (id+customer) | Order Id / Line + Customer tree | identity |
| Product·qty | Part · Site + Quantity group (Total/Shipped/Open/On Time) | grouped, not one number |
| Promised | Promise (+ Promised? flag) | committed date |
| Capable (+Δ) | Available / CTP + Days Late | capability & delta |
| Binding constraint | **Gating Constraint** (+ responsible) | see §4 |
| Feasibility | ATP/CTP result + hold/exception category | binary + reason |
| Lifecycle | Status + Frozen/Slushy + Order Type | zone/state |
| Provenance | Assumptions/notes + source system + "Exceptions vs past" | traceability |

---

## 3. Plan vs execution discrepancy & pegging (demand → supply)

### 3.1 Plan/execution vs action shown *inline, side by side* [cited]
The **Impacted Orders** detail grid shows paired columns:
```
Revenue (Baseline | Order Manager)  ·  Part (Baseline | Order Manager)  ·
Site (Baseline | Order Manager)     ·  Quantity (Baseline | Order Manager)
```
So the same detail row carries **the baseline plan value and the proposed/decision value in adjacent columns** — a scenario diff baked into the table rather than a separate compare screen.
- Elsewhere, Kinaxis has a dedicated **"Compare"** action for scenarios (Collaboration Center screenshot: buttons **`Create New · Add Existing · Compare`**), but the per-record view already shows **baseline vs changed**.
→ *This is precisely FORGE's "conflicts between systems shown not resolved" principle, already implemented by Kinaxis as Baseline-vs-Action column pairs.*

### 3.2 Plan-vs-actual / period-over-period [cited]
- **Unconstrained vs constrained** (S&OP): demand-plan rows `Annual Plan, Finance, Sales, Marketing, Statistical, Adjustments → Unconstrained Demand Plan, Unconstrained Baseline, Unconstrained Event Impact, Previous Demand Plan, Demand Plan at Risk, Assumptions`.
- **Order Fulfillment Exceptions** widget = today vs a chosen past date.
- **Demand at Risk / Revenue at Risk** as named metrics (also surfaced in Maestro 2024 copilot).

### 3.3 Drilling from an order to its pegs [cited]
- In the Order Promising grid, right-clicking a cell opens a context menu whose visible items are:
  **`Resolve Order Issues`**, **`Inventory in Other Locations`**, **`Incremental Availability`**.
- In Master Scheduling, the detail pane tabs are **`Component Tree` / `Late Supply` / `Supply Consumption`** — the **Component Tree** is an indented, expandable tree (`L2500-11 → D2501 → D2500/D2510 …`) showing which lower-level item is late and its **Gating Constraint** + owner.
- Kinaxis also exposes **BOM and network visualizations** (2019 press release) and **traceable impact paths** across a **semantic graph** (2026): *"Follow connections across the graph to understand how a change creates downstream impacts."*
→ *Pattern: an order row expands into a **pegging/component tree** where the **gating node is highlighted** and offers actions; not just a list of pegs.*

---

## 4. Constraints / gating factors & recovery actions

### 4.1 Gating constraints are a real column with an owner [cited]
In the **Late Supply** detail grid the last column is literally **"Gating Constraint"**, containing e.g. `CA1001 E3001` plus a **responsible person** ("Connie Strain…"). Training catalog confirms the workflow: *"adjust gating constraints… edit assumptions and create new assumptions to show the reasoning for any constraint changes."*
→ *FORGE's "Binding constraint" column is directly precedented — and Kinaxis attaches a **human owner** and **reasoning/assumptions** to it.*

### 4.2 How constraints are diagnosed [cited]
- **"Number of Constraints Overloads/Underloads"** dashboard: bars split into **Overloads Critical / Overloads Warning / Underloads Warning / Underloads Critical**, by period.
- Constraint properties have **rate** and **factor**; analysts can *"modify existing constraints … by pre-building and shifting load"* and *"analyze the impact of constraint changes using a scorecard."*
→ *Over/under-load with severity tiers is a good model for a "Feasibility / constraint pressure" cell instead of a raw red dot.*

### 4.3 Recovery actions ([cited unless noted])
| Surface | Actions |
|---|---|
| Order grid right-click | Resolve Order Issues · Inventory in Other Locations · Incremental Availability |
| Inventory dashboard table | **Recommended Actions** column: `Postpone (0) · Cancel (0) · Decrease (0) · …` |
| Scenario panel | `Create New · Add Existing · Compare` |
| Maestro 2024 copilot | suggests a **task flow**: *"Launch Handle Supply Exceptions task flow"* |
| Order Fulfillment process | **re-promising** ("resolve customer orders that have become late / early"); execute decision back to **ERP** |
| Exception list | orders grouped by **hold code** |
→ *FORGE should make actions **row-scoped and named** (re-promise, re-source, substitute, pull-in) rather than a generic "Fix" — and should show a **recommended action** column.*

---

## 5. Concrete UI patterns worth stealing — and anti-patterns

### Steal
1. **Role-based workbook shell** (`Customer Service Representative`) with **metric tabs** (`Order Status | Historical Metrics | Corporate Metrics`). *FORGE: the room should be one persona-aware workspace, not a fixed page.*
2. **Master grid + tabbed bottom detail pane** sharing the same filter context (`Impacted Orders`, `Component Tree`, `Late Supply`, `Supply Consumption`). No modal for the drill.
3. **Exception category strip with Total vs New** (Changed/Early/Late/New/On Hold/To-Re-Promise). *Decays the "what changed since I last looked?" problem; maps to FORGE Lifecycle.*
4. **Column-group headers** (`Quantity`, `Date`) so units and families are unambiguous; never mix $ and units silently.
5. **All dates side-by-side** (Request · Available · Promise · Due · Planned Ship · Receipt) — no single misleading "date".
6. **Inline Baseline-vs-Decision column pairs** rather than a separate compare screen.
7. **"Promised?" per-row checkbox** + a state/flag gutter — a row-local commit control, distinct from the table's data.
8. **Gating Constraint column with an owner/responsible and assumptions** — reasoning attached to the constraint, satisfying "every number traces to a source".
9. **Row-scoped action menu with named resolutions** (Resolve Order Issues / Incremental Availability / Inventory in Other Locations) and a **Recommended Actions** column.
10. **Held/blocked reasons as codes** (hold codes) — a compact, filterable reason dimension.
11. **Context panel collaboration** with `@mentions`, activity feed, participants, and scenario cards (`Compare`).
12. **Copilot that ends in an action/deep-link** (task flows, "add this chart and filter by region"), not just prose. Maestro 2024 shows the assistant both editing the dashboard and offering a workflow launch.
13. **Colour semantics used sparingly**: red = late, yellow = at-risk/edited. Held consistent across grids.

### Avoid (anti-patterns)
- **Multi-level modal dialogs** — explicitly called out by the Kinaxis UX lead as the thing to kill in the rewrite ("cluttered multi-level modal dialogs", "overuse of modal dialogs").
- **Dense un-grouped spreadsheets**: the Java planning sheet is powerful but "cluttered"; the web client wins on task-completion speed. Keep density but with group headers, freezes, and clear hierarchy.
- **Percentages without a defined denominator** — Kinaxis only publishes percentages with an explicit definition (e.g. *"On-Time Delivery to Request: … percentage, by period, of **order lines** available on or before their request date"*). FORGE's "no percentage unless a defined quantity" is well-founded.
- **Alert inflation** — Kinaxis separates *exception category* from *recommended action*; don't render every cell as an alarm.
- **Filter state hidden in dialogs** — Kinaxis keeps the active filter breadcrumb visible at all times.

---

## 6. Public screenshots / imagery that reveal the layout (described)

All images below were fetched and read. "Extracted" = pulled from the official PDF's embedded images.

1. **Order Fulfillment dashboard** — extracted from *Order Fulfillment* app brochure, p.2.
   URL: https://www.kinaxis.com/sites/default/files/appbro-order-fulfillment-interactive.pdf
   Shows: a tiled dashboard. Top tabs `Order Status | Historical Metrics | Corporate Metrics`. Widgets: `Customer Orders for Action` (bars: Changed/Early/Late/On Hold); `New Orders to Promise` (stacked bars Frozen vs Slushy by request date); `Order Fulfillment Exceptions` table (`Category | Count: Order Management Total | New`); `Orders on Hold` (bars by hold code 01 Finance, 02 Engineering, 03 Quality); `Orders Ready to Ship`.

2. **Order Promising workbook** — extracted from same brochure, p.2. **The single most important image for FORGE.**
   Shows: top tab `Customer Service Representative`; breadcrumb `Order Management · All Parts · R1001 · View: = All · Details>>`; **fixed left tree** (Product: Cell Phone/Laptop/Tablet; Customer: Group 3 → BetterBuy, CallComp, Computers Eh?, MallMart, Mississippi Online Retail, WallyWorld); main grid grouped as `Quantity(Total Shipped Open On Time) · Revenue · Date(Promised? Promise Request Due Available Planned Ship Receipt) · Available Receipt · Customer Request · Days Late`, rows per `Part × Site (R1001)` with red late values and a signature/flag gutter; a right-click menu (`Resolve Order Issues / Inventory in Other Locations / Incremental Availability`); and a **bottom worksheet "Impacted Orders"** (Order Id, Order Site, Order Type, Line, CSR, Order Manager, then **Baseline vs Order Manager** pairs for Revenue/Part/Site/Quantity/Priority).

3. **Master Scheduling workbook** — extracted from *Master Production Scheduling* brochure, p.2.
   URL: https://www.kinaxis.com/sites/default/files/resources/Kinaxis-RapidResponse-MasterProductionScheduling.pdf
   Shows: top tab `Master Scheduling`; toolbar filters `Master Productio… · All Items · R1001 · Part: L2500-11 · = All Suppliers = · Late Orders`; **top grid "All Orders"** (Supplier, Number:Line, Campaign, Part, Site, Description, Responsible, Type, Status, Priority, Late Lines, Due, Available, Days Late, Quantity) with a yellow-highlighted row; **bottom worksheet tabs `Component Tree | Late Supply | Supply Consumption`**; the `Late Supply` grid has an indented hierarchy (L2500-11 → D2501 → D2500/D2510) and ends with a **`Gating Constraint`** column including a responsible person.

4. **Time-phased planning sheet** (lifestyle laptop image) — same brochure, p.1. Shows fixed left columns `Part · Site · View: Stack · Supply Site/Demand Site`, then scrolling date buckets with rows `Demand / MPS Supply / Planned orders / Need to be Demand / Late Supply / Balance`, red/orange shortage cells, and a `Currency Stack Chart` below. Confirms **fixed-left + scrolling-time-model** layout.

5. **Order Fulfillment dashboard (MPS variant)** — extracted MPS brochure, p.2. Tiled widgets `Master Scheduling Summary`, `Misaligned MPS Parts to Demand`, `Number of Constraints Overloads/Underloads` (Critical/Warning tiers), `MPS Attainment %`.

6. **Collaboration Center / scenario compare** — extracted from *Inventory Management* brochure, p.2. URL: https://www.kinaxis.com/sites/default/files/appbro-inventorymanagement-interactive_0.pdf
   Shows modern web-client shell: title `T1000 Order Policy — "Can we use a different Order Policy for this part?"`; **SCENARIOS** card list with buttons `Create New · Add Existing · Compare`, scenario cards `S&OP Candidate`, `Order Policy Change`; right **PEOPLE** pane (Add, Ian P. Lanner – Inventory Planner, Calum Macdonald – Buyer), a **post/@mention** box, and an **ACTIVITY** feed. Direct precedent for FORGE's right copilot/activity region.

7. **Inventory dashboard with exceptions + recommended actions** — same brochure, p.2. Bottom-left table: `Recommended Actions | Number of Orders` with rows `Postpone 0, Cancel 0, Decrease 0`; `Inventory Exceptions` list (`Parts Below Minimum Periods of Supply Target`, `Parts Above Maximum…`, `Late Demand Orders Impacting Revenue`, `Parts With Checkout Risk`).

8. **Consensus Demand Plan workbook (Java client)** — extracted from *Demand Planning* brochure, p.2. URL: https://www.kinaxis.com/sites/default/files/appbro-demandplanning-interactive.pdf
   Shows the older menu bar (`FILE EDIT VIEW GO TOOLS DATA HELP`), worksheet tabs (`… Units Summary`, `… Units Chart`, `Demand Plan History`, `Confidence Interval`, `Dependent Demand Plan Details`), left Product tree, and a grid where the bottom row is literally **`Assumptions`** — traceability of what changed the number.

9. **Maestro 2024 (modern UX)** — 2024 Kinexions press-release images.
   URL: https://pressreleasehub.pa.media/article/introducing-maestro-the-first-ai-infused-supply-chain-orchestration-platform-from-kinaxis-21081.html
   Shows: a **copilot pane** (chat + `New chat`, message bubbles, suggested **task flow** "Launch Handle Supply Exceptions task flow") beside a **dashboard canvas** with a filter-chip toolbar (`All Parts`, `Pacific Northwest`, `Product`, `Before planning date 6 mon…`) and chart cards (`Demand Plan Revenue`, `Demand Forecast`, `Stock outs for critical components`). Confirms the **assistant-in-workspace + canvas** pattern.

10. **RapidResponse Web Client redesign (dashboards / scorecards / scenario management)** — UX portfolio of a Kinaxis designer.
    URL: https://www.nancyxu.com/rapidresponse-web-client
    Explicitly documents the design rationale: kill "cluttered multi-level modal dialogs", "overuse of modal dialogs", "lengthy task completion times"; introduce a design system ("Parcel"); web-native **dashboards, scorecards, scenario management**. Useful for *why* the modern shell looks as it does.

---

## 7. What FORGE should adopt for the middle-bottom order table (concrete)

Ordered by leverage. Each item is implementable in the existing nine-column design.

1. **Two-tier master/detail with a *tabbed detail pane* (not a modal).**
   Top = one row per customer order/commitment (the nine columns). Selecting a row opens a detail region **below** (or replaces the plant floor plan on demand) with tabs: **Pegs**, **Supply/Allocation**, **Constraint path**, **History & versions**, **Draft edits**. Mirrors Kinaxis's grid + `Impacted Orders / Component Tree / Late Supply / Supply Consumption`.
2. **Exception category strip above the table with Total vs New/Changed counts.**
   e.g. `At risk · Late · Changed · Held · New · Awaiting commit`, each showing `N total / Δ since last review`. Click filters the table. Gives you Kinaxis's "Orders for Action" + "Exceptions vs a point in the past" in the space of a headline. Serves the Risk rail and Lifecycle.
3. **Column-group headers.** `Identity | Quantity | Dates | Constraint | Feasibility | Lifecycle | Provenance`. Put the outcome in the header, keep first-class columns underneath. Prevents the classic "which number did you mean?" ambiguity.
4. **Show all dates side-by-side, never collapsed.** `Requested · Available(ATP) · Capable(CTP) · Promised · Planned ship · Actual`, plus `Δ days`. This is Kinaxis two-date planning and directly satisfies planned ≠ available ≠ eligible. Keep your `Promised` and `Capable (+Δ)` as two of this family, not standalone.
5. **Conflicts unresolved as *paired columns*, not a verdict cell.** For any disputed number show `Source A | Source B` (or `Baseline | Decision`) adjacent, e.g. `Promised: SAP 12 Oct | Forge 19 Oct`. Kinaxis's `Baseline | Order Manager` pairs are the precedent; it keeps the discrepancy visible and auditable.
6. **A slim fixed gutter + frozen identity/risk columns.** Leftmost: risk/status flag, row priority, annotation marker, selection. Freeze Order-id/customer/risk; scroll dates and provenance. Kinaxis's flag gutter and fixed left columns.
7. **Make "Binding constraint" a first-class column with an owner and a reason.** Value + **responsible role/person**, and a click that opens the **constraint path** in the detail pane (which node is gating, over/under-load, severity Critical/Warning). Adopt Kinaxis's over/under-load severity tiers instead of a single red dot. Keep no percentage without a named denominator.
8. **Per-row commit state + draft editing inline.** A `Committed?`/`Promised?` **checkbox column** and inline edits shown as **pending (yellow)** vs committed, consistent with the risk colours (red = late, amber = at-risk/draft). Kinaxis's "Promised?" flag + `Frozen/Slushy` zones.
9. **Pegging drill = order → pegs tree with the gating node highlighted.** In the detail pane render the demand→supply pegs as an indented tree (and terminate at the gating element). Offer **row-scoped, named actions** (`Re-source`, `Pull in`, `Substitute`, `Re-promise`, `Split`) from a context menu — matching Kinaxis's `Resolve Order Issues / Incremental Availability / Inventory in Other Locations`.
10. **Provenance as an expandable per-row thread, and a "recommended action" column.** Inline: source system + timestamp + version; expand to a short **assumptions/notes** thread (Kinaxis "Assumptions" row / "edit assumptions to show reasoning"). Add a `Recommended action` cell (`Postpone / Re-source / Re-promise / None`) as Kinaxis does on its Inventory dashboard.

*(If you must cut to 5: items 1, 2, 4, 5, 7.)*

---

## 8. ASCII wireframe — a Kinaxis-style order workbench (inferred from the above)

```
┌ Start ▏Customer Service Representative ✕ ▏Order Promising ✕ ───────────────────────────────────────────┐
│ ▤ Order Management · All Parts · Site:R1001 · View:=All · [At risk][Late][Changed][Held][New]  Details»│
├──────────────────┬──────────────────────────────────────────────────────────────────────────────────────┤
│ PRODUCT/CUSTOMER │  ▣ GROUP HEADER →  Identity     │  Quantity        │   Dates              │ Constraint │
│ (fixed nav)      │  ────────────────────────────────┼──────────────────┼──────────────────────┼────────────┤
│ ▾ Product        │  ⚑ Pr │ Order · Customer         │ Prod     Qty  Δ  │ Req   Avail  Capable │ Gating  Own│
│   ▾ Cell Phone   │      │                          │                  │      (ATP)  (CTP)    │            │
│   ▸ Laptop       │      │                          │ Promised?  Prom │ Due   Ship   Days↕  │ Feasibility│
│   ▸ Tablet       │  ────┼──────────────────────────┼──────────────────┼──────────────────────┼────────────│
│ ▾ Customer       │  1 ▲ │ CO-8841 · BetterBuy      │ CP-300  1,200 0  │ ☐ 10-12 10-14 10-19  │ PMP-01  J.Lee│
│   ▸ Group 3      │  2 ▲ │ CO-8842 · MallMart       │ CP-300    908-186│ ☑ 10-12 10-24 10-24  │ CAP-07  K.Ot │
│     BetterBuy    │  3   │ CO-8843 · CallComp       │ MN-10     150 -75│ ☐ 10-15 10-15 10-28  │ SUB D2501 M.C│
│     CallComp     │  4   │ CO-8844 · Computers Eh?  │ LAP-7   2,636   0│ ☑ 10-20 10-18 10-18  │ —          — │
│     MallMart     │  …   │                          │                  │                      │            │
├──────────────────┴──────────────────────────────────────────────────────────────────────────────────────┤
│ ▏Impacted Orders ▏Pegs / Component Tree ▏Supply & Allocation ▏Constraint Path ▏History ▏Draft edits ▏   │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Pegs for CO-8842 · MallMart (demand → supply)                          [Re-source] [Pull in] [Re-promise]│
│   Order CO-8842  CP-300  908 ea  ·  Requested 10-12 · Promised 10-24  Days Late 12                     │
│   ├─ Peg → Planned Order PO-5510  (site R1001)       Qty 600   Avail 10-20   ▸ Baseline 10-24 = 10-24  │
│   ├─ Peg → Transfer  TO-9912  (DC West)              Qty 308   Avail 10-24   ▸ Baseline 10-30 → 10-24  │
│   └─ ⚠ GATING: Component D2501 "Screen Assembly"     Need 10-22  Avail 10-28   Gating: CAP-07 · K.Otto  │
│        └─ reason: Capacity overload Critical (w48) · shift +2d feasible · assumption "OT approved 9/24" │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
Legend:  ▲ red = late   ▲ amber = at-risk / draft   ☐/☑ = Promised flag   ▲ flag = risk gutter  ⚠ = gating node
         columns either side of "│" may be paired as  SourceA | SourceB  (e.g. SAP | Forge) to keep conflicts visible
```

---

## 9. Sources

**Kinaxis product pages (2024–2026)**
- Order Management — https://www.kinaxis.com/en/solutions/order-management-system
- Control tower & visibility — https://www.kinaxis.com/en/solutions/supply-chain-control-tower-and-visibility
- Supply chain optimization (ATP/CTP, "traceable to the assumptions") — https://www.kinaxis.com/en/what-sc-optimization
- Semantic graph & ontology ("traceable impact paths", "grounded AI context") — https://www.kinaxis.com/en/semantic-graph
- User experience ("orchestrated work", role-based, modern web) — https://www.kinaxis.com/en/user-experience
- Maestro platform — https://www.kinaxis.com/en/solutions/platform
- Introducing the Kinaxis Maestro platform (2024-06-21; Maestro is RapidResponse's evolution) — https://www.kinaxis.com/en/blog/introducing-kinaxis-maestro-platform
- Consumer products (Full level pegging) — https://www.kinaxis.com/en/industries/consumer-products
- Live Lens Insights — https://www.kinaxis.com/en/solutions/live-lens-insights
- Maestro Agent Studio press release (2026) — https://www.kinaxis.com/en/news/press-releases/2026/kinaxis-introduces-maestro-agent-studio-unlocking-next-level-decision

**Kinaxis app brochures / PDFs (screenshots extracted from these)**
- Order Fulfillment brochure — https://www.kinaxis.com/sites/default/files/appbro-order-fulfillment-interactive.pdf (also https://www.kinaxis.com/sites/default/files/resources/Kinaxis-RapidResponse-OrderFulfillment.pdf)
- Master Production Scheduling — https://www.kinaxis.com/sites/default/files/resources/Kinaxis-RapidResponse-MasterProductionScheduling.pdf
- Demand Planning — https://www.kinaxis.com/sites/default/files/appbro-demandplanning-interactive.pdf
- Inventory Management — https://www.kinaxis.com/sites/default/files/appbro-inventorymanagement-interactive_0.pdf
- Sales & Operations Planning — https://www.kinaxis.com/sites/default/files/appbro-sop-interactive_0.pdf
- High-tech & electronics industry spotlight (end-to-end full-level pegging; constraint management) — https://www.kinaxis.com/sites/default/files/high-tech-electronics-industry-spotlight-kinaxis.pdf
- Reducing response times to customer demands (EMS case study; "component to sales order allocation and pegging") — https://www.kinaxis.com/sites/default/files/2017-12/reducing-customer-demand-response-times-ems-case-study-kinaxis.pdf
- Improving order-promise efficiency (Celestica case study; shared-material impact of commits) — https://www.kinaxis.com/sites/default/files/2017-12/improving-order-promise-efficiency-celestica-case-study-kinaxis.pdf
- Knowledge Services course catalog (Order Fulfillment: promise/re-promise, order promising zones, key dates; Capacity Planning: gating constraints, assumptions, over/under-load) — https://www.kinaxis.com/sites/default/files/knowledge-services-course-catalog-kinaxis-aug2018.pdf

**Press releases**
- 2016.2 release (order priority, fair-share allocation, two-date planning) — https://investors.kinaxis.com/news-releases/news-release-details/2016/Kinaxis-Unveils-New-Capabilities-for-Superior-Supply-Chain-Management-with-Latest-Product-Release/default.aspx
- 2019 "Reshapes the Planning Experience" (Live Lens, BOM/network visualization, drag-and-drop reports) — https://www.kinaxis.com/en/news/press-releases/2019/kinaxis-reshapes-planning-experience-new-data-visualization-and-analysis
- 2024 Kinexions Maestro launch (with Maestro 2024 UI screenshots) — https://pressreleasehub.pa.media/article/introducing-maestro-the-first-ai-infused-supply-chain-orchestration-platform-from-kinaxis-21081.html

**UX / design**
- Nancy Xu, "RapidResponse Web Client" (Kinaxis UX lead; rationale for killing modal dialogs; dashboards/scorecards/scenario management) — https://www.nancyxu.com/rapidresponse-web-client

**Background / corroboration**
- "Understanding Calculated Data in RapidResponse" (Netting, CTP, Full-Level Pegging; SupplyDemand allotments) — https://www.coursehero.com/file/238856408/Kinaxis-RapidResponse-Calculated-Datapptx
- YouTube "An Introduction to Kinaxis RapidResponse Supply Chain Planning Solution" (transcript: planning sheet top=summary / bottom=detail; demand order analysis drill; recommended dates) — https://www.youtube.com/watch?v=EZv6uAIhobg
- Order promising ATP/CTP definitions (corroboration) — https://learn.microsoft.com/en-us/dynamics365/business-central/sales-how-to-calculate-order-promising-dates
- Pegging definition (corroboration) — https://www.gocomet.com/blog/pegging-supply-chain-explained
- Kinaxis 2021 AIF (patents: "Determining a Promise Date for a Demand", "Demand Promise Date based on a supply available date"; Live Lens "end-to-end pegging") — https://s25.q4cdn.com/729569956/files/doc_financials/2022/ar/Kinaxis-AIF-2022-Final.pdf

**Locally extracted assets (this research):**
- `/private/var/folders/w2/pmr31n2s0k9_6xk04p0nhsyh0000gn/T/opencode/kinaxis/imgs/of_p2_0_Im0.jpg` (Order Fulfillment dashboard)
- `…/imgs/of_p2_1_Im1.jpg` (Order Promising workbook + Impacted Orders)
- `…/imgs2/mps_p2_1_Im1.jpg` (All Orders + Component Tree/Late Supply + Gating Constraint)
- `…/imgs2/mps_p1_0_Im0.jpg` (time-phased planning sheet)
- `…/imgs2/inv_p2_1_Im1.jpg` (Collaboration Center / scenario compare)
- `…/imgs2/inv_p2_0_Im0.jpg` (exceptions + recommended actions)
- `…/imgs2/demand_p2_1_Im1.jpg` (Consensus Demand Plan + Assumptions row)
- `…/imgs3/maestro_6…jpg`, `maestro_8…jpg`, `maestro_10…jpg` (Maestro 2024 copilot + dashboard canvas)