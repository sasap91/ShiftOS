# FORGE Decision Room — Right-Pane Copilot: Persona Views

**Focus:** Shift Planning · Manufacturing Manager · Maintenance Manager · Demand Planner

Companion to `forge-chatbot-right-pane-design.md` and `forge-commitment-ledger-design.md`. This document does **not** change the record. It defines how the **right-pane conversation** adapts to four operating roles: their default lens, question playbook, governed actions, evidence disclosure, approval authority, and cross-persona handoffs.

The governing principle is unchanged: **the centre pane is the record; the right pane is a role-scoped view of it.** A persona changes *what the copilot leads with and is allowed to do*, never *what is true*.

> **Placement rule:** the chatbot is **only ever the right-hand pane**. The centre is the ledger/record and the left is scope. No persona ever moves the conversation out of the right pane.

### Decisions locked

- **The four personas replace the current six roles.** The interactive role set becomes exactly: `shift-planner`, `manufacturing-manager`, `maintenance-manager`, `demand-planner`. The previous `supply-planner`, `operations-leader`, `quality-manager`, `program-manager`, `finance-controller`, `procurement-manager` are retired as *selectable* roles.
- **Default demo view: Manufacturing manager** (plant-wide lens, full Orient→Observe arc).
- Approval authorities previously held by retired roles are **remapped onto the four personas and policy** — see §10.1.

---

## 0. Why persona changes the right pane (and only the right pane)

All four roles read the same `CommitEvidencePacket`, the same immutable `DecisionRun[]`, and the same governed records. What differs is:

1. **Lens** — the default sort/filter of the left queue and the first commit the right pane opens.
2. **Lead question** — the orient block is phrased for the role's job (coverage vs throughput vs availability vs demand risk).
3. **Action set** — which governed actions are enabled, and which are greyed with a reason.
4. **Disclosure** — which evidence is visible, redacted, or summarized.
5. **Approval authority** — what this role may approve, request, or must escalate.
6. **Vocabulary and causal emphasis** — "half-rate window and crew coverage" vs "throughput loss" vs "asset availability" vs "commit-vs-request gap."

The centre's column baseline, the ledger, and the solver output never re-scope by persona. Persona re-scopes the **view**, the **actions**, and the **prose**, not the numbers.

### 0.1 Role is part of the ContextEnvelope

```
ContextEnvelope.role → {
  lens,              // default queue filter/sort
  orientSpec,        // which lead question + which blocks
  actionPolicy,      // enabled/disabled governed actions + reasons
  disclosurePolicy,  // field/row visibility by role
  approvalPolicy     // approvable / requestable / escalatory
}
```

The policy service resolves this server-side. The model cannot expand its own authorization, lens, or disclosure.

---

## 1. Authority matrix

| Capability | Shift planner | Manufacturing manager | Maintenance manager | Demand planner |
|---|---|---|---|---|
| View plant ledger + evidence packet | yes (schedule-relevant fields) | yes (all site fields) | yes (asset/downtime fields) | yes (demand/commit fields) |
| Explain risk / causal chain | yes | yes | yes | yes |
| Blast radius | yes | yes | yes | yes |
| Run recovery scenario | yes | yes | yes (alternatives may include maintenance windows) | yes (read-only comparison) |
| Select feasible alternative | yes | yes | yes | no (demand side requests, does not select ops options) |
| Request named approval | yes | yes | yes | yes (for priority/date change requests) |
| **Approve** shift/overtime within threshold | propose only | **approve** | no | no |
| **Approve** customer date change | no | request; needs Program | no | **request only** (Program approves) |
| **Approve** maintenance window / defer | request | coordinate | **approve** | no |
| **Approve** capacity reallocation | no | **approve** | no | no |
| Authorize overtime above finance threshold | no | request → Finance | no | no |
| Waive quality/eligibility/frozen gate | never | never | never | never |
| Write to operational systems | never (gateway only) | never | never | never |

Rules that hold for every persona: approval ≠ execution (a receipt is required); held/expired/failed-test/obsolete supply is never described as eligible; "no feasible alternative" is a valid result; high-impact actions are explicit buttons, never inferred from chat tone.

---

## 2. Role lenses at a glance

| | Shift planner | Manufacturing manager | Maintenance manager | Demand planner |
|---|---|---|---|---|
| **Owns** | shift-level coverage & rota | plant throughput & promise attainment | asset availability & restoration | demand signal & commit-vs-request gap |
| **Binding-constraint lens** | crew certification, shift capacity, changeover | cross-resource throughput & bottleneck | downtime window, PM/CM, calibration | requested vs promised date, priority |
| **Queue default** | my shifts / resources today | all at-risk commitments, by impact | resources with open downtime | commitments whose demand ≠ promise |
| **Lead question** | "Can we cover it, and with whom?" | "What slips, what does it cost, who decides?" | "Why is the asset down and when is it back?" | "Which requests are at risk, and how bad is the gap?" |
| **Primary action** | Run shift scenario | Compare + request approval | Run maintenance scenario | Draft customer/priority request |
| **Approves** | — | schedule + capacity (within policy) | maintenance windows | — (requests Program) |
| **Redacted / limited** | finance detail, other customers' commercial terms | some cross-customer commercial detail | commercial fields | shop-floor labour detail |

---

## 3. Shift planner

**Span of control:** builds and covers the shift-level plan — rota, certified crew per resource, shift capacity, changeover sequencing, overtime *requests*.

### 3.1 Jobs to be done

- Can the six healthy days before the downtime be covered at three shifts?
- Who is certified on `RES-LT-01`, and is the certificate (`LAB-LT-CERT`) valid for every day?
- What is the overtime exposure, and does it need Finance?
- If I add a shift, what does it displace for other commitments?
- What changed on the rota since yesterday's handover?
- Which resource is the coverage risk tonight?

### 3.2 Centre (middle) — what the shift planner leans on

- Shop-floor zones keyed by resource → shift coverage overlay.
- Ledger **Capable** and **Binding constraint** columns (capacity/shortfall), not commercial columns.
- Resource master effectivity for crew certification.

### 3.3 Left queue — lens

Default filter `constraintClass = capacity OR crew`, sorted by **time-to-impact**, grouped by resource. Rows emphasize `id · family/qty · time-to-impact · binding constraint` — never customer commercial terms.

### 3.4 Right pane — orient and playbook

Lead answer: *"The 15 October commitment is short 64 leak tests; the gap is crew-covered on the six healthy days only if the third shift is approved."*

| Ask | Intent class | Blocks returned |
|---|---|---|
| "Can we cover it?" | investigation | Answer → Why (capacity chain) → coverage gap → Options |
| "Who is certified?" | lookup | Source facts (`LAB-LT-CERT`) + resource master version |
| "What does the extra shift cost?" | investigation | Derived calc + versioned rate card `FIN-RATE-OT-LT` |
| "What slips if I add it?" | comparison | Options with displacement trade-offs |
| "Run the shift plan" | scenario | Durable run card + options |

Composer: `Explain coverage gap` · `Show roster evidence` · `Run shift scenario` · `Compare shift options` · `Draft shift-change brief` · `Request overtime approval`.

### 3.5 Governed actions & limits

- Can **propose** overtime and roster changes; cannot approve (Manufacturing manager approves; Finance if over threshold).
- Cannot introduce uncertified labour (`LAB-LT-CERT` is a hard gate).
- Selecting an option is allowed; approval request is allowed; approval decision is not.

### 3.6 Example turn

> **Q: "Can we cover the leak-test gap without moving frozen work?"**
> **Answer:** "Yes, on the six healthy days, by adding a certified third shift." **Why:** "Leak-test capacity is the binding constraint (304 total − 200 frozen − 48 COM-1104 = 56)." **Evidence:** `CALC-COM-1042-ALLOCATED`, `CALC-COM-1042-SHORTFALL`, `SRC-1042-CAL`, `SRC-1042-DOWNTIME`. **Options:** third shift (feasible, `$6,624` estimate, displaces no frozen work) vs Saturday-only (infeasible, residual 48). **Next governed action:** "Request overtime approval · Operations Leader · expires with snapshot."

---

## 4. Manufacturing manager

**Span of control:** plant throughput and promise attainment; approves schedule changes and capacity reallocation within policy; escalates beyond threshold.

### 4.1 Jobs to be done

- What are the top risks across the plant this week, ranked by promise impact?
- For each at-risk commitment: why, what recovery, what cost, who decides?
- Where is the bottleneck that hurts the most commitments?
- What is the cheapest recovery that holds the most promises?
- What is waiting on me for approval, and what expires first?
- If `RES-LT-01` slips further, what breaks?

### 4.2 Centre (middle) — leans on

- The full ledger, all columns, all commitments.
- Shop-floor zones for bottleneck attribution.
- Decision card (the selected option in detail).

### 4.3 Left queue — lens

All commitments, sorted by **promise impact** (qty × customer/priority × time-to-impact). Group headers show counts ("Awaiting me: 2"). This is the plant owner's view.

### 4.4 Right pane — orient and playbook

Lead answer: *"Two commitments miss promise on this snapshot; both are attributable to named constraints with named owners."*

| Ask | Intent class | Blocks returned |
|---|---|---|
| "What are the top risks?" | investigation | Ranked risk summary → causal chain per commitment |
| "What's the cheapest recovery?" | scenario + comparison | Options ordered by promise held, then cost |
| "What's waiting on me?" | approval | Approval cards with expiry + policy result |
| "Blast radius of RES-LT-01?" | trace | Affected pegs + downstream commitments |
| "Who owns this?" | lookup | Owner + required approvers from policy |

Composer: `Explain risk` · `Blast radius` · `Run recovery scenario` · `Compare alternatives` · `Request approval` · `Simulate writeback` · `Monitor outcome`.

### 4.5 Governed actions & limits

- **Approves** schedule/capacity actions within policy (e.g. overtime, resource reallocation).
- Requests Finance approval above the cost threshold; requests Program for customer date changes.
- May enable/disable lifecycle transitions in the centre via governed actions only.
- Cannot waive hard gates (eligibility, frozen horizon, approved-source).

### 4.6 Example turn

> **Q: "Recommend the cheapest way to hold both promises."**
> **Answer:** "No single option holds both; the third shift holds COM-1042, MV-14B holds COM-1018 — different constraints." **Why:** "COM-1042 is leak-test capacity; COM-1018 is MV-14 supplier commit — separate events." **Evidence:** `CALC-COM-1042-*`, `CALC-COM-1018-*`, `SRC-1018-SUP`. **Options:** third shift (`$6,624`, Operations+Finance) and MV-14B (Quality+Procurement). **Next governed action:** "Assign owners and request both approvals."

---

## 5. Maintenance manager

**Span of control:** asset availability and restoration — preventive/corrective windows, calibration, restoration confirmation, impact on shared resources.

### 5.1 Jobs to be done

- Why is `RES-LT-01` at half rate, and exactly when does it clear?
- Which commitments are exposed to `EVT-LT-041`, and by how much?
- Can I move or shorten the maintenance window to reduce impact?
- Is deferring the PM a violation, and who must approve it?
- What is the restoration state — is the asset back to full rate?
- What else depends on this resource?

### 5.2 Centre (middle) — leans on

- Shop-floor zone for the resource (`RES-LT-01`) with downtime overlay.
- Ledger rows pegged to that resource (via `blastRadius()` pegging).
- Resource master + calendar master effectivity (`CAL-26W39`).

### 5.3 Left queue — lens

Filtered to resources with an open downtime/PM event; sorted by **restoration time**. Each row links to the exposed commitments.

### 5.4 Right pane — orient and playbook

Lead answer: *"RES-LT-01 runs at half rate through 14 October 22:00, shorting COM-1042 by 64 tests; the asset is not binding on COM-1018 (different resource)."*

| Ask | Intent class | Blocks returned |
|---|---|---|
| "Downtime impact?" | investigation | Downtime source fact → capacity chain → exposed commitments |
| "When is it back?" | lookup | Restoration fact + calendar master version |
| "What if we move the window?" | scenario | Maintenance-window alternatives with impact delta |
| "Who else depends on it?" | trace | Blast radius |
| "Confirm restoration" | outcome | Observed-outcome / restoration block |

Composer: `Explain downtime chain` · `Show affected commitments` · `Compare maintenance windows` · `Run maintenance scenario` · `Request maintenance approval` · `Record restoration`.

### 5.5 Governed actions & limits

- **Approves** maintenance window changes and defers *within policy*.
- Cannot change a customer promise; cannot authorize production overtime.
- Restoration is an **observed outcome** (evidence-backed), not a chat confirmation.

### 5.6 Example turn

> **Q: "If the fixture stays half-rate through the 15th, what happens?"**
> **Answer:** "COM-1042 slips further; the shortfall grows and no option except a capacity change recovers it." **Why:** "Downtime `EVT-LT-041` reduces daily rate 32 → 16 across the degraded window." **Evidence:** `SRC-1042-DOWNTIME`, `CALC-COM-1042-DEGRADED`, `CALC-COM-1042-CAPACITY`. **Options:** move window (impact delta) vs add third shift on healthy days. **Next governed action:** "Coordinate the window with Operations before requesting approval."

---

## 6. Demand planner

**Span of control:** demand signal, requested vs promised dates, customer/program priority, commit-vs-request gap, customer-facing communication drafts.

### 6.1 Jobs to be done

- Which customer requests are at risk on this snapshot?
- What is the requested ↔ promised ↔ capable delta per commitment?
- If a promise slips, what is the demand/customer impact and priority?
- Which customer is worst affected, and what should we tell them?
- Should I request a priority change, and who decides?
- What is committed vs what is merely requested?

### 6.2 Centre (middle) — leans on

- Ledger columns **Promised**, **Capable (+Δ)**, **Qty (on-time/total)** — the delta that *is* the decision.
- Provenance ribbon to see CRM (request) vs ERP (promise).
- Customer/program grouping.

### 6.3 Left queue — lens

Grouped by **customer/program**, sorted by priority and promise delta. Flags commitments where `requested ≠ promised ≠ capable`.

### 6.4 Right pane — orient and playbook

Lead answer: *"COM-1042 is promised 15 October but capable 19 October — a 4-day, 64-unit gap to Northline; COM-1018 is a 6-day gap to BrightGrid."*

| Ask | Intent class | Blocks returned |
|---|---|---|
| "Which requests are at risk?" | investigation | Risk summary with date deltas |
| "Requested vs promised?" | lookup | CRM vs ERP source facts + delta calc |
| "What's the customer impact?" | trace | Qty on-time/late + blast |
| "Draft the customer note" | draft | Labelled draft (not a commitment), with gaps |
| "Request reprioritization" | approval | Priority-change request to Program |

Composer: `Explain demand risk` · `Show commitment ledger` · `Compare allocation options` · `Draft customer communication` · `Request priority change` · `Monitor fulfillment`.

### 6.5 Governed actions & limits

- **Requests** priority/date changes; does **not** select operational alternatives or approve them (Program/Operations do).
- Drafts are explicitly labelled "draft — not an approved commitment."
- Cannot change ERP/CRM records; writeback is gateway-only.
- Sees customer/program fields; shop-floor labour/crew detail is redacted.

### 6.6 Example turn

> **Q: "Tell Northline what they'll get."**
> **Answer (draft):** "Draft for internal review — not an approved customer commitment." **Why:** "Sales operations cannot publish an unapproved promise." **Evidence:** CRM request, ERP promise, `CALC-COM-1042-ELIGIBLE`, missing split-ship waiver. **Options:** hold 15 Oct (third shift, pending approval) or split (56 on time / 64 on 19 Oct, waiver missing). **Next governed action:** "Route draft to Program; do not send until a decision is approved."

---

## 7. The shared demo thread across all four

One snapshot (`SNAP-20260926-0815`), one event (`EVT-LT-041`), four lenses:

```
Maintenance manager  →  "RES-LT-01 half-rate window: impact + restoration"
        │  releases capacity picture
        ▼
Shift planner        →  "Cover the gap with certified crew / third shift"
        │  proposes roster + overtime
        ▼
Manufacturing manager→  "Cheapest recovery holding the most promises; approve"
        │  approves within policy, escalates cost/date changes
        ▼
Demand planner       →  "What the customer gets; draft the note; request reprioritisation"
        │  request, not approval
        ▼
Program / Finance    →  customer date change / cost approval
```

Each role sees its **same-record** view; the approval chain is role-gated; no role can silently complete another role's step.

---

## 8. Persona-specific response-contract emphasis

| Block | Shift planner | Manufacturing manager | Maintenance manager | Demand planner |
|---|---|---|---|---|
| Answer lead | coverage | throughput/promise | availability | demand gap |
| Why emphasis | capacity chain | bottleneck across commitments | downtime event | requested↔capable |
| Evidence | crew cert, calendar, rate | full packet | resource + calendar masters | CRM/ERP delta |
| Options | shift/roster options | cost & promise trade-offs | window/PM options | allocation & date options |
| Recommendation | only with crew + approver | plant-level, named owner | only with restoration plan | only as a request |
| Next action | request overtime | approve/request | approve window | request priority / draft |

---

## 9. Persona-specific states & guardrails

- **Shift planner:** uncertified crew → gate chip, action disabled ("certification is a hard gate"); overtime over threshold → "Finance approval required."
- **Manufacturing manager:** approval expiry shown first ("expires with snapshot"); stale run → approval/execution disabled until re-run.
- **Maintenance manager:** defer without policy clearance → disabled with reason; restoration without evidence → "cannot be established as complete."
- **Demand planner:** draft over an unresolved conflict/missing waiver → labelled gap, send disabled; priority change without Customer priority policy → routed to Program, not auto-applied.

Universal: "not authorized" is distinguished from "absent"; held/expired/failed-test supply never eligible; "no feasible alternative" is a valid result.

---

## 10. Implementation mapping

| Concern | Where | Change |
|---|---|---|
| Role set | `model.ts` `Role` | **replace** the six-role union with `"shift-planner" \| "manufacturing-manager" \| "maintenance-manager" \| "demand-planner"`; update `PEOPLE` |
| Envelope / policy | `model.ts` `envelopeFor` | carry `lens`, `actionPolicy`, `disclosurePolicy`, `approvalPolicy` per role |
| Default lens | `orchestrator.ts` `openThread`/`nextFor` | role-specific orient spec and queue order |
| Default view | `App.tsx` | initialize `role = "manufacturing-manager"`; order the role switcher by lens |
| Question playbook | `orchestrator.ts` intent router | role-scoped intent → sub-orchestrator table |
| Composer | `App.tsx` `actionAvailability` | derive labels/enabled state from role policy |
| Approvals | `model.ts` `createApproval`/`decideApproval` | required approvers drawn from §10.1; self-approval refused |
| Centre linkage | `App.tsx` | queue/ledger defaults keyed off role lens |

### 10.1 Approval remap (retiring six roles → four)

The governed `Alternative.approvers` currently name roles that no longer exist as selectable personas. Remap them so approval stays meaningful and no step is skipped:

| Retired role | Was required for | New home | Effect |
|---|---|---|---|
| `operations-leader` | schedule / overtime | **manufacturing-manager** | approves schedule & capacity within threshold |
| `finance-controller` | cost over threshold | **manufacturing-manager** (within threshold) → **policy authority** (over threshold) | over-threshold cost still requires a distinct named approval; not self-approvable by the requester |
| `quality-manager` | substitution / eligibility confirmation | **policy authority** (quality gate) | quality confirmation becomes a gate check, not a persona approval; never waivable |
| `program-manager` | customer date change | **policy authority** (Program/Customer) | demand planner *requests* it; program authority approves |
| `procurement-manager` | approved-source allocation | **manufacturing-manager** | allocation is a plant action |

Two kinds of authority emerge and must be distinguishable in the UI:

1. **Persona approvers** — one of the four interactive roles (`manufacturing-manager`, `maintenance-manager`; `shift-planner`/`demand-planner` propose only).
2. **Policy authorities** — non-interactive named approvals (Finance, Quality, Program/Customer) surfaced as **named-approval requirements with owner + expiry**, not as role-switcher options.

Rules preserved: the requester cannot approve their own request; every recommendation names an owner and approver list; approval alone never executes (receipt required); quality/eligibility/frozen gates remain unwaivable.

> Consequence to accept: with Finance/Quality/Program no longer selectable, those approvals cannot be *recorded* in the demo by switching role. Either (a) model them as policy authorities that resolve on policy satisfaction, or (b) keep a non-persona "authority" actor for recording decisions. Recommendation: **(a) for the demo**, with the authority and expiry named on the card.

---

## 11. Acceptance criteria (per persona)

1. Each role opens to its **lead question** and its **lens-sorted queue**; switching role re-scopes the right pane without changing the centre values.
2. A role that cannot approve sees the action **disabled with the reason**, never hidden.
3. Every approval requirement names the person, role, rationale, and expiry for that persona.
4. A demand-planner draft is never labelled an approved commitment, and send is disabled while gaps/conflicts are open.
5. A shift-planner overtime request over the threshold routes to Finance and cannot be self-approved.
6. A maintenance-manager window change is approved as a window, never as a customer promise; restoration requires evidence.
7. A manufacturing-manager approval alone never yields execution; a dry run and receipt are required.
8. Redacted fields are reported as "not authorized," never as "absent," and never appear in prompts or logs.
9. The same snapshot renders the same numbers for every role; only the view, actions, and prose differ.
10. Cross-persona handoffs are explicit, ordered, and visible in the timeline.

---

## 12. Open questions

1. ~~Do these four roles replace the current six, or are they additional?~~ **Resolved: replace the six; four selectable personas.**
2. Is "shift planner" a distinct role or a capability of the supply planner in this build? **Resolved: distinct selectable role.**
3. Should the maintenance manager be able to **originate** scenarios, or only review/approve maintenance alternatives (recommend: originate maintenance-window scenarios, not production ones)?
4. Does the demand planner get a read-only comparison view of operational options, or only allocation/date options?
5. One thread per commitment shared across roles, or a per-role case thread keyed to the same decision id? (Recommend: one thread per decision, role-filtered.)
6. ~~Which single persona should the hackathon demo open as the default?~~ **Resolved: Manufacturing manager.**
7. **Approval authority model** — confirm §10.1 option (a): policy authorities resolve on policy satisfaction for the demo, vs (b) a non-persona authority actor that records Finance/Quality/Program decisions.