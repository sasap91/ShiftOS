# Review round 2: Cross-system integrity and reconciliation

Result: **PASS**

| Check | Status | Actual | Expected | Evidence |
| --- | --- | ---: | ---: | --- |
| Commitment crosswalk resolves CRM, canonical, and ERP keys | PASS | 0 | 0 | crm/commitment_crosswalk.csv |
| Work orders resolve valid configuration revisions | PASS | 0 | 0 | erp/work_order.csv -> erp/product_configuration.csv |
| MES operations resolve work order, routing, and resource | PASS | 0 | 0 | mes/work_order_operation.csv |
| Work-order components resolve work orders and parts | PASS | 0 | 0 | erp/work_order_component.csv |
| Test executions resolve work order, specification, and station | PASS | 0 | 0 | mes/test_execution.csv |
| Traceability-controlled consumption has genealogy evidence | PASS | 0 | 0 | mes/material_consumption.csv -> mes/genealogy_edge.csv |
| Opening inventory plus movements equals closing inventory | PASS | 0 | 0 | erp/inventory_state.csv <-> erp/inventory_transaction.csv |
| Held, expired, or unqualified stock has zero eligible quantity | PASS | 0 | 0 | erp/inventory_state.csv |
| Shipment lines resolve canonical commitments | PASS | 0 | 0 | erp/shipment_line.csv |
| Work-order operation anchor is approximately two hundred | PASS | 200 | 200 | mes/work_order_operation.csv |
| Test characteristics resolve actual execution headers | PASS | 0 | 0 | mes/test_characteristic.csv |
| Gross-to-net requirements reconcile exactly | PASS | 0 | 0 | erp/gross_requirement.csv -> erp/net_requirement.csv |
| Pegged supply quantity equals every commitment quantity | PASS | 0 | 0 | erp/pegging_snapshot.csv -> governed/canonical_commitment.csv |
| Goods receipts reconcile accepted, held, rejected, and reversed quantities | PASS | 0 | 0 | erp/goods_receipt.csv |
| Receipt inspections reconcile to received quantity | PASS | 0 | 0 | erp/receipt_inspection.csv -> erp/goods_receipt.csv |
| Supplier invoices resolve PO and receipt evidence | PASS | 0 | 0 | erp/invoice_match.csv |
| Location balances reconcile book, physical, hold, and eligible quantity | PASS | 0 | 0 | erp/inventory_location_balance.csv |
| Cycle-count variance equals count minus book | PASS | 0 | 0 | erp/cycle_count.csv |
| Work-order actual cost reconciles cost-element transactions | PASS | 0 | 0 | erp/work_order_actual_cost.csv -> erp/cost_transaction.csv |
| Customer invoices resolve delivery and commitment lines | PASS | 0 | 0 | erp/customer_invoice.csv -> erp/delivery_line.csv |
| Exactly one approved promotion exists per canonical commitment | PASS | 60 | 60 | crm/commitment_promotion_event.csv |
| Rejected and exception promotion events do not create commitments | PASS | 0 | 0 | crm/commitment_promotion_event.csv |
| Every configuration has full CPQ rule and pricing coverage | PASS | 0 | 0 | crm/configuration_rule.csv and crm/price_book_entry.csv |
| Every commitment resolves contract, configuration obligation, and SLA evidence | PASS | 0 | 0 | crm/contract.csv -> crm/contract_line.csv -> crm/service_level_agreement.csv |
| Every process parameter resolves executed operation and equipment | PASS | 0 | 0 | mes/process_parameter_event.csv |
| Every out-of-limit process parameter has a deviation reference | PASS | 0 | 0 | mes/process_parameter_event.csv |
| Every labor event has a valid operator qualification | PASS | 0 | 0 | mes/labor_event.csv -> mes/operator_qualification.csv |
| Every calibration-controlled asset has passing release evidence | PASS | 0 | 0 | mes/calibration_event.csv -> mes/equipment_asset.csv |
| Every NCR closes with conserved affected quantity | PASS | 0 | 0 | mes/nonconformance_case.csv |
| Every executed operation has effective instruction acknowledgement and data capture | PASS | 0 | 0 | mes/instruction_acknowledgement.csv |
| Every SPC signal has a complete four-step reaction | PASS | 0 | 0 | mes/spc_signal.csv -> mes/reaction_task.csv |
| OEE components reconcile to time and count inputs | PASS | 0 | 0 | mes/oee_daily.csv |
| Every installed asset has a complete six-stage genealogy chain | PASS | 0 | 0 | mes/end_to_end_genealogy.csv |
| Every MES operation has four dispatch-history versions | PASS | 0 | 0 | mes/dispatch_history.csv |
