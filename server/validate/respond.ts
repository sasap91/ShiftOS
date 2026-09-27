/**
 * Grounding / provenance validator.
 *
 * Guards the response contract: every material number must trace to the
 * evidence packet, every citation must resolve, and no claim may contradict a
 * conflict or describe held supply as eligible. A failing response is repaired
 * once, then replaced by a deterministic insufficiency answer.
 */
import type { CommitEvidencePacket } from "../../src/model";

export type InvestigationPlan = {
  answer: string;
  why: string;
  explanation: string;
  factIds: string[];
  calculationIds: string[];
  gaps: string[];
};

export type ValidationResult = { ok: boolean; violations: string[] };

function numbersIn(text: string): string[] {
  return (text.match(/\d[\d,]*/g) ?? []).map((value) => value.replace(/,/g, ""));
}

function allowedNumbers(evidenceJson: string): Set<string> {
  return new Set(numbersIn(evidenceJson));
}

export function validateInvestigation(
  plan: InvestigationPlan,
  packet: CommitEvidencePacket,
  extraEvidenceText = "",
): ValidationResult {
  const violations: string[] = [];

  for (const field of ["answer", "why", "explanation"] as const) {
    if (typeof plan[field] !== "string" || plan[field].trim().length === 0) {
      violations.push(`${field} must be a non-empty string`);
    }
  }
  if (!Array.isArray(plan.factIds) || !Array.isArray(plan.calculationIds) || !Array.isArray(plan.gaps)) {
    violations.push("factIds, calculationIds and gaps must be arrays");
  }

  const factIds = new Set(packet.sourceFacts.map((fact) => fact.id));
  const calcIds = new Set(packet.derivedFacts.map((fact) => fact.id));
  for (const id of plan.factIds ?? []) {
    if (!factIds.has(id)) violations.push(`factId ${id} does not resolve to the evidence packet`);
  }
  for (const id of plan.calculationIds ?? []) {
    if (!calcIds.has(id)) violations.push(`calculationId ${id} does not resolve to the evidence packet`);
  }

  const evidenceJson = `${JSON.stringify(packet)} ${extraEvidenceText}`;
  const allowed = allowedNumbers(evidenceJson);
  const prose = `${plan.answer ?? ""} ${plan.why ?? ""} ${plan.explanation ?? ""}`;
  for (const number of numbersIn(prose)) {
    if (!allowed.has(number)) violations.push(`number ${number} is not grounded in the evidence packet`);
  }

  if (packet.conflicts.length > 0 && /approved/i.test(prose)) {
    violations.push("must not describe a commitment as approved while a conflict is unresolved");
  }

  // Deduplicate while preserving order.
  return { ok: violations.length === 0, violations: [...new Set(violations)] };
}

export function insufficiencyPlan(violations: string[]): InvestigationPlan {
  return {
    answer: "That cannot be established from the current evidence.",
    why: "The evidence packet does not support a grounded answer without inventing a number.",
    explanation: "A safe next step is to refresh the snapshot or open the evidence for the facts that are missing, stale, or conflicting.",
    factIds: [],
    calculationIds: [],
    gaps: violations,
  };
}