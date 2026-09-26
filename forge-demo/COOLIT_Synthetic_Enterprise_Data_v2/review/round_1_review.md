# Review round 1: Schema and completeness

Result: **PASS**

| Check | Status | Actual | Expected | Evidence |
| --- | --- | ---: | ---: | --- |
| Exactly one active manufacturing site | PASS | 1 | 1 | reference/site.csv |
| Twelve sellable configurations | PASS | 12 | 12 | erp/product_configuration.csv |
| Two hundred fifty item-master rows | PASS | 250 | 250 | erp/item_master.csv |
| Ten suppliers | PASS | 10 | 10 | erp/supplier.csv |
| Sixty canonical commitments | PASS | 60 | 60 | governed/canonical_commitment.csv |
| Forty work-order headers | PASS | 40 | 40 | erp/work_order.csv |
| One hundred actual test headers | PASS | 100 | 100 | mes/test_execution.csv |
| One hundred four historical weeks | PASS | 104 | 104 | reference/calendar.csv |
| Twenty-six planning weeks | PASS | 26 | 26 | reference/calendar.csv |
| All specified raw datasets generated | PASS | 159 | 159 | manifest.yaml and file_manifest.csv |
| Source record IDs unique within every table | PASS | 0 | 0 | All CSV primary envelopes |
| Every declared v2 dataset is populated | PASS | 159 populated; 0 empty | 159 populated; 0 empty | schema/table_catalog.csv |
| Every business row has the governed envelope | PASS | 0 | 0 | Universal envelope scan |
| Data contracts cover every dataset | PASS | 159 | 159 | reference/data_contract.csv |
| Source-field mapping covers all material object-field pairs | PASS | 120 | 120 | reference/source_field_mapping.csv |
| Field lineage covers every source-field mapping | PASS | 120 | 120 | data/field_lineage.csv |
| All seven adverse data-quality classes are represented | PASS | 7 | 7 | data/negative_test_record.csv |
| Schema contract suite covers every table and three test classes | PASS | 477 | 477 | data/schema_contract_test.csv |
| Twenty-four supplier scorecard periods are present | PASS | 24 | 24 | erp/supplier_scorecard.csv |
| Forecast history covers every opportunity for 104 weeks | PASS | 1560 | 1560 | crm/forecast_snapshot.csv |
| Shift history covers three shifts for all historical and planning weeks | PASS | 390 | 390 | reference/shift_calendar.csv |
| All required enterprise domains have substantive v2 tables | PASS | [object Object] | REFERENCE/ERP/CRM/MES/GOVERNED >=10; DATA >=6 | schema/table_catalog.csv |
