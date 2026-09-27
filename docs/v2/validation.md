# FORGE Decision Room V2 — validation record

## Baseline parity gate

The clean fork passed the complete inherited `npm run ci` gate before v2 edits:

- Persona acceptance: 48/48.
- Invariant and property checks: 54/54.
- COOLIT algorithm checks: 16/16.
- Contract assertions: 23/23.
- Capacity model checks: 15/15.
- Typed-tool, router, AI grounding, fixture lint and production build: passed.

## V2 automated coverage

`npm run verify:v2` checks:

- Four canonical orders are exposed through `/api/v2/orders`.
- COM-1042 quantity and binding constraint match the deterministic model.
- The default table is exactly six columns.
- Table preferences round-trip by user and role.
- Chat writes a user and assistant record with the active context snapshot.
- A confirmation ID that was not issued by the server fails closed with 409.

## Required release checks

- Run the full `npm run ci` suite after every material change.
- Inspect the exact 5373 URL at 1280×720, 1440×900 and 1920×1080.
- Confirm the page does not overflow horizontally, the plant receives at least
  260px at 1280×720, and the right rail contains only conversation.
- Confirm no v2 implementation files were written into v1; preserve any
  concurrent v1 edits rather than overwriting them.

## Browser results

- 1280×720: page 1280×720; floor 279px; ledger 679px client/scroll;
  six columns.
- 1440×900: page 1440×900; floor 314px; ledger 839px client/scroll;
  six columns.
- 1920×1080: page 1920×1080; floor 420px; ledger 1319px
  client/scroll; six columns.
- Search, zone filtering, URL synchronization, order expansion, column
  customization/reset, role redaction, context dividers and governed chat were
  exercised in Chrome with no application console errors.
- A post-build checksum comparison detected concurrent edits in the v1 UI and
  three v1 Notion mirrors after the baseline import. They were not overwritten,
  copied back or reverted by the v2 implementation.

## Notion record

The verified v2 hub and its six child pages are published under the existing
FORGE Decision Room — Product Management page:

https://app.notion.com/p/3e807d7f61be81a38a83d352b0cc257b?pvs=204
