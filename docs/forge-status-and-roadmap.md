# FORGE Decision Room — Status & Roadmap Readout

Product-management readout reconciling the **COOLIT Data Improvement Plan** (`forge-coolit-data-improvement-plan.md`) and the three design docs against the **actual code** at the time of audit.

| Field | Value |
|---|---|
| Document | FORGE Decision Room — Status & Roadmap Readout |
| Version | v1.0 |
| Date | 2026-09-26 |
| Author | FORGE Product Management |
| Ground truth | `src/` @ working tree · `npm run verify` = **green** |
| Companion | `docs/forge-coolit-data-improvement-plan.md` (plan) · `notion/*.md` (design) |

> Method: every defect in the plan's §5 register was re-tested against current source, not assumed. States are **Open**, **Partial** (partly mitigated, invariant still violated), or **Closed**. Plan-vs-build claims are checked, not restated.

---

## 1. Executive summary

**The build is at "M0-minus": governance-strong, data-thin.**

- **Landed since the plan was written:** the four-persona role model, role policy/lens, approval authority as a typed field, requester-cannot-self-approve, the governed dry-run → execute → receipt → outcome chain, the master/transaction/derived/conflict ledger, and a green verification suite.
- **Not built:** every data seam the four personas depend on — CRM requested date (W1), MES work orders/handover (W2), EAM maintenance (W3), zone/routing/shop-floor (W4), ship calendar + time-phased capacity (W5), disclosure/role-lensed queue (W6 remainder), and the extended lint (W8).
- **Defect register:** of 25 defects, **21 Open, 3 Partial, 1 Open-by-design** — **none Closed**. Ten are P0 (six S1 + four S2). The plan's own executive summary says "13 defects"; the register lists 25. **The summary under-counts by 12** (see §5).
- **Critical path is unchanged and unstarted:** M0 (integrity) → M1 (floor foundation) → the demand/execution/availability/capacity seams → M6 governance → M7 assurance.

**PM recommendation:** start **M0 immediately** (it is small, unblocks determinism, and one of its fixes touches the reproducibility hash), then **M1**, which is the single highest-leverage build because W2, W3 and W5 all depend on the zone/routing/resource masters.

---

## 2. Build vs. plan — what has actually landed

| Plan area | Plan claim | Build reality | Verdict |
|---|---|---|---|
| Four personas | replace six roles with four | `model.ts` `Role` = the four; `PEOPLE` populated | **Landed** |
| Role lens / policy | envelope carries lens + action policy | `ROLE_POLICY`, `RoleLens`, envelope `lens`/`policy` | **Landed** |
| Authority as a field | distinct Finance/Quality/Program | `AuthorityId`, `ApproverRequirement.authority` | **Partial** — field exists, not enforced (§4) |
| Approval ≠ execution | receipt required; dry-run first | `gatewayReceipt` enforces dry-run-before-execute | **Landed** |
| Baseline immutable | runs frozen, never mutated | `freeze(...)`, `immutable: true`, tests assert | **Landed** |
| Master vs transaction | versioned master layer | `master.ts`, `MasterRef`, `validityOf` | **Landed** |
| Requested→promised→capable | CRM requested date | no `requestedDate`; CRM facts say "promises" | **Not built (D-01)** |
| Routing master | routing records per product | `MasterClass` includes `routing`; **zero routing refs** | **Not built (D-07)** |
| Shop-floor layout | zone master + floor view | no `zone`/`shopFloor` symbol anywhere in `src/` | **Not built (D-14)** |
| MES execution | work orders, handover, certs | 3 static MES facts; no entity types | **Not built (D-15)** |
| EAM/CMMS | asset, PM, root cause, restoration | no EAM entities | **Not built (D-16)** |
| Ship calendar | SHIP-CAL master + validation | none | **Not built (D-05/D-17)** |
| Extended verify | W8 invariants + fixture lint | `verify.ts` covers baseline invariants only | **Not built (D-24)** |

`npm run verify` is green because the suite tests **what exists**, not the plan's invariants. That is the central risk: **green is not readiness.**

---

## 3. Defect reconciliation (plan §5, re-tested)

| ID | Sev/Pri | Plan defect | State | Evidence in current code |
|---|---|---|---|---|
| D-01 | S2/P0 | No CRM requested date | **Open** | `Commitment` has only `promiseDate` (`model.ts:311`); all CRM facts phrase "promises" |
| D-02 | S1/P0 | No maintenance alternatives | **Open** | `scenarioAlternatives()` returns `[]` for anything but COM-1042/1018 (`model.ts:983`) |
| D-03 | S1/P0 | Dangling `OPT-RESERVE-SLOTS` | **Open** | `seeded1104Approval/Receipt` cite it (`model.ts:1504,1532`); no such `Alternative`; lookup is optional so it silently degrades |
| D-04 | S2/P0 | `shortfall` overloaded | **Open** | `DecisionRun.shortfall` still a single field (`model.ts:231`); no `constraintClass` |
| D-05 | S2/P0 | Promise on non-working day | **Open** | COM-1104 promise 2026-10-10 is a Saturday; `assess1104` returns feasible (`model.ts:913`); **`verify.ts:224` asserts feasible, i.e. encodes the defect** |
| D-06 | S2/P1 | Hard-coded ship date | **Open** | `assess1018` literal `"2026-10-21"` (`model.ts:794`) |
| D-07 | S1/P0 | Routing master empty | **Open** | `masterRefsFor` (`master.ts:180`) has no `routing` set; lineage cites routing informally |
| D-08 | S2/P0 | Authority collapsed | **Partial** | `authority` is now a typed field, but `decideApproval` matches by **persona role only** (`model.ts:1413`); a mfg-manager approval still "satisfies" Finance |
| D-09 | S3/P1 | Role naming/ownership drift | **Partial** | Four-role union landed; but `COM-1104.owner = "Operations Leader"` and others `"Supply Planner"` (`model.ts:319`); label is "Shift Planner", not "Shift Executive" |
| D-10 | S2/P1 | No disclosure/redaction | **Open** | `RolePolicy` has no disclosure fields (`model.ts:43`); Evidence pane shows all facts to all roles (`App.tsx:809`) |
| D-11 | S2/P1 | Queue not role-lensed | **Open** | `queueOf` / `buildLedger` bucket by lifecycle/risk only (`App.tsx:51`, `ledger.ts:259`) |
| D-12 | S3/P2 | November demand invisible | **Open** | `COM-0991.leakTests = 0` (`model.ts:377`) |
| D-13 | S4/P2 | Unit mismatch in ledger | **Open** | Constraint unit "tests" but ladder labels the same number with `uom` "loops" (`ledger.ts:247-254`) |
| D-14 | S1/P0 | No shop-floor layout | **Open** | Grep for `zone`/`shopFloor` in `src/` = 0 hits |
| D-15 | S1/P0 | MES execution/handover absent | **Open** | No `WorkOrder`/`ShiftHandover`/`OperatorCertification` types |
| D-16 | S1/P0 | Maintenance record thin | **Open** | `EVT-LT-041` is a statement only; no MWO/root cause/restoration entities |
| D-17 | S2/P1 | No ship calendar | **Open** | No SHIP-CAL master; promises unvalidated |
| D-18 | S2/P1 | Allocation not time-phased | **Open** | `allocateLeakTests` subtracts window-wide (`model.ts:460`) |
| D-19 | S3/P2 | Recovery rate ignores competition | **Open** | `RECOVERY_DAILY_RATE = 32` with no post-window contention (`model.ts:21`) |
| D-20 | S3/P2 | No commercial value | **Open** | `Commitment` has no value/margin/penalty; only OT cost |
| D-21 | S4/P2 | Thin stale/missing examples | **Open** | One stale fact (`CUST-WAIVER-LOG`), one missing item; no source-down example |
| D-22 | S4/P2 | Single-site assumption | **Open-by-design** | `SITE-YYC-01` only; tracked as Q-01 |
| D-23 | S3/P1 | Seeded approval bypasses gate | **Partial** | A dry-run receipt is hand-seeded before execute (`orchestrator.ts:143`), but not routed through `gatewayReceipt`, and the option id is dangling |
| D-24 | S4/P2 | Test envelope hard-codes freshness | **Open** | `verify.ts:117` literal `{ fresh: 9, stale: 1 }` |
| D-25 | S3/P2 | No human-override capture | **Open** | No `HumanOverrideEvent`; `ApprovalDecision` stores free-text rationale only |

**Tally: 21 Open · 3 Partial (D-08, D-09, D-23) · 1 Open-by-design (D-22) · 0 Closed.**

---

## 4. New findings from the audit (not in the register)

These were found while re-testing and should be added to the register.

| ID | Sev | Finding | Impact |
|---|---|---|---|
| **N-01** | S1 | **A test asserts the defect.** `verify.ts:224` asserts `assess("COM-1104").baseline.feasibility === "feasible"` for the Saturday promise. | D-05 can never be fixed without editing a "passing" test; green actively hides the bug. Test must be inverted with W5. |
| **N-02** | S2 | **`canPropose` is unenforced.** `requestApproval` never consults `policy.canPropose` (`orchestrator.ts:380`); only `canSelectOptions`/`canApprove`/`canExecute` are gated. | Latent — all four roles currently can propose. Any future propose-only role would bypass policy silently. |
| **N-03** | S2 | **Envelope misdescribes authority.** `envelopeFor` sets `authorization.canApproveRoles: [role]` and a scope string (`model.ts:1293`). | Every role's envelope claims it can approve; contradicts persona §1. Any downstream policy service reading the envelope gets the wrong answer. |
| **N-04** | S1 | **Authority is cosmetic.** `decideApproval` matches role only; the Finance/Quality/Program authority is never resolved separately. | D-08's core invariant — "an operational role's approval never satisfies a Finance/Quality/Program authority" — is not enforced. |
| **N-05** | S2 | **D-04 touches the reproducibility hash.** `canonicalResult` fingerprints `run.shortfall` (`model.ts:1245`). | Refactoring `shortfall` changes the run-diff contract. Must ship with a `modelVersion` bump and a migration note. |
| **N-06** | S2 | **Seeded flow starts mid-phase.** `openThread("COM-1018")` auto-creates a scenario + approval and sets `phase: "approve"` (`orchestrator.ts:120`). | The default view for one commitment opens in Approve, not Orient, and pre-selects an option before the persona asks anything. |
| **N-07** | S3 | **Dangling ids fail silently.** Option lookups are optional (`ApprovalCard`, `BlockView`), so D-03 renders a fallback instead of failing. | Integrity errors can't be caught at runtime; only a fixture lint (W8) will catch them. |
| **N-08** | S3 | **No rejection-code taxonomy.** Plan §13 (right pane) lists seven codes; `ApprovalDecision` stores none. | Override/improvement signal (D-25) has no structured field to feed offline review. |

---

## 5. Plan-vs-plan inconsistency to correct

The plan's executive summary states **"thirteen concrete data-integrity defects"** and a target of **13 → 0** open defects (§1, §1.1), yet the §5 register enumerates **D-01 … D-25 (25 defects)** and §10 acceptance criterion A12 requires clearing all S1/S2.

**Resolution:** the register is authoritative. Correct the summary and the headline score to **25 open → 0**. The "13" appears to count only S1+S2 rows (10 P0 + 3 = 13) — if so, label it explicitly as **"S1/S2 defects"** so the two numbers stop being read as the same metric.

---

## 6. Prioritised, dated roadmap

Dated from **Mon 2026-09-28** (today is Sat 2026-09-26). Dates are calendar windows for a single shared squad; ideal engineering effort from the plan is shown. "Owner" is the accountable **function** (named individuals TBC — the plan names only "FORGE data engineering").

### 6.1 Sequence

| Milestone | Contents | Owner (function) | Ideal effort | Calendar window |
|---|---|---|---|---|
| **M0 — Integrity** | W7 defects (D-03, D-04, D-13, D-21, D-23) + W8 lint skeleton | Data platform / verification | 2–3 d | **Mon 28 Sep – Wed 30 Sep** |
| **M1 — Floor foundation** | W4 zone + resource + routing masters, `ShopFloorZone` centre view, zone-select filtering | Data modelling + Centre/UI | 4–5 d | **Thu 1 Oct – Wed 7 Oct** |
| **M2 — Demand seam** | W1 CRM requested layer (`requestedDate`, order ref, priority, value) | Demand data | 2–3 d | **Thu 1 Oct – Mon 5 Oct** (parallel M1) |
| **M3 — Execution seam** | W2 work orders, shift handover, operator certs | MES data | 4–5 d | **Thu 8 Oct – Wed 14 Oct** |
| **M4 — Availability seam** | W3 EAM maintenance, restoration, window alternatives | Maintenance/EAM data | 4–5 d | **Thu 8 Oct – Wed 14 Oct** (parallel M3) |
| **M5 — Capacity rigour** | W5 ship calendar, time-phased allocation, derived COM-1018 date | Capacity/solver inputs | 3–4 d | **Thu 8 Oct – Tue 13 Oct** (parallel M3/M4) |
| **M6 — Governance** | W6 authority separation + enforcement, disclosure, role lens, override events | Governance/policy + Right-pane UX | 4–5 d | **Wed 15 Oct – Tue 21 Oct** |
| **M7 — Assurance** | W8 full verification + persona acceptance pass | Verification + QA | 2–3 d | **Wed 22 Oct – Fri 24 Oct** |

Total ideal effort ~25–33 engineering days; calendar ~4 weeks with parallelism. **Critical path: M0 → M1 → {M3, M4, M5} → M6 → M7.** M2 is off the critical path for the floor but is an M6 input.

### 6.2 Milestone exit criteria

| Milestone | Exit criteria (all must hold) |
|---|---|
| **M0** | Every referenced id resolves (no dangling option/approval/receipt); `constraintClass` + `constraintShortfall` replace `shortfall` with aliases; ladder uses correct units; one extra stale record + one source-down example; seeded COM-1104 routed through the gateway **or** labelled pre-seeded. `verify` green; run-hash contract versioned (N-05). |
| **M1** | Every commitment resolves to a routing → zone chain; every resource in exactly one zone; selecting a zone filters queue + ledger and re-scopes the right pane; floor renders downtime/coverage overlays; `verify` asserts routing completeness + resource→zone uniqueness. |
| **M2** | Ledger shows requested → promised → capable triple; demand-planner queue sorts by promise delta; delta arithmetic asserted. |
| **M3** | Shift view opens on today · my line; handover delta computable; expiring cert raises a coverage gate; WO quantities reconcile with pegs. |
| **M4** | Maintenance queue opens on derated resources by restoration time; window change approved as a window; restoration is evidence-backed; maintenance options obey the PM/calibration gate. |
| **M5** | No promise lands on a non-working day unnoticed (**N-01 test inverted**); allocation day-binned and reproducible; COM-1018 date derived; day-bin totals sum to window total. |
| **M6** | Persona acceptance items 1, 2, 5, 8 pass; **no single role satisfies a cross-authority requirement (N-04)**; redaction asserted before prompt construction; queue default-sorts per lens. |
| **M7** | `verify` covers every W1–W7 acceptance criterion; a single dangling reference fails the build; all P0 defects closed; A12 passes. |

### 6.3 Milestone dependency graph

```
M0 ──┬──► M1 ──┬──► M3 ──┐
     │         ├──► M4 ──┼──► M6 ──► M7
     └──► M2 ──┘   └──► M5 ┘    ▲
              M2 ────────────────┘
```

---

## 7. Decisions needed (plan §14 open questions as gates)

| Gate | Question | Blocks | PM recommendation |
|---|---|---|---|
| Q-05 | Authority model: resolve on policy (a) vs non-persona authority actor (b) | **M6 / N-04** | Adopt **(a)** for the demo; name owner + expiry on the card; enforce in `decideApproval` |
| Q-02 | Canonical shift-role name | M6 / D-09 | "Shift Executive (Supervisor)" in UI; migrate `shift-planner` id with a note |
| Q-03 | Is November (COM-0991) modelled or declared out-of-window? | M5 / D-12 | Model it once W5 lands |
| Q-04 | Maintenance run separate from production run? | M4 | Separate maintenance run, same snapshot, referencing the production run |
| Q-06 | Floor renders all zones or only open-decision zones? | M1 | Open-decision zones + a full-plant toggle |
| Q-01 | Single site vs site switcher | M1 (shape) | Hold single site this iteration |

---

## 8. Risks to watch

| Risk | Early-warning signal | Mitigation |
|---|---|---|
| Green build masks plan gaps | `verify` stays green as defects stay open (already true, N-01) | Land W8 lint **with** M0; invert defect-encoding assertions |
| Authority refactor breaks the demo | M6 needs a non-persona actor to record | Resolve on policy (Q-05a) |
| Zone view becomes decorative | Floor renders but selection doesn't filter | M1 exit criteria require filter + re-scope |
| D-04 refactor breaks reproducibility | run-diff changes | Version the model + migration note (N-05) |
| Parallel seams overload one squad | M3/M4/M5 all start 8 Oct | Stagger start or add capacity; M5 can trail M3 by 2 days |
| Fixture sprawl | flaky/duplicated ids | Deterministic + id-stable lint from M0 |

---

## 9. Immediate next actions

1. **Correct the plan's summary** defect count (13 → 25) and label the S1/S2 subset explicitly.
2. **Add N-01…N-08** to the register; add rows for the enforcement gaps (N-02, N-03, N-04).
3. **Kick off M0** on Mon 28 Sep — small, unblocks determinism, and touches the run hash.
4. **Confirm Q-05** before M6 design starts; it is the one decision that can invalidate approval UI work.
5. **Stand up W8 lint skeleton inside M0**, not M7, so every subsequent milestone lands against machine-checked invariants.

---

## 10. Change log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-09-26 | Initial status & roadmap readout: build-vs-plan audit, 25-defect reconciliation, 8 new findings, plan inconsistency corrected, dated M0–M7 roadmap with owners and exit criteria, decision gates and risks |