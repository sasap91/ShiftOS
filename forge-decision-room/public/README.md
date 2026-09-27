# Front-dash floor-plan asset

Drop the authoritative COOLIT floor-plan illustration here as **`floor-plan.png`**.

- The app probes `/floor-plan.png` at load. If present, the front dash renders the
  illustration with clickable zone hotspots (badges + state dots). If absent, it
  falls back to the schematic SVG.
- This is the PT-02 "attach the authoritative image" step. No rebuild needed —
  Vite serves `public/` as-is (dev and `vite preview`).
- Zone hotspot positions come from `src/zones.ts` geometry; if the illustration's
  zone layout differs, adjust `ZONES` x/y/w/h so the hotspots line up.
