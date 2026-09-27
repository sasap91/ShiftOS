/**
 * COOLIT algorithm test — exercises the built solver lane against the real
 * COOLIT fixture (src/model.ts) and reports data provenance per check.
 *
 * Run: npx tsx tools/coolit-test.ts   (or: npm run test:coolit)
 *
 * Exits non-zero on any mismatch, so it can gate CI.
 */
import { COMMITMENTS, assess, commitment } from "../src/model";
import { LEAKTEST_RECOVERY, baselineAllocationTable, PRODUCTION_SCHEDULE } from "../src/solver";
import { productionPlan, recoveryOption, shipDayViolations } from "../src/plan";

type Check = { area: string; name: string; expected: unknown; actual: unknown; ok: boolean; data: string; note?: string };
const checks: Check[] = [];
const check = (area: string, name: string, expected: unknown, actual: unknown, data: string, note?: string) => {
  checks.push({ area, name, expected, actual, ok: JSON.stringify(expected) === JSON.stringify(actual), data, note });
};

const allocation = Object.fromEntries(baselineAllocationTable().map((row) => [row.id, row]));
const plan = productionPlan();
const planById = Object.fromEntries(plan.map((row) => [row.id, row]));
const cooler = COMMITMENTS.map((row) => row.id).sort();

// --- Family A/B: allocation against COOLIT expectations ---------------------
check("allocation", "frozen horizon fully protected", 200, allocation["FROZEN-HORIZON"]?.allocated, "COOLIT fixture");
check("allocation", "COM-1042 allocated equals model onTimeQty", assess("COM-1042").onTimeQty, allocation["COM-1042"]?.allocated, "COOLIT fixture");
check("allocation", "COM-1042 shortfall equals model testShortfall", assess("COM-1042").testShortfall, allocation["COM-1042"]?.shortfall, "COOLIT fixture");
check("allocation", "COM-1104 full leak-test peg (48)", commitment("COM-1104").leakTests, allocation["COM-1104"]?.allocated, "COOLIT fixture");
check("allocation", "COM-1104 no shortfall", 0, allocation["COM-1104"]?.shortfall, "COOLIT fixture");
check("allocation", "capacity = 304 tests", 304, LEAKTEST_RECOVERY.capacity.total, "COOLIT fixture");

// --- Family B: recovery option ---------------------------------------------
const recovery = recoveryOption();
check("recovery", "third shift clears the COM-1042 promise", true, recovery.clearsPromise, "COOLIT fixture");
check("recovery", "Gurobi optimum is 4 shifts", 4, recovery.shifts, "COOLIT fixture");
check("recovery", "Gurobi cost $4,416", 4416, recovery.costCad, "COOLIT fixture");

// --- Family B: schedule coverage + rules -----------------------------------
check("schedule", "schedule covers every commitment", cooler, PRODUCTION_SCHEDULE.jobs.map((j) => j.id).sort(), "provisional routing");
check("schedule", "COM-1104 frozen and on time", true, planById["COM-1104"]?.frozen && planById["COM-1104"]?.onTime, "provisional routing");
check("schedule", "COM-1018 on time", true, planById["COM-1018"]?.onTime, "provisional routing");
check("schedule", "COM-1042 late by 4 days", 4, planById["COM-1042"]?.tardinessDays, "provisional routing");
check("schedule", "all jobs OPTIMAL", "OPTIMAL", PRODUCTION_SCHEDULE.status, "provisional routing");

// --- W5 ship-day rule (COOLIT promise data is real) ------------------------
check("ship-day", "COM-1104 Saturday promise flagged", ["COM-1104"], shipDayViolations().map((row) => row.id), "COOLIT fixture");
check("ship-day", "COM-1104 normalised to Monday 12 Oct", "2026-10-12", planById["COM-1104"]?.normalizedPromise, "COOLIT fixture");

// --- Coverage gaps: what the algorithms do NOT yet consume ------------------
const notCovered = [
  "COM-1018 material shortfall (MV-14 supplier commit ×1 BOM) — not modelled by the solver (B-01/A-06 open)",
  "COM-0991 November bucket — out of the 15 Oct window (Q-03 open)",
  "capacity derates are read from a fixed calendar, not the capability evaluator (B-01 open)",
];

// --- Report ----------------------------------------------------------------
const pad = (v: string | number, n: number) => String(v).padEnd(n);
console.log("\nCOOLIT algorithm test");
console.log("=====================");
for (const c of checks) {
  console.log(`${c.ok ? "PASS" : "FAIL"}  ${pad(c.area, 11)} ${pad(c.name, 52)} exp ${pad(JSON.stringify(c.expected), 16)} got ${JSON.stringify(c.actual)}  [${c.data}]`);
}
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);

console.log("\nCOOLIT data coverage gaps (expected — not algorithm failures):");
for (const gap of notCovered) console.log(`  · ${gap}`);

console.log("\nData provenance:");
console.log("  allocation + ship-day: real COOLIT fixture (src/model.ts)");
console.log("  schedule: PROVISIONAL routing/rate fixture (tools/gurobi/fixtures/schedule_input.json)");

if (failed.length) {
  console.log(`\n${failed.length} FAILED`);
  process.exit(1);
}
console.log("\nCOOLIT algorithm test passed.");