/**
 * Chat turn handler.
 *
 * Route (deterministic) -> Investigate orchestrator (AI, grounded) for read
 * intents when the model is enabled -> scripted deterministic fallback for
 * everything else and on any AI failure. The scripted path is also the guard
 * rail: the room never invents an answer.
 */
import { randomUUID } from "node:crypto";
import { AS_OF } from "../src/model";
import { openThread, reduce, type Intent, type Turn } from "../src/orchestrator";
import type { Block, ChatMode, ChatRequest, ChatResponse, ContextEnvelope, RouteDecision } from "../src/shared/contracts";
import { audit } from "./audit/log";
import { buildEnvelope } from "./context/envelope";
import { aiEnabled } from "./model/client";
import { investigateTurn } from "./orchestrators/investigate";
import { classify, progressFor } from "./router/router";

function intentForRoute(route: RouteDecision, input: ChatRequest): Intent {
  switch (route.intentClass) {
    case "trace":
      return { type: "blast" };
    case "scenario":
      return { type: "scenario" };
    case "comparison":
      return { type: "compare" };
    case "draft":
      return { type: "draft" };
    case "approval":
      return { type: "request-approval", rationale: "" };
    case "action":
      return { type: "simulate" };
    case "outcome":
      return { type: "observe", receiptId: "" };
    case "selection":
      return input.optionId ? { type: "select-option", optionId: input.optionId } : { type: "explain" };
    case "unsupported":
      return { type: "ask", text: input.text ?? "" };
    case "investigation":
      return { type: "why" };
    default:
      return { type: "explain" };
  }
}

function guidanceTurn(commitmentId: string, speaker: string, route: RouteDecision): Turn {
  const clarify = route.fallback === "clarify";
  return {
    id: `${commitmentId}-t0`,
    speaker,
    prompt: null,
    tools: [],
    progress: [],
    blocks: [
      {
        kind: "answer",
        text: clarify
          ? "That request is outside what this room can establish."
          : "That action is not available for this role.",
      },
      {
        kind: "why",
        text: clarify
          ? "Ask about this commitment's risk, evidence, blast radius, alternatives, approval, action or outcome."
          : route.policy.reason,
      },
      { kind: "next", actions: [] },
    ],
  };
}

/** Deterministic fallback: reuse the existing orchestrator. */
function scriptedTurn(route: RouteDecision, input: ChatRequest, envelope: ContextEnvelope): Turn {
  const thread = openThread(input.commitmentId);
  const turn = reduce(thread, envelope, intentForRoute(route, input)).turn;
  if (turn.progress.length === 0) {
    return { ...turn, progress: [progressFor(route.intentClass)] };
  }
  return turn;
}

export type TurnHistory = {
  actor: "user" | "assistant" | "system";
  content: string;
  contextSnapshot?: unknown;
}[];

function mergeModelAndDeterministic(modelTurn: Turn, deterministic: Turn, route: RouteDecision): Turn {
  if (route.intentClass === "unsupported") return modelTurn;

  const preserve = new Set<Block["kind"]>([
    "blast",
    "options",
    "approval-draft",
    "approval",
    "receipt",
    "outcome",
    "recommendation",
    "action",
    "note",
    "next",
  ]);
  const deterministicBlocks = deterministic.blocks.filter((block) => preserve.has(block.kind));
  if (!route.policy.allowed) {
    deterministicBlocks.unshift({ kind: "note", text: route.policy.reason });
  }
  const modelBlocks = deterministicBlocks.some((block) => block.kind === "next")
    ? modelTurn.blocks.filter((block) => block.kind !== "next")
    : modelTurn.blocks;
  return {
    ...modelTurn,
    tools: [...new Set([...modelTurn.tools, ...deterministic.tools])],
    progress: [...new Set([...modelTurn.progress, ...deterministic.progress])],
    blocks: [...modelBlocks, ...deterministicBlocks],
  };
}

export async function runTurn(input: ChatRequest, history: TurnHistory = []): Promise<ChatResponse> {
  const traceId = randomUUID();
  const route = classify({
    role: input.role,
    text: input.text,
    action: input.action,
    slots: { runId: input.runId, optionId: input.optionId, approvalId: input.approvalId },
  });
  const envelope = buildEnvelope(input.role, input.commitmentId, input.runId);

  const deterministic = route.fallback || !route.policy.allowed
    ? guidanceTurn(input.commitmentId, envelope.user.roleLabel, route)
    : scriptedTurn(route, input, envelope);
  let turn: Turn = deterministic;
  let mode: ChatMode = "scripted";

  if (aiEnabled()) {
    const question =
      input.text && input.text.trim().length > 0
        ? input.text.trim()
        : "Explain the current risk and status of this commitment from the evidence packet.";
    try {
      const result = await investigateTurn(
        {
          traceId,
          requestId: route.requestId,
          envelope,
          role: input.role,
          commitmentId: input.commitmentId,
          now: AS_OF,
        },
        question,
        { history, route, deterministicPreview: deterministic },
      );
      turn = mergeModelAndDeterministic(result.turn, deterministic, route);
      mode = "ai";
      audit({
        kind: "ai_turn",
        traceId,
        intentClass: route.intentClass,
        model: result.model,
        promptVersion: result.promptVersion,
        valid: result.validation.ok,
        repaired: result.repaired,
        violations: result.validation.violations,
      });
    } catch (error) {
      audit({ kind: "ai_fallback", traceId, intentClass: route.intentClass, detail: String(error) });
      turn = deterministic;
    }
  }

  audit({
    kind: "turn",
    traceId,
    role: input.role,
    commitmentId: input.commitmentId,
    intentClass: route.intentClass,
    subOrchestrator: route.subOrchestrator,
    tools: route.tools,
    allowed: route.policy.allowed,
    fallback: route.fallback,
    mode,
  });

  return { traceId, route, envelope, turn, mode };
}
