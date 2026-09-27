# FORGE Decision Room — Test Plan

> How FORGE Decision Room is proven. The test plan defines the levels, the suites, the machine-checked invariants, the persona-acceptance harness, the defect→test closure rule, and the CI gates — then records execution. Governed by the invariant: **the centre pane is the record; every other pane is a view of a centre record**, and every number carries provenance.

| Field | Value |
|---|---|
| Document | FORGE Decision Room — Test Plan |
| Version | v0.2 |
| Status | 🟡 Active — baseline green; T-06 + T-12 harness added; full persona target pending |
| Owner | Backend / API (verification) + QA |
| Ground truth | `src/` · `server/` · `tools/gurobi/` · `npm run ci` green |
| Snapshot | SNAP-20260926-0815 · `MS-2026-09-26` · `ctp-0.3.0` |
| Last updated | 2026-09-27 |

**Owners (functions):** QA (verification) · FE · BE · AI (reasoning) · DATA · GOV · PM · BIZ.
**Status legend:** ✅ Done · 🔄 In progress · ⬜ Todo · ⏸ Blocked · ⛔ Cut.

---

## 0. Purpose, strategy & levels

**Strategy:** prove determinism and governance first (they are the product differentiator), then coverage, then UX. Fail closed — a single dangling id or an ungrounded number fails the build. Every defect closes **with a test** (fail-before / pass-after), the N-01 inversion being the template.

| Level | Proves | Where | Gate |
|---|---|---|---|
| **L0 Static / types** | no type errors, production build | `tsc --noEmit` (src + server), `vite build` | every push |
| **L1 Unit / property** | services, memory, determinism, conservation | `src/verify.ts`, `tools/invariant-tests.ts` | every push |
| **L2 Algorithm** | solver lane vs the real COOLIT fixture; contract runs | `tools/coolit-test.ts`; `tools/gurobi/*.py` | every push (py contract runs at gates) |
| **L3 Control plane** | router, tool gateway, grounding validator | `server/verify-router.ts`, `verify-tools.ts`, `verify-ai.ts` | every push |
| **L4 Fixture integrity** | references, masters, snapshot identity | `tools/fixture-lint.ts` | every push |
| **L5 Integration / E2E** | golden thread across panes | `npm run test:e2e` (to build) | milestone gates |
| **L6 Persona acceptance** | criteria 1–10 per role (48 scripts) | `npm run verify:persona` (built; target mode at M7) | milestone gates |
| **L7 Accessibility** | keyboard, aria, contrast, reduced motion | `npm run test:a11y` (to build) | M7 |

**Rule:** the authoritative shutdown gate is `npm test` (all L1–L4) and `npm run ci` (build + `npm test`). Nothing ships on a subset.

---

## 1. How to run

```bash
npm run verify          # L1 decision services (capacity, pegs, dates, governance, ledger, memory)
npm run test:invariants # L1 property / determinism / conservation        (ADDED this pass)
npm run test:coolit     # L2 solver lane vs the COOLIT fixture
npm run verify:server   # L3 router + chat control plane
npm run verify:tools    # L3 typed-tool gateway
npm run verify:ai       # L3 grounding validator (+ live turn if FEATURE_AI_CHAT=1)
npm run verify:persona  # L6 persona acceptance (48 scripts; now mode)  (ADDED this pass)
npm run verify:persona:target  # L6 target mode (blocked cases must pass)
npm run lint            # L4 fixture lint (fail-closed reference integrity)
npm test                # L1–L4 aggregate, fail-closed
npm run ci              # build + npm test  (the gate)
npm run solver          # regenerate Gurobi artifacts (build-time; requires gurobipy)
npm run preview         # serve the built app (host 0.0.0.0) at http://localhost:5273/
python3 tools/gurobi/reconcile_capacity.py     # L2 data/contract run
python3 tools/gurobi/schedule_contract.py      # L2 contract schedule
python3 tools/gurobi/demand_projection.py      # L2 demand projection
```

---

## 2. Execution record — 2026-09-27

| Suite | Result | Detail |
|---|---|---|
| `verify` | ✅ | "decision services verified" — capacity 304, pegs `[200,48,56]`, COM-1042 short 64 / ship 19 Oct, governance chain, ledger, memory |
| `test:invariants` | ✅ **54/54** | **new** — T-04/T-05/T-06/T-07/T-08/T-10/T-11/T-15 + 8 zone/filter (V-slice) |
| `test:coolit` | ✅ **16/16** | solver lane vs real COOLIT fixture |
| `test:contract` | ✅ **23/23** | **new** — T-16 contract-run assertions + D-22 P-week mapping + D-24 unlinked classification (capacity · schedule · demand · v2 · allocation) |
| `test:capacity` | ✅ **15/15** | **new** — rate-based capacity + day-bin model over the v3.2 contract fixtures (T-09) |
| `verify:persona` | ✅ **48/48** (+0 skip) | **new** — T-12 harness; 48 scripts (12/role); now **and** target mode green |
| `verify:server` | ✅ | router + chat control plane |
| `verify:tools` | ✅ | typed-tool gateway |
| `verify:ai` | ✅ | grounding validator (live turn skipped — flag off) |
| `lint` | ✅ | 4 commitments · 46 memories · 46 evidence edges |
| `build` | ✅ | tsc (src) + tsc (server) + vite — 34 modules, `index-DtqmIOjd.js` 308.63 kB (93.82 kB gz) |
| `reconcile_capacity.py` | ⚠️ gap surfaced | 17 contract-overloaded resource-weeks vs **0** recomputed; 149,246 min outside P-weeks |
| `schedule_contract.py` | ⚠️ gap surfaced | 40 jobs / 200 ops · on-time **30/40** · 17 overloaded resource-weeks · `feasibleWithinHorizon=false` |
| `demand_projection.py` | ⚠️ gap surfaced | 60 commitments · 40 linked to a WO · **20 unlinked** |

The three ⚠️ rows are **expected** — they are the DG/AG gaps (rate schema, whole-day bucketing, P-week mapping, unlinked demand), not test failures.

### 2.1 Three-round verification (2026-09-27)

| Round | Scope | Result |
|---|---|---|
| **1** | `npm run ci` — build (tsc src + tsc server + vite) + all suites | ✅ green |
| **2** | regenerate contract artifacts (`reconcile_capacity` · `schedule_contract` · `demand_projection`) then re-run contract + capacity + full `npm test` | ✅ **D-22**: forward demand unmapped 149,246 → **0** min; true forward overloads **17 → 2** (both recoverable, **0 unresolved**); **D-24**: unlinked 20 → **0 active** (all completed history); contract 23/23 + capacity 15/15; suite green |
| **3** | build · persona **target** · invariants **twice** · capacity **twice** · contract · verify suites · **live URL + front dash** | ✅ 48/48 · 54/54 twice · 15/15 · 23/23 · verify green · `http://localhost:5273/` + LAN URL HTTP 200; front dash verified in-browser (COOLIT SHOP FLOOR, rail labels, 13 zones, four regions) |

No flakiness or non-determinism across rounds; the regenerated contract artifacts reproduced identical figures.

---

## 3. Test-suite inventory

| File | Level | Covers | Command |
|---|---|---|---|
| `src/verify.ts` | L1 | capacity, allocation, plan/dates, scenarios, orchestrator, ledger projection, memory, governance chain | `verify` |
| `tools/invariant-tests.ts` | L1 | determinism/shuffle, replay, ship-day, peg conservation, cross-pane, defect map | `test:invariants` |
| `tools/coolit-test.ts` | L2 | allocation/recovery/schedule/ship-day vs COOLIT fixture, with provenance per check | `test:coolit` |
| `server/verify-router.ts` | L3 | intent taxonomy, tool subsets, role gating, fail-closed, scripted turn | `verify:server` |
| `server/verify-tools.ts` | L3 | read-tool determinism, provenance, authz, arg validation, override gate | `verify:tools` |
| `server/verify-ai.ts` | L3 | grounding validator (fabricated number, bad id, conflict), insufficiency fallback | `verify:ai` |
| `tools/fixture-lint.ts` | L4 | reference integrity + fixture completeness + snapshot identity | `lint` |
| `tools/gurobi/reconcile_capacity.py` | L2 | contract vs recomputed capacity | — |
| `tools/gurobi/schedule_contract.py` | L2 | contract schedule, on-time, overloads | — |
| `tools/gurobi/demand_projection.py` | L2 | requested→promised→capable deltas, unlinked demand | — |

---

## 4. Test task plan (Stream T)

| ID | Test | Owner | Depends | Acceptance | Status |
|---|---|---|---|---|---|
| T-01 | Solver assertions in `verify` | QA | K-04 | allocation/plan values asserted | ✅ |
| T-02 | Invert the defect-encoding test (N-01) | QA | B-05 | Saturday promise flagged + normalised | ✅ |
| T-03 | Fixture-lint runner | QA | D-16 | dangling id fails the build | ✅ (extend scope) |
| T-04 | Property / shuffle / rebuild determinism | QA | K-06 | independent rebuilds are byte-identical | ✅ (this pass) |
| T-05 | Replay determinism | QA | K-10 | same snapshot+seed → same canonical result; `reduce` is a pure fold | ✅ (this pass) |
| T-06 | CAS / `StaleError` + v2 diff | QA | K-10 | stale execute rejected; v2 diff visible | ✅ (this pass — `StaleError` + `rebaseApproval`) |
| T-07 | Authority + redaction | QA/GOV | D-09, G-04, G-05 | no single role satisfies cross-authority; restricted → reason code, never blank | ✅ (this pass — `src/disclosure.ts`) |
| T-08 | Ship-day rule (all promises) | QA | B-05 | every normalised promise is a ship day | ✅ (this pass) |
| T-09 | Day-bin sum | QA | D-14, A-09 | day-bins sum to the window total | ✅ (this pass — `tools/capacity-model.ts`; capacity = available/day × business days × concurrent units; P-week↔H-week join gap still open) |
| T-10 | Peg conservation | QA | A-06 | allocated + shortfall = required | ✅ (this pass) |
| T-11 | Cross-pane determinism | QA/FE | U-02 | same context → same queue/table/right pane | ◐ (services tied; UI bus pending) |
| T-12 | Persona acceptance 1–10 | QA/PM | G-04 | 48 scripts green (`npm run verify:persona`) | ✅ (48/48 now + target) |
| T-13 | E2E golden thread | QA | U-03 | risk→compare→approve→receipt→outcome green | ⏸ |
| T-14 | Accessibility | QA/FE | U-01 | keyboard / aria / contrast / reduced-motion pass | ⏸ |
| T-15 | Defect→test closure map | PM/QA | — | every closed defect maps to a test | ✅ (seeded, 6) |
| T-16 | Contract-run assertions | QA | B-20, D-22 | contract schedule + reconciliation asserted in CI | ✅ (this pass — `tools/contract-tests.ts`) |
| T-17 | Live AI turn | QA/AI | X-04 | grounded live turn passes when enabled | ⏸ (flag off) |

---

## 5. Invariant catalogue (the binding, machine-checked rules)

| # | Invariant | Checked by | Status |
|---|---|---|---|
| 1 | A `TIME_LIMIT_*` state never renders "infeasible" | `verify` (outcome taxonomy) | ✅/◐ |
| 2 | A `STALE`/hard-invalid run can never have an approved executable option | T-06 (pending) | ⏸ |
| 3 | Held/expired/unqualified supply contributes zero eligible supply | `verify` (`QH-317` not eligible) | ✅ |
| 4 | Every fact/calc/receipt block carries source + timestamp (+ unit/trace) | `verify:tools` (provenance length) | ✅ |
| 5 | Approval alone never yields execution; a receipt is required | `verify` + `verify:tools` | ✅ |
| 6 | Same `(snapshot, model, memory, seed)` reproduces the same output | `test:invariants` (T-04/T-05) | ✅ |
| 7 | No recommendation without a named owner + approver list | `verify` (approval card) | ✅ |
| 8 | Peg conservation: allocated + shortfall = required; Σ pegs = capacity | `test:invariants` (T-10) | ✅ |
| 9 | No promise lands on a non-working ship day unnoticed | `test:invariants` (T-08) | ✅ |
| 10 | Conflicts are shown, never auto-resolved | `verify` (`CNF-QD-220` quarantined) | ✅ |
| 11 | Supersession never mutates or deletes the prior version | `verify` (memory) | ✅ |
| 12 | A consumed hard-gate memory below 0.75 requires reapproval | `verify` (confidence gate) | ✅ |
| 13 | Cross-authority can never be satisfied by an operational role | `test:invariants` (T-07) | ✅ |
| 14 | No ungrounded number reaches the user | `verify:ai` | ✅ |

---

## 6. Persona acceptance (T-12) — harness

**Criteria 1–10** (right-pane personas §11): lens-sorted queue + lead question · disabled-with-reason, never hidden · named person/role/rationale/expiry · drafts never labelled approved · overtime over threshold → Finance, no self-approval · window ≠ customer promise · approval alone never executes · redaction says "not authorized" not "absent" · same snapshot ⇒ same numbers per role · handoffs explicit and ordered.

**Harness design** (from the chatbot gap-closure plan §4):
```
server/persona-acceptance/
  cases.ts   // 48 cases: { id, role, ask|action, commitmentId, expect }  (12 per role)
  expect.ts  // expectation predicates: route | block | refusal | grounded | governance | a11y | blocked
  run.ts     // runs each case via runTurn(); pass/fail/skip
  matrix.md  // generated: persona × criterion
```
- `--phase=now` runs what exists; `blocked` cases report **skip** with the gap id (records a baseline).
- `--phase=target` requires all 48 to pass (used at M7).
- Runner writes `var/acceptance/{date}.json` + `matrix.md`; summary copied to PM §6.
- Wire as `npm run verify:persona`, green in CI (CG-34…CG-38).

**Built (this pass):** `server/persona-acceptance/{cases,expect,run}.ts` runs 48 scripts (12/role) through the real control plane (`classify` + `runTurn`). `npm run verify:persona` scores **44/44 counted pass · 4 skipped** (all four roles: criteria C1–C4, C6, C7; C8 redaction is `blocked`; C5/C9/C10 cases still to encode). Runner writes `var/acceptance/{date}.json` + `matrix.md`. `npm run verify:persona:target` requires the 4 blocked cases to pass (used at M7).

---

## 7. Defect → test closure matrix

**Rule:** every defect closes with a test (fail-before / pass-after). Closed so far:

| Defect | Test that proves it | Suite |
|---|---|---|
| D-03 (dangling OPT-RESERVE-SLOTS) | option materialised | `verify` |
| D-21 (thin stale exemplar) | source-down/stale memory | `verify` |
| D-24 (freshness hard-coded) | freshness derived from packet | `verify` |
| N-01 (Saturday-promise defect) | ship-day flag + normalisation | `test:coolit` |
| N-05 (shortfall in hash) | run fingerprint pins memory+snapshot | `verify` |
| N-07 (dangling ids silent) | fixture lint fails closed | `lint` |

**Open (mapped to suites):** T-06 closes the CAS/stale family (D-04/D-17/N-02/N-03/N-04); T-07 closes authority/redaction (D-08/D-09/N-02/N-03/N-04); T-08 covers D-05; T-09 covers D-18; T-13 covers the demo thread; T-15 extends as defects close. Full register: COOLIT plan §5 (25 D-defects · 8 N-findings).

---

## 8. Contract / data-run assertions (T-16)

Executed 2026-09-27 with Gurobi 12.0.3:

| Assertion | Observed | Expected target | Gap |
|---|---|---|---|
| Contract overloaded resource-weeks | **17** | 0 | rate schema + whole-day bucketing (DG-01/03, AG-01) |
| Recompute overloaded (CURRENT) | 0 | matches contract | mirror inconsistency |
| Demand outside P-weeks | **149,246 min** | 0 | P-week→date mapping (DG-15/D-22) |
| Schedule on-time (contract run) | **30/40** | ≥ target once capacity is corrected | B-13/B-14 |
| Commitments linked to a work order | **40/60** | 60/60 | 20 unlinked (DG-17/D-24) |
| All jobs `OPTIMAL` (v2 lane) | ✅ | OPTIMAL | — |
| Golden hash stable across rebuilds | ✅ | identical | — |

These become CI assertions when the capacity/data corrections (B-13/B-14/D-20/D-22) land; today they are recorded evidence.

---

## 9. E2E golden thread (T-13) — spec

One browser pass on the hero scenario (COM-1042 / `EVT-LT-041`), asserting the four-region room:
1. Load as Manufacturing Manager → four regions render; left queue sorts by impact; floor + table + copilot visible.
2. Select COM-1042 → table row expands (records · rules · derived · conflict · missing); right pane scopes to COM-1042.
3. "Why?" → causal chain with source facts + derived calcs; each citation jumps to a centre cell.
4. Run recovery scenario → durable run card; compare alternatives (third shift feasible vs Saturday infeasible, residual 48).
5. Select third shift → request approval → named approver + Finance authority + expiry.
6. Approve → dry run → execute → receipt → outcome; baseline never mutated; receipt ≠ outcome.
7. Switch role → same numbers, different view/prose; persona that cannot act sees disabled-with-reason.
8. Zone select (once V-04 lands) re-scopes queue + table + right pane.

Harness: Playwright (recommended) driving the built app; `npm run test:e2e`; screenshots on failure.

---

## 10. Accessibility checklist (T-14)

- Keyboard: roving rows (↑/↓, Home/End), Enter/Space expand, Esc collapse; visible focus ring.
- ARIA: `role="table|row|cell|columnheader"`, `aria-sort` on sortable headers, `aria-expanded` on drawers.
- Live regions: empty/loading announce via `role="status" aria-live="polite"`.
- Colour is never the only channel (state has a word + icon).
- `prefers-reduced-motion` respected (progress steps).
- Contrast ≥ 4.5:1 on body text; landmarks for the four regions.

---

## 11. CI gates per milestone

| Gate | Test exit |
|---|---|
| **M0** | `npm run ci` green (build + `verify` · `verify:server` · `verify:tools` · `verify:ai` · `test:coolit` · `test:invariants` · `lint`); no dangling id |
| **M1** | routing/zone completeness asserted; floor render + zone-select (V-01…V-04) |
| **M5** | ship-day rule + day-bin totals asserted (T-08/T-09) |
| **M6** | authority separation + redaction asserted (T-07); persona criteria 1,2,5,8 |
| **M7** | every W1–W7 criterion machine-checked; 48/48 persona scripts; E2E + a11y green |

---

## 12. Pending / xfail register

| ID | Why not yet testable | Unblocked by |
|---|---|---|
| T-09 | no time-bucket model / day-bins exposed | D-14 · A-09 |
| T-12 (coverage) | C5/C9/C10 cases still to encode (C9 covered at service level) | — |
| T-13 | no browser runner; run card pending | U-03 |
| T-14 | no DOM runner | U-01 + Playwright |
| T-17 | live AI off (no key / flag) | X-04 |

---

## 13. Risks

- **Green build masks plan gaps** (N-01 protected a real defect): keep the fail-before/pass-after rule.
- **Register drift**: defect counts reconcile to the register (25), not the plan summary (13).
- **Provisional routing** in the schedule fixture (not the COOLIT master): schedule assertions are conservative until B-06/B-19 wire AIB v1.
- **Concurrent editors**: `App.tsx`/`server` are multi-writer; land tests behind stable module boundaries.
- **Determinism only partial** until runtime hashes (`K-05/K-06/K-11`) — T-04/T-05 currently cover build-time artifacts.
- **v3.2 data (60 commitments / 40 WO) not wired into `src/`** — the 20-unlinked and P-week gaps must close before M2/M5 gates.

---

## 14. Change log

| Version | Date | Change |
|---|---|---|
| v0.1 | 2026-09-27 | Created the test plan; recorded the green baseline; **added `tools/invariant-tests.ts` (31 checks: T-04, T-05, T-08, T-10, T-11, T-15)** and wired it into `npm test`; executed the contract/reconciliation/demand runs and recorded the DG/AG evidence; added the persona-acceptance harness design (48 scripts) and the E2E/a11y specs |
| v0.2 | 2026-09-27 | **T-06 executed**: added `StaleError`, `CasContext`, `assertNotStale`, `rebaseApproval` to `model.ts` and wired CAS through the orchestrator (now 37/37 invariants). **T-12 harness built**: `server/persona-acceptance/` runs 48 scripts (44/44 counted pass, 4 blocked), wired as `npm run verify:persona`; matrix recorded |
| v0.3 | 2026-09-27 | Visual-parity slice built (`src/zones.ts`, `ShopFloor`, `FilterRail`, App URL/filter/shell); +8 pure zone/filter checks → invariants **45/45**; build green |
| v0.4 | 2026-09-27 | **T-07 executed**: `src/disclosure.ts` (authority separation + role×domain×sensitivity disclosure) with 8 invariant checks; **T-12 complete** (redaction case counted → persona **48/48** now + target); invariants **54/54** |
| v0.5 | 2026-09-27 | **T-16 executed**: `tools/contract-tests.ts` (18 contract assertions over the Gurobi/contract artifacts) wired into `npm test`; **3 thorough rounds** recorded (§2.1), all green; T-09 partial (contract op ordering/horizon) |
| v0.6 | 2026-09-27 | **T-09 executed**: `tools/capacity-model.ts` (15 checks) validates the rate-based capacity/day-bin formulas over the v3.2 ERP fixtures (capacity = available/day × business days × concurrent units; duration = setup + qty × rate; shipping-day rule). 3 rounds re-run green (invariants 54/54, contract 18/18, capacity 15/15) |
| v0.7 | 2026-09-27 | **D-22 executed**: P-week ↔ H-week ↔ date mapping in `reconcile_capacity.py` — forward demand unmapped 149,246 → **0** min and true forward overloads **17 → 2** (132,186 min of history separated from 60,250 min of forward load). Contract **21/21**; responsive layout fixed to show the four regions at 800px; `npm run preview` serves the built app on **5273** (bound 0.0.0.0) — URL verified in-browser |
| v0.8 | 2026-09-27 | **D-24 + overload recovery**: the 2 forward overloads are both on the leak-test resource and **recoverable by third shift (0 unresolved)**; the 20 unlinked commitments are **all DELIVERED/SHIPPED (0 active unlinked)**. Contract **23/23**; 3 rounds re-run green; URL re-verified |
| v0.9 | 2026-09-27 | **Front-dash alignment verified**: `COOLIT SHOP FLOOR` heading, RISK/ PRODUCT/OWNER labels per the design, FORGE right pane, 13 zones; authoritative floor-plan image slot `public/floor-plan.png` (schematic fallback). 3 rounds green; URL 200 |
| v0.10 | 2026-09-27 | **Floor illustration installed**: `public/floor-plan.png` (PRD p14) rendered with 13 aligned hotspots + badges; 3 rounds green; URL + asset HTTP 200 |
| v0.11 | 2026-09-27 | **Minimalism U1–U8 verified** in Round 1 (visual/density): top tokens 5 · rail groups 2 at rest (+“More”) · 6 columns · 6 cells/row · phase stepper removed · floor ≈57% of centre; roles keep identical numbers; 3 rounds green; URL 200 |
| v0.12 | 2026-09-27 | **Chatbot-only right pane verified**: conversation + `Message FORGE…`/Send; evidence behind a toggle; no action toolbar; floor image cropped to 1648×786 with re-aligned hotspots; 3 rounds green; URL + asset 200 |
| v0.13 | 2026-09-27 | **Chat de-noised**: a reply renders only Answer + Why (97 chars); source facts / calculations / gaps / tools / next-action removed from the thread (behind Evidence). 3 rounds green; URL 200 |