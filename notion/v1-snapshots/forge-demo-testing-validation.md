# FORGE Decision Room — Demo, Testing & Validation

> How we demonstrate and prove FORGE Decision Room: the demo narrative, the on-screen script, the test layers (all green), acceptance mapping, fixture validation, and the milestone gates. Governed by the same invariant: the centre pane is the record; every other pane is a view of a centre record.

| Field | Value |
|---|---|
| Document | FORGE Decision Room — Demo, Testing & Validation |
| Version | v0.3 (build + test closed) |
| Status | ✅ Build & test closed — `npm run ci` green; demo script current |
| Owner | Business / pitch + Backend / API (verification) |
| Parent doc | FORGE Decision Room — Product Management |
| Ground truth | `src/` · `server/` · `tools/gurobi/` · all suites + build green |
| Last updated | 2026-09-27 |

---

## 0. Purpose & scope

- Purpose: how we demonstrate and prove the product.
- In scope: demo narrative, on-screen script, test layers, acceptance mapping, fixtures, gates.
- Out of scope: product design (see the other docs).
- Hero scenario: **COM-1042** (Northline, CPL-480 ×120 loops, promised 15 Oct) under **EVT-LT-041** (leak-test fixture RES-LT-01 at half rate, 6–14 Oct).

---

## 1. Demo narrative (one snapshot, one event, four lenses)

```
Maintenance manager  →  "RES-LT-01 half-rate window: impact + restoration"
        │ releases the capacity picture
        ▼
Shift planner        →  "Cover the gap with certified crew / third shift"
        │ proposes roster + overtime
        ▼
Manufacturing manager→  "Cheapest recovery holding the most promises; approve"
        │ approves within policy, escalates cost/date changes
        ▼
Demand planner       →  "What the customer gets; draft the note; request reprioritisation"
        │ request, not approval
        ▼
Program / Finance    →  customer date change / cost approval
```

- **Hero commitment/event resolved:** COM-1042 / `EVT-LT-041`.
- **ROI line (proposed, pending OI-28):** "From hours of fragmented evidence to a receipt-backed decision in minutes — every number traceable."

---

## 2. Demo script (against the four-region build)

The current app is one screen with four regions: **left queue · centre Layout (top) + order table (bottom) · right copilot**.

1. **Manufacturing manager (default).** Left queue sorts by impact. Centre shows the Layout pane over the nine-column order table; the right pane is the copilot.
2. **Select COM-1042.** Table row expands (records · rules · derived · conflict · missing); the right pane scopes to COM-1042.
3. **Ask "Why?"** Causal chain → source facts + derived calcs, each citing a ledger cell (`CALC-COM-1042-SHORTFALL` etc.).
4. **Run recovery scenario.** Durable run; compare alternatives — third shift feasible (hand-authored $6,624 → **Gurobi optimum $4,416**, saves $2,208) vs Saturday-only infeasible (residual 48).
5. **Select third shift → request approval** with rationale. Approval card names the approver + **Finance authority** + expiry.
6. **Approve → dry run → execute → receipt → outcome.** Approval alone never executes; the baseline is never mutated; an accepted receipt is not a successful outcome.
7. **Switch role to Demand planner.** Requested → promised → capable delta; draft a customer note (labelled "not an approved commitment").
8. **Switch to Maintenance manager.** Downtime `EVT-LT-041` impact + restoration state; window alternatives.
9. **Switch to Shift planner.** Coverage / certification + overtime request (propose-only).

- **Fallback mode:** with no model key, the copilot runs **scripted** (`ChatMode = "scripted"`) — the room never invents an answer. Live AI is opt-in via `FEATURE_AI_CHAT=1`.
- **Floor note:** the centre-top Layout **pane** is built; the **plant-floor SVG render is pending (UT-02)**, so the demo narrates the floor and uses the order table + copilot for interaction.

---

## 3. Test layers (all green this capture)

| Layer | Covers | Command | Status |
|---|---|---|---|
| Deterministic services | capacity, allocation, dates, feasibility, scenarios, plan, memory (146 asserts) | `npm run verify` | ✅ |
| Server router + chat control plane | intent taxonomy, authorization, scripted fallback | `npm run verify:server` | ✅ |
| Typed-tool gateway | tool auth + execution, no direct DB | `npm run verify:tools` | ✅ |
| Grounding validator | no ungrounded number reaches the user; live turn when enabled | `npm run verify:ai` | ✅ (live skipped) |
| COOLIT fixture | v2 fixture + solver artifact | `npm run test:coolit` | ✅ |
| Solver lane (build) | Gurobi allocation + scheduling | `npm run solver` | ✅ |
| Build gate | tsc (src) + tsc (server) + vite | `npm run build` | ✅ |
| Fixture lint | dangling ids, missing masters, snapshot identity, fact provenance | `npm run lint` | ✅ |
| **Aggregate gate** | build + all suites + lint, fail-closed | `npm test` · `npm run ci` | ✅ |
| Persona acceptance | criteria 1–10 per role | harness | ⬜ (T-12) |

---

## 4. Acceptance mapping

- Ledger acceptance **A1–A12** (Commitment Ledger design).
- Persona acceptance **1–10** (Personas & Governance).
- Invariants **1–12** (ledger) and **1–21** (right pane).
- Defect closure: **D-03, D-21, D-24** and finding **N-07** closed in the M0 memory slice; the rest tracked in the PM register.
- Placeholder — record pass/fail per criterion at each gate.

---

## 5. Test data & fixtures

- **v2 baseline (live in code):** 4 commitments, 18 facts, 4 packets, 4 baselines, 6+4 alternatives, seeded approvals/receipts.
- **v3.1 data pack (ready, not yet wired):** 174 datasets · 41,288 rows; zone/routing/CRM-requested/MES-handover/etc.
- **Algorithm Input Bundle v1 (AIB):** solver-ready allocation (60) + schedule (40); content hash `f2fc55f7…`.
- Wiring of v3.1/AIB into `src`/`server` is **B-06 / OI-56**; the golden-thread E2E is **T-13**.

---

## 6. Defect & regression tracking

- Authoritative register: §5 of the COOLIT Data Improvement Plan; PM roll-up in the Product Management hub §4.
- Current reconciled state: **18 Open · 3 Partial · 1 Open-by-design · 3 Closed** (25), plus N-01…N-08 (N-07 closed).
- Rule: every defect closes **with a test**; the fixture lint fails the build on a single dangling reference.

---

## 7. Milestone validation gates

| Gate | Validates | Command / exit |
|---|---|---|
| M0 | integrity + memory slice + lint skeleton | `npm run ci` green (build + `verify`/`verify:server`/`verify:tools`/`verify:ai` + `test:coolit` + `lint`); no dangling id |
| M1 | floor | routing/zone completeness asserted; floor SVG render (UT-02) |
| M5 | dates/capacity | ship-day rule asserted; day-bin totals |
| M6 | governance | authority separation + redaction asserted |
| M7 | assurance | every acceptance criterion machine-checked; fixture lint in CI |

---

## 8. Open questions

1. Which metric headlines the demo ROI? (OI-28) [TBC]
2. Live demo vs fallback? (OI-29) — recommend both, fallback required. [TBC]
3. Automated vs manual persona acceptance? (OI-30) — recommend scripted harness. [TBC]

---

## 9. Change log

| Version | Date | Change |
|---|---|---|
| v0.1 | 2026-09-26 | Created demo, testing & validation skeleton with placeholders |
| v0.2 | 2026-09-27 | Aligned to the built UI + green suites: concrete four-region demo script, six live test layers, acceptance mapping, v2/v3.1 fixtures, milestone gates with commands, floor-render note |
| v0.3 | 2026-09-27 | **Closed build & test.** Added `tools/fixture-lint.ts` (`npm run lint`) and an aggregate fail-closed gate (`npm test`, `npm run ci` = build + all suites + lint). `npm run ci` green: verify · verify:server · verify:tools · verify:ai · test:coolit (16/16) · fixture lint (4 commitments · 46 memories · 46 edges) |