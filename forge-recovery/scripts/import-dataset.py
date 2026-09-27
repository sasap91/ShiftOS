"""Normalize the pinned ShiftOS fixture. Run after replacing data/shiftos source CSVs."""
import csv, json, pathlib, hashlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data/shiftos'
REVISION = 'ef1ef68ff7d4d318067d8ec0be23d5e4f7826609'
BASE = f'https://github.com/sasap91/ShiftOS/blob/{REVISION}/COOLIT_Synthetic_Enterprise_Data_v2/'

def rows(name):
    return list(csv.DictReader((SOURCE / name).open(newline='')))

def current(row):
    return row['is_deleted'] == 'false' and row['data_quality_state'] == 'VALID' and row['crosswalk_status'] == 'RESOLVED' and not row['effective_to']

def index(name, key):
    result = {}
    for row in rows(name):
        if not current(row):
            continue
        if row[key] in result:
            raise ValueError(f'Duplicate active record in {name}: {row[key]}')
        result[row[key]] = row
    return result

commitments = index('governed/canonical_commitment.csv', 'commitment_id')
schedules = index('erp/sales_order_schedule.csv', 'erp_schedule_line_id')
accounts = index('crm/account.csv', 'account_id')
configs = index('erp/product_configuration.csv', 'configuration_id')
programs = index('crm/program_project.csv', 'program_id')
work = index('erp/work_order.csv', 'work_order_id')
links = [r for r in rows('mes/work_order_commitment.csv') if current(r)]
operations = [r for r in rows('mes/work_order_operation.csv') if current(r)]
events = [r for r in rows('governed/injected_event_expected_outcome.csv') if current(r)]
normalized = []
for id, c in commitments.items():
    s = schedules[c['erp_schedule_line_id']]
    assert s['commitment_id'] == id and s['configuration_id'] == c['configuration_id']
    a, cfg = accounts[c['account_id']], configs[c['configuration_id']]
    wo = []
    for link in links:
        if link['commitment_id'] != id:
            continue
        w = work[link['work_order_id']]
        wo.append({'id': w['work_order_id'], 'status': w['work_order_status'], 'configuration': w['configuration_id'], 'configurationMatches': w['configuration_id'] == c['configuration_id'], 'allocatedQuantity': float(link['allocated_quantity']), 'plannedStart': w['planned_start_at'], 'plannedEnd': w['planned_end_at'], 'operations': [{'id': op['mes_operation_id'], 'operation': op['operation_code'], 'resource': op['resource_id'], 'status': op['operation_status'], 'start': op['planned_start_at'], 'end': op['planned_end_at']} for op in operations if op['work_order_id'] == w['work_order_id']]})
    normalized.append({'id': id, 'salesOrder': s['sales_order_number'], 'line': s['sales_order_line'], 'scheduleId': s['erp_schedule_line_id'], 'customer': a['account_name'].replace(' (Synthetic)', ''), 'customerId': c['customer_id'], 'serviceTier': a['service_tier'], 'program': c['program_id'], 'configuration': c['configuration_id'], 'configurationRevision': c['configuration_revision_id'], 'productFamily': cfg['product_family'], 'quantity': float(s['ordered_quantity']), 'shippedQuantity': float(s['shipped_quantity']), 'openQuantity': float(s['open_quantity']), 'valueUsd': float(s['order_value_usd']), 'promiseDate': c['approved_commit_date'], 'requestedDate': c['requested_date'], 'scheduleDate': c['erp_schedule_date'], 'actualShipDate': c['actual_ship_date'] or None, 'actualDeliveryDate': c['actual_delivery_date'] or None, 'status': c['commitment_status'], 'risk': c['risk_state'], 'riskReason': c['risk_reason'], 'priority': c['priority_class'], 'workOrders': wo, 'events': [e['injected_event_id'] for e in events if id in e['affected_commitment_ids'].split('|')], 'sourceRefs': [{'id': id, 'file': 'governed/canonical_commitment.csv'}, {'id': s['erp_schedule_line_id'], 'file': 'erp/sales_order_schedule.csv'}, {'id': a['account_id'], 'file': 'crm/account.csv'}]})

summary = {'commitmentLines': len(normalized), 'salesOrders': len({o['salesOrder'] for o in normalized}), 'openLines': sum(o['openQuantity'] > 0 for o in normalized), 'atRiskLines': sum(o['risk'] == 'AT_RISK' and o['openQuantity'] > 0 for o in normalized), 'orderValueUsd': sum(o['valueUsd'] for o in normalized), 'openOrderLineValueUsd': sum(o['valueUsd'] for o in normalized if o['openQuantity'] > 0), 'atRiskOrderLineValueUsd': sum(o['valueUsd'] for o in normalized if o['risk'] == 'AT_RISK' and o['openQuantity'] > 0)}
def compact(row):
    return {k:v for k,v in row.items() if k not in list(row)[:26]}
decision = next(r for r in rows('governed/decision_run.csv') if r['decision_run_id']=='DR-0005')
capacity = next(r for r in rows('mes/resource_calendar.csv') if r['resource_calendar_id']=='RCAL-TEST-LEAK-01-2026-P01')
held = next(r for r in rows('erp/inventory_state.csv') if r['part_id']=='P-QD-003')
dataset = {'meta': {'name': 'COOLIT Synthetic Enterprise Data v2', 'revision': REVISION, 'sourceUrl': BASE.replace('/blob/', '/tree/'), 'sourceBase': BASE, 'asOf': '2026-09-25T23:59:59-06:00', 'snapshotId': 'SNP-COOLIT-20260925-BL', 'synthetic': True, 'note': 'Synthetic fixture, not actual CoolIT production data. Recovery is a decision replay of the imported disruption scenario.'}, 'summary': summary, 'orders': normalized, 'resources': [{k:r[k] for k in ['resource_id','resource_name','resource_type','resource_status','qualification_state']} for r in rows('mes/resource.csv')], 'events': [{k:r[k] for k in ['injected_event_id','event_type','affected_commitment_ids','expected_binding_constraint','expected_outcome','injection_time']} for r in events], 'recovery': {'decisionId':decision['decision_run_id'],'affectedIds':decision['affected_commitment_ids'].split('|'),'alternatives':json.loads(decision['alternatives_json']),'capacity':compact(capacity),'heldInventory':compact(held),'qualifications':[compact(r) for r in rows('mes/resource_qualification.csv') if r['resource_id']=='TEST-LEAK-01'],'sourceFile':'governed/decision_run.csv'}}
(ROOT / 'public/dataset.mjs').write_text('// Generated by scripts/import-dataset.py; do not edit source values.\nexport const dataset = '+json.dumps(dataset,separators=(',',':'))+';\n')
(SOURCE / 'provenance.json').write_text(json.dumps({'repository':'https://github.com/sasap91/ShiftOS','revision':REVISION,'directory':'COOLIT_Synthetic_Enterprise_Data_v2','files':{str(p.relative_to(SOURCE)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(SOURCE.rglob('*')) if p.is_file() and p.name != 'provenance.json'}},indent=2)+'\n')
print(json.dumps(summary, indent=2))
