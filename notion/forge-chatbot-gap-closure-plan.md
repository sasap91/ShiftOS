# FORGE Decision Room — Chatbot Gap-Closure & Persona Acceptance Plan

**Purpose:** close the chatbot gaps identified in *Chatbot Gaps, Improvements & Persona Test Scripts* (CB-01…CB-56) and turn the 48 persona test scripts into an automated, role-scoped acceptance harness. This plan is the bridge between the chatbot design set and the persona acceptance criteria (Personas & Governance §8, PM §6).

**Parent:** FORGE Decision Room — Product Management · AI Chat Build Plan · Context & Region Projections Execution Plan.

**Ground truth:** `src/` · `server/` · `npm run verify` · `npm run verify:server` · `npm run verify:tools` · `npm run verify:ai`.

---

## 0. Definition of done

1. The right pane calls `POST /api/chat/turn`; when `FEATURE_AI_CHAT=1` the live grounded AI answers in-product; otherwise the scripted fallback runs. (CB-01/02)
2. One canonical `activeContext` drives all four regions; selection survives reload. (CB-06)
3. Every reply is grounding-validated; no ungrounded number reaches any role. (CB-14/15)
4. Authority is enforced server-side: an operational role can never satisfy a Finance/Quality/Program/Procurement requirement. (CB-19/21/22)
5. Redacted fields render "not authorized", never "absent", and are stripped before prompt construction. (CB-23)
6. Scenario and Approval/Action are AI sub-orchestrators with the same grounding + validation guarantees as Investigate. (CB-08/09)
7. Solver runs are durable; the run card streams phases; timeout ≠ infeasible; resume by run id. (CB-04/28)
8. Causal codes and an Explanation object back every user-facing causality claim. (CB-10/11)
9. **All 48 persona scripts pass** in the acceptance harness (12 per role). (CB-41)
10. `npm run verify:persona` is green in CI and recorded in Persona Acceptance (PM §6).

---

## 1. Baseline

| Layer | Today | Gap |
|---|---|---|
| Design | 40 addressed / 11 partial / 22 missing sub-items | — |
| Build | AI works at the API; product UI is scripted | CB-01 is the keystone |
| Personas | 0/40 acceptance recorded | CB-41 |

**Keystone order:** wire the UI → enforce governance → ground the scenario/action paths → close data seams → automate acceptance.

---

## 2. Workstreams

### WS1 — Runtime & wiring (unblocks everything)
Tasks: `CG-01` wire right pane to `/api/chat/turn` behind `FEATURE_AI_CHAT`; `CG-02` SSE streaming endpoint + client; `CG-03` `activeContext` type + URL codec + selection bus (CP-M1); `CG-04` citation jump (block id → centre cell / evidence); `CG-05` feature-flagged static fallback (no model / source down).

### WS2 — Governance enforcement
`CG-06` server-side role scoping + disclosure/redaction before prompt; `CG-07` authority enforcement (persona ≠ policy authority); `CG-08` `canPropose` asserted on the request path; `CG-09` override UI + offline review queue; `CG-10` redaction/boundary tests.

### WS3 — Grounding & determinism
`CG-11` runtime `NumberRef` provenance; `CG-12` canonical JSON + SHA-256 + golden-hash fixtures; `CG-13` injected logical clock; `CG-14` deterministic sort/tie-break (remove `localeCompare`); `CG-15` validator coverage for scenario/action/draft; `CG-16` stale/conflict prose assertions.

### WS4 — Orchestrator coverage
`CG-17` Scenario sub-orchestrator (AI) with tools `run_recovery_scenario`, `compare_alternatives`, `get_solver_run_status`; `CG-18` Approval/Action sub-orchestrator (AI) with workflow tools; `CG-19` causal-code translator (versioned map); `CG-20` Explanation object (chain, counterfactuals, confidence, provenance, redaction); `CG-21` counterfactual/"what would change my answer".

### WS5 — Data seams (chatbot answerability)
`CG-22` CRM requested layer (requested→promised→capable); `CG-23` MES execution/handover/certs; `CG-24` EAM maintenance/restoration/windows; `CG-25` zone/routing masters wired into the read model; `CG-26` ship calendar + time-phased allocation; `CG-27` November demand decision (Q-03).

### WS6 — Persistence & run lifecycle
`CG-28` JSONL event store + fold/rebuild; `CG-29` durable run card + `SolverRunEvent` stream; `CG-30` governed command endpoints (idempotent); `CG-31` compare-and-swap execute (stale → rebase v2 + diff); `CG-32` run diff (v1→v2); `CG-33` audit sink query by trace id.

### WS7 — Persona acceptance harness
`CG-34` harness runner (`npm run verify:persona`); `CG-35` 48 scripts encoded (12 per role) with expectation types; `CG-36` grounding/governance/failure categories; `CG-37` a11y checks; `CG-38` CI wiring + recorded matrix (T-12).

### WS8 — Improvements
`CG-39` confidence + counterfactuals surfaced; `CG-40` latency classes in UI; `CG-41` multi-turn memory tiers; `CG-42` RAG (procedures/specs, untrusted, cited) — deferred; `CG-43` cost/token telemetry; `CG-44` persona-tuned orient block.

---

## 3. Task table

| ID | Task | Owner | Depends | Exit criteria |
|---|---|---|---|---|
| CG-01 | Wire right pane to `/api/chat/turn` | FE,BE | — | AI answer renders in-product when flag on; scripted fallback otherwise |
| CG-02 | SSE streaming (`ChatStreamEvent`) | BE,FE | CG-01 | progress → blocks → done; aria-live |
| CG-03 | `activeContext` + URL codec + selection bus | FE | — | same context → same four regions (T-11) |
| CG-04 | Citation jump block → centre/evidence | FE | CG-01,CG-03 | every fact/calc block focuses a centre object |
| CG-05 | Static fallback flag | BE,FE | CG-01 | no model/source-down → scripted, never blank |
| CG-06 | Redaction before prompt + render | GOV,BE | — | redacted ≠ absent; asserted |
| CG-07 | Authority enforcement | GOV,BE | CG-06 | cross-authority unsatisfiable by an operational role |
| CG-08 | `canPropose` on request path | BE | CG-07 | assert in tests (N-02) |
| CG-09 | Override UI + review queue | FE,GOV | CG-06 | rejection captured with code+rationale |
| CG-10 | Redaction/boundary tests | QA | CG-06/07 | T-07 green |
| CG-11 | Runtime NumberRef | BE | — | every displayed number resolves |
| CG-12 | Canonical hash + golden fixtures | BE | CG-11 | hash drift fails build |
| CG-13 | Logical clock | BE | — | no wall-clock in decision path |
| CG-14 | Deterministic sort | BE | — | no `localeCompare` in decision path |
| CG-15 | Validator: scenario/action/draft | AI | CG-17/18 | no ungrounded claim in any path |
| CG-16 | Stale/conflict prose asserts | AI | CG-15 | stale ⇒ ∅; no "approved" over conflict |
| CG-17 | Scenario orchestrator (AI) | AI | CG-01,CG-15 | "compare alternatives" grounded |
| CG-18 | Approval/Action orchestrator (AI) | AI | CG-01,CG-15 | draft/brief grounded; actions policy-gated |
| CG-19 | Causal-code translator | AI,GOV | — | versioned map; no raw duals to user |
| CG-20 | Explanation object | AI | CG-19 | chain + counterfactual + confidence emitted |
| CG-21 | Counterfactual affordance | AI,FE | CG-20 | "what would change my answer" shown |
| CG-22 | CRM requested layer | DATA,BE | — | requested→promised→capable computes |
| CG-23 | MES execution/handover/certs | DATA,BE | — | handover query answerable |
| CG-24 | EAM maintenance/restoration | DATA,BE | — | downtime/restoration answerable; evidence-backed |
| CG-25 | Zone/routing into read model | DATA,BE | — | floor/zone-select filters queue+ledger |
| CG-26 | Ship calendar + time-phasing | DATA,AI | — | non-working promises flagged |
| CG-27 | November demand decision | PM,AI | — | Q-03 resolved and reflected |
| CG-28 | JSONL event store | BE | — | reload rebuilds runs/approvals/receipts |
| CG-29 | Durable run card + events | BE,FE | CG-28 | phase stream; timeout ≠ infeasible |
| CG-30 | Governed command endpoints | BE | CG-28 | idempotent; baseline unmutated |
| CG-31 | CAS execute | BE | CG-30 | StaleError → rebase v2 + diff |
| CG-32 | Run diff v1→v2 | FE | CG-31 | changed inputs/outputs visible |
| CG-33 | Audit query by trace id | BE | CG-28 | trace resolves to turn/tool/events |
| CG-34 | Persona harness runner | QA | CG-01 | `npm run verify:persona` runs |
| CG-35 | Encode 48 scripts | QA,PM | CG-34 | 12/role encoded; expectation types |
| CG-36 | Grounding/governance/failure cats | QA | CG-35 | categories asserted |
| CG-37 | a11y checks | QA,FE | CG-34 | keyboard/aria checks pass |
| CG-38 | CI wiring + matrix | QA | CG-34/35 | persona matrix recorded (T-12) |
| CG-39 | Confidence + counterfactuals | AI,FE | CG-20 | shown by default |
| CG-40 | Latency classes in UI | FE | CG-29 | fast/interactive/deep labelled |
| CG-41 | Multi-turn memory tiers | BE | CG-28 | turn/case memory; no cross-case leak |
| CG-42 | RAG procedures/specs (deferred) | AI | CG-06 | untrusted, cited, cannot authorize |
| CG-43 | Cost/token telemetry | BE | CG-01 | per-turn tokens/latency logged |
| CG-44 | Persona-tuned orient block | AI,FE | CG-35 | lead question drives first answer |

---

## 4. Persona acceptance harness design

### 4.1 Shape

```
server/persona-acceptance/
  cases.ts        // 48 cases: { id, role, ask|action, commitmentId, expect }
  expect.ts       // expectation predicates
  run.ts          // runs each case via runTurn(), records pass/fail/skip
  matrix.md       // generated: persona × criterion
```

Case expectation types:
- `route` — intent class + tool subset (e.g. SP-08 → `trace`, `trace_blast_radius`).
- `block` — required block kinds/ids (e.g. MM-09 → a `options` block with a rejected option + hard gate).
- `refusal` — must refuse (SP-04, DP-05, MM-08).
- `grounded` — validator ok; no ungrounded number (SP-12, DP-10).
- `governance` — authority/redaction (MM-05, DP-09).
- `a11y` — keyboard/aria (SP-11, MT-12).
- `blocked` — requires a seam not yet built; counted `skip` now, `pass` in target mode.

### 4.2 Modes

- `--phase=now` — runs what exists; `blocked` cases report **skip** with the gap id (CB-xx). Records a baseline.
- `--phase=target` — all 48 must pass; used at M7.

### 4.3 Per-persona exit

A persona passes when all its non-`blocked` cases pass in `now` mode **and** all 12 pass in `target` mode. Recorded in PM §6 as `criteria met / 10` (rolled up from the 12 scripts).

### 4.4 Recording

The runner writes `var/acceptance/{date}.json` and `matrix.md`; the summary is copied to Persona Acceptance (PM §6) at each gate.

---

## 5. Traceability (gap → task → test)

| Gap | Task | Test script(s) |
|---|---|---|
| CB-01 | CG-01 | all 48 (live mode) |
| CB-04/28 | CG-29/30 | MM-10, MT-10, scenario cases |
| CB-06 | CG-03 | cross-pane determinism (T-11) |
| CB-08 | CG-17 | MM-02, MM-09 |
| CB-09 | CG-18 | MM-04/05/06, SP-04, DP-05 |
| CB-10/11 | CG-19/20 | MT-11, MM-03 |
| CB-14/15 | CG-11/15 | SP-12, DP-10, MT-11 |
| CB-19/21/22 | CG-07/08 | MM-05, MM-06, SP-04 |
| CB-23 | CG-06 | DP-09 |
| CB-29 | CG-22 | DP-02/03 |
| CB-30 | CG-23 | SP-05 |
| CB-31 | CG-24 | MT-01/04/05/07 |
| CB-33 | CG-26 | SP-10, MM-11 |
| CB-41 | CG-34/35 | matrix (all roles) |
| CB-43 | CG-31 | MM-11 |
| CB-49 | CG-39 | confidence/counterfactual checks |

---

## 6. Milestones & sequencing

| Milestone | Tasks | Gate |
|---|---|---|
| **PC1 — In-product AI** | CG-01, CG-05, CG-34/35 (baseline) | AI runs in the right pane (flag on); harness baseline recorded |
| **PC2 — Governance** | CG-06…CG-10 | authority separation + redaction green (T-07) |
| **PC3 — Grounded scenario/action** | CG-11…CG-21 | scenario/action grounded; causal codes + explanation |
| **PC4 — Durable runs** | CG-28…CG-33 | run card streams; CAS rejects stale |
| **PC5 — Data seams** | CG-22…CG-27 | persona questions answerable (W1/W2/W3) |
| **PC6 — Persona acceptance** | CG-36…CG-38 | 48/48 in target mode; matrix recorded |
| **PC7 — Improvements** | CG-39…CG-44 | polish |

Critical path: **PC1 → PC2 → PC3 → PC6**. PC4/PC5 run in parallel after PC2.

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| UI wiring exposes ungrounded claims | Ship CG-01 behind flag with CG-15 validator before enabling AI by default |
| Data seams slip → persona scripts stay blocked | Harness reports `blocked` with gap id; PC1 baseline makes the dependency visible |
| Authority enforcement breaks the demo | Resolve-on-policy (Q-05a); feature-flag enforcement |
| Register churn / Notion⇄local drift | Append-only edits; this plan is the source for chatbot status |
| Token cost/latency | Token caps, ≤2 calls/turn, latency classes (CG-40/43) |

---

## 8. Acceptance

- `npm run verify:persona --phase=target` → 48/48 pass.
- Persona Acceptance (PM §6) recorded: 4/4 roles pass.
- T-06 (CAS), T-07 (authority/redaction), T-11 (cross-pane) green.
- No ungrounded number in any of the 48 cases.

---

## 9. Open decisions

1. **Enable AI by default or flag-gated for the demo?** (recommend flag-gated, on by default in the demo build).
2. **Persona case count:** keep 12/role or expand to the full criterion set (10 criteria + ledger A1–A12)?
3. **Harness target:** assert on `runTurn` (server) only, or also drive the UI (Playwright-style)? (recommend server-first; UI a11y via CG-37).
4. **Q-03 (November)** and **Q-07 (north-star)** are inputs to CG-27/CG-39 — close before PC5/PC7.

---

## 10. Change log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-09-27 | Created the chatbot gap-closure & persona acceptance plan: 8 workstreams, 44 tasks (CG-01…CG-44), 48-script harness design, traceability, milestones PC1–PC7, risks, acceptance |