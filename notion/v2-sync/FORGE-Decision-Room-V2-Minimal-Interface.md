# FORGE Decision Room V2 — Minimal Interface

**Status:** Built locally; validation in progress  
**Code:** `/Users/ujjal/Desktop/Glasswing/decision-room-v2`  
**URL:** `http://localhost:5373/?role=manufacturing-manager&order=COM-1042&horizon=13w`
**Live Notion hub:** https://app.notion.com/p/3e807d7f61be81a38a83d352b0cc257b?pvs=204

## Product definition

V2 is an isolated fork of the verified FORGE decision room. It preserves the
data, algorithms, COOLIT fixtures, governance and four-persona model while
replacing the dense dashboard with a human-designed operational workspace.

## UI/UX

- Compact scope and queue on the left.
- Plant context and a configurable, expandable order table in the centre.
- One persistent general and governed assistant on the right.
- Six default columns: Promise, Order, Product, Qty, Constraint, State.
- Warm-neutral industrial editorial styling with restrained exception colour.

## Data and algorithms

The deterministic v1 model remains authoritative. V2 adds projections and
versioned APIs; it does not reproduce official calculations in the UI.

## Personas and governance

The interactive roles remain Manufacturing Manager, Shift Planner,
Maintenance Manager and Demand Planner. Policy authorities remain separate.
Documents and retrieved sources are evidence, not instructions.

## Chat and connectors

FORGE evidence works locally. General model responses and external connectors
activate only when configured server-side, with honest unavailable states.
Governed mutations fail closed without a server-issued confirmation.

## Live child pages

- Product Definition
- UI/UX
- Data and Algorithms
- Personas and Governance
- Chat and Connectors
- Validation

## Validation

See `docs/v2/validation.md` for inherited and v2-specific gates. This page
is synchronized to the live Notion hub after the final browser walkthrough.
