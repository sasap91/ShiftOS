/**
 * Investigate sub-orchestrator (read-only).
 *
 * Flow: gather deterministic evidence through the authorized tool gateway →
 * ask the model for an explanation plan grounded in that evidence → validate →
 * repair once → render typed blocks. The model never calculates and never
 * chooses tools outside this phase.
 */
import { COMMITMENTS, assess, commitment, type CommitEvidencePacket } from "../../src/model";
import type { NextAction } from "../../src/orchestrator";
import type { Block, RouteDecision, Turn } from "../../src/shared/contracts";
import { chatJson } from "../model/client";
import { INVESTIGATE_PROMPT_VERSION, investigateSystem, investigateUser } from "../prompts/investigate";
import { invoke } from "../tools/gateway";
import { GOVERNED_DATASETS } from "../tools/registry";
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

export type InvestigationOptions = {
  history?: { actor: "user" | "assistant" | "system"; content: string; contextSnapshot?: unknown }[];
  route?: RouteDecision;
  deterministicPreview?: Turn;
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

function combinedPacket(packets: CommitEvidencePacket[], selected: CommitEvidencePacket): CommitEvidencePacket {
  const uniqueById = <T extends { id: string }>(rows: T[]): T[] => [...new Map(rows.map((row) => [row.id, row])).values()];
  return {
    ...selected,
    sourceFacts: uniqueById(packets.flatMap((packet) => packet.sourceFacts)),
    derivedFacts: uniqueById(packets.flatMap((packet) => packet.derivedFacts)),
    lineage: packets.flatMap((packet) => packet.lineage),
    assumptions: [...new Set(packets.flatMap((packet) => packet.assumptions))],
    conflicts: uniqueById(packets.flatMap((packet) => packet.conflicts)),
    missing: [...new Set(packets.flatMap((packet) => packet.missing))],
    freshness: {
      fresh: packets.reduce((sum, packet) => sum + packet.freshness.fresh, 0),
      stale: packets.reduce((sum, packet) => sum + packet.freshness.stale, 0),
      staleRecords: [...new Set(packets.flatMap((packet) => packet.freshness.staleRecords))],
    },
  };
}

export async function investigateTurn(
  ctx: ToolContext,
  question: string,
  options: InvestigationOptions = {},
): Promise<InvestigationResult> {
  const packetResult = await invoke("get_evidence_packet", {}, ctx);
  const chainResult = await invoke("explain_risk_chain", {}, ctx);
  const packet = packetResult.data as CommitEvidencePacket;
  const chain = chainResult.data as { feasibility: "feasible" | "infeasible"; bindingConstraint: string | null };
  const view = assess(ctx.commitmentId);
  const row = commitment(ctx.commitmentId);
  const orderViews = COMMITMENTS.map((order) => assess(order.id));
  const validationPacket = combinedPacket(orderViews.map((order) => order.packet), packet);

  const evidence = {
    activeContext: ctx.envelope,
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
    orders: orderViews.map((order) => ({
      commitment: order.commitment,
      baseline: order.baseline,
      testShortfall: order.testShortfall,
      materialShortfall: order.materialShortfall,
      onTimeQty: order.onTimeQty,
      earliestShipDate: order.earliestShipDate,
      sourceFacts: order.packet.sourceFacts,
      derivedFacts: order.packet.derivedFacts,
      assumptions: order.packet.assumptions,
      conflicts: order.packet.conflicts,
      missing: order.packet.missing,
      freshness: order.packet.freshness,
    })),
    datasets: {} as Record<string, unknown>,
    algorithmRoute: options.route ?? null,
    deterministicPreview: options.deterministicPreview ?? null,
    conversationHistory: (options.history ?? []).slice(-16),
  };
  for (const dataset of GOVERNED_DATASETS) {
    try {
      const result = await invoke("get_dataset", { dataset }, ctx);
      evidence.datasets[dataset] = {
        ref: result.ref,
        provenance: result.provenance,
        data: result.data,
      };
    } catch (error) {
      evidence.datasets[dataset] = { unavailable: true, reason: error instanceof Error ? error.message : String(error) };
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
  const allowGeneralKnowledgeNumbers = options.route?.intentClass === "unsupported";
  let validation = validateInvestigation(plan, validationPacket, extraEvidence, { allowGeneralKnowledgeNumbers });
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
    validation = validateInvestigation(plan, validationPacket, extraEvidence, { allowGeneralKnowledgeNumbers });
  }

  if (!validation.ok) {
    plan = insufficiencyPlan(validation.violations);
  }

  const turn: Turn = {
    id: `${ctx.commitmentId}-ai`,
    speaker: ctx.envelope.user.roleLabel,
    prompt: question,
    tools: ["get_evidence_packet", "explain_risk_chain", "get_dataset"],
    progress: ["Reading governed data", "Reading algorithm outputs", "Grounding the response"],
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
