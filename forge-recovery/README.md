# FORGE

A manufacturing recovery workspace with the ShiftOS / COOLIT synthetic enterprise order book and a real Anthropic Claude decision partner.

## Run

Node 22+, no npm dependencies. Set `ANTHROPIC_API_KEY` in the ignored `.env`, then `npm run dev` (http://127.0.0.1:4173). The same Worker handler serves local and hosted requests. Restart after server-source changes.

## Present

1. The app opens on **EVT-0003**, the dataset's shared leak-test capacity loss. The left panel lists every one of the 60 commitment lines (20 sales orders); search, filter, or click a line for its source detail.
2. **Find a recovery path** calls Claude with the six affected commitments and linked source evidence. The AI explains the governed alternatives and prioritizes the six commitments.
3. Preview **A: Resequence + overtime**, **B: Expedite + substitution**, and **C: Use held inventory**. C is blocked: P-QD-003 has 111 on hand and zero eligible units.
4. The right panel becomes a business conversation. Ask “Why choose A over B?” or click a source order and **Discuss this order**. Multi-turn context includes the selected order, all 60 lines, deterministic aggregates, and selected recovery strategy. Citation chips open pinned source files.
5. **Commitment timeline** shows actual ERP schedule and approved promise dates. Source aggregate strategy impact is displayed separately; the chart does not invent per-order shipment forecasts.
6. **Review & approve** revalidates the selected strategy on the server and creates coordination tasks. Work-order reconciliation, material eligibility and staffing remain prerequisites to dispatch.
7. The top-right profile menu selects the presenter supervisor view for task acknowledgment. It also contains the decision record and incident reset.

## Data provenance and boundaries

Source: https://github.com/sasap91/ShiftOS/tree/ef1ef68ff7d4d318067d8ec0be23d5e4f7826609/COOLIT_Synthetic_Enterprise_Data_v2

- Imported snapshot: September 25, 2026; source revision `ef1ef68ff7d4d318067d8ec0be23d5e4f7826609`.
- Raw source files and SHA-256 provenance: `data/shiftos/`. `python3 scripts/import-dataset.py` regenerates `public/dataset.mjs` from these pinned CSVs. This is a bundled snapshot, not a live GitHub/ERP synchronization service.
- Every source order is retained. Source statuses, quantities, values, IDs, and dates are not replaced by the earlier T-02 presentation values.
- Recovery covers COM-0051 through COM-0056: **USD 4,042,000** in full order-line value. Dates range from December 23, 2026 to January 8, 2027. They are not due within 24 hours.
- DR-0005 supplies bounded alternatives: ALT-A **CAD 18,400 / 0-day aggregate service impact**, ALT-B **CAD 26,750 / 1-day impact**, ALT-C **blocked by Quality release**. Costs and impacts are source scenario assessments; Claude generates reasoning and priority, not fabricated economics.
- USD customer values and CAD recovery costs remain distinct. Full order-line value is neither recognized revenue, profit nor avoided loss.
- Source work-order links contain configuration inconsistencies. These remain visible and create a reconciliation prerequisite; no eligible fulfillment or finite dispatch schedule is inferred from those links.
- Deterministic checks validate affected commitment coverage, the governed alternative, the material gate, and leak-test qualification. Passing strategy checks does **not** certify dispatch readiness.
- Source historical approvals/outcomes are not session approvals or newly executed actions. User approval, chat, and task progress are session-only and reset on reload. No external messages or factory commands are sent.
- Presenter role selection is a demo control, not a production identity or authorization system. Hosted access remains owner-private.
- API keys stay server-side. Never commit `.env` or include it in an archive.

## Verify and build

`npm test` covers source reconciliation, hashes, held-lot rejection, currency separation, coverage checks, API boundaries, and multi-turn conversation grounding.

`npm run build` creates Cloudflare-compatible Worker output and public assets. The hosted runtime uses the existing secret Anthropic credential.
