# FORGE plant workspace

A working local website built from `UX:UI/`, `PRD.md`, and the supplied synthetic enterprise pack. The original inputs are unchanged.

## Run

Requires Node.js 22.13 or newer (tested with Node 26). There are no third-party runtime dependencies and no package installation is required.

```sh
npm start
```

Open http://127.0.0.1:3000. Use `npm run dev` for server restarts during development. The app binds to the loopback interface; it is a local, read-only prototype, not a public production service.

## Connect Anthropic

Click **Connect Anthropic** in the website, enter your API key, and choose a Claude model available to your account. The server verifies the key/model using Anthropic's Models API. Keys entered this way remain in server memory until the process exits. They are not returned by the API, written to browser storage, included in prompts, or logged.

For persistent configuration, copy `.env.example` to `.env` and fill it locally:

```dotenv
ANTHROPIC_API_KEY=your_key_here
ANTHROPIC_MODEL=claude-sonnet-4-6
PORT=3000
```

Restart the server after changing `.env`. This file is excluded from Git. Don't put keys in source files or frontend JavaScript. Questions and the selected retrieved evidence are sent to Anthropic when a key is connected.

Without a key the assistant runs **Source search**: real retrieved records, with an explicit connection prompt. It does not fake model answers. Live Anthropic inference requires your own valid key and API credits; automated tests mock provider responses.

## What works

- The supplied green three-column visual design: orders on the left, interactive factory/process view in the center, assistant on the right.
- All 60 CoolIT commitments; 36 active, 18 delivered, 6 shipped. Search by order, customer, configuration, or compatible work-order ID; active/attention/all scopes.
- All 40 work orders placed by their recorded current or first planned MES operation. Click a work center to inspect its work. Planned work is marked separately. Completed work does not certify shipment readiness.
- Compatible commitment selection highlights its factory zone and shows the actual/planned operation sequence. Conflicting links show the source discrepancy instead of a false location.
- Source inspector with raw fields, record ordinal, lineage, versions, quality state, and timestamps.
- Recovery-history inspector: all eight supplied decision runs for affected commitments, feasible and blocked fixture alternatives, approval records, simulated receipts, and outcomes. These are historical fixture records, not freshly calculated decisions.
- Boyd and Airedale layout previews and supplied illustrative orders, clearly labeled. Their chat is disabled because no enterprise packs were provided.
- Anthropic Messages API integration with native citations, bounded conversation history, selected-order context, retry/error states, request timeout, and source links.
- Responsive layout, keyboard-operable work centers, native dialogs, reduced-motion support, and loading/empty/error states.

## Retrieval architecture

`src/data.mjs` parses every CSV (including quoted fields and multiline values) and reads all supplied Markdown, YAML, and JSON documentation. The 163 physical CSV files contain 46,743 rows: 159 business tables plus catalog/dictionary/manifest/review tables. Every row in the supplied tenant/site is indexed, including adverse data-quality fixtures, labeled as diagnostic evidence. Documents are chunked. Original UI code and PNGs are presentation references and are not factual RAG evidence.

The local index uses SQLite FTS5/BM25, with exact-identifier priority, selected-order relationship expansion, scenario/material evidence seeding, table diversity, and a bounded context budget. This is lexical and relationship-based RAG; it does not use embeddings or require a second API provider. Broad analytical questions may need more than the retrieved sample; the system instructs Claude to disclose missing evidence and not extrapolate totals.

Deterministic application code provides whole-dataset order counts and configuration compatibility checks. The model explains retrieved records; it is not a planning/CTP solver. Each retrieved document is passed to Anthropic with citations enabled, and returned document indices are mapped to actual stored source IDs. The system prompt treats records as untrusted evidence and preserves quantity/status distinctions. Native API details: [Messages](https://platform.claude.com/docs/en/api/messages/create) and [citations](https://platform.claude.com/docs/en/build-with-claude/citations).

The generated `.forge/search.sqlite` cache is ignored by Git and rebuilt when the source-content fingerprint changes. Run `npm run index` to inspect index coverage. Restart after editing input datasets. Source IDs are local to an index generation.

## Data issues and scope boundaries

- Snapshot: **2026-09-25T23:59:59-06:00**, not live production. A source freshness label of CURRENT is relative to this historical fixture.
- **50 of 60 MES commitment allocation links have incompatible configuration revisions**, affecting 30 active commitments. The supplied review says PASS but does not check this compatibility. Those links remain inspectable and searchable, but are excluded from commitment floor locations.
- Three inventory lots are held, expired, or unqualified; they cannot be counted as eligible. The 56 negative test fixtures are searchable only as diagnostic evidence.
- The supplied PRD describes three full tenant packs and a governed decision engine. Only CoolIT's enterprise data is present. This delivery does not fabricate Boyd/Airedale enterprise data.
- No new finite-capacity optimizer, CTP calculation, approval workflow, production writeback, identity provider, role/field authorization, production audit retention, or production deployment has been implemented. The PRD's full hackathon release gate is therefore **not satisfied**; this is the requested UI and data-backed assistant prototype.
- The local server enforces its fixed CoolIT tenant/site, loopback host, same-origin mutations, CSRF token, request-size and chat-rate limits, and static-file allowlisting. These are local safeguards, not multi-user enterprise access controls. Add authenticated authorization before any hosted deployment.

## Verify

```sh
npm test
```

Tests cover ingestion, exact counts, incompatible links, planned/actual separation, inventory eligibility, search provenance, native citation mapping, provider failures, server source isolation, CSRF/origin protections, and read-only recovery history. Browser QA covers order search/selection, work-center inspection, source dialogs, company switching, recovery records, and the no-key retrieval path.

## Files

- `public/`: website, styles, original concept-plan assets.
- `src/data.mjs`: CSV ingestion, canonical joins, local search, context construction.
- `src/anthropic.mjs`: Messages API request and citation mapping.
- `src/server.mjs`: localhost HTTP/API server and secret handling.
- `src/reference-plants.mjs`: illustrative layouts preserved from the reference UI.
- `test/forge.test.mjs`: integration and data-boundary tests.
- `PRD.md`, `UX:UI/`, `COOLIT_Synthetic_Enterprise_Data_v2/`: unchanged supplied inputs.
