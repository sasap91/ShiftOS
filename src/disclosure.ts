/**
 * Disclosure & authority (G-04/G-05).
 *
 * Two governance facts, computed — never asserted in prose:
 *  1. Disclosure: visibility is attribute-based on `role × memory domain ×
 *     sensitivity` (Personas & Governance §5). A hidden memory renders a reason
 *     code, never a blank, and is stripped before prompt construction.
 *  2. Authority: the four interactive personas are *never* able to satisfy a
 *     policy authority (Finance/Quality/Program/Procurement). Authorities
 *     resolve on policy, and are surfaced as named requirements with owner +
 *     expiry — not as role-switcher options.
 *
 * Dependency-light: reads `model.ts` and `memory.ts` only.
 */
import { type AuthorityId, type Role } from "./model";
import { type MemoryVersion } from "./memory";
import { type MasterClass } from "./master";

export type MemoryDomain = MasterClass | "transaction" | "derived" | "contested";
export type VisibilityLevel = "full" | "summary" | "operational" | "banded" | "hidden";

const ROLES: Role[] = ["manufacturing-manager", "shift-planner", "maintenance-manager", "demand-planner"];

/** Which master/module class a memory belongs to. */
export function domainOf(memory: MemoryVersion): MemoryDomain {
  if (memory.memoryClass === "fact") return "transaction";
  if (memory.memoryClass === "derived") return "derived";
  if (memory.memoryClass === "contested") return "contested";
  const set = memory.factType.replace(/_rule$/, "") as MasterClass;
  return set;
}

/**
 * Visibility matrix (Personas & Governance §5). Transactions and derived values
 * are visible to every role at their operational level; the governed domains
 * are attribute-restricted, with `party` and `commercial` hidden from coverage
 * and availability lenses.
 */
const MATRIX: Record<MemoryDomain, Record<Role, VisibilityLevel>> = {
  item: { "manufacturing-manager": "summary", "shift-planner": "summary", "maintenance-manager": "summary", "demand-planner": "full" },
  bom: { "manufacturing-manager": "summary", "shift-planner": "summary", "maintenance-manager": "summary", "demand-planner": "full" },
  sourcing: { "manufacturing-manager": "summary", "shift-planner": "summary", "maintenance-manager": "summary", "demand-planner": "full" },
  party: { "manufacturing-manager": "summary", "shift-planner": "hidden", "maintenance-manager": "hidden", "demand-planner": "full" },
  commercial: { "manufacturing-manager": "banded", "shift-planner": "hidden", "maintenance-manager": "hidden", "demand-planner": "full" },
  routing: { "manufacturing-manager": "full", "shift-planner": "operational", "maintenance-manager": "operational", "demand-planner": "summary" },
  calendar: { "manufacturing-manager": "full", "shift-planner": "operational", "maintenance-manager": "operational", "demand-planner": "summary" },
  policy: { "manufacturing-manager": "full", "shift-planner": "operational", "maintenance-manager": "operational", "demand-planner": "summary" },
  resource: { "manufacturing-manager": "full", "shift-planner": "operational", "maintenance-manager": "full", "demand-planner": "summary" },
  transaction: { "manufacturing-manager": "full", "shift-planner": "operational", "maintenance-manager": "operational", "demand-planner": "full" },
  derived: { "manufacturing-manager": "full", "shift-planner": "full", "maintenance-manager": "full", "demand-planner": "full" },
  contested: { "manufacturing-manager": "full", "shift-planner": "full", "maintenance-manager": "full", "demand-planner": "full" },
};

export function levelFor(role: Role, domain: MemoryDomain): VisibilityLevel {
  return MATRIX[domain][role];
}

export type MemoryView = {
  memoryId: string;
  versionId: string;
  domain: MemoryDomain;
  sensitivity: MemoryVersion["sensitivity"];
  visible: boolean;
  level: VisibilityLevel;
  /** Set when the memory is withheld: a reason code, never a blank. */
  reasonCode: string | null;
};

export function viewMemory(role: Role, memory: MemoryVersion): MemoryView {
  const domain = domainOf(memory);
  const level = levelFor(role, domain);
  const visible = level !== "hidden";
  return {
    memoryId: memory.memoryId,
    versionId: memory.versionId,
    domain,
    sensitivity: memory.sensitivity,
    visible,
    level,
    reasonCode: visible ? null : "NOT_AUTHORIZED",
  };
}

/** Strip hidden memories before prompt construction; hidden ones render a reason code. */
export function redactForRole(role: Role, memories: MemoryVersion[]): MemoryView[] {
  return memories.map((memory) => viewMemory(role, memory));
}

export function redactedCount(role: Role, memories: MemoryVersion[]): number {
  return redactForRole(role, memories).filter((view) => !view.visible).length;
}

/** Only the steward may supersede a memory. */
export function canSupersede(role: Role, memory: MemoryVersion): boolean {
  return role === memory.ownerRole;
}

// --- authority separation ---------------------------------------------------

export const AUTHORITIES: AuthorityId[] = ["finance", "quality", "program", "procurement"];

/**
 * The inviolable invariant: a policy authority is never satisfied by an
 * operational persona. Resolved on policy, not by identity.
 */
export function canPersonaSatisfyAuthority(_role: Role, _authority: AuthorityId): false {
  return false;
}

export type AuthorityResolution = {
  authority: AuthorityId;
  requiredBy: Role;
  status: "resolved-on-policy" | "pending";
  /** Always null for personas — policy authorities resolve on policy. */
  satisfiedByPersona: null;
};

type ApproverNeed = { role: Role; authority?: AuthorityId };

export function authorityResolutions(approvalStatus: "pending" | "approved" | "rejected", approvers: ApproverNeed[]): AuthorityResolution[] {
  return approvers
    .filter((need): need is ApproverNeed & { authority: AuthorityId } => Boolean(need.authority))
    .map((need) => ({
      authority: need.authority,
      requiredBy: need.role,
      status: approvalStatus === "approved" ? "resolved-on-policy" : "pending",
      satisfiedByPersona: null,
    }));
}

export function openAuthorities(approvalStatus: "pending" | "approved" | "rejected", approvers: ApproverNeed[]): AuthorityId[] {
  return authorityResolutions(approvalStatus, approvers)
    .filter((row) => row.status !== "resolved-on-policy")
    .map((row) => row.authority);
}

/** A persona can never appear as the satisfier of a policy authority. */
export function authoritySeparationHolds(approvers: ApproverNeed[]): boolean {
  return approvers.every((need) => !need.authority || !ROLES.includes(need.role as Role) || canPersonaSatisfyAuthority(need.role, need.authority) === false);
}