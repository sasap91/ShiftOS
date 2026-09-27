/**
 * Runtime production plan.
 *
 * Joins the Gurobi-derived allocation (family A) and schedule (family B) with the
 * calendar rules (W5) into one deterministic record per commitment. This is the
 * seam the ledger, the copilot and `verify` read from — the solver never runs in
 * the browser; it runs at build time (tools/gurobi) and its output is frozen in
 * `generated/solver-artifacts.ts`.
 */
import { addDays, isWeekend } from "./model";
import { LEAKTEST_BASELINE, LEAKTEST_RECOVERY, PRODUCTION_SCHEDULE } from "./solver";

/** A working ship day (Mon-Fri). A promise on a non-ship day is invalid (D-05). */
export function isShipDay(iso: string): boolean {
  return !isWeekend(iso);
}

export function nextShipDay(iso: string): string {
  let cursor = iso;
  while (!isShipDay(cursor)) cursor = addDays(cursor, 1);
  return cursor;
}

export type PlannedOperation = {
  seq: number;
  resourceId: string;
  zone: string;
  startDay: string | null;
  endDay: string | null;
  durationDays: number | null;
  ratePerDay: number;
};

export type PlannedCommitment = {
  id: string;
  product: string;
  qty: number;
  promise: string;
  promiseIsShipDay: boolean;
  normalizedPromise: string;
  capable: string;
  capableDeltaDays: number;
  tardinessDays: number;
  onTime: boolean;
  frozen: boolean;
  allocatedLeakTests: number | null;
  leakTestShortfall: number | null;
  operations: PlannedOperation[];
};

function dayDiff(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso.slice(0, 10)}T00:00:00Z`);
  const to = Date.parse(`${toIso.slice(0, 10)}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

function allocationFor(id: string) {
  return LEAKTEST_BASELINE.allocations.find((row) => row.id === id);
}

/** The full production plan, one record per commitment, in deterministic order. */
export function productionPlan(): PlannedCommitment[] {
  return PRODUCTION_SCHEDULE.jobs.map((job) => {
    const allocation = allocationFor(job.id);
    const normalizedPromise = nextShipDay(job.dueDay);
    return {
      id: job.id,
      product: job.product,
      qty: job.qty,
      promise: job.dueDay,
      promiseIsShipDay: isShipDay(job.dueDay),
      normalizedPromise,
      capable: job.completionDay,
      capableDeltaDays: Math.max(0, dayDiff(normalizedPromise, job.completionDay)),
      tardinessDays: job.tardinessDays,
      onTime: job.tardinessDays === 0,
      frozen: job.frozen,
      allocatedLeakTests: allocation ? allocation.allocated : null,
      leakTestShortfall: allocation ? allocation.shortfall : null,
      operations: job.operations.map((op) => ({
        seq: op.seq,
        resourceId: op.resourceId,
        zone: op.zone,
        startDay: op.startDay,
        endDay: op.endDay,
        durationDays: op.durationDays,
        ratePerDay: op.ratePerDay,
      })),
    };
  });
}

/** Commitments whose promise lands on a non-working day (the N-01 defect family). */
export function shipDayViolations() {
  return productionPlan()
    .filter((row) => !row.promiseIsShipDay)
    .map((row) => ({
      id: row.id,
      promise: row.promise,
      normalizedPromise: row.normalizedPromise,
      statement: `${row.id} promises ${row.promise}, which is not a working ship day; the next valid ship day is ${row.normalizedPromise}.`,
    }));
}

export function recoveryOption() {
  return {
    shifts: LEAKTEST_RECOVERY.overtimeShifts,
    costCad: LEAKTEST_RECOVERY.overtimeCostCad,
    handAuthoredShifts: 6,
    handAuthoredCostCad: 6624,
    savingCad: 6624 - LEAKTEST_RECOVERY.overtimeCostCad,
    clearsPromise: LEAKTEST_RECOVERY.allocations.find((row) => row.id === "COM-1042")?.shortfall === 0,
  };
}

export function planSummary() {
  const plan = productionPlan();
  return {
    commitments: plan.length,
    onTime: plan.filter((row) => row.onTime).length,
    late: plan.filter((row) => !row.onTime).map((row) => row.id),
    shipDayViolations: shipDayViolations().map((row) => row.id),
    frozen: plan.filter((row) => row.frozen).map((row) => row.id),
  };
}