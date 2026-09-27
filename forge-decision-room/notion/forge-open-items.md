# FORGE Decision Room — Open Item List

> Every open item across the FORGE Decision Room documentation set: decisions that need a call, clarifications/unknowns, blocked work, defect-derived items, and outstanding placeholders. One place to answer "what is still open and who owns it".

| Field | Value |
|---|---|
| Document | FORGE Decision Room — Open Item List |
| Version | v0.7 |
| Status | 🟡 Active — consolidated open items |
| Owner | Product Management |
| Sources | PM hub · COOLIT plan · Data & Algorithm Gaps · Delivery Plan · AI Chat Build Plan · Algorithms Build Design · Execution Task List · the five design pages |
| Last updated | 2026-09-26 |

**Owners (functions):** PM = Product Management · BE = Backend/API · AI = AI/reasoning · DATA = Data modelling · FE = Frontend/UX · QA = Backend/API (verification) · GOV = Governance/Policy · BIZ = Business/pitch.

---

## 0. How to read

- **Type:** 🧭 Decision (needs a call) · ❓ Clarification (fact unknown) · 🚧 Blocker (work stopped) · 📌 Placeholder (doc gap) · 🐞 Defect.
- **Recommendation** is the current proposal, not a decision. Status becomes "Decided" once a row in the PM decisions log closes it.

---

## 1. Decisions needed

| ID | Type | Item | Options | Recommendation | Owner | Blocks |
|---|---|---|---|---|---|---|
| OI-01 | 🧭 | Single site or site switcher | single now · multi-site | single site now | PM | D-22; floor scope |
| OI-02 | 🧭 | Canonical shift-role name | "Shift Executive" · "Shift Planner" | "Shift Executive" in UI | PM | D-09; persona labels |
| OI-03 | 🧭 | November (COM-0991) modelled or declared out | model once W5 · declare out | model once W5 lands | PM | D-12 |
| OI-04 | 🧭 | Maintenance window run: same or separate | separate maintenance run · same run | separate run, same snapshot | PM | M4 design |
| OI-05 | 🧭 | Authority model | resolve on policy · non-persona actor | resolve on policy (demo) | PM | G-04; N-04 |
| OI-06 | 🧭 | Floor renders all zones or open-decision zones | open + toggle · all | open-decision + full-plant toggle | PM | UT-02 |
| OI-07 | 🧭 | North-star metric | receipt-backed completion · decision time · revenue · fewer bad commits | receipt-backed completion in one snapshot | PM | metrics |
| OI-08 | 🧭 | Backend allowed for AI chat (server tier) | thin server · static-only | thin server, feature-flagged | PM + BE | P-03, P-04, X-* |
| OI-09 | 🧭 | Model/provider + key for chat | sciforium OpenAI-compatible · other | sciforium endpoint, key server-side | AI + BE | X-04 |
| OI-10 | 🧭 | Real solver or simulated latency | deterministic result + simulated stream · live | simulated async `SolverRunEvent` | AI | U-03 |
| OI-11 | 🧭 | Persistence | JSONL + in-memory · SQLite | JSONL now | BE | P-07 |
| OI-12 | 🧭 | Unstructured retrieval in v1 | no (structured-only) · RAG | no RAG in v1 | AI | X-04 |
| OI-13 | 🧭 | Hackathon scope | full P0–P7 · M1–M3 slice | M1–M3 slice first | PM | sequencing |
| OI-14 | 🧭 | Forecast horizon | records-only · rolling forecast | records-only until history exists | AI | A-02 |
| OI-15 | 🧭 | Uncertainty depth | deterministic + paired deltas · robust Γ | deterministic first | AI | A-10 |
| OI-16 | 🧭 | DES for stochastic alternatives | defer · build | defer until after M5 | AI | B-11 |
| OI-17 | 🧭 | CP-SAT/WASM version pinning | pin one artifact · none | pin one, freeze `solverSig` | AI | B-07 |
| OI-18 | 🧭 | Changeover matrix (sequence-dependent setup) | add matrix · cut feature | add, or explicitly cut | DATA + AI | D-12, B-07 |
| OI-19 | 🧭 | Solver seam now vs later | `OptimizationPort` now · later | precomputed now, Port later | AI | K-09 |
| OI-20 | 🧭 | Objective policy + `policyGap` | lexicographic · weighted | lexicographic | PM + AI | B-08 |
| OI-21 | 🧭 | Hosting target (SSE-capable) | named host · none | decide with P-03 | BE | P-11 |
| OI-22 | 🧭 | Individual owner names | name · function-only | confirm at M0 kick-off | PM | RACI |
| OI-23 | 🧭 | Evidence surface placement | drawer · dedicated half-pane | ✅ Decided — drawer (implemented in the right pane) | FE | — |
| OI-24 | 🧭 | Panes fixed vs resizable | fixed · resizable/collapsible per persona | decide before UT-01 | FE | §1 UI/UX |
| OI-25 | 🧭 | Order-table columns + per-role emphasis | §4 nine-column set · bespoke | ✅ Nine-column set implemented (ledger); freeze per-role emphasis | FE + PM | §4 UI/UX |
| OI-26 | 🧭 | Z-ELEC fold + Thermal/FAT routing | fold Z-ELEC · keep; all products via Thermal/FAT · some | confirm before freezing routing | DATA | D-05 |
| OI-27 | 🧭 | Floor coordinates + Pack+Ship vs Shipping Staging ownership | — | freeze with the zone master | DATA + FE | UT-02 |
| OI-28 | 🧭 | Demo hero commitment + ROI metric | COM-1042 · other; time · revenue · fewer bad commits | confirm before demo | BIZ + PM | demo |
| OI-29 | 🧭 | Live demo vs fallback data | live · scripted fallback | both (fallback required) | BIZ + BE | P-10 |
| OI-30 | 🧭 | Automated vs manual persona acceptance | scripted · manual | scripted harness | QA + PM | T-12 |
| OI-32 | 🧭 | Canonical master IDs + synthetic vs derived | confirm set · — | `MS-2026-09-26` set introduced (`master.ts`); freeze ids | DATA | masters |
| OI-33 | 🧭 | Thread model | one thread per commitment · per-role | one thread per decision, role-filtered | PM | right pane |
| OI-34 | 🧭 | Maintenance manager originates scenarios? | maintenance-only · none | originate maintenance scenarios only | PM | W3 |
| OI-51 | 🧭 | Order-table region placement | middle-bottom under the Layout view · whole centre | middle-bottom (§1 region model); centre splits top/bottom | FE | UT-09 |
| OI-52 | 🧭 | Middle-top Layout (floor plan) | build now · after M3 | ◐ **Layout pane built** (four-region layout); **floor SVG render pending (UT-02)** | FE + DATA | UT-02 |
| OI-53 | 🧭 | **Rate-schema authority** — three rate fields coexist (`ratePerDay`, op `stdRate`, `runMinutesPerUnit`) | `runMinutesPerUnit` canonical · `ratePerDay` canonical · reconcile all | `runMinutesPerUnit` (duration) + `ratePerDay × concurrency` (capacity); declare the rest derived | DATA + AI | DG-01, AG-01 |
| OI-54 | 🧭 | **Capacity contract** — whole-day disjunctive vs rate-based cumulative | rate-based cumulative (shift buckets) · whole-day disjunctive | rate-based cumulative: duration in minutes, capacity = rate × `nominal_concurrent_units` × derate | AI + DATA | DG-02/DG-03, AG-01/AG-02 |
| OI-55 | 🧭 | **Scale strategy** — monolithic MIP vs rolling horizon | rolling 45 d + dispatch(critical-ratio/ATC) + local search · monolithic MIP | rolling horizon; MIP only for bounded windows with a 1–2% policy gap | AI | AG-02…AG-04 |
| OI-56 | 🧭 | **AIB as the schedule input** — wire AIB v1, retire the provisional fixture | wire AIB v1 · keep provisional | wire AIB v1 into `test:coolit` and the solver; provisional fixture retired | AI + QA | B-06, B-19 |
| OI-59 | 🧭 | **P-week → date mapping** for `capacity_bucket` (`2026-P##` has no dates) | add a mapping table · regenerate capacity on the schedule's date/H keys | add a `P-week → date` mapping (or regenerate on H keys) | DATA | DG-15, AG-17 |
| OI-60 | 🧭 | **`capacity_bucket.planned_minutes` reconciliation** | recompute from CURRENT · keep as-is | recompute `planned_minutes`/bands from the CURRENT schedule | DATA | DG-16 |
| OI-61 | 🧭 | **Schedule scope** | CURRENT only · include superseded | enforce `schedule_state = CURRENT` in every run | AI | DG-18, AG-17 |
| OI-62 | 🧭 | **20 unlinked commitments** | link to WOs · mark forecast-only | link, or explicitly flag forecast-only | DATA + PM | DG-17 |

---

## 2. Clarifications / unknowns

| ID | Type | Item | Owner | Note |
|---|---|---|---|---|
| OI-36 | ❓ | Do all products route through Thermal/Flow + FAT? | DATA | Floor shows both test stages + FAT |
| OI-37 | ❓ | Floor `floorX/floorY` per zone | DATA | Needed for the plan render |
| OI-38 | ❓ | Which zone owns Pack+Ship vs Shipping Staging | DATA | Overlap in the drawing |
| OI-39 | ❓ | Canonical IDs for new masters | DATA | Plan proposes ids; not frozen |
| OI-40 | ❓ | Which fixture values are synthetic vs derived | DATA | e.g. 304 recomputed from segments |
| OI-41 | ❓ | Persona-lensed column emphasis per role | FE + PM | §4 UI/UX |
| OI-42 | ❓ | W8: which invariants are lint vs `verify.ts` | QA | Data Model §6 |
| OI-43 | ❓ | Exact day-bucket rule (business day vs shift; TZ) | DATA | D-14 |
| OI-44 | ❓ | UoM conversion (tests↔loops↔pieces) | DATA | D-13 |

---

## 3. Blocked items

| ID | Type | Item | Blocked by |
|---|---|---|---|
| OI-45 | 🚧 | AI chat: all phases X-01…X-06 | OI-08 (trust boundary / backend) |
| OI-46 | 🚧 | Node server tier, config/secrets, live Gurobi, hosting | OI-08 |
| OI-47 | 🚧 | Changeover-dependent scheduling + test data | OI-18 |
| OI-48 | 🚧 | Forecast accuracy (MASE/bias/FVA) + conformal P10/P90 | OI-14 (no history) |
| OI-49 | 🚧 | Robust Γ / DES | OI-15, OI-16 |
| OI-50 | 🚧 | Directional value of the authority demo | OI-05 |
| OI-57 | 🚧 | Rate-based, shift-bucketed scheduling + AIB wire-in | OI-53, OI-54, OI-56 |
| OI-58 | 🚧 | Material/eligibility in the optimisation (AIB-mrp) | OI-54, DG-06 |

---

## 4. Defect-derived open items

The authoritative register is §5 of the COOLIT plan; the PM roll-up is in the PM hub §4.

- **25 D-defects:** 18 Open · 3 Partial (D-08, D-09, D-23) · 1 Open-by-design (D-22) · **3 Closed (D-03, D-21, D-24 — M0 decision-memory slice)**.
- **8 N-findings:** **7 Open** (N-01…N-06, N-08), including **N-01** (a passing test encodes the Saturday-promise defect) and **N-04** (policy authority not enforced); **N-07 Closed** (dangling ids now fail the reference lint).
- **Reconciliation note:** the plan's summary says "13 defects"; the register lists 25 — the register is authoritative.

---

## 5. Outstanding placeholders by document

| Document | Open placeholder areas | Owner |
|---|---|---|
| UI/UX Layout & Interaction Spec | §2 filters/attributes, §4 table emphasis/density, §5 chatbot details, §6–§11 | FE |
| Data Model & Synthetic Fixtures | §5 fixture tables, §6 lint split, §7 open questions | DATA |
| Algorithms, Allocation & Replay | (largely filled) §12 residual choices | AI |
| Personas & Governance | §2 envelope resolution, §3 matrix cells, §5 visibility matrix, §7 handoffs, §8 acceptance | GOV + BE |
| Demo, Testing & Validation | §1 hero/ROI, §2 script, §4 pass/fail, §5 fixture additions, §7 commands | BIZ + QA |
| Product Management | DEC-000 first decision; §11 running notes | PM |
| Documentation set | broken relative links in PM §12 | PM |

---

## 6. Recently resolved (for reference)

| Item | Resolution |
|---|---|
| Layout view contents | A plant floor plan (UI/UX §3) |
| Approval expiry / self-approval / CAS | Owner+expiry; requester≠approver; CAS on `{snapshot_hash, master_set_version, seed}` → `StaleError` + rebase |
| Time-phasing | Inputs only; engine stays deterministic |
| Recovery contention | Consume capability segments; engine does not self-compete |
| Solver toolchain | ADR-001 — Gurobi 12.0.3 at build time; frozen TS artifact |
| Frozen-horizon protection | B-04 — approved operations pinned; lower-priority work schedules around them |
| Ship-day rule | B-05 — non-working promise flagged and normalised; **inverts N-01** |
| Approval ≠ execution | Receipt required; dry-run before execute |
| Evidence surface placement (OI-23) | Drawer, implemented under the right-pane thread |
| Order-table column set (OI-25) | §4 nine-column set implemented (risk rail · order · product·qty · promised · capable · binding constraint · feasibility · lifecycle · provenance) |
| Middle-top Layout (OI-52) | ◐ Partially built: the four-region layout and the middle-top Layout **pane** exist (`App.tsx`); the plant-floor **SVG render is pending (UT-02)** |
| Z-ELEC folds into Z-CDU (OI-35) | The shared illustration has no separate electronics cell; CDU electronics fold into **Z-CDU** (UI/UX §3) |
| Independent docs published (convergence) | Agentic Memory (four roles + crosswalk), Chatbot gap plans, Model `ctp-0.3.0` migration note, Status & Roadmap, Sample Run, Context & Region Projections, COOLIT v3/v3.1, AIB v1, Data Improvement Plan v2.1/v3 — all now in Notion |
| Centre + right-pane restructure | Order table on the centre; chat moved to the right with an evidence drawer; four personas via `ROLE_POLICY`/lens |
| Release model bump + migration note (OI-31) | **Shipped** — model `ctp-0.3.0`; run fingerprint (`canonicalResult`) now pins memory/snapshot identity; `docs/forge-model-ctp-0.3.0-migration.md` records the N-05 contract change |
| AIB v1 received | `COOLIT_Algorithm_Input_Bundle_v1` (content hash `f2fc55f7…`) vendored to `tools/gurobi/fixtures/aib/`; solver-ready allocation (60) + schedule (40) inputs |
| Capacity-contract gap identified | AIB run showed `TEST-LEAK-01` at 134% of horizon under whole-day occupancy — root cause is the capacity *shape*, not the data (OI-53/OI-54) |
| v3.2 contract embedded | `erp/operation_duration`, `erp/capacity_bucket`, `reference/priority_policy`/`resource_concurrency`/`fx_master`; the solver now consumes the contract (rate-based cumulative) |
| Capacity reconciliation | Recomputed `planned_minutes` from the CURRENT schedule: contract flags 17 overloaded weeks, recomputed **0**; P-week date mapping missing (DG-15/DG-16) |
| Demand projection | requested→promised→capable across 60 commitments: 36 active, **18 at risk** (worst 72 d), 20 unlinked (DG-17) |
| Schedule scope corrected | Only **200 of 1200** ops are CURRENT; scope enforced (leak 337% → 56%) (DG-18) |

---

## 7. Change log

| Version | Date | Change |
|---|---|---|
| v0.1 | 2026-09-26 | Created the consolidated open item list: 34 decisions, clarifications, blockers, defect-derived items, placeholders, and recently resolved items |
| v0.2 | 2026-09-26 | Resolved OI-23 (evidence drawer) and OI-25 (order-table column set); updated OI-32 (MS-2026-09-26); added OI-51 (order-table region placement) and OI-52 (middle-top Layout/floor plan); logged the centre + right-pane restructure |
| v0.3 | 2026-09-26 | Resolved OI-52 — the middle-top Layout (plant floor plan) is built; added it to recently-resolved and cleared its blocker |
| v0.4 | 2026-09-26 | Resolved OI-35 — Z-ELEC folds into Z-CDU (the illustration has no separate electronics cell); moved it to recently-resolved |
| v0.5 | 2026-09-27 | Added the AIB/algorithm gaps as decisions: OI-53 rate-schema authority, OI-54 capacity contract, OI-55 scale strategy, OI-56 AIB wire-in; blocked items OI-57/OI-58; logged AIB v1 and the capacity-contract finding in recently-resolved |
| v0.6 | 2026-09-27 | Corrected OI-52: the Layout **pane** is built, the **floor SVG render is pending (UT-02)**; logged the published independent docs in recently-resolved |
| v0.7 | 2026-09-27 | v3.2 contract runs: added OI-59 P-week→date mapping, OI-60 planned_minutes reconciliation, OI-61 CURRENT-only scope, OI-62 unlinked commitments; logged the capacity reconciliation, demand projection (18 at risk) and scope correction in recently-resolved |