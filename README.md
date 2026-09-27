# FORGE Decision Room V2

An isolated, minimal decision-room interface built from the verified v1
deterministic model, governed tool gateway, four-persona policy and COOLIT
fixtures.

## Run

```bash
npm install
npm run ci
npm run dev
```

Open:

`http://localhost:5373/?role=manufacturing-manager&order=COM-1042&horizon=13w`

The v1 application remains independent at `http://localhost:5273`.

## Runtime modes

- Every submitted chat message is routed server-side to the pinned sciforium
  `DeepSeek-V4.1-Flash` deployment when a server-side model key is configured.
- The model receives a governed, read-only workspace bundle containing all
  canonical commitments and evidence packets, complete checked-in solver
  outputs, plant zones, production-plan summary, algorithm/version metadata,
  route policy, deterministic previews and recent conversation history.
- Deterministic services remain authoritative for quantities, dates,
  feasibility, approvals and writebacks. DeepSeek explains and proposes; it
  does not replace calculations or bypass confirmations.
- Copy `.env.example` to `.env` and set `LLM_API_KEY` (or provide
  `SCIFORIUM_API_KEY` in the server environment). The key never reaches React.
- Web, Notion and enterprise connectors report unavailable until their
  respective feature flags and server integrations are configured. The UI
  never implies a source was searched when it was not.

Runtime state is isolated under `var/v2` and is not committed. Historical v1
acceptance and audit evidence is preserved under `archive/v1-runtime`.
