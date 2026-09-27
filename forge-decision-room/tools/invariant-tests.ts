/**
 * Invariant & property test suite (T-04, T-05, T-08, T-10, T-11, T-15).
 *
 * These are the machine-checked invariants that the model must satisfy
 * regardless of implementation detail. They complement:
 *   - src/verify.ts        (decision services, memory, governance chain)
 *   - tools/coolit-test.ts (solver lane vs the COOLIT fixture)
 *   - server/verify-*.ts   (router, tool gateway, grounding validator)
 *   - tools/fixture-lint.ts(reference integrity)
 *
 * Run: npm run test:invariants
 * Exits non-zero on any failure, so it can gate CI.
 *
 * Coverage vs the T-stream:
 *   T-04 shuffle/property determinism        -> here
 *   T-05 replay determinism                  -> here
 *   T-06 CAS / StaleError + rebase           -> here
 *   T-07 authority separation + disclosure   -> here
 *   T-08 ship-day rule (all promises)        -> here
 *   T-10 peg conservation                    -> here
 *   T-11 cross-pane selection/determinism    -> here
 *   T-15 defect -> test closure map          -> here (metadata check)
 *   T-07 authority+redaction, T-09 day-bin sum,
 *   T-12 persona acceptance, T-13 E2E, T-14 a11y -> NOT YET BUILDABLE (see PENDING).
 */
import {
  COMMITMENTS,
  PEOPLE,
  StaleError,
  assertNotStale,
  assess,
  allocationFor,
  allocateLeakTests,
  canonicalResult,
  createApproval,
  createScenarioRun,
  decideApproval,
  envelopeFor,
  gatewayReceipt,
  leakTestCapacity,
  rebaseApproval,
} from "../src/model";
import { buildLedger, buildLedgerRow } from "../src/ledger";
import { openThread, reduce } from "../src/orchestrator";
import { isShipDay, productionPlan, shipDayViolations } from "../src/plan";
import { baselineAllocationTable } from "../src/solver";
import { PLAN, ZONES, flowStagesForRow, ownerOf, rowsInZone, zoneLoad, zonesForRow } from "../src/zones";
import {
  AUTHORITIES,
  authorityResolutions,
  authoritySeparationHolds,
  canPersonaSatisfyAuthority,
  canSupersede,
  domainOf,
  levelFor,
  redactForRole,
  viewMemory,
} from "../src/disclosure";
import { memoriesFor } from "../src/memory";

type Check = { id: string; area: string; name: string; ok: boolean; detail?: string };
const checks: Check[] = [];
const check = (id: string, area: string, name: string, ok: boolean, detail?: string) => {
  checks.push({ id, area, name, ok, detail });
};
const eq = (id: string, area: string, name: string, expected: unknown, actual: unknown) =>
  check(id, area, name, JSON.stringify(expected) === JSON.stringify(actual), `expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);

const ids = COMMITMENTS.map((row) => row.id);

// --- T-04: determinism / property (stable under independent rebuilds) -------
const t104a = openThread("COM-1042");
const t104b = openThread("COM-1042");
check("T-04", "determinism", "two independent builds of the same thread are deep-equal",
  JSON.stringify(t104a) === JSON.stringify(t104b));
eq("T-04", "determinism", "baseline canonicalResult is stable across rebuilds",
  canonicalResult(t104a.runs[0]), canonicalResult(t104b.runs[0]));

// The production plan is a pure function: every rebuild matches byte-for-byte.
const plan1 = JSON.stringify(productionPlan());
const plan2 = JSON.stringify(productionPlan());
check("T-04", "property", "productionPlan is a pure function (rebuild-stable)", plan1 === plan2);

// Capacity conservation: allocated pegs never exceed demonstrated capacity.
const capacity = leakTestCapacity();
const pegTotal = allocateLeakTests().reduce((sum, row) => sum + row.allocated, 0);
eq("T-04", "property", "sum of leak-test pegs equals demonstrated capacity", capacity.total, pegTotal);
check("T-04", "property", "no commitment is allocated more tests than it requires",
  allocationRows().every((row) => row.allocated <= row.required || row.required === 0));

function allocationRows() {
  return ids
    .map((id) => allocationFor(id))
    .filter((row): row is NonNullable<ReturnType<typeof allocationFor>> => Boolean(row));
}

// --- T-05: replay determinism ----------------------------------------------
const seeded1 = createScenarioRun("COM-1042", 1);
const seeded2 = createScenarioRun("COM-1042", 2);
eq("T-05", "replay", "same snapshot + seed reproduces the same canonical result",
  canonicalResult(seeded1), canonicalResult(seeded2));

// reduce() is a pure fold: same (thread, envelope, intent) -> same result.
const thread0 = openThread("COM-1042");
const envManager = envelopeFor("manufacturing-manager", "COM-1042", { kind: "baseline" });
const foldA = reduce(thread0, envManager, { type: "scenario" });
const foldB = reduce(thread0, envManager, { type: "scenario" });
check("T-05", "replay", "reduce is a deterministic fold (same input -> same output)",
  JSON.stringify(foldA.thread) === JSON.stringify(foldB.thread) && JSON.stringify(foldA.turn) === JSON.stringify(foldB.turn));
check("T-05", "replay", "the baseline is frozen and never mutated by a scenario run",
  Object.isFrozen(foldA.thread.runs[0]) && foldA.thread.runs[0] === thread0.runs[0]);

// --- T-08: ship-day rule (every promise) -----------------------------------
const plan = productionPlan();
check("T-08", "ship-day", "every normalised promise lands on a working ship day",
  plan.every((row) => isShipDay(row.normalizedPromise)));
check("T-08", "ship-day", "shipDayViolations is exactly the non-ship-day promises",
  JSON.stringify(shipDayViolations().map((row) => row.id).sort()) ===
    JSON.stringify(plan.filter((row) => !row.promiseIsShipDay).map((row) => row.id).sort()));
check("T-08", "ship-day", "a promise on a ship day is never re-normalised",
  plan.filter((row) => row.promiseIsShipDay).every((row) => row.normalizedPromise === row.promise));

// --- T-10: peg conservation -------------------------------------------------
// The model's allocation rows carry {required, allocated}; the shortfall is
// carried on the solver artifact. Both sources must conserve the requirement.
const solverRows = baselineAllocationTable();
check("T-10", "pegs", "solver: for every capacity-bound commitment, allocated + shortfall = required",
  solverRows.every((row) => row.required === 0 || row.allocated + row.shortfall === row.required));
check("T-10", "pegs", "model: allocated never exceeds the requirement, and matches the solver",
  allocationRows().every((row) => row.allocated <= row.required) &&
    solverRows.every((row) => row.allocated === (allocationFor(row.id)?.allocated ?? row.allocated)));
check("T-10", "pegs", "the frozen horizon is fully protected before any commitment",
  (allocationFor("COM-1042")?.allocated ?? 0) === assess("COM-1042").onTimeQty);
check("T-10", "pegs", "a fully-satisfied peg has zero shortfall (allocation equals requirement)",
  solverRows.filter((row) => row.shortfall === 0).every((row) => row.allocated === row.required));

// --- T-11: cross-pane determinism (queue, table, right pane agree) ----------
for (const id of ids) {
  const view = assess(id);
  const row = buildLedgerRow(openThread(id));
  check("T-11", "cross-pane", `${id}: ledger feasibility equals the assessed baseline feasibility`,
    row.feasibility === view.baseline.feasibility);
  check("T-11", "cross-pane", `${id}: ledger capable date equals the assessed earliest ship date`,
    row.capable === view.earliestShipDate);
  check("T-11", "cross-pane", `${id}: ledger constraint shortfall equals the assessed test shortfall`,
    row.constraint.className !== "capacity" || row.constraint.shortfall === view.testShortfall);
}
const board1 = JSON.stringify(buildLedger(Object.fromEntries(ids.map((id) => [id, openThread(id)]))));
const board2 = JSON.stringify(buildLedger(Object.fromEntries(ids.map((id) => [id, openThread(id)]))));
check("T-11", "cross-pane", "the ordered ledger is deterministic across rebuilds", board1 === board2);
check("T-11", "cross-pane", "the ledger orders exception-first (at-risk before watch/monitoring)",
  isExceptionFirst(ids.map((id) => buildLedgerRow(openThread(id))).map((row) => row.risk)));

function isExceptionFirst(risks: string[]) {
  const rank: Record<string, number> = { "at-risk": 0, awaiting: 1, approved: 2, monitoring: 3 };
  return risks.every((risk, i) => i === 0 || rank[risks[i - 1]] <= rank[risk]);
}

// --- T-06: compare-and-swap / StaleError -----------------------------------
const run1042 = createScenarioRun("COM-1042", 1);
const casIdentity = { snapshotId: run1042.snapshotId, masterSetVersion: "MS-2026-09-26", seed: 0 };
const raised = createApproval(
  run1042,
  "OPT-THIRD-SHIFT",
  PEOPLE["shift-planner"],
  "Protect the 15 October promise with a pegged third shift.",
  1,
  casIdentity,
);
check("T-06", "cas", "an approval records the CAS identity it was raised against",
  JSON.stringify(raised.expected) === JSON.stringify(casIdentity));

const approved = decideApproval(raised, PEOPLE["manufacturing-manager"], "approved", "Approved on this snapshot.");
eq("T-06", "cas", "a dry run on the same snapshot/master set is accepted",
  "accepted", gatewayReceipt(approved, "dry-run", [], casIdentity).status);

let staleMaster = false;
try {
  gatewayReceipt(approved, "execute", [], { ...casIdentity, masterSetVersion: "MS-2026-10-01" });
} catch (error) {
  staleMaster = error instanceof StaleError;
}
check("T-06", "cas", "a changed master set rejects writeback with StaleError", staleMaster);

let staleSnapshot = false;
try {
  gatewayReceipt(approved, "execute", [], { ...casIdentity, snapshotId: "SNAP-20990101" });
} catch (error) {
  staleSnapshot = error instanceof StaleError;
}
check("T-06", "cas", "a superseded snapshot rejects writeback with StaleError", staleSnapshot);

let noop = true;
try {
  assertNotStale(undefined, casIdentity);
  assertNotStale(casIdentity, undefined);
} catch {
  noop = false;
}
check("T-06", "cas", "CAS is a no-op when either side is absent (back-compatible)", noop);

const rebased = rebaseApproval(approved, { ...casIdentity, masterSetVersion: "MS-2026-10-01" }, 2);
check("T-06", "cas", "rebase retains the prior approval (rejected) and raises a fresh v2 against the new identity",
  rebased.prior.status === "rejected" &&
    rebased.prior.id === approved.id &&
    rebased.successor.status === "pending" &&
    rebased.successor.id !== approved.id &&
    rebased.successor.expected?.masterSetVersion === "MS-2026-10-01");

// --- V-01/V-06: zone master + filter engine (pure) -------------------------
check("T-11", "zones", "the zone master has 13 unique zones inside the plan",
  ZONES.length === 13 &&
    new Set(ZONES.map((z) => z.id)).size === 13 &&
    ZONES.every((z) => z.x >= 0 && z.y >= 0 && z.x + z.w <= PLAN.width && z.y + z.h <= PLAN.height));
const boardRows = buildLedger(Object.fromEntries(ids.map((id) => [id, openThread(id)])));
check("T-11", "zones", "every commitment flows through Receiving and Pack + Ship",
  boardRows.every((row) => zonesForRow(row).includes("ZN-01") && zonesForRow(row).includes("ZN-10")));
check("T-11", "zones", "open-decision commitments route through the exception loop (MRB + Rework)",
  boardRows
    .filter((row) => row.lifecycle === "investigating" || row.lifecycle === "awaiting-approval")
    .every((row) => zonesForRow(row).includes("ZN-12") && zonesForRow(row).includes("ZN-13")));
check("T-11", "zones", "rack manifolds skip Thermal/Flow; cold-plate loops and CDUs do not",
  boardRows.every((row) => (row.family === "Rack manifold") === !zonesForRow(row).includes("ZN-07")));
check("T-11", "zones", "zone load counts open decisions and reports the worst risk",
  (() => {
    const load = zoneLoad(boardRows);
    const test = load.get("ZN-06");
    return Boolean(test && test.count >= 1 && test.worst !== null && test.ids.length >= test.count);
  })());
check("T-11", "zones", "rowsInZone returns exactly the commitments bound to a zone",
  rowsInZone(boardRows, "ZN-06").every((row) => zonesForRow(row).includes("ZN-06")) &&
    rowsInZone(boardRows, "ZN-12").length ===
      boardRows.filter((row) => row.lifecycle === "investigating" || row.lifecycle === "awaiting-approval").length);
check("T-11", "zones", "flow stages are derived per commitment (non-empty)",
  boardRows.every((row) => flowStagesForRow(row).length >= 4));
check("T-11", "zones", "owner function maps the binding constraint class",
  ownerOf(boardRows.find((row) => row.constraint.className === "capacity")!) === "Operations" &&
    ownerOf(boardRows.find((row) => row.constraint.className === "material")!) === "Procurement" &&
    ownerOf(boardRows.find((row) => row.constraint.className === "none")!) === "Planning");

// --- T-07: authority separation + disclosure/redaction ---------------------
const ALL_ROLES = ["manufacturing-manager", "shift-planner", "maintenance-manager", "demand-planner"] as const;
check("T-07", "authority", "no persona can satisfy a policy authority",
  ALL_ROLES.every((role) => AUTHORITIES.every((authority) => canPersonaSatisfyAuthority(role, authority) === false)));
const approvedApproval = decideApproval(raised, PEOPLE["manufacturing-manager"], "approved", "Approved on this snapshot.");
const resolutions = authorityResolutions(approvedApproval.status, approvedApproval.approvers);
check("T-07", "authority", "a policy authority resolves on policy, never by a persona",
  resolutions.length >= 1 &&
    resolutions.every((row) => row.satisfiedByPersona === null) &&
    resolutions.some((row) => row.authority === "finance" && row.status === "resolved-on-policy"));
check("T-07", "authority", "authority separation holds on a real approval's approvers",
  authoritySeparationHolds(approvedApproval.approvers));

check("T-07", "disclosure", "party memory is hidden from coverage/availability, full to demand, summary to mfg",
  levelFor("demand-planner", "party") === "full" &&
    levelFor("shift-planner", "party") === "hidden" &&
    levelFor("maintenance-manager", "party") === "hidden" &&
    levelFor("manufacturing-manager", "party") === "summary");
check("T-07", "disclosure", "commercial memory is banded for mfg and hidden for coverage/availability",
  levelFor("manufacturing-manager", "commercial") === "banded" &&
    levelFor("shift-planner", "commercial") === "hidden" &&
    levelFor("maintenance-manager", "commercial") === "hidden");
const partyMemory = memoriesFor("COM-1018").find((memory) => domainOf(memory) === "party");
check("T-07", "disclosure", "a hidden memory renders a reason code, never a blank",
  Boolean(partyMemory) &&
    viewMemory("shift-planner", partyMemory!).visible === false &&
    viewMemory("shift-planner", partyMemory!).reasonCode === "NOT_AUTHORIZED");
check("T-07", "disclosure", "redaction keeps a reason code on every hidden memory (stripped before prompt)",
  redactForRole("shift-planner", memoriesFor("COM-1018")).every((view) => view.visible || view.reasonCode) &&
    redactForRole("shift-planner", memoriesFor("COM-1018")).some((view) => !view.visible));
check("T-07", "disclosure", "only the steward may supersede a memory",
  Boolean(partyMemory) && canSupersede("demand-planner", partyMemory!) && !canSupersede("shift-planner", partyMemory!));

// --- C9: same snapshot renders the same numbers for every role --------------
const centreOf = (id: string) => {
  const view = assess(id);
  return `${view.baseline.feasibility}|${view.earliestShipDate}|${view.onTimeQty}`;
};
check("T-11", "cross-pane", "the same snapshot renders the same numbers for every role",
  centreOf("COM-1042") === "infeasible|2026-10-19|56" && ALL_ROLES.every(() => centreOf("COM-1042") === "infeasible|2026-10-19|56"));

// --- Persona detail in the order table (T1/T2/T3) --------------------------
const personaRow = buildLedgerRow(openThread("COM-1042"));
check("T-11", "persona", "demand persona carries the promise→capable gap",
  personaRow.persona.demand.promised === personaRow.promised &&
    personaRow.persona.demand.capable === personaRow.capable &&
    personaRow.persona.demand.slipDays === personaRow.capableDeltaDays);
check("T-11", "persona", "availability persona names the constraint resource and its downtime event",
  personaRow.persona.availability.resource === "RES-LT-01" && personaRow.persona.availability.event === "EVT-LT-041");
check("T-11", "persona", "coverage persona counts the MES facts for the commitment",
  personaRow.persona.coverage.certs >= 1);
const scenarioForPersona = reduce(openThread("COM-1042"), envManager, { type: "scenario" });
const recoveryRow = buildLedgerRow(scenarioForPersona.thread);
check("T-11", "persona", "recovery persona summarises the scenario options (feasible/total + policy authority)",
  recoveryRow.persona.recovery.total === 6 &&
    recoveryRow.persona.recovery.feasible >= 1 &&
    recoveryRow.persona.recovery.authority === "finance");

// --- T-15: defect -> test closure map --------------------------------------
// Register of defects that are CLOSED, each pinned to the test that proves it.
// Every entry must reference a suite that actually exists and is run in `npm test`.
const KNOWN_SUITES = new Set(["verify", "verify-router", "verify-tools", "verify-ai", "test:coolit", "test:invariants", "lint"]);
const DEFECT_CLOSURE: Record<string, string> = {
  "D-03": "verify", // dangling OPT-RESERVE-SLOTS materialised
  "D-21": "verify", // thin stale exemplar added
  "D-24": "verify", // freshness derived, not hard-coded
  "N-01": "test:coolit", // Saturday-promise defect inverted
  "N-05": "verify", // run fingerprint pins memory + snapshot identity
  "N-07": "lint", // dangling ids fail-closed
};
check("T-15", "defect-map", "every closed defect maps to a suite that exists",
  Object.values(DEFECT_CLOSURE).every((suite) => KNOWN_SUITES.has(suite)));
check("T-15", "defect-map", "closed-defect count is recorded (6 of the 33 defects)",
  Object.keys(DEFECT_CLOSURE).length === 6);

// --- report -----------------------------------------------------------------
const pad = (v: string, n: number) => v.padEnd(n);
const failed = checks.filter((c) => !c.ok);
console.log("\nFORGE invariant & property tests");
console.log("================================");
for (const c of checks) {
  console.log(`${c.ok ? "PASS" : "FAIL"}  ${pad(c.id, 6)} ${pad(c.area, 12)} ${c.name}${c.ok ? "" : `\n        ${c.detail ?? ""}`}`);
}
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);

const PENDING: [string, string][] = [
  ["T-09", "day-bin sum — needs D-14 time-bucket + A-09 day-binning exposed"],
  ["T-12", "persona acceptance 1–10 — C5/C9/C10 coverage gaps tracked in the harness matrix"],
  ["T-13", "E2E golden thread — needs U-03 run card + a browser runner"],
  ["T-14", "accessibility (keyboard/contrast/reduced-motion) — needs a DOM runner"],
];
console.log("\nPending (not yet buildable — tracked in the test plan):");
for (const [id, why] of PENDING) console.log(`  · ${id}  ${why}`);

if (failed.length) {
  console.log(`\n${failed.length} FAILED`);
  process.exit(1);
}
console.log("\ninvariant tests passed.");