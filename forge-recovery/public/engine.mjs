import {dataset} from './dataset.mjs';
export const orders=dataset.orders.filter(o=>dataset.recovery.affectedIds.includes(o.id)).map(o=>({...o,value:o.valueUsd,config:o.configuration,shortCustomer:o.customer.split(' ').slice(0,2).join(' ')}));
export const money=n=>n>=1e6?'$'+(n/1e6).toFixed(2).replace(/0$/,'')+'M':n>=1000?'$'+(n/1000).toLocaleString('en-US',{maximumFractionDigits:2})+'K':'$'+n;
export const cad=n=>'CA'+money(n);
export const time=s=>new Date(s+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
const titles={A:'Resequence + overtime',B:'Expedite + substitution',C:'Use held inventory'};
export function context(){const r=dataset.recovery;return {
 synthetic:true,revision:dataset.meta.revision,asOf:dataset.meta.asOf,mode:'Dataset decision replay',affectedOrders:orders.length,exposedValue:orders.reduce((n,o)=>n+o.value,0),valueCurrency:'USD',costCurrency:'CAD',orders,
 incident:{resource:'TEST-LEAK-01',event:'Shared leak-test capacity loss',sourceId:'EVT-0003'},capacity:r.capacity,heldInventory:r.heldInventory,alternatives:r.alternatives,
 limitations:['Source alternatives provide aggregate service impact; no per-order shipment forecast is certified.','Linked work-order configurations require reconciliation before dispatch.','Source outcomes and approvals are historical synthetic records, not actions performed in this session.'],
 evidence:[
 {id:'EVT-0003',system:'MES',title:'Shared test capacity loss',text:dataset.events.find(e=>e.injected_event_id==='EVT-0003').expected_outcome+' Affected commitments: COM-0051 through COM-0056.',file:'governed/injected_event_expected_outcome.csv'},
 {id:r.capacity.resource_calendar_id,system:'MES',title:'First planning-week capacity',text:`${r.capacity.available_minutes} available minutes; ${r.capacity.maintenance_minutes} minutes of maintenance / loss. Source calendar includes ${r.capacity.overtime_minutes} overtime minutes. Period: ${r.capacity.calendar_week_id}.`,file:'mes/resource_calendar.csv'},
 {id:'INV-0015',system:'ERP / QMS',title:'On hand is not eligible',text:`Part P-QD-003, lot ${r.heldInventory.lot_serial_id}: ${r.heldInventory.on_hand_qty} on hand, ${r.heldInventory.eligible_qty} eligible. Quality state: ${r.heldInventory.quality_state}. No release may be assumed.`,file:'erp/inventory_state.csv'},
 {id:'EVT-0002',system:'ERP',title:'Quick-disconnect supply slip',text:dataset.events.find(e=>e.injected_event_id==='EVT-0002').expected_outcome+' Affects COM-0051, COM-0054 and COM-0055.',file:'governed/injected_event_expected_outcome.csv'},
 {id:r.decisionId,system:'GOVERNED',title:'Recovery alternatives and economics',text:'ALT-A: resequence and leak-test overtime, CA$18,400, 0-day aggregate service impact. ALT-B: approved-source expedite and qualified substitution, CA$26,750, 1-day impact. ALT-C: use held inventory, blocked by Quality release. These are source scenario assessments, not a new dispatch schedule.',file:r.sourceFile},
 {id:'COM-0051–0056',system:'ERP / CRM',title:'Six customer commitments',text:`Six open commitment lines total USD ${orders.reduce((n,o)=>n+o.value,0).toLocaleString('en-US')}. Approved promise dates range from December 23, 2026 to January 8, 2027. Source work-order links contain configuration conflicts; reconcile them before execution.`,file:'governed/canonical_commitment.csv'}
 ]};}
export function validatePlan(plan){
 const source=dataset.recovery.alternatives.find(a=>a.id==='ALT-'+plan?.id),errors=[];
 if(!source)return {feasible:false,errors:['Unknown source alternative.'],checks:[],cost:0,scopeValue:0,serviceImpactDays:null};
 if(!Array.isArray(plan.priority)||plan.priority.length!==orders.length||new Set(plan.priority).size!==orders.length||plan.priority.some(id=>!orders.some(o=>o.id===id)))errors.push('The recovery must include each affected commitment exactly once.');
 if(!Array.isArray(plan.actions)||plan.actions.length!==source.actions.length||new Set(plan.actions).size!==source.actions.length||plan.actions.some(a=>!source.actions.includes(a)))errors.push('Actions differ from the governed source alternative.');
 if(!source.feasible||source.actions.includes('USE_HELD_LOT'))errors.push('P-QD-003 is on quality hold: 111 on hand, zero eligible. Quality release is required.');
 const qualified=orders.every(o=>dataset.recovery.qualifications.some(q=>q.configuration_revision_id===o.configurationRevision&&q.qualification_status==='QUALIFIED'&&q.valid_from_date<=o.promiseDate&&q.valid_to_date>=o.promiseDate));
 if(!qualified)errors.push('Leak-test qualification evidence is missing or expired.');
 const checks=[{label:'Affected commitment coverage',pass:!errors.some(e=>e.includes('commitment'))},{label:'Governed strategy & cost',pass:!errors.some(e=>e.includes('Actions'))},{label:'Material eligibility gate',pass:!source.actions.includes('USE_HELD_LOT')},{label:'Leak-test qualification',pass:qualified}];
 return {feasible:errors.length===0,errors,checks,cost:source.incrementalCostCad,costCurrency:'CAD',scopeValue:orders.reduce((n,o)=>n+o.value,0),valueCurrency:'USD',serviceImpactDays:source.serviceImpactDays,dispatchReady:false,prerequisites:['Reconcile commitment-to-work-order configuration links.','Confirm Quality release or an eligible qualified substitute.','Confirm staffing and finite schedule before dispatch.'],basis:'Governed source alternative; aggregate service impact, not a per-order shipping forecast.'};
}
export function compilePlan(p){const source=dataset.recovery.alternatives.find(a=>a.id==='ALT-'+p.id);if(!source)throw new Error('Unknown alternative');return {...p,title:titles[p.id],actions:[...source.actions],priority:p.priority||orders.map(o=>o.id),sourceId:dataset.recovery.decisionId};}
export function rehearsalPlans(){return dataset.recovery.alternatives.map(a=>{const id=a.id.slice(-1);const p=compilePlan({id,priority:orders.map(o=>o.id),explanation:id==='A'?'Recover shared test capacity through resequencing and overtime. The source assessment reports no added service delay, subject to material and dispatch reconciliation.':id==='B'?'Expedite approved supply and use a qualified substitute. The source assessment has a higher cost and one day of aggregate service impact.':'Using the held quick-disconnect lot would bypass its quality gate. Physical stock does not make the 111 units eligible.'});return {...p,validation:validatePlan(p)};});}
export function validateAnalysis(raw){
 if(!raw||typeof raw.summary!=='string'||raw.summary.length>1800||!Array.isArray(raw.plans)||raw.plans.length!==3)throw new Error('Incomplete recovery analysis');
 const ids=new Set();const plans=raw.plans.map(p=>{if(!p||!['A','B','C'].includes(p.id)||ids.has(p.id)||typeof p.explanation!=='string'||p.explanation.length>1200)throw new Error('Invalid recovery alternative');ids.add(p.id);const compiled=compilePlan(p);compiled.validation=validatePlan(compiled);if(compiled.validation.errors.some(e=>e.includes('commitment')))throw new Error('Invalid priority');return compiled;});
 const recommended=[...plans].filter(p=>p.validation.feasible).sort((a,b)=>a.validation.serviceImpactDays-b.validation.serviceImpactDays||a.validation.cost-b.validation.cost)[0]?.id;
 if(!recommended)throw new Error('No feasible strategy');return {summary:raw.summary,plans,recommended};
}
