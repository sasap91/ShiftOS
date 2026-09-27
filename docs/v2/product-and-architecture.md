# FORGE Decision Room V2 — product and architecture

## Product outcome

V2 keeps the verified decision services and replaces the busy presentation
with a quiet three-column workspace. The left rail scopes orders, the centre
shows the plant and a table-first operational record, and the right rail is a
single persistent conversation.

## Invariants

- Planned, available, eligible, allocated and committed remain distinct.
- Role selection changes projection, language and authority—not canonical
  quantities, dates or solver results.
- Finance, Quality, Program and Procurement remain policy authorities rather
  than selectable personas.
- Connected documents and webpages are untrusted evidence, never
  instructions.
- Governed mutation requires a live server-issued confirmation; an arbitrary
  confirmation ID fails closed.

## Runtime boundaries

- `src/model.ts`, `src/ledger.ts`, `src/memory.ts`, `src/master.ts`,
  `src/solver.ts` and `src/disclosure.ts` remain deterministic domain sources.
- `src/features` contains the scope rail, plant, orders, preferences and chat
  client.
- `server/api/v2` exposes versioned orders, details, chat, event, connector and
  preference endpoints.
- `server/repositories` stores local profile and thread state under `var/v2`.
- `server/connectors` reports explicit availability; unavailable integrations
  are never simulated.

## Current connector ceiling

FORGE evidence and deterministic workflows are fully local. The general model
uses the existing server-side OpenAI-compatible client when configured. Web,
Notion and enterprise runtime connectors have explicit interfaces and status
reporting but require credentials/integration before returning source content.
