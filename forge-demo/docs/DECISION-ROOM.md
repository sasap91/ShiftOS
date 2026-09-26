# FORGE decision room — implemented hackathon slice

Open http://127.0.0.1:3000/decision-room after `npm start`. The factory dashboard links to the room and remains available at `/`. The supplied specification is preserved in `docs/CHATBOT-SPEC.md`.

The room keeps the narrowed single-plant shared-test-outage use case. It is a standalone conversational surface over the deterministic recovery engine, not a replacement for the factory dashboard. Its case ledger is separate from the earlier dashboard's local approval simulation; approvals in one surface do not approve actions in the other.

## Implemented

- Four desktop regions: server-created context, persistent decision queue, structured conversation timeline, evidence drawer. Layout stacks on narrow screens.
- Stable case ID with immutable versioned runs and retained superseded history. Scenario changes create a new snapshot and invalidate old recommendations. Recommendations expire after one hour.
- `ContextEnvelope`, evidence packet with claim provenance, immutable `DecisionRun`, approval events, simulated action receipts and explicitly unobserved outcomes.
- Twelve versioned typed tools with closed input schemas, policy checks, audit events, timing budgets, and idempotency keys for material operations.
- Role policy enforced on the server: planner reads/scenarios/requests; plant manager also approves and simulates; supervisor reads and simulates approved actions. This policy applies to the new `/api/room/*` endpoints.
- Explicit request, approval/rejection, dry-run and execution controls. Conversation never performs a material action. Failed authorized simulation attempts produce rejected receipts. Transport retries with the same key return the original result; changing arguments rejects the key.
- Responses present Answer, Why, Evidence, Options and Next governed action, with native commitment, approval-brief, receipt and outcome blocks where relevant.
- Tool traces include actor, policy, arguments, snapshot, result hash, latency and version. Turns persist sanitized questions, immutable snapshot references, response blocks, model/prompt version and trace IDs. The result can be reconstructed from the immutable run and referenced packet; action results are stored as receipts.
- Key-like values are redacted from room questions and rationales before persistence and prompt construction. Retrieved or user-authored text cannot grant authority.
- Claude uses the existing Anthropic connection. It selects IDs from server-authored claims; generated prose and numeric values are never rendered as official facts. Invalid JSON, unknown claims or provider failures produce an explicit deterministic fallback. No provider key is required for the evidence/approval demo.

## Deliberate MVP boundaries

This is **local role simulation**, not production identity or access management. The principal is created by the server and cannot be changed by request parameters, but it is not authenticated through SSO. All three demo roles can read the same synthetic case fields. There is no real customer/program/field-sensitive dataset loaded into this room. Tenant/site/case scope mismatches and unknown input fields fail closed. Production SSO and granular row/field policy adapters remain required before using private enterprise data.

Intent routing is a small deterministic taxonomy with a server-selected typed tool plan. Claude selects relevant grounded claims after tools run; it does not perform arbitrary native tool calling or generate unrestricted explanations. This is a conservative implementation of the numeric-provenance acceptance criterion. No cross-case conversation history is sent to the model.

The packet comes from the recovery fixture and deterministic engine. The original historical enterprise pack remains available in the older workspace and dashboard chatbot, but is not silently promoted into the current incident or searched as unconstrained full-document RAG. Production document authorization, injection-screening, source crosswalks and live ingestion adapters are outside this demo.

No ERP/MES writeback, authenticated supervisor dispatch, live monitoring feed, actual test result, actual shipment, or measured cost is connected. Reconciliation confirms a **simulated receipt against the approved immutable snapshot** only. The outcome intentionally stays **UNOBSERVED**; the app cannot demonstrate an actually observed recovery without an operational evidence source. Partial external acceptance and external reconciliation failures cannot occur without a writeback adapter and are not fabricated as successful integrations.

Tool execution is local and synchronous, with a checked elapsed-time budget; there is no remote tool process to cancel. Anthropic requests have a 20-second transport timeout. Runs, events, receipts, turns and idempotency results persist in the local SQLite database. This is application-level append-only logging, not a tamper-proof security audit store.

## Demo sequence

1. Open the room and inspect the context, risk, alternatives and excluded station evidence.
2. Ask “Explain the risk for REC-1001” and open a calculation citation.
3. Ask for a Plan B approval brief; verify that this creates only a draft.
4. Request approval with a rationale. Review and explicitly approve as the named demo plant manager.
5. Run the explicit dry run, then simulate execution. Inspect the two distinct receipts.
6. Inspect Outcome: expected protection is recorded, realized outcome remains unknown.
7. Run a different outage scenario. Open the old queue entry and inspect the supersession event and disabled old approvals.

`npm test` covers deterministic scheduling and costs, scoped tool access, role denial, unsupported-field denial, prompt-injection attempts, grounded-claim validation, key redaction, immutable snapshots, expiry, named approval, dry-run gating, receipts, idempotency, stale in-flight responses, and HTTP integration. Provider behavior is tested with controlled mocks; a live Anthropic response requires the user's connected key.
