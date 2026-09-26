import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {calculateRecovery,FIXTURE,createRecoveryService} from '../src/recovery.mjs';

test('golden outage exposes $1.4M and produces distinct costed recovery choices',()=>{
 const a=calculateRecovery(8);assert.equal(a.affectedOrders,14);assert.equal(a.urgentOrders,3);assert.equal(a.baseline.shipmentValueAtRisk,1400000);assert.equal(a.baseline.lateOrders.length,3);assert.equal(a.stations.find(s=>s.id==='T-01').availableNext24Hours,6);
 const [A,B,C]=a.plans;assert.equal(A.protectedShipmentValue,900000);assert.deepEqual(A.lateOrders,['REC-1002','REC-1003']);assert.equal(B.protectedShipmentValue,1400000);assert.equal(B.costs.overtime,7800);assert.equal(B.overtimeHours,6);assert.equal(B.totalEstimatedCost,11800);assert.equal(C.costs.reassignment,8900);assert.equal(C.shipmentValueAtRisk,0);assert.equal(a.recommendedPlan,'B');
});
test('all outage durations preserve order conservation, no overlap, and station gates',()=>{
 for(let h=0;h<=24;h+=.5){const a=calculateRecovery(h);for(const plan of [a.baseline,...a.plans]){
  assert.equal(plan.schedule.length,14);assert.equal(new Set(plan.schedule.map(j=>j.id)).size,14);
  for(const j of plan.schedule){if(j.start===null)continue;const station=FIXTURE.stations.find(s=>s.id===j.station);assert.equal(station.calibration,'VALID');assert.ok(station.qualifiedFamilies.includes(j.family));assert.equal(j.end-j.start,j.testHours);assert.equal(j.shipHour,j.end+2);assert.ok(j.start>=j.readyHour);if(j.station==='T-02')assert.ok(j.start>=h);if(j.station==='T-03')assert.notEqual(j.family,'CDU');
   const windows=station.regularWindows.map(w=>[...w]);if(plan.id==='B'&&j.station==='T-01')windows[0][1]=12;assert.ok(windows.some(([s,e])=>j.start>=s&&j.end<=e),`${h} ${plan.id} ${j.id} outside shift`);
  }
  for(const station of FIXTURE.stations){const jobs=plan.schedule.filter(j=>j.station===station.id&&j.start!==null).sort((a,b)=>a.start-b.start);for(let i=1;i<jobs.length;i++)assert.ok(jobs[i].start>=jobs[i-1].end);}
 }}
});
test('no outage gives no missed commitments; input changes recalculate rather than reuse fixture claims',()=>{
 const healthy=calculateRecovery(0),short=calculateRecovery(2),long=calculateRecovery(24);assert.equal(healthy.baseline.shipmentValueAtRisk,0);assert.equal(healthy.affectedOrders,0);assert.notEqual(short.fingerprint,long.fingerprint);assert.notEqual(short.baseline.totalEstimatedCost,long.baseline.totalEstimatedCost);assert.deepEqual(calculateRecovery(8),calculateRecovery(8));
 for(const value of [-1,25,NaN,Infinity,'8',8.1,null])assert.throws(()=>calculateRecovery(value));
});
test('shipment exposure is excluded from total cost; WIP and overtime reconcile',()=>{
 const a=calculateRecovery(8);for(const p of [a.baseline,...a.plans])assert.equal(p.totalEstimatedCost,Math.round(Object.values(p.costs).reduce((n,v)=>n+v,0)*100)/100);assert.equal(a.plans[1].costs.potentialPenalties,0);assert.equal(a.plans[1].costs.premiumFreight,0);assert.equal(a.plans[1].costs.idleLabor,3120);assert.equal(a.plans[1].costs.idleEquipment,880);
});
test('quality-held jobs and unqualified resources cannot form a selectable plan',()=>{
 const fixture=structuredClone(FIXTURE);fixture.orders[0].quality='HOLD';const a=calculateRecovery(8,fixture);assert.ok(a.plans.every(p=>!p.feasible));assert.equal(a.recommendedPlan,null);assert.ok(a.plans.every(p=>p.schedule.find(j=>j.id==='REC-1001').station===null));
});
test('named approval, acceptance, dependencies, idempotency, and supersession are enforced',()=>{
 const db=new DatabaseSync(':memory:');const service=createRecoveryService(db);const run=service.create(8);
 assert.throws(()=>service.approve(run.id,'Manager','Protect urgent shipments'));
 assert.throws(()=>service.acknowledge(run.id,'Supervisor'));
 assert.throws(()=>service.route(run.id,'Z'));
 service.route(run.id,'B');const approved=service.approve(run.id,'Morgan Lee','Protect all urgent shipments within overtime allowance');const same=service.approve(run.id,'Morgan Lee','Repeat');assert.equal(same.audit.length,approved.audit.length);assert.equal(approved.tasks.length,30);
 assert.throws(()=>service.completeTask(run.id,'verify'));service.acknowledge(run.id,'Sam Patel');assert.throws(()=>service.completeTask(run.id,'test-REC-1001'));const verified=service.completeTask(run.id,'verify');assert.equal(service.completeTask(run.id,'verify').audit.length,verified.audit.length);assert.throws(()=>service.completeTask(run.id,'logistics'));
 assert.throws(()=>service.completeTask(run.id,'test-REC-1002'));assert.throws(()=>service.completeTask(run.id,'release-REC-1001'));service.completeTask(run.id,'test-REC-1001');service.completeTask(run.id,'release-REC-1001');assert.equal(service.latest().tasks.find(t=>t.id==='test-REC-1002').done,false);for(const task of approved.tasks.filter(t=>t.id.startsWith('test-')||t.id.startsWith('release-')))service.completeTask(run.id,task.id);const done=service.completeTask(run.id,'logistics');assert.equal(done.status,'SIMULATION_COMPLETE');assert.equal(done.audit.at(-1).actualShipmentOutcome,'NOT_OBSERVED');
 const newer=service.create(4);assert.equal(newer.status,'AWAITING_SELECTION');assert.throws(()=>service.route(run.id,'A'),e=>e.status===409);assert.throws(()=>service.completeTask(run.id,'verify'),e=>e.status===409);const old=JSON.parse(db.prepare('SELECT payload FROM recovery_runs WHERE id=?').get(run.id).payload);assert.equal(old.status,'SUPERSEDED');assert.equal(createRecoveryService(db).latest().id,newer.id);db.close();
});
