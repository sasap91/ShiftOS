# FORGE Decision Room — Model `ctp-0.3.0` Migration Note

> Shipped with the **M0 slice** (decision-memory identity + reference integrity).
> Companion to N-05 in the defect register: the run fingerprint contract changed,
> so this bump and note are required.

| Field | Value |
|---|---|
| Document | FORGE Decision Room — Model ctp-0.3.0 Migration Note |
| Version | v1.0 |
| Status | ✅ Shipped with the M0 slice |
| Owner | Backend / API (verification) |
| Ground truth | `src/model.ts` · `src/master.ts` · `src/memory.ts` · `npm run verify` = green |
| Last updated | 2026-09-26 |

---

## 1. What changed

| Area | Before (`ctp-0.2.0`) | After (`ctp-0.3.0`) |
|---|---|---|
| `MODEL_VERSION` | `ctp-0.2.0` | **`ctp-0.3.0`** |
| Memory identity | none | **`MEMORY_SET_VERSION = "MEM-MS-2026-09-26"`** (`src/model.ts`) |
| Run fingerprint `canonicalResult` | `{ feasibility, binding, shortfall, ship, alternatives }` | adds **`memorySetVersion`**, **`snapshotId`**, **`modelVersion`** |
| Decision memory | none | **`src/memory.ts`** — `MemoryVersion`, `EvidenceUseEdge`, stewardship, confidence gate, supersession, lint |
| Master lineage | none | `allMasterRefs()`, `supersededMasterExamples()` (`src/master.ts`) |
| `OPT-RESERVE-SLOTS` | dangling id referenced by the seeded COM-1104 records | materialised on the COM-1104 baseline (`cduBaselineAlternatives`) |

## 2. Reproducibility impact (N-05)

- **Operational outputs are unchanged.** No quantity, date, feasibility, gate, or option changed. Only the *fingerprint string* gained identity fields.
- **Golden hashes must be regenerated.** Any committed `canonicalResult` fixture or persisted receipt keyed by the old fingerprint must be re-based once (K-11 has not landed yet, so no committed hashes exist).
- **Determinism is preserved.** `canonicalResult(first) === canonicalResult(second)` still holds; `npm run verify` asserts it.
- **Why identity in the hash:** a run is only reproducible relative to the memory set it consumed. Pinning `memorySetVersion + snapshotId + modelVersion` is the precondition for memory-rooted replay (M3).

## 3. New invariants asserted by `npm run verify`

1. Every run / option / approval / receipt / master / memory edge reference resolves (`lintDecisionRoom(...) === []`) — closes **D-03** and **N-07**.
2. Freshness and conflict counts in the test envelope are derived from the packet, never literals — closes **N-24/D-24**.
3. `supersedeMemory` never mutates or deletes the prior version; the successor shares `memoryId` and points back via `supersedesVersionId`.
4. The confidence gate: superseding the RES-LT-01 hard-gate memory to `confidence 0.62` crosses `REAPPROVAL_THRESHOLD = 0.75` and forces reapproval.
5. Reverse edges are selective: `invalidatedDecisions(edges, "RM-RES-LT-01@RM-11") === ["DR-COM-1042-BASE"]`.
6. A source-down memory is `quarantined` with effective confidence `0` — never silently dropped (**D-21**).

## 4. Rollback

Revert the commit. Baselines are immutable and no persisted run was mutated, so rollback needs no data repair — only the fingerprint version returns to `ctp-0.2.0`.

## 5. What is deliberately **not** in this slice (M3/M6)

- Memory-rooted invalidation wired into the app lifecycle (`reapproval_required` on the ledger).
- The Memory Ledger / Impact & Replay UI.
- Server-side projection/redaction before serialization.
- Time-phased allocation and the remaining W2–W5 seams.