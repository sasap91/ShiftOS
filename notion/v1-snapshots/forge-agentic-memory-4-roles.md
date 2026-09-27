# FORGE Decision Room — Embedding Agentic Memory in the Four Roles

> Synthesis of every "agentic memory" artefact found on the laptop and in Notion, and a concrete design for
> embedding a versioned decision-memory layer into FORGE's four selectable roles
> (**Demand Planner · Manufacturing Manager · Shift Executive/Planner · Maintenance Manager**).
>
> Parent docs: Personas & Governance · Commitment Ledger Design · Algorithms/Allocation & Replay ·
> Context & Region Projections Execution Plan · AI Chat Build Plan.

| Field | Value |
|---|---|
| Document | FORGE Decision Room — Agentic Memory Embedding (4 Roles) |
| Version | v1.0 |
| Status | 🟡 Proposal — for review |
| Owner | AI/Reasoning + Backend/API + Product Management |
| Ground truth | `src/model.ts` · `src/master.ts` · `src/orchestrator.ts` · `src/verify.ts` · `server/*` |
| Last updated | 2026-09-26 |

---

## 0. What I reviewed

### 0.1 Notion

| Object | Relevance |
|---|---|
| **UNIFIDE PromiseGraph — AMD-Inspired Agent Memory Hack Blueprint** (`3e107d7f-61be-81d6-a9be-ff34c0fa9bce`) | The canonical agentic-memory design. Memory object, governance rules, selective invalidation, confidence gate, persona visibility, human-only approval. |
| PromiseGraph — Personas & Governance | Role RACI, attribute-based access, field-level redaction, approval state machine. |
| PromiseGraph — Algorithms, Invalidation & Replay | Supersession trigger, 12-step invalidation algorithm, confidence rule, deterministic replay + attribution. |
| PromiseGraph — Data Model & Synthetic Fixtures | `MemoryVersion`, `EvidenceUseEdge`, `DecisionRationale`, `CommitEvidencePacket`, graph edges. |
| PromiseGraph — Data & Information Model Improvement Plan | Lifecycle states, gates, projection DTOs, access log, data ownership. |
| PromiseGraph — Comprehensive Persona & Data Improvement Plan | "AI prepares; humans remain accountable"; role-specific workspaces on one governed record. |
| PromiseGraph — UI/UX Execution Specification · Demo/Testing & Validation · GPU Demand Implementation Plan · One-Day Build Plan | Four load-bearing screens (Memory Ledger, Impact & Replay, Option Comparison & Approval, Assurance & Customer Response); test matrix. |
| **Role-Based LangGraph Agent Orchestration** (`38807d7f-61be-80d0-9b1a-e799e6fcde3b`) | Governed LangGraph; role-bounded evidence workers; "memory/session primitives"; **memory disabled by default** in diagnostic/shadow modes. |

### 0.2 Laptop

| File | Relevance |
|---|---|
| `Desktop/Startup/Content/Whitepapers/WP3/UNIFIDE_AI_WP3_Agentic_Architecture_{Draft,R1,R2_Final}.md` | Positioning: agents are bounded evidence workers inside a deterministic, role-aware graph, not the product. Memory is infrastructure, not the moat. |
| `.../WP3_Round*` review/red-team docs | Security posture: no shared source extracts, memory, vector stores, traces, or evidence graph across customers; memory disabled by default. |
| `MIT Dropbox/.../Agentic Architecture Framework/UNIFIDE_AI_Agentic_Framework_Expert_Deep_Dive.pptx` | Agentic-framework framing (runtime vs. domain assets). |
| `Desktop/Startup/Product-Research/Product-Build/UNIFIDE_AI_Expert_Review_Gaps_v4_Plan.md`, `UNIFIDE_AI_Document_Build_Plan.narrative_format_source.md` | Gap reviews that motivated the memory blueprint. |
| *(excluded)* `Documents/ChatGPT/**/AI_Memory_*`, HBM articles | Semiconductor **hardware** memory (HBM), not agentic memory. |

**Conclusion of the review:** the laptop + Notion corpus defines agentic memory as **decision memory** — "why a promise was made, when that reasoning stopped being valid, which commitments are affected, and who must approve next" — **not** chat history or a vector store. The four load-bearing primitives are:
**versioned memory object → reverse dependency edge → selective invalidation → deterministic replay → human-only approval**, wrapped in attribute-based field redaction.

---

## 1. What "agentic memory" is in this corpus

| Primitive | Meaning | Source |
|---|---|---|
| **MemoryVersion** | An immutable, addressed fact with `source`, `ownerRole`, `validFrom/expiresAt`, `confidence`, `criticality` (hard_gate/material/context), `sensitivity`, `status`, `supersedesVersionId`. | PromiseGraph Data Model |
| **EvidenceUseEdge** | `memoryVersionId → decisionVersionId` with `useType`, `fieldPath`, `weight`, `threshold`, `transformationId`. Its **reverse index** answers "which live decisions consumed this exact memory?" | PromiseGraph Data Model |
| **Selective invalidation** | Superseding a memory marks **only** downstream rationale `stale` and commitments `reapproval_required`; everything else stays valid. | PromiseGraph Algorithms §3 |
| **Confidence gate** | `effectiveConfidence = confidence × freshness`; `hardGateConfidence = min(...)`; a threshold (e.g. 0.75) decides whether re-approval is required. | PromiseGraph Algorithms §3.3 |
| **Deterministic replay + attribution** | Re-run with the same policy/solver version; every changed field cites the changed memory + transformation. | PromiseGraph Algorithms §4 |
| **Persona projection (ABAC)** | Visibility = actor.role × memory.sensitivity × owner × purpose. Restricted renders a **reason code**, never blank. | PromiseGraph Personas §Visibility |
| **Human-only approval** | API-enforced: AI/service actors get `HUMAN_APPROVAL_REQUIRED`; replayed decisions need a new approval. | PromiseGraph Data Model §6 |
| **Governance rules** | Invalidation ≠ deletion; derived memories inherit restrictions; conflicting evidence stays visible (never averaged); overrides need named human + scope + expiry; task-scoped memory; no training on restricted memory. | PromiseGraph Blueprint §Memory Governance |
| **Task-scoped, isolated memory** | Memory is scoped to the task/role; no cross-tenant shared memory/vector store; disabled by default. | WP3 + LangGraph Orchestration |

---

## 2. Fit: what FORGE already has (and the gap)

FORGE is unusually well-positioned — it already holds most of the *substrate*. The embedding is mostly **new addressing, edges, and projections**, not a rewrite.

| Agentic-memory primitive | FORGE today | Gap to close |
|---|---|---|
| Memory object | `SourceFact`, `DerivedFact`, `Conflict` in `model.ts`; master sets in `master.ts` | No single `MemoryVersion` envelope (confidence, expiry, criticality, sensitivity, status, supersedes). |
| Versioning | `master_set_version`; effective-dated masters | Memory versions not unified across master + transaction facts. |
| Reverse dependency ("what consumed this?") | **Peg graph** (`Peg { qty, demandRef, supplyRef, masterRefIds }`); `NumberRef.derivedFrom[]` | No `EvidenceUseEdge` from memory → decision/option. |
| Selective invalidation | `StaleError` + rebase **v2** with `changedInputs/changedOutputs`; run `parentRunId` | Invalidation is per-run, not **memory-rooted** ("supersede MEM-X → these decisions stale, those untouched"). |
| Replay + attribution | `canonicalResult` fingerprint; causal-code map; `Explanation` | Attribution is constraint-based, not **memory-change-based**. |
| Persona scoping / redaction | `ROLE_POLICY`, `ContextEnvelope.lens/policy`, projections plan (CP-15) | No field-level memory visibility matrix; redaction is role-level today. |
| Human-only approval | `createApproval` / `decideApproval`; requester ≠ approver; policy authorities | Already strong — just bind approvals to memory versions consumed. |
| Confidence gate | Feasibility + hard gates | No numerical confidence/freshness gate. |
| Assurance / access log | `server/audit/log.ts`; governed records | No memory-ledger / assurance-packet view. |

**One-line thesis:** FORGE already has a deterministic *truth engine*; agentic memory turns it into a **decision-memory system** by (a) giving every input a versioned, addressable identity, (b) recording which decision consumed it, and (c) letting the four roles supersede, project, and re-approve from their own standpoint.

---

## 3. The embedding model — one memory layer, four projections

Keep the ledger invariant: **the centre pane is the record; every other pane is a projection of a record.** The memory layer sits *under* the record.

```
MemoryVersion ──(USED_BY / EvidenceUseEdge)──▶ DecisionRationale ──▶ Option ──▶ Commitment
      │ supersedes                    │ stale
      ▼                               ▼
MemoryVersion(v2)                reapproval_required ──▶ routed to named approver
```

### 3.1 Map FORGE's four data classes to memory classes

| FORGE class | Memory class | Versioned by | Staleness axis |
|---|---|---|---|
| Master `§` | **Rule memory** | change control / effectivity | current · effective-from · superseded |
| Transaction `●` | **Fact memory** | observed/ingested timestamp | fresh · stale |
| Derived `∑` | **Derived memory** (never a source of truth; recomputable) | snapshot + formula + trace id | validity = inputs valid |
| Conflict `⇄ ∅` | **Contested / absent memory** | both versions retained | disposition (never auto-averaged) |

### 3.2 Minimal new contracts

```ts
type MemStatus = "active" | "superseded" | "expired" | "quarantined";
type MemCrit   = "hard_gate" | "material" | "context";
type Sensitivity = "public" | "internal" | "restricted_supplier" | "restricted_finance" | "restricted_people";

interface MemoryVersion {
  memoryId: string;           // stable identity across versions, e.g. MEM-RES-LT-01
  versionId: string;
  factType: "resource_rate" | "downtime_window" | "lead_time" | "demand_signal" |
            "coverage_cert" | "policy_gate" | "capacity_segment" | "bom_ratio";
  subjectRef: string;         // RES-LT-01 · COM-1042 · CPL-480 · POL-ELIG
  value: unknown; unit?: string;
  sourceId: string;           // EVT-LT-041 · CAL-26W39 · AVL-3
  ownerRole: Role;            // steward — the ONE role allowed to supersede
  validFrom: string; expiresAt: string;
  confidence: number;         // 0..1
  criticality: MemCrit;
  sensitivity: Sensitivity;
  status: MemStatus;
  supersedesVersionId?: string;
  synthetic: boolean;
}

interface EvidenceUseEdge {   // reverse index is load-bearing
  edgeId: string;
  memoryVersionId: string;
  decisionVersionId: string;  // DecisionRun
  useType: "constraint" | "policy" | "objective" | "context";
  fieldPath: string;          // e.g. "capacity.LT.dailyRate"
  criticality: MemCrit;
  threshold?: number;
  transformationId?: string;
}
```

### 3.3 Deterministic invalidation (adopted from PromiseGraph §3.2)

1. Validate the actor may supersede this memory (**steward role only**).
2. Persist the new immutable `MemoryVersion`; mark old `superseded` (**never delete**).
3. Query reverse `EvidenceUseEdge` for the old version → affected `DecisionRun`s only.
4. Mark affected rationale `stale`, commitments `reapproval_required`; **preserve unaffected nodes** and prior approvals.
5. Rebuild the snapshot with the new memory; re-run the **same** policy/solver/model version.
6. Write `run v2` with `parentRunId` + **per-field cause attribution** (`changed field ← changed memory ← transformation`).
7. Route to the named human approver for the affected commitment.

This is exactly FORGE's existing rebase-v2 + `StaleError` loop, just **rooted at a memory id** instead of a whole snapshot.

---

## 4. Per-role embedding — the answer

Each role gets: **memory it stewards (can supersede), memory it consumes, the projection it sees, the invalidation it receives, and the approval it holds.** Stewardship aligns with the master stewards already defined in the ledger design.

### 4.0 Summary matrix

| Role | Lens | Stewards (owns/supersedes) | Consumes | Approval | Invalidation routed to it when… |
|---|---|---|---|---|---|
| **Demand Planner** | demand | Demand signals · customer/party · item/BOM · sourcing/AVL · commercial rate | Capacity outlook, eligibility, capable dates | Propose only (cannot approve own) | A demand/sourcing memory it stewards changes, **or** a promise it owns is affected by someone else's memory |
| **Manufacturing Manager** | throughput | Routing · policy/hard-gate · allocation priority | Resource availability, calendar, material | **Approve** schedule/overtime; can execute | Capacity/constraint memory changes → its approved run goes `reapproval_required` |
| **Shift Executive/Planner** | coverage | Coverage/certification memory · handover delta | Live MES execution, resource state, calendar | Propose only | Any memory change during/before its shift that alters today's coverage |
| **Maintenance Manager** | availability | Resource master (rate, calibration) · downtime windows | Production load, frozen horizon | **Approve** maintenance windows; can execute | Its resource/downtime memory is superseded, or a scenario needs a new availability window |

### 4.1 Demand Planner — *"Which promises are at risk, and is my demand memory still true?"*

- **Memory owned:** `DemandSignalVersion` (requested vs committed, firmness, requested date), party masters (customer/supplier), item/BOM ratio, sourcing eligibility (AVL), commercial rate card.
- **Memory consumed:** capacity outlook, eligibility outcome, derived capable date — **read-only**; supplier-identity/finance fields redacted.
- **Memory actions:** create/supersede a **demand memory** (customer request, substitution/AVL choice); **cannot** supersede a resource/policy memory.
- **Projection:** `DemandPlanningProjection` — promised vs capable delta; cost banded; restricted supplier/finance **absent** (not blank).
- **Invalidation route:** when the Maintenance or Manufacturing memory behind a promise changes, the Demand Planner sees *"Restricted evidence changed — promise under re-evaluation"* plus the new capable date, **never** the raw cause. Designer of the promise; not of the capacity.
- **New right-pane surface:** **Demand Memory** tab — active vs superseded signal versions, effectivity, dependent commitments, "request re-promise".
- **Lead question, memory-framed:** *"Is the demand memory I'm standing on current, and which promises consume it?"*

### 4.2 Manufacturing Manager — *"What is binding, and which memory change flips my approved run?"*

- **Memory owned:** routing master, **policy/hard-gate memory** (`POL-ELIG`, frozen horizon), allocation priority. This role owns the *rules*, so it is the natural **approver of replayed decisions**.
- **Memory consumed:** resource availability segments, calendar, material pegs.
- **Memory actions:** confirm/supersede a capacity-assumption memory; **approve** or **reject** a replayed run; **execute** (dry-run → receipt) once approved.
- **Projection:** full decision packet + impact graph + option comparison + redacted customer response preview; **margin banded**, supplier full.
- **Invalidation route:** the *owner of the memory-rooted replay*. When a hard-gate memory changes and `hardGateConfidence < threshold`, its approved run moves to `reapproval_required` and the room re-opens with a v2 diff.
- **New surface:** **Memory Ledger (Impact & Replay)** in the centre — reverse-dependency trace from a memory to commitments, unchanged-node proof, threshold crossing, per-field attribution.
- **Lead question, memory-framed:** *"Which memories bind this promise, and what changes if one is superseded?"*

### 4.3 Shift Executive / Shift Planner — *"What changed since handover, and which memories moved?"*

- **Memory owned:** **coverage/certification memory** (who is certified for which resource/line) and the **handover delta** (derived memory = event-log fold since `HH:MM`).
- **Memory consumed:** live MES work-order state, current resource state (running/degraded/down), calendar.
- **Memory actions:** propose sequencing/coverage; **no** memory supersession of master or policy; flags a memory as *suspect* for the steward.
- **Projection:** `ShiftProjection` — today/my-line only, time-to-impact token, zone state; people-sensitivity redaction on certification detail.
- **Invalidation route:** receives the **fastest, narrowest** notification — "a memory affecting your shift changed at HH:MM"; sees the *near* consequence, not the full causal chain.
- **New surface:** **Changed-since memory chip** on the left rail — every queue row flags whether a memory it consumed moved since handover.
- **Lead question, memory-framed:** *"Which memories changed since handover, and can we still cover it?"*

### 4.4 Maintenance Manager — *"What is down, and when is the memory of its restoration superseded?"*

- **Memory owned:** **resource-rate memory** (`RES-LT-01 = 32 tests/day`), **downtime/derate memory** (`EVT-LT-041`, half-rate 6–14 Oct), calibration master, restoration outlook. This is FORGE's natural **supply-side memory steward** and the analogue of PromiseGraph's Supply persona.
- **Memory consumed:** production load / frozen horizon (read-only), policy gates.
- **Memory actions:** **supersede a resource/downtime memory** (the hero trigger) → invalidates dependent capacity reasoning; **approve** maintenance windows; can execute.
- **Projection:** `AvailabilityProjection` — full resource lineage + raw confidence; sees the underlying downtime evidence that other roles see only as "restricted evidence changed".
- **Invalidation route:** **originates** the invalidation. After superseding `MEM-RES-LT-01`, it sees the reverse-dependency trace and the effect on `COM-1042`, then hands the replay to the Manufacturing Manager for approval.
- **New surface:** **Memory Ledger** — inspect provenance, submit a superseding version, watch the affected-commitment set populate.
- **Lead question, memory-framed:** *"Are my availability memories current, and what do they bind?"*

---

## 5. Cross-role memory lifecycle — worked on `COM-1042`

Giants-lap of the four roles over one memory change (the leak-test fixture already in `model.ts`):

| # | Role | Action | Memory / edge | Result |
|---|---|---|---|---|
| 1 | **Demand Planner** | promise at risk | reads `MEM-CAL-26W39` + capacity outlook via `DemandPlanningProjection` | promised 15 Oct, capable 19 Oct (+4d) |
| 2 | **Manufacturing Manager** | approves baseline | run consumes `MEM-RES-LT-01 = 32/day`, `MEM-CAL-26W39`, `POL-ELIG`, frozen peg | `DecisionRun DR-COM-1042-R1` approved; edges written |
| 3 | **Maintenance Manager** | **supersedes** `MEM-RES-LT-01` (derate widens) | new `MemoryVersion` v2; old → `superseded` (never deleted) | reverse edges return exactly `DR-COM-1042-R1` |
| 4 | — (system) | selective invalidation | only downstream rationale `stale`; `COM-1104` (unaffected) stays `approved` | commitment → `reapproval_required` |
| 5 | — (system) | replay v2, same policy/model | attribute each changed field to `MEM-RES-LT-01` v2 + transformation | `run v2` with `parentRunId` + diff |
| 6 | **Manufacturing Manager** | **re-approves** | `hardGateConfidence` ((capacity) < 0.75) forces human re-approval | immutable approval bound to the new memory version |
| 7 | **Shift Executive** | coverage check | handover chip: memory changed since `HH:MM` | escalation / re-sequence |
| 8 | **Demand Planner** | customer view | `DemandPlanningProjection`: "restricted evidence changed; new capable date" | draft re-promise (no raw cause, no supplier id) |
| 9 | *(Governance)* | assurance | access log + memory lineage + redacted packet | sanitized audit export |

This is the whole product in one loop: **a stale memory cannot silently continue supporting a live promise**, and every role sees exactly the slice it is responsible for.

---

## 6. Concrete changes to FORGE

**Data (`src/master.ts`, `src/model.ts`)**
1. Wrap every master and fact as `MemoryVersion`; add `memoryId`, `versionId`, `ownerRole`, `validFrom/expiresAt`, `confidence`, `criticality`, `sensitivity`, `status`, `supersedesVersionId`.
2. Add `EvidenceUseEdge[]`; populate it wherever a run/option reads a fact or master (reuse `NumberRef.derivedFrom` + the peg graph).
3. Add `MemorySuperseded` to the event set; add `reapproval_required` alongside existing lifecycle states.

**Server (`server/`)**
4. `POST /api/commands/supersede-memory` — steward-only, idempotent; emits `MemorySuperseded`.
5. Extend the replay endpoint to root at a memory id; return per-field attribution.
6. Extend the run store (JSONL) to persist `MemoryVersion` + edges + supersession events.
7. Enforce the confidence gate server-side; return `HUMAN_APPROVAL_REQUIRED` / `ROLE_NOT_AUTHORIZED` exactly as today's approval guard does.

**UI (`src/`)**
8. Add a **Memory Ledger** region/tab (provenance, confidence, expiry, dependent commitments, supersede action gated by `ROLE_POLICY`).
9. Add an **Impact & Replay** view (reverse trace + unchanged-node proof + threshold crossing + field attribution).
10. Add a **changed-since memory chip** to the left rail for the Shift lens.
11. Redaction: render restricted memory as a **reason code**, never blank; strip before prompt construction (right pane).

**Verify (`src/verify.ts`)** — new assertions
12. Superseding a memory never deletes/mutates its prior version.
13. Only decisions with edges to the superseded version become stale; unaffected commitments stay `approved`.
14. Only the steward role can supersede; others throw `ROLE_NOT_AUTHORIZED`.
15. Replay is deterministic and every changed field cites the changed memory + transformation.
16. A role cannot retrieve a field above its sensitivity clearance; redacted ≠ absent.
17. A replayed decision cannot inherit the old approval.

---

## 7. Governance rules to adopt (from PromiseGraph + WP3)

1. Sources are versioned and **never silently overwritten**.
2. **Invalidation ≠ deletion** — obsolete facts stay auditable but cannot support a new decision.
3. Every memory carries source · owner · effective/expiry · confidence · sensitivity · dependent decisions.
4. **Derived memories inherit the restrictions** of their sensitive inputs.
5. Replay reconstructs the original point-in-time evidence and policy state.
6. **Conflicting evidence stays visible** — never averaged into false certainty.
7. Overrides require a **named human, reason, scope, expiry**, and affected commitments.
8. External outputs are sanitized; never reveal other customers, margins, or restricted supplier evidence.
9. Agents get **task-scoped** memory, not unrestricted enterprise history.
10. Restricted memories are **not used for training** without separate authorization; no cross-tenant shared memory/vector store; memory **disabled by default** in diagnostic/shadow mode.

---

## 8. Phased plan

| Phase | Scope | Exit |
|---|---|---|
| **M0 — Identity** | Add `MemoryVersion` envelope + `ownerRole`; no behaviour change | Every master/fact has a stable `memoryId` + version |
| **M1 — Edges** | Write `EvidenceUseEdge` from the peg graph + `derivedFrom` | "Which decisions consumed `MEM-RES-LT-01`?" returns exactly the expected set |
| **M2 — Memory Ledger** | Centre memory region + provenance/confidence/expiry; steward-gated supersede | Hero trigger (supersede a resource memory) works with no manual edits |
| **M3 — Impact & Replay** | Memory-rooted invalidation + attribution + `reapproval_required` | Superseding one memory stales only its descendants; v2 diff attributed |
| **M4 — Projections & Redaction** | `DemandPlanning` / `Availability` / `Shift` / `Throughput` projections; server-side redaction | Two roles see materially different, correctly redacted views of one decision |
| **M5 — Confidence gate & assurance** | `effectiveConfidence` gate; memory audit/assurance packet | Re-approval forced at threshold; sanitized assurance export |

---

## 9. Risks & invariants

- **Risk — role/persona name collision.** PromiseGraph's personas (Supply, Commitment Ops, Governance…) are **not** FORGE's four roles. Adopt the **primitives**, not the org chart; keep FORGE's `ROLE_POLICY` as the authority source.
- **Risk — memory layer duplicates the snapshot.** The memory layer must be the *identity + edges*; the snapshot stays the reproducible projection. Never a second source of truth.
- **Risk — redaction done in CSS.** Enforce before serialization (existing CP-15); restricted renders a reason code, never blank.
- **Risk — "AI remembers" overclaim.** Memory is deterministic and human-governed; the copilot retrieves and explains only. UNIFIDE/FORGE is never Accountable in the RACI.
- **Invariant** — a memory change invalidates only dependent reasoning; unaffected promises remain valid.
- **Invariant** — approval alone never executes; a receipt is required; a replayed decision needs a new approval.

---

## 10. Change log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-09-26 | Created: corpus review, memory primitive model, per-role embedding for Demand Planner / Manufacturing Manager / Shift Executive / Maintenance Manager, worked `COM-1042` lifecycle, concrete data/server/UI/verify changes, governance rules, phased plan |