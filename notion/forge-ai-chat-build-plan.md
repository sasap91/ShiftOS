# FORGE Decision Room — AI Chat Build Plan

**Goal:** turn the scripted right-pane copilot into the AI control plane specified in *FORGE — AI Decision-Room Chatbot Specification* — a role-scoped, deterministic-routed, tool-bounded conversational system whose prose is grounded in governed records and which never calculates official numbers, approves, or writes directly.

Companion to `forge-chatbot-right-pane-design.md`, `forge-right-pane-personas.md`, and `forge-commitment-ledger-design.md`.

---

## 0. Definition of done

The build is done when, for the leak-test fixture thread, a user can hold a real conversation that satisfies:

1. Every turn is bound to an authorized `ContextEnvelope`.
2. 100% of material numeric claims originate from deterministic services and carry provenance (fact id / calc id / run id / trace id).
3. The same `(snapshot_hash, master_set_version, model_version)` reproduces the same operational result.
4. Source fact, calculation, AI explanation, recommendation, approval, action, receipt, and outcome are visibly distinct.
5. Held/expired/failed-test/unqualified supply is never described as eligible.
6. Infeasible options expose the violated hard gate.
7. Recommendations expire when governing evidence changes.
8. No material action is enabled without named approval; approval alone never executes (receipt required).
9. Every attempted action produces a receipt or explicit failure.
10. A timed-out search is never described as proven infeasible.
11. Ambiguous/unsupported requests fail closed or ask clarification (no general-assistant fallback).
12. Cross-tenant and unauthorized-field requests return no data; "not authorized" ≠ "absent".
13. Tool and model failures produce explicit states, never invented answers.
14. Prompt-injection in retrieved text cannot authorize an action or override structured authority.

**Non-goals (v1):** autonomous planning/factory control; multi-agent swarm; model-generated official calculations; direct LLM access to operational DBs; silent writeback; cross-tenant memory; full-document RAG replacing canonical data; treating fluent prose as correctness.

---

## 1. Current state vs. target

### 1.1 What exists and is reusable

| Layer | Today | Reuse |
|---|---|---|
| Deterministic services | `model.ts` — assessments, allocations, runs, approvals, receipts, outcomes | **Keep as the source of truth.** Wrap as typed tools. |
| Evidence | `CommitEvidencePacket`, `SourceFact`, `DerivedFact`, `Conflict` | Packet is already the grounding substrate. |
| Runs | `DecisionRun`, `Alternative`, `canonicalResult`, `createScenarioRun` | Extend to durable runs + `SolverRunEvent`. |
| Governance | `createApproval`, `decideApproval`, `gatewayReceipt`, `observeReceipt` | Wrap as workflow tools; add idempotency/policy. |
| Conversation | `orchestrator.ts` `Thread/Turn/Block/Intent`, `reduce`, `interpret`, `actionAvailability` | Replace `interpret` with the router; keep block contract + UI. |
| UI | Right-pane chat, block shells, composer, evidence drawer | Add run dock, streaming, citation-jump, new states. |
| Personas | `Role`, `ROLE_POLICY`, `ContextEnvelope.lens/policy` | Drives router policy + disclosure. |

### 1.2 What is missing

- A **model call** (there is none; prose is authored).
- The **deterministic intent router** and a strict taxonomy (today: one regex switch).
- **Bounded sub-orchestrators** (Investigate / Scenario / Approval-Action) with per-phase tool subsets.
- An **authorized typed-tool gateway** with schemas, security, timeout, idempotency, audit.
- **Durable async `DecisionRun` queue** + `SolverRunEvent` stream + run card.
- A **causal-code translator** (versioned business-readable constraint codes).
- A **validator** (schema, grounding, provenance, policy, stale-state, allowed actions).
- A **server tier** (the model must not hold DB creds; policy is server-side).
- **Persistence** of turns, route decisions, tool calls, run events, and trace ids.

---

## 2. Target architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Browser (React, right pane)                                                    │
│  Chat UI · block timeline · run dock · composer (policy-gated) · citations     │
└───────────────▲───────────────────────────────┬──────────────────────────────┘
        SSE /api/chat/turn                      │ POST /api/chat/turn
        SSE /api/runs/{id}/events               │ GET  /api/runs/{id}
                │                               ▼
┌───────────────┴──────────────────────────────────────────────────────────────┐
│ Server tier (Node + TS; holds model key + policy; no client creds)            │
│                                                                                │
│  ContextEnvelope builder ── Policy & Authorization service                     │
│                                                                                │
│  Deterministic intent router  (taxonomy + schema checks; fail-closed)          │
│      │                                                                         │
│      ├── Investigate orchestrator   ──┐                                        │
│      ├── Scenario orchestrator      ──┤                                        │
│      └── Approval/Action orchestrator ─┴── Authorized typed-tool gateway       │
│                                              │                                 │
│                                              ├── Deterministic decision services│
│                                              │     (adapter over model.ts)     │
│                                              ├── Durable DecisionRun queue      │
│                                              │     └── worker → SolverRunEvent  │
│                                              └── Causal-code translator        │
│                                                                                │
│  CommitEvidencePacket assembler                                                │
│  Validator: schema · grounding · provenance · policy · stale · actions         │
│  Model client (OpenAI-compatible) with structured output                       │
│  Turn/route/tool/event log (append-only) + trace ids                           │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Hard boundary:** the model only ever sees the current sub-orchestrator's system prompt, tool schemas, the `CommitEvidencePacket`, and permitted unstructured text. It returns **structured blocks**, never free HTML, and can call only its authorized tool subset.

---

## 3. Shared contracts (build first)

Create `src/shared/contracts.ts` (imported by both server and client; the client stops importing `model.ts` directly for chat).

Extend/define:

- `ContextEnvelope` — add `requestId`, `allowedOperations: IntentClass[]`, `routingEligibility`, `tenantScope`, `disclosure` map, `turnId`.
- `IntentClass` — `lookup | investigation | trace | scenario | comparison | draft | approval | action | outcome | selection | unsupported`.
- `RouteDecision` — `{ requestId, intentClass, slots, subOrchestrator, toolSubset, policyResult, confidence, fallback }`.
- `ToolCall` — `{ id, name, version, args, policyResult, startedAt, endedAt, status, resultRef, auditId }`.
- `ToolResult<T>` — typed per tool; carries `provenance` (fact/calc ids), `freshness`, `conflicts`.
- `CommitEvidencePacket` — unchanged shape, now assembled server-side into the prompt.
- `DecisionRun`, `SolverRunEvent`, `ApprovalRequest`, `ActionReceipt`, `ObservedOutcome`, `HumanOverrideEvent`.
- `Block` (existing union) — **canonical chat output**; the model returns these, not prose-only.
- `Turn` — add `routeDecision`, `toolCalls`, `modelVersion`, `promptVersion`, `traceId`, `citations[]`.
- `CausalCode` — `{ code, constraintId, severity, statement, version }`.
- `ChatStreamEvent` — `progress | block | run | validation | error | done`.

Rule: **no number without provenance** — every numeric `Block` field must carry at least one `FactRef | CalcRef | RunRef`.

---

## 4. Build phases

Each phase is independently shippable and ends with acceptance tests. Effort: S ≈ 0.5 day, M ≈ 1 day, L ≈ 2 days.

### Phase 0 — Foundations (server tier, config, contracts) — **L**

**Tasks**
1. Add a server tier: `server/index.ts` (Node + TS). Prefer minimal deps (Hono/Express or `node:http`). Run with `tsx`.
   - `npm run dev` runs Vite **and** the server concurrently; Vite proxies `/api` → server.
   - `npm run start` serves built assets + API.
2. Config: `.env` → `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_MAX_TOKENS`, `FEATURE_AI_CHAT`. Fail closed if missing (fall back to scripted mode, clearly labelled).
3. `src/shared/contracts.ts` (see §3). Refactor client imports.
4. Append-only event log: `server/audit/log.ts` → JSONL at `var/audit/{date}.jsonl` (turn, route, tool, run, validation, policy).
5. Trace id per request (crypto uuid); thread through envelope → tools → model → blocks.

**Acceptance:** `POST /api/chat/turn` echoes a `ContextEnvelope` + `RouteDecision` + `traceId` for a no-op intent; audit line written; typecheck + build pass.

---

### Phase 1 — ContextEnvelope + Policy + Router (no model) — **L**

**Tasks**
1. `server/context/envelope.ts` — build the envelope from request + role + commitment + snapshot + run; server-created (client cannot expand scope).
2. `server/policy/authorize.ts` — role policy (reuse `ROLE_POLICY`), disclosure map, approver rules, allowed operations, tenant/site scope checks.
3. `server/router/taxonomy.ts` — intent classes with required slots + JSON schemas.
4. `server/router/router.ts` — deterministic classifier:
   - Rules/high-signal keywords + structured hint from the composer action id.
   - **Fail closed**: ambiguous → `clarify`; unsupported → `unsupported`.
   - Output `RouteDecision` with sub-orchestrator + tool subset.
   - No model call in the router.
5. Tests `server/router/router.test.ts`: distinguish investigation vs scenario vs approval/action; each intent gets only its authorized tool subset; ambiguous fails closed.

**Acceptance:** routing test suite green; `/api/chat/turn` returns a `RouteDecision` with no model invoked.

---

### Phase 2 — Typed-tool gateway + deterministic adapters — **L**

**Tasks**
1. `server/tools/registry.ts` — the 16 tools from the design, each with: versioned input/output schema (zod or hand-rolled), authorization policy, timeout, idempotency behaviour, audit emit.
2. `server/tools/adapters/*` — wrap `model.ts` deterministically:
   - `get_decision_context`, `get_commitment_snapshot`, `explain_risk_chain`, `trace_blast_radius`, `get_evidence_packet` (read).
   - `compare_alternatives`, `get_solver_run_status`, `get_action_receipt`, `get_observed_outcome` (read).
   - `run_recovery_scenario`, `cancel_solver_run`, `rebase_decision_run` (solver — async).
   - `draft_approval_brief` (draft), `request_named_approval`, `simulate_approved_action` (workflow/action), `record_human_override`.
3. `server/tools/gateway.ts` — single entry: authorize → validate args → execute → validate result → audit. Every call routed through it; the model never calls services directly.
4. Tool contract tests + deterministic fixtures per tool.

**Acceptance:** read tools return the same canonical values as `verify.ts`; unauthorized calls rejected with a typed `policyResult`; every call produces an audit record.

---

### Phase 3 — Investigate orchestrator + model + validator — **L**

**Tasks**
1. `server/model/client.ts` — OpenAI-compatible client; JSON/structured output; retries with jitter; timeout; token cap. Provider from env (works with the existing `sciforium` OpenAI-compatible endpoint).
2. `server/orchestrators/investigate.ts` — system prompt + tool subset (`get_commitment_snapshot`, `explain_risk_chain`, `trace_blast_radius`, `get_evidence_packet`, `get_decision_context`). Loop: model → tool calls (via gateway) → packet → final structured `Block[]`.
3. `server/prompts/*.ts` — versioned prompts. System rules: cite ids; no arithmetic; state insufficiency; never decide approval; schema-only output.
4. `server/validate/respond.ts` — validator:
   - schema conformance (blocks),
   - **grounding**: every number matches a `DerivedFact`/`SourceFact`/run field,
   - citations resolve to packet/run ids,
   - policy: no disabled action presented as available,
   - stale rules: stale fact ⇒ `∅ not established`, no "approved" over a conflict,
   - forbidden phrases: "infeasible" from a timeout, "eligible" for held supply.
   - On failure: repair prompt once, else return a safe deterministic "cannot be established" answer.
5. Wire `POST /api/chat/turn` to stream: progress → blocks → done; persist turn + tool calls.

**Acceptance:** "Why is COM-1042 at risk?" returns Answer/Why/Explanation/facts/calcs/gaps with resolvable citations; injecting a fabricated number is caught by the validator; no LLM arithmetic reaches the user.

---

### Phase 4 — Scenario orchestrator + durable runs + run card — **L**

**Tasks**
1. `server/runs/queue.ts` — in-process durable queue keyed by `DecisionRun.id`; jobs survive client disconnect; persists state.
2. `server/runs/worker.ts` — executes deterministic scenario computation (`createScenarioRun`) and emits `SolverRunEvent` phases: `Queued → Snapshot validation → Model build → Presolve → Search → Candidate validation → Causal translation → Evidence packaging → Complete`. (Deterministic result, simulated latency for realism.)
3. `GET /api/runs/{id}` + SSE `GET /api/runs/{id}/events` (phase, elapsed, incumbent, validated-alternative count, gap when meaningful, last improvement, freshness).
4. Terminal states: `OPTIMAL | FEASIBLE_WITHIN_POLICY_GAP | TIME_LIMIT_WITH_FEASIBLE_RESULT | TIME_LIMIT_NO_FEASIBLE_RESULT | PROVEN_INFEASIBLE | STALE | CANCELLED | FAILED`.
5. `server/orchestrators/scenario.ts` — `run_recovery_scenario`, `compare_alternatives`, `get_solver_run_status`, `cancel_solver_run`, `rebase_decision_run`.
6. Frontend **run dock** in the right pane: phase, elapsed, incumbent, validated count, gap, last improvement, status, cancel/rerun; progressive "Feasible — not yet proven best" with approval/execution disabled until validation completes.

**Acceptance:** starting a scenario returns a run id immediately; closing the browser and reopening resumes the run card by id; timeout-with-no-solution renders `TIME_LIMIT_NO_FEASIBLE_RESULT`, never "infeasible".

---

### Phase 5 — Approval/Action orchestrator + overrides — **M**

**Tasks**
1. `server/orchestrators/action.ts` — `draft_approval_brief`, `request_named_approval`, `simulate_approved_action`, `get_action_receipt`, `get_observed_outcome`, `record_human_override`.
2. Enforce: named approvers from option policy; requester ≠ approver; approval expires with snapshot; **dry-run before execute**; idempotency key; compare-and-swap against expected source versions immediately before writeback (reject stale).
3. `HumanOverrideEvent` with rejection codes: `LABOR_NOT_REALISTIC`, `SUPPLIER_EXPEDITE_NOT_CREDIBLE`, `CUSTOMER_PRIORITY_MISWEIGHTED`, `CHANGEOVER_COST_UNDERSTATED`, `POLICY_CONSTRAINT_MISSING`, `DATA_STALE`, `OPERATIONAL_RISK_TOO_HIGH`.
4. Persona gating server-side (demand planner cannot select; only plant approvers approve/execute).

**Acceptance:** approval alone cannot execute; execute without dry-run rejected; stale snapshot rejects writeback; every attempt yields a receipt or explicit failure; override persisted and queryable.

---

### Phase 6 — Frontend conversation wiring — **L**

**Tasks**
1. Replace `commit()`/`reduce()` client path with `POST /api/chat/turn` + SSE; keep `Block` rendering.
2. Streaming: progress steps → blocks → validation badge → done; `aria-live` announcements.
3. **Citations**: every fact/calc block deep-links to the centre cell / evidence surface (`focusTarget`); clicking scrolls and highlights.
4. New visible states: insufficient evidence, stale snapshot, conflict, unauthorized (distinct from absent), tool timeout/unavailable, no feasible alternative, recommendation expired, provisional/time-limited/executable distinction.
5. Selection bus (`activeContext`) so right-pane selection deterministically drives centre + left (replace ad-hoc `focusedRunId`/`focusFact`).
6. Composer actions generated from the server `RouteDecision`/policy (labels + enabled reasons), never inferred from tone.
7. Feature flag: scripted mode remains as fallback when `FEATURE_AI_CHAT` is off.

**Acceptance:** full Orient→Observe thread driven by the server; citations jump correctly; each state renders distinctly; persona switch re-scopes without changing centre values.

---

### Phase 7 — Hardening, security, observability, demo — **L**

**Tasks**
1. Security: server-side tenant/row/field/role/sensitivity filtering; redact before prompt + logs; validate all tool args and model output; prompt-injection screening of retrieved text; explicit confirmation for material actions.
2. Observability: log prompt version, model version, tools, args, results, evidence ids, snapshot, latency, policy decisions, trace id; latency metrics per intent class.
3. Tests:
   - routing/contract/grounding/policy/stale-state,
   - cross-tenant isolation (no data leak),
   - prompt-injection resistance (retrieved text cannot authorize),
   - replay: same `(snapshot, master_set, model)` reproduces same result,
   - e2e: risk → scenario → compare → approval → dry run → execute → reconcile → outcome.
4. Load/timeout behavior: tool timeout states; queue backpressure.
5. Demo script + seed fixture; fallback path if the model is unavailable.

**Acceptance:** all acceptance criteria in §0 pass in CI (`npm run verify` extended + `npm run test:e2e`).

---

## 5. Intent taxonomy & tool subsets (router contract)

| Intent class | Required slots | Sub-orchestrator | Authorized tools |
|---|---|---|---|
| `lookup` | commitmentId | Investigate | `get_decision_context`, `get_commitment_snapshot`, `get_evidence_packet` |
| `investigation` | commitmentId | Investigate | `explain_risk_chain`, `get_evidence_packet` |
| `trace` | commitmentId | Investigate | `trace_blast_radius` |
| `scenario` | commitmentId | Scenario | `run_recovery_scenario` |
| `comparison` | runId | Scenario | `compare_alternatives`, `get_solver_run_status` |
| `draft` | commitmentId | Approval/Action | `draft_approval_brief` |
| `approval` | approvalId \| optionId | Approval/Action | `request_named_approval`, `record_human_override` |
| `action` | approvalId | Approval/Action | `simulate_approved_action`, `get_action_receipt` |
| `outcome` | receiptId | Approval/Action | `get_observed_outcome` |
| `selection` | targetId | — (no model) | selection bus only |
| `unsupported` / ambiguous | — | — | fail closed / clarify |

---

## 6. Tool registry (schemas, auth, async)

| Tool | In → Out (sketch) | Auth | Async | Idempotency |
|---|---|---|---|---|
| `get_decision_context` | {} → `ContextEnvelope` | envelope | no | n/a |
| `get_commitment_snapshot` | `{commitmentId}` → `Commitment`+facts | site+role | no | n/a |
| `explain_risk_chain` | `{commitmentId}` → `CausalCode[]` | site+role | no | n/a |
| `trace_blast_radius` | `{resourceId?}` → `BlastRow[]` | site+role | no | n/a |
| `get_evidence_packet` | `{commitmentId}` → `CommitEvidencePacket` | row/field policy | no | n/a |
| `run_recovery_scenario` | `{commitmentId, objective?}` → `{runId}` | role+site | **yes** | run key |
| `compare_alternatives` | `{runId}` → `Alternative[]` | site+role | no | n/a |
| `draft_approval_brief` | `{runId, optionId}` → `{draft}` | role | no | n/a |
| `request_named_approval` | `{runId, optionId, rationale}` → `ApprovalRequest` | approver policy | no | approval key |
| `simulate_approved_action` | `{approvalId, mode}` → `ActionReceipt` | approval+gateway | no | idempotency key |
| `get_solver_run_status` | `{runId}` → `SolverRunEvent` | run scope | no | n/a |
| `cancel_solver_run` | `{runId}` → `SolverRunEvent` | run scope | no | n/a |
| `rebase_decision_run` | `{runId}` → `{newRunId}` | run scope | yes | run key |
| `get_action_receipt` | `{receiptId}` → `ActionReceipt` | scope | no | n/a |
| `get_observed_outcome` | `{receiptId}` → `ObservedOutcome` | scope | no | n/a |
| `record_human_override` | `{approvalId, code, rationale, ...}` → `HumanOverrideEvent` | approver role | no | override key |

---

## 7. Model & prompt design

- **Provider:** any OpenAI-compatible endpoint via env (the repo already uses a `sciforium` OpenAI-compatible provider). One client, provider-agnostic.
- **Per-sub-orchestrator system prompt** with: role scope, allowed tools, block schema, citation rule, forbidden behaviours, insufficiency rule, output format.
- **Structured output:** blocks as JSON; no free HTML; no arithmetic — the model may only quote service values.
- **Tool loop:** model → gateway (authorized) → packet → final blocks; bounded iterations + token budget.
- **Two model calls max per turn** (plan + explain), plus one repair on validation failure, then deterministic fallback.
- **Prompt versions** recorded on the turn; prompts live in `server/prompts/` and are code-reviewed like code.

---

## 8. Persistence & audit

- **Turn log (JSONL):** requestId, turnId, role, envelope hash, route decision, tool calls + args + result refs, prompt/model version, latency, validation result, policy decisions, trace id.
- **Run store:** `DecisionRun` + `SolverRunEvent` stream, immutable, replayable.
- **Governed records:** approvals, receipts, outcomes, overrides (already modelled) persisted append-only.
- Optional upgrade: SQLite for query/replay; keep JSONL as the audit source of truth initially.

---

## 9. Testing strategy

| Layer | Tests |
|---|---|
| Router | taxonomy classification, slot validation, authorized tool subset per intent, fail-closed/clarify |
| Tools | schema round-trip, authz rejection, timeout, idempotency, deterministic fixture equality |
| Grounding | every number maps to a fact/calc/run; fabricated number rejected; citation resolves |
| Policy | persona gating, no self-approval, no gate waiving, disclosure/redaction |
| Stale/conflict | stale ⇒ `∅ not established`; no "approved" over conflict; expiry on evidence change |
| Runs | async survival across disconnect, cancel/rerun, terminal states, timeout ≠ infeasible |
| Security | cross-tenant isolation, unauthorized-field returns nothing, injection cannot authorize, secret redaction |
| Replay | same `(snapshot, master_set, model)` ⇒ same result |
| E2E | full Orient→Observe demo thread |

Extend `verify.ts` (deterministic services) with a new `server/**/*.test.ts` suite; add `npm run test`.

---

## 10. Milestones & sequencing

| Milestone | Phases | Outcome |
|---|---|---|
| **M1 — Skeleton** | P0–P1 | Server, contracts, policy, router (no model). Fail-closed routing green. |
| **M2 — Grounded answers** | P2–P3 | Real model, read tools, validator; "Why is this at risk?" grounded end-to-end. |
| **M3 — Scenario** | P4 | Durable async runs + run card; compare alternatives. |
| **M4 — Governor** | P5 | Approval → dry run → execute → receipt → outcome; overrides. |
| **M5 — Product** | P6 | Streaming chat surfaces, citations, states, selection bus, persona composer. |
| **M6 — Hardened** | P7 | Security/observability/e2e; demo-ready. |

**Hackathon slice (minimum credible AI):** P0, P1, P2 (read tools only), P3, plus the run card from P4. That yields a real model answering grounded, cited, fail-closed questions with durable runs — the essence of the spec.

---

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Model hallucinates a number | Validator grounding check; repair-once then deterministic fallback |
| Model proposes a disabled/unauthorized action | Server generates the action set from policy; model cannot add actions |
| Prompt injection via retrieved docs | Treat as untrusted; screen; cannot authorize; structured output only |
| Async run lost on disconnect | Durable queue + run store keyed by run id; polling/SSE resume |
| Latency (solver) | Run id returned immediately; run card; latency classes |
| Complexity creep toward multi-agent | Hard scope to 3 sub-orchestrators; one router; one gateway |
| Cost/token blowup | Token cap, ≤2 model calls/turn, packet-size trimming |
| Secrets/model key leakage | Key server-side only; never in client; redact before logs |

---

## 12. Open decisions (need a call before P0)

1. **Backend allowed?** This plan adds a Node server tier. If the demo must stay static-only, we cannot hold a model key safely or run async runs — the alternative is a client-callable proxy with a short-lived token, which weakens the security story.
2. **Which model/provider + key?** (e.g., the existing sciforium OpenAI-compatible endpoint, or another.)
3. **Real solver or simulated latency?** Recommend: deterministic `model.ts` result with a simulated async `SolverRunEvent` stream for the demo.
4. **Persistence:** JSONL audit + in-memory run store (fast) vs SQLite (replayable). Recommend JSONL now.
5. **Unstructured retrieval in v1?** Recommend **no** (structured-only) to keep grounding airtight; add RAG in a later phase.
6. **Hackathon scope:** full P0–P7 or the M1–M3 slice first?

---

## 13. Demo script (acceptance)

1. Open as **Manufacturing Manager**; thread COM-1042 orients with risk + evidence health.
2. Ask **"Why is the 15 October promise at risk?"** → grounded Answer/Why/Explanation with cited facts + calcs; try to make it invent a number — it refuses.
3. **Run recovery scenario** → run card streams phases; incumbent appears as "Feasible — not yet proven best"; approval/execute disabled until validated.
4. **Compare alternatives** → feasible vs rejected with the violated hard gate; select the third shift.
5. Switch to **Shift Planner** → cannot approve; **Manufacturing Manager** approves; **dry run**; **execute** → receipt (baseline not mutated); **reconcile → outcome** shows not-yet-successful.
6. Change evidence (stale the waiver / drift the snapshot) → recommendation expires, run goes stale, stale writeback is rejected.
7. Switch to **Demand Planner** → cannot select operations; drafts a labelled customer note (send disabled while a gap is open).
8. Confirm audit log holds route, tools, prompts, run events, and trace ids for the whole thread.