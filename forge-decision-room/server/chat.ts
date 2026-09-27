/**
 * Chat turn handler.
 *
 * Route (deterministic) -> governed orchestrators for operational intents or a
 * tool-free general assistant for ordinary questions. Scripted decision-room
 * answers remain the fallback for governed intents.
 */
import { randomUUID } from "node:crypto";
import { AS_OF } from "../src/model";
import { openThread, reduce, type Intent, type Turn } from "../src/orchestrator";
import type { ChatMode, ChatRequest, ChatResponse, ContextEnvelope, RouteDecision } from "../src/shared/contracts";
import { audit } from "./audit/log";
import { buildEnvelope } from "./context/envelope";
import { aiEnabled } from "./model/client";
import { explainTurn, mergeProse } from "./orchestrators/explain";
import { generalTurn } from "./orchestrators/general";
import { investigateTurn } from "./orchestrators/investigate";
import { classify, progressFor } from "./router/router";
import type { ToolContext } from "./tools/types";

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
    case "general":
    case "unsupported":
      return { type: "ask", text: input.text ?? "" };
    case "investigation":
      return { type: "why" };
    default:
      return { type: "explain" };
  }
}

function generalUnavailableTurn(commitmentId: string, speaker: string, question: string): Turn {
  return {
    id: `${commitmentId}-general-unavailable`,
    speaker,
    prompt: question,
    tools: [],
    progress: [],
    blocks: [
      { kind: "answer", text: "The general AI assistant is temporarily unavailable." },
      {
        kind: "why",
        text: "The decision-room services are still available, but broad questions need the configured language model.",
      },
      { kind: "next", actions: [] },
    ],
  };
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
          ? "I need a little more information to continue."
          : "That action is not available for this role.",
      },
      {
        kind: "why",
        text: route.policy.reason,
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

export async function runTurn(input: ChatRequest): Promise<ChatResponse> {
  const traceId = randomUUID();
  const route = classify({
    role: input.role,
    text: input.text,
    action: input.action,
    slots: { runId: input.runId, optionId: input.optionId, approvalId: input.approvalId },
  });
  const envelope = buildEnvelope(input.role, input.commitmentId, input.runId);

  let turn: Turn;
  let mode: ChatMode = "scripted";

  if (route.fallback || !route.policy.allowed) {
    turn = guidanceTurn(input.commitmentId, envelope.user.roleLabel, route);
  } else if (route.intentClass === "general") {
    const question = input.text?.trim() ?? "";
    turn = generalUnavailableTurn(input.commitmentId, envelope.user.roleLabel, question);
    if (aiEnabled()) {
      const ctx: ToolContext = {
        traceId,
        requestId: route.requestId,
        envelope,
        role: input.role,
        commitmentId: input.commitmentId,
        now: AS_OF,
      };
      try {
        const result = await generalTurn(ctx, question);
        turn = result.turn;
        mode = "ai";
        audit({
          kind: "ai_turn",
          traceId,
          intentClass: route.intentClass,
          model: result.model,
          promptVersion: result.promptVersion,
          valid: true,
          repaired: false,
          violations: [],
        });
      } catch (error) {
        audit({ kind: "ai_fallback", traceId, intentClass: route.intentClass, detail: String(error) });
      }
    }
  } else {
    // The deterministic orchestrator always computes the turn; the model explains it.
    const deterministic = scriptedTurn(route, input, envelope);
    turn = deterministic;
    if (aiEnabled()) {
      const ctx: ToolContext = {
        traceId,
        requestId: route.requestId,
        envelope,
        role: input.role,
        commitmentId: input.commitmentId,
        now: AS_OF,
      };
      const question =
        input.text && input.text.trim().length > 0 ? input.text.trim() : "Explain this result from the evidence.";
      try {
        if (route.intentClass === "investigation" || route.intentClass === "lookup") {
          const result = await investigateTurn(ctx, question);
          turn = result.turn;
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
        } else {
          const result = await explainTurn(ctx, question, deterministic);
          turn = mergeProse(deterministic, result.blocks);
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
        }
      } catch (error) {
        audit({ kind: "ai_fallback", traceId, intentClass: route.intentClass, detail: String(error) });
        turn = deterministic;
      }
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
