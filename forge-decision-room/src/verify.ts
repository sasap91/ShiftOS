import {
  MODEL_VERSION,
  PEOPLE,
  ROLE_POLICY,
  allocateLeakTests,
  allocationFor,
  assess,
  canonicalResult,
  createApproval,
  createScenarioRun,
  decideApproval,
  leakTestCapacity,
  weekday,
} from "./model";

const assert = {
  equal(actual: unknown, expected: unknown) {
    if (actual !== expected) {
      throw new Error(`expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
    }
  },
  deepEqual(actual: unknown, expected: unknown) {
    const left = JSON.stringify(actual);
    const right = JSON.stringify(expected);
    if (left !== right) throw new Error(`expected ${right} but got ${left}`);
  },
  match(value: string, pattern: RegExp) {
    if (!pattern.test(value)) throw new Error(`${value} did not match ${pattern}`);
  },
  throws(run: () => unknown) {
    try {
      run();
    } catch {
      return;
    }
    throw new Error("expected a throw");
  },
};
import { openThread, reduce } from "./orchestrator";
import { buildLedger, buildLedgerRow } from "./ledger";
import { MASTER_SET_VERSION, masterRefsFor, validityOf } from "./master";
import {
  PRODUCTION_SCHEDULE,
  baselineAllocationTable,
  recoverySummary,
  solverSignature,
} from "./solver";
import { planSummary, productionPlan, recoveryOption, shipDayViolations } from "./plan";
import {
  MEMORY_SET_VERSION,
  REAPPROVAL_THRESHOLD,
  STEWARD_BY_CLASS,
  effectiveConfidence,
  hardGateConfidence,
  invalidatedDecisions,
  lintDecisionRoom,
  memoriesFor,
  memoryRegistry,
  reapprovalRequired,
  sourceDownExample,
  supersessionDemo,
} from "./memory";

const capacity = leakTestCapacity();
assert.equal(capacity.healthyDays.length, 6);
assert.equal(capacity.degradedDays.length, 7);
assert.equal(capacity.healthy, 192);
assert.equal(capacity.degraded, 112);
assert.equal(capacity.total, 304);
assert.equal(weekday("2026-09-26"), "Saturday");
assert.equal(weekday("2026-10-15"), "Thursday");
assert.equal(weekday("2026-10-19"), "Monday");

const pegs = allocateLeakTests();
assert.deepEqual(
  pegs.map((row) => [row.id, row.allocated]),
  [
    ["FROZEN-HORIZON", 200],
    ["COM-1104", 48],
    ["COM-1042", 56],
  ],
);

// --- Gurobi-backed solver artifacts (build-time, deterministic) ---
const solverTable = baselineAllocationTable();
assert.deepEqual(
  solverTable.map((row) => [row.id, row.allocated]),
  [
    ["FROZEN-HORIZON", 200],
    ["COM-1104", 48],
    ["COM-1042", 56],
  ],
);
assert.equal(solverTable.find((row) => row.id === "COM-1042")?.shortfall, 64);
assert.equal(solverSignature().name, "gurobi");
assert.equal(solverSignature().threads, 1);
const recovery = recoverySummary();
assert.equal(recovery.shifts, 4);
assert.equal(recovery.costCad, 4416);
assert.equal(recovery.savingCad, 2208);
assert.equal(PRODUCTION_SCHEDULE.status, "OPTIMAL");
assert.equal(PRODUCTION_SCHEDULE.jobs.length, 4);

// --- runtime production plan: W5 ship-day rule + frozen-horizon protection ---
const plan = productionPlan();
assert.equal(plan.length, 4);
const plan1104 = plan.find((row) => row.id === "COM-1104");
assert.equal(plan1104?.promise, "2026-10-10");
assert.equal(plan1104?.promiseIsShipDay, false);
assert.equal(plan1104?.normalizedPromise, "2026-10-12");
assert.equal(plan1104?.onTime, true);
assert.equal(plan1104?.frozen, true);
assert.equal(plan1104?.operations[0]?.startDay, "2026-09-28");
assert.equal(plan.find((row) => row.id === "COM-1042")?.onTime, false);
assert.equal(shipDayViolations()[0]?.id, "COM-1104");
const summary = planSummary();
assert.equal(summary.onTime, 3);
assert.deepEqual(summary.late, ["COM-1042"]);
assert.deepEqual(summary.frozen, ["COM-1104"]);
const recoveryOptionSummary = recoveryOption();
assert.equal(recoveryOptionSummary.clearsPromise, true);
assert.equal(recoveryOptionSummary.savingCad, 2208);

const risk = assess("COM-1042");
assert.equal(risk.baseline.feasibility, "infeasible");
assert.equal(risk.baseline.bindingConstraint, "Leak-test capacity");
assert.equal(risk.testShortfall, 64);
assert.equal(risk.materialShortfall, 0);
assert.equal(risk.onTimeQty, 56);
assert.equal(risk.earliestShipDate, "2026-10-19");
assert.equal(risk.packet.derivedFacts.find((row) => row.name === "ELIGIBLE")?.result, "280");
assert.equal(risk.packet.conflicts[0]?.disposition, "quarantined");
assert.equal(risk.packet.freshness.staleRecords.includes("CUST-WAIVER-LOG"), true);
assert.equal(Object.isFrozen(risk.baseline), true);

const held = risk.packet.sourceFacts.find((row) => row.sourceRecordId === "QH-317");
if (!held) throw new Error("missing quality hold");
assert.match(held.statement, /not eligible/);

const first = createScenarioRun("COM-1042", 1);
const second = createScenarioRun("COM-1042", 2);
if (first.id === second.id) throw new Error("scenario ids collided");
assert.equal(canonicalResult(first), canonicalResult(second));
assert.equal(first.feasibility, "infeasible");
assert.equal(risk.baseline.alternatives.length, 0);
assert.equal(first.alternatives.length, 6);

const byId = Object.fromEntries(first.alternatives.map((row) => [row.id, row]));
assert.equal(byId["OPT-THIRD-SHIFT"].feasibility, "feasible");
assert.equal(byId["OPT-THIRD-SHIFT"].meetsPromise, true);
assert.equal(byId["OPT-THIRD-SHIFT"].costCad, 6624);
assert.equal(byId["OPT-SPLIT"].feasibility, "feasible");
assert.equal(byId["OPT-SPLIT"].onTimeQty, 56);
assert.equal(byId["OPT-SPLIT"].lateQty, 64);
assert.equal(byId["OPT-SPLIT"].lateShipDate, "2026-10-19");
assert.equal(byId["OPT-SPLIT"].evidenceGaps.length > 0, true);
assert.equal(byId["OPT-SATURDAY"].feasibility, "infeasible");
assert.equal(byId["OPT-SATURDAY"].residualShortfall, 48);
assert.equal(byId["OPT-SATURDAY"].violatedHardConstraints.length, 0);
assert.equal(byId["OPT-EXPEDITE"].feasibility, "infeasible");
assert.equal(byId["OPT-RELEASE-HOLD"].violatedHardConstraints[0]?.id, "GATE-ELIGIBILITY");
assert.equal(byId["OPT-MOVE-FROZEN"].violatedHardConstraints[0]?.id, "GATE-FROZEN");
assert.throws(() => createApproval(first, "OPT-RELEASE-HOLD", PEOPLE["shift-planner"], "This should fail the gate.", 1));

const thread = openThread("COM-1042");
const baseline = thread.runs[0];
const envelope = {
  user: PEOPLE["shift-planner"],
  tenantId: "TENANT-COOLIT-SYNTH",
  siteId: "SITE-YYC-01",
  siteLabel: "YYC-01",
  commitmentId: "COM-1042",
  product: "Cold-plate loop · CPL-480",
  program: "NL-ORION",
  scenario: { kind: "baseline" as const },
  asOf: "2026-09-26T08:15:00-06:00",
  snapshotId: "SNAP-20260926-0815",
  modelVersion: MODEL_VERSION,
  // D-24: freshness and conflict counts are derived from the packet, never literals.
  freshness: { fresh: risk.packet.freshness.fresh, stale: risk.packet.freshness.stale },
  unresolvedConflicts: risk.packet.conflicts.length,
  lens: ROLE_POLICY["shift-planner"].lens,
  policy: ROLE_POLICY["shift-planner"],
  authorization: {
    scope: "YYC-01 only",
    canApproveRoles: ["shift-planner" as const],
    canExecuteWithoutGateway: false as const,
    calculatesOfficialQuantities: false as const,
  },
};
const asRole = (role: keyof typeof PEOPLE) => ({
  ...envelope,
  user: PEOPLE[role],
  lens: ROLE_POLICY[role].lens,
  policy: ROLE_POLICY[role],
});

assert.equal(ROLE_POLICY["shift-planner"].canApprove, false);
assert.equal(ROLE_POLICY["demand-planner"].canSelectOptions, false);
assert.equal(ROLE_POLICY["manufacturing-manager"].canApprove, true);

const seeded = thread.turns[0].blocks.find((block) => block.kind === "answer");
assert.equal(seeded && seeded.kind === "answer" && seeded.text, "The 15 October commitment is currently infeasible.");
const seededWhy = thread.turns[0].blocks.find((block) => block.kind === "why");
assert.equal(seededWhy && seededWhy.kind === "why" && seededWhy.text, "Leak-test capacity is the binding constraint.");

const ran = reduce(thread, envelope, { type: "scenario" });
assert.equal(ran.thread.runs[0], baseline);
assert.equal(Object.isFrozen(ran.thread.runs[0]), true);
assert.equal(ran.thread.runs[1].kind, "scenario");
assert.match(ran.thread.notice ?? "", /was not modified/);
assert.deepEqual(ran.turn.progress, ["Freezing the baseline snapshot", "Solving recovery options"]);

const selected = reduce(ran.thread, envelope, { type: "select-option", optionId: "OPT-THIRD-SHIFT" });
const rejected = reduce(selected.thread, envelope, { type: "select-option", optionId: "OPT-RELEASE-HOLD" });
assert.equal(rejected.thread.selectedOptionId, "OPT-THIRD-SHIFT");
const stayedRejected = rejected.turn.blocks.some((block) => block.kind === "why" && block.text.includes("eligibility"));
if (!stayedRejected) throw new Error("infeasible option was not kept visible");

const demandSelect = reduce(ran.thread, asRole("demand-planner"), {
  type: "select-option",
  optionId: "OPT-THIRD-SHIFT",
});
assert.equal(demandSelect.thread.selectedOptionId, null);

const asked = reduce(selected.thread, envelope, {
  type: "request-approval",
  rationale: "Protect the 15 October promise with a pegged third shift.",
});
const approval = asked.thread.approvals[0];
assert.equal(approval.status, "pending");
assert.deepEqual(
  approval.approvers.map((row) => row.role),
  ["manufacturing-manager"],
);
assert.equal(approval.approvers[0]?.authority, "finance");
assert.throws(() => decideApproval(approval, PEOPLE["shift-planner"], "approved", "I am approving my own request."));

// A proposal-only role cannot record an approval decision.
const shiftRecord = reduce(asked.thread, envelope, {
  type: "record-approval",
  approvalId: approval.id,
  decision: "approved",
  rationale: "The shift planner should not be able to record this decision.",
});
assert.equal(shiftRecord.thread.approvals[0].status, "pending");

const manager = asRole("manufacturing-manager");
const blocked = reduce(asked.thread, manager, { type: "simulate" });
assert.equal(blocked.thread.receipts[0]?.status, "rejected");
assert.equal(blocked.thread.runs[0], baseline);

let current = asked.thread;
for (const actor of ["manufacturing-manager"] as const) {
  const step = reduce(
    current,
    asRole(actor),
    {
      type: "record-approval",
      approvalId: approval.id,
      decision: "approved",
      rationale: `${PEOPLE[actor].roleLabel} accepts the pegged overtime on this snapshot.`,
    },
  );
  current = step.thread;
}
assert.equal(current.approvals[0].status, "approved");

const dry = reduce(current, manager, { type: "simulate" });
assert.equal(dry.thread.receipts.at(-1)?.mode, "dry-run");
assert.equal(dry.thread.receipts.at(-1)?.status, "accepted");
assert.equal(dry.thread.receipts.at(-1)?.baselineMutated, false);
assert.equal(dry.thread.runs[0].earliestShipDate, "2026-10-19");

const executed = reduce(dry.thread, manager, { type: "simulate" });
const again = reduce(executed.thread, manager, { type: "simulate" });
assert.equal(executed.thread.receipts.filter((row) => row.mode === "execute" && row.status === "accepted").length, 1);
assert.equal(again.thread.receipts.at(-1)?.id, executed.thread.receipts.at(-1)?.id);

const outcome = reduce(executed.thread, manager, { type: "observe", receiptId: "" });
assert.equal(outcome.thread.outcomes[0]?.successful, false);
assert.match(outcome.thread.outcomes[0]?.reason ?? "", /accepted writeback is not a successful commitment/i);

const manifold = assess("COM-1018");
assert.equal(manifold.baseline.bindingConstraint, "MV-14 supplier commit");
assert.equal(allocationFor("COM-1018").required, 0);
assert.equal(assess("COM-1104").baseline.feasibility, "feasible");
assert.equal(assess("COM-0991").baseline.feasibility, "feasible");

// --- commitment ledger projections ---
assert.equal(MASTER_SET_VERSION, "MS-2026-09-26");

const rules = masterRefsFor("COM-1042");
assert.equal(rules.some((master) => master.id === "BOM-CPL480-QD220"), true);
assert.equal(rules.every((master) => validityOf(master) === "current"), true);
assert.equal(
  validityOf({
    id: "X",
    set: "calendar",
    recordId: "X",
    label: "future rule",
    version: "v1",
    effectiveFrom: "2026-10-01",
    effectiveTo: null,
    supersededBy: null,
    statement: "A rule that is not yet in force.",
  }),
  "effective-from",
);
assert.equal(masterRefsFor("COM-1018").some((master) => master.id === "AVL-MV-14B"), true);

const ledgerCom = buildLedgerRow(openThread("COM-1042"));
assert.equal(ledgerCom.constraint.className, "capacity");
assert.equal(ledgerCom.constraint.resource, "RES-LT-01");
assert.equal(ledgerCom.constraint.allocated, 56);
assert.equal(ledgerCom.constraint.required, 120);
assert.equal(ledgerCom.constraint.shortfall, 64);
assert.equal(ledgerCom.feasibility, "infeasible");
assert.equal(ledgerCom.risk, "at-risk");
assert.equal(ledgerCom.lifecycle, "investigating");
assert.equal(ledgerCom.capable, "2026-10-19");
assert.equal(ledgerCom.capableDeltaDays, 4);
assert.equal(ledgerCom.provenance.conflicts, 1);
assert.equal(ledgerCom.lanes.some((lane) => lane.system === "CRM" && lane.primary), true);
assert.equal(ledgerCom.lanes.some((lane) => lane.system === "MES" && lane.primary), true);
assert.equal(ledgerCom.lanes.some((lane) => lane.system === "WMS" && !lane.primary), true);
assert.equal(ledgerCom.rules.length, 7);

const ledgerManifold = buildLedgerRow(openThread("COM-1018"));
assert.equal(ledgerManifold.constraint.className, "material");
assert.equal(ledgerManifold.constraint.shortfall, 68);
assert.equal(ledgerManifold.risk, "awaiting");
assert.equal(ledgerManifold.lifecycle, "awaiting-approval");

const ledgerBoard = buildLedger(
  Object.fromEntries(["COM-1042", "COM-1018", "COM-1104", "COM-0991"].map((id) => [id, openThread(id)])),
);
assert.deepEqual(
  ledgerBoard.map((row) => row.commitmentId),
  ["COM-1042", "COM-1018", "COM-1104", "COM-0991"],
);
assert.equal(
  ledgerBoard.every((row) => row.constraint.required === null || row.constraint.required > 0),
  true,
);
assert.equal(
  ledgerBoard.filter((row) => row.constraint.className === "none").map((row) => row.commitmentId).join(","),
  "COM-1104,COM-0991",
);

console.log("decision services verified");

// --- M0: decision-memory identity, reverse edges, and reference integrity ---
assert.equal(MEMORY_SET_VERSION, "MEM-MS-2026-09-26");
assert.equal(REAPPROVAL_THRESHOLD, 0.75);

// D-03 (dangling option) is fixed: the seeded COM-1104 option is materialised.
const cduRun = openThread("COM-1104").runs[0];
assert.equal(cduRun.alternatives.some((option) => option.id === "OPT-RESERVE-SLOTS"), true);

// Reference integrity: every run/option/approval/receipt/master/edge id resolves.
const roomThreads = ["COM-1042", "COM-1018", "COM-1104", "COM-0991"].map((id) => openThread(id));
const registry = memoryRegistry(["COM-1042", "COM-1018", "COM-1104", "COM-0991"]);
const lintProblems = lintDecisionRoom({
  runs: [...roomThreads.flatMap((thread) => thread.runs), first, second],
  approvals: [...roomThreads.flatMap((thread) => thread.approvals), approval],
  receipts: [...roomThreads.flatMap((thread) => thread.receipts), ...dry.thread.receipts],
  memories: registry.memories,
  edges: registry.edges,
});
assert.deepEqual(lintProblems, []);

// Stewardship + reverse index: the resource memory is owned by Maintenance and
// is consumed by exactly one decision.
const lt01 = registry.memories.find((memory) => memory.memoryId === "MEM-RM-RES-LT-01");
if (!lt01) throw new Error("missing RES-LT-01 memory");
assert.equal(lt01.ownerRole, STEWARD_BY_CLASS.resource);
assert.equal(lt01.ownerRole, "maintenance-manager");
assert.equal(lt01.criticality, "hard_gate");
assert.equal(effectiveConfidence(lt01), 1);
assert.deepEqual(invalidatedDecisions(registry.edges, lt01.versionId), ["DR-COM-1042-BASE"]);

// Supersession never mutates or deletes the prior version.
const demo = supersessionDemo();
assert.equal(demo.original.status, "active");
assert.equal(demo.original.confidence, 1);
assert.equal(demo.prior.status, "superseded");
assert.equal(Object.isFrozen(demo.prior), true);
assert.equal(demo.successor.status, "active");
assert.equal(demo.successor.memoryId, demo.original.memoryId);
assert.equal(demo.successor.supersedesVersionId, demo.prior.versionId);

// The confidence gate: a superseded hard-gate memory crosses the reapproval threshold.
const ruleMemories = memoriesFor("COM-1042");
assert.equal(hardGateConfidence(ruleMemories), 1);
assert.equal(reapprovalRequired(ruleMemories), false);
const withSuperseded = ruleMemories.map((memory) =>
  memory.memoryId === "MEM-RM-RES-LT-01" ? demo.successor : memory,
);
assert.equal(hardGateConfidence(withSuperseded), 0.62);
assert.equal(reapprovalRequired(withSuperseded), true);

// D-21 exemplar: a source-down memory is quarantined, not silently dropped.
const sourceDown = sourceDownExample();
assert.equal(sourceDown.status, "quarantined");
assert.equal(effectiveConfidence(sourceDown), 0);

// The run fingerprint now pins memory + snapshot identity (N-05), still deterministic.
assert.match(canonicalResult(first), /"memorySetVersion":"MEM-MS-2026-09-26"/);
assert.equal(canonicalResult(first), canonicalResult(second));
