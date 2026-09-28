/**
 * Investigate sub-orchestrator (read-only).
 *
 * Flow: gather deterministic evidence through the authorized tool gateway →
 * ask the model for an explanation plan grounded in that evidence → validate →
 * repair once → render typed blocks. The model never calculates and never
 * chooses tools outside this phase.
 */
import { assess, commitment, type CommitEvidencePacket } from "../../src/model";
import type { NextAction } from "../../src/orchestrator";
import type { Block, Turn } from "../../src/shared/contracts";
import { chatJson } from "../model/client";
import { INVESTIGATE_PROMPT_VERSION, investigateSystem, investigateUser } from "../prompts/investigate";
import { invoke } from "../tools/gateway";
import type { ToolContext } from "../tools/types";
import {
  insufficiencyPlan,
  validateInvestigation,
  type InvestigationPlan,
  type ValidationResult,
} from "../validate/respond";

export type InvestigationResult = {
  turn: Turn;
  plan: InvestigationPlan;
  validation: ValidationResult;
  model: string;
  promptVersion: string;
  repaired: boolean;
};

function normalize(raw: Partial<InvestigationPlan> | undefined): InvestigationPlan {
  const strings = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  return {
    answer: String(raw?.answer ?? ""),
    why: String(raw?.why ?? ""),
    explanation: String(raw?.explanation ?? ""),
    factIds: strings(raw?.factIds),
    calculationIds: strings(raw?.calculationIds),
    gaps: strings(raw?.gaps),
  };
}

function nextActions(feasibility: "feasible" | "infeasible"): NextAction[] {
  if (feasibility === "infeasible") {
    return [
      { label: "Why", intent: { type: "why" } },
      { label: "Blast radius", intent: { type: "blast" } },
      { label: "Run recovery scenario", intent: { type: "scenario" } },
    ];
  }
  return [
    { label: "Explain risk", intent: { type: "explain" } },
    { label: "Blast radius", intent: { type: "blast" } },
  ];
}

function toBlocks(plan: InvestigationPlan, feasibility: "feasible" | "infeasible"): Block[] {
  const blocks: Block[] = [
    { kind: "answer", text: plan.answer },
    { kind: "why", text: plan.why },
    { kind: "explanation", text: plan.explanation },
  ];
  if (plan.factIds.length) blocks.push({ kind: "facts", ids: plan.factIds });
  if (plan.calculationIds.length) blocks.push({ kind: "calculations", ids: plan.calculationIds });
  if (plan.gaps.length) blocks.push({ kind: "gaps", texts: plan.gaps });
  blocks.push({ kind: "next", actions: nextActions(feasibility) });
  return blocks;
}

export async function investigateTurn(ctx: ToolContext, question: string): Promise<InvestigationResult> {
  const packetResult = await invoke("get_evidence_packet", {}, ctx);
  const chainResult = await invoke("explain_risk_chain", {}, ctx);
  const packet = packetResult.data as CommitEvidencePacket;
  const chain = chainResult.data as { feasibility: "feasible" | "infeasible"; bindingConstraint: string | null };
  const view = assess(ctx.commitmentId);
  const row = commitment(ctx.commitmentId);

  const evidence: {
    commitment: Record<string, unknown>;
    baseline: Record<string, unknown>;
    sourceFacts: unknown;
    derivedFacts: unknown;
    assumptions: unknown;
    conflicts: unknown;
    missing: unknown;
    freshness: unknown;
    datasets: Record<string, unknown>;
  } = {
    commitment: {
      id: row.id,
      customer: row.customer,
      product: row.product,
      qty: row.qty,
      uom: row.uom,
      promiseDate: row.promiseDate,
    },
    baseline: {
      id: view.baseline.id,
      feasibility: chain.feasibility,
      bindingConstraint: chain.bindingConstraint,
      earliestShipDate: view.baseline.earliestShipDate,
    },
    sourceFacts: packet.sourceFacts,
    derivedFacts: packet.derivedFacts,
    assumptions: packet.assumptions,
    conflicts: packet.conflicts,
    missing: packet.missing,
    freshness: packet.freshness,
    datasets: {},
  };
  // Give the model access to every governed dataset / algorithm output.
  for (const dataset of [
    "demand_projection",
    "capacity_reconciliation",
    "contract_schedule",
    "allocation",
    "schedule",
    "zones",
    "production_plan",
    "commitments",
  ]) {
    try {
      const result = await invoke("get_dataset", { dataset }, ctx);
      evidence.datasets[dataset] = result.data;
    } catch {
      // a dataset may be absent in a trimmed checkout; skip it
    }
  }
  const evidenceJson = JSON.stringify(evidence);
  const extraEvidence = JSON.stringify(evidence);
  const messages = [
    { role: "system" as const, content: investigateSystem() },
    { role: "user" as const, content: investigateUser(question, evidenceJson) },
  ];

  const first = await chatJson<InvestigationPlan>(messages);
  let plan = normalize(first.value);
  let validation = validateInvestigation(plan, packet, extraEvidence);
  let repaired = false;

  if (!validation.ok) {
    repaired = true;
    const repair = await chatJson<InvestigationPlan>([
      ...messages,
      { role: "assistant", content: first.raw },
      {
        role: "user",
        content: `Your JSON violated grounding rules:\n- ${validation.violations.join("\n- ")}\nReturn corrected JSON using only numbers and ids present in the evidence.`,
      },
    ]);
    plan = normalize(repair.value);
    validation = validateInvestigation(plan, packet, extraEvidence);
  }

  if (!validation.ok) {
    plan = insufficiencyPlan(validation.violations);
  }

  const turn: Turn = {
    id: `${ctx.commitmentId}-ai`,
    speaker: ctx.envelope.user.roleLabel,
    prompt: question,
    tools: ["get_evidence_packet", "explain_risk_chain", "get_dataset"],
    progress: ["Reading the evidence packet", "Explaining the causal chain"],
    blocks: toBlocks(plan, view.baseline.feasibility),
  };

  return {
    turn,
    plan,
    validation,
    model: first.model,
    promptVersion: INVESTIGATE_PROMPT_VERSION,
    repaired,
  };
}

// referenced by the gateway audit; keep the packet ref available for citations
export function packetRef(packet: CommitEvidencePacket): string {
  return packet.id;
}