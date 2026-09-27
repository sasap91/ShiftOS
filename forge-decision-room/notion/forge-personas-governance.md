# FORGE Decision Room — Personas & Governance

> Skeleton with placeholders. Defines the four selectable personas, their lenses and decision rights, the authority model (persona approvers vs policy authorities), disclosure/redaction, the approval lifecycle, and human-override capture.

| Field | Value |
|---|---|
| Document | FORGE Decision Room — Personas & Governance |
| Version | v0.4 (disclosure + authority implemented) |
| Status | 🟡 Active — approval lifecycle, disclosure matrix and authority separation implemented and tested |
| Owner | Product Management + Backend / API |
| Parent doc | FORGE Decision Room — Product Management |
| Last updated | 2026-09-26 |

---

## 0. Purpose & scope

- Purpose: one place for who may see, decide and approve what.
- In scope: personas, lens, authority, approval lifecycle, disclosure, overrides, handoffs.
- Out of scope: solver math, UI rendering.
- Placeholder — any additional scope.

---

## 1. Personas

| Role (id) | Label | Owns | Lead question | Can approve |
|---|---|---|---|---|
| `manufacturing-manager` | Manufacturing Manager | Plant throughput & promise attainment | "What slips, what does it cost, who decides?" | Yes — schedule/capacity within policy |
| `shift-planner` | Shift Executive / Shift Planner | Shift coverage, rota, certified crew | "Can we cover it, and with whom?" | No — proposes only |
| `maintenance-manager` | Maintenance Manager | Asset availability & restoration | "Why is the asset down, when is it back?" | Yes — maintenance windows |
| `demand-planner` | Demand Planner | Demand signal, requested vs promised gap | "Which requests are at risk, how bad?" | No — requests only |

- Default demo view: Manufacturing Manager.
- Placeholder — confirm the canonical shift-role label (Q-02).

---

## 2. Role lens & policy

- Lens: throughput · coverage · availability · demand.
- Policy carries: lens, lead question, canSelectOptions, canPropose, canApprove, canExecute.
- Placeholder — how the server resolves the envelope and prevents self-expansion of authorization.

---

## 3. Authority matrix

Capability × persona. Placeholder — fill every cell; seed:

| Capability | Shift | Mfg | Maint | Demand |
|---|---|---|---|---|
| Explain risk / causal chain | yes | yes | yes | yes |
| Blast radius | yes | yes | yes | yes |
| Run recovery scenario | yes | yes | yes | read-only |
| Select feasible alternative | yes | yes | yes | no |
| Request named approval | yes | yes | yes | yes |
| Approve schedule / overtime | propose | approve | no | no |
| Approve customer date change | no | request | no | request |
| Approve maintenance window | request | coordinate | approve | no |
| Waive hard gates | never | never | never | never |
| Write to source systems | never | never | never | never |

**Two authority kinds (must stay distinguishable):**
1. Persona approvers — one of the four interactive roles.
2. Policy authorities — Finance · Quality · Program/Customer · Procurement (non-interactive; named requirement + owner + expiry).

- Placeholder — confirm the authority model (Q-05): resolve on policy vs non-persona actor.
- Invariant: an operational role's approval never satisfies a Finance/Quality/Program authority.
- **Implemented (2026-09-27):** `src/disclosure.ts` — `canPersonaSatisfyAuthority()` (always false for personas), `authorityResolutions()` (authorities resolve on policy, `satisfiedByPersona: null`), `authoritySeparationHolds()`. Asserted by T-07.

---

## 4. Approval lifecycle

```
Select option → Request named approval → (approvers decide) → Dry run → Simulate/execute writeback → Receipt → Reconcile → Observe
```

- Approval alone never executes; a receipt is required.
- Dry run is required before execution; the gateway rejects execute until a dry run is accepted.
- Idempotency: same (approvalId, optionId, mode) returns the prior receipt.
- Baseline is never mutated; reconciliation is pending until observed.
- Placeholder — expiry, self-approval refusal, compare-and-swap rules. **Resolved:** approvals carry owner + expiry; requester ≠ approver is enforced; execute is a compare-and-swap on `{snapshot_hash, master_set_version, seed}` — a mismatch throws `StaleError` and the run must be re-based (v2 with a visible diff), never force-executed. A cross-authority requirement (Finance/Quality/Program/Procurement) can never be satisfied by the requesting operational role.

---

## 5. Disclosure & redaction

- Redacted fields render "not authorized", never "absent", and are stripped before prompt construction.
- **Memory visibility matrix (M0 slice).** Every governed input is a `MemoryVersion` (`src/memory.ts`) with an `ownerRole` and a `sensitivity`; visibility is attribute-based on `role × memory domain × sensitivity`:

| Memory domain | Steward (ownerRole) | Mfg | Shift | Maint | Demand |
|---|---|---|---|---|---|
| `item` · `bom` · `sourcing` | demand-planner | summary | summary | summary | full |
| `party` (customer/supplier) | demand-planner | approved summary | hidden | hidden | full |
| `commercial` (rate cards) | demand-planner | banded | hidden | hidden | full |
| `routing` · `calendar` · `policy` | manufacturing-manager | full | operational | operational | summary |
| `resource` (rate, calibration) | maintenance-manager | full | operational | full | summary |
| transaction facts (`CRM·ERP·WMS·MES·EAM`) | by source system | operational | shift-level | resource-level | demand-level |

- Only the steward (`ownerRole`) may supersede a memory; a restricted memory renders a **reason code**, never blank. Margin/finance and competing-customer fields are `restricted_finance` / `confidential_customer`.
- `reapprovalRequired()` returns true when a consumed hard-gate memory falls below `REAPPROVAL_THRESHOLD = 0.75`.
- **Implemented (2026-09-27):** `src/disclosure.ts` computes this matrix — `domainOf`, `levelFor(role, domain)`, `viewMemory` (hidden → reason code `NOT_AUTHORIZED`), `redactForRole` (strips hidden before prompt construction), `canSupersede`. The persona-acceptance harness asserts the redaction criterion for all four roles (T-12 C8).

---

## 6. Human override & rejection

- Rejection is a governed outcome: recommended vs selected, structured code, rationale, actor, snapshot, timestamp, `explanationHash`.
- Initial codes: LABOR_NOT_REALISTIC · SUPPLIER_EXPEDITE_NOT_CREDIBLE · CUSTOMER_PRIORITY_MISWEIGHTED · CHANGEOVER_COST_UNDERSTATED · POLICY_CONSTRAINT_MISSING · DATA_STALE · OPERATIONAL_RISK_TOO_HIGH. These are first-class entries in the versioned causal-code map, shared with solver-derived codes so human disputes and computed causes use one namespace.
- **Explanation contract:** every run/option exposes an `Explanation` — binding constraint (with source record + master version), a 2–4-step causal chain ending in a business effect, counterfactual(s) with clause (`feasible-if` / `cheaper-if` / `on-time-if`) and delta, alternatives with deltas, confidence, provenance inputs, and `redactionApplied`. Raw solver logs/duals are never the sole basis for user-facing causality.
- **Honest infeasibility:** four distinct states — `proven_infeasible` (certificate), `timed_out` (incumbent + bound, "not proven best"), `hard_gated`, `dominated`. "Optimal" is never claimed unless `status = OPTIMAL`.
- **Capture flow:** override → structured rejection code → rationale → snapshot → offline review queue. Overrides feed **read-only** review (detect-and-coach); they never auto-retrain or mutate master data.
- **Automation-bias guard:** show counterfactuals and "what would change my answer" by default; present information vs recommendation framing; vary confidence honestly; periodically measure per-persona override accuracy against `ObservedOutcome`.

---

## 7. Cross-persona handoffs

- **Memory-rooted handoff chain (M0 slice).** A memory change invalidates only its descendants; the reverse `EvidenceUseEdge` index (`invalidatedDecisions`) names the affected decisions, and the change routes in this order:

| Step | Role | Gate |
|---|---|---|
| 1. Availability memory changes | **Maintenance Manager** (steward) | may supersede `resource`/downtime memory; prior version retained |
| 2. Selective invalidation | *system* | only decisions with an edge to the old version go stale; unaffected stay valid |
| 3. Throughput re-approval | **Manufacturing Manager** | `hardGateConfidence < 0.75` → `reapproval_required`; human-only approval |
| 4. Coverage consequence | **Shift Executive / Planner** | "memory changed since handover" chip; escalate |
| 5. Promise re-communication | **Demand Planner** | sees a redacted "restricted evidence changed" view; no raw cause or supplier id |
| 6. Assurance | *Governance* | access log + memory lineage + sanitized packet |

- Invariant: an operational role's approval never satisfies a Finance/Quality/Program authority; the requester never approves their own request; a replayed decision needs a new approval.

---

## 8. Acceptance criteria

- Placeholder — the persona criteria (items 1–10) and the ledger acceptance (A1–A12), with pass/fail recording.

---

## 9. Open questions

1. Authority model (Q-05). [TBC]
2. One shared thread per commitment vs per-role thread. [TBC]
3. Does the maintenance manager originate maintenance scenarios only? [TBC]

---

## 10. Change log

| Version | Date | Change |
|---|---|---|
| v0.1 | 2026-09-26 | Created personas & governance skeleton with placeholders |
| v0.2 | 2026-09-26 | Filled approval expiry/self-approval/CAS rules and the human-override section: explanation contract, honest-infeasibility states, causal-code map, read-only offline review, automation-bias guard |
| v0.3 | 2026-09-26 | Filled the §5 visibility matrix (role × memory domain × sensitivity, with stewards) and the §7 cross-persona handoff chain (memory-rooted invalidation routing) from the M0 decision-memory slice (`src/memory.ts`) |
| v0.4 | 2026-09-27 | **Implemented** the §3 authority separation and the §5 disclosure matrix in `src/disclosure.ts`; asserted by T-07 and the persona-acceptance harness (T-12 C8, 48/48) |