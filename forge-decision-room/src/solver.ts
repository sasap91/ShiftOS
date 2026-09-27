/**
 * Gurobi-derived solver artifacts.
 *
 * The runtime is a static SPA, so Gurobi cannot run in the browser. Instead the
 * optimization runs at build time (tools/gurobi) and its frozen, fingerprinted
 * result ships as `generated/solver-artifacts.ts`. This module is the typed seam
 * the deterministic services and the ledger can read from.
 *
 * Determinism: the artifact is a pure function of the fixture + solver signature
 * (Gurobi 12.0.3, seed 0, threads 1). Re-running the harness reproduces it.
 */
import {
  LEAKTEST_BASELINE,
  LEAKTEST_RECOVERY,
  PRODUCTION_SCHEDULE,
  SOLVER,
} from "./generated/solver-artifacts";

export { LEAKTEST_BASELINE, LEAKTEST_RECOVERY, PRODUCTION_SCHEDULE, SOLVER };

export type SolverAllocation = {
  id: string;
  priority: number;
  frozen: boolean;
  required: number;
  allocated: number;
  shortfall: number;
  days: { day: string; tests: number }[];
};

/** Baseline leak-test allocation (no overtime) keyed by commitment id. */
export function baselineAllocation(): Record<string, SolverAllocation> {
  return Object.fromEntries(baselineAllocationTable().map((row) => [row.id, row]));
}

/** Full allocation table in deterministic (priority, id) order. */
export function baselineAllocationTable(): SolverAllocation[] {
  return LEAKTEST_BASELINE.allocations.map((row) => ({
    id: row.id,
    priority: row.priority,
    frozen: row.frozen,
    required: row.required,
    allocated: row.allocated,
    shortfall: row.shortfall,
    days: row.days.map((day) => ({ day: day.day, tests: day.tests })),
  }));
}

/** Cost of the optimal third-shift recovery vs. the hand-authored 6-shift option. */
export function recoverySummary() {
  return {
    shifts: LEAKTEST_RECOVERY.overtimeShifts,
    costCad: LEAKTEST_RECOVERY.overtimeCostCad,
    handAuthoredCostCad: 6624,
    savingCad: 6624 - LEAKTEST_RECOVERY.overtimeCostCad,
  };
}

export function solverSignature() {
  return SOLVER;
}