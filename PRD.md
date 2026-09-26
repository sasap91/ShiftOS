\<aside\>  
 🎯

**Focused PRD v0.2 · 26 September 2026**

Scope decision: model exactly three companies and one active manufacturing site per company. The companies are research targets, not customers. All demo data is synthetic, and site-specific systems, requirements, pain, interest, and buying intent remain unvalidated until discovery.

\</aside\>

**Document type:** Product Requirements Document

**Status:** Discovery and hackathon build specification

**Target layouts:** CoolIT-like mixed-volume manufacturing; Boyd-like vertically integrated ramp; Airedale-like configure/engineer-to-order system assembly

**Deployment boundary:** Read-only and simulated writeback first; named human approval required for every material action

---

## **1\. Scope decision and change log**

This revision replaces the earlier multi-site interpretation with a deliberately narrower design:

* three company datasets;  
* one active manufacturing site in each company dataset;  
* multiple lines, cells, work centers, test resources, suppliers, and product configurations inside each site;  
* no inter-site transfer, site selection, cross-border network balancing, or site-to-site qualification logic;  
* one shared canonical data model and one product experience across all three layouts;  
* company-specific behavior expressed through configuration, constraint types, and synthetic data—not separate applications.

`site_id` remains mandatory in the data contract so the product can expand later, but each v0.2 tenant contains exactly one active `site_id`. Any second-site or transfer record must fail fixture validation.

### **Decision rationale**

A single-site boundary makes the hackathon proof credible. FORGE can demonstrate commitment risk, material eligibility, finite capacity, quality/test gates, engineering effectivity, feasible alternatives, approvals, and outcome tracking without pretending to solve global network planning. The three layouts still test meaningful portability because their operational structures are materially different.

---

## **2\. Executive decision**

Build FORGE as a **governed operations decision layer for one manufacturing plant at a time**. It sits above ERP, CRM, MES, PLM, QMS, WMS, supplier, project, and test systems; detects customer commitments at risk; identifies the binding constraint inside the plant and its connected supply base; calculates feasible recovery options; routes the decision to named people; and records approved actions and outcomes with auditable receipts.

FORGE does not autonomously run the factory. Its product promise is:

> **FORGE helps a liquid-cooling plant make, approve, and execute reliable customer commitments when material, capacity, engineering, quality, and project constraints collide.**

The hackathon proof is not three disconnected dashboards. It is one repeatable workflow demonstrated against three plant layouts:

1. **CoolIT-like:** mixed-volume production of cold-plate loops, manifolds, and CDUs inside one plant.  
2. **Boyd-like:** vertically integrated fabrication, machining, assembly, and test inside one campus.  
3. **Airedale-like:** configure/engineer-to-order CDU project assembly inside one plant.

---

## **3\. Target layouts and evidence boundary**

| Reference account | Single-site layout represented | Primary decisions | Explicit boundary |
| ----- | ----- | ----- | ----- |
| **CoolIT Systems** | One mixed-volume plant with separate or shared production resources for cold-plate loops, manifolds, and CDUs. | Product-mix prioritization, line/cell loading, supplier recovery, leak/functional-test allocation, and customer promise protection. | Public evidence supports global operations, but v0.2 models only one representative plant. It does not select among Canada, China, or Vietnam. |
| **Eaton / Boyd Thermal** | One vertically integrated campus with fabrication, machining, assembly, qualification, and test work centers. | Ramp capacity, internal make flow, engineering-change impact, supplier synchronization, test readiness, and commitment recovery. | The representative site is a synthetic operating model. Acquisition integration and exact site-system deployment remain discovery questions. |
| **Airedale by Modine** | One configure/engineer-to-order CDU assembly plant serving project-based customer commitments. | Configuration freeze, design release, long-lead procurement, assembly readiness, FAT, shipment, and commissioning-document readiness. | The model does not coordinate U.S. and European plants. Exact plant selection and local systems remain to be confirmed. |

The named accounts are strong-fit research prospects only. Nothing in this document establishes customer interest, access, qualification, a pilot, or validated requirements.

---

## **4\. Product thesis**

### **4.1 Problem**

Liquid-cooling plants coordinate several operating modes and constraints:

* high-volume, configuration-sensitive cold-plate loops;  
* mid-volume manifolds and related assemblies;  
* low-volume, complex CDU and skid assemblies;  
* frequent new-product and engineering-change activity;  
* long-lead pumps, heat exchangers, controls, valves, filters, quick-disconnects, fabricated parts, and electronics;  
* constrained skilled labor, machining, fabrication, assembly, tooling, fixtures, leak test, thermal/flow test, burn-in, and FAT capacity;  
* quality and qualification gates that can make physically present inventory ineligible;  
* customer dates that depend on configuration, design release, material, production, test, documentation, shipment, and site-readiness milestones.

ERP records transactions, CRM records opportunities and customer dates, MES records execution, PLM controls product definition, QMS controls quality events, and project systems manage milestones. None alone answers:

> **Can this plant keep the commitment, what is the binding constraint, what recovery options are feasible, who must approve one, and did the approved action work?**

### **4.2 Product principles**

1. **Commitment first:** organize work around customer promises and decisions, not source-system menus.  
2. **One plant, complete causal chain:** model the selected site deeply before adding network breadth.  
3. **Deterministic truth, AI explanation:** governed services calculate quantities, dates, eligibility, constraints, and scenario impacts; generative AI interprets questions and explains evidence.  
4. **Semantic precision:** planned ≠ available ≠ eligible ≠ allocated ≠ committed ≠ shipped.  
5. **Evidence before recommendation:** material claims expose source, timestamp, transformation, freshness, and confidence.  
6. **Human authority:** named people approve promises, schedule changes, purchases, deviations, engineering effectivity, and writebacks.  
7. **Closed-loop accountability:** every decision preserves its baseline, alternatives, rationale, approval, action, receipt, and measured outcome.  
8. **Configuration over forks:** the three layouts use one data contract and product; rules and constraints vary through configuration.

---

## **5\. Goals, non-goals, and success measures**

### **5.1 Goals**

* Detect customer commitments at risk earlier than the plant’s existing review process.  
* Identify the actual binding material, capacity, engineering, quality, test, or logistics constraint.  
* Produce feasible and explainable intra-plant recovery alternatives.  
* Reduce decision latency, schedule churn, expediting, premium freight, and avoidable WIP.  
* Protect quality, qualification, engineering, and approval gates while accelerating recovery.  
* Make decisions reproducible, role-scoped, and auditable.  
* Prove that one canonical product can support three distinct plant layouts.

### **5.2 Non-goals**

* Multi-site allocation, inter-site transfer, cross-border production balancing, or site selection.  
* Replacing ERP, CRM, MES, PLM, QMS, WMS, project, or equipment-control systems.  
* Directly controlling pumps, valves, machines, robots, test stands, or building-management systems.  
* Letting a language model calculate official inventory, capacity, ATP/CTP, cost, or schedule feasibility.  
* Autonomously accepting customer orders, releasing work orders, changing BOMs, approving deviations, issuing purchase orders, or publishing promises.  
* Predictive maintenance, computer vision, autonomous quality disposition, or full digital-twin simulation.  
* Training a shared model on confidential customer data without explicit contractual and technical controls.  
* Claiming a universal optimizer before plant constraints and objectives are validated.

### **5.3 North-star metric**

**Commitment Reliability Rate:** percentage of customer commitment lines delivered in the approved quantity and time window with all required configuration, quality, test, documentation, and shipment gates satisfied.

### **5.4 Supporting metrics**

| Dimension | Metric | Hackathon or pilot gate |
| ----- | ----- | ----- |
| Detection | Injected risks correctly connected to affected commitments | 100% of golden-scenario events |
| Decision quality | Recommended alternatives satisfy all modeled hard constraints | 100% |
| Eligibility | Held, failed-test, expired, or unqualified supply counted as usable | 0 occurrences |
| Reproducibility | Identical snapshot and model version return identical result | 100% |
| Evidence | Material recommendation fields with lineage and freshness | 100% |
| Governance | Material actions with required named approval | 100% |
| Execution | Attempted actions with receipt or explicit failure state | 100% |
| Portability | Golden layouts completed without a company-specific product fork | 3 of 3 |

Business targets such as avoided late lines or reduced expedite hours remain validation hypotheses until historical or live customer data is available.

---

## **6\. Users and decision rights**

| Persona | Primary decision | Required evidence | Default restriction |
| ----- | ----- | ----- | ----- |
| Plant manager / operations leader | Trade service, capacity, labor, cost, and operating risk | Plant risk queue, alternatives, operational impact, owner, expiry | No unreviewed operational writeback |
| Demand or program planner | Prioritize demand and customer/project dates | Demand status, source/version, customer assumptions, confidence | No silent promotion of forecast or opportunity to commitment |
| Supply planner | Material-feasible plant plan | Part pegging, supplier commits, inventory eligibility, alternates | No use of held or unqualified supply |
| Manufacturing planner | Line/cell loading and work-order sequence | Frozen windows, labor, tools, fixtures, test capacity, WIP readiness | No release of an unapproved or infeasible schedule |
| Procurement manager | Expedite, reschedule, split, or alternate-source action | PO evidence, supplier commit, source approval, cost, quality status | No unapproved source represented as usable |
| Engineering / NPI lead | Configuration, design release, and change effectivity | Affected demand, inventory, WIP, tests, validation, and dates | No autonomous ECO or deviation |
| Quality manager | Hold, release, deviation, containment, and test disposition | Lot/serial genealogy, qualification, inspection, and test evidence | No AI override of quality disposition |
| Sales operations / program manager | Customer promise and change communication | CTP result, dependencies, confidence, approved message | No publication of an unapproved AI-generated promise |
| Finance controller | Overtime, expedite, premium freight, inventory, and margin trade-offs | Versioned cost assumptions and sensitivity | No estimate presented as booked actual |
| IT / data governance administrator | Connector, access, model, policy, and audit controls | Lineage, identity crosswalk, role policy, logs, connector health | No access outside granted tenant, role, customer, or program scope |

---

## **7\. Product requirements and roadmap**

The eight **MVP** capabilities must work end to end for the hackathon. The remaining capabilities are roadmap items and may appear only as clearly labeled mockups or backlog requirements.

| Rank | Capability | Requirement | Phase |
| ----- | ----- | ----- | ----- |
| 1 | **Commitment integrity / capable-to-promise** | Calculate feasible quantity and date from eligible material, approved configuration, finite plant capacity, quality/test gates, project gates, and logistics. Return confidence, assumptions, binding constraint, and expiry. | **MVP** |
| 2 | **Commitment-at-risk decision queue** | Rank threatened commitments by severity, time-to-impact, recovery window, customer priority, and financial/service exposure. Each item names the owner and next decision. | **MVP** |
| 3 | **Governed operations graph** | Resolve customers, projects, commitments, configurations, parts, suppliers, inventory, work orders, resources, tests, shipments, and decisions into versioned identities with source lineage. | **MVP** |
| 4 | **End-to-end pegging and blast radius** | Trace commitment → configuration → BOM → supply → work order → resource → test → shipment, and reverse the path for any changed part, event, resource, or gate. | **MVP** |
| 5 | **Finite plant-capacity model** | Represent lines, cells, work centers, skilled labor, tools, fixtures, machining, fabrication, assembly, test, FAT, calendars, maintenance, yield, and changeovers. | **MVP** |
| 6 | **Recovery scenario comparison** | Compare applicable alternatives such as resequencing, overtime, supplier expedite, approved substitution, intra-plant line/cell reassignment, partial delivery, and controlled date change. Expose infeasibility and trade-offs. | **MVP** |
| 7 | **Decision runs and named approvals** | Persist the input snapshot, objectives, constraints, alternatives, selected and rejected options, policy checks, approvers, rationale, timestamps, expiry, and publication boundary. | **MVP** |
| 8 | **Action receipt and outcome tracking** | Separate recommendation, approval, attempted execution, accepted writeback, rejected writeback, retry, and outcome. Every attempt uses an idempotency key and produces a receipt or visible failure. | **MVP** |
| 9 | Demand and project intake | Preserve forecast, opportunity, reservation, firm order, and approved commitment as distinct statuses with source and version. | Pilot |
| 10 | Configuration and BOM digital thread | Link quote/configuration, engineering BOM, manufacturing BOM, routing, controls/software version, test specification, and effectivity. | Pilot |
| 11 | Intra-site line and cell balancing | Recommend workload assignment across qualified resources within the one plant using capability, availability, material, changeover, qualification, cost, and risk. | Pilot |
| 12 | Constraint-based production scheduling | Generate finite, material- and resource-feasible schedules inside frozen, slushy, and open horizons with explained displacement and lateness. | Pilot |
| 13 | Supplier synchronization and long-lead risk | Connect requirements and effectivity to supplier commits, PO schedules, alternates, lead-time variability, inbound quality, and logistics. | Pilot |
| 14 | Inventory, WIP, and eligibility ledger | Separate on-hand, in-transit, WIP, quarantined, expired, reserved, allocated, and eligible quantities by lot, serial, location, and configuration. | Pilot |
| 15 | NPI and ramp readiness | Govern design release, part qualification, tooling, process validation, operator training, test coverage, capacity, packaging, documentation, and service gates. | Pilot |
| 16 | Engineering-change impact | Before effectivity changes, calculate affected demand, POs, inventory, WIP, work orders, tests, cost, and customer dates. | Pilot |
| 17 | Quality, qualification, and test traceability | Link inspection, leak/functional/thermal/flow tests, FAT, deviations, NCRs, holds, and CAPA to lot, serial, work order, and commitment. | Pilot |
| 18 | AI exception copilot | Translate role-scoped natural-language requests into governed queries, explain causal chains, summarize alternatives, and draft communications without becoming the system of record. | Expansion |
| 19 | Customer promise workflow | Publish only approved commitment messages with dependency, confidence, validity window, and supersession tracking. | Expansion |
| 20 | Controlled writeback adapters | Perform least-privilege, policy-gated actions through target-system APIs with validation, dry run, idempotency, receipt, reconciliation, and rollback/escalation path. | Expansion |

---

## **8\. Golden workflows**

### **8.1 CoolIT-like mixed-volume constraint recovery**

**Plant model:** one plant; cold-plate-loop line, manifold line, CDU assembly line; shared skilled labor and leak/functional-test resources.

**Trigger:** a quick-disconnect supplier moves its commit later while a leak-test fixture loses capacity.

**Required behavior:**

1. Detect affected loop, manifold, and CDU commitments.  
2. Distinguish physical inventory from eligible inventory and account for the delayed component.  
3. Identify whether material, labor, line capacity, or test capacity binds each week.  
4. Compare resequencing, overtime, supplier expedite, approved internal resource reassignment, and split-delivery options.  
5. Route the chosen option to Operations, Procurement, Quality, Finance, and Program Management as policy requires.  
6. Record simulated schedule/PO actions and measure whether the commitment recovered.

### **8.2 Boyd-like vertically integrated ramp recovery**

**Plant model:** one campus; fabrication, machining, subassembly, final assembly, leak/flow test, and qualification work centers.

**Trigger:** an engineering change becomes effective during a capacity ramp while one supplier commit slips.

**Required behavior:**

1. Trace the change across parts, open POs, inventory, WIP, work orders, routing steps, tests, and customer commitments.  
2. Represent ramp-stage capacity, yield, training, tooling, and validation gates explicitly.  
3. Compare old-revision completion, controlled rework, effectivity delay, overtime, supplier expedite, and approved substitution where valid.  
4. Prevent obsolete or unvalidated material from being counted as eligible.  
5. Preserve Engineering, Quality, Operations, Procurement, Finance, and Commercial approval responsibilities.  
6. Record the selected effectivity and recovery actions with receipts and outcomes.

### **8.3 Airedale-like ETO project recovery**

**Plant model:** one CDU assembly plant; engineering release, kitting, assembly, controls integration, FAT, documentation, and shipment gates.

**Trigger:** a long-lead component slips while a customer configuration remains unfrozen near the required design-release date.

**Required behavior:**

1. Connect the customer project and configuration to BOM, long-lead supply, design-release, assembly, FAT, shipment, and documentation milestones.  
2. Distinguish requested date, quoted date, approved promise, and current forecast.  
3. Compare configuration freeze, approved substitution, project resequencing, overtime, partial shipment, and controlled date-change options.  
4. Block any option that lacks approved configuration, material, FAT capacity, or required documentation.  
5. Route technical and commercial decisions separately to their authorized owners.  
6. Publish only an approved customer message and track later project events against it.

---

## **9\. Canonical data scope**

### **9.1 Universal record contract**

Every governed record must contain or inherit:

* `tenant_id`;  
* exactly one active `site_id` per tenant;  
* canonical entity ID and source-system key;  
* source system and source record ID;  
* source event time and ingestion time;  
* semantic status and effective date range;  
* unit of measure and currency where applicable;  
* data-quality state, freshness, and transformation version;  
* authorization tags for role, customer, program, product, and sensitivity;  
* supersession link when a record replaces prior evidence.

### **9.2 Required domains**

| Priority | Domain and grain | Minimum fields | Decision enabled |
| ----- | ----- | ----- | ----- |
| **P0** | Tenant and site — one row per company and active plant | Tenant, site, timezone, calendar, currency, planning horizon, layout type | Isolation, calendar semantics, and configuration |
| **P0** | Customer, project, and commitment — one row per customer line and milestone | Customer, project, product/configuration, quantity, requested/quoted/promised date, priority, status | Risk ranking and promise evaluation |
| **P0** | Product and configuration — one row per product/configuration revision | Family, configuration, revision, lifecycle, effectivity, approved site, test specification | Definition and eligibility gate |
| **P0** | BOM and routing — one row per component/effectivity and operation sequence | Parent/child, quantity, UOM, substitute group, scrap/yield, operation, work center, run/setup time | Material explosion and finite capacity |
| **P0** | Resource and calendar — one row per line/cell/resource bucket | Capability, shift calendar, rate, efficiency, changeover, maintenance/downtime, qualification | Bottleneck detection and intra-plant balancing |
| **P0** | Inventory, lot, reservation, and eligibility — one row per material-state-location bucket | Part, quantity, location, lot/serial, expiry, quality state, reservation, allocation, eligibility reason | Truthful material netting |
| **P0** | Supplier, approved source, PO, and commit — one row per PO schedule line | Supplier, part/source approval, ordered/received quantity, requested/confirmed date, lead time, inbound quality | Supplier recovery and long-lead risk |
| **P0** | Work order and WIP — one row per work order and operation state | Product/configuration, quantity, revision, status, operation, resource, planned/actual dates, remaining work | Execution readiness and schedule impact |
| **P0** | Quality, qualification, and test — one row per event/result | Lot/serial/work order, inspection/test type, limits, result, disposition, hold, deviation/NCR, approver | Supply eligibility and shipment gate |
| **P0** | Engineering change and project gate — one row per change, affected object, and milestone | Old/new revision, effectivity, validation state, configuration freeze, design release, tooling/FAT/document readiness | Change impact and ETO readiness |
| **P0** | Shipment and logistics — one row per shipment line and dated event | Commitment, quantity, lane, carrier, planned/actual ship and delivery dates, customs, proof of delivery | Promise-to-delivery closure |
| **P0** | Decision, approval, action, receipt, and outcome — one row per event | Snapshot hash, model version, objectives, constraints, alternatives, selection, approval, idempotency key, receipt, result | Governed closed-loop decision |

### **9.3 Explicitly excluded data**

* Additional manufacturing sites for the same company.  
* Transfer orders, transfer lanes, cross-site qualification, duty, and intercompany pricing.  
* Network inventory pooling or global available-to-promise.  
* Cross-border production or logistics optimization.  
* Detailed equipment telemetry beyond the status/capacity events required by the golden scenarios.  
* Personally sensitive HR data; labor is represented through skills and capacity buckets, not employee performance surveillance.

---

## **10\. Synthetic sample-data plan**

### **10.1 Shared horizon**

* 13 historical weeks plus 13 planning weeks.  
* Daily event timestamps with weekly planning buckets.  
* One baseline snapshot and at least two superseding snapshots per company.  
* Synthetic data only; no claim that volumes reproduce actual company operations.

### **10.2 Company packs**

| Dimension | CoolIT-like pack | Boyd-like pack | Airedale-like pack |
| ----- | ----- | ----- | ----- |
| Active sites | 1 | 1 | 1 |
| Lines/cells/work centers | 3 production lines \+ 3 shared/test resources | 6 integrated work centers | 4 assembly/engineering/test stages |
| Product configurations | 12 | 8 | 10 |
| Parts | 250 | 180 | 220 |
| Suppliers | 10 | 8 | 10 |
| Customer commitment lines | 60 | 40 | 30 |
| Work orders | 40 | 35 | 20 |
| Quality/test events | 100 | 80 | 60 |
| Primary constraint pattern | Product mix \+ component \+ shared leak-test fixture | Ramp \+ engineering change \+ integrated routing | Configuration freeze \+ long-lead component \+ FAT |

### **10.3 Required injected events**

| Pack | Event sequence | Expected proof |
| ----- | ----- | ----- |
| CoolIT-like | Demand-mix increase → supplier slip → leak-test downtime → quality hold → recovery decision | Correct causal chain and feasible intra-plant recovery without inter-site transfer |
| Boyd-like | Ramp-stage capacity change → ECO → supplier slip → WIP conflict → effectivity/recovery decision | Revision-aware material and capacity plan with named approvals |
| Airedale-like | Late configuration freeze → long-lead slip → FAT conflict → promise decision → approved customer message | Project-gate-aware CTP and publication control |

### **10.4 Fixture acceptance gates**

* Exactly three tenants and exactly one active site per tenant.  
* Zero transfer orders or cross-site supply records.  
* 100% referential integrity across commitment, configuration, BOM, supply, work, test, shipment, and decision records.  
* 100% of material facts include source, event time, ingestion time, unit, semantic status, and version.  
* Zero held, expired, failed-test, obsolete, or unqualified quantity counted as eligible.  
* Deterministic replay reproduces the same output from the same snapshot and model version.  
* Every injected event maps to an expected alert, causal chain, feasible or explicitly infeasible alternatives, approval path, action receipt, and observable outcome.  
* Cross-tenant access tests return no data.

---

## **11\. Source systems and connector assumptions**

These labels guide synthetic adapters and discovery. They are not proof that the selected plant runs the named product, version, or deployment.

| Reference account | Evidence-supported enterprise systems | Synthetic adapter labels | Discovery gap |
| ----- | ----- | ----- | ----- |
| CoolIT Systems | NetSuite-centered ERP/commercial workflows are supported by current role evidence; electronic SOPs, PLC-based test stations, dashboards, and ERP traceability are publicly described. | `NETSUITE_ERP`, `NETSUITE_COMMERCIAL`, `SITE_MES_TBD`, `PLM_TBD`, `PLC_TEST_STATION` | Exact plant, MES, PLM, WMS, QMS, connector ownership, and post-acquisition target architecture. |
| Eaton / Boyd Thermal | Legacy/current evidence indicates Oracle Fusion, Salesforce, and RFgen around Boyd; Eaton has an SAP ECC/S/4 landscape. | `ORACLE_FUSION_ERP`, `SALESFORCE_CRM`, `RFGEN_MOBILE_WMS`, `SITE_MES_TBD`, `EATON_SAP_TARGET` | Which systems are authoritative at the selected plant and the timing of Eaton integration. |
| Airedale by Modine | Modine roles support SAP ECC with S/4 initiatives and third-party MES integration; Airedale roles reference engineering tools including Solid Edge and Radan. | `SAP_ECC_ERP`, `SAP_S4_TARGET`, `THIRD_PARTY_MES_TBD`, `CRM_TBD`, `SOLID_EDGE_CAD`, `RADAN_CAM` | Selected plant, CRM, MES vendor, QMS, project system, and source-of-truth ownership. |

MVP adapters may use CSV, JSON, or synthetic APIs behind the same canonical connector contract. A vendor label must never change the semantics of the canonical records.

---

## **12\. Functional acceptance criteria**

### **12.1 Decision queue**

Given an authorized user, tenant, site, and horizon, the queue must show:

* affected commitment and current promise;  
* risk severity and time-to-impact;  
* causal chain and binding constraint;  
* data freshness and unresolved quality issues;  
* decision owner and approval policy;  
* available recovery window and next action.

### **12.2 Commitment record**

For any commitment, the user can inspect:

* source demand status and approved promise;  
* product configuration and applicable revision;  
* material, capacity, engineering, quality, test, project, and shipment gates;  
* forward and reverse pegging;  
* current feasibility, confidence, assumptions, and expiry;  
* prior decisions and superseded evidence.

### **12.3 Scenario workspace**

The workspace must:

* preserve the immutable baseline;  
* present applicable alternatives with explicit objectives and hard/soft constraints;  
* show service, schedule, material, capacity, quality, cost, and risk impact;  
* report infeasibility as an operating result rather than a technical failure;  
* prevent selection of an option that violates a hard gate;  
* reproduce the same result from the same snapshot and model version.

### **12.4 Approval and action**

The system must:

* determine required approvers from action type, amount, risk, product/program, and role policy;  
* record selected and rejected alternatives and rationale;  
* expire stale recommendations when evidence changes;  
* separate approval from execution;  
* validate, dry-run, and idempotently simulate or perform the authorized action;  
* preserve success, rejection, retry, and reconciliation receipts.

### **12.5 Outcome**

The system must compare expected and observed results for commitment date/quantity, schedule feasibility, material state, cost/expedite assumptions, and quality/test completion. A decision cannot be labeled successful merely because a writeback was accepted.

---

## **13\. Architecture and AI boundaries**

flowchart LR  
    A\["ERP / CRM / MES / PLM / QMS / WMS / Project / Test"\] \--\> B\["Read-only connectors and event intake"\]  
    B \--\> C\["Canonical data products and identity crosswalk"\]  
    C \--\> D\["Single-site governed operations graph"\]  
    D \--\> E\["Eligibility, CTP, pegging, capacity, and scenario services"\]  
    E \--\> F\["Decision queue and scenario workspace"\]  
    F \--\> G\["Named human approval"\]  
    G \--\> H\["Controlled writeback gateway"\]  
    H \--\> I\["Receipt, reconciliation, and outcome monitoring"\]

### **13.1 Deterministic services**

The following cannot be delegated to a language model:

* identity resolution acceptance and source authority;  
* units, calendars, effectivity, inventory eligibility, and netting;  
* BOM explosion, pegging, finite-capacity calculation, and hard-gate evaluation;  
* objective calculation and scenario feasibility;  
* authorization, approval policy, writeback validation, idempotency, and receipts.

### **13.2 Permitted AI functions**

AI may:

* interpret a role-scoped user request;  
* map language to governed queries and tools;  
* summarize evidence and causal chains;  
* explain why a constraint binds;  
* compare solver-produced alternatives;  
* draft an approval brief or customer communication;  
* identify missing, stale, or conflicting evidence.

AI output is never itself an authoritative source record, approval, execution receipt, or customer commitment.

---

## **14\. Security, governance, and audit**

* Tenant isolation enforced in storage, retrieval, computation, logs, and tests.  
* Row-, field-, customer-, program-, product-, role-, and sensitivity-level authorization enforced server-side.  
* Encryption in transit and at rest; secrets managed outside prompts and application logs.  
* Prompt-injection defenses for retrieved documents and tool outputs.  
* No cross-tenant model training by default.  
* Full audit history for evidence access, decision runs, approvals, actions, receipts, and outcome changes.  
* Configurable retention, legal hold, export, and deletion policies.  
* Material calculations include snapshot ID, model version, code/config version, and trace ID.  
* Stale, conflicting, or unmapped records are quarantined rather than silently coerced.  
* The user interface must visibly distinguish source fact, derived calculation, model explanation, recommendation, approval, action, and outcome.

---

## **15\. User experience**

### **15.1 Primary navigation**

1. **Decision Queue** — prioritized plant exceptions requiring action.  
2. **Commitments** — customer promise health and evidence chain.  
3. **Plant Plan** — material, work, capacity, test, and project readiness.  
4. **Scenarios** — baseline and recovery alternatives.  
5. **Approvals** — pending, completed, expired, and superseded decisions.  
6. **Outcomes** — receipts, reconciliation, and realized results.  
7. **Data Health** — freshness, mappings, quarantines, and connector state.

### **15.2 Required interaction pattern**

Every decision screen follows:

**Risk → evidence → binding constraint → alternatives → trade-offs → approval → action → receipt → outcome.**

The interface must preserve the selected company, one site, horizon, product/project, baseline/scenario, role, and as-of time. There is no site switcher in v0.2 because each tenant has only one active site.

---

## **16\. Delivery plan**

### **Hackathon build**

1. Implement the canonical contract and three validated synthetic packs.  
2. Build the commitment queue and one commitment evidence view.  
3. Implement deterministic eligibility, pegging, simple finite-capacity, and scenario services for the injected events.  
4. Implement named approval and simulated writeback receipts.  
5. Demonstrate all three golden workflows through the same interface.

### **Pilot progression**

1. **Offline diagnostic:** profile one selected plant’s historical data and replay 10–20 commitment decisions.  
2. **Read-only shadow mode:** refresh risks and recommendations without system writeback.  
3. **Human-approved limited actions:** enable one narrow target action with dry run, idempotency, and reconciliation.  
4. **Proof-gated expansion:** add data domains or capabilities only after measured data quality, adoption, decision value, and control performance.

No phase begins with an autonomous-writeback promise.

---

## **17\. Discovery questions**

### **Shared**

* Which plant is in scope, and what is the authoritative `site_id`?  
* What constitutes a customer commitment versus forecast, opportunity, reservation, or requested date?  
* Which ERP, CRM, MES, PLM, QMS, WMS, project, and test systems are authoritative at that plant?  
* What are the frozen, slushy, and open planning horizons?  
* Which materials, resources, skills, tools, fixtures, and tests are binding most often?  
* How are inventory, WIP, lots, serials, quality holds, deviations, and test results represented?  
* Who may approve schedule, purchase, substitution, engineering, quality, and customer-date changes?  
* What action is safe enough for the first controlled writeback?

### **CoolIT-like**

* Which one plant and which product families are in the proof?  
* Which labor, component, line, fixture, and test resources are shared across loops, manifolds, and CDUs?  
* How are high-volume traceability and 100% test evidence linked to customer commitments?

### **Boyd-like**

* Which fabrication and assembly steps occur inside the selected campus?  
* How are ramp capacity, training, yield, tooling, and validation represented?  
* Which Oracle, Salesforce, RFgen, Eaton SAP, MES, PLM, and QMS records are authoritative locally?

### **Airedale-like**

* Which one assembly plant and CDU family are in scope?  
* Where are configuration freeze, engineering release, long-lead procurement, FAT, shipment, and documentation milestones maintained?  
* Which SAP, MES, CRM, CAD/CAM, project, and test systems own each gate?

---

## **18\. Launch decision**

The hackathon release is ready only if:

* all three synthetic company packs contain exactly one active site;  
* the same product workflow completes all three golden scenarios;  
* each risk traces to the correct customer commitment and causal evidence;  
* all recommended options satisfy modeled hard constraints or are explicitly labeled infeasible;  
* held, obsolete, failed-test, expired, or unqualified supply is never treated as eligible;  
* identical snapshots reproduce identical outputs;  
* every selected action has required named approval and a receipt or visible failure;  
* cross-tenant authorization tests pass;  
* the demo and documentation make the synthetic, discovery-stage, read-only/simulated-writeback boundary explicit.

If any condition fails, present FORGE as a prototype with known gaps—not as a validated operations platform.

---

## **19\. Public research sources**

* [CoolIT 25-year growth and production profile](https://www.coolitsystems.com/resources/news/coolit-25-years-liquid-cooling/)  
* [CoolIT manufacturing and quality profile](https://www.coolitsystems.com/manufacturing/)  
* [CoolIT Revenue Systems & BI role](https://ca.linkedin.com/jobs/view/revenue-systems-bi-specialist-at-coolit-systems-4390296505)  
* [Ecolab completion of CoolIT acquisition](https://www.ecolab.com/en-us/media-center/news/ecolab-closes-coolit-acquisition-and-expands-ai-cooling-platform)  
* [Boyd Juárez capacity expansion](https://www.boydcorp.com/about-boyd/resources/news-and-events/boyd-more-than-doubles-liquid-cooling-manufacturing-capacity-in-mexico.html)  
* [Eaton completion of Boyd Thermal acquisition](https://www.eaton.com/au/en-gb/company/news-insights/news-releases/2026/eaton-completes-acquisition-of-leading-liquid-cooling-solutions-provider-boyd-thermal.html)  
* [RFgen discussion of Boyd’s Oracle migration](https://www.rfgen.com/blog/migrating-from-legacy-erp-to-cloud-based-erp-and-its-impact-on-data-collection-software/)  
* [Airedale CDU range and standardization](https://investors.modine.com/news/news-details/2025/Airedale-by-Modine-Unveils-Expanded-Capacities-for-Coolant-Distribution-Unit/default.aspx)  
* [Airedale skid-based CDU and configuration options](https://www.airedale.com/2025/10/30/airedale-by-modine-unveils-skid-based-cdu-for-scalable-data-center-efficiency/)  
* [Modine SAP MM/PP and MES role](https://careers.modine.com/job/Business-Analyst%2C-MMPP-%26-MES/7095-en_US/)

---

# **Source file**

Download the v0.2 source PRD

Download the v0.2 source PRD

