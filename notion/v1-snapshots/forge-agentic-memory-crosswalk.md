# FORGE × Agentic Memory — How Agentic Memory Best Addresses the FORGE Notion Pages

> **Reading note:** "it" = the agentic-memory layer specified in `forge-agentic-memory-4-roles.md`
> (the `MemoryVersion` / `EvidenceUseEdge` / selective-invalidation / projection / human-approval model
> distilled from the PromiseGraph set). "them" = the FORGE Notion page set and everything it leaves open.
> This is a crosswalk: which FORGE open items the memory model **closes, accelerates, or is neutral to** —
> and where adopting it would be a distraction.

| Field | Value |
|---|---|
| Document | FORGE × Agentic Memory — Addressability Crosswalk |
| Version | v1.0 |
| Status | 🟡 Proposal — for review |
| Owner | Product Management + Backend/API + Governance |
| Sources | FORGE Notion pages §0.1 · their open surface §0.2 · PromiseGraph/WP3 memory corpus |
| Last updated | 2026-09-26 |

---

## 0.1 FORGE pages reviewed

| Page | Role in the set |
|---|---|
| Product Management (hub) | vision, status, W1–W8, M0–M7 roadmap, **D+N register**, Q decisions, metrics, RACI |
| Open Item List (v0.4) | OI-01…OI-53 (decisions, clarifications, blockers, placeholders) |
| Execution Task List (v0.3) | streams K/D/A/B/C/T/P/G/U/X + milestone view |
| Status & Roadmap Readout | build-vs-plan audit, defect reconciliation, N-01…N-08 |
| Data Model & Synthetic Fixtures | entity contracts, fixture tables |
| Algorithms, Allocation & Replay | determinism, invalidation, replay, causal codes |
| Personas & Governance | four roles, authority, approval lifecycle, **§5 visibility matrix placeholder**, **§7 handoff placeholder** |
| Commitment Ledger & Cross-Pane Design | master/transaction/derived/conflict, four regions, one context |
| Context & Region Projections Execution Plan | one `activeContext` + four projections (CP-01…CP-22) |
| AI Chat Build Plan · Right-Pane Copilot designs | role-scoped copilot, tool-bounded, grounded prose |

## 0.2 The open surface to address

- **25 defects** (D-01…D-25) — 21 Open · 3 Partial · 1 by-design · **0 closed**.
- **8 new audit findings** (N-01…N-08) — all open; N-01 (a green test *encodes* a defect) and N-04 (authority cosmetic) are S1.
- **34 open items** (OI-01…OI-53) — decisions, clarifications, blockers, placeholders.
- **7 unclosed product questions** (Q-01…Q-07).
- **8 workstreams** (W1–W8) across **M0–M7**; critical path `M0 → M1 → {M3,M4,M5} → M6 → M7`.

---

## 1. The intersection thesis

Agentic memory is **not a 9th workstream and not a rewrite.** It is the *same problem FORGE already lists* under a different name in **three clusters**:

| FORGE open cluster | FORGE's wording | Agentic memory's answer |
|---|---|---|
| **Governance (M6 / W6)** | "authority cosmetic" (N-04), "no disclosure/redaction" (D-10), "queue not role-lensed" (D-11), "no override capture" (D-25), "no rejection taxonomy" (N-08) | The **ABAC projection + human-only approval + override-with-scope/expiry + shared causal-code namespace** are the exact primitives those items ask for. |
| **Integrity (M0 / W7–W8)** | "thin stale/missing examples" (D-21), "dangling ids fail silently" (N-07), "test hard-codes freshness" (D-24), "seeded approval bypasses gate" (D-23) | A `MemoryVersion` with `status ∈ active/superseded/expired/quarantined` and resolvable `EvidenceUseEdge`s makes staleness and dangling references **first-class and lintable**. |
| **Data seams (W2–W5)** | "MES absent" (D-15), "maintenance thin" (D-16), "no ship calendar" (D-17), "no routing" (D-07) | Each missing seam is naturally a **memory domain with an owner role**, so the memory model supplies the *entity shape* while the data team supplies the *values*. |

**Verdict:** adopt agentic memory **as an architecture lens over M0 and M6**, and as the **entity template for W2–W5** — not as new scope.

---

## 2. Crosswalk A — Defect register (D-01…D-25, N-01…N-08)

Legend: **🟢 Closes/enforces** (the memory model makes the invariant expressible + testable) · **🟡 Accelerates** (right shape; data seam still needed) · **⚪ Neutral** (orthogonal) · **🔴 At-risk** (memory touches the hash/contract — version it).

| ID | Defect / finding | Memory-model effect | Class |
|---|---|---|---|
| D-01 | No CRM requested date | `DemandSignalVersion` memory domain (Demand Planner steward) | 🟡 |
| D-02 | No maintenance alternatives | `AvailabilityMemory` steward enables window alternatives | 🟡 |
| D-03 | Dangling `OPT-RESERVE-SLOTS` | Every `EvidenceUseEdge`/option ref must resolve → same lint | 🟢 |
| D-04 | `shortfall` overloaded | Orthogonal, but memory-rooted invalidation removes the need to mutate it | 🔴 (N-05) |
| D-05 | Promise on non-working day "feasible" | Ship calendar as **rule memory** with effectivity; validity window blocks silent feasibility | 🟢 (shape) |
| D-06 | Hard-coded ship date | Date derived from fact memory, never a literal | 🟢 (shape) |
| D-07 | Routing master empty | Routing = rule memory; commitment → memory edge chain | 🟡 |
| D-08 | Authority collapsed | Approval bound to memory version; persona ≠ policy authority | 🟢 |
| D-09 | Role naming/ownership drift | Memory `ownerRole` makes stewardship explicit | 🟡 |
| D-10 | No disclosure/redaction | **ABAC projection**, field-level; "not authorized" ≠ blank | 🟢 |
| D-11 | Queue not role-lensed | Memory projection per role lens | 🟢 |
| D-12 | November demand invisible | Demand memory domain (still needs W5) | 🟡 |
| D-13 | Unit mismatch | Neutral (uom on the memory `value`) helps but doesn't fix | ⚪/🟡 |
| D-14 | No shop-floor layout | Neutral (zone memory could bind resources → zones) | ⚪ |
| D-15 | MES execution absent | Shift/execution memory domain (Shift Exec steward) | 🟡 |
| D-16 | Maintenance record thin | Availability memory domain (Maintenance steward) | 🟡 |
| D-17 | No ship calendar | Ship calendar = rule memory | 🟡 |
| D-18 | Allocation not time-phased | Neutral (algorithm) | ⚪ |
| D-19 | Recovery ignores competition | Neutral (algorithm) | ⚪ |
| D-20 | No commercial value | Commercial memory (sensitivity `restricted_finance`) → also enables margin redaction | 🟡 |
| D-21 | Thin stale/missing examples | Memory states (superseded/expired/quarantined) + **contested memory** (both versions kept) | 🟢 |
| D-22 | Single-site assumption | Neutral; tenant/site scope on memory | ⚪ |
| D-23 | Seeded approval bypasses gate | Approval must cite a memory version + go through gateway | 🟢 |
| D-24 | Test hard-codes freshness | Freshness **derived** from memory validity, not a literal | 🟢 |
| D-25 | No human-override capture | Override = named human + reason + scope + expiry + affected commitments | 🟢 |
| N-01 | Test asserts the Saturday defect | Rule-memory validity forces the test to invert (aligns B-05/T-02) | 🟢 |
| N-02 | `canPropose` unenforced | Memory actions gated by `ROLE_POLICY` at the data layer | 🟢 |
| N-03 | Envelope misdescribes authority | Envelope derives from memory-approval policy, not `[role]` | 🟢 |
| N-04 | Authority cosmetic | Policy authority resolved separately; cross-authority never satisfied | 🟢 |
| N-05 | `shortfall` in the reproducibility hash | Add memory version to the fingerprint; version the contract | 🔴 |
| N-06 | Seed opens mid-phase | Neutral | ⚪ |
| N-07 | Dangling ids fail silently | Edge resolution becomes a hard verify/lint failure | 🟢 |
| N-08 | No rejection taxonomy | One shared causal-code namespace (solver + human override) | 🟢 |

**Score:** ~16 of 33 defects/findings are **closed or enforced** by the memory model's invariants; ~10 **accelerated**; ~6 neutral; 2 explicitly **at-risk** (D-04/N-05) and must ship with a model-version bump.

---

## 3. Crosswalk B — Open items & product questions

| Ref | FORGE item | How memory addresses it |
|---|---|---|
| **OI-05 / Q-05** | Authority model: resolve-on-policy vs non-persona actor | Memory RACI: the system is **never Accountable**; policy authority is a memory-governed requirement with owner + expiry → **resolve on policy (a)**. |
| **OI-11 / P-07** | Persistence: JSONL vs SQLite | Memory requires an **append-only event store**; JSONL now, SQLite later — matches the recommendation. |
| **OI-12** | Unstructured retrieval (RAG) in v1? | Memory is **structured decision memory, never RAG** → reinforces **no RAG in v1**. |
| **OI-33** | Thread model: per-commitment vs per-role | **One thread per decision, role-filtered** = one memory root, four projections. |
| **OI-34 / Q-04** | Maintenance originates scenarios / separate run? | Maintenance is the **availability-memory steward** → it originates window changes; separate run referencing the production run. |
| **OI-53** | Context URL canonical form | `focus` = a stable `memoryId`/record id; addressable and reload-safe. |
| **Personas §5** | Visibility matrix placeholder | Filled by the **role × memory-domain × sensitivity** projection matrix. |
| **Personas §7** | Cross-persona handoff chain placeholder | Filled by **memory-rooted invalidation routing** (maintenance → mfg → shift → demand). |
| **Personas §2 / §3** | Envelope resolution · authority matrix cells | Envelope + matrix derive from memory ownership + approval policy. |
| **OI-08 / P-03** | Trust boundary (client vs thin server) | Redaction **must** be server-side before serialization → argues for the thin server, feature-flagged. |
| **OI-30 / T-12** | Automated persona acceptance | Memory projections give a deterministic per-role harness (same context → same projection). |

**Blocked items** OI-45…OI-50 are mostly *not* memory-dependent (they hang on OI-08, OI-14/15/16, OI-18) — memory neither unblocks nor worsens them, except OI-50 (authority demo) which memory directly serves.

---

## 4. Crosswalk C — Where memory lands in the roadmap

**Do not add a workstream.** Fold the memory layer into tasks that already exist:

| Milestone | Existing tasks | Memory addition (small) |
|---|---|---|
| **M0 — Integrity** | D-17/18/19, K-05/06, T-03 | Adopt the `MemoryVersion` envelope + resolvable `EvidenceUseEdge`; make the **fixture lint** assert edge resolution (closes D-03, D-21, N-07, D-24). |
| **M1 — Floor** | D-03/04/05, U-07 | Zone/routing/resource masters become **rule memories** with effectivity (D-07). |
| **M2 · M3 · M4 · M5** | W1–W5 seams | Each new entity (demand signal, work order, MWO, ship calendar) is authored as a **memory domain with a steward** (D-01, D-15, D-16, D-17, D-20). |
| **M6 — Governance** | D-09/10, G-01…G-06, U-06, N-02/03/04/08 | This is where memory pays off most: **ABAC projection**, **human-only approval**, **override with scope/expiry**, **shared causal codes** (D-08, D-10, D-11, D-25, N-02…N-04, N-08). |
| **M7 — Assurance** | T-03…T-15, P-09 | Add memory assertions (supersede-never-delete; only descendants stale; steward-only supersede; replayed decision needs new approval) and a **memory/assurance view**. |
| **Post-M7 (CP-M4+)** | CP-17…CP-20 | The run store + link-restore already needed; memory lineage rides on the same JSONL events. |

Net new surface is small and mostly **within M0 and M6**, which is exactly where the roadmap says the highest-severity items already live.

---

## 5. Where memory does **not** help (or would hurt)

- **It does not fix the data seams.** W1–W5 still need real CRM/MES/EAM/calendar/routing values; memory supplies the *shape*, not the *content*. Don't let the vocabulary hide missing data.
- **It is not the floor, the solver, or the algorithms.** D-14, D-18, D-19 are orthogonal.
- **It touches the reproducibility hash.** D-04/N-05: adding a memory version to `canonicalResult` must ship with the `ctp-0.3.0` bump and migration note — no silent hash change.
- **Scope-creep risk.** A full memory ledger before M0 lands would delay the integrity fixes that unblock everything. Adopt the **envelope + edges + governance primitives** now; defer the full ledger UI.
- **Overclaim risk.** "FORGE remembers" must stay mechanically governed: memory is deterministic, human-approved, and never Accountable in the RACI. This is the same discipline already in the FORGE vision.

---

## 6. Best-fit integration (where it should live in the doc set)

| FORGE page | Change |
|---|---|
| **Data Model & Synthetic Fixtures** | Own the `MemoryVersion` + `EvidenceUseEdge` contracts (one new entity section). |
| **Personas & Governance** | Fill **§5 visibility matrix** (role × domain × sensitivity) and **§7 handoff chain** (invalidation routing); name memory stewards per role. |
| **Algorithms, Allocation & Replay** | Extend invalidation to be **memory-rooted**; add per-field cause attribution. |
| **Product Management (hub)** | Add memory invariants to W8/governance; map the closure to **D-03, D-21, D-24, D-25, N-02, N-03, N-04, N-07, N-08**. |
| **Open Item List** | Mark **OI-05/Q-05, OI-11, OI-12, OI-33, OI-34, OI-53** as informed by the memory model; add one OI for "adopt memory vocabulary" (optional). |
| **Context & Projections Plan** | Note that `focus` resolves to a memory/record id; projections become the read side of memory. |

**Do not** create a separate "Agentic Memory" product page inside FORGE — it is a *lens*, not a deliverable. (The PromiseGraph page lives at the host-product level.)

---

## 7. Recommendation (thin slice, 5 moves)

1. **M0:** add the `MemoryVersion` envelope + resolvable `EvidenceUseEdge`; extend the fixture lint to fail on any dangling edge (closes D-03, D-21, D-24, N-07 for free).
2. **M0:** version `canonicalResult` to include the memory/snapshot identity, with the `ctp-0.3.0` bump + migration note (retires the D-04/N-05 risk).
3. **M6:** implement the **projection matrix** (role × memory domain × sensitivity) server-side before serialization, and the **human-only approval + override (reason/scope/expiry)** path — this is the single highest-value cluster (D-08, D-10, D-11, D-25, N-02, N-03, N-04, N-08).
4. **M1–M5:** author each new data seam as a **stewarded memory domain** so the W2–W5 entities are versioned and role-owned from day one.
5. **Do not** build the Memory Ledger / replay-attribution UI until M6 lands; until then, expose it through the existing evidence drawer + right-pane blocks.

**Bottom line:** agentic memory does not add work to FORGE — it **gives FORGE's existing open register a name, a shape, and a test** for the ~16 governance and integrity items that are currently unsolved, and it makes the four persona seams land as versioned, role-owned memory instead of one-off fixtures. Apply it at **M0 and M6** and as the entity template for **W2–W5**; everything else in the PromiseGraph corpus is out of scope for FORGE.

---

## 8. Change log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-09-26 | Created the crosswalk: FORGE page inventory + open surface; intersection thesis; defect crosswalk (D/N); open-item crosswalk; milestone placement; non-fit; doc integration; 5-move recommendation |