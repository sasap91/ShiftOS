/**
 * Contract-run assertions (T-16) + rate-based consistency (T-09).
 *
 * Reads the build-time Gurobi/contract artifacts in `tools/gurobi/out/` and
 * asserts the reconciliation invariants that the plan promises:
 *   - capacity buckets: overloaded-week counts agree with the raw minutes;
 *   - schedule: operations are ordered, in-horizon, and end at the completion day;
 *   - demand: the three deltas compose (req→pro + pro→cap = req→cap); activity
 *     and work-order linkage counts agree.
 *
 * Run: npm run test:contract   (requires the artifacts — they ship in the repo)
 * Exits non-zero on any failure, so it can gate CI.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Check = { id: string; area: string; name: string; ok: boolean; detail?: string };
const checks: Check[] = [];
const check = (id: string, area: string, name: string, ok: boolean, detail?: string) => {
  checks.push({ id, area, name, ok, detail });
};
const eq = (id: string, area: string, name: string, expected: unknown, actual: unknown) =>
  check(id, area, name, JSON.stringify(expected) === JSON.stringify(actual), `expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);

const OUT = resolve(process.cwd(), "tools/gurobi/out");
function read<T = any>(name: string): T {
  return JSON.parse(readFileSync(resolve(OUT, name), "utf8")) as T;
}

// --- capacity reconciliation (rate-based cumulative, B-14) ------------------
const rec = read("capacity_reconciliation.json");
const weeks: { capacityMinutes: number; contractPlannedMinutes: number; recomputedPlannedMinutes: number; recomputedBand: string }[] = rec.weeks;
const contractOver = weeks.filter((w) => w.contractPlannedMinutes > w.capacityMinutes).length;
const recomputedOver = weeks.filter((w) => w.recomputedPlannedMinutes > w.capacityMinutes).length;
check("T-16", "capacity", "every resource-week carries capacity and both planned-minute figures",
  weeks.length > 0 && weeks.every((w) => typeof w.capacityMinutes === "number" && typeof w.contractPlannedMinutes === "number" && typeof w.recomputedPlannedMinutes === "number"));
eq("T-16", "capacity", "contract overloaded-week count equals the count of over-capacity contract weeks", rec.contractOverloadedWeeks, contractOver);
eq("T-16", "capacity", "recomputed overloaded-week count equals the count of over-capacity recomputed weeks", rec.recomputedOverloadedWeeks, recomputedOver);
check("T-16", "capacity", "the rate-based recompute cuts the contract overloads sharply (17 → few)",
  contractOver > 0 && recomputedOver > 0 && recomputedOver < contractOver, `contract ${contractOver} vs forward ${recomputedOver}`);
check("T-16", "capacity", "D-22: every forward operation maps to a production week (no orphaned minutes)",
  rec.currentDemandForwardUnmappedMinutes === 0 && rec.currentDemandForwardMinutes > 0);
check("T-16", "capacity", "completed history is separated from forward load",
  rec.currentDemandHistoricalMinutes > 0 && rec.currentDemandHistoricalMinutes > rec.currentDemandForwardMinutes);
check("T-16", "capacity", "forward load fits within total demonstrated capacity",
  rec.currentDemandForwardMinutes <= weeks.reduce((sum, w) => sum + w.capacityMinutes, 0));
check("T-16", "capacity", "every forward overload is recoverable (overtime/third shift); none unresolved",
  rec.forwardOverloadsUnresolved === 0 && rec.forwardOverloadsRecoverable === rec.forwardOverloads && rec.forwardOverloads > 0);
check("T-16", "capacity", "recomputed utilisation stays within [0,1] on non-overloaded weeks",
  weeks.filter((w) => w.recomputedBand === "OK").every((w) => w.recomputedPlannedMinutes <= w.capacityMinutes));

// --- contract schedule (rate-based cumulative) ------------------------------
const sched = read("contract_schedule.json");
const jobs: { id: string; operations: { seq: number; startDay: string; endDay: string }[] }[] = sched.plan.jobs;
check("T-16", "schedule", "the contract run covers 40 work orders",
  jobs.length === 40, `jobs=${jobs.length}`);
check("T-16", "schedule", "every operation is ordered by seq and has start <= end",
  jobs.every((job) =>
    job.operations.every((op, i) => (i === 0 || op.seq >= job.operations[i - 1].seq) && op.startDay <= op.endDay),
  ));
check("T-16", "schedule", "every operation starts within the planning horizon [2026-09-28, 2027-03-26]",
  jobs.every((job) => job.operations.every((op) => op.startDay >= "2026-09-28" && op.startDay <= "2027-03-26")));
check("T-16", "schedule", "the run reports its overloaded-week list and feasibility flag",
  Array.isArray(sched.feasibility.overloadedWeeks) &&
    sched.feasibility.overloadedWeeks.length === rec.contractOverloadedWeeks &&
    typeof sched.feasibility.feasibleWithinHorizon === "boolean");
check("T-16", "schedule", "the run carries a result hash and a solver signature",
  typeof sched.resultHash === "string" && sched.resultHash.length === 64 && sched.solver.threads === 1 && sched.solver.seed === 0);

// --- demand projection: the three deltas compose ----------------------------
const demand = read("demand_projection.json");
const projection: { active: boolean; workOrders: string[]; requestToPromiseDays: number | null; promiseToCapableDays: number | null; capableToRequestedDays: number | null }[] = demand.projection;
eq("T-16", "demand", "the projection covers every commitment", demand.commitments, projection.length);
const withDeltas = projection.filter(
  (row) => row.requestToPromiseDays !== null && row.promiseToCapableDays !== null && row.capableToRequestedDays !== null,
);
check("T-16", "demand", "the three deltas compose wherever a capable date exists (req→pro + pro→cap = req→cap)",
  withDeltas.length >= 36 &&
    withDeltas.every((row) => (row.requestToPromiseDays as number) + (row.promiseToCapableDays as number) === row.capableToRequestedDays));
eq("T-16", "demand", "active-commitment count equals the number of active projection rows", demand.activeCommitments, projection.filter((row) => row.active).length);
eq("T-16", "demand", "work-order-linked count equals the number of rows carrying at least one WO", demand.linkedToWorkOrder, projection.filter((row) => row.workOrders.length > 0).length);
check("T-16", "demand", "no ACTIVE commitment is unlinked — the unlinked set is completed history",
  demand.activeUnlinked === 0 && demand.historicalUnlinked > 0 && demand.activeUnlinked + demand.historicalUnlinked === demand.unlinked);

// --- v2 schedule lane (deterministic Gurobi artifact) -----------------------
const v2 = read("schedule.json");
check("T-16", "v2-lane", "the v2 lane schedules every commitment and no job finishes before its last op",
  v2.jobs.length === 4 &&
    v2.jobs.every((job: { operations: { endDay: string }[]; completionDay: string }) => job.operations.length > 0 && (job.operations.at(-1) as { endDay: string }).endDay <= job.completionDay));
check("T-16", "v2-lane", "the v2 lane is OPTIMAL on the COOLIT fixture with a pinned signature",
  v2.status === "OPTIMAL" && v2.solver.name === "gurobi" && v2.solver.threads === 1 && v2.solver.seed === 0);

// --- allocation lane --------------------------------------------------------
const alloc = read("allocation.json");
check("T-16", "allocation", "the allocation artifact pins snapshot, master set and model version",
  alloc.fixture.snapshotId === "SNAP-20260926-0815" &&
    alloc.fixture.masterSetVersion === "MS-2026-09-26" &&
    typeof alloc.fixture.modelVersion === "string");
check("T-16", "allocation", "baseline and recovery both carry a result hash and objective",
  typeof alloc.baseline.resultHash === "string" && typeof alloc.baseline.objective === "number" &&
    typeof alloc.recovery.resultHash === "string" && typeof alloc.recovery.objective === "number");

// --- report -----------------------------------------------------------------
const pad = (v: string, n: number) => v.padEnd(n);
const failed = checks.filter((c) => !c.ok);
console.log("\nFORGE contract-run assertions");
console.log("============================");
for (const c of checks) {
  console.log(`${c.ok ? "PASS" : "FAIL"}  ${pad(c.id, 6)} ${pad(c.area, 11)} ${c.name}${c.ok ? "" : `\n        ${c.detail ?? ""}`}`);
}
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
console.log("\nReconciliation evidence (recorded, not a failure):");
console.log(`  contract overloaded resource-weeks : ${rec.contractOverloadedWeeks}`);
console.log(`  forward overloaded (rate-based)    : ${rec.recomputedOverloadedWeeks} (unresolved ${rec.forwardOverloadsUnresolved})`);
console.log(`  CURRENT demand — historical        : ${rec.currentDemandHistoricalMinutes.toLocaleString()} min`);
console.log(`  CURRENT demand — forward           : ${rec.currentDemandForwardMinutes.toLocaleString()} min`);
console.log(`  forward demand unmapped to a P-week: ${rec.currentDemandForwardUnmappedMinutes.toLocaleString()} min`);
console.log(`  unlinked commitments               : ${demand.unlinked} (active ${demand.activeUnlinked} / historical ${demand.historicalUnlinked})`);
console.log(`  contract schedule on-time          : ${sched.plan.jobs.filter((j: { tardinessDays: number }) => j.tardinessDays === 0).length}/${sched.plan.jobs.length}`);
console.log(`  commitments linked to a work order : ${demand.linkedToWorkOrder}/${demand.commitments}`);

if (failed.length) {
  console.log(`\n${failed.length} FAILED`);
  process.exit(1);
}
console.log("\ncontract assertions passed.");