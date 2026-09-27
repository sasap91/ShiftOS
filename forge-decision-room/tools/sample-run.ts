/**
 * FORGE sample run — end-to-end pipeline on the COOLIT fixture.
 *
 *   demand/priority → Gurobi allocation → Gurobi finite-capacity schedule →
 *   ship-day normalisation → frozen protection → governed action chain.
 *
 * Run: npx tsx tools/sample-run.ts   (or: npm run sample)
 * No network, no browser, no Gurobi at runtime — the solver output is frozen.
 */
import { COMMITMENTS, assess } from "../src/model";
import { activeEnvelope, openThread, reduce, type Intent } from "../src/orchestrator";
import { recoveryOption, productionPlan, shipDayViolations, planSummary } from "../src/plan";
import { baselineAllocationTable, solverSignature } from "../src/solver";
import { LEAKTEST_BASELINE } from "../src/solver";

const rule = (title: string) => console.log(`\n${title}\n${"-".repeat(title.length)}`);
const pad = (value: string | number, width: number) => String(value).padEnd(width);

const signature = solverSignature();
rule("0. SOLVER");
console.log(`engine    gurobi ${signature.version}   seed ${signature.seed}   threads ${signature.threads}   method ${signature.method}`);
console.log(`capacity  ${LEAKTEST_BASELINE.capacity.healthy} healthy + ${LEAKTEST_BASELINE.capacity.degraded} degraded = ${LEAKTEST_BASELINE.capacity.total} leak tests`);

rule("1. DEMAND (priority order)");
for (const row of [...COMMITMENTS].sort((a, b) => a.priority - b.priority)) {
  console.log(`${pad(row.id, 10)} pri ${row.priority}  ${pad(row.product, 9)} qty ${pad(row.qty, 4)} promise ${row.promiseDate}  leakTests ${row.leakTests}`);
}

rule("2. ALLOCATION (Gurobi MIP, baseline)");
for (const row of baselineAllocationTable()) {
  const days = row.days.map((day) => `${day.day}=${day.tests}`).join(" ");
  console.log(`${pad(row.id, 15)} ${pad(row.allocated + "/" + row.required, 9)} short ${pad(row.shortfall, 4)} ${days}`);
}

rule("3. RECOVERY OPTION (third shift, Gurobi-optimal)");
const recovery = recoveryOption();
console.log(`hand-authored option  6 shifts  $${recovery.handAuthoredCostCad}`);
console.log(`Gurobi optimum        ${recovery.shifts} shifts  $${recovery.costCad}   ->  saves $${recovery.savingCad}, clears promise: ${recovery.clearsPromise}`);

rule("4. FINITE-CAPACITY SCHEDULE (Gurobi MIP)");
for (const row of productionPlan()) {
  const ops = row.operations.map((op) => `${op.resourceId}@${op.startDay}`).join(" -> ");
  const tag = row.frozen ? " [FROZEN]" : "";
  console.log(`${pad(row.id, 9)}${tag} due ${row.promise}  capable ${row.capable}  tardy ${row.tardinessDays}d  onTime ${row.onTime}`);
  console.log(`          ${ops}`);
}

rule("5. SHIP-DAY RULE (W5 / inverts N-01)");
const violations = shipDayViolations();
if (violations.length === 0) console.log("no promise lands on a non-working day");
for (const violation of violations) console.log(`FLAG  ${violation.statement}`);

rule("6. PLAN SUMMARY");
const summary = planSummary();
console.log(`commitments ${summary.commitments}   on-time ${summary.onTime}   late ${summary.late.join(", ") || "none"}   frozen ${summary.frozen.join(", ") || "none"}`);

rule("7. GOVERNED ACTION CHAIN (COM-1042 third shift)");
let thread = openThread("COM-1042");
const runAs = (role: Parameters<typeof activeEnvelope>[0], intent: Intent) => {
  const envelope = activeEnvelope(role, thread);
  thread = reduce(thread, envelope, intent).thread;
};
console.log(`baseline   ${assess("COM-1042").baseline.feasibility} · short ${assess("COM-1042").testShortfall} · ship ${assess("COM-1042").earliestShipDate}`);
runAs("shift-planner", { type: "scenario" });
console.log(`scenario   ${thread.runs.at(-1)?.id} on file; baseline ${thread.runs[0].id} unchanged`);
runAs("shift-planner", { type: "select-option", optionId: "OPT-THIRD-SHIFT" });
console.log(`selected   ${thread.selectedOptionId} (by Shift Executive)`);
runAs("shift-planner", { type: "request-approval", rationale: "Protect the 15 October promise with a pegged third shift." });
const approvalId = thread.approvals.at(-1)!.id;
const required = thread.approvals.at(-1)!.approvers[0];
console.log(`request    ${approvalId} · requested by Shift Executive · requires ${required?.role} (${required?.authority})`);
runAs("manufacturing-manager", { type: "record-approval", approvalId, decision: "approved", rationale: "Plant manager accepts the pegged overtime on this snapshot." });
console.log(`approval   status ${thread.approvals.at(-1)!.status}`);
runAs("manufacturing-manager", { type: "simulate" });
console.log(`receipt    ${thread.receipts.at(-1)?.mode} ${thread.receipts.at(-1)?.status} · baselineMutated ${thread.receipts.at(-1)?.baselineMutated}`);
runAs("manufacturing-manager", { type: "simulate" });
console.log(`receipt    ${thread.receipts.at(-1)?.mode} ${thread.receipts.at(-1)?.status} · reconciliation ${thread.receipts.at(-1)?.reconciliation}`);
runAs("manufacturing-manager", { type: "observe", receiptId: "" });
console.log(`outcome    successful ${thread.outcomes.at(-1)?.successful} (an accepted writeback is not a shipped commitment)`);

console.log("\nsample run complete.");