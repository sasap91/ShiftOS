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

- Local evidence mode is always available for FORGE records and deterministic
  workflows.
- General assistant responses require `FEATURE_AI_CHAT=1` and a server-side
  model key.
- Web, Notion and enterprise connectors report unavailable until their
  respective feature flags and server integrations are configured. The UI
  never implies a source was searched when it was not.

Runtime state is isolated under `var/v2` and is not committed. Historical v1
acceptance and audit evidence is preserved under `archive/v1-runtime`.
