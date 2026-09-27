/**
 * Explain orchestrator (read-only) — the model path for EVERY non-trivial intent.
 *
 * The deterministic orchestrator still computes the turn (options, approvals,
 * receipts, next actions). This module asks the model to *explain* that result,
 * grounded in the evidence packet + all governed datasets, then merges the prose
 * (answer · why · explanation · gaps) back onto the deterministic turn. The model
 * never chooses an action, never approves, and never computes a number.
 */
import { assess, commitment, type CommitEvidencePacket } from "../../src/model";
import type { Block, Turn } from "../../src/shared/contracts";
import { chatJson } from "../model/client";
import { EXPLAIN_PROMPT_VERSION, explainSystem, explainUser } from "../prompts/investigate";
import { invoke } from "../tools/gateway";
import type { ToolContext } from "../tools/types";
import {
  insufficiencyPlan,
  validateInvestigation,
  type InvestigationPlan,
  type ValidationResult,
} from "../validate/respond";

export type ExplainResult = {
  blocks: Block[];
  plan: InvestigationPlan;
  validation: ValidationResult;
  model: string;
  promptVersion: string;
  repaired: boolean;
};

const DATASETS = [
  "demand_projection",
  "capacity_reconciliation",
  "contract_schedule",
  "allocation",
  "schedule",
  "zones",
  "production_plan",
  "commitments",
];

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

/** Build the shared evidence object: the commitment packet + every dataset. */
export async function buildEvidence(ctx: ToolContext): Promise<Record<string, unknown>> {
  const packetResult = await invoke("get_evidence_packet", {}, ctx);
  const packet = packetResult.data as CommitEvidencePacket;
  const view = assess(ctx.commitmentId);
  const row = commitment(ctx.commitmentId);
  const datasets: Record<string, unknown> = {};
  for (const dataset of DATASETS) {
    try {
      const result = await invoke("get_dataset", { dataset }, ctx);
      datasets[dataset] = result.data;
    } catch {
      // dataset unavailable in a trimmed checkout
    }
  }
  return {
    commitment: { id: row.id, customer: row.customer, product: row.product, qty: row.qty, uom: row.uom, promiseDate: row.promiseDate },
    baseline: { id: view.baseline.id, feasibility: view.baseline.feasibility, bindingConstraint: view.baseline.bindingConstraint, earliestShipDate: view.baseline.earliestShipDate },
    sourceFacts: packet.sourceFacts,
    derivedFacts: packet.derivedFacts,
    assumptions: packet.assumptions,
    conflicts: packet.conflicts,
    missing: packet.missing,
    freshness: packet.freshness,
    datasets,
  };
}

/** Ask the model to explain a deterministic result, grounded and validated. */
export async function explainTurn(ctx: ToolContext, question: string, deterministic: Turn): Promise<ExplainResult> {
  const packet = (await invoke("get_evidence_packet", {}, ctx)).data as CommitEvidencePacket;
  const evidence = await buildEvidence(ctx);
  const resultSummary = deterministic.blocks;
  const evidenceJson = JSON.stringify({ ...evidence, deterministicResult: resultSummary });
  const messages = [
    { role: "system" as const, content: explainSystem() },
    { role: "user" as const, content: explainUser(question, evidenceJson) },
  ];

  const first = await chatJson<InvestigationPlan>(messages);
  let plan = normalize(first.value);
  let validation = validateInvestigation(plan, packet, evidenceJson);
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
    validation = validateInvestigation(plan, packet, evidenceJson);
  }
  if (!validation.ok) plan = insufficiencyPlan(validation.violations);

  const blocks: Block[] = [
    { kind: "answer", text: plan.answer },
    { kind: "why", text: plan.why },
    { kind: "explanation", text: plan.explanation },
  ];
  if (plan.gaps.length) blocks.push({ kind: "gaps", texts: plan.gaps });

  return { blocks, plan, validation, model: first.model, promptVersion: EXPLAIN_PROMPT_VERSION, repaired };
}

const PROSE = new Set<Block["kind"]>(["answer", "why", "explanation", "gaps"]);

/** Merge the model prose onto the deterministic turn, keeping every governed block. */
export function mergeProse(deterministic: Turn, prose: Block[]): Turn {
  const rest = deterministic.blocks.filter((block) => !PROSE.has(block.kind));
  return { ...deterministic, blocks: [...prose, ...rest] };
}