/**
 * MVP typed-tool registry. Each tool is a bounded, typed adapter over the
 * deterministic decision services. The model may request these by name; the
 * gateway authorizes and executes them. No tool touches a database directly.
 */
import {
  ROLE_POLICY,
  assess,
  blastRadius,
  commitment,
  createApproval,
  formatDay,
  formatMoney,
  gatewayReceipt,
  observeReceipt,
  optionById,
  type Alternative,
  type DecisionRun,
} from "../../src/model";
import type { HumanOverrideEvent, RejectionCode } from "../../src/shared/contracts";
import {
  addApproval,
  addOutcome,
  addOverride,
  addReceipt,
  cancelRun,
  countApprovals,
  getApproval,
  getReceipt,
  getRun,
  isCancelled,
  latestReceipt,
  latestRun,
  newRun,
  outcomeForReceipt,
  receiptsForApproval,
} from "../runs/store";
import {
  ToolError,
  expectEnum,
  expectObject,
  expectString,
  optionalString,
} from "./schema";
import type { AnyTool, PolicyDecision, ToolContext, ToolOutcome } from "./types";

const ALLOW: PolicyDecision = { allowed: true, reason: "Authorized for this role." };

const REJECTION_CODES: RejectionCode[] = [
  "LABOR_NOT_REALISTIC",
  "SUPPLIER_EXPEDITE_NOT_CREDIBLE",
  "CUSTOMER_PRIORITY_MISWEIGHTED",
  "CHANGEOVER_COST_UNDERSTATED",
  "POLICY_CONSTRAINT_MISSING",
  "DATA_STALE",
  "OPERATIONAL_RISK_TOO_HIGH",
];

function capability(ctx: ToolContext, name: "canPropose" | "canApprove" | "canExecute"): PolicyDecision {
  const policy = ROLE_POLICY[ctx.role];
  return policy[name] ? ALLOW : { allowed: false, reason: `This role may not ${name.replace("can", "").toLowerCase()}.` };
}

function commitmentIdOf(ctx: ToolContext, args: { commitmentId?: string }): string {
  return args.commitmentId ?? ctx.commitmentId;
}

function runOf(ctx: ToolContext, runId?: string): DecisionRun {
  const run = runId ? getRun(runId) : latestRun(ctx.commitmentId);
  if (!run) throw new ToolError("not_found", "No scenario run is on file for this commitment.");
  return run;
}

function optionOf(run: DecisionRun, optionId: string): Alternative {
  try {
    return optionById(run, optionId);
  } catch {
    throw new ToolError("not_found", `Unknown option ${optionId}.`);
  }
}

export const TOOLS: AnyTool[] = [
  {
    name: "get_decision_context",
    version: "1.0.0",
    description: "Return the server-created ContextEnvelope for this turn.",
    async: false,
    timeoutMs: 2000,
    idempotent: true,
    parse: () => ({}),
    authorize: () => ALLOW,
    run: (ctx): ToolOutcome => ({
      ref: ctx.envelope.snapshotId,
      provenance: [ctx.envelope.snapshotId, ctx.envelope.modelVersion],
      data: ctx.envelope,
    }),
  },
  {
    name: "get_commitment_snapshot",
    version: "1.0.0",
    description: "Deterministic commitment snapshot: quantities, dates, feasibility.",
    async: false,
    timeoutMs: 3000,
    idempotent: true,
    parse: (raw) => {
      const r = expectObject(raw);
      return { commitmentId: optionalString(r, "commitmentId") };
    },
    authorize: () => ALLOW,
    run: (ctx, args): ToolOutcome => {
      const id = commitmentIdOf(ctx, args);
      const view = assess(id);
      return {
        ref: view.baseline.id,
        provenance: [view.packet.id, view.baseline.traceId],
        data: {
          commitment: view.commitment,
          baseline: view.baseline,
          testShortfall: view.testShortfall,
          materialShortfall: view.materialShortfall,
          onTimeQty: view.onTimeQty,
          earliestShipDate: view.earliestShipDate,
        },
      };
    },
  },
  {
    name: "explain_risk_chain",
    version: "1.0.0",
    description: "Binding constraint plus the causal facts and calculations.",
    async: false,
    timeoutMs: 3000,
    idempotent: true,
    parse: (raw) => {
      const r = expectObject(raw);
      return { commitmentId: optionalString(r, "commitmentId") };
    },
    authorize: () => ALLOW,
    run: (ctx, args): ToolOutcome => {
      const id = commitmentIdOf(ctx, args);
      const view = assess(id);
      return {
        ref: view.baseline.id,
        provenance: [
          ...view.packet.sourceFacts.map((fact) => fact.id),
          ...view.packet.derivedFacts.map((fact) => fact.id),
        ],
        data: {
          commitmentId: id,
          feasibility: view.baseline.feasibility,
          bindingConstraint: view.baseline.bindingConstraint,
          facts: view.packet.sourceFacts,
          calculations: view.packet.derivedFacts,
        },
      };
    },
  },
  {
    name: "trace_blast_radius",
    version: "1.0.0",
    description: "Commitments touched by a binding resource (default: leak-test fixture).",
    async: false,
    timeoutMs: 3000,
    idempotent: true,
    parse: (raw) => {
      const r = expectObject(raw);
      return { resourceId: optionalString(r, "resourceId") };
    },
    authorize: () => ALLOW,
    run: (_ctx, args): ToolOutcome => {
      const rows = blastRadius().filter((row) => !args.resourceId || row.id.includes(args.resourceId));
      return {
        ref: "RES-LT-01",
        provenance: rows.map((row) => row.id),
        data: rows,
      };
    },
  },
  {
    name: "get_evidence_packet",
    version: "1.0.0",
    description: "Assembled CommitEvidencePacket: facts, calculations, lineage, freshness, conflicts.",
    async: false,
    timeoutMs: 3000,
    idempotent: true,
    parse: (raw) => {
      const r = expectObject(raw);
      return { commitmentId: optionalString(r, "commitmentId") };
    },
    authorize: () => ALLOW,
    run: (ctx, args): ToolOutcome => {
      const packet = assess(commitmentIdOf(ctx, args)).packet;
      return {
        ref: packet.id,
        provenance: [
          ...packet.sourceFacts.map((fact) => fact.id),
          ...packet.derivedFacts.map((fact) => fact.id),
        ],
        data: packet,
      };
    },
  },
  {
    name: "run_recovery_scenario",
    version: "1.0.0",
    description: "Create a durable DecisionRun id and queue recovery (async worker in P4).",
    async: true,
    timeoutMs: 5000,
    idempotent: false,
    parse: (raw) => {
      const r = expectObject(raw);
      return { commitmentId: optionalString(r, "commitmentId") };
    },
    authorize: () => ALLOW,
    run: (ctx, args): ToolOutcome => {
      const run = newRun(commitmentIdOf(ctx, args));
      return { ref: run.id, provenance: [run.traceId, run.snapshotId], data: run };
    },
  },
  {
    name: "compare_alternatives",
    version: "1.0.0",
    description: "Feasible and rejected alternatives from a scenario run.",
    async: false,
    timeoutMs: 3000,
    idempotent: true,
    parse: (raw) => {
      const r = expectObject(raw);
      return { runId: optionalString(r, "runId") };
    },
    authorize: () => ALLOW,
    run: (ctx, args): ToolOutcome => {
      const run = runOf(ctx, args.runId);
      return {
        ref: run.id,
        provenance: run.alternatives.map((option) => option.id),
        data: {
          runId: run.id,
          feasibility: run.feasibility,
          bindingConstraint: run.bindingConstraint,
          alternatives: run.alternatives,
        },
      };
    },
  },
  {
    name: "draft_approval_brief",
    version: "1.0.0",
    description: "Draft an approval brief for a selected option. Never an approval.",
    async: false,
    timeoutMs: 3000,
    idempotent: true,
    parse: (raw) => {
      const r = expectObject(raw);
      return { runId: optionalString(r, "runId"), optionId: expectString(r, "optionId") };
    },
    authorize: () => ALLOW,
    run: (ctx, args): ToolOutcome => {
      const run = runOf(ctx, args.runId);
      const option = optionOf(run, args.optionId);
      const row = commitment(run.commitmentId);
      const cost = option.costCad !== null ? ` Estimated cost ${formatMoney(option.costCad)} (versioned estimate).` : "";
      const draft = [
        "Draft approval brief — not an approval and not a customer commitment.",
        `${row.id} ${row.product} × ${row.qty} ${row.uom} for ${row.customer}, promised ${formatDay(row.promiseDate, true)}.`,
        `Option: ${option.label}. On time ${option.onTimeQty}; ship ${formatDay(option.shipDate, true)}.${cost}`,
        `Run ${run.id} on snapshot ${run.snapshotId}.`,
      ].join(" ");
      return {
        ref: `DRAFT-${run.id}-${option.id}`,
        provenance: [run.id, option.id],
        data: { runId: run.id, optionId: option.id, draft },
      };
    },
  },
  {
    name: "request_named_approval",
    version: "1.0.0",
    description: "Create a named approval request for a feasible option.",
    async: false,
    timeoutMs: 3000,
    idempotent: false,
    parse: (raw) => {
      const r = expectObject(raw);
      return {
        runId: optionalString(r, "runId"),
        optionId: expectString(r, "optionId"),
        rationale: expectString(r, "rationale"),
      };
    },
    authorize: (ctx) => capability(ctx, "canPropose"),
    run: (ctx, args): ToolOutcome => {
      const run = runOf(ctx, args.runId);
      const approval = createApproval(run, args.optionId, ctx.envelope.user, args.rationale, countApprovals() + 1);
      addApproval(approval);
      return { ref: approval.id, provenance: [run.id, args.optionId], data: approval };
    },
  },
  {
    name: "simulate_approved_action",
    version: "1.0.0",
    description: "Dry-run then simulate the writeback through the gateway. Idempotent per (approval, option, mode).",
    async: false,
    timeoutMs: 3000,
    idempotent: true,
    parse: (raw) => {
      const r = expectObject(raw);
      return {
        approvalId: expectString(r, "approvalId"),
        mode: optionalString(r, "mode") as "dry-run" | "execute" | undefined,
      };
    },
    authorize: (ctx) => capability(ctx, "canExecute"),
    run: (_ctx, args): ToolOutcome => {
      const approval = getApproval(args.approvalId);
      if (!approval) throw new ToolError("not_found", `Unknown approval ${args.approvalId}.`);
      const prior = receiptsForApproval(approval.id);
      const mode =
        args.mode ??
        (prior.some((receipt) => receipt.mode === "dry-run" && receipt.status === "accepted") ? "execute" : "dry-run");
      const receipt = gatewayReceipt(approval, mode, prior);
      addReceipt(receipt);
      return { ref: receipt.id, provenance: [approval.id, approval.runId, approval.optionId], data: receipt };
    },
  },
  {
    name: "get_solver_run_status",
    version: "1.0.0",
    description: "Current SolverRunEvent for a run id.",
    async: false,
    timeoutMs: 2000,
    idempotent: true,
    parse: (raw) => {
      const r = expectObject(raw);
      return { runId: optionalString(r, "runId") };
    },
    authorize: () => ALLOW,
    run: (ctx, args): ToolOutcome => {
      const run = runOf(ctx, args.runId);
      const cancelled = isCancelled(run.id);
      return {
        ref: run.id,
        provenance: [run.traceId],
        data: {
          runId: run.id,
          phase: cancelled ? "CANCELLED" : "COMPLETE",
          elapsedMs: 0,
          incumbent: run.feasibility === "feasible",
          validatedAlternatives: run.alternatives.filter((option) => option.feasibility === "feasible").length,
          gap: null,
          lastImprovement: run.createdAt,
          freshness: "fresh",
        },
      };
    },
  },
  {
    name: "cancel_solver_run",
    version: "1.0.0",
    description: "Cancel a queued or running scenario run.",
    async: false,
    timeoutMs: 2000,
    idempotent: true,
    parse: (raw) => {
      const r = expectObject(raw);
      return { runId: expectString(r, "runId") };
    },
    authorize: () => ALLOW,
    run: (_ctx, args): ToolOutcome => {
      const ok = cancelRun(args.runId);
      if (!ok) throw new ToolError("not_found", `Unknown run ${args.runId}.`);
      return { ref: args.runId, provenance: [args.runId], data: { runId: args.runId, cancelled: true } };
    },
  },
  {
    name: "rebase_decision_run",
    version: "1.0.0",
    description: "Create a new run version against the current snapshot.",
    async: true,
    timeoutMs: 5000,
    idempotent: false,
    parse: (raw) => {
      const r = expectObject(raw);
      return { runId: expectString(r, "runId") };
    },
    authorize: () => ALLOW,
    run: (_ctx, args): ToolOutcome => {
      const previous = getRun(args.runId);
      if (!previous) throw new ToolError("not_found", `Unknown run ${args.runId}.`);
      const next = newRun(previous.commitmentId);
      return { ref: next.id, provenance: [previous.id, next.traceId], data: { fromRunId: previous.id, run: next } };
    },
  },
  {
    name: "get_action_receipt",
    version: "1.0.0",
    description: "Read an action receipt by id, or the latest accepted execute receipt.",
    async: false,
    timeoutMs: 2000,
    idempotent: true,
    parse: (raw) => {
      const r = expectObject(raw);
      return { receiptId: optionalString(r, "receiptId") };
    },
    authorize: () => ALLOW,
    run: (_ctx, args): ToolOutcome => {
      const receipt = args.receiptId ? getReceipt(args.receiptId) : latestReceipt();
      if (!receipt) throw new ToolError("not_found", "No action receipt is on file.");
      return { ref: receipt.id, provenance: [receipt.approvalId, receipt.runId], data: receipt };
    },
  },
  {
    name: "get_observed_outcome",
    version: "1.0.0",
    description: "Observed outcome against an accepted execute receipt. Success is not assumed.",
    async: false,
    timeoutMs: 2000,
    idempotent: true,
    parse: (raw) => {
      const r = expectObject(raw);
      return { receiptId: optionalString(r, "receiptId") };
    },
    authorize: () => ALLOW,
    run: (ctx, args): ToolOutcome => {
      const receipt = args.receiptId ? getReceipt(args.receiptId) : latestReceipt();
      if (!receipt) throw new ToolError("not_found", "An outcome requires an accepted execute receipt.");
      const existing = outcomeForReceipt(receipt.id);
      if (existing) return { ref: existing.id, provenance: [receipt.id], data: existing };
      const row = commitment(ctx.commitmentId);
      const outcome = observeReceipt(receipt, ctx.commitmentId, `Ship ${row.qty} ${row.uom} on ${formatDay(row.promiseDate, true)}.`);
      addOutcome(outcome);
      return { ref: outcome.id, provenance: [receipt.id, ctx.commitmentId], data: outcome };
    },
  },
  {
    name: "record_human_override",
    version: "1.0.0",
    description: "Record a governed rejection with a structured code. Feeds offline review only.",
    async: false,
    timeoutMs: 3000,
    idempotent: false,
    parse: (raw) => {
      const r = expectObject(raw);
      return {
        approvalId: expectString(r, "approvalId"),
        code: expectEnum(r, "code", REJECTION_CODES),
        rationale: expectString(r, "rationale"),
        missingConstraint: optionalString(r, "missingConstraint"),
        selectedOptionId: optionalString(r, "selectedOptionId"),
      };
    },
    authorize: (ctx) => capability(ctx, "canApprove"),
    run: (ctx, args): ToolOutcome => {
      const approval = getApproval(args.approvalId);
      if (!approval) throw new ToolError("not_found", `Unknown approval ${args.approvalId}.`);
      const event: HumanOverrideEvent = {
        id: `HOV-${approval.id}-${ctx.envelope.user.id}`,
        approvalId: approval.id,
        runId: approval.runId,
        commitmentId: approval.commitmentId,
        recommendedOptionId: approval.optionId,
        selectedOptionId: args.selectedOptionId ?? null,
        code: args.code,
        rationale: args.rationale,
        missingConstraint: args.missingConstraint ?? null,
        approverId: ctx.envelope.user.id,
        approverName: ctx.envelope.user.name,
        role: ctx.role,
        snapshotId: ctx.envelope.snapshotId,
        at: ctx.now,
      };
      addOverride(event);
      return { ref: event.id, provenance: [approval.id, approval.runId], data: event };
    },
  },
];

export function toolByName(name: string): AnyTool | undefined {
  return TOOLS.find((tool) => tool.name === name);
}