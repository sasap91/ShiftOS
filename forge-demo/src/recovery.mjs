import { readFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
export const FIXTURE = JSON.parse(readFileSync(new URL('../fixtures/test-outage.json', import.meta.url), 'utf8'));
const sum = a => a.reduce((x,y)=>x+y,0);
const round = n => Math.round(n*100)/100;
const fail = (message,status=400) => {const e=new Error(message);e.status=status;e.expose=true;throw e;};
const overlap = (a,b,c,d) => Math.max(0,Math.min(b,d)-Math.max(a,c));

function windows(station, outage, overtime, fixture) {
  const regular=station.regularWindows.map(([s,e])=>[station.id===fixture.failedStation?Math.max(s,outage):s,e]).filter(([s,e])=>e>s);
  const all=overtime&&station.overtimeWindow?[...regular,station.overtimeWindow]:regular;
  // Merge adjacent shift and overtime windows: tests can cross their boundary.
  return all.sort((a,b)=>a[0]-b[0]).reduce((out,w)=>{const last=out.at(-1);if(last&&last[1]>=w[0])last[1]=Math.max(last[1],w[1]);else out.push([...w]);return out;},[]);
}
export function schedule(fixture,{outageHours=0,mode='baseline'}={}) {
  const stationIds=mode==='baseline'?[fixture.failedStation]:mode==='C'?['T-01','T-02','T-03']:['T-01','T-02'];
  const stations=fixture.stations.filter(s=>stationIds.includes(s.id)&&s.calibration==='VALID');
  const allocations=[];
  const queue=[...fixture.orders].sort((a,b)=>mode==='baseline'?a.id.localeCompare(b.id):a.priority-b.priority||a.shipDeadlineHour-b.shipDeadlineHour||b.shipmentValue-a.shipmentValue||a.id.localeCompare(b.id));
  for(const job of queue){
    const candidates=[];
    if(job.quality==='RELEASED')for(const station of stations){
      if(!station.qualifiedFamilies.includes(job.family))continue;
      for(const [start,end] of windows(station,outageHours,mode==='B',fixture)){
        let t=Math.max(start,job.readyHour);
        for(const booked of allocations.filter(a=>a.station===station.id&&a.start!==null).sort((a,b)=>a.start-b.start)){
          if(booked.end<=t)continue;if(t+job.testHours<=booked.start)break;t=Math.max(t,booked.end);
        }
        if(t+job.testHours<=end&&t+job.testHours<=fixture.assumptions.planningHorizonHours)candidates.push({station:station.id,start:t,end:t+job.testHours});
      }
    }
    candidates.sort((a,b)=>a.end-b.end||a.station.localeCompare(b.station));
    const chosen=candidates[0];const shipHour=chosen?chosen.end+fixture.assumptions.packHours:null;
    allocations.push({...job,...(chosen||{station:null,start:null,end:null}),shipHour,late:shipHour===null||shipHour>job.shipDeadlineHour,lateHours:shipHour===null?null:Math.max(0,shipHour-job.shipDeadlineHour),blocker:chosen?null:job.quality!=='RELEASED'?'Quality release required':'No qualified capacity within the planning horizon'});
  }
  return allocations;
}
function economics(fixture,schedule,normal,outageHours,mode){
  const a=fixture.assumptions;const late=schedule.filter(j=>j.late);const normalById=new Map(normal.map(j=>[j.id,j]));
  const overtimeHours=sum(schedule.filter(j=>j.station==='T-01'&&j.start!==null).map(j=>mode==='B'?overlap(j.start,j.end,...fixture.stations.find(s=>s.id==='T-01').overtimeWindow):0));
  const addedWipUnitHours=sum(schedule.map(j=>j.shipHour===null?0:j.units*Math.max(0,j.shipHour-normalById.get(j.id).shipHour)));
  const usesAlternative=schedule.some(j=>j.station==='T-03');
  const costs={overtime:round(overtimeHours*a.overtimeTeamHourly),premiumFreight:late.length*a.premiumFreightPerLateOrder,idleLabor:round(outageHours*a.idleOperators*a.idleLaborHourly),idleEquipment:round(outageHours*a.idleEquipmentHourly),wipHolding:round(addedWipUnitHours*a.wipUnitHourCost),potentialPenalties:round(sum(late.map(j=>j.shipmentValue))*a.latePenaltyRate),reassignment:usesAlternative?a.alternativeChangeoverHours*a.alternativeChangeoverHourly+a.alternativeStaffingHours*a.alternativeStaffingHourly:0};
  return {shipmentValueAtRisk:sum(late.map(j=>j.shipmentValue)),lateOrders:late.map(j=>j.id),costs,totalEstimatedCost:round(sum(Object.values(costs))),overtimeHours:round(overtimeHours),addedWipUnitHours:round(addedWipUnitHours),escalations:late.filter(j=>j.priority<=2).length,unquantifiedOrders:schedule.filter(j=>j.shipHour===null).map(j=>j.id)};
}
export function calculateRecovery(outageHours=8,fixture=FIXTURE){
  if(typeof outageHours!=='number'||!Number.isFinite(outageHours)||outageHours<0||outageHours>24||outageHours*2%1)fail('Outage must be between 0 and 24 hours in half-hour increments.');
  const normal=schedule(fixture);const baselineSchedule=schedule(fixture,{outageHours});const baseline={schedule:baselineSchedule,...economics(fixture,baselineSchedule,normal,outageHours,'baseline')};
  const labels={A:['Protect the priority shipment','Resequence into the remaining regular shifts.'],B:['Add test-team overtime','Extend T-01 by up to 6 hours with a qualified team.'],C:['Use the qualified validation cell','Move eligible loop and manifold work to T-03 inside this plant.']};
  const plans=Object.entries(labels).map(([id,[title,description]])=>{
    const allocations=schedule(fixture,{outageHours,mode:id});const econ=economics(fixture,allocations,normal,outageHours,id);
    const protectedIds=baseline.lateOrders.filter(id=>!allocations.find(a=>a.id===id).late);
    return {id,title,description,feasible:allocations.every(j=>!j.blocker),blockers:allocations.filter(j=>j.blocker).map(j=>`${j.id}: ${j.blocker}`),schedule:allocations,...econ,protectedShipmentValue:sum(fixture.orders.filter(o=>protectedIds.includes(o.id)).map(o=>o.shipmentValue)),protectedOrders:protectedIds,urgentOnTime:allocations.filter(j=>j.shipDeadlineHour<=24&&!j.late).length};
  });
  const best=plans.filter(p=>p.feasible).sort((a,b)=>a.shipmentValueAtRisk-b.shipmentValueAtRisk||a.totalEstimatedCost-b.totalEstimatedCost||a.id.localeCompare(b.id))[0];
  const fingerprint=createHash('sha256').update(JSON.stringify({fixture,engine:'finite-window-v1',outageHours})).digest('hex');
  const stations=fixture.stations.map(s=>({...s,availableNext24Hours:s.calibration!=='VALID'?0:round(sum(windows(s,outageHours,false,fixture).map(([start,end])=>overlap(start,end,0,24))))}));
  return {fixtureId:fixture.id,fixtureVersion:fixture.version,synthetic:true,plant:fixture.plant,incidentAt:fixture.incidentAt,failedStation:fixture.failedStation,failure:fixture.failure,outageHours,currency:fixture.currency,sourceNote:fixture.sourceNote,assumptions:fixture.assumptions,stations,normal,baseline,plans,recommendedPlan:best?.id??null,fingerprint,affectedOrders:outageHours>0?fixture.orders.length:0,urgentOrders:fixture.orders.filter(o=>o.shipDeadlineHour<=24).length,affectedShipmentValue:sum(fixture.orders.map(o=>o.shipmentValue)),model:'finite-window-v1',constraints:['One order at a time per station','Whole-order, non-preemptive tests','Released material and valid calibration','Qualified product family per station','Station calendar and outage exclusion','2-hour packing/release buffer; passing test assumed','Single plant; no inter-site transfer'],costCaveat:'Shipment value at risk is exposure, not a loss, and is not added to estimated incremental costs. Freight, penalty, idle and holding figures are scenario assumptions; no actual invoice or penalty is asserted. Customer escalation is shown as a count, not monetized.'};
}

export function createRecoveryService(db){
  db.exec('CREATE TABLE IF NOT EXISTS recovery_runs(id TEXT PRIMARY KEY, payload TEXT NOT NULL, created_at TEXT NOT NULL);');
  const latest=()=>{const row=db.prepare('SELECT payload FROM recovery_runs ORDER BY rowid DESC LIMIT 1').get();return row?JSON.parse(row.payload):null;};
  const save=run=>{db.prepare('INSERT INTO recovery_runs(id,payload,created_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').run(run.id,JSON.stringify(run),run.createdAt);return run;};
  const event=(run,type,details={})=>run.audit.push({id:randomUUID(),type,at:new Date().toISOString(),...details,simulated:true});
  const create=hours=>{
    const t=performance.now();const analysis=calculateRecovery(hours);const prior=latest();
    const run={id:randomUUID(),createdAt:new Date().toISOString(),status:'AWAITING_SELECTION',analysis,calculationMs:round(performance.now()-t),selectedPlan:null,manager:null,supervisor:null,tasks:[],audit:[]};
    event(run,'INCIDENT_CALCULATED',{outageHours:hours,fingerprint:analysis.fingerprint});
    db.exec('BEGIN');try{if(prior){prior.status='SUPERSEDED';event(prior,'SUPERSEDED',{by:run.id});save(prior);}save(run);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return run;
  };
  const current=id=>{const run=latest();if(!run||run.id!==id)fail('This recovery run is stale. Reload the latest incident.',409);return run;};
  const name=s=>{if(typeof s!=='string'||s.trim().length<2||s.length>100)fail('Enter a name for the simulated decision record.');return s.trim();};
  const route=(id,planId)=>{const run=current(id);if(run.selectedPlan===planId&&run.status==='AWAITING_MANAGER')return run;if(run.status!=='AWAITING_SELECTION')fail('Recalculate the incident before changing a routed or approved plan.',409);const plan=run.analysis.plans.find(p=>p.id===planId);if(!plan?.feasible)fail('Only a feasible recovery plan can be routed.');run.selectedPlan=planId;run.status='AWAITING_MANAGER';event(run,'ROUTED_TO_PLANT_MANAGER',{plan:planId});return save(run);};
  const approve=(id,person,rationale)=>{
    const run=current(id);person=name(person);if(run.manager){if(run.manager.name===person)return run;fail('This run already has a plant-manager approval.',409);}
    if(run.status!=='AWAITING_MANAGER')fail('Route a plan before plant-manager approval.',409);
    if(typeof rationale!=='string'||rationale.trim().length<5||rationale.length>1500)fail('Add a short approval rationale (5–1,500 characters).');
    run.manager={name:person,rationale:rationale.trim(),at:new Date().toISOString(),simulated:true};run.status='AWAITING_SUPERVISOR';
    const plan=run.analysis.plans.find(p=>p.id===run.selectedPlan);
    const ordered=plan.schedule.slice().sort((a,b)=>a.start-b.start||a.station.localeCompare(b.station));
    const previousByStation=new Map();
    const testTasks=ordered.map(j=>{
      const previous=previousByStation.get(j.station);previousByStation.set(j.station,`test-${j.id}`);
      return {id:`test-${j.id}`,title:`Test ${j.id} · ${j.units} ${j.family} units on ${j.station}`,role:'Test supervisor',station:j.station,start:j.start,end:j.end,order:j.id,requires:['verify',...(previous?[previous]:[])],done:false};
    });
    const releaseTasks=ordered.map(j=>({id:`release-${j.id}`,title:`Verify passing evidence, release, pack and ship ${j.id}`,role:'Quality lead + shipping supervisor',start:j.end,end:j.shipHour,order:j.id,requires:[`test-${j.id}`],done:false}));
    run.tasks=[{id:'verify',title:'Verify station readiness, calibration, qualified team, and released lots',role:'Test supervisor',requires:[],done:false},...testTasks.flatMap(t=>[t,releaseTasks.find(r=>r.order===t.order)]),{id:'logistics',title:'Reconcile shipment outcomes and escalate any remaining late commitments',role:'Shipping supervisor',requires:releaseTasks.map(t=>t.id),done:false}];
    event(run,'PLANT_MANAGER_APPROVED',{name:person,plan:run.selectedPlan,rationale:run.manager.rationale});event(run,'SUPERVISOR_TASKS_CREATED',{count:run.tasks.length});return save(run);
  };
  const acknowledge=(id,person)=>{const run=current(id);person=name(person);if(run.supervisor){if(run.supervisor.name===person)return run;fail('A supervisor has already accepted this run.',409);}if(run.status!=='AWAITING_SUPERVISOR')fail('Plant-manager approval is required first.',409);run.supervisor={name:person,at:new Date().toISOString(),simulated:true};run.status='EXECUTING_SIMULATION';event(run,'SUPERVISOR_ACCEPTED',{name:person});return save(run);};
  const completeTask=(id,taskId)=>{const run=current(id);if(!run.supervisor)fail('A supervisor must accept the approved plan first.',409);const task=run.tasks.find(t=>t.id===taskId);if(!task)fail('Unknown task.');if(task.done)return run;if(task.requires.some(id=>!run.tasks.find(t=>t.id===id)?.done))fail('Complete prerequisite tasks first.',409);task.done=true;task.completedAt=new Date().toISOString();event(run,'TASK_COMPLETED_SIMULATION',{task:task.id,recordedBy:run.supervisor.name});if(run.tasks.every(t=>t.done)){run.status='SIMULATION_COMPLETE';event(run,'SIMULATED_TASKS_COMPLETE',{actualShipmentOutcome:'NOT_OBSERVED'});}return save(run);};
  return {latest,create,route,approve,acknowledge,completeTask};
}
