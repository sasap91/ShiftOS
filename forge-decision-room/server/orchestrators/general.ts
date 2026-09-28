/**
 * General assistant route.
 *
 * This path is intentionally tool-free. It can answer broad knowledge
 * questions, but it cannot read or mutate FORGE records and cannot claim live
 * information. Operational questions continue through the governed routes.
 */
import type { Turn } from "../../src/shared/contracts";
import { ModelError, chatJson, type ChatMessage } from "../model/client";
import { GENERAL_PROMPT_VERSION, generalSystem, generalUser } from "../prompts/general";
import type { ToolContext } from "../tools/types";

export type GeneralPlan = {
  answer: string;
  basis: string;
};

type GeneralModelCall = (
  messages: ChatMessage[],
  options?: { maxTokens?: number },
) => Promise<{ value: GeneralPlan; raw: string; model: string; finishReason: string }>;

export type GeneralResult = {
  turn: Turn;
  plan: GeneralPlan;
  model: string;
  promptVersion: string;
};

function normalize(value: Partial<GeneralPlan> | undefined): GeneralPlan {
  return {
    answer: String(value?.answer ?? "").trim(),
    basis: String(value?.basis ?? "").trim(),
  };
}

export async function generalTurn(
  ctx: ToolContext,
  question: string,
  call: GeneralModelCall = (messages, options) => chatJson<GeneralPlan>(messages, options),
): Promise<GeneralResult> {
  const response = await call(
    [
      { role: "system", content: generalSystem() },
      {
        role: "user",
        content: generalUser(question, ctx.envelope.user.roleLabel, ctx.commitmentId),
      },
    ],
    { maxTokens: 1200 },
  );
  const plan = normalize(response.value);
  if (!plan.answer) {
    throw new ModelError("invalid_response", "The general assistant returned an empty answer.");
  }
  if (!plan.basis) {
    plan.basis = "Answered from general knowledge; no FORGE record or live source was used.";
  }

  return {
    turn: {
      id: `${ctx.commitmentId}-general`,
      speaker: ctx.envelope.user.roleLabel,
      prompt: question,
      tools: [],
      progress: ["Answering a general question"],
      blocks: [
        { kind: "answer", text: plan.answer },
        { kind: "why", text: plan.basis },
        { kind: "next", actions: [] },
      ],
    },
    plan,
    model: response.model,
    promptVersion: GENERAL_PROMPT_VERSION,
  };
}
