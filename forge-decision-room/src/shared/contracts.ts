/**
 * Shared contracts between the server (AI control plane) and the client.
 *
 * Rule: no number without provenance. Every numeric block field must resolve
 * to a fact id, calculation id, or run id.
 */
import type {
  Role,
  ContextEnvelope,
  DecisionRun,
  Alternative,
  ApprovalRequest,
  ActionReceipt,
  ObservedOutcome,
} from "../model";
import type { Turn, Block, Intent, Thread } from "../orchestrator";

export type {
  Role,
  ContextEnvelope,
  DecisionRun,
  Alternative,
  ApprovalRequest,
  ActionReceipt,
  ObservedOutcome,
  Turn,
  Block,
  Intent,
  Thread,
};

/** Deterministic intent classes. The router assigns one before any model runs. */
export type IntentClass =
  | "lookup"
  | "investigation"
  | "trace"
  | "scenario"
  | "comparison"
  | "draft"
  | "approval"
  | "action"
  | "outcome"
  | "selection"
  | "unsupported";

export type SubOrchestrator = "investigate" | "scenario" | "action" | "none";

/** Composer action ids understood by the client. */
export type ChatAction =
  | "explain"
  | "why"
  | "blast"
  | "scenario"
  | "compare"
  | "draft"
  | "approve"
  | "simulate"
  | "observe";

export type PolicyResult = {
  allowed: boolean;
  reason: string;
};

export type RouteDecision = {
  requestId: string;
  intentClass: IntentClass;
  slots: Record<string, string>;
  subOrchestrator: SubOrchestrator;
  tools: string[];
  policy: PolicyResult;
  /** When set, the router refused to guess and asks for clarification. */
  fallback: "clarify" | null;
};

export type ChatRequest = {
  role: Role;
  commitmentId: string;
  text?: string;
  action?: ChatAction;
  runId?: string;
  optionId?: string;
  approvalId?: string;
};

export type ChatMode = "scripted" | "ai";

export type ChatResponse = {
  traceId: string;
  route: RouteDecision;
  envelope: ContextEnvelope;
  turn: Turn;
  mode: ChatMode;
};

/** Server-Sent-Event payloads for streaming turns and runs. */
export type ChatStreamEvent =
  | { type: "progress"; step: string }
  | { type: "route"; route: RouteDecision }
  | { type: "block"; index: number; block: Block }
  | { type: "validation"; ok: boolean; detail: string }
  | { type: "error"; code: string; detail: string }
  | { type: "done"; turn: Turn };

export type RejectionCode =
  | "LABOR_NOT_REALISTIC"
  | "SUPPLIER_EXPEDITE_NOT_CREDIBLE"
  | "CUSTOMER_PRIORITY_MISWEIGHTED"
  | "CHANGEOVER_COST_UNDERSTATED"
  | "POLICY_CONSTRAINT_MISSING"
  | "DATA_STALE"
  | "OPERATIONAL_RISK_TOO_HIGH";

/** A governed rejection outcome feeding offline review; never auto-retrains. */
export type HumanOverrideEvent = {
  id: string;
  approvalId: string;
  runId: string;
  commitmentId: string;
  recommendedOptionId: string;
  selectedOptionId: string | null;
  code: RejectionCode;
  rationale: string;
  missingConstraint: string | null;
  approverId: string;
  approverName: string;
  role: Role;
  snapshotId: string;
  at: string;
};