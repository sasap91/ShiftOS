/**
 * Decision-memory layer (M0 slice).
 *
 * Adds a versioned, provenance-carrying identity for every governed input a run
 * consumes, plus a reverse `EvidenceUseEdge` so a memory change can be traced to
 * the exact decisions that consumed it. This is the substrate for selective
 * invalidation and deterministic replay; it does not by itself mutate runs.
 *
 * Kept dependency-light on purpose: this module reads `model.ts` and `master.ts`
 * and is read by `verify.ts`. It never writes the baseline.
 */
import {
  AS_OF,
  MEMORY_SET_VERSION,
  MODEL_VERSION,
  assess,
  type ActionReceipt,
  type ApprovalRequest,
  type DecisionRun,
  type DerivedFact,
  type Role,
  type SourceFact,
} from "./model";
import {
  MASTER_SET_VERSION,
  allMasterRefs,
  masterRefsFor,
  validityOf,
  type MasterClass,
  type MasterRef,
} from "./master";

export { MEMORY_SET_VERSION, MASTER_SET_VERSION };

export type MemStatus = "active" | "superseded" | "expired" | "quarantined";
export type MemCriticality = "hard_gate" | "material" | "context";
export type MemoryClass = "rule" | "fact" | "derived" | "contested";
export type Sensitivity =
  | "public"
  | "internal"
  | "confidential_customer"
  | "restricted_supplier"
  | "restricted_finance"
  | "restricted_people";
export type EdgeUse = "constraint" | "policy" | "objective" | "context";

export type MemoryVersion = {
  /** Stable identity shared across versions of the same fact. */
  memoryId: string;
  versionId: string;
  memoryClass: MemoryClass;
  factType: string;
  subjectRef: string;
  /** The one role that may supersede this memory. */
  ownerRole: Role;
  sourceId: string;
  validFrom: string;
  expiresAt: string | null;
  confidence: number;
  criticality: MemCriticality;
  sensitivity: Sensitivity;
  status: MemStatus;
  supersedesVersionId: string | null;
  synthetic: boolean;
};

export type EvidenceUseEdge = {
  edgeId: string;
  memoryVersionId: string;
  /** The decision (run) that consumed the memory. */
  decisionVersionId: string;
  useType: EdgeUse;
  fieldPath: string;
  criticality: MemCriticality;
  transformationId: string | null;
};

// --- master -> memory mapping (the four-role stewardship) --------------------

export const STEWARD_BY_CLASS: Record<MasterClass, Role> = {
  item: "demand-planner",
  bom: "demand-planner",
  routing: "manufacturing-manager",
  resource: "maintenance-manager",
  calendar: "manufacturing-manager",
  sourcing: "demand-planner",
  party: "demand-planner",
  commercial: "demand-planner",
  policy: "manufacturing-manager",
};

const CRITICALITY_BY_CLASS: Record<MasterClass, MemCriticality> = {
  item: "context",
  bom: "material",
  routing: "material",
  resource: "hard_gate",
  calendar: "hard_gate",
  sourcing: "hard_gate",
  party: "material",
  commercial: "material",
  policy: "hard_gate",
};

const SENSITIVITY_BY_CLASS: Record<MasterClass, Sensitivity> = {
  item: "internal",
  bom: "internal",
  routing: "internal",
  resource: "internal",
  calendar: "internal",
  sourcing: "internal",
  party: "confidential_customer",
  commercial: "restricted_finance",
  policy: "internal",
};

const USE_BY_CLASS: Record<MasterClass, EdgeUse> = {
  item: "context",
  bom: "constraint",
  routing: "constraint",
  resource: "constraint",
  calendar: "constraint",
  sourcing: "constraint",
  party: "context",
  commercial: "objective",
  policy: "policy",
};

const OWNER_BY_SYSTEM: Record<string, Role> = {
  CRM: "demand-planner",
  ERP: "manufacturing-manager",
  WMS: "manufacturing-manager",
  MES: "shift-planner",
  EAM: "maintenance-manager",
  QMS: "maintenance-manager",
};

function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function masterStatus(master: MasterRef): MemStatus {
  return validityOf(master) === "current" ? "active" : "superseded";
}

export function memoryFromMaster(master: MasterRef): MemoryVersion {
  return {
    memoryId: `MEM-${master.id}`,
    versionId: `${master.id}@${master.version}`,
    memoryClass: "rule",
    factType: `${master.set}_rule`,
    subjectRef: master.recordId,
    ownerRole: STEWARD_BY_CLASS[master.set],
    sourceId: master.id,
    validFrom: master.effectiveFrom,
    expiresAt: master.effectiveTo,
    confidence: 1,
    criticality: CRITICALITY_BY_CLASS[master.set],
    sensitivity: SENSITIVITY_BY_CLASS[master.set],
    status: masterStatus(master),
    supersedesVersionId: null,
    synthetic: true,
  };
}

/** Transaction fact memory. Freshness is the only staleness axis; confidence derives from it. */
export function memoryFromFact(fact: SourceFact): MemoryVersion {
  const owner = OWNER_BY_SYSTEM[fact.sourceSystem] ?? "manufacturing-manager";
  return {
    memoryId: `MEM-${fact.id}`,
    versionId: `${fact.id}@${fact.observedAt}`,
    memoryClass: "fact",
    factType: "transaction_fact",
    subjectRef: fact.sourceRecordId,
    ownerRole: owner,
    sourceId: fact.sourceSystem,
    validFrom: fact.observedAt,
    expiresAt: null,
    confidence: fact.freshness === "fresh" ? 0.95 : 0.4,
    criticality: "context",
    sensitivity: fact.sourceSystem === "CRM" ? "confidential_customer" : "internal",
    status: fact.freshness === "fresh" ? "active" : "expired",
    supersedesVersionId: null,
    synthetic: true,
  };
}

export function memoryFromDerived(fact: DerivedFact): MemoryVersion {
  return {
    memoryId: `MEM-${fact.id}`,
    versionId: `${fact.id}@${MODEL_VERSION}`,
    memoryClass: "derived",
    factType: "derived_value",
    subjectRef: fact.name,
    ownerRole: "manufacturing-manager",
    sourceId: fact.service,
    validFrom: AS_OF,
    expiresAt: null,
    confidence: 1,
    criticality: "material",
    sensitivity: "internal",
    status: "active",
    supersedesVersionId: null,
    synthetic: true,
  };
}

export type MemoryRegistry = {
  memories: MemoryVersion[];
  edges: EvidenceUseEdge[];
};

function edge(
  memory: MemoryVersion,
  runId: string,
  useType: EdgeUse,
  fieldPath: string,
): EvidenceUseEdge {
  return {
    edgeId: `edge:${memory.versionId}->${runId}`,
    memoryVersionId: memory.versionId,
    decisionVersionId: runId,
    useType,
    fieldPath,
    criticality: memory.criticality,
    transformationId: null,
  };
}

/** Rule + fact + derived memories for one commitment. */
export function memoriesFor(commitmentId: string): MemoryVersion[] {
  const view = assess(commitmentId);
  return [
    ...masterRefsFor(commitmentId).map(memoryFromMaster),
    ...view.packet.sourceFacts.map(memoryFromFact),
    ...view.packet.derivedFacts.map(memoryFromDerived),
  ];
}

/**
 * Memory registry + reverse edges for the four COOLIT commitments.
 * Edges point at each commitment's baseline run so "which decisions consumed
 * this memory?" is answerable from the registry alone.
 */
export function memoryRegistry(commitmentIds: string[]): MemoryRegistry {
  const memories: MemoryVersion[] = [];
  const edges: EvidenceUseEdge[] = [];
  for (const id of commitmentIds) {
    const runId = assess(id).baseline.id;
    const masters = masterRefsFor(id);
    for (const master of masters) {
      const memory = memoryFromMaster(master);
      memories.push(memory);
      edges.push(edge(memory, runId, USE_BY_CLASS[master.set], `rule.${master.set}.${master.id}`));
    }
    const view = assess(id);
    for (const fact of view.packet.sourceFacts) {
      const memory = memoryFromFact(fact);
      memories.push(memory);
      edges.push(edge(memory, runId, "context", `fact.${fact.id}`));
    }
    for (const derived of view.packet.derivedFacts) {
      const memory = memoryFromDerived(derived);
      memories.push(memory);
      edges.push(edge(memory, runId, "objective", `derived.${derived.id}`));
    }
  }
  return { memories, edges };
}

// --- confidence gate ---------------------------------------------------------

export const REAPPROVAL_THRESHOLD = 0.75;

export function freshnessFactor(memory: MemoryVersion, asOf: string = AS_OF): number {
  if (memory.status !== "active") return 0;
  if (asOf < memory.validFrom) return 0;
  if (memory.expiresAt && asOf > memory.expiresAt) return 0;
  return 1;
}

export function effectiveConfidence(memory: MemoryVersion, asOf: string = AS_OF): number {
  return round6(memory.confidence * freshnessFactor(memory, asOf));
}

export function hardGateConfidence(memories: MemoryVersion[], asOf: string = AS_OF): number {
  const gates = memories.filter((row) => row.criticality === "hard_gate" && row.status === "active");
  if (!gates.length) return 1;
  return round6(Math.min(...gates.map((row) => effectiveConfidence(row, asOf))));
}

export function reapprovalRequired(memories: MemoryVersion[], asOf: string = AS_OF): boolean {
  return hardGateConfidence(memories, asOf) < REAPPROVAL_THRESHOLD;
}

// --- supersession (invalidation != deletion) --------------------------------

export type MemorySupersession = { prior: MemoryVersion; successor: MemoryVersion };

/**
 * Produce a superseded copy of `prior` and a successor that shares its memoryId.
 * `prior` itself is never mutated or deleted — the input object is untouched and
 * the superseded copy is frozen. This is the "invalidation ≠ deletion" rule.
 */
export function supersedeMemory(
  prior: MemoryVersion,
  next: { versionId: string; confidence: number; validFrom?: string; expiresAt?: string | null; sourceId?: string },
): MemorySupersession {
  const superseded = Object.freeze({ ...prior, status: "superseded" as const });
  const successor = Object.freeze({
    ...prior,
    ...next,
    memoryId: prior.memoryId,
    status: "active" as const,
    supersedesVersionId: prior.versionId,
    validFrom: next.validFrom ?? AS_OF,
    expiresAt: next.expiresAt === undefined ? prior.expiresAt : next.expiresAt,
  });
  return { prior: superseded, successor };
}

/** Reverse index: the decisions that consumed this exact memory version. */
export function reverseEdges(edges: EvidenceUseEdge[], memoryVersionId: string): EvidenceUseEdge[] {
  return edges.filter((row) => row.memoryVersionId === memoryVersionId);
}

export function invalidatedDecisions(edges: EvidenceUseEdge[], memoryVersionId: string): string[] {
  return [...new Set(reverseEdges(edges, memoryVersionId).map((row) => row.decisionVersionId))].sort();
}

// --- fixtures / exemplars (D-21) --------------------------------------------

export function supersessionDemo(): { original: MemoryVersion; prior: MemoryVersion; successor: MemoryVersion } {
  const master = allMasterRefs().find((row) => row.id === "RM-RES-LT-01");
  if (!master) throw new Error("RES-LT-01 master is missing");
  const original: MemoryVersion = { ...memoryFromMaster(master), expiresAt: "2026-10-31" };
  const { prior, successor } = supersedeMemory(original, {
    versionId: "RM-RES-LT-01@RM-12",
    confidence: 0.62,
    sourceId: "synthetic-supplier-revision",
  });
  return { original, prior, successor };
}

/** A source-down exemplar: the memory is quarantined, never silently dropped. */
export function sourceDownExample(): MemoryVersion {
  return {
    memoryId: "MEM-SRC-WMS-QD-220",
    versionId: "SRC-WMS-QD-220@2026-09-26T08:04:00-06:00",
    memoryClass: "fact",
    factType: "source_reachability",
    subjectRef: "WMS-QD-220",
    ownerRole: "manufacturing-manager",
    sourceId: "WMS",
    validFrom: "2026-09-26T08:00:00-06:00",
    expiresAt: null,
    confidence: 0,
    criticality: "hard_gate",
    sensitivity: "internal",
    status: "quarantined",
    supersedesVersionId: null,
    synthetic: true,
  };
}

// --- reference integrity lint ------------------------------------------------

export type LintInput = {
  runs: DecisionRun[];
  approvals: ApprovalRequest[];
  receipts: ActionReceipt[];
  memories: MemoryVersion[];
  edges: EvidenceUseEdge[];
};

/**
 * Fail-closed reference check. Returns every unresolved id; empty means the
 * decision room's evidence graph is internally consistent (D-03, N-07).
 */
export function lintDecisionRoom(input: LintInput): string[] {
  const problems: string[] = [];
  const runById = new Map(input.runs.map((run) => [run.id, run]));
  const optionKeys = new Set<string>();
  for (const run of input.runs) {
    for (const option of run.alternatives) optionKeys.add(`${run.id}::${option.id}`);
  }
  const approvalById = new Map(input.approvals.map((row) => [row.id, row]));
  const memoryVersionIds = new Set(input.memories.map((row) => row.versionId));
  const masterIds = new Set(allMasterRefs().map((row) => row.id));

  for (const approval of input.approvals) {
    if (!runById.has(approval.runId)) {
      problems.push(`approval ${approval.id} references unknown run ${approval.runId}`);
    } else if (!optionKeys.has(`${approval.runId}::${approval.optionId}`)) {
      problems.push(`approval ${approval.id} references unknown option ${approval.optionId} on ${approval.runId}`);
    }
  }
  for (const receipt of input.receipts) {
    if (!approvalById.has(receipt.approvalId)) {
      problems.push(`receipt ${receipt.id} references unknown approval ${receipt.approvalId}`);
    }
    if (!runById.has(receipt.runId)) {
      problems.push(`receipt ${receipt.id} references unknown run ${receipt.runId}`);
    } else if (!optionKeys.has(`${receipt.runId}::${receipt.optionId}`)) {
      problems.push(`receipt ${receipt.id} references unknown option ${receipt.optionId} on ${receipt.runId}`);
    }
  }
  for (const master of allMasterRefs()) {
    if (master.supersededBy && !masterIds.has(master.supersededBy)) {
      problems.push(`master ${master.id} supersededBy unknown ${master.supersededBy}`);
    }
  }
  for (const row of input.edges) {
    if (!memoryVersionIds.has(row.memoryVersionId)) {
      problems.push(`edge ${row.edgeId} references unknown memory ${row.memoryVersionId}`);
    }
    if (!runById.has(row.decisionVersionId)) {
      problems.push(`edge ${row.edgeId} references unknown decision ${row.decisionVersionId}`);
    }
  }
  return problems.sort();
}