# COOLIT Synthetic DATA, ERP, CRM, MES, and governed-decision data v2

This package is a deterministic synthetic operating model for one mixed-volume liquid-cooling plant. It is not CoolIT Systems production data, an as-built facility model, evidence of a customer relationship, or evidence of deployed ERP, CRM, MES, PLM, QMS, WMS, test, or planning systems. Source-system names remain discovery placeholders.

## Fixed canonical anchors

- 1 active manufacturing site
- 12 sellable configurations across coldplate loops, rack manifolds, and CDUs
- 250 item-master rows
- 10 suppliers
- 60 canonical commitment lines
- 40 work-order headers
- 100 actual test-execution headers

## v2 depth

- 104 historical weeks and 26 planning weeks
- source-system inventory, source-field mappings, data contracts, field lineage, SLO observations, CDC and schema-contract tests
- a separate negative-test pack for stale, invalid, duplicate, late, deleted, conflicting, and unresolved facts
- ERP MRP, gross and net requirements, pegging, exceptions, ECO blast radius, inbound logistics, warehouse control, finite schedules, cost postings, delivery, invoicing, and returns
- CRM forecast history, CPQ and pricing rules, promotion exceptions, pseudonymous buying centers, contracts, SLAs, entitlements, structured activities, communication receipts, health, field service, and reliability cohorts
- MES recipes, parameters, qualified operators, equipment state, maintenance, calibration, closed NCR and CAPA, controlled instructions, SPC, OEE, genealogy, dispatch history, and schedule adherence
- twenty historical decision replays, thirty read-only shadow runs, authorization tests, and decision-time policy records

## Semantics

Planned, on-hand, eligible, allocated, committed, shipped, delivered, invoiced, returned, and accepted quantities remain separate. Held, expired, failed-test, obsolete, unqualified, quarantined, unresolved, or unavailable facts do not become eligible. Opportunity and quote records do not become commitments without an explicit promotion event. Planned-only operations do not receive actual process, labor, signature, or instruction-acknowledgement evidence.

## Excellence boundary

The package operationalizes an aspirational top-tier standard through measurable release evidence. It does not prove an external percentile or claim production fidelity. Authenticated CoolIT discovery, owner approval, calibration to anonymized operating ranges, replay with customer data, and shadow-mode outcomes remain required before pilot or production claims.

## Privacy and safety

All customer, supplier, program, site, asset, and workforce references are synthetic or role-based. Pseudonymous operator and stakeholder roles contain no unnecessary personal data. No autonomous production writeback is enabled.

## Review

Three review rounds are included under review/: schema and completeness; cross-system integrity and reconciliation; realism, privacy, negative-state safety, replay, and governance controls.
