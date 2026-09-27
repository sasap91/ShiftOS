# FORGE Decision Room — Chatbot Gaps, Improvements & Persona Test Scripts

**Scope:** the right-pane AI copilot (chatbot). This document (1) lists open items, gaps and improvement areas for the chatbot, and (2) provides ≥10 test scripts per persona (Shift Planner, Manufacturing Manager, Maintenance Manager, Demand Planner), and (3) records whether the **current design** addresses each, with the **current build** state.

**Method:** Notion reviewed — Personas & Governance; UI/UX Layout & Interaction Spec; Demo/Testing & Validation; Execution Task List (Streams K/D/A/B/C/T/P/G/U/X); Product Management hub (defects D-01…D-25, N-01…N-08; decisions Q-01…Q-07; workstreams W1–W8); Context & Region Projections Execution Plan (Stream CP); Data Model & Synthetic Fixtures; Algorithms, Allocation & Replay; Stock-take v0.2; plus the three chatbot design docs and the working tree (`src/`, `server/`).

**Legend**
- **Design coverage** — does the *design* address it? `Addressed` (specified) · `Partial` · `Missing`.
- **Build** — does the *code* do it today? `Implemented` · `Partial` · `Missing`.
- Source refs: `D-xx`/`N-xx` defects, `Q-xx` decisions, `G-xx`/`X-xx`/`U-xx`/`K-xx`/`CP-xx` tasks, `R#` stock-take risks.

> **Verdict up front:** the design **addresses most gaps** (the control plane, authority model, run lifecycle, states and acceptance criteria are all specified), but the **build lags the design** — the UI is not wired to the AI, only the Investigate sub-orchestrator exists, and the data seams (CRM/MES/EAM) and governance enforcement are missing. Net: **design ~75% covering, build ~35% realising.**

---

## 1. Current chatbot state (baseline for the gaps)

| Capability | Design doc | Build |
|---|---|---|
| Right-pane placement (chat only right; centre = record) | Right-pane design §1 | ✅ implemented |
| Deterministic intent router (fail-closed) | Right-pane design §6; Build Plan P1 | ✅ implemented |
| Typed-tool gateway (16 tools, provenance, authz, audit) | Build Plan §6 | ✅ implemented |
| Model client + Investigate orchestrator + grounding validator | Build Plan §4 (P3) | ✅ implemented (API only) |
| **UI wired to the AI** | Build Plan §4 (P6) | ❌ missing (app still scripted) |
| Scenario / Approval-Action AI orchestrators | Build Plan §4 (P4/P5) | ❌ scripted only |
| Durable run card + solver events | Build Plan §11; Algorithms §8 | ❌ missing |
| Causal-code translator / Explanation object | G-01/G-03; Algorithms §10 | ❌ missing |
| Authority enforcement + disclosure/redaction | Personas §3/§5; G-04/G-05 | ❌ missing |
| Persona acceptance harness | T-12 | ❌ 0/40 recorded |

---

## 2. Open items, gaps & improvement areas

### A. Runtime & wiring

| ID | Gap / open item | Source | Design | Build | Note |
|---|---|---|---|---|---|
| CB-01 | UI not wired to `/api/chat/turn`; app runs the local scripted orchestrator | Stock-take R7; CP plan §0; verify-ai | Addressed | Missing | Biggest single gap — the AI exists but isn't used by the product. |
| CB-02 | Live AI enablement/ops (`FEATURE_AI_CHAT`, key, health `mode`) | Build Plan P0; P-05 | Addressed | Partial | Works via API; not surfaced in-app. |
| CB-03 | No turn streaming (SSE) / progressive blocks | Build Plan §4 (P6); `ChatStreamEvent` | Addressed | Missing | Types defined; endpoint not built. |
| CB-04 | No durable run card / `SolverRunEvent` stream | Build Plan §11; U-03/U-05; X-06 | Addressed | Missing | Store returns instantly; no phases/cancel/rerun. |
| CB-05 | No citation jump from block → centre cell / evidence | U-04; Right-pane §10 | Addressed | Missing | Blocks carry ids; no deep-link target wiring. |
| CB-06 | No selection bus / `activeContext` | U-02; CP plan L1 | Addressed | Missing | App uses ad-hoc React state; hash written but never read. |
| CB-07 | Turn state is stateless server-side (each call rebuilds a fresh thread) | Build Plan §8; Chatbot spec §9.3 | Partial | Missing | No turn/case memory; multi-turn continuity absent. |

### B. Orchestrator coverage

| ID | Gap | Source | Design | Build | Note |
|---|---|---|---|---|---|
| CB-08 | Scenario sub-orchestrator is scripted, not AI | X-05/X-06; Build Plan P4 | Addressed | Missing | Router routes it; no AI path. |
| CB-09 | Approval/Action sub-orchestrator is scripted, not AI | Build Plan P5 | Addressed | Missing | — |
| CB-10 | No causal-code translator (versioned business codes) | G-01; Algorithms §10 | Addressed | Missing | Prose is model-authored without a coded causal map. |
| CB-11 | No Explanation object (chain, counterfactuals, confidence, redaction) | G-03; Personas §6 | Addressed | Missing | Only answer/why/explanation prose. |
| CB-12 | Investigate is packet-only; no counterfactual ("what would change my answer") | Personas §6 (automation-bias guard) | Partial | Missing | Design names it; not in the orchestrator contract. |
| CB-13 | Draft output is not differentiated from a governed brief beyond a label | Build Plan §6; right-pane §9 | Partial | Partial | Draft tool labels "not an approval"; no approval-brief schema. |

### C. Grounding & validation

| ID | Gap | Source | Design | Build | Note |
|---|---|---|---|---|---|
| CB-14 | Validator covers Investigate only; not scenario/action/draft claims | Build Plan §4 (P3/P7) | Partial | Partial | `validateInvestigation` only. |
| CB-15 | No runtime `NumberRef` provenance (no orphan numbers) | K-05; Algorithms §1; Data Model §6 | Addressed | Missing | Validator approximates by scanning the packet. |
| CB-16 | Stale/conflict prose rules enforced only loosely | Right-pane §14; Data Model §6 | Addressed | Partial | Conflict-vs-"approved" check exists; stale ⇒ ∅ mostly fact-level. |
| CB-17 | No confidence / "insufficient evidence" calibration beyond a fallback string | Personas §6; right-pane §9 | Partial | Partial | Insufficiency fallback exists. |
| CB-18 | Prompt-injection screening of retrieved text | Chatbot spec §13; build plan §7 | Addressed | Missing | No RAG yet (v1 structured-only), so risk deferred. |

### D. Governance & authority

| ID | Gap | Source | Design | Build | Note |
|---|---|---|---|---|---|
| CB-19 | `canPropose` enforced on the request path | N-02; Personas §2 | Addressed | Partial | Router + gateway now gate; not asserted in tests. |
| CB-20 | Envelope misdescribes approval authority | N-03 | Addressed | Partial | — |
| CB-21 | Policy authority is cosmetic (Finance/Quality/Program not enforced) | N-04; Personas §3 | Addressed | Partial | `authority` field present; no enforcement that a persona can't satisfy it. |
| CB-22 | Authority collapsed into one approver | D-08 | Addressed | Partial | Remap done; cross-authority invariant unasserted. |
| CB-23 | Disclosure/redaction before prompt construction | D-10; G-05; CP-15 | Addressed | Missing | "not authorized" ≠ "absent" not implemented anywhere yet. |
| CB-24 | Override capture + review queue | D-25; G-06; N-08 | Addressed | Partial | `HumanOverrideEvent` + `record_human_override` tool exist; no UI/queue. |

### E. Determinism & provenance

| ID | Gap | Source | Design | Build | Note |
|---|---|---|---|---|---|
| CB-25 | Canonical JSON + SHA-256 hash (runtime) + golden-hash fixtures | K-06/K-11; Algorithms §1 | Addressed | Missing | `canonicalResult` exists but no hash/golden file. |
| CB-26 | Logical clock; no wall-clock in the decision path | K-08 | Addressed | Missing | Model uses fixed `AS_OF`, but no injected clock. |
| CB-27 | Deterministic sort/tie-break (no `localeCompare`) | K-07 | Addressed | Partial | Some `localeCompare` remains in `model.ts`. |
| CB-28 | Event-sourced run lifecycle + terminal-state map | K-10; Algorithms §8 | Addressed | Partial | Store is in-memory; no terminal-state enum wired to UI. |

### F. Data seams the chatbot needs to answer persona questions

| ID | Gap | Source | Design | Build | Note |
|---|---|---|---|---|---|
| CB-29 | CRM requested layer (requested ≠ promised ≠ capable) | D-01; W1; A-05 | Addressed | Missing | Demand-planner questions unanswerable today. |
| CB-30 | MES execution/handover/coordination | D-15; W2; C-01…C-09 | Addressed | Missing | Shift-planner handover/coverage questions unanswerable. |
| CB-31 | EAM maintenance (root cause, restoration, windows) | D-16; W3; B-01 | Addressed | Missing | Maintenance-manager questions unanswerable. |
| CB-32 | Zone/routing masters wired into read model | D-07; W4; D-03…D-05 | Addressed | Partial | Floor view built; masters not loaded by `src/`/`server/`. |
| CB-33 | Ship calendar + time-phased allocation | D-17/D-18; W5 | Addressed | Missing | Non-working-day promises not validated in chat. |
| CB-34 | November demand modelled or declared out (Q-03) | D-12; OI-03 | Addressed | Missing | COM-0991 handled as a stub. |

### G. Persistence, ops & security

| ID | Gap | Source | Design | Build | Note |
|---|---|---|---|---|---|
| CB-35 | Run store persistence (link restores a decision in progress) | P-07; CP-17/CP-20 | Addressed | Missing | In-memory; reload loses approvals/receipts. |
| CB-36 | Audit sink queryable + trace ids | P-06 | Addressed | Partial | JSONL written; no query/sink. |
| CB-37 | Hosting target (SSE-capable) | P-11; OI-21 | Addressed | Missing | Not selected. |
| CB-38 | Cost model (LLM tokens, compute) | P-12 | Addressed | Missing | Token caps exist; no costing. |
| CB-39 | Cross-tenant / multi-site isolation | D-22 (open by design) | Partial | Missing | Single-tenant by design; no isolation tests. |
| CB-40 | Secrets stay server-side | P-05 | Addressed | Implemented | Key only read in `server/model/client.ts`. |

### H. Testing & assurance

| ID | Gap | Source | Design | Build | Note |
|---|---|---|---|---|---|
| CB-41 | Persona acceptance harness (items 1–10) | T-12; PM §6 | Addressed | Missing | 0/40 recorded. |
| CB-42 | Authority separation + redaction tests | T-07; G-04/G-05 | Addressed | Partial | Router/tool gating tested; cross-authority/redaction not. |
| CB-43 | CAS/stale execute test | T-06; CP-19 | Addressed | Missing | No CAS. |
| CB-44 | Replay/property tests | T-04/T-05 | Addressed | Missing | — |
| CB-45 | Fixture lint (dangling ids, source+timestamp) | T-03; D-16 | Addressed | Missing | — |
| CB-46 | Accessibility tests (keyboard, contrast, reduced motion) | T-14; UI/UX §10 | Addressed | Missing | Chat pane keyboard baseline exists; not tested. |
| CB-47 | E2E golden thread | T-13 | Addressed | Missing | — |
| CB-48 | Injection + cross-tenant tests | Chatbot spec §13 | Addressed | Missing | — |

### I. Improvement areas (beyond defects)

| ID | Improvement | Rationale / source |
|---|---|---|
| CB-49 | Show **confidence + counterfactuals** and "what would change my answer" by default | Automation-bias guard (Personas §6) |
| CB-50 | Surface **run diff (v1→v2)** on rebase/stale | Algorithms §7; CAS UX |
| CB-51 | **Latency classes** in UI (fast explain / interactive / deep) | Chatbot spec §17.4 |
| CB-52 | **Override UX** + offline review queue view | D-25; G-06 |
| CB-53 | Multi-turn **memory tiers** (turn/case/user) | Chatbot spec §9.3 |
| CB-54 | **RAG** for procedures/specs (untrusted, cited) | OI-12 (deferred v1) |
| CB-55 | Turn-level **cost/latency/token** telemetry surfaced to PM | P-12 |
| CB-56 | **Persona-tuned orient block** (lead question drives first answer) | Persona doc §8 |

---

## 3. Coverage summary

| Area | Addressed | Partial | Missing |
|---|---|---|---|
| A. Runtime & wiring | 5 | 1 | 1 |
| B. Orchestrator coverage | 3 | 2 | 0 |
| C. Grounding & validation | 3 | 4 | 3 |
| D. Governance & authority | 6 | 0 | 2 |
| E. Determinism | 4 | 1 | 2 |
| F. Data seams | 6 | 1 | 5 |
| G. Persistence/ops | 5 | 1 | 2 |
| H. Testing | 8 | 1 | 7 |
| **Design coverage total** | **~40** | **~11** | **~22 inc. sub-items** |

**Biggest gaps (design→build):** CB-01 (UI wiring), CB-04 (run card), CB-10/11 (causal codes + explanation), CB-23 (redaction), CB-29/30/31 (data seams), CB-41 (persona acceptance).

---

## 4. Persona test scripts

Each script: ask/do → expected → design/build coverage. "Design ✅" means specified; "Build ⚠/✗" means not yet realised.

### 4.1 Shift Planner (lens: coverage) — 12 scripts

| ID | Ask / do | Expected | Design | Build |
|---|---|---|---|---|
| SP-01 | "Can we cover the leak-test gap without moving frozen work?" | Coverage answer: third shift on the 6 healthy days; frozen peg protected | ✅ | ⚠ scripted |
| SP-02 | "Who is certified on RES-LT-01 on 10 Oct?" | `LAB-LT-CERT` fact; cert validity; gate if expired | ✅ | ⚠ |
| SP-03 | "What does the extra shift cost, and who approves?" | $6,624 overtime **estimate**; Finance authority named | ✅ | ⚠ scripted |
| SP-04 | "Approve the third shift" (as shift planner) | Refused: propose-only role | ✅ | ✅ gateway |
| SP-05 | "What changed on my line since last handover?" | Handover delta (WIP/open issues/escalations) | ✅ | ✗ (CB-30) |
| SP-06 | "Sequence the changeover between CPL-480 and RM-42" | Changeover matrix result or explicit cut | ✅ | ✗ (D-12) |
| SP-07 | "Add Saturday overtime on 10 Oct" | Infeasible, residual shortfall 48, no hard gate | ✅ | ✅ scripted |
| SP-08 | "Which commitments does RES-LT-01 cover?" | Blast radius: COM-1042 hit; COM-1104 pegged | ✅ | ✅ |
| SP-09 | "Execute the roster write-back" | Refused: shift planner cannot execute | ✅ | ✅ gateway |
| SP-10 | "Is 10 Oct a healthy or degraded day?" | Degraded (half rate) with source + effectivity | ✅ | ✅ |
| SP-11 | Keyboard: ↑/↓ through chat next-actions, Enter activates | Roving focus, aria-live announcements | ✅ | ⚠ |
| SP-12 | "Give me the exact crew headcount for a fourth shift" (not modelled) | Insufficiency: cannot be established; no invented number | ✅ | ✅ validator |

### 4.2 Manufacturing Manager (lens: throughput) — 12 scripts

| ID | Ask / do | Expected | Design | Build |
|---|---|---|---|---|
| MM-01 | "Rank the top risks this week" | Ranked by promise impact; two infeasible commitments | ✅ | ⚠ scripted (per-commitment only) |
| MM-02 | "Cheapest recovery holding the most promises" | Third shift (COM-1042) + MV-14B (COM-1018) — different constraints | ✅ | ✅ scripted |
| MM-03 | "What slips and what does it cost?" | 4-day slip, $6,624 estimate, held/quantity detail | ✅ | ✅ |
| MM-04 | "Approve the third shift" (within policy) | Approval recorded; still needs dry-run + receipt | ✅ | ✅ |
| MM-05 | "Approve without Finance for a $6,624 spend" | Blocked: over threshold → Finance authority | ✅ | ⚠ (CB-21) |
| MM-06 | "Change the customer date to 19 Oct" | Routed as request; Program authority required; not self-approved | ✅ | ⚠ |
| MM-07 | "Blast radius if RES-LT-01 slips further" | Pegged commitments + downstream | ✅ | ✅ |
| MM-08 | "Count held lot LOT-8841 as eligible" | Refused: QH-317 hard gate; never eligible | ✅ | ✅ |
| MM-09 | "Show the infeasible options and why" | Rejected options with violated hard gate (frozen/eligibility) | ✅ | ✅ |
| MM-10 | "Execute now" (approval done, no dry run) | Rejected: dry run required first | ✅ | ✅ scripted |
| MM-11 | Execute after snapshot drift | CAS mismatch → StaleError → rebase v2 + diff | ✅ | ✗ (CB-43) |
| MM-12 | "What's the weather?" | Fail-closed clarification, not a general assistant | ✅ | ✅ router |

### 4.3 Maintenance Manager (lens: availability) — 12 scripts

| ID | Ask / do | Expected | Design | Build |
|---|---|---|---|---|
| MT-01 | "Why is RES-LT-01 down and what's the impact?" | Downtime chain: half rate 6–14 Oct → 64 short | ✅ | ✅ scripted |
| MT-02 | "When is it back to full rate?" | Restoration fact + calendar master; evidence required | ✅ | ⚠ (CB-31) |
| MT-03 | "Move the maintenance window earlier — what changes?" | Window alternatives with impact delta | ✅ | ⚠ scripted |
| MT-04 | "Run the fixture through the PM window" | Blocked: PM/calibration gate is non-waivable | ✅ | ✗ (CB-31) |
| MT-05 | "Confirm the asset is restored" | Requires RestorationFact evidence; else "not established" | ✅ | ✗ |
| MT-06 | "Defer the PM for two weeks" | Policy check; not self-approved if it breaches a gate | ✅ | ⚠ |
| MT-07 | "Which assets have open downtime events?" | List from EAM with restoration times | ✅ | ✗ (CB-31) |
| MT-08 | "Which commitments are exposed to EVT-LT-041?" | Blast radius filtered to the resource | ✅ | ✅ |
| MT-09 | "Approve the maintenance window change" (as maintenance mgr) | Approved **as a window**, not a customer promise | ✅ | ⚠ |
| MT-10 | "Did the restoration work?" | Observed outcome (not assumed on receipt) | ✅ | ✅ scripted |
| MT-11 | "Read me the solver raw duals" | No raw solver logs as causality; mapped causal code | ✅ | ✗ (CB-10) |
| MT-12 | Keyboard/aria: evidence drawer toggle announces state | aria-expanded, focus retained | ✅ | ⚠ |

### 4.4 Demand Planner (lens: demand) — 12 scripts

| ID | Ask / do | Expected | Design | Build |
|---|---|---|---|---|
| DP-01 | "Which customer requests are at risk?" | At-risk commitments with date deltas | ✅ | ⚠ scripted |
| DP-02 | "Requested vs promised vs capable for COM-1042?" | CRM requested, ERP promised, capable — three deltas | ✅ | ✗ (CB-29) |
| DP-03 | "Which customer is worst affected?" | Ranked by promise delta / priority | ✅ | ✗ (CB-29) |
| DP-04 | "Draft a note to Northline" | Labelled draft; not an approved commitment | ✅ | ✅ |
| DP-05 | "Select the third-shift option" (as demand planner) | Refused: request-only role | ✅ | ✅ |
| DP-06 | "Request a priority change for Northline" | Routed to Program; not self-approved | ✅ | ⚠ |
| DP-07 | "What's the forecast for QD-220 next quarter?" | Records-only; no history → cannot establish | ✅ | ✅ validator |
| DP-08 | "Is COM-0991 in scope this window?" | Declared out-of-window (Q-03) | ✅ | ✗ (CB-34) |
| DP-09 | "Show COM-1042's margin" (field not authorized) | "Not authorized", never "absent" | ✅ | ✗ (CB-23) |
| DP-10 | "Northline revenue if we slip" (not in evidence) | Refused; no invented number | ✅ | ✅ validator |
| DP-11 | "Blast radius for the demand view" | Read-only pegging view | ✅ | ✅ |
| DP-12 | "Send the note now" over an open waiver gap | Send disabled; gap stated | ✅ | ⚠ |

**Test count:** 48 scripts (12 per persona). All four roles exceed the 10-script minimum.

---

## 5. Does the current design address the persona asks?

| Persona | Design addresses | Build today |
|---|---|---|
| **Shift Planner** | Coverage lens, roster/overtime propose-only, certification gate, handover (specified) | ~5/12 real; handover/changeover/streaming missing |
| **Manufacturing Manager** | Throughput lens, approve within policy, escalation, blast, receipts | ~8/12 real; authority enforcement + CAS/streaming missing |
| **Maintenance Manager** | Availability lens, window approval, restoration evidence, causal codes | ~4/12 real; EAM seam + causal codes missing |
| **Demand Planner** | Demand lens, requested→promised gap, draft-not-commitment, request-only | ~4/12 real; CRM demanded seam + redaction missing |

**Conclusion**
- The **design is substantially sufficient**: 40/62 gap-areas are addressed and 36/48 persona scripts have a design answer.
- The **build realises ~35%**: the AI control plane works at the API, but the product UI, the scenario/action orchestrators, causal codes, governance enforcement and the CRM/MES/EAM seams are not built.
- The **highest-leverage fixes** to make the chatbot "address" its personas end-to-end: CB-01 (wire UI), CB-04 (run card), CB-10/11 (causal codes + explanation), CB-23 (redaction), CB-29/30/31 (data seams), CB-41 (persona acceptance harness).

---

## 6. Recommended sequence

1. **CB-01 + CB-06** — wire the right pane to `/api/chat/turn` behind `FEATURE_AI_CHAT`, and land the `activeContext` selection bus (CP-M1). Unlocks the AI in-product and citations.
2. **CB-23 + CB-19/21** — server-side role scoping/redaction and authority enforcement (M6, G-04/G-05). Closes N-02/N-03/N-04/D-08.
3. **CB-04 + CB-03** — durable run card + SSE (P4/U-03/U-05).
4. **CB-10/11** — causal-code translator + Explanation object (G-01/G-03).
5. **CB-29/30/31** — CRM/MES/EAM seams (W1/W2/W3) so persona questions are answerable.
6. **CB-41/CB-43/44/47** — persona acceptance harness, CAS, replay, e2e (M7).

> Source of truth for chatbot gaps remains the AI Chat Build Plan; this page is the persona-and-gap bridge between the design set and the persona acceptance criteria (Personas & Governance §8, PM §6).