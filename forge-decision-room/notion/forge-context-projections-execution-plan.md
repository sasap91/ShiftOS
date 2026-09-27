# FORGE Decision Room — Context & Region Projections Execution Plan

> Execution plan for **one canonical `activeContext`, four region views** — the deep-link/selection-bus work the impact assessment recommended. It replaces "four independent links/endpoints" with one context plus four stateless projections, and sequences the client-only slice (which is safe now) ahead of the server tier (which is gated).

| Field | Value |
|---|---|
| Document | FORGE Decision Room — Context & Region Projections Execution Plan |
| Version | v1.0 |
| Status | 🟡 Active — plan for review; L1 executable now |
| Owner | Frontend / UX (client) + Backend / API (projections, store) |
| Ground truth | `src/*` · `server/*` @ working tree · `npm run verify` = green |
| Parent doc | Product Management · Execution Task List · UI/UX Layout & Interaction Spec |
| Supersedes scope | Refines **U-02** (`activeContext` selection bus + deep-link router); depends on **P-03/OI-08**, **P-07**, **D-03…D-05** |
| Last updated | 2026-09-27 |

**Status legend:** ✅ Done · 🔄 In progress · ⬜ Todo · ⏸ Blocked (decision needed) · ⛔ Cut from this iteration.
**Owners (functions):** FE = Frontend/UX · BE = Backend/API · DATA = Data modelling · QA = verification · GOV = Governance/Policy · PM = Product Management.

---

## 0. Summary

The room today keeps all selection in one ad-hoc React state (`src/App.tsx`) and writes a deep-link hash it never reads (`App.tsx:297`). The client never calls the server; `server/app.ts` exposes only `GET /api/health` and `POST /api/chat/turn`; the run store is in-memory (`server/runs/store.ts`) — so a link cannot honestly restore a decision in progress.

This plan delivers, in order:

1. **L1 — Context + codec + selection bus** (client-only, no server): one serialisable `activeContext` in the URL; every pane derives from it. **Executable now; closes U-02.**
2. **L2 — Pure projections + one store**: `scope/floor/orders/thread` become pure functions of `(context, store)`; the client/server dual source of truth collapses into a `RunStorePort`.
3. **L3 — Endpoints behind a flag**: `GET /api/context` + four read projections, server-side role scoping. **Blocked by P-03/OI-08.**
4. **L4 — Persistence + governed commands**: JSONL event store; link-restore of approvals/receipts; separate idempotent command endpoints.
5. **L5 — Floor projection**: real zones/overlays. **Blocked by M1 zone/routing masters.**

---

## 1. Objective & scope

**Objective.** Make the room's state shareable, refresh-safe and testable — "the same `(activeContext, role)` renders the same four regions" — without creating four competing sources of truth.

**In scope**

- `ActiveContext` type, URL codec, client store/router, selection bus.
- Four region projections as pure functions, then as HTTP read endpoints.
- Server-side role scoping + redaction; event-sourced run store; governed-command endpoints.
- Tests, docs, and register updates for the above.

**Out of scope**

- Changing the record model or solver (Data/Algorithms streams own that).
- The floor's geometry/master data (D-03…D-05 own that; L5 consumes it).
- Multi-tenant / multi-site (D-22 open by design).
- Re-selecting the layout itself (OI-24/OI-51 own fixed vs resizable and region placement).

---

## 2. Design decisions (locked for this workstream)

| # | Decision | Rationale / source |
|---|---|---|
| D1 | **One `activeContext`, four views.** Not four links; not four pane-named endpoints. | Invariant 11/12 (ledger §10); "centre is the record" |
| D2 | **URL is query-param based**, canonical key order, defaults elided, enum lists sorted. | Matches the de-facto screenshot shape `?horizon=13w&zone=ZN-08&role=supply-planner` |
| D3 | **Hand-rolled router** (`useSyncExternalStore` over `history`); no new dependency. | package.json has only react/react-dom; keeps static-SPA/offline posture |
| D4 | **Reconstructible facets in URL; ephemeral UI local.** `role/order/zone/focus/run/filters/horizon/view` in URL; `evidenceOpen/tier/hover` stay component state. | A link must not lie about state |
| D5 | **Endpoints are stateless read projections** of one context; domain-named (`/scope`, `/floor`, `/orders`, `/thread`), never `/left` `/right`. | Layout must not leak into the API |
| D6 | **Role scoping + redaction server-side**, before payload ("not authorized" ≠ "absent"). | Invariant 12; G-04/G-05; delivery §4.6 |
| D7 | **JSONL event store; screen rebuilds from the run store alone.** | Ledger §1.2; right-pane §3.2; delivery §1.5 |
| D8 | **Governed actions are separate, idempotent commands.** Selection is never mutation. | Approval ≠ execution; CAS at writeback |
| D9 | **`replaceState` for hover/focus; `pushState` for row/zone select.** | Prevents back-button churn |

---

## 3. Contracts

### 3.1 `ActiveContext` (new `src/context/types.ts`, shared with `server/`)

```
ActiveContext = {
  // context (URL)
  siteId: string            // default SITE-YYC-01
  role: Role                // selectable persona
  order: string | null      // ANCHOR: commitmentId
  zone: string | null       // centre-top selection
  focus: string | null      // addressable cell/record id
  run: string | null        // focused DecisionRun (baseline | scenario)
  view: "scope"|"floor"|"copilot"   // mobile tab (presentation only)
  filters: {
    state: QueueState[]
    urgency: string[]
    constraintClass: ConstraintClass[]
    family: string[]
    customer: string | null
    owner: string | null
  }
  horizon: string           // default "13w"
  // read-only echoes (server-authoritative; never trusted from URL)
  snapshotId: string
  masterSetVersion: string
  asOf: string
}
```

Ephemeral (never in URL): `evidenceOpen`, `tier` (collapsed/expanded), hover target, composer draft, pending animation step.

### 3.2 URL codec (new `src/context/codec.ts`; mirrored server-side by import)

```
Canonical grammar (fixed key order):
/room?role=R[&order=O][&zone=Z][&focus=F][&run=R][&view=V]
     [&risk=a,b][&urgency=..][&constraint=..][&family=..][&customer=..][&owner=..][&horizon=H]
```

Rules: (1) fixed key order; (2) omit defaults (`site`, `horizon`); (3) multi-value lists sorted, lowercased; (4) unknown/unknown-role/unknown-order ids are **dropped and logged**, never rendered as phantom; (5) `serialize(parse(x)) === x` for canonical `x`; (6) `snapshotId/masterSetVersion/asOf` are accepted only as hints — the server re-derives them.

### 3.3 Projection payloads (read-only DTOs in `src/shared/contracts.ts`)

| Projection | Endpoint | Shape (extends existing pure fn) |
|---|---|---|
| Context | `GET /api/context` | `{ envelope: ContextEnvelope; validity: "fresh"\|"soft-stale"\|"hard-invalid"; capabilities: RolePolicy }` |
| Scope (left) | `GET /api/scope` | `{ queue: QueueRow[]; counts: Record<QueueState, number>; lens: RoleLens; sort: string; empty: boolean }` — from `queueOf` + `buildLedger` |
| Floor (centre-top) | `GET /api/floor` | `{ zones: Zone[]; overlays: Overlay; selectedZone: string\|null; empty: boolean }` — **new; needs D-03…D-05** |
| Orders (centre-bottom) | `GET /api/orders` | `{ rows: LedgerRow[]; selected: string\|null; sorts: SortSpec }` — from `buildLedger` |
| Thread (right) | `GET /api/thread/{order}` | `{ header; runDock; turns: Turn[]; evidence: EvidenceSurface }` — from `openThread`/`reduce` + store |

### 3.4 Governed commands (separate, idempotent)

```
POST /api/commands/request-approval   { order, runId, optionId, rationale }   -> ApprovalRequest
POST /api/commands/simulate-action    { approvalId, mode: dry-run|execute }   -> ActionReceipt
POST /api/commands/record-outcome     { receiptId }                            -> ObservedOutcome
POST /api/commands/record-approval    { approvalId, decision, rationale }      -> ApprovalRequest
```

Each re-checks policy and authorization, carries an idempotency key, and appends an event (never mutates the baseline).

---

## 4. Work breakdown — Stream CP

### 4.1 L1 — Context, codec, selection bus (client-only; **do now**)

| ID | Task | Owner | Depends | Exit criteria | Status |
|---|---|---|---|---|---|
| CP-01 | `ActiveContext` type + defaults | FE | — | type in `src/context/types.ts`, shared by server build | ⬜ |
| CP-02 | Canonical URL codec `parse`/`serialize` | FE | CP-01 | round-trip + canonicalisation unit tests green | ⬜ |
| CP-03 | Client router/store (`useSyncExternalStore`) | FE | CP-02 | back/forward works; `replaceState` on focus | ⬜ |
| CP-04 | Lift `App.tsx` state to context (`activeId`,`role`,`focusCell`,`focusedRunId`) | FE | CP-03 | no behavioural regression; ephemeral state stays local | ⬜ |
| CP-05 | Selection bus: queue↔centre↔right all write the context | FE | CP-04 | event→effect matrix (§ledger §7.5) implemented for select/focus | ⬜ |
| CP-06 | Unknown-id clamping + logging | FE | CP-02 | bad `order/zone/run` id drops safely; no phantom row | ⬜ |
| CP-07 | Delete the dead `window.location.hash` write | FE | CP-04 | `App.tsx:297` replaced by the store | ⬜ |

### 4.2 L2 — Pure projections + one store

| ID | Task | Owner | Depends | Exit criteria | Status |
|---|---|---|---|---|---|
| CP-08 | Extract `queueOf`/counts into a pure `scopeProjection(context, store)` | FE | CP-04 | left renders from the projection only | ⬜ |
| CP-09 | `ordersProjection` over `buildLedger` | BE | CP-08 | parity with current ledger render | ⬜ |
| CP-10 | `threadProjection` over `openThread`/`reduce` | BE | CP-08 | returns header/turns/evidence deterministically | ⬜ |
| CP-11 | `RunStorePort` interface + in-memory adapter | BE | — | client uses the port, not `threads` in App | ⬜ |
| CP-12 | Collapse client `threads` + server `runs/store` behind the port | BE | CP-11 | single source of truth; no divergent runs | ⬜ |

### 4.3 L3 — Endpoints + server authorization (**gated**)

| ID | Task | Owner | Depends | Exit criteria | Status |
|---|---|---|---|---|---|
| CP-13 | `buildContext(query)` resolver (validated envelope) | BE | CP-02 | `server/context/envelope.ts` query→envelope | ⏸ (P-03) |
| CP-14 | `GET /api/context` + four projections | BE | CP-13, CP-08…10 | payloads match projection tests | ⏸ (P-03) |
| CP-15 | Server-side role scoping + redaction before payload | GOV,BE | CP-14 | redacted field ≠ absent; cross-scope returns nothing | ⏸ (P-03, G-04/G-05) |
| CP-16 | Feature flag + static fallback | BE | CP-14 | `FEATURE_SERVER_VIEWS=0` → client projections | ⏸ (P-03) |

### 4.4 L4 — Persistence + governed commands

| ID | Task | Owner | Depends | Exit criteria | Status |
|---|---|---|---|---|---|
| CP-17 | JSONL event store + fold/rebuild | BE | CP-11 | reload rebuilds runs/approvals/receipts/outcomes | ⬜ |
| CP-18 | Governed command endpoints (idempotent) | BE | CP-17 | replay returns same receipt; baseline unmutated | ⬜ |
| CP-19 | Compare-and-swap on execute (stale → rebase v2 + diff) | BE | CP-18 | `StaleError`; v2 diff visible | ⬜ |
| CP-20 | Link-restore of a decision in progress | FE | CP-17 | deep link reopens approval/receipt state | ⬜ |

### 4.5 L5 — Floor projection (**gated on M1**)

| ID | Task | Owner | Depends | Exit criteria | Status |
|---|---|---|---|---|---|
| CP-21 | `Zone` model + `floorProjection(context, store)` | DATA,FE | D-03…D-05 | zones/overlays/zone-select filter queue+ledger | ⏸ (M1) |
| CP-22 | `GET /api/floor` | BE | CP-21, CP-14 | selected zone re-scopes context | ⏸ (M1, P-03) |

---

## 5. Sequencing & milestones

| Milestone | Tasks | Gate | Depends on |
|---|---|---|---|
| **CP-M1 — Context shell** | CP-01…CP-07 | same context → same panes (client); U-02 closed | — (executable now) |
| **CP-M2 — Projections** | CP-08…CP-12 | panes render from pure projections; one store | CP-M1 |
| **CP-M3 — Endpoints** | CP-13…CP-16 | server returns the same projections; role enforced | **P-03/OI-08** |
| **CP-M4 — Persistence & commands** | CP-17…CP-20 | link rebuilds a decision in progress; CAS works | CP-M3, P-07 |
| **CP-M5 — Floor** | CP-21…CP-22 | zone select filters queue+ledger | CP-M3, **M1 masters** |

**Critical path:** CP-M1 ∥ (zone masters) → CP-M2 → CP-M3 (needs P-03) → CP-M4 → CP-M5.
CP-M1 and most of CP-M2 are **independent of every open decision** and should start immediately.

---

## 6. Test plan

| Test | Covers | Where | Task |
|---|---|---|---|
| Codec round-trip + canonicalisation | `serialize(parse(x))===x`; default elision; sorted enums | `src/context/codec.test` | CP-02 |
| Unknown-id clamp | bad order/zone/run dropped, logged | codec test | CP-06 |
| **Cross-pane determinism** | same `(activeContext, role)` → identical four regions | component test | **T-11**, CP-05 |
| Projection parity | server projection === client projection | server suite | CP-09/10/14 |
| Authorization + redaction | cross-scope returns nothing; redacted ≠ absent | server suite | **T-07**, CP-15 |
| Deep-link rebuild | reload restores runs/approvals/receipts | e2e | CP-17, CP-20 |
| CAS stale execute | stale `(snapshot, master, seed)` → rebase v2 | `verify.ts` | **T-06**, CP-19 |
| Fixture lint | ids referenced from URL resolve | `npm run lint:fixtures` | **T-03** |

Existing suites are unaffected: `verify.ts` (pure services), `verify-router`, `verify-tools`, `verify-ai` (server, green, not yet wired to the app).

---

## 7. Security & governance

- URL params are **hints, never authority**: the server re-derives `ContextEnvelope` from `(role, order, run)` and its own scope policy.
- Role scoping and redaction happen **before** payload serialization (invariant 12; G-04/G-05). A redacted field renders "not authorized", never "absent".
- Governed commands re-check policy at call time (not at routing time) and carry idempotency keys; the baseline is never mutated (`baselineMutated: false`).
- Audit every context resolution and projection fetch (append-only JSONL, trace id), as `server/audit/log.ts` already does for turns/tools.
- Single tenant/site for now (D-22 open by design).

---

## 8. Risks & mitigations

| # | Risk | Impact | Mitigation | Owner |
|---|---|---|---|---|
| R1 | Four independent links → contradictory panes | High | One `activeContext`, four facets (D1) | FE |
| R2 | Deep link promises state the client cannot rebuild | High | Reconstructible facets now; persist run store (CP-17) before link-restoring mutations | BE |
| R3 | Client/server dual source of truth | High | `RunStorePort` (CP-11/12) collapse | BE |
| R4 | Role scoping stays client-side | High (governance) | CP-15 enforced in data layer | GOV,BE |
| R5 | Endpoints break static deployment | Medium | Feature flag + fallback (CP-16); needs P-11 host | BE |
| R6 | Centre-top facet is a stub (no zone model) | Medium | Ship CP-M1 without it; land M1 masters | DATA,FE |
| R7 | Region naming drift (three-pane vs four-region) | Low–Medium | Freeze names before CP-13 names routes | PM |
| R8 | Back-button churn from focus writes | Low | `replaceState` on focus (D9) | FE |

---

## 9. Rollout & fallback

- L1/L2 ship in the static SPA with **no environment change**.
- L3+ are feature-flagged (`FEATURE_SERVER_VIEWS`); when off, the client computes the projections locally (today's behaviour).
- Fallback on model/source-down is unchanged: scripted mode + explicit inline error; never a blank pane.
- Rollback: revert the build; baselines are immutable, so only run invalidation is needed.

---

## 10. Definition of done

1. One canonical URL renders one `activeContext`; every region derives from it.
2. `(activeContext, role)` → identical four regions (T-11 green).
3. Reload restores a decision in progress (CP-17/CP-20).
4. Every endpoint is a read projection of `/api/context`; role scoping and redaction are server-side (T-07 green).
5. Governed commands are idempotent; CAS rejects stale execute (T-06 green).
6. Docs updated: UI/UX §7 (interaction & selection bus), ledger §1.1/§1.2, U-02 exit criteria, this plan.

---

## 11. Open decisions this workstream needs

| Ref | Decision | Blocks |
|---|---|---|
| OI-08 / P-03 | Trust boundary: client-only vs thin server | CP-M3 onward |
| OI-24 | Panes fixed vs resizable | CP-03 layout only |
| OI-51 | Order-table region placement | CP-09 |
| P-07 | Run store persistence format | CP-17 |
| P-11 | SSE-capable host | CP-M4 (if streaming) |
| D-01 | `requestedDate` (CRM seam) | left filters that sort by request↔promise delta |
| D-03…D-05 | Zone/routing/resource masters | CP-21/22 (floor) |

---

## 12. Change log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-09-27 | Created the Context & Region Projections execution plan: one `activeContext` + four projections; L1–L5 work breakdown (CP-01…CP-22); contracts; test plan; risks; mapping to U-02/P-03/P-07/T-06/T-07/T-11 |