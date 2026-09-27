/**
 * Commitment ledger projection.
 * Joins the deterministic assessment (model.ts) with the live thread state
 * (orchestrator.ts) and the reference set (master.ts) into one row per
 * commitment, with the four data classes kept distinct.
 */
import { AS_OF, assess, formatDay } from "./model";
import { type Thread } from "./orchestrator";
import { MASTER_SET_VERSION, masterRefsFor, type MasterRef } from "./master";

export type LedgerLifecycle =
  | "investigating"
  | "awaiting-approval"
  | "approved"
  | "executing"
  | "monitoring";

export type ConstraintClass = "capacity" | "material" | "gate" | "quality" | "none";

export type RiskState = "at-risk" | "awaiting" | "approved" | "monitoring";

export type LedgerConstraint = {
  className: ConstraintClass;
  label: string;
  resource: string | null;
  allocated: number | null;
  required: number | null;
  shortfall: number;
  unit: string;
  secondaries: string[];
  gates: string[];
};

export type LedgerLane = {
  system: string;
  primary: boolean;
  facts: {
    id: string;
    recordId: string;
    statement: string;
    observedAt: string;
    freshness: "fresh" | "stale";
  }[];
};

export type LedgerLadderRung = {
  key: string;
  label: string;
  value: number | null;
  unit: string;
};

export type OperationalProjection = {
  priority: number;
  workCenter: string;
  requiredLoad: number;
  allocatedLoad: number;
  loadGap: number;
  loadUnit: string;
  crewStatus: string;
  asset: string;
  assetStatus: string;
  recovery: string;
  assetEvidence: string;
  impactQty: number;
  assetImpactQty: number;
};

export type LedgerRow = {
  commitmentId: string;
  customer: string;
  program: string;
  family: string;
  product: string;
  qty: number;
  uom: string;
  onTimeQty: number;
  promised: string;
  capable: string;
  capableDeltaDays: number;
  capableConditional: string | null;
  timeToImpactDays: number;
  feasibility: "feasible" | "infeasible";
  lifecycle: LedgerLifecycle;
  risk: RiskState;
  constraint: LedgerConstraint;
  provenance: { systems: string[]; fresh: number; stale: number; conflicts: number };
  conflicts: { id: string; statement: string; disposition: string; sources: string[] }[];
  missing: string[];
  rules: MasterRef[];
  derived: { id: string; result: string; formula: string }[];
  lanes: LedgerLane[];
  ladder: LedgerLadderRung[];
  operational: OperationalProjection;
};

export const CONSTRAINT_GLYPH: Record<ConstraintClass, string> = {
  capacity: "⟳",
  material: "▤",
  gate: "⚑",
  quality: "⚑",
  none: "·",
};

export const LIFECYCLE_LABEL: Record<LedgerLifecycle, string> = {
  investigating: "Investigating",
  "awaiting-approval": "Awaiting approval",
  approved: "Approved",
  executing: "Executing",
  monitoring: "Monitoring",
};

const RISK_ORDER: RiskState[] = ["at-risk", "awaiting", "approved", "monitoring"];

const CONDITIONAL: Record<string, string> = {
  "COM-1018": "15 October if MV-14B is approved, else 21 October",
};

function dayDiff(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso.slice(0, 10)}T00:00:00Z`);
  const to = Date.parse(`${toIso.slice(0, 10)}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

function lifecycleOf(thread: Thread): LedgerLifecycle {
  const approval = thread.approvals.at(-1);
  const executed = thread.receipts.some((row) => row.mode === "execute" && row.status === "accepted");
  if (thread.outcomes.length) return "monitoring";
  if (executed) return "executing";
  if (approval?.status === "approved") return "approved";
  if (approval?.status === "pending") return "awaiting-approval";
  return "investigating";
}

function riskOf(thread: Thread): RiskState {
  const approval = thread.approvals.at(-1);
  const executed = thread.receipts.some((row) => row.mode === "execute" && row.status === "accepted");
  if (thread.outcomes.length) return "monitoring";
  if (approval?.status === "rejected") return "at-risk";
  if (approval?.status === "approved" || executed) return "approved";
  if (approval?.status === "pending") return "awaiting";
  if (thread.runs[0].feasibility === "infeasible") return "at-risk";
  return "monitoring";
}

function constraintFor(commitmentId: string): LedgerConstraint {
  const view = assess(commitmentId);
  const row = view.commitment;
  if (view.baseline.bindingConstraint === "Leak-test capacity") {
    return {
      className: "capacity",
      label: "Leak-test capacity",
      resource: "RES-LT-01",
      allocated: view.onTimeQty,
      required: row.leakTests,
      shortfall: view.testShortfall,
      unit: "tests",
      secondaries: [
        "Material eligible (QD-220) — covers requirement, not binding",
        "Certified crew +1 shift × 6 healthy days",
      ],
      gates: [],
    };
  }
  if (view.baseline.bindingConstraint === "MV-14 supplier commit") {
    return {
      className: "material",
      label: "MV-14 supplier commit",
      resource: "MV-14",
      allocated: view.onTimeQty,
      required: row.qty,
      shortfall: view.materialShortfall,
      unit: "manifolds",
      secondaries: ["Approved alternate MV-14B on hand"],
      gates: [],
    };
  }
  return {
    className: "none",
    label: "None",
    resource: null,
    allocated: null,
    required: null,
    shortfall: 0,
    unit: "",
    secondaries: [],
    gates: [],
  };
}

function operationalProjection(
  row: ReturnType<typeof assess>["commitment"],
  view: ReturnType<typeof assess>,
  constraint: LedgerConstraint,
): OperationalProjection {
  const mesFacts = view.packet.sourceFacts.filter((fact) => fact.sourceSystem === "MES");
  const assetFact = mesFacts.find((fact) => /^RES-/.test(fact.sourceRecordId) || /fixture|resource/i.test(fact.statement));
  const lineageResource = view.packet.lineage.find((edge) => /^RES-/.test(edge.to))?.to;
  const crewFact = mesFacts.find((fact) => /crew|shift|staff/i.test(fact.statement));
  const degradedFact = mesFacts.find((fact) => /half rate|degraded|down|downtime/i.test(fact.statement));
  const recoveryMatch = degradedFact?.statement.match(/event ends\s+([^.]*)/i)
    ?? degradedFact?.statement.match(/through\s+([^.]*)/i);
  const workCenter = constraint.className === "capacity" && constraint.resource
    ? constraint.resource
    : assetFact?.sourceRecordId ?? lineageResource ?? "No constrained work center";
  const isCapacityConstraint = constraint.className === "capacity";
  const requiredLoad = isCapacityConstraint && constraint.required !== null
    ? constraint.required
    : view.baseline.requiredTests > 0
      ? view.baseline.requiredTests
      : row.qty;
  const allocatedLoad = isCapacityConstraint && constraint.allocated !== null
    ? constraint.allocated
    : view.baseline.requiredTests > 0
      ? view.baseline.allocatedTests
      : row.qty;
  const loadUnit = isCapacityConstraint && constraint.unit
    ? constraint.unit
    : view.baseline.requiredTests > 0
      ? "tests"
      : row.uom;
  const asset = constraint.className === "capacity" && constraint.resource
    ? constraint.resource
    : assetFact?.sourceRecordId ?? lineageResource ?? "No constrained asset";
  const assetStatus = degradedFact
    ? "Degraded"
    : assetFact && /slack|available/i.test(assetFact.statement)
      ? "Available"
      : assetFact
        ? "No exception recorded"
        : "No constrained asset";

  return {
    priority: row.priority,
    workCenter,
    requiredLoad,
    allocatedLoad,
    loadGap: Math.max(0, requiredLoad - allocatedLoad),
    loadUnit,
    crewStatus: crewFact?.statement ?? "No crew exception recorded",
    asset,
    assetStatus,
    recovery: recoveryMatch?.[1]?.trim() ?? (assetStatus === "Available" ? "Available now" : "No recovery event recorded"),
    assetEvidence: degradedFact?.statement ?? assetFact?.statement ?? "No asset exception is present in the evidence packet.",
    impactQty: Math.max(0, row.qty - view.onTimeQty),
    assetImpactQty: isCapacityConstraint ? Math.max(0, row.qty - view.onTimeQty) : 0,
  };
}

const PRIMARY_SYSTEMS = ["CRM", "ERP", "MES"];

function laneOf(
  facts: { id: string; sourceSystem: string; sourceRecordId: string; statement: string; observedAt: string; freshness: "fresh" | "stale" }[],
  system: string,
  primary: boolean,
): LedgerLane {
  return {
    system,
    primary,
    facts: facts
      .filter((fact) => fact.sourceSystem === system)
      .map((fact) => ({
        id: fact.id,
        recordId: fact.sourceRecordId,
        statement: fact.statement,
        observedAt: fact.observedAt,
        freshness: fact.freshness,
      })),
  };
}

export function buildLedgerRow(thread: Thread): LedgerRow {
  const commitmentId = thread.commitmentId;
  const view = assess(commitmentId);
  const row = view.commitment;
  const packet = view.packet;
  const constraint = constraintFor(commitmentId);
  const capableDeltaDays = dayDiff(row.promiseDate, view.earliestShipDate);
  const systems = Array.from(new Set(packet.sourceFacts.map((fact) => fact.sourceSystem)));
  const lanes = PRIMARY_SYSTEMS.map((system) => laneOf(packet.sourceFacts, system, true)).filter(
    (lane) => lane.facts.length > 0,
  );
  const attached = systems
    .filter((system) => !PRIMARY_SYSTEMS.includes(system))
    .map((system) => laneOf(packet.sourceFacts, system, false));

  const eligible = view.materialShortfall === 0 ? row.qty : Math.max(0, row.qty - view.materialShortfall);
  const operational = operationalProjection(row, view, constraint);

  return {
    commitmentId,
    customer: row.customer,
    program: row.program,
    family: row.family,
    product: row.product,
    qty: row.qty,
    uom: row.uom,
    onTimeQty: view.onTimeQty,
    promised: row.promiseDate,
    capable: view.earliestShipDate,
    capableDeltaDays,
    capableConditional: CONDITIONAL[commitmentId] ?? null,
    timeToImpactDays: dayDiff(AS_OF.slice(0, 10), row.promiseDate),
    feasibility: view.baseline.feasibility,
    lifecycle: lifecycleOf(thread),
    risk: riskOf(thread),
    constraint,
    provenance: {
      systems,
      fresh: packet.freshness.fresh,
      stale: packet.freshness.stale,
      conflicts: packet.conflicts.length,
    },
    conflicts: packet.conflicts.map((conflict) => ({
      id: conflict.id,
      statement: conflict.statement,
      disposition: conflict.disposition,
      sources: conflict.sources.map((source) => `${source.system} ${source.value}`),
    })),
    missing: packet.missing,
    rules: masterRefsFor(commitmentId),
    derived: packet.derivedFacts.map((fact) => ({ id: fact.id, result: fact.result, formula: fact.formula })),
    lanes: [...lanes, ...attached],
    ladder: [
      { key: "ordered", label: "Ordered", value: row.qty, unit: row.uom },
      { key: "planned", label: "Planned", value: row.qty, unit: row.uom },
      { key: "eligible", label: "Eligible", value: eligible, unit: row.uom },
      { key: "allocated", label: "Allocated", value: view.onTimeQty, unit: row.uom },
      { key: "committed", label: "Committed", value: view.onTimeQty, unit: row.uom },
      { key: "tested", label: "Tested", value: 0, unit: row.uom },
      { key: "shipped", label: "Shipped", value: 0, unit: row.uom },
    ],
    operational,
  };
}

export function buildLedger(threads: Record<string, Thread>): LedgerRow[] {
  return Object.values(threads)
    .map(buildLedgerRow)
    .sort((a, b) => RISK_ORDER.indexOf(a.risk) - RISK_ORDER.indexOf(b.risk) || a.timeToImpactDays - b.timeToImpactDays);
}

export function capabilityLine(row: LedgerRow): string {
  if (row.capableConditional) return row.capableConditional;
  if (row.capableDeltaDays === 0) return formatDay(row.capable);
  return `${formatDay(row.capable)} · +${row.capableDeltaDays}d`;
}

export { MASTER_SET_VERSION };
