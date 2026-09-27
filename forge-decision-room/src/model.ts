/**
 * Deterministic decision services.
 * Official inventory, capacity, dates, and feasibility are computed here.
 * The conversation layer may only explain these results.
 */

export const SNAPSHOT_ID = "SNAP-20260926-0815";
export const AS_OF = "2026-09-26T08:15:00-06:00";
export const MODEL_VERSION = "ctp-0.3.0";
export const CODE_VERSION = "decision-services@0.1.0";
/**
 * Memory-set version — the identity of the master/fact memory set a run consumed.
 * Added in ctp-0.3.0 so the run fingerprint pins memory identity, not only the
 * model code (M0 slice; migration note in docs/forge-model-ctp-0.3.0-migration.md).
 */
export const MEMORY_SET_VERSION = "MEM-MS-2026-09-26";
export const TENANT_ID = "TENANT-COOLIT-SYNTH";
export const SITE_ID = "SITE-YYC-01";
export const SITE_LABEL = "YYC-01";
export const FINANCE_THRESHOLD_CAD = 5000;
export const OT_RATE_CAD = 92;
export const OT_PREMIUM = 1.5;
export const SHIFT_HOURS = 8;
export const RATE_PER_SHIFT = 16;
export const BASE_SHIFTS = 2;
export const FROZEN_TESTS = 200;
export const RECOVERY_DAILY_RATE = BASE_SHIFTS * RATE_PER_SHIFT;

export type Role =
  | "shift-planner"
  | "manufacturing-manager"
  | "maintenance-manager"
  | "demand-planner";

export type QueueState = "at-risk" | "awaiting" | "approved" | "monitoring";
export type Phase = "orient" | "investigate" | "compare" | "approve" | "act" | "observe";
export type Feasibility = "feasible" | "infeasible";

/**
 * Policy authorities are not selectable personas. They are named approval
 * requirements (Finance, Quality, Program/Customer, Procurement) that resolve
 * against policy, per the right-pane persona design §10.1.
 */
export type AuthorityId = "finance" | "quality" | "program" | "procurement";

/** The lens a persona uses to scope the right pane and the left queue. */
export type RoleLens = "coverage" | "throughput" | "availability" | "demand";

export type RolePolicy = {
  lens: RoleLens;
  leadQuestion: string;
  /** May select an operational alternative from a scenario run. */
  canSelectOptions: boolean;
  /** May raise a named approval request. */
  canPropose: boolean;
  /** May record an approval decision when named as approver. */
  canApprove: boolean;
  /** May dry-run / simulate a writeback once approval is complete. */
  canExecute: boolean;
};

export const ROLE_POLICY: Record<Role, RolePolicy> = {
  "shift-planner": {
    lens: "coverage",
    leadQuestion: "Can we cover it, and with whom?",
    canSelectOptions: true,
    canPropose: true,
    canApprove: false,
    canExecute: false,
  },
  "manufacturing-manager": {
    lens: "throughput",
    leadQuestion: "What slips, what does it cost, and who decides?",
    canSelectOptions: true,
    canPropose: true,
    canApprove: true,
    canExecute: true,
  },
  "maintenance-manager": {
    lens: "availability",
    leadQuestion: "Why is the asset down, and when is it back?",
    canSelectOptions: true,
    canPropose: true,
    canApprove: true,
    canExecute: true,
  },
  "demand-planner": {
    lens: "demand",
    leadQuestion: "Which requests are at risk, and how bad is the gap?",
    canSelectOptions: false,
    canPropose: true,
    canApprove: false,
    canExecute: false,
  },
};

export type Person = { id: string; name: string; role: Role; roleLabel: string };

export const PEOPLE: Record<Role, Person> = {
  "shift-planner": {
    id: "USR-SHIFT-01",
    name: "Jordan Adeyemi",
    role: "shift-planner",
    roleLabel: "Shift Planner",
  },
  "manufacturing-manager": {
    id: "USR-MFG-01",
    name: "Rowan Hale",
    role: "manufacturing-manager",
    roleLabel: "Manufacturing Manager",
  },
  "maintenance-manager": {
    id: "USR-MNT-01",
    name: "Priya Shah",
    role: "maintenance-manager",
    roleLabel: "Maintenance Manager",
  },
  "demand-planner": {
    id: "USR-DEM-01",
    name: "Luis Okada",
    role: "demand-planner",
    roleLabel: "Demand Planner",
  },
};

export type ContextEnvelope = {
  user: Person;
  tenantId: string;
  siteId: string;
  siteLabel: string;
  commitmentId: string;
  product: string;
  program: string;
  scenario: { kind: "baseline" } | { kind: "scenario"; runId: string };
  asOf: string;
  snapshotId: string;
  modelVersion: string;
  freshness: { fresh: number; stale: number };
  unresolvedConflicts: number;
  lens: RoleLens;
  policy: RolePolicy;
  authorization: {
    scope: string;
    canApproveRoles: Role[];
    canExecuteWithoutGateway: false;
    calculatesOfficialQuantities: false;
  };
};

export type SourceFact = {
  id: string;
  statement: string;
  sourceSystem: string;
  sourceRecordId: string;
  observedAt: string;
  ingestedAt: string;
  freshness: "fresh" | "stale";
};

export type DerivedFact = {
  id: string;
  name: string;
  formula: string;
  inputs: string[];
  result: string;
  service: string;
  traceId: string;
};

export type Conflict = {
  id: string;
  statement: string;
  sources: { system: string; recordId: string; value: string }[];
  disposition: "quarantined";
};

export type CommitEvidencePacket = {
  id: string;
  commitmentId: string;
  snapshotId: string;
  asOf: string;
  sourceFacts: SourceFact[];
  derivedFacts: DerivedFact[];
  lineage: { from: string; to: string; via: string }[];
  freshness: { fresh: number; stale: number; staleRecords: string[] };
  assumptions: string[];
  conflicts: Conflict[];
  missing: string[];
};

export type HardGate = { id: string; label: string };

export type ApproverRequirement = {
  role: Role;
  reason: string;
  /** Optional policy authority this persona approval must satisfy (Finance/Quality/Program/Procurement). */
  authority?: AuthorityId;
};

export type Alternative = {
  id: string;
  label: string;
  feasibility: Feasibility;
  meetsPromise: boolean;
  changesPromise: boolean;
  violatedHardConstraints: HardGate[];
  residualShortfall: number;
  onTimeQty: number;
  lateQty: number;
  shipDate: string;
  lateShipDate: string | null;
  costCad: number | null;
  costNote: string | null;
  assumptions: string[];
  evidenceGaps: string[];
  tradeoffs: string[];
  whyRejected: string | null;
  approvers: ApproverRequirement[];
};

export type DecisionRun = {
  id: string;
  kind: "baseline" | "scenario";
  commitmentId: string;
  snapshotId: string;
  modelVersion: string;
  codeVersion: string;
  traceId: string;
  createdAt: string;
  expiresAt: string;
  objective: string;
  hardConstraints: string[];
  feasibility: Feasibility;
  bindingConstraint: string | null;
  requiredTests: number;
  allocatedTests: number;
  shortfall: number;
  earliestShipDate: string;
  alternatives: Alternative[];
  immutable: true;
};

export type ApprovalDecision = {
  role: Role;
  approverId: string;
  approverName: string;
  reason: string;
  authority?: AuthorityId;
  status: "pending" | "approved" | "rejected";
  rationale: string;
  decidedAt: string | null;
};

export type ApprovalRequest = {
  id: string;
  runId: string;
  optionId: string;
  commitmentId: string;
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  expiresAt: string;
  requestRationale: string;
  status: "pending" | "approved" | "rejected";
  approvers: ApprovalDecision[];
  /** The compare-and-swap identity this approval was raised against (K-10). */
  expected?: CasContext;
};

export type ActionReceipt = {
  id: string;
  approvalId: string;
  runId: string;
  optionId: string;
  mode: "dry-run" | "execute";
  status: "accepted" | "rejected";
  idempotencyKey: string;
  attemptedAt: string;
  gateway: "simulated-writeback";
  target: string;
  baselineMutated: false;
  reconciliation: "pending" | "rejected" | "not-applicable";
  detail: string;
};

export type ObservedOutcome = {
  id: string;
  receiptId: string;
  commitmentId: string;
  expected: string;
  observed: string;
  successful: false;
  reason: string;
  observedAt: string;
};

/**
 * Compare-and-swap identity (K-10). An approval captures the identity it was
 * raised against; execution must present the *current* identity. A mismatch is
 * `StaleError` — the run must be re-based (v2 + diff), never force-executed.
 */
export type CasContext = {
  snapshotId: string;
  masterSetVersion: string;
  seed: number;
};

export class StaleError extends Error {
  readonly code = "STALE";
  readonly expected: CasContext;
  readonly actual: CasContext;
  readonly changes: string[];
  constructor(expected: CasContext, actual: CasContext, changes: string[]) {
    super(`Stale: ${changes.join("; ")}`);
    this.name = "StaleError";
    this.expected = expected;
    this.actual = actual;
    this.changes = changes;
  }
}

/** Throws `StaleError` when a supplied current context differs from the expected one. */
export function assertNotStale(expected: CasContext | undefined, current: CasContext | undefined): void {
  if (!expected || !current) return;
  const changes: string[] = [];
  if (expected.snapshotId !== current.snapshotId) changes.push(`snapshot ${expected.snapshotId} -> ${current.snapshotId}`);
  if (expected.masterSetVersion !== current.masterSetVersion) {
    changes.push(`master set ${expected.masterSetVersion} -> ${current.masterSetVersion}`);
  }
  if (expected.seed !== current.seed) changes.push(`seed ${expected.seed} -> ${current.seed}`);
  if (changes.length) throw new StaleError(expected, current, changes);
}

export type ToolName =
  | "get_evidence_packet"
  | "explain_risk"
  | "get_causal_chain"
  | "get_blast_radius"
  | "create_decision_run"
  | "compare_alternatives"
  | "draft_communication"
  | "create_approval_request"
  | "record_approval_decision"
  | "dry_run_action"
  | "simulate_writeback"
  | "record_outcome";

export type Commitment = {
  id: string;
  customer: string;
  program: string;
  family: string;
  product: string;
  qty: number;
  uom: string;
  promiseDate: string;
  priority: number;
  queue: QueueState;
  owner: string;
  leakTests: number;
  summary: string;
};

export const COMMITMENTS: Commitment[] = [
  {
    id: "COM-1042",
    customer: "Northline Compute",
    program: "NL-ORION",
    family: "Cold-plate loop",
    product: "CPL-480",
    qty: 120,
    uom: "loops",
    promiseDate: "2026-10-15",
    priority: 3,
    queue: "at-risk",
    owner: "Supply Planner",
    leakTests: 120,
    summary: "15 October promise is short 64 leak tests",
  },
  {
    id: "COM-1018",
    customer: "BrightGrid Colo",
    program: "BG-M7",
    family: "Rack manifold",
    product: "RM-42",
    qty: 80,
    uom: "manifolds",
    promiseDate: "2026-10-15",
    priority: 2,
    queue: "awaiting",
    owner: "Supply Planner",
    leakTests: 0,
    summary: "Substitution approval is open",
  },
  {
    id: "COM-1104",
    customer: "Helios Rack",
    program: "HX-9",
    family: "CDU",
    product: "CDU-2400",
    qty: 24,
    uom: "CDUs",
    promiseDate: "2026-10-10",
    priority: 1,
    queue: "approved",
    owner: "Operations Leader",
    leakTests: 48,
    summary: "48 leak-test slots reserved",
  },
  {
    id: "COM-0991",
    customer: "Northline Compute",
    program: "NL-ORION",
    family: "Cold-plate loop",
    product: "CPL-320",
    qty: 40,
    uom: "loops",
    promiseDate: "2026-11-06",
    priority: 5,
    queue: "monitoring",
    owner: "Supply Planner",
    leakTests: 0,
    summary: "Feasible on the 6 November bucket",
  },
];

const QUEUE_ORDER: QueueState[] = ["at-risk", "awaiting", "approved", "monitoring"];

export function commitmentsInQueue(): Commitment[] {
  return [...COMMITMENTS].sort(
    (a, b) => QUEUE_ORDER.indexOf(a.queue) - QUEUE_ORDER.indexOf(b.queue),
  );
}

export function commitment(id: string): Commitment {
  const found = COMMITMENTS.find((row) => row.id === id);
  if (!found) throw new Error(`Unknown commitment ${id}`);
  return found;
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isWeekend(iso: string): boolean {
  const [year, month, day] = iso.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 || weekday === 6;
}

export function businessDaysInclusive(start: string, end: string): string[] {
  const days: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    if (!isWeekend(cursor)) days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function nextBusinessDay(iso: string): string {
  let cursor = addDays(iso, 1);
  while (isWeekend(cursor)) cursor = addDays(cursor, 1);
  return cursor;
}

export function formatDay(iso: string, withYear = false): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: withYear ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(date);
}

export function weekday(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

const HEALTHY_DAYS = businessDaysInclusive("2026-09-28", "2026-10-05");
const DEGRADED_DAYS = businessDaysInclusive("2026-10-06", "2026-10-14");

export function leakTestCapacity() {
  const healthy = HEALTHY_DAYS.length * BASE_SHIFTS * RATE_PER_SHIFT;
  const degraded = DEGRADED_DAYS.length * BASE_SHIFTS * (RATE_PER_SHIFT / 2);
  return {
    healthyDays: HEALTHY_DAYS,
    degradedDays: DEGRADED_DAYS,
    healthy,
    degraded,
    total: healthy + degraded,
  };
}

export type Allocation = { id: string; priority: number; required: number; allocated: number };

export function allocateLeakTests(): Allocation[] {
  const capacity = leakTestCapacity().total;
  const demand = [
    { id: "FROZEN-HORIZON", priority: 0, required: FROZEN_TESTS },
    ...COMMITMENTS.filter((row) => row.leakTests > 0).map((row) => ({
      id: row.id,
      priority: row.priority,
      required: row.leakTests,
    })),
  ].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));

  let remaining = capacity;
  return demand.map((row) => {
    const allocated = Math.min(row.required, remaining);
    remaining -= allocated;
    return { ...row, allocated };
  });
}

export function allocationFor(id: string): Allocation {
  const row = allocateLeakTests().find((item) => item.id === id);
  if (!row) return { id, priority: 99, required: 0, allocated: 0 };
  return row;
}

function trace(commitmentId: string, name: string): string {
  return `tr-${SNAPSHOT_ID}-${commitmentId}-${name}`;
}

function fact(
  partial: Omit<SourceFact, "freshness"> & { freshness?: "fresh" | "stale" },
): SourceFact {
  const staleCutoff = "2026-09-26T04:15:00-06:00";
  const freshness = partial.freshness ?? (partial.ingestedAt < staleCutoff ? "stale" : "fresh");
  return { ...partial, freshness };
}

function derived(
  commitmentId: string,
  name: string,
  formula: string,
  inputs: string[],
  result: string,
): DerivedFact {
  return {
    id: `CALC-${commitmentId}-${name}`,
    name,
    formula,
    inputs,
    result,
    service: MODEL_VERSION,
    traceId: trace(commitmentId, name),
  };
}

export type Assessment = {
  commitment: Commitment;
  packet: CommitEvidencePacket;
  baseline: DecisionRun;
  testShortfall: number;
  materialShortfall: number;
  onTimeQty: number;
  earliestShipDate: string;
};

function shipAfterShortfall(shortfall: number, promiseDate: string): string {
  if (shortfall <= 0) return promiseDate;
  const testDays = Math.ceil(shortfall / RECOVERY_DAILY_RATE);
  let lastTest = "2026-10-15";
  for (let index = 1; index < testDays; index += 1) lastTest = nextBusinessDay(lastTest);
  return nextBusinessDay(lastTest);
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as object)) freeze(child);
  }
  return value;
}

function baselineRun(
  row: Commitment,
  feasibility: Feasibility,
  binding: string | null,
  shortfall: number,
  earliestShipDate: string,
  allocated: number,
  alternatives: Alternative[] = [],
): DecisionRun {
  return freeze({
    id: `DR-${row.id}-BASE`,
    kind: "baseline" as const,
    commitmentId: row.id,
    snapshotId: SNAPSHOT_ID,
    modelVersion: MODEL_VERSION,
    codeVersion: CODE_VERSION,
    traceId: trace(row.id, "baseline"),
    createdAt: AS_OF,
    expiresAt: "2026-09-27T08:15:00-06:00",
    objective: `Ship ${row.qty} ${row.uom} on ${row.promiseDate}.`,
    hardConstraints: [
      "Held, failed, expired, or unqualified supply is not eligible.",
      "Frozen-horizon released work cannot be displaced.",
      "Unapproved sources are not usable.",
      "The baseline promise is not rewritten by a scenario run.",
    ],
    feasibility,
    bindingConstraint: binding,
    requiredTests: row.leakTests,
    allocatedTests: allocated,
    shortfall,
    earliestShipDate,
    alternatives,
    immutable: true as const,
  });
}

function assess1042(): Assessment {
  const row = commitment("COM-1042");
  const capacity = leakTestCapacity();
  const allocated = allocationFor(row.id);
  const higher = FROZEN_TESTS + commitment("COM-1104").leakTests;
  const eligibleOnHand = Math.min(240, 236) - 36;
  const eligibleSupply = eligibleOnHand + 80;
  const requiredPieces = row.qty * 2;
  const materialShortfall = Math.max(0, requiredPieces - eligibleSupply);
  const testShortfall = row.leakTests - allocated.allocated;
  const earliestShipDate = shipAfterShortfall(testShortfall, row.promiseDate);
  const packet: CommitEvidencePacket = {
    id: `EVP-${row.id}`,
    commitmentId: row.id,
    snapshotId: SNAPSHOT_ID,
    asOf: AS_OF,
    sourceFacts: [
      fact({
        id: "SRC-1042-PROMISE",
        statement: "COM-1042 promises 120 CPL-480 loops to Northline Compute on 15 October 2026.",
        sourceSystem: "CRM",
        sourceRecordId: "COM-1042",
        observedAt: "2026-09-20T11:00:00-06:00",
        ingestedAt: "2026-09-26T07:50:00-06:00",
      }),
      fact({
        id: "SRC-1042-DEMAND",
        statement: "Frozen-horizon released work pegs 200 leak tests ahead of this commitment.",
        sourceSystem: "ERP",
        sourceRecordId: "PEG-FROZEN-200",
        observedAt: "2026-09-26T06:40:00-06:00",
        ingestedAt: "2026-09-26T07:55:00-06:00",
      }),
      fact({
        id: "SRC-1042-DOWNTIME",
        statement:
          "Leak-test fixture RES-LT-01 is at half rate from 6 October through 14 October. The event ends 14 October 22:00.",
        sourceSystem: "MES",
        sourceRecordId: "EVT-LT-041",
        observedAt: "2026-09-26T08:10:00-06:00",
        ingestedAt: "2026-09-26T08:12:00-06:00",
      }),
      fact({
        id: "SRC-1042-CAL",
        statement: "Certified leak-test crew can staff one extra shift on each of the 6 healthy days before the downtime.",
        sourceSystem: "MES",
        sourceRecordId: "LAB-LT-CERT",
        observedAt: "2026-09-26T08:00:00-06:00",
        ingestedAt: "2026-09-26T08:11:00-06:00",
      }),
      fact({
        id: "SRC-1042-QD-ERP",
        statement: "ERP physical on-hand for QD-220 is 240, including held lot LOT-8841.",
        sourceSystem: "ERP",
        sourceRecordId: "INV-QD-220",
        observedAt: "2026-09-26T08:01:00-06:00",
        ingestedAt: "2026-09-26T08:02:00-06:00",
      }),
      fact({
        id: "SRC-1042-QD-WMS",
        statement: "WMS physical on-hand for QD-220 is 236, including held lot LOT-8841.",
        sourceSystem: "WMS",
        sourceRecordId: "WMS-QD-220",
        observedAt: "2026-09-26T08:04:00-06:00",
        ingestedAt: "2026-09-26T08:05:00-06:00",
      }),
      fact({
        id: "SRC-1042-HOLD",
        statement: "Quality hold QH-317 covers 36 pieces of lot LOT-8841. The lot is not eligible.",
        sourceSystem: "QMS",
        sourceRecordId: "QH-317",
        observedAt: "2026-09-26T06:40:00-06:00",
        ingestedAt: "2026-09-26T06:55:00-06:00",
      }),
      fact({
        id: "SRC-1042-PO",
        statement: "PO-4481 confirms 80 QD-220 pieces on 8 October 2026.",
        sourceSystem: "ERP",
        sourceRecordId: "PO-4481",
        observedAt: "2026-09-26T07:30:00-06:00",
        ingestedAt: "2026-09-26T07:40:00-06:00",
      }),
      fact({
        id: "SRC-1042-WAIVER",
        statement: "The customer waiver log has no ingested clause for a split shipment.",
        sourceSystem: "CRM",
        sourceRecordId: "CUST-WAIVER-LOG",
        observedAt: "2026-09-24T15:10:00-06:00",
        ingestedAt: "2026-09-24T16:00:00-06:00",
      }),
      fact({
        id: "SRC-1042-RATE",
        statement: "Leak-test overtime rate card is 92 CAD per hour at a 1.5 premium. This is a versioned estimate, not a booked actual.",
        sourceSystem: "FIN",
        sourceRecordId: "FIN-RATE-OT-LT",
        observedAt: "2026-09-01T09:00:00-06:00",
        ingestedAt: "2026-09-26T07:10:00-06:00",
      }),
    ],
    derivedFacts: [
      derived(
        row.id,
        "HEALTHY",
        `${capacity.healthyDays.length} healthy days × ${BASE_SHIFTS} shifts × ${RATE_PER_SHIFT} units`,
        ["LAB-LT-CERT", "EVT-LT-041"],
        String(capacity.healthy),
      ),
      derived(
        row.id,
        "DEGRADED",
        `${capacity.degradedDays.length} degraded days × ${BASE_SHIFTS} shifts × ${RATE_PER_SHIFT / 2} units`,
        ["EVT-LT-041"],
        String(capacity.degraded),
      ),
      derived(
        row.id,
        "CAPACITY",
        `${capacity.healthy} healthy + ${capacity.degraded} degraded`,
        ["CALC-COM-1042-HEALTHY", "CALC-COM-1042-DEGRADED"],
        String(capacity.total),
      ),
      derived(
        row.id,
        "PEGS",
        `${FROZEN_TESTS} frozen + ${commitment("COM-1104").leakTests} COM-1104`,
        ["PEG-FROZEN-200", "COM-1104"],
        String(higher),
      ),
      derived(
        row.id,
        "ALLOCATED",
        `${capacity.total} capacity − ${higher} higher-priority pegs`,
        ["CALC-COM-1042-CAPACITY", "CALC-COM-1042-PEGS"],
        String(allocated.allocated),
      ),
      derived(
        row.id,
        "SHORTFALL",
        `${row.leakTests} required − ${allocated.allocated} allocated`,
        ["CALC-COM-1042-ALLOCATED"],
        String(testShortfall),
      ),
      derived(
        row.id,
        "ELIGIBLE",
        `min(240 ERP, 236 WMS) − 36 held + 80 inbound`,
        ["INV-QD-220", "WMS-QD-220", "QH-317", "PO-4481"],
        String(eligibleSupply),
      ),
      derived(
        row.id,
        "MATERIAL",
        `max(0, ${requiredPieces} required − ${eligibleSupply} eligible)`,
        ["CALC-COM-1042-ELIGIBLE"],
        String(materialShortfall),
      ),
      derived(
        row.id,
        "SHIP",
        `ceil(${testShortfall} / ${RECOVERY_DAILY_RATE}) recovery test days from 15 October, then the next business ship day`,
        ["CALC-COM-1042-SHORTFALL"],
        earliestShipDate,
      ),
    ],
    lineage: [
      { from: "COM-1042", to: "CPL-480", via: "configuration" },
      { from: "CPL-480", to: "QD-220", via: "BOM × 2" },
      { from: "QD-220", to: "QH-317", via: "eligibility" },
      { from: "COM-1042", to: "RES-LT-01", via: "routing leak test" },
      { from: "EVT-LT-041", to: "COM-1042", via: "shared fixture pegging" },
    ],
    freshness: { fresh: 0, stale: 0, staleRecords: [] },
    assumptions: [
      "The third-shift option is pegged only to COM-1042.",
      "Both physical counts include held lot LOT-8841.",
      "Unmatched ERP/WMS quantity is quarantined and excluded by taking the lower count.",
      "Downtime clears after 14 October 22:00, restoring 32 tests per business day.",
      "A ship day requires the prior business day's tests to be complete.",
      "Overtime cost is a versioned estimate, not a booked actual.",
    ],
    conflicts: [
      {
        id: "CNF-QD-220",
        statement: "ERP and WMS disagree by 4 physical QD-220 pieces. Those 4 are quarantined and are not eligible.",
        sources: [
          { system: "ERP", recordId: "INV-QD-220", value: "240" },
          { system: "WMS", recordId: "WMS-QD-220", value: "236" },
        ],
        disposition: "quarantined",
      },
    ],
    missing: [
      "No contract clause or customer waiver is in this snapshot, so a split shipment cannot be established as acceptable.",
    ],
  };
  packet.freshness = summarizeFreshness(packet.sourceFacts);
  return {
    commitment: row,
    packet,
    baseline: baselineRun(row, "infeasible", "Leak-test capacity", testShortfall, earliestShipDate, allocated.allocated),
    testShortfall,
    materialShortfall,
    onTimeQty: allocated.allocated,
    earliestShipDate,
  };
}

function summarizeFreshness(facts: SourceFact[]) {
  const staleRecords = facts.filter((row) => row.freshness === "stale").map((row) => row.sourceRecordId);
  return { fresh: facts.length - staleRecords.length, stale: staleRecords.length, staleRecords };
}

function assess1018(): Assessment {
  const row = commitment("COM-1018");
  const required = 80;
  const eligible = 12;
  const materialShortfall = required - eligible;
  const earliestShipDate = "2026-10-21";
  const packet: CommitEvidencePacket = {
    id: `EVP-${row.id}`,
    commitmentId: row.id,
    snapshotId: SNAPSHOT_ID,
    asOf: AS_OF,
    sourceFacts: [
      fact({
        id: "SRC-1018-PROMISE",
        statement: "COM-1018 promises 80 RM-42 manifolds to BrightGrid Colo on 15 October 2026.",
        sourceSystem: "CRM",
        sourceRecordId: "COM-1018",
        observedAt: "2026-09-18T10:00:00-06:00",
        ingestedAt: "2026-09-26T07:50:00-06:00",
      }),
      fact({
        id: "SRC-1018-SUP",
        statement: "Supplier commit for MV-14 is 70 pieces on 20 October 2026. Eligible on-hand is 12.",
        sourceSystem: "ERP",
        sourceRecordId: "PO-MV14-19",
        observedAt: "2026-09-26T07:20:00-06:00",
        ingestedAt: "2026-09-26T07:32:00-06:00",
      }),
      fact({
        id: "SRC-1018-ALT",
        statement: "Approved alternate MV-14B has 90 eligible pieces on hand. Qualification status is approved.",
        sourceSystem: "QMS",
        sourceRecordId: "AVL-MV-14B",
        observedAt: "2026-09-12T09:00:00-06:00",
        ingestedAt: "2026-09-26T07:35:00-06:00",
      }),
      fact({
        id: "SRC-1018-FT",
        statement: "Functional-test resource RES-FT-02 has slack for this manifold quantity. It does not use RES-LT-01.",
        sourceSystem: "MES",
        sourceRecordId: "RES-FT-02",
        observedAt: "2026-09-26T08:08:00-06:00",
        ingestedAt: "2026-09-26T08:12:00-06:00",
      }),
    ],
    derivedFacts: [
      derived(row.id, "MATERIAL", "80 required − 12 eligible on-hand", ["PO-MV14-19"], String(materialShortfall)),
      derived(row.id, "ALT", "12 on-hand + 90 approved alternate", ["AVL-MV-14B"], "102"),
      derived(
        row.id,
        "FUNCTIONAL",
        "200 functional-test slots − 40 other pegs",
        ["RES-FT-02"],
        "160 available; 80 required",
      ),
    ],
    lineage: [
      { from: "COM-1018", to: "RM-42", via: "configuration" },
      { from: "RM-42", to: "MV-14", via: "BOM × 1" },
      { from: "MV-14", to: "MV-14B", via: "approved substitute group" },
    ],
    freshness: { fresh: 4, stale: 0, staleRecords: [] },
    assumptions: ["Functional test is a separate resource from the shared leak-test fixture."],
    conflicts: [],
    missing: [],
  };
  return {
    commitment: row,
    packet,
    baseline: baselineRun(row, "infeasible", "MV-14 supplier commit", materialShortfall, earliestShipDate, 0),
    testShortfall: 0,
    materialShortfall,
    onTimeQty: 12,
    earliestShipDate,
  };
}

function assess1104(): Assessment {
  const row = commitment("COM-1104");
  const allocated = allocationFor(row.id);
  const packet: CommitEvidencePacket = {
    id: `EVP-${row.id}`,
    commitmentId: row.id,
    snapshotId: SNAPSHOT_ID,
    asOf: AS_OF,
    sourceFacts: [
      fact({
        id: "SRC-1104-PROMISE",
        statement: "COM-1104 promises 24 CDU-2400 units to Helios Rack on 10 October 2026. Each unit requires 2 leak tests.",
        sourceSystem: "CRM",
        sourceRecordId: "COM-1104",
        observedAt: "2026-09-15T09:00:00-06:00",
        ingestedAt: "2026-09-26T07:50:00-06:00",
      }),
      fact({
        id: "SRC-1104-PEG",
        statement: "Priority 1 pegs all 48 leak tests inside the frozen window.",
        sourceSystem: "ERP",
        sourceRecordId: "PEG-1104",
        observedAt: "2026-09-26T06:40:00-06:00",
        ingestedAt: "2026-09-26T07:55:00-06:00",
      }),
    ],
    derivedFacts: [
      derived(
        row.id,
        "ALLOCATED",
        "Priority allocation gives COM-1104 its full 48 tests before COM-1042.",
        ["PEG-1104"],
        `${allocated.allocated} of ${allocated.required}`,
      ),
    ],
    lineage: [
      { from: "COM-1104", to: "CDU-2400", via: "configuration" },
      { from: "CDU-2400", to: "RES-LT-01", via: "2 leak tests per unit" },
    ],
    freshness: { fresh: 2, stale: 0, staleRecords: [] },
    assumptions: ["Two leak tests per CDU are already included in the 48-test peg."],
    conflicts: [],
    missing: [],
  };
  return {
    commitment: row,
    packet,
    baseline: baselineRun(row, "feasible", null, 0, row.promiseDate, allocated.allocated, cduBaselineAlternatives()),
    testShortfall: 0,
    materialShortfall: 0,
    onTimeQty: row.qty,
    earliestShipDate: row.promiseDate,
  };
}

function assess0991(): Assessment {
  const row = commitment("COM-0991");
  const packet: CommitEvidencePacket = {
    id: `EVP-${row.id}`,
    commitmentId: row.id,
    snapshotId: SNAPSHOT_ID,
    asOf: AS_OF,
    sourceFacts: [
      fact({
        id: "SRC-0991-PROMISE",
        statement: "COM-0991 promises 40 CPL-320 loops on 6 November 2026. It has no peg in the 15 October leak-test window.",
        sourceSystem: "CRM",
        sourceRecordId: "COM-0991",
        observedAt: "2026-09-22T14:00:00-06:00",
        ingestedAt: "2026-09-26T07:50:00-06:00",
      }),
      fact({
        id: "SRC-0991-ASN",
        statement: "Supplier ASN for the November bucket is on file and still inside its freshness window.",
        sourceSystem: "ERP",
        sourceRecordId: "ASN-0991-NOV",
        observedAt: "2026-09-26T07:05:00-06:00",
        ingestedAt: "2026-09-26T07:18:00-06:00",
      }),
    ],
    derivedFacts: [
      derived(row.id, "WINDOW", "Leak tests required before 15 October", ["COM-0991"], "0"),
    ],
    lineage: [{ from: "COM-0991", to: "CPL-320", via: "configuration" }],
    freshness: { fresh: 2, stale: 0, staleRecords: [] },
    assumptions: ["November leak-test capacity is outside this snapshot's binding window and is not re-solved here."],
    conflicts: [],
    missing: [],
  };
  return {
    commitment: row,
    packet,
    baseline: baselineRun(row, "feasible", null, 0, row.promiseDate, 0),
    testShortfall: 0,
    materialShortfall: 0,
    onTimeQty: row.qty,
    earliestShipDate: row.promiseDate,
  };
}

const ASSESSMENTS: Record<string, Assessment> = {
  "COM-1042": assess1042(),
  "COM-1018": assess1018(),
  "COM-1104": assess1104(),
  "COM-0991": assess0991(),
};

export function assess(commitmentId: string): Assessment {
  const found = ASSESSMENTS[commitmentId];
  if (!found) throw new Error(`No assessment for ${commitmentId}`);
  return found;
}

function overtimeCost(shifts: number): number {
  return shifts * SHIFT_HOURS * OT_RATE_CAD * OT_PREMIUM;
}

export function scenarioAlternatives(commitmentId: string): Alternative[] {
  if (commitmentId !== "COM-1042" && commitmentId !== "COM-1018") return [];
  if (commitmentId === "COM-1018") return manifoldAlternatives();
  const base = assess("COM-1042");
  const extraShifts = leakTestCapacity().healthyDays.length;
  const thirdCost = overtimeCost(extraShifts);
  const saturdayAdded = BASE_SHIFTS * (RATE_PER_SHIFT / 2);
  const saturdayResidual = base.testShortfall - saturdayAdded;
  return [
    {
      id: "OPT-THIRD-SHIFT",
      label: "Add a certified third shift on the six healthy days",
      feasibility: "feasible",
      meetsPromise: true,
      changesPromise: false,
      violatedHardConstraints: [],
      residualShortfall: 0,
      onTimeQty: 120,
      lateQty: 0,
      shipDate: "2026-10-15",
      lateShipDate: null,
      costCad: thirdCost,
      costNote: "Versioned overtime estimate, not a booked actual.",
      assumptions: ["Extra shifts are pegged only to COM-1042.", "Crew certificate LAB-LT-CERT covers all six days."],
      evidenceGaps: [],
      tradeoffs: [
        `${formatMoney(thirdCost)} overtime estimate requires finance approval.`,
        "The extra crew is not available to other commitments.",
      ],
      whyRejected: null,
      approvers: [
        {
          role: "manufacturing-manager",
          reason: `Schedule change and overtime · estimate ${formatMoney(thirdCost)} exceeds ${formatMoney(FINANCE_THRESHOLD_CAD)}`,
          authority: "finance",
        },
      ],
    },
    {
      id: "OPT-SPLIT",
      label: "Split the shipment",
      feasibility: "feasible",
      meetsPromise: false,
      changesPromise: true,
      violatedHardConstraints: [],
      residualShortfall: 0,
      onTimeQty: base.onTimeQty,
      lateQty: base.testShortfall,
      shipDate: "2026-10-15",
      lateShipDate: base.earliestShipDate,
      costCad: 0,
      costNote: null,
      assumptions: ["56 loops can finish on the allocated tests.", "The remaining 64 ship after recovery test days."],
      evidenceGaps: [
        "Customer acceptance of a split is not in the snapshot. The waiver log is stale.",
      ],
      tradeoffs: ["Protects 56 loops on the promise date and slips 64 loops to 19 October."],
      whyRejected: null,
      approvers: [
        {
          role: "manufacturing-manager",
          reason: "Schedule change and customer date change",
          authority: "program",
        },
      ],
    },
    {
      id: "OPT-SATURDAY",
      label: "Saturday overtime on 10 October only",
      feasibility: "infeasible",
      meetsPromise: false,
      changesPromise: false,
      violatedHardConstraints: [],
      residualShortfall: saturdayResidual,
      onTimeQty: base.onTimeQty + saturdayAdded,
      lateQty: saturdayResidual,
      shipDate: base.earliestShipDate,
      lateShipDate: null,
      costCad: overtimeCost(BASE_SHIFTS),
      costNote: "Versioned overtime estimate, not a booked actual.",
      assumptions: ["10 October is inside the downtime window, so the fixture still runs at half rate."],
      evidenceGaps: [],
      tradeoffs: [],
      whyRejected: `Leaves a leak-test shortfall of ${saturdayResidual}. No hard gate is violated; the option does not clear the binding constraint.`,
      approvers: [],
    },
    {
      id: "OPT-EXPEDITE",
      label: "Expedite QD-220",
      feasibility: "infeasible",
      meetsPromise: false,
      changesPromise: false,
      violatedHardConstraints: [],
      residualShortfall: base.testShortfall,
      onTimeQty: base.onTimeQty,
      lateQty: base.testShortfall,
      shipDate: base.earliestShipDate,
      lateShipDate: null,
      costCad: null,
      costNote: null,
      assumptions: ["Eligible QD-220 already covers 240 required pieces."],
      evidenceGaps: [],
      tradeoffs: [],
      whyRejected: "Material is already feasible. Expediting does not add leak-test slots, so the shortfall stays 64.",
      approvers: [],
    },
    {
      id: "OPT-RELEASE-HOLD",
      label: "Release held lot LOT-8841",
      feasibility: "infeasible",
      meetsPromise: false,
      changesPromise: false,
      violatedHardConstraints: [{ id: "GATE-ELIGIBILITY", label: "Held supply is not eligible" }],
      residualShortfall: base.testShortfall,
      onTimeQty: base.onTimeQty,
      lateQty: base.testShortfall,
      shipDate: base.earliestShipDate,
      lateShipDate: null,
      costCad: null,
      costNote: null,
      assumptions: [],
      evidenceGaps: [],
      tradeoffs: [],
      whyRejected: "QH-317 is a hard eligibility gate. Releasing it would also add no leak-test capacity.",
      approvers: [],
    },
    {
      id: "OPT-MOVE-FROZEN",
      label: "Displace frozen-horizon leak tests",
      feasibility: "infeasible",
      meetsPromise: false,
      changesPromise: false,
      violatedHardConstraints: [{ id: "GATE-FROZEN", label: "Frozen-horizon released work cannot be displaced" }],
      residualShortfall: 0,
      onTimeQty: 120,
      lateQty: 0,
      shipDate: "2026-10-15",
      lateShipDate: null,
      costCad: null,
      costNote: null,
      assumptions: [],
      evidenceGaps: [],
      tradeoffs: [],
      whyRejected: "The frozen peg is a hard gate. The option is visible and cannot be selected.",
      approvers: [],
    },
  ];
}

/**
 * Baseline option set for COM-1104.
 * Materialises `OPT-RESERVE-SLOTS` so the seeded COM-1104 approval/receipt resolve
 * to a real alternative (fixes D-03 — the dangling option id; N-07 — silent fallback).
 */
function cduBaselineAlternatives(): Alternative[] {
  const row = commitment("COM-1104");
  return [
    {
      id: "OPT-RESERVE-SLOTS",
      label: "Reserve the 48 priority leak-test slots pegged to COM-1104",
      feasibility: "feasible",
      meetsPromise: true,
      changesPromise: false,
      violatedHardConstraints: [],
      residualShortfall: 0,
      onTimeQty: row.qty,
      lateQty: 0,
      shipDate: row.promiseDate,
      lateShipDate: null,
      costCad: 0,
      costNote: null,
      assumptions: ["The 48-test peg sits inside the frozen horizon and is already protected."],
      evidenceGaps: [],
      tradeoffs: ["Reserving the peg keeps the CDU promise intact but leaves no slack for COM-1042."],
      whyRejected: null,
      approvers: [
        {
          role: "manufacturing-manager",
          reason: "Confirm the frozen peg against the CDU routing",
        },
      ],
    },
  ];
}

function manifoldAlternatives(): Alternative[] {
  return [
    {
      id: "OPT-ALT-MV14B",
      label: "Allocate approved alternate MV-14B",
      feasibility: "feasible",
      meetsPromise: true,
      changesPromise: false,
      violatedHardConstraints: [],
      residualShortfall: 0,
      onTimeQty: 80,
      lateQty: 0,
      shipDate: "2026-10-15",
      lateShipDate: null,
      costCad: 0,
      costNote: null,
      assumptions: ["MV-14B qualification AVL-MV-14B is already approved.", "90 eligible pieces cover the 68-piece gap."],
      evidenceGaps: [],
      tradeoffs: ["Uses the only on-hand alternate pool for this plant."],
      whyRejected: null,
      approvers: [
        {
          role: "manufacturing-manager",
          reason: "Allocate the approved source · substitution confirmed by Quality policy",
          authority: "quality",
        },
      ],
    },
    {
      id: "OPT-SLIP-1018",
      label: "Slip the promise to the supplier date",
      feasibility: "feasible",
      meetsPromise: false,
      changesPromise: true,
      violatedHardConstraints: [],
      residualShortfall: 0,
      onTimeQty: 12,
      lateQty: 68,
      shipDate: "2026-10-15",
      lateShipDate: "2026-10-21",
      costCad: 0,
      costNote: null,
      assumptions: ["Inbound MV-14 on 20 October can ship the next business day."],
      evidenceGaps: [],
      tradeoffs: ["12 manifolds stay on 15 October. 68 move to 21 October."],
      whyRejected: null,
      approvers: [
        {
          role: "manufacturing-manager",
          reason: "Schedule change and customer date change",
          authority: "program",
        },
      ],
    },
    {
      id: "OPT-PULL-SUPPLIER",
      label: "Pull the MV-14 supplier commit forward",
      feasibility: "infeasible",
      meetsPromise: false,
      changesPromise: false,
      violatedHardConstraints: [{ id: "GATE-SUPPLIER-COMMIT", label: "Confirmed supplier date is 20 October" }],
      residualShortfall: 68,
      onTimeQty: 12,
      lateQty: 68,
      shipDate: "2026-10-21",
      lateShipDate: null,
      costCad: null,
      costNote: null,
      assumptions: [],
      evidenceGaps: [],
      tradeoffs: [],
      whyRejected: "PO-MV14-19 confirms 20 October. The service will not invent an earlier commit.",
      approvers: [],
    },
    {
      id: "OPT-BROKER",
      label: "Buy an unapproved broker lot",
      feasibility: "infeasible",
      meetsPromise: false,
      changesPromise: false,
      violatedHardConstraints: [{ id: "GATE-SOURCE-APPROVAL", label: "Unapproved source is not usable" }],
      residualShortfall: 68,
      onTimeQty: 12,
      lateQty: 68,
      shipDate: "2026-10-21",
      lateShipDate: null,
      costCad: null,
      costNote: null,
      assumptions: [],
      evidenceGaps: [],
      tradeoffs: [],
      whyRejected: "An unapproved source cannot be counted as eligible supply.",
      approvers: [],
    },
  ];
}

export function createScenarioRun(commitmentId: string, sequence: number): DecisionRun {
  const base = assess(commitmentId);
  const alternatives = scenarioAlternatives(commitmentId);
  return freeze({
    ...base.baseline,
    id: `DR-${commitmentId}-R${sequence}`,
    kind: "scenario" as const,
    traceId: trace(commitmentId, `scenario-${sequence}`),
    createdAt: AS_OF,
    alternatives,
    immutable: true as const,
  });
}

export function canonicalResult(run: DecisionRun): string {
  return JSON.stringify({
    // ctp-0.3.0 — the fingerprint now pins memory + snapshot identity (N-05).
    memorySetVersion: MEMORY_SET_VERSION,
    snapshotId: run.snapshotId,
    modelVersion: run.modelVersion,
    feasibility: run.feasibility,
    binding: run.bindingConstraint,
    shortfall: run.shortfall,
    ship: run.earliestShipDate,
    alternatives: run.alternatives.map((row) => ({
      id: row.id,
      feasibility: row.feasibility,
      residual: row.residualShortfall,
      ship: row.shipDate,
      gates: row.violatedHardConstraints.map((gate) => gate.id),
    })),
  });
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function envelopeFor(
  role: Role,
  commitmentId: string,
  scenario: ContextEnvelope["scenario"],
): ContextEnvelope {
  const row = commitment(commitmentId);
  const packet = assess(commitmentId).packet;
  const person = PEOPLE[role];
  return {
    user: person,
    tenantId: TENANT_ID,
    siteId: SITE_ID,
    siteLabel: SITE_LABEL,
    commitmentId,
    product: `${row.family} · ${row.product}`,
    program: row.program,
    scenario,
    asOf: AS_OF,
    snapshotId: SNAPSHOT_ID,
    modelVersion: MODEL_VERSION,
    freshness: { fresh: packet.freshness.fresh, stale: packet.freshness.stale },
    unresolvedConflicts: packet.conflicts.length,
    lens: ROLE_POLICY[role].lens,
    policy: ROLE_POLICY[role],
    authorization: {
      scope: `${SITE_LABEL} only · no direct writeback · ${person.roleLabel}`,
      canApproveRoles: [role],
      canExecuteWithoutGateway: false,
      calculatesOfficialQuantities: false,
    },
  };
}

export type BlastRow = {
  id: string;
  label: string;
  effect: string;
  shortfall: number;
  causedByLeakTest: boolean;
};

export function blastRadius(): BlastRow[] {
  const capacity = leakTestCapacity();
  const rows = allocateLeakTests();
  return [
    {
      id: "RES-LT-01",
      label: "Leak-test fixture RES-LT-01",
      effect: `EVT-LT-041 leaves ${capacity.total} tests before 15 October (${capacity.healthy} healthy + ${capacity.degraded} degraded).`,
      shortfall: 0,
      causedByLeakTest: true,
    },
    ...rows.map((row) => {
      const shortfall = row.required - row.allocated;
      if (row.id === "FROZEN-HORIZON") {
        return {
          id: row.id,
          label: "Frozen-horizon released work",
          effect: `${row.allocated} of ${row.required} tests stay protected.`,
          shortfall,
          causedByLeakTest: false,
        };
      }
      const item = commitment(row.id);
      return {
        id: row.id,
        label: `${item.id} · ${item.product}`,
        effect:
          shortfall > 0
            ? `${row.allocated} of ${row.required} tests allocated. Short ${shortfall}.`
            : `${row.allocated} of ${row.required} tests allocated. Not short on this fixture.`,
        shortfall,
        causedByLeakTest: shortfall > 0,
      };
    }),
    {
      id: "COM-1018",
      label: "COM-1018 · RM-42",
      effect: "Not pegged to RES-LT-01. Its shortage is MV-14 material, a separate event.",
      shortfall: 0,
      causedByLeakTest: false,
    },
    {
      id: "COM-0991",
      label: "COM-0991 · CPL-320",
      effect: "No quantity in this leak-test window. November promise is unchanged.",
      shortfall: 0,
      causedByLeakTest: false,
    },
  ];
}

export function optionById(run: DecisionRun, optionId: string): Alternative {
  const found = run.alternatives.find((row) => row.id === optionId);
  if (!found) throw new Error(`Unknown option ${optionId}`);
  return found;
}

export function createApproval(
  run: DecisionRun,
  optionId: string,
  requester: Person,
  rationale: string,
  sequence: number,
  expected?: CasContext,
): ApprovalRequest {
  const option = optionById(run, optionId);
  if (option.feasibility === "infeasible") {
    throw new Error("Infeasible options cannot be submitted for approval.");
  }
  if (rationale.trim().length < 12) {
    throw new Error("Approval requests need a rationale.");
  }
  return {
    id: `APR-${run.commitmentId}-${sequence}`,
    runId: run.id,
    optionId,
    commitmentId: run.commitmentId,
    requestedById: requester.id,
    requestedByName: requester.name,
    requestedAt: AS_OF,
    expiresAt: run.expiresAt,
    requestRationale: rationale.trim(),
    status: "pending",
    ...(expected ? { expected } : {}),
    approvers: option.approvers.map((need) => {
      const person = PEOPLE[need.role];
      return {
        role: need.role,
        approverId: person.id,
        approverName: person.name,
        reason: need.reason,
        authority: need.authority,
        status: "pending" as const,
        rationale: "",
        decidedAt: null,
      };
    }),
  };
}

export function decideApproval(
  approval: ApprovalRequest,
  actor: Person,
  decision: "approved" | "rejected",
  rationale: string,
): ApprovalRequest {
  if (rationale.trim().length < 12) throw new Error("Named decisions need a rationale.");
  const target = approval.approvers.find((row) => row.role === actor.role);
  if (!target) throw new Error(`${actor.roleLabel} is not a required approver on this request.`);
  if (actor.id === approval.requestedById) throw new Error("The requester cannot approve their own request.");
  const approvers = approval.approvers.map((row) =>
    row.role === actor.role
      ? { ...row, status: decision, rationale: rationale.trim(), decidedAt: AS_OF }
      : row,
  );
  const rejected = approvers.some((row) => row.status === "rejected");
  const approved = approvers.every((row) => row.status === "approved");
  return {
    ...approval,
    approvers,
    status: rejected ? "rejected" : approved ? "approved" : "pending",
  };
}

export function gatewayReceipt(
  approval: ApprovalRequest,
  mode: "dry-run" | "execute",
  prior: ActionReceipt[],
  current?: CasContext,
): ActionReceipt {
  // Compare-and-swap: refuse to write back against a superseded snapshot/master set.
  assertNotStale(approval.expected, current);
  const idempotencyKey = `act-${approval.id}-${approval.optionId}`;
  const existing = prior.find(
    (row) => row.idempotencyKey === idempotencyKey && row.mode === mode && row.status === "accepted",
  );
  if (existing) return existing;
  const allowed = approval.status === "approved";
  const dryRun = prior.find((row) => row.approvalId === approval.id && row.mode === "dry-run" && row.status === "accepted");
  const rejected = (detail: string): ActionReceipt => ({
    id: `RCP-${approval.id}-${mode}-${prior.length + 1}`,
    approvalId: approval.id,
    runId: approval.runId,
    optionId: approval.optionId,
    mode,
    status: "rejected",
    idempotencyKey,
    attemptedAt: AS_OF,
    gateway: "simulated-writeback",
    target: "MES labor calendar",
    baselineMutated: false,
    reconciliation: "rejected",
    detail,
  });
  if (mode === "execute" && !dryRun) {
    return rejected("Execution is closed until a dry run is accepted.");
  }
  if (!allowed) {
    return rejected("The writeback gateway rejected the attempt. Named approval is incomplete.");
  }
  return {
    id: mode === "dry-run" ? `RCP-${approval.id}-DRY` : `RCP-${approval.id}-EXEC`,
    approvalId: approval.id,
    runId: approval.runId,
    optionId: approval.optionId,
    mode,
    status: "accepted",
    idempotencyKey,
    attemptedAt: AS_OF,
    gateway: "simulated-writeback",
    target: approval.optionId === "OPT-ALT-MV14B" ? "ERP allocation MV-14B" : "MES labor calendar RES-LT-01",
    baselineMutated: false,
    reconciliation: mode === "dry-run" ? "not-applicable" : "pending",
    detail:
      mode === "dry-run"
        ? "Dry run accepted. No baseline field changed and nothing was written."
        : "Simulated writeback accepted. The baseline promise is unchanged until an observed outcome confirms it.",
  };
}

/**
 * Re-base a stale approval onto a successor identity: the prior approval is
 * retained (rejected) and a fresh v2 approval is raised against the new CAS
 * context. Invalidation is not deletion, and a replayed decision needs a new
 * approval (Personas §7). This is the seam T-06 exercises.
 */
export function rebaseApproval(
  approval: ApprovalRequest,
  successor: CasContext,
  sequence: number,
): { prior: ApprovalRequest; successor: ApprovalRequest } {
  const prior: ApprovalRequest = { ...approval, status: "rejected" };
  const rebased: ApprovalRequest = {
    ...approval,
    id: `APR-${approval.commitmentId}-${sequence}`,
    status: "pending",
    requestedAt: AS_OF,
    expected: successor,
    approvers: approval.approvers.map((row) => ({
      ...row,
      status: "pending" as const,
      rationale: "",
      decidedAt: null,
    })),
  };
  return { prior, successor: rebased };
}

export function observeReceipt(receipt: ActionReceipt, commitmentId: string, expected: string): ObservedOutcome {
  if (receipt.status !== "accepted" || receipt.mode !== "execute") {
    throw new Error("An outcome requires an accepted execution receipt.");
  }
  return {
    id: `OUT-${receipt.id}`,
    receiptId: receipt.id,
    commitmentId,
    expected,
    observed: "No recovered quantity has been tested or shipped at this as-of time.",
    successful: false,
    reason:
      "The as-of time is 26 September 08:15. Approved work after that time has not happened. An accepted writeback is not a successful commitment.",
    observedAt: AS_OF,
  };
}

export function seeded1104Approval(): ApprovalRequest {
  return {
    id: "APR-1104-RESERVE",
    runId: "DR-COM-1104-BASE",
    optionId: "OPT-RESERVE-SLOTS",
    commitmentId: "COM-1104",
    requestedById: PEOPLE["shift-planner"].id,
    requestedByName: PEOPLE["shift-planner"].name,
    requestedAt: "2026-09-26T07:30:00-06:00",
    expiresAt: "2026-09-27T08:15:00-06:00",
    requestRationale: "Reserve the 48 priority leak-test slots already pegged to COM-1104.",
    status: "approved",
    approvers: [
      {
        role: "manufacturing-manager",
        approverId: PEOPLE["manufacturing-manager"].id,
        approverName: PEOPLE["manufacturing-manager"].name,
        reason: "Confirm the frozen peg",
        status: "approved",
        rationale: "The peg is inside the frozen window and matches the CDU routing.",
        decidedAt: "2026-09-26T07:40:00-06:00",
      },
    ],
  };
}

export function seeded1104Receipt(): ActionReceipt {
  return {
    id: "RCP-1104-EXEC",
    approvalId: "APR-1104-RESERVE",
    runId: "DR-COM-1104-BASE",
    optionId: "OPT-RESERVE-SLOTS",
    mode: "execute",
    status: "accepted",
    idempotencyKey: "act-APR-1104-RESERVE-OPT-RESERVE-SLOTS",
    attemptedAt: "2026-09-26T07:45:00-06:00",
    gateway: "simulated-writeback",
    target: "ERP schedule acknowledgment",
    baselineMutated: false,
    reconciliation: "pending",
    detail: "Simulated schedule acknowledgment accepted. Shipment has not occurred.",
  };
}
