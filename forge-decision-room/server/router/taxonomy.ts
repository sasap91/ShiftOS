/**
 * Intent taxonomy: the single source of truth mapping a request class to its
 * bounded sub-orchestrator and authorized tool subset. The router uses this;
 * the model never chooses its own tools.
 */
import type { ChatAction, IntentClass, SubOrchestrator } from "../../src/shared/contracts";

export type RouteRule = {
  intentClass: IntentClass;
  subOrchestrator: SubOrchestrator;
  tools: string[];
  pattern: RegExp;
  /** Composer actions that map directly to this class. */
  actions: ChatAction[];
  /** Slots that must be present, else the router asks for clarification. */
  requires?: (keyof RouteSlots)[];
};

export type RouteSlots = {
  runId: string;
  optionId: string;
  approvalId: string;
  receiptId: string;
  resourceId: string;
};

export const ROUTE_RULES: RouteRule[] = [
  {
    intentClass: "trace",
    subOrchestrator: "investigate",
    tools: ["trace_blast_radius"],
    pattern: /blast|who else|affected|radius|downstream/,
    actions: ["blast"],
  },
  {
    intentClass: "scenario",
    subOrchestrator: "scenario",
    tools: ["run_recovery_scenario"],
    pattern: /scenario|recover|recovery|run the solver|optimis|optimiz/,
    actions: ["scenario"],
  },
  {
    intentClass: "comparison",
    subOrchestrator: "scenario",
    tools: ["compare_alternatives", "get_solver_run_status"],
    pattern: /compare|alternative|option|trade-?off/,
    actions: ["compare"],
  },
  {
    intentClass: "draft",
    subOrchestrator: "action",
    tools: ["draft_approval_brief"],
    pattern: /draft|email|communication|note to the customer|brief/,
    actions: ["draft"],
  },
  {
    intentClass: "action",
    subOrchestrator: "action",
    tools: ["simulate_approved_action", "get_action_receipt"],
    pattern: /dry run|dry-run|simulate|execute|writeback|write back|receipt/,
    actions: ["simulate"],
  },
  {
    intentClass: "outcome",
    subOrchestrator: "action",
    tools: ["get_observed_outcome", "get_action_receipt"],
    pattern: /outcome|did it work|observe|realis|realiz|reconcil/,
    actions: ["observe"],
  },
  {
    intentClass: "approval",
    subOrchestrator: "action",
    tools: ["request_named_approval", "record_human_override"],
    pattern: /approv|sign-?off|authoris|authoriz/,
    actions: ["approve"],
  },
  {
    intentClass: "investigation",
    subOrchestrator: "investigate",
    tools: ["explain_risk_chain", "get_evidence_packet", "get_dataset"],
    pattern: /^why\b|causal|evidence chain|root cause|at risk|explain/,
    actions: ["why", "explain"],
  },
  {
    intentClass: "lookup",
    subOrchestrator: "investigate",
    tools: ["get_decision_context", "get_commitment_snapshot", "get_evidence_packet"],
    pattern: /status|snapshot|inventory|eligible|capacity|promise|commitment|feasible|infeasible/,
    actions: [],
  },
];

export function ruleFor(intentClass: IntentClass): RouteRule | undefined {
  return ROUTE_RULES.find((rule) => rule.intentClass === intentClass);
}