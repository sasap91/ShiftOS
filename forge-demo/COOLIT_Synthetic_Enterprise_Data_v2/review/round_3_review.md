# Review round 3: Realism, privacy, and semantic controls

Result: **PASS**

| Check | Status | Actual | Expected | Evidence |
| --- | --- | ---: | ---: | --- |
| No unnecessary personal contact columns | PASS | 0 | 0 | Schema scan across all datasets |
| No email or phone-like values | PASS | 0 | 0 | Value scan across all datasets |
| No future timestamp is represented as an actual execution fact | PASS | 0 | 0 | Temporal scan against as_of_at |
| All populated date and timestamp fields are parseable | PASS | 0 | 0 | Temporal format scan across all datasets |
| All records stay within one manufacturing site | PASS | SITE-COOLIT-SYN-01 | SITE-COOLIT-SYN-01 | Universal record envelope |
| No transfer or cross-site dataset exists | PASS | 0 | 0 | Dataset catalog |
| Golden disruption includes five ordered causal events | PASS | 5 | 5 | governed/injected_event_expected_outcome.csv |
| Every decision run contains feasible and infeasible alternatives | PASS | all | all | governed/decision_run.csv |
| Every simulated writeback receipt has approval and idempotency key | PASS | 0 | 0 | governed/action_receipt.csv |
| No stock, order, allocation, or output quantity is negative | PASS | 0 | 0 | Quantity plausibility scan |
| Decision runs preserve deterministic fingerprints | PASS | unique | unique | governed/decision_run.csv |
| Every injected defect is detected, quarantined, and excluded from decisions | PASS | 0 | 0 | data/negative_test_record.csv |
| Source systems remain explicit discovery placeholders | PASS | 0 | 0 | reference/system_inventory.csv |
| Every critical pipeline SLO has operational observations | PASS | 0 | 0 | data/pipeline_slo.csv -> data/data_quality_observation.csv |
| All schema contract tests pass | PASS | 0 | 0 | data/schema_contract_test.csv |
| CDC and replay suite covers eight change patterns | PASS | 8 | 8 | data/ingestion_event.csv |
| Authorization suite has zero row or field leakage | PASS | 0 | 0 | governed/authorization_test.csv |
| All shadow runs remain read-only | PASS | 0 | 0 | governed/shadow_run.csv |
| Twenty historical replays each carry the full metric set | PASS | 20 replays; 0 metric gaps | 20 replays; 0 metric gaps | governed/decision_replay.csv -> governed/replay_metric.csv |
| Replay and shadow records preserve deterministic evidence cutoffs | PASS | all | all | governed/decision_replay.csv and governed/shadow_run.csv |
| Policy decisions include both allowed and denied outcomes | PASS | 88 allow; 12 deny | both present | governed/policy_decision.csv |
| No actual operation evidence exists for planned-only MES operations | PASS | all actual evidence linked to executed operations | all | MES execution evidence tables |
| Top-tier evidence remains synthetic and discovery-bounded | PASS | synthetic contracts; production discovery pending | same | reference/system_inventory.csv and reference/data_contract.csv |
