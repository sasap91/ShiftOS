# Application shell

`src/App.tsx` currently owns the three-column shell and URL context while the
feature implementations live under `src/features`. This boundary allows the
shell to move here later without moving the deterministic domain services.
