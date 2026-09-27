/**
 * Deterministic intent router.
 *
 * Classifies a request into an allowed intent class BEFORE any model sees
 * tools, selects exactly one bounded sub-orchestrator and its authorized tool
 * subset, applies role policy, and fails closed (clarify) when ambiguous.
 *
 * This module never calls a model.
 */
import { randomUUID } from "node:crypto";
import { ROLE_POLICY, type Role } from "../../src/model";
import type { ChatAction, IntentClass, RouteDecision } from "../../src/shared/contracts";
import { ruleFor, ROUTE_RULES, type RouteSlots } from "./taxonomy";

export type ClassifyInput = {
  role: Role;
  text?: string;
  action?: ChatAction;
  slots?: Partial<RouteSlots>;
};

const SUB_FOR_PROGRESS: Record<IntentClass, string> = {
  lookup: "Reading the commitment snapshot",
  investigation: "Opening the causal chain",
  trace: "Tracing pegs from the binding resource",
  scenario: "Freezing the snapshot and queuing the run",
  comparison: "Loading the decision run",
  draft: "Reading approved facts",
  approval: "Checking approval policy",
  action: "Validating approval and idempotency",
  outcome: "Comparing expected and realized results",
  selection: "Committing the selection",
  unsupported: "Checking what can be established",
};

export function progressFor(intentClass: IntentClass): string {
  return SUB_FOR_PROGRESS[intentClass];
}

function rulesForAction(action: ChatAction) {
  return ROUTE_RULES.find((rule) => rule.actions.includes(action));
}

export function classify(input: ClassifyInput): RouteDecision {
  const requestId = randomUUID();
  const text = (input.text ?? "").trim().toLowerCase();
  const policy = ROLE_POLICY[input.role];

  let intentClass: IntentClass | null = null;

  if (input.action) {
    const byAction = rulesForAction(input.action);
    if (byAction) intentClass = byAction.intentClass;
  }
  if (!intentClass && text) {
    const byText = ROUTE_RULES.find((rule) => rule.pattern.test(text));
    if (byText) intentClass = byText.intentClass;
  }
  // A bare question with no operational keyword fails closed unless it is empty
  // (an empty composer submit orients the thread).
  if (!intentClass) {
    intentClass = text ? "unsupported" : "lookup";
  }

  if (intentClass === "unsupported") {
    return {
      requestId,
      intentClass,
      slots: {},
      subOrchestrator: "none",
      tools: [],
      policy: { allowed: false, reason: "Request is outside the room's bounded services." },
      fallback: "clarify",
    };
  }

  const rule = ruleFor(intentClass);
  if (!rule) {
    return {
      requestId,
      intentClass: "unsupported",
      slots: {},
      subOrchestrator: "none",
      tools: [],
      policy: { allowed: false, reason: "No rule is registered for this intent." },
      fallback: "clarify",
    };
  }

  const slots: Record<string, string> = {};
  for (const key of rule.requires ?? []) {
    const value = input.slots?.[key];
    if (!value) {
      return {
        requestId,
        intentClass,
        slots,
        subOrchestrator: rule.subOrchestrator,
        tools: rule.tools,
        policy: { allowed: false, reason: `Missing required slot: ${key}.` },
        fallback: "clarify",
      };
    }
    slots[key] = value;
  }

  const denied = denyReason(intentClass, policy);
  return {
    requestId,
    intentClass,
    slots,
    subOrchestrator: rule.subOrchestrator,
    tools: rule.tools,
    policy: denied ? { allowed: false, reason: denied } : { allowed: true, reason: "Authorized for this role." },
    fallback: null,
  };
}

function denyReason(
  intentClass: IntentClass,
  policy: (typeof ROLE_POLICY)[Role],
): string | null {
  if (intentClass === "approval" && !(policy.canPropose || policy.canApprove)) {
    return "This role may not raise or record approvals.";
  }
  if (intentClass === "action" && !policy.canExecute) {
    return "This role may prepare but not execute a writeback.";
  }
  return null;
}