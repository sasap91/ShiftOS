# FORGE Decision Room — Right-Pane Conversation (Copilot): Design Scope & Cross-Pane Linkage

Design scope for the **right-hand conversation pane** of FORGE, and the contract by which it binds to the **top** context bar, the **left** scope pane, and the **middle** centre pane (shop-floor zones + commitment ledger + decision card). It implements the conversational experience defined in *FORGE — AI Decision-Room Chatbot Specification* while obeying the ledger invariant from `forge-commitment-ledger-design.md`:

> **The centre pane is the record; every other pane is a view of a centre record.**

This document is authoritative for the right pane: its anatomy, its typed block timeline, its deterministic intent router, its tool boundary, its phase gating, its solver cards, its approval/action/receipt lifecycle, its cross-pane behaviour, its states, and its invariants.

---

## 0. Summary of the change

The current prototype renders the **conversation timeline in the centre column** and the **evidence drawer on the right**. The FORGE chatbot specification and the ledger design both call for the conversation to be the **right** region so the centre can be the record (ledger). This design:

1. Moves the conversation to the **right pane** and makes it the governed copilot surface.
2. Makes the **evidence drawer a sub-surface of the right pane** (progressive disclosure), not a sibling region — matching the chatbot spec's §3.4 evidence drawer nested under the chat workspace.
3. Replaces ad-hoc event wiring with a **selection bus** (`activeContext`) plus a **deep-link/id model**, so all four regions render deterministically from one serialisable state.
4. Formalises the free-text handler into a **deterministic intent router** that maps every request to an allowed intent class and a bounded sub-orchestrator *before any model sees tools*.
5. Specifies a **typed block response contract** so source fact, derived calculation, AI explanation, recommendation, approval, action, receipt, and outcome are visibly distinct — a hard acceptance criterion.

---

## 1. Where the chatbot lives, and why

> **Placement rule (non-negotiable).** In the UI/UX, the chatbot lives **only in the right-hand pane**. The conversation never occupies the centre or the left. The centre is the record (ledger/truth) and the left is scope; the right pane is the only conversational surface. The evidence drawer is a **sub-surface of the right pane**, not a separate region. This supersedes any reading of the standalone chatbot spec that places the conversation timeline in the centre.

The room has four regions, one active context.

| Region | Job | Owns | Never does |
|---|---|---|---|
| **Top — context bar** | Orientation + command | site · role · active commitment · snapshot + master-set version · as-of; global ask | hold data or approvals |
| **Left — scope** | Narrow to one decision | filters + ranked decision queue | metric walls, charts, chat |
| **Centre — truth** | The record | shop-floor zones · commitment ledger (CRM/ERP/MES) · decision card | AI prose, recommendations |
| **Right — conversation** | Investigate, compare, prepare action | copilot: evidence, causal chain, options, approval boundary, receipts | be source of truth for a fact or an approval |

### 1.1 Why the right pane, not the centre

- The centre's job is *cross-commitment comparison* on a shared column baseline. Prose in the centre would destroy that baseline.
- The chatbot's job is *investigation and preparation*, which is secondary and can be replaced without losing the record.
- **The record survives the conversation.** A reload, a cleared thread, or an expired session must leave every fact, run, approval, and receipt intact in the centre and run store.

### 1.2 The right pane is a view, not a store

The right pane holds **no canonical fact**. Its entire display derives from:

```
view = f(
  activeContext,            // selection bus
  CommitEvidencePacket,     // facts · calculations · lineage · freshness · conflicts
  DecisionRun[],            // immutable runs + alternatives + solver status
  ApprovalRequest[],        // named approval workflow
  ActionReceipt[],          // dry-run · execute · reconciliation
  ObservedOutcome[],        // expected vs realized
  Thread                    // turn history, phase, selection/focus
)
```

If a value is not in the centre or a governed record, the chatbot must say so — it may not extrapolate.

---

## 2. What the chatbot is and is not

### 2.1 AI may

- Interpret a role-scoped request and classify it deterministically.
- Select from allowed typed tools and explain their output.
- Summarise the evidence packet and the causal chain.
- Explain why a constraint binds, citing the versioned causal code.
- Compare deterministic alternatives (feasible vs rejected, with the violated hard gate).
- Draft an approval brief or customer communication, marked as a draft.
- Identify missing, stale, conflicting, or unmapped evidence.

### 2.2 AI must not

- Calculate official inventory, ATP/CTP, cost, capacity, or schedule feasibility.
- Resolve identity, source authority, or conflicts.
- Waive engineering, quality, qualification, or policy gates.
- Approve a decision, or represent a draft as an approved commitment.
- Write directly to operational systems.
- Present an accepted writeback as operational success.
- Infer access beyond the server-provided `ContextEnvelope`.

Every prohibition maps to a visible UI consequence (a disabled control, a labelled draft, a gate chip, a "cannot be established" answer).

---

## 3. One active context, one selection bus

All four regions read from and write to a single serialisable interaction state.

```
activeContext = {
  siteId, role,
  commitmentId,
  runId?,                       // focused DecisionRun (baseline or scenario)
  focusTarget?,                 // addressable cell/record id (deep-link)
  evidenceSurface?,             // which right-pane evidence sub-view is open
  filters: { state[], urgency[], constraintClass[], family[], customerOrProgram[], owner },
  tier?,                        // collapsed | expanded record tiers in the centre
  snapshotId, masterSetVersion, asOf
}
```

### 3.1 The selection bus

- No pane owns the selection. Any region may set `commitmentId` or `focusTarget`.
- Every region **derives** its display from `activeContext`. This is what makes linkage deterministic and refresh-safe.
- **One selection at a time.** Hover prevews; click commits.
- **Selection survives reload** via the deep-link id. A shared link opens the same context for a second person with the same role.

### 3.2 Deep-link model

Every addressable object has a stable id, so a cell, record, run, approval, or receipt is directly linkable:

```
#/site/YYC-01/commitment/COM-1042/run/DR-COM-1042-R1/record/INV-QD-220
#/site/YYC-01/commitment/COM-1042/run/DR-COM-1042-R1/option/OPT-THIRD-SHIFT
#/site/YYC-01/commitment/COM-1042/approval/APR-COM-1042-1
```

The whole screen must rebuild from the run store alone (event-sourced).

---

## 4. Right-pane anatomy

```
┌──────────────────────────────────────────────────────────────────────────┐
│ THREAD HEADER  COM-1042 · SNAP-20260926-0815 · DR-COM-1042-R1 · Planner   │  sticky
│                Baseline tag · freshness ●9 ◐1 · ⚠1 conflict · phase chip  │
├──────────────────────────────────────────────────────────────────────────┤
│ RUN DOCK       [ ▸ DR-COM-1042-R1  Feasible — not yet proven best ]        │  only when a run is live
│                Queued→Snapshot→Model→Presolve→Search→Validate→Causal→Wrap  │
│                elapsed · incumbent · validated alts · gap · [Cancel][Rerun]│
├──────────────────────────────────────────────────────────────────────────┤
│ BLOCK TIMELINE  (typed, ordered; scrolls)                                  │
│                                                                           │
│   Answer            the current conclusion, 1–2 sentences                  │
│   Why               the binding constraint / causal chain                  │
│   AI explanation    prose grounded only in the packet; labelled as such    │
│   Source facts      ●CRM COM-1042 … click → evidence surface + centre      │
│   Derived calcs     ∑ ALLOCATED 304−200−48=56 … trace id                   │
│   Evidence gaps     ∅ missing · ◐ stale · ⇄ conflict (verbatim disposition)│
│   Options           feasible + rejected (with violated hard gate)          │
│   Recommendation    named owner + approvers; never without both            │
│   Next governed     the one authorized next step, with owner + expiry      │
│   Approval card     policy result, required approvers, expiry, status       │
│   Receipt block     dry-run/execute, idempotency key, baseline not mutated  │
│   Outcome block     expected vs realized; success is not assumed            │
│   ─────────────────────────────────────────────────────────────────────  │
│ EVIDENCE SURFACE   (drawer within the right pane; progressive disclosure)  │
│   Source records · lineage · freshness · conflicts · prior/superseded       │
├──────────────────────────────────────────────────────────────────────────┤
│ COMPOSER                                                                  │
│   [ Explain risk ][ Show evidence ][ Blast radius ][ Run scenario ]        │  governed action strip
│   [ Compare ][ Draft approval brief ][ Request approval ][ Simulate ]      │  only contextually valid
│   Ask about this commitment…                                    [ Send ]   │  text
└──────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Persistent regions

| Region | Persistence | Contains |
|---|---|---|
| **Thread header** | Sticky top | commitment, snapshot, active run, role, freshness, conflict count, phase chip |
| **Run dock** | Sticky under header, only while a run is live or stale | solver card (see §11) |
| **Block timeline** | Scrolls | typed turns, oldest → newest; newest at the fold |
| **Evidence surface** | Collapsible drawer (overlay or below timeline) | source facts, calc traces, lineage, freshness, conflicts, prior/superseded |
| **Composer** | Sticky bottom | governed action strip + free-text input + send |

### 4.2 Thread header mirrors the top bar

The right pane's header is a **subset** of the top context bar, re-scoped to the active commitment. The copilot never answers out of context. Fields: `COM-1042 · SNAP-… · scenario DR-… · Supply planner`. If the top bar shows master-set drift amber, the thread header shows the same amber reason.

---

## 5. Block model — the response contract

Every substantive turn renders an ordered subset of these typed blocks. Order is fixed:

**Answer → Why → AI explanation → Evidence (facts / calculations / gaps / conflicts) → Options → Recommendation → Next governed action → Approval / Receipt / Outcome.**

| Block kind | Purpose | Source (read-only) | Interaction | Tone / glyph |
|---|---|---|---|---|
| `answer` | Current conclusion, 1–2 sentences | derived from run + packet | `aria-live` announce | verdict (serif) |
| `why` | Binding constraint + causal chain | `DecisionRun.bindingConstraint`, causal codes | none | plain ink |
| `explanation` | AI prose grounded in the packet | packet + run | labelled "not a source record" | calc/fact tone |
| `facts` | Source facts with source + timestamp | `SourceFact[]` | click → focus centre cell + open evidence | `●` transaction |
| `calculations` | Derived facts with formula + trace id | `DerivedFact[]` | click → trace popover | `∑` derived |
| `gaps` | missing / stale / conflict | `packet.missing`, `freshness.staleRecords`, `conflicts` | click → evidence surface | `∅` `◐` `⇄` |
| `blast` | Commitments touched by the binding resource | `blastRadius()` | click row → select that commitment | causal |
| `options` | Feasible + rejected alternatives | `DecisionRun.alternatives` | select feasible; reject opens gate reason | options |
| `recommendation` | Named-owner recommendation | run alternatives + approval policy | never rendered without owner + approvers | recommendation |
| `note` | System/context note (e.g. "no scenario on file") | orchestrator | none | meta |
| `approval-draft` | Capture requester rationale | `Alternative.approvers` | textarea → submit | approval |
| `approval` | Approval card / decisions | `ApprovalRequest` | approve/reject (role-gated) | approval |
| `receipt` | Writeback receipt | `ActionReceipt` | show idempotency + reconciliation | receipt |
| `outcome` | Observed vs expected | `ObservedOutcome` | none | outcome |
| `next` | The one authorized next step | `nextFor(thread)` | invokes a governed intent | next |
| `action` | Confirmation of a recorded action | `HumanOverrideEvent`/decisions | none | action |

### 5.1 Distinctness rules (acceptance)

- Source fact, calculation, explanation, recommendation, approval, action, receipt, and outcome are **visually and semantically distinct** — separate block shells, separate tones, separate glyphs.
- **Feedback loop discipline:** an `answer`/`explanation`/`approval`/`receipt`/`outcome` that has been superseded by a later turn is not re-rendered (latest-record wins). History is preserved in the run store and, on demand, in the evidence surface.
- **No orphan numbers.** Every numeral in a block resolves to a `SourceFact`, `DerivedFact`, or record id. If it cannot, the block degrades to a "cannot be established" answer.

---

## 6. Deterministic intent router

The router runs **before any model sees tools**, classifies each request into an allowed intent class, applies policy/authorization, and hands the request to exactly one bounded sub-orchestrator.

### 6.1 Intent taxonomy

| Intent class | Example request | Sub-orchestrator | Allowed tool subset |
|---|---|---|---|
| `lookup` | "status", "explain risk" | Investigate | `get_commitment_snapshot`, `get_evidence_packet`, `explain_risk_chain` |
| `investigation` | "why?" | Investigate | `explain_risk_chain`, `get_evidence_packet` |
| `trace` | "blast radius", "who else" | Investigate | `trace_blast_radius` |
| `scenario` | "run recovery" | Scenario | `run_recovery_scenario` |
| `comparison` | "compare alternatives" | Scenario | `compare_alternatives` |
| `draft` | "draft a note" | Approval & action | `draft_approval_brief` |
| `approval` | "request approval" / "record decision" | Approval & action | `request_named_approval` (+ override) |
| `action` | "dry run", "simulate action" | Approval & action | `simulate_approved_action` |
| `outcome` | "did it work?" | Approval & action | `get_action_receipt`, `get_observed_outcome` |
| `selection` | click option / queue row | (no model) | selection bus only |
| `unsupported` | anything else | — | fail closed → clarification |

### 6.2 Routing rules

- **Typed, not free-form.** The router matches on intent class + required slots (e.g. `comparison` needs a run; `approval` needs a selected feasible option).
- **Every tool call re-checks authorization and policy** before execution — not just at routing time.
- **Ambiguous or unsupported requests fail closed** or ask a clarifying question. They never fall through to a general assistant.
- The model receives only the prompt, schemas, and tool subset for its phase. It has no direct database credentials and no direct writeback access.

### 6.3 Progress utterances

During execution the pane shows concise operational progress ("Checking eligible inventory", "Comparing leak-test capacity"), never hidden model reasoning and never a fabricated percentage. Progress steps are deterministic strings attached to the intent class.

---

## 7. Typed tool registry (MVP)

Narrow, testable, versioned. Long-running solver tools return a durable run id rather than holding the request open.

| Tool | Class | Auth | Sync/async | Idempotency | Emits |
|---|---|---|---|---|---|
| `get_decision_context` | read | envelope scope | sync | n/a | context echo |
| `get_commitment_snapshot` | read | site + role | sync | n/a | facts |
| `explain_risk_chain` | read | site + role | sync | n/a | causal codes |
| `trace_blast_radius` | read | site + role | sync | n/a | affected pegs |
| `get_evidence_packet` | read | row/field policy | sync | n/a | packet |
| `run_recovery_scenario` | solver | role + site | **async** | run key | `DecisionRun` id |
| `compare_alternatives` | read | site + role | sync | n/a | alternatives |
| `draft_approval_brief` | draft | role | sync | n/a | draft block |
| `request_named_approval` | workflow | approver policy | sync | approval key | `ApprovalRequest` |
| `simulate_approved_action` | action | named approval + gateway | sync | idempotency key | `ActionReceipt` |
| `get_solver_run_status` | read | run owner scope | sync | n/a | `SolverRunEvent` |
| `cancel_solver_run` | control | run owner scope | sync | n/a | terminal event |
| `rebase_decision_run` | control | run owner scope | sync | run key | `DecisionRun v2` |
| `get_action_receipt` | read | scope | sync | n/a | `ActionReceipt` |
| `get_observed_outcome` | read | scope | sync | n/a | `ObservedOutcome` |
| `record_human_override` | governance | approver role | sync | override key | `HumanOverrideEvent` |

Every tool has a versioned input/output schema, an authorization policy, a timeout, deterministic test fixtures, and an audit event.

---

## 8. Conversation lifecycle & phase gating

A decision thread progresses through **Orient → Investigate → Compare → Approve → Act → Observe**. Users may navigate nonlinearly, but FORGE cannot skip required evidence, hard constraints, authorization, approval, or receipt.

| Phase | Entered when | Right-pane focus | Enabled governed actions | Exit gate |
|---|---|---|---|---|
| **Orient** | thread opened | risk summary + evidence health | Explain risk · Why · Blast radius | a request is routed |
| **Investigate** | explain/why/blast answered | causal chain + binding constraint | Run scenario | a scenario run exists |
| **Compare** | scenario run created | options (feasible + rejected) | Compare · select feasible option | a feasible option selected |
| **Approve** | option selected | approval brief + approvers + expiry | Request approval · record decisions | named approval complete |
| **Act** | approval complete | dry-run → execute receipt | Dry run · Simulate writeback | accepted execute receipt |
| **Observe** | execute receipt accepted | expected vs realized | Record outcome | outcome recorded |

Phase never moves backward via the normal flow. A backward-looking request (e.g. "Why?" in Approve) answers **without** creating a new run or regressing the phase; the phase chip stays.

### 8.1 Gating matrix (composer buttons)

| Action | Enabled when | Disabled reason shown |
|---|---|---|
| Explain risk | always | — |
| Show evidence | a packet exists | "No evidence packet on this thread." |
| Blast radius | always | — |
| Run scenario | always | — |
| Compare | a scenario run is on file | "No scenario run yet. Compare will say so." |
| Draft approval brief | always | — |
| Request approval | a **feasible** option is selected | "Select a feasible option first." |
| Simulate action | named approval is complete | "Named approval is still open." |
| Monitor outcome | an accepted execute receipt exists | "An outcome is recorded against an accepted writeback." |

High-impact actions are explicit buttons or confirmation cards, **never inferred from conversational tone**.

---

## 9. Response contract & insufficiency mode

### 9.1 Substantive answer

Answer → Why → Evidence → Options → Next governed action. The AI explanation is grounded **only** in the packet and permitted unstructured evidence; it is labelled.

### 9.2 Insufficient evidence

If the evidence does not support an answer, the pane states explicitly:

- what cannot be established;
- which evidence is **missing, stale, conflicting, quarantined, or unauthorized**;
- what safe next step can resolve the gap.

There is no "best guess" path. `askBlocks` in the current orchestrator already models this for waiver/split questions; the design generalises it to every intent class.

---

## 10. Cross-pane linkage (the core contract)

### 10.1 Right ↔ Top

- Thread header mirrors the top bar (commitment, snapshot, scenario, role, freshness, conflict count).
- The top bar's **global Ask** seeds this pane's composer with the active message and focuses it. Top → right is explicit.
- Snapshot / master-set drift turns **both** bars amber with the same reason; the right pane's run dock shows the run as stale.

### 10.2 Right ↔ Left (scope)

- Queue rows lead with exactly four tokens: `id · family/qty · time-to-impact · binding constraint`.
- Selecting a queue row sets `activeContext.commitmentId` → the ledger selects and expands that row, **and** the right pane rewrites its thread header and re-scopes the thread.
- When the right pane records approval / dry-run / execute / outcome, the **left queue re-derives** its group (at-risk → awaiting → approved → monitoring) from the run store. The right pane never edits the queue directly.
- Selecting a shop-floor zone filters both the queue and the ledger to decisions bound by that resource; the right pane's context header re-scopes to the resource.

### 10.3 Right ↔ Centre (the record)

This is the load-bearing link. The centre is the only source of truth.

| Right-pane block | Centre effect | Rule |
|---|---|---|
| `facts` "●CRM COM-1042" | select → expand the source record tier; highlight the lane | citation must resolve to a centre record id |
| `calculations` "∑ ALLOCATED 56" | focus the derived row; open trace popover | trace id must resolve |
| `options` row | no centre mutation; selection is right-pane state | selecting writes `selectedOptionId` on the thread |
| `blast` row | select that commitment in the ledger + queue | pegging must be in `blastRadius()` |
| `recommendation` | highlight the option card in the centre | owner + approvers required |
| `approval` | lifecycle chip on the centre ledger row updates | only the governed action mutates lifecycle |
| `receipt` | lifecycle → executing; capability cell re-resolves | receipt-backed |
| `outcome` | lifecycle → monitoring; outcome row appears | reconciliation-backed |

**Cell selection from the centre → right pane:**

- constraint chip → right pane opens **rule composition + pegging**.
- provenance lane / source record → right pane opens **fact, freshness, and lineage**.
- id / product / trace code → exposes a stable id for deep-linking.

### 10.4 Event → effect matrix

| User event | Source | TOP | LEFT | CENTRE | RIGHT |
|---|---|---|---|---|---|
| Click queue row | LEFT | commitmentId updates | row selected | ledger scrolls + selects + expands | header rewrites; thread scopes |
| Click ledger row | CENTRE | commitmentId updates | queue row selected + scrolled | row expands | header rewrites |
| Click constraint chip | CENTRE | — | pegs highlighted | chip focused | pegging + rule composition opened |
| Click provenance lane | CENTRE | — | — | record focused | evidence surface opens hot + trace popover |
| Ask about a cell | CENTRE | — | — | cell focused | composer seeded; answer cites the cell |
| Zone select | CENTRE floor | — | queue filtered to bound decisions | zone highlighted | scoped to resource |
| Change role | TOP | role + auth update | approval affordances change | lifecycle edit affordances change | approver rows enable/disable |
| Change snapshot | TOP | amber if hash drift | queue re-ranks | every cell re-resolves | run staleness banner |
| Run scenario | RIGHT | scenario token in bar | queue state recomputes | Capable + constraint update | durable run card |
| Record approval | RIGHT | — | queue state changes | lifecycle updates | approval card updates |
| Dry run / writeback | RIGHT | — | queue → approved | lifecycle → executing | receipt block |
| Record outcome | RIGHT | — | queue → monitoring | lifecycle → monitoring; outcome row | outcome block |
| Select alternative | RIGHT | — | — | option card focused | `selectedOptionId` set; approval enabled |

### 10.5 Interaction rules

- One selection at a time; hover previews, click commits.
- Keyboard: ↑/↓ rove rows, Enter expands, Esc collapses, `/` filters; a focused row scrolls every pane.
- Selection survives reload via the deep-link id.
- **No pane may mutate another pane's source data** — only the selection/focus, and only governed actions may mutate the run store.

---

## 11. Solver runs as durable cards

Optimization is a durable background workflow, never a blocking chat response.

When a scenario begins, FORGE must: freeze the authorized snapshot and hashes; create and return a durable `DecisionRun` id immediately; queue the job independently of the chat connection; stream or poll `SolverRunEvent`; allow the user to leave/reconnect/inspect evidence/continue unrelated conversation; preserve all intermediate and terminal states for audit and replay.

### 11.1 Run card

Always shows:

- current **phase**, never a fabricated percentage: `Queued → Snapshot validation → Model build → Presolve → Search → Candidate validation → Causal translation → Evidence packaging → Complete`;
- elapsed time;
- snapshot, model, and run version;
- whether a feasible incumbent exists;
- number of validated alternatives;
- optimality gap **only when meaningful**;
- last improvement time;
- freshness status: fresh · potentially stale · invalidated;
- cancel / rerun controls when policy permits.

### 11.2 Progressive results

A feasible incumbent may appear before search completes, shown as **"Feasible — not yet proven best."** The user may inspect it, but **approval and execution remain disabled** until hard constraints, business rules, causal attribution, policy, and snapshot validity are checked. Acceptance of a time-limited result is governed by explicit deterministic thresholds; the model cannot decide a provisional result is "good enough."

### 11.3 Terminal states

`OPTIMAL` · `FEASIBLE_WITHIN_POLICY_GAP` · `TIME_LIMIT_WITH_FEASIBLE_RESULT` · `TIME_LIMIT_NO_FEASIBLE_RESULT` · `PROVEN_INFEASIBLE` · `STALE` · `CANCELLED` · `FAILED`.

**A timed-out search that found no solution is never described as proven infeasible.** (Invariant 1.)

### 11.4 Latency classes

- **Explain current risk** — fast lookup over a validated snapshot/run.
- **Interactive recovery** — time-boxed optimization returning the best policy-acceptable feasible result.
- **Deep optimization** — background work that notifies the persistent thread on completion.

A "Why?" request reuses validated results and causal codes; it never launches a new optimization run.

---

## 12. Approval, action, receipt, outcome

The right pane ends at **prepare approval**. Execution is a separate receipt-backed step.

```
Select option → Request named approval → (named approvers decide)
   → Dry run → Simulate / execute writeback → Receipt → Reconcile → Observe
```

- **Approval alone never yields an executed state.** A receipt is required.
- **Dry run is required before execution.** The gateway rejects execute until a dry run is accepted.
- **Idempotency:** the same `(approvalId, optionId, mode)` returns the prior accepted receipt; it does not write twice.
- **Baseline is never mutated by a scenario or a writeback.** `baselineMutated: false` on every receipt.
- **Reconciliation:** an accepted execute receipt carries `reconciliation: pending`; it is **not** a successful outcome until observed.
- **Snapshot-validating writeback:** immediately before execution, the gateway performs an optimistic concurrency / compare-and-swap check against expected source versions. If the state changed, execution is rejected and the user must refresh or rebase. An approved recommendation is never silently rewritten against a newer baseline.
- **Approval expiry:** every `ApprovalRequest` carries an expiry. Changing evidence invalidates or expires affected recommendations; the timeline shows that invalidation rather than silently regenerating history.

---

## 13. Human override & rejection

Rejection is a governed outcome and an improvement signal. When an approver rejects a recommendation, the right pane records a `HumanOverrideEvent` with: recommended and selected alternatives; structured rejection code; free-text rationale; missing operational constraint; incorrect assumption/data issue; policy exception; approver, role, snapshot, and timestamp.

Initial rejection codes: `LABOR_NOT_REALISTIC` · `SUPPLIER_EXPEDITE_NOT_CREDIBLE` · `CUSTOMER_PRIORITY_MISWEIGHTED` · `CHANGEOVER_COST_UNDERSTATED` · `POLICY_CONSTRAINT_MISSING` · `DATA_STALE` · `OPERATIONAL_RISK_TOO_HIGH`.

Override events feed an **offline** governed review process. They do **not** auto-retrain a model or change production solver behaviour.

---

## 14. States: empty, stale, conflict, unauthorized, error

| State | Right-pane treatment |
|---|---|
| **Empty** | explicit text + clear-filters/next-action link; never a blank timeline or rail; no illustration |
| **Loading** | static skeleton lines at true row rhythm; optional 1.2s opacity pulse only under `prefers-reduced-motion: no-preference`; never a spinner presented as a decision |
| **Stale (transaction)** | per-fact `as of HH:MM` + hollow dot `◐`; stale/missing policy fact renders `∅ not established` (never `0`); no row reads "approved" over an unresolved conflict |
| **Superseded (master)** | annotated version state in the rules tier; a run whose master version is no longer effective goes amber and can be re-run as v2 with a diff |
| **Conflict** | dedicated block + conflict row beneath the commitment: both values, disposition verbatim (`quarantined`), never auto-resolved |
| **Unauthorized** | evidence is redacted before prompt construction; the pane says the evidence is not authorized, not that it is absent |
| **Tool timeout / unavailable** | inline explicit state (`ERP unreachable · last sync 12:40`); pane-level ruled banner when more than one source is down |
| **No feasible alternative** | a valid operating result, labelled as such — not a chatbot error |
| **Recommendation expired** | shown as expired after an evidence change; a refreshed result creates a new run version (e.g. `DecisionRun v2`) with a visible decision diff |
| **Insufficient evidence** | per §9.2 |
| **Provisional / time-limited / stale / executable** | visibly distinct at all times |

---

## 15. Accessibility & keyboard

- **Focus management:** after a governed action, focus moves to the new answer block's `aria-live` region; the composer retains focus otherwise.
- **Keyboard:** ↑/↓ rove rows, Enter expands, Esc collapses, `/` filters; a focused row scrolls every pane; the deep-link id restores focus on reload.
- **`aria-live="polite"`** on progress lists and the latest answer; announcements are concise.
- **Colour is never the only channel:** every state also carries a glyph, a word, and a weight so it survives greyscale, colour-blindness, and forced-colors.
- **`prefers-reduced-motion`** disables all but essential transitions; progress steps appear without delay under reduced motion.
- Semantic landmarks: `aside` for the pane, `role="log"`/appropriate list semantics for the timeline, labelled form controls for composer and rationale inputs.

---

## 16. Visual system (right pane specifics)

- **Type:** serif (`Source Serif 4`) for the verdict `answer` and pane title only; sans (`Source Sans 3`) for body, labels, lifecycle words; mono (`IBM Plex Mono`) for ids, resource codes, record ids, dates, quantities, deltas.
- **Numerals:** all figures `font-variant-numeric: tabular-nums`; numbers and dates right-aligned; text left-aligned; never centre numeric content.
- **Glyph vocabulary:** `§` master · `●` transaction · `∑` derived · `⇄` conflict · `∅` missing · `◐` stale · `⚑` policy gate · `⟳` capacity · `▤` material.
- **Colour:** semantic — risk red · awaiting amber · ok green · watch blue · calc/fact tones; never the only channel.
- **Density:** body 13px, meta 11–12px; hairline block separators; no zebra; sticky thread header; sticky composer.
- **Motion:** only progress steps and pane transitions; respect reduced motion.
- **Tones** (from the existing `styles.css` block shells): answer · why · explanation · recommendation · action · fact · calc · gap · options · receipt · outcome · next · approval — each visually distinct.

---

## 17. Component inventory & file/state map

### 17.1 Right-pane components

`ThreadHeader` · `RunDock` · `RunCard` · `PhaseChip` · `FreshnessChip` · `ConflictChip` · `BlockShell` · `AnswerBlock` · `WhyBlock` · `ExplanationBlock` · `FactBlock` · `FactLine` · `CalcBlock` · `GapBlock` · `BlastBlock` · `Options` · `OptionRow` · `RecommendationBlock` · `NextActions` · `EvidenceSurface` · `SourceRecord` · `TracePopover` · `ApprovalDraft` · `ApprovalCard` · `ApproverRow` · `ReceiptBlock` · `OutcomeBlock` · `OverrideForm` · `Composer` · `GovernedActionStrip` · `GlobalAskTarget`.

### 17.2 File / state map

| Concern | Lives in | Change |
|---|---|---|
| Reference (master) data | `master.ts` (new) | versioned, effective-dated sets |
| Truth (inventory, capacity, dates, feasibility, runs, approvals, receipts, outcomes, overrides, causal codes, solver events) | `model.ts` | add `HumanOverrideEvent`, `SolverRunEvent`, causal-code map; keep run lifecycle fields |
| Deterministic intent router + sub-orchestrators + selection bus intents + block contract | `orchestrator.ts` | replace regex `interpret` with router; add intent classes; deepen citations; add insufficient-evidence path |
| Layout / linkage (top bar + left scope + centre ledger + **right conversation**) | `App.tsx` | move conversation timeline to the right pane; move evidence to a right-pane sub-surface |
| Look | `styles.css` | ledger, glyphs, master/transaction tones, right-pane block tones, a11y |
| Invariants | `verify.ts` | assertions in §18 |

---

## 18. Invariants & acceptance criteria

1. A `TIME_LIMIT_*` state never renders the word "infeasible."
2. A `STALE` / hard-invalid run can never have an approved, executable option.
3. Held / expired / unqualified lots contribute zero eligible supply in every block and option.
4. Every fact, calculation, and receipt carries source + timestamp (+ unit / trace id).
5. Approval alone never yields an executed state; a receipt is required.
6. The same `(snapshot_hash, master_set_version, model_version)` reproduces the same run output.
7. No recommendation without a named owner and approver list.
8. A master reference may be cited only if its effectivity window covers the snapshot's as-of.
9. Conflicts are shown with both records and a disposition; never auto-resolved.
10. Every right-pane cell resolves to a record id or a master version; there are no orphan numbers.
11. Cross-pane selection is deterministic: the same `activeContext` renders the same four panes.
12. **Deterministic routing tests** distinguish investigation, scenario, and approval/action intents; each sub-orchestrator receives only its authorized tool subset.
13. **Ambiguous or unsupported requests fail closed** or request clarification.
14. Every solver constraint used in an explanation maps to a **versioned business-readable causal code**; raw logs / duals / matrix failures are never the sole basis for user-facing causality.
15. Long-running jobs survive browser disconnection and can be resumed by run id.
16. The UI never displays a fabricated completion percentage.
17. Provisional, time-limited, stale, and executable results are visibly distinct.
18. Execution rejects stale expected versions (compare-and-swap).
19. Rejection reasons are persisted and available for offline improvement analysis.
20. Cross-tenant and unauthorized-field tests return no data; the pane distinguishes "not authorized" from "absent."
21. Every turn is bound to an authorized `ContextEnvelope`.

---

## 19. Open questions

1. **Evidence surface placement:** drawer overlaying the timeline vs a dedicated bottom half of the right pane. Recommend drawer (progressive disclosure) so the timeline keeps the fold.
2. **Run dock placement:** pinned at top of the right pane plus a compact inline reference (recommended) vs inline-only.
3. **Thread switching:** does the right pane keep one thread per commitment (current model) or a multi-thread inbox per commitment? Recommend one thread per `commitmentId`, re-scoped by `activeContext`.
4. **"Awaiting me" filter:** a left-pane filter, not a right-pane decoration — it is a decision, not a message.
5. **Persisted turn history:** how much of a thread survives reload vs rebuilds from the run store. Recommend: governed records are canonical; turns are a view that rebuilds deterministically from run store + selection.
6. **Global Ask seeding:** whether top-bar Ask opens a new thread or seeds the current composer (recommend: seed + focus, never forks the decision record).
7. **Master set store:** separate versioned store with effectivity windows (recommended for the engineering-change flow) vs inline reference table.