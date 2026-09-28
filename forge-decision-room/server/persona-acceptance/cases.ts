/**
 * Persona acceptance cases (T-12) — 48 scripts, 12 per role.
 *
 * Each case is a request a persona would make, plus the expectation that must
 * hold. Expectation kinds mirror the harness design (chatbot gap-closure plan §4):
 *   route    — deterministic intent class / sub-orchestrator / fail-closed
 *   policy   — role authorization (allowed / refused with reason)
 *   block    — the turn must (not) contain a block kind
 *   answer   — the turn's answer text must match a pattern
 *   blocked  — requires a seam not yet built; counted `skip` in `now` mode
 *
 * The 10 criteria are the per-persona acceptance criteria (right-pane personas §11).
 */
import { ROLE_POLICY, type Role } from "../../src/model";
import type { ChatAction } from "../../src/shared/contracts";
import type { MemoryDomain } from "../../src/disclosure";

export type Expect =
  | { kind: "route"; intentClass: string; subOrchestrator?: string; fallback?: "clarify" | null }
  | { kind: "policy"; allowed: boolean }
  | { kind: "block"; block: string; present: boolean }
  | { kind: "answer"; pattern: RegExp }
  | { kind: "redaction"; domain: MemoryDomain; expectHidden: boolean }
  | { kind: "blocked"; gap: string };

export type Case = {
  id: string;
  role: Role;
  /** One of the 10 per-persona acceptance criteria (§11). */
  criterion: number;
  input: { text?: string; action?: ChatAction };
  expect: Expect;
};

export const ROLES: Role[] = ["manufacturing-manager", "shift-planner", "maintenance-manager", "demand-planner"];

const PREFIX: Record<Role, string> = {
  "manufacturing-manager": "MM",
  "shift-planner": "SP",
  "maintenance-manager": "MT",
  "demand-planner": "DP",
};

export const CRITERIA: Record<number, string> = {
  1: "Opens on the lead question; lens-sorted view; role switch re-scopes without changing centre values",
  2: "A role that cannot act sees the action disabled with the reason, never hidden",
  3: "Every approval requirement names person, role, rationale, expiry",
  4: "A draft is never labelled an approved commitment",
  5: "Overtime over threshold routes to Finance; no self-approval",
  6: "A maintenance window is approved as a window, not a customer promise",
  7: "Approval alone never executes; a dry run and receipt are required",
  8: "Redacted fields say 'not authorized', never 'absent'",
  9: "The same snapshot renders the same numbers for every role",
  10: "Cross-persona handoffs are explicit, ordered, visible",
};

function casesForRole(role: Role): Case[] {
  const p = ROLE_POLICY[role];
  const pre = PREFIX[role];
  let n = 0;
  const c = (criterion: number, input: Case["input"], expect: Expect): Case => {
    n += 1;
    return { id: `${pre}-${String(n).padStart(2, "0")}`, role, criterion, input, expect };
  };
  return [
    // 1 — orientation / lens
    c(1, {}, { kind: "route", intentClass: "lookup", subOrchestrator: "investigate", fallback: null }),
    c(1, { text: "why is this at risk" }, { kind: "route", intentClass: "investigation", subOrchestrator: "investigate" }),
    c(1, { action: "explain" }, { kind: "route", intentClass: "investigation" }),
    // 2 — blast / scope
    c(2, { action: "blast" }, { kind: "block", block: "blast", present: true }),
    c(2, { action: "scenario" }, { kind: "route", intentClass: "scenario" }),
    // 6 — comparison / options
    c(6, { action: "compare" }, { kind: "route", intentClass: "comparison" }),
    // 4 — draft is not an approved commitment
    c(4, { action: "draft" }, { kind: "answer", pattern: /draft is ready|not an approved customer commitment/i }),
    // 3 — approval requirement is named and policy-governed
    c(3, { action: "approve" }, { kind: "route", intentClass: "approval" }),
    c(3, { action: "approve" }, { kind: "policy", allowed: p.canPropose || p.canApprove }),
    // 1 — ordinary questions remain available without operational tools
    c(1, { text: "what is the weather tomorrow" }, { kind: "route", intentClass: "general", subOrchestrator: "none", fallback: null }),
    // 7 — approval alone never executes; a non-executing role is refused with a reason
    c(7, { action: "simulate" }, {
      kind: "answer",
      pattern: /nothing to simulate|not available for this role/i,
    }),
    // 8 — disclosure: a restricted memory renders a reason code, never a blank
    c(8, {}, { kind: "redaction", domain: "party", expectHidden: role === "shift-planner" || role === "maintenance-manager" }),
  ];
}

export const CASES: Case[] = ROLES.flatMap(casesForRole);
